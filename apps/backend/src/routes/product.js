import express from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { protect, authorize, optionalAuth } from '../middlewares/auth.js';
import { validate, createProductSchema, updateProductSchema } from '../utils/validation.js';
import { getCache, setCache } from '../config/redis.js';
import { invalidateProductCaches } from '../utils/cacheInvalidation.js';
import { handleImageUpload, handleMultipleImageUpload } from '../middlewares/uploadMiddleware.js';
import { getDefaultUploadService } from '../services/uploadService.js';
import { emitUploadProgress, emitCatalogUpdate } from '../sockets/socketHandler.js';

const router = express.Router();

// Whitelist of `sortBy` values the storefront may request, mapped to Mongo
// sort objects. Anything not listed falls back to DEFAULT_SORT.
const SORT_OPTIONS = {
  relevance: { createdAt: -1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'price-low': { price: 1 },
  'price-high': { price: -1 },
  rating: { 'ratings.average': -1, 'ratings.count': -1 },
  popular: { soldCount: -1 },
  reviews: { 'ratings.count': -1 }
};

const DEFAULT_SORT = SORT_OPTIONS.relevance;

const resolveSort = (sortBy) => SORT_OPTIONS[sortBy] || DEFAULT_SORT;

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query
    const query = { status: 'active', visibility: 'public' };
    
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    if (req.query.author) {
      query.author = { $regex: String(req.query.author).trim(), $options: 'i' };
    }

    if (req.query.publisher) {
      query.publisher = { $regex: String(req.query.publisher).trim(), $options: 'i' };
    }

    if (req.query.format) {
      query.format = req.query.format;
    }

    if (req.query.language) {
      query.language = { $regex: String(req.query.language).trim(), $options: 'i' };
    }
    
    if (req.query.featured) {
      query.featured = true;
    }
    
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
    }
    
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    if (req.query.rating) {
      const minRating = parseFloat(req.query.rating);
      if (!Number.isNaN(minRating)) {
        query['ratings.average'] = { $gte: minRating };
      }
    }

    if (req.query.inStock === 'true') {
      query['inventory.quantity'] = { $gt: 0 };
    }

    // Resolve the requested sort through the whitelist so an unknown key can
    // never reach Mongo as a raw sort document.
    const sort = resolveSort(req.query.sortBy);

    // Check cache
    const cacheKey = `products:${JSON.stringify(query)}:${JSON.stringify(sort)}:${page}:${limit}`;
    let cachedProducts = await getCache(cacheKey);
    
    if (cachedProducts) {
      return res.json({
        success: true,
        data: cachedProducts
      });
    }

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    const result = {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        totalPages: Math.ceil(total / limit)
      }
    };

    // Cache result
    await setCache(cacheKey, result, 300); // 5 minutes

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single product by slug or id
// @route   GET /api/v1/products/:idOrSlug
// @access  Public
router.get('/:idOrSlug', optionalAuth, async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    // The storefront links use the human-readable slug while admin tooling
    // links use the ObjectId, so accept either. Guarding on
    // isValidObjectId is what stops a slug from reaching findById and
    // throwing a CastError (500) instead of resolving a product.
    const isObjectId = mongoose.isValidObjectId(idOrSlug);
    const findQuery = isObjectId
      ? { _id: idOrSlug }
      : { slug: String(idOrSlug).toLowerCase() };

    // Check cache
    const cacheKey = `product:${idOrSlug}`;
    let cachedProduct = await getCache(cacheKey);
    
    if (cachedProduct) {
      // Increment view count asynchronously, keyed the same way we looked
      // the product up so a slug request bumps the right document.
      Product.findOneAndUpdate(findQuery, { $inc: { viewCount: 1 } }).exec();
      return res.json({
        success: true,
        data: cachedProduct
      });
    }

    const product = await Product.findOne(findQuery)
      .populate('category', 'name slug')
      .populate('reviews', 'rating title content user createdAt');

    if (!product || product.status !== 'active' || product.visibility !== 'public') {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Increment view count
    product.viewCount += 1;
    await product.save();

    // Cache result
    await setCache(cacheKey, product, 300); // 5 minutes

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create book
// @route   POST /api/v1/products
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), handleMultipleImageUpload, validate(createProductSchema), async (req, res, next) => {
  // Same contract as POST /admin/products: reuse the client upload id and emit
  // the same status/currentImage/totalImages payload into the same user room.
  const uploadId =
    (typeof req.body.uploadId === 'string' && req.body.uploadId.trim()) ||
    `upload_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

  const productName = req.body.name || 'Product'
  const totalImages = Array.isArray(req.files) ? req.files.length : 0
  const userId = 'user123'

  const emitProgress = (payload) =>
    emitUploadProgress(userId, {
      uploadId,
      productName,
      totalImages,
      currentImage: 0,
      ...payload
    })

  try {
    emitProgress({
      status: 'started',
      progress: totalImages > 0 ? 5 : 10,
      message: 'Starting upload...'
    })

    const productData = { ...req.body }
    delete productData.uploadId

    if (totalImages > 0) {
      const uploadService = await getDefaultUploadService()
      const uploadedImages = []

      for (let i = 0; i < totalImages; i++) {
        const file = req.files[i]

        try {
          const uploadResult = await uploadService.uploadFile(
            file.buffer,
            file.originalname,
            'products'
          )

          uploadedImages.push({
            url: uploadResult.url,
            ...(uploadResult.fileId ? { fileId: uploadResult.fileId } : {}),
            alt: productName
          })
        } catch (uploadError) {
          console.error(`Error uploading image ${file.originalname}:`, uploadError)
          // Keep going so one bad image does not fail the whole product
        }

        emitProgress({
          status: 'uploading',
          progress: Math.round(10 + ((i + 1) / totalImages) * 70),
          currentImage: i + 1,
          message: `Uploading image ${i + 1} of ${totalImages}...`
        })
      }

      productData.images = uploadedImages
    }

    emitProgress({
      status: 'processing',
      progress: 90,
      currentImage: totalImages,
      message: 'Finalizing product creation...'
    })

    const product = await Product.create(productData)

    // Clear every cache that can hold a copy of this product
    await invalidateProductCaches(product._id, product.slug);

    emitCatalogUpdate('product:created', { productId: product._id, slug: product.slug });

    emitProgress({
      status: 'completed',
      progress: 100,
      currentImage: totalImages,
      message: 'Product created successfully!',
      productId: product._id
    })

    // Respond immediately - the old artificial 2s delay only made the client
    // wait longer and hid real errors behind a timeout.
    res.status(201).json({
      success: true,
      data: {
        product,
        uploadId
      }
    });

  } catch (error) {
    console.error('❌ Product creation failed:', error);

    emitProgress({
      status: 'error',
      progress: 0,
      message: error.message || 'Failed to create product',
      error: error.message
    })

    next(error);
  }
});

// @desc    Update book
// @route   PUT /api/v1/products/:id
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), handleMultipleImageUpload, validate(updateProductSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    let product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    const updateData = { ...req.body };

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const uploadService = await getDefaultUploadService();
      const uploadedImages = [];

      // Upload each new image
      for (const file of req.files) {
        const uploadResult = await uploadService.uploadFile(
          file.buffer,
          file.originalname,
          'products'
        );
        
        uploadedImages.push({
          url: uploadResult.url,
          alt: req.body.imageAlt || product.name,
          isMain: uploadedImages.length === 0 && (!product.images || product.images.length === 0)
        });
      }

      // Combine with existing images if any
      if (product.images && product.images.length > 0) {
        updateData.images = [...product.images, ...uploadedImages];
      } else {
        updateData.images = uploadedImages;
      }
    }

    product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

// Clear cache. This used to call deleteCachePattern(`product:${id}`), which
// never matched the `product:<slug>` key the storefront actually reads.
await invalidateProductCaches(id, product.slug);

emitCatalogUpdate('product:updated', { productId: product._id, slug: product.slug });

res.json({
  success: true,
  data: product
});
  } catch (error) {
    next(error);
  }
});

// @desc    Delete book
// @route   DELETE /api/v1/products/:id
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    let product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    // Soft delete
    product.status = 'deleted';
    await product.save();

// Clear cache
await invalidateProductCaches(id, product.slug);

emitCatalogUpdate('product:deleted', { productId: product._id });

res.json({
  success: true,
  message: 'Product deleted successfully'
});
  } catch (error) {
    next(error);
  }
});

// @desc    Get featured products
// @route   GET /api/v1/products/featured
// @access  Public
router.get('/featured/list', optionalAuth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const cacheKey = `products:featured:${limit}`;
    let cachedProducts = await getCache(cacheKey);
    
    if (cachedProducts) {
      return res.json({
        success: true,
        data: cachedProducts
      });
    }

    const products = await Product.find({ 
      featured: true, 
      status: 'active', 
      visibility: 'public' 
    })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Cache result
    await setCache(cacheKey, products, 600); // 10 minutes

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get flash sale products
// @route   GET /api/v1/products/flash-sale
// @access  Public
router.get('/flash-sale/list', optionalAuth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const cacheKey = `products:flash-sale:${limit}`;
    let cachedProducts = await getCache(cacheKey);
    
    if (cachedProducts) {
      return res.json({
        success: true,
        data: cachedProducts
      });
    }

    const now = new Date();
    const products = await Product.find({ 
      'flashSale.enabled': true,
      'flashSale.startDate': { $lte: now },
      'flashSale.endDate': { $gte: now },
      status: 'active',
      visibility: 'public'
    })
      .populate('category', 'name slug')
      .sort({ 'flashSale.endDate': 1 })
      .limit(limit);

    // Cache result
    await setCache(cacheKey, products, 60); // 1 minute (flash sales change frequently)

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
});

export default router;
