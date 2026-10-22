import express from 'express';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';

import { protect, authorize } from '../middlewares/auth.js';

import { invalidateProductCaches, invalidateCategoryCaches } from '../utils/cacheInvalidation.js';

import { handleCategoryImageUpload } from '../middlewares/categoryUpload.js';

import { handleMultipleImageUpload } from '../middlewares/uploadMiddleware.js';

import { validate, createProductSchema, updateProductSchema } from '../utils/validation.js';

import { getDefaultUploadService } from '../services/uploadService.js';

import { destroyProductImages, uploadProductImages } from '../services/productImageService.js';

import { buildProductUpdate, buildProductCreate, splitClearedPaths, applyMainImage } from '../utils/productPayload.js';


import { ImageKitService } from '../services/imagekitService.js';

import { emitUploadProgress, emitCatalogUpdate } from '../sockets/socketHandler.js';



const router = express.Router();

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;



// All routes are protected and require admin role

router.use(protect);

router.use(authorize('admin'));



// @desc    Get admin dashboard stats

// @route   GET /api/v1/admin/dashboard

// @access  Private (Admin)

router.get('/dashboard', async (req, res, next) => {

  try {

    // User stats

    const totalUsers = await User.countDocuments();

    const activeUsers = await User.countDocuments({ isActive: true });



    // Book stats

    const totalProducts = await Product.countDocuments();

    const activeProducts = await Product.countDocuments({ status: 'active' });

    const draftProducts = await Product.countDocuments({ status: 'draft' });



    // Order stats

    const totalOrders = await Order.countDocuments();

    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    const processingOrders = await Order.countDocuments({ status: 'processing' });

    const completedOrders = await Order.countDocuments({ status: 'delivered' });



    // Revenue stats

    const paidOrders = await Order.find({ paymentStatus: 'paid' });

    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0);



    // Recent orders

    const recentOrders = await Order.find()

      .populate('user', 'name email')

      .sort({ createdAt: -1 })

      .limit(10);



    // Top books

    const topProducts = await Product.find()

      .sort({ soldCount: -1 })

      .limit(10)

      .select('name author price soldCount');



    // Revenue by month (last 6 months)

    const sixMonthsAgo = new Date();

    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);



    const monthlyRevenue = await Order.aggregate([

      {

        $match: {

          paymentStatus: 'paid',

          createdAt: { $gte: sixMonthsAgo }

        }

      },

      {

        $group: {

          _id: {

            year: { $year: '$createdAt' },

            month: { $month: '$createdAt' }

          },

          revenue: { $sum: '$total' },

          orders: { $sum: 1 }

        }

      },

      {

        $sort: { '_id.year': 1, '_id.month': 1 }

      }

    ]);



    res.json({

      success: true,

      data: {

        stats: {

          users: {

            total: totalUsers,

            active: activeUsers

          },

          products: {

            total: totalProducts,

            active: activeProducts,

            draft: draftProducts

          },

          orders: {

            total: totalOrders,

            pending: pendingOrders,

            processing: processingOrders,

            completed: completedOrders

          },

          revenue: {

            total: totalRevenue,

            monthly: monthlyRevenue

          }

        },

        recentOrders,

        topProducts

      }

    });

  } catch (error) {

    next(error);

  }

});



// @desc    Get all users

// @route   GET /api/v1/admin/users

// @access  Private (Admin)

router.get('/users', async (req, res, next) => {

  try {

    const page = parseInt(req.query.page) || 1;

    const limit = parseInt(req.query.limit) || 20;

    const skip = (page - 1) * limit;



    const { role, status, search } = req.query;

    const query = {};



    if (role) query.role = role;

    if (status === 'active') query.isActive = true;

    if (status === 'inactive') query.isActive = false;

    if (search) {

      query.$or = [

        { name: { $regex: search, $options: 'i' } },

        { email: { $regex: search, $options: 'i' } }

      ];

    }



    const users = await User.find(query)

      .sort({ createdAt: -1 })

      .skip(skip)

      .limit(limit);



    const total = await User.countDocuments(query);



    res.json({

      success: true,

      data: {

        users,

        pagination: {

          page,

          limit,

          total,

          pages: Math.ceil(total / limit)

        }

      }

    });

  } catch (error) {

    next(error);

  }

});



// @desc    Get user by ID

// @route   GET /api/v1/admin/users/:id

// @access  Private (Admin)

router.get('/users/:id', async (req, res, next) => {

  try {

    const { id } = req.params;



    const user = await User.findById(id);



    if (!user) {

      return res.status(404).json({

        success: false,

        error: 'User not found'

      });

    }



    res.json({

      success: true,

      data: user

    });

  } catch (error) {

    next(error);

  }

});



// @desc    Update user

// @route   PUT /api/v1/admin/users/:id

// @access  Private (Admin)

router.put('/users/:id', async (req, res, next) => {

  try {

    const { id } = req.params;

    const { name, email, role, isActive } = req.body;



    const user = await User.findByIdAndUpdate(

      id,

      { name, email, role, isActive },

      { new: true, runValidators: true }

    );



    if (!user) {

      return res.status(404).json({

        success: false,

        error: 'User not found'

      });

    }



    res.json({

      success: true,

      data: user

    });

  } catch (error) {

    next(error);

  }

});



// @desc    Toggle user status

// @route   PATCH /api/v1/admin/users/:id/toggle-status

// @access  Private (Admin)

router.patch('/users/:id/toggle-status', async (req, res, next) => {

  try {

    const { id } = req.params;



    const user = await User.findById(id);



    if (!user) {

      return res.status(404).json({

        success: false,

        error: 'User not found'

      });

    }



    user.isActive = !user.isActive;

    await user.save();



    res.json({

      success: true,

      data: user

    });

  } catch (error) {

    next(error);

  }

});



// @desc    Update user status

// @route   PUT /api/v1/admin/users/:userId/status

// @access  Private (Admin)

router.put('/users/:userId/status', async (req, res, next) => {

  try {

    const { userId } = req.params;

    const { isActive } = req.body;



    const user = await User.findByIdAndUpdate(

      userId,

      { isActive },

      { new: true, runValidators: true }

    );



    if (!user) {

      return res.status(404).json({

        success: false,

        error: 'User not found'

      });

    }



    res.json({

      success: true,

      data: user

    });

  } catch (error) {

    next(error);

  }

});



// @desc    Get all products (admin view)

// @route   GET /api/v1/admin/products

// @access  Private (Admin)

router.get('/products', async (req, res, next) => {

  try {

    console.log('🔍 Admin products query params:', req.query);

    const page = parseInt(req.query.page) || 1;

    const limit = parseInt(req.query.limit) || 20;

    const skip = (page - 1) * limit;



    const { status, category, search } = req.query;

    const query = {};



    if (status) query.status = status;

    if (category) query.category = category;

    if (search) {

      query.$text = { $search: search };

    }

    console.log('🔍 Admin products query:', query);



    const products = await Product.find(query)

      .populate('category', 'name')

      .sort({ createdAt: -1 })

      .skip(skip)

      .limit(limit);

    console.log('🔍 Found products:', products.length);



    const total = await Product.countDocuments(query);



    res.json({

      success: true,

      data: {

        products,

        pagination: {

          page,

          limit,

          total,

          pages: Math.ceil(total / limit)

        }

      }

    });

  } catch (error) {

    next(error);

  }

});



// @desc    Update product status (admin)

// @route   PUT /api/v1/admin/products/:productId/status

// @access  Private (Admin)

router.put('/products/:productId/status', async (req, res, next) => {

  try {

    const { productId } = req.params;

    const { status, featured } = req.body;



    const updateData = {};

    if (status) updateData.status = status;

    if (featured !== undefined) updateData.featured = featured;



    const product = await Product.findByIdAndUpdate(

      productId,

      updateData,

      { new: true, runValidators: true }

    );



    if (!product) {

      return res.status(404).json({

        success: false,

        error: 'Product not found'

      });

    }



    // Clear every cache that can hold a copy of this product
    await invalidateProductCaches(productId, product.slug);

    emitCatalogUpdate('product:status', {
      productId: product._id,
      status: product.status,
      featured: product.featured
    });



    res.json({

      success: true,

      data: product

    });

  } catch (error) {

    next(error);

  }

});




// @desc    Get single product for editing (admin)
// @route   GET /api/v1/admin/products/:id
// @access  Private (Admin)
router.get('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID_PATTERN.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product id'
      });
    }

    const product = await Product.findById(id)

      .populate('category', 'name slug')

      .populate('subcategories', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});



// @desc    Update product (admin)
// @route   PUT /api/v1/admin/products/:id
// @access  Private (Admin)
router.put('/products/:id', handleMultipleImageUpload, validate(updateProductSchema), async (req, res, next) => {
  let newImages = [];

  try {
    const { id } = req.params;

    if (!OBJECT_ID_PATTERN.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product id'
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(400).json({
        success: false,
        error: 'Product not found'
      });
    }

    const previousImages = Array.isArray(product.images) ? [...product.images] : [];
    const previousVideoUrl = product.video?.url || null;
    // Captured before `product.set(update)` overwrites it: the storefront caches
    // detail pages by slug, so the pre-update slug may already be cached and
    // has to be cleared alongside the new one.
    const previousSlug = product.slug;

    if (req.files && req.files.length > 0) {
      newImages = await uploadProductImages(req.files, {
        folder: 'products',
        altText: req.body.name
      });

      const imageAlts = Array.isArray(req.body.imageAlts) ? req.body.imageAlts : [];
      newImages = newImages.map((image, index) => ({
        ...image,
        alt: imageAlts[index] ?? image.alt
      }));
    }

    const update = buildProductUpdate({ ...req.body, uploadedImages: newImages }, product);

    if (!Object.keys(update).length) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided to update'
      });
    }

    const { assignable, cleared } = splitClearedPaths(update);

    // Explicitly cleared values must be unset, not stored as null.
    cleared.forEach((path) => product.set(path, undefined));

    // The admin can pick any image (existing or freshly uploaded) as main.
    if (assignable.images && req.body.mainImageIndex !== undefined) {
      const index = Number.parseInt(req.body.mainImageIndex, 10);
      assignable.images = applyMainImage(assignable.images, Number.isNaN(index) ? 0 : index);
    }

    product.set(assignable);

    await product.save({ validateBeforeSave: true });

    // Storage is only touched after the database write succeeds, so a rejected
    // update can never destroy files that the stored product still references
    const retainedUrls = new Set((product.images || []).map((image) => image.url));
    const removedImages = previousImages.filter(
      (image) => image?.url && !retainedUrls.has(image.url)
    );

    if (removedImages.length > 0) {
      const results = await destroyProductImages(removedImages);
      const failed = results.filter((result) => !result.deleted);

      if (failed.length > 0) {
        console.warn(
          `${failed.length} removed product image(s) could not be deleted from storage:`,
          failed.map((result) => result.url).join(', ')
        );
      }
    }

    if (previousVideoUrl && update.video?.url === null) {
      const [videoResult] = await destroyProductImages([{ url: previousVideoUrl }]);

      if (!videoResult.deleted) {
        console.warn(`Replaced product video could not be deleted from storage: ${previousVideoUrl}`);
      }
    }

    await invalidateProductCaches(id, [previousSlug, product.slug]);

    emitCatalogUpdate('product:updated', {
      productId: product._id,
      slug: product.slug,
      previousSlug: previousSlug !== product.slug ? previousSlug : undefined
    });

    const populated = await Product.findById(id)

      .populate('category', 'name slug')

      .populate('subcategories', 'name slug');

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: populated
    });
  } catch (error) {
    // Never leave freshly uploaded objects behind when the update itself failed
    if (newImages.length > 0) {
      await destroyProductImages(newImages).catch((cleanupError) => {
        console.error('Failed to clean up rolled back product images:', cleanupError.message);
      });
    }

    next(error);
  }
});



// @desc    Delete product (admin)
// @route   DELETE /api/v1/admin/products/:id
// @access  Private (Admin)
router.delete('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Soft delete keeps the stored images so the product can be restored.
    // Skip full document validation: only the status changes here, and a legacy
    // document missing a newer required field must still be deletable.
    product.status = 'deleted';
    await product.save({ validateBeforeSave: false });

    // Clear every cache that can hold a copy of this product
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
// @desc    Get all orders (admin view)

// @route   GET /api/v1/admin/orders

// @access  Private (Admin)

router.get('/orders', async (req, res, next) => {

  try {

    const page = parseInt(req.query.page) || 1;

    const limit = parseInt(req.query.limit) || 20;

    const skip = (page - 1) * limit;



    const { status, paymentStatus, search } = req.query;

    const query = {};



    if (status) query.status = status;

    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (search) {

      query.$or = [

        { orderNumber: { $regex: search, $options: 'i' } },

        { 'shippingAddress.name': { $regex: search, $options: 'i' } }

      ];

    }



    const orders = await Order.find(query)

      .populate('user', 'name email')

      .populate('items.product', 'name')

      .sort({ createdAt: -1 })

      .skip(skip)

      .limit(limit);



    const total = await Order.countDocuments(query);



    res.json({

      success: true,

      data: {

        orders,

        pagination: {

          page,

          limit,

          total,

          pages: Math.ceil(total / limit)

        }

      }

    });

  } catch (error) {

    next(error);

  }

});



// @desc    Get all categories

// @route   GET /api/v1/admin/categories

// @access  Private (Admin)

router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('parent', 'name')
      .sort({ level: 1, sortOrder: 1, name: 1 });

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('❌ Admin category listing error:', error);
    next(error);
  }
});



// @desc    Create category

// @route   POST /api/v1/admin/categories

// @access  Private (Admin)

router.post('/categories', handleCategoryImageUpload, async (req, res, next) => {
  try {
    const { name, slug, description, status, parentId } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required and must be a non-empty string'
      });
    }

    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Category slug is required and must be a non-empty string'
      });
    }

    // Prepare category data
    const categoryData = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description ? description.trim() : '',
      status: status || 'active',
      parentId: parentId || null
    };

    // Upload image to ImageKit if provided
    if (req.file) {
      try {
        const imageKitService = new ImageKitService();

        // Try to upload directly without configuration check
        const uploadResult = await imageKitService.uploadFile(
          req.file.buffer,
          req.file.originalname,
          'categories',
          {
            fileType: 'image',
            tags: ['category', name.trim().toLowerCase()]
          }
        );

        categoryData.image = uploadResult.url;
        console.log('✅ Image uploaded to ImageKit:', uploadResult.url);
      } catch (uploadError) {
        console.error('❌ ImageKit upload failed:', uploadError.message);
        // Continue without image - don't fail the whole category creation
        categoryData.image = null;
      }
    }

    const category = await Category.create(categoryData);

    // Clear cache
    await invalidateCategoryCaches();

    emitCatalogUpdate('category:created', { categoryId: category._id });

    res.status(201).json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('❌ Admin category creation error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: `${field} already exists`
      });
    }

    next(error);
  }
});

// @desc    Bulk delete categories
// @route   DELETE /api/v1/admin/categories/bulk
// @access  Private (Admin)
router.delete('/categories/bulk', async (req, res, next) => {
  try {
    const { categoryIds } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Category IDs array is required'
      });
    }

    // Check if any category has children
    const categoriesWithChildren = await Category.find({
      parent: { $in: categoryIds },
      isActive: true
    });

    if (categoriesWithChildren.length > 0) {
      const parentIds = categoriesWithChildren.map(cat => cat._id.toString());
      return res.status(400).json({
        success: false,
        error: 'Cannot delete categories that have subcategories',
        data: {
          categoriesWithChildren: parentIds
        }
      });
    }

    // Soft delete all categories
    const result = await Category.updateMany(
      { _id: { $in: categoryIds } },
      { isActive: false }
    );

    // Clear cache
    await invalidateCategoryCaches();

    emitCatalogUpdate('category:deleted', { categoryIds: categoryIds, count: result.modifiedCount });

    res.json({
      success: true,
      message: `${result.modifiedCount} categories deleted successfully`,
      data: {
        deletedCount: result.modifiedCount,
        requestedCount: categoryIds.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update category
// @route   PUT /api/v1/admin/categories/:id
// @access  Private (Admin)
router.put('/categories/:id', handleCategoryImageUpload, async (req, res, next) => {
  try {
    const { id } = req.params;

    let category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const updateData = { ...req.body };

    // Upload image to ImageKit if provided
    if (req.file) {
      try {
        const imageKitService = new ImageKitService();

        // Try to upload directly without configuration check
        const uploadResult = await imageKitService.uploadFile(
          req.file.buffer,
          req.file.originalname,
          'categories',
          {
            fileType: 'image',
            tags: ['category', req.body.name?.trim().toLowerCase()]
          }
        );

        updateData.image = uploadResult.url;
        console.log('✅ Image uploaded to ImageKit:', uploadResult.url);
      } catch (uploadError) {
        console.error('❌ ImageKit upload failed:', uploadError.message);
        // Continue without image - don't fail the whole category update
        // Keep existing image if upload fails
      }
    }

    category = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    // Clear cache
    await invalidateCategoryCaches();

    emitCatalogUpdate('category:updated', { categoryId: category._id });

    res.json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('❌ Admin category update error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: `${field} already exists`
      });
    }

    next(error);
  }
});



// @desc    Get all coupons

// @route   GET /api/v1/admin/coupons

// @access  Private (Admin)

router.get('/coupons', async (req, res, next) => {

  try {

    const page = parseInt(req.query.page) || 1;

    const limit = parseInt(req.query.limit) || 20;

    const skip = (page - 1) * limit;



    const { status, search } = req.query;

    const query = {};



    if (status === 'active') query.isActive = true;

    if (status === 'inactive') query.isActive = false;

    if (search) {

      query.$or = [

        { code: { $regex: search, $options: 'i' } },

        { name: { $regex: search, $options: 'i' } }

      ];

    }



    const coupons = await Coupon.find(query)

      .populate('createdBy', 'name')

      .sort({ createdAt: -1 })

      .skip(skip)

      .limit(limit);



    const total = await Coupon.countDocuments(query);



    res.json({

      success: true,

      data: {

        coupons,

        pagination: {

          page,

          limit,

          total,

          pages: Math.ceil(total / limit)

        }

      }

    });

  } catch (error) {

    next(error);

  }

});



// @desc    Create coupon

// @route   POST /api/v1/admin/coupons

// @access  Private (Admin)

router.post('/coupons', async (req, res, next) => {

  try {

    const couponData = {

      ...req.body,

      createdBy: req.user._id

    };



    const coupon = await Coupon.create(couponData);



    res.status(201).json({

      success: true,

      data: coupon

    });

  } catch (error) {

    next(error);

  }

});



// @desc    Update coupon

// @route   PUT /api/v1/admin/coupons/:couponId

// @access  Private (Admin)

router.put('/coupons/:couponId', async (req, res, next) => {

  try {

    const { couponId } = req.params;



    const coupon = await Coupon.findByIdAndUpdate(

      couponId,

      req.body,

      { new: true, runValidators: true }

    );



    if (!coupon) {

      return res.status(404).json({

        success: false,

        error: 'Coupon not found'

      });

    }



    res.json({

      success: true,

      data: coupon

    });

  } catch (error) {

    next(error);

  }

});



// @desc    Delete coupon

// @route   DELETE /api/v1/admin/coupons/:couponId

// @access  Private (Admin)

router.delete('/coupons/:couponId', async (req, res, next) => {

  try {

    const { couponId } = req.params;



    const coupon = await Coupon.findById(couponId);



    if (!coupon) {

      return res.status(404).json({

        success: false,

        error: 'Coupon not found'

      });

    }



    await coupon.remove();



    res.json({

      success: true,

      message: 'Coupon deleted successfully'

    });

  } catch (error) {

    next(error);

  }

});



// @desc    Get analytics data

// @route   GET /api/v1/admin/analytics

// @access  Private (Admin)

router.get('/analytics', async (req, res, next) => {
  try {
    const period = Math.max(1, parseInt(req.query.period, 10) || 30)
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - period)

    const [salesData, userRegistrations, topBooks, totalProducts, totalUsers] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: daysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: daysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            users: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      Product.find()
        .sort({ soldCount: -1 })
        .limit(10)
        .select('name author price soldCount'),
      Product.countDocuments(),
      User.countDocuments()
    ])

    const totalRevenue = salesData.reduce((sum, day) => sum + (day.revenue || 0), 0)
    const totalOrders = salesData.reduce((sum, day) => sum + (day.orders || 0), 0)
    const newUsers = userRegistrations.reduce((sum, day) => sum + (day.users || 0), 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    res.json({
      success: true,
      data: {
        period,
        salesData,
        userRegistrations,
        topBooks,
        totalRevenue,
        totalOrders,
        totalUsers,
        newUsers,
        totalProducts,
        averageOrderValue
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create product with async upload progress
// @route   POST /api/v1/admin/products
// @access  Private (Admin)
router.post('/products', protect, authorize('admin'), handleMultipleImageUpload, validate(createProductSchema), async (req, res, next) => {
  // Prefer the id generated by the client. AdminProductAdd stores it in
  // sessionStorage, so every event can be tied back to the upload the admin
  // started (and the retry flow keeps working).
  const uploadId =
    (typeof req.body.uploadId === 'string' && req.body.uploadId.trim()) ||
    `upload_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

  const productName = req.body.name || 'Product'
  const totalImages = Array.isArray(req.files) ? req.files.length : 0

  // The browser socket joins `user:user123` (see frontend SocketContext).
  // Every upload event must target that exact room or nothing is delivered.
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

    // Never persist the transport-only upload id on the product document.
    const productData = { ...req.body }
    delete productData.uploadId
    const imageAlts = Array.isArray(req.body.imageAlts) ? req.body.imageAlts : []

    // Process images with progress updates
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
            alt: imageAlts[i] || productName
          })
        } catch (uploadError) {
          console.error(`Error uploading image ${file.originalname}:`, uploadError)
          // Continue with the remaining images even if one fails
        }

        // 10% (request received) -> 80% (all images stored)
        emitProgress({
          status: 'uploading',
          progress: Math.round(10 + ((i + 1) / totalImages) * 70),
          currentImage: i + 1,
          message: `Uploading image ${i + 1} of ${totalImages}...`
        })
      }

      productData.uploadedImages = uploadedImages
    }

    // Final processing
    emitProgress({
      status: 'processing',
      progress: 90,
      currentImage: totalImages,
      message: 'Finalizing product creation...'
    })

    // Same normalisation as the update route: the create and edit forms write
    // identical shapes to the database.
    const requestedMainImage = Number.parseInt(productData.mainImageIndex, 10)
    delete productData.mainImageIndex
    const createPayload = buildProductCreate(
      productData,
      productData.uploadedImages ?? [],
      Number.isNaN(requestedMainImage) ? 0 : requestedMainImage
    )
    delete createPayload.uploadedImages

    const product = await Product.create(createPayload)

    // Clear every cache that can hold a copy of this product
    await invalidateProductCaches(product._id, product.slug);

    emitCatalogUpdate('product:created', {
      productId: product._id,
      slug: product.slug
    });

    // Success notification (last event, so the client can clean up)
    emitProgress({
      status: 'completed',
      progress: 100,
      currentImage: totalImages,
      message: 'Product created successfully!',
      productId: product._id
    })

    res.status(201).json({
      success: true,
      data: {
        product,
        uploadId
      }
    })

  } catch (error) {
    console.error('Product creation error:', error)

    emitProgress({
      status: 'error',
      progress: 0,
      message: error.message || 'Failed to create product',
      error: error.message
    })

    next(error)
  }
});

export default router;
