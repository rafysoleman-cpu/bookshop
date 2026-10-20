import express from 'express';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validate, createCategorySchema } from '../utils/validation.js';
import { getCache, setCache, deleteCachePattern } from '../config/redis.js';
import { handleCategoryImageUpload } from '../middlewares/categoryUpload.js';

const router = express.Router();

// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const cacheKey = 'categories:all';
    let cachedCategories = await getCache(cacheKey);

    if (cachedCategories) {
      return res.json({
        success: true,
        data: cachedCategories
      });
    }

    // Resolve the products collection name so the $lookup below cannot drift
    // if the Product model's collection is ever renamed.
    const Product = mongoose.model('Product');
    const productCollection = Product.collection.name;

    // Aggregate so each category carries a real productCount. Mirrors the
    // storefront filter in routes/product.js (status active + public) so the
    // number in the nav matches the number of products actually listed.
    const categories = await Category.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: productCollection,
          let: { categoryId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$category', '$$categoryId'] } } },
            { $match: { status: 'active', visibility: 'public' } },
            { $count: 'count' }
          ],
          as: 'productCount'
        }
      },
      {
        $addFields: {
          productCount: {
            $ifNull: [{ $arrayElemAt: ['$productCount.count', 0] }, 0]
          }
        }
      },
      { $sort: { level: 1, sortOrder: 1, name: 1 } }
    ]);

    // Hydrate parent (name/slug) on the aggregated plain objects.
    const parents = await Category.find({
      _id: { $in: categories.map((category) => category.parent).filter(Boolean) }
    })
      .select('name slug')
      .lean();

    const parentMap = new Map(parents.map((parent) => [String(parent._id), parent]));

    const data = categories.map((category) => ({
      ...category,
      parent: category.parent ? parentMap.get(String(category.parent)) || null : null
    }));

    // Cache result
    await setCache(cacheKey, data, 1800); // 30 minutes

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get category by slug
// @route   GET /api/v1/categories/:slug
// @access  Public
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    const cacheKey = `category:${slug}`;
    let cachedCategory = await getCache(cacheKey);

    if (cachedCategory) {
      return res.json({
        success: true,
        data: cachedCategory
      });
    }

    const category = await Category.findOne({ slug, isActive: true })
      .populate('parent', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Get children categories
    const children = await category.getChildren();

    const result = {
      ...category.toJSON(),
      children
    };

    // Cache result
    await setCache(cacheKey, result, 1800); // 30 minutes

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get category tree
// @route   GET /api/v1/categories/tree
// @access  Public
router.get('/tree/all', async (req, res, next) => {
  try {
    const cacheKey = 'categories:tree';
    let cachedTree = await getCache(cacheKey);

    if (cachedTree) {
      return res.json({
        success: true,
        data: cachedTree
      });
    }

    // Get root categories (level 0)
    const rootCategories = await Category.find({
      parent: null,
      isActive: true
    })
      .sort({ sortOrder: 1, name: 1 });

    // Build tree recursively
    const buildTree = async (categories) => {
      const tree = [];

      for (const category of categories) {
        const children = await Category.find({
          parent: category._id,
          isActive: true
        })
          .sort({ sortOrder: 1, name: 1 });

        const categoryData = category.toJSON();

        if (children.length > 0) {
          categoryData.children = await buildTree(children);
        }

        tree.push(categoryData);
      }

      return tree;
    };

    const tree = await buildTree(rootCategories);

    // Cache result
    await setCache(cacheKey, tree, 1800); // 30 minutes

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create category
// @route   POST /api/v1/categories
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), handleCategoryImageUpload, async (req, res, next) => {
  console.log('🔄 CATEGORY CREATION ROUTE CALLED');
  try {
    // Debug logging
    console.log('🔍 CATEGORY CREATION DEBUG:');
    console.log('📋 Request headers:', Object.keys(req.headers));
    console.log('📋 Content-Type:', req.headers['content-type']);
    console.log('📋 Request body exists:', !!req.body);
    console.log('📋 Request body type:', typeof req.body);
    console.log('📋 Request body:', req.body);
    console.log('📋 Request file:', req.file);

    // Check if body exists
    if (!req.body) {
      console.log('❌ Request body is completely missing');
      return res.status(400).json({
        success: false,
        error: 'Request body is missing. This usually means the request was not sent as multipart/form-data.'
      });
    }

    console.log('📋 Body keys found:', Object.keys(req.body));

    // Extract and validate fields from FormData
    const { name, slug, description, status, parentId } = req.body;

    console.log('📋 Extracted fields:');
    console.log('  name:', name, 'type:', typeof name, 'length:', name?.length);
    console.log('  slug:', slug, 'type:', typeof slug, 'length:', slug?.length);
    console.log('  description:', description, 'type:', typeof description, 'length:', description?.length);
    console.log('  status:', status, 'type:', typeof status);
    console.log('  parentId:', parentId, 'type:', typeof parentId);

    // Validation with detailed error messages
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('❌ Name validation failed');
      return res.status(400).json({
        success: false,
        error: 'Category name is required and must be a non-empty string'
      });
    }

    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      console.log('❌ Slug validation failed');
      return res.status(400).json({
        success: false,
        error: 'Category slug is required and must be a non-empty string'
      });
    }

    console.log('✅ Validation passed');

    // Prepare category data
    const categoryData = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description ? description.trim() : '',
      status: status || 'active',
      parentId: parentId || null
    };

    // Add image URL if uploaded
    if (req.file) {
      // For now, just store the file info. In a real app, you'd upload to cloud storage
      categoryData.image = {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      };
      console.log('📋 Added image data:', categoryData.image);
    }

    console.log('📋 Final category data for DB:', categoryData);

    const category = await Category.create(categoryData);

    // Clear cache
    await deleteCachePattern('categories:*');

    console.log('✅ Category created successfully:', category._id);

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('❌ Category creation error:', error);

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

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), handleCategoryImageUpload, async (req, res, next) => {
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

    // Add image URL if uploaded
    if (req.file && req.file.url) {
      updateData.image = req.file.url;
    }

    category = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    // Clear cache
    await deleteCachePattern('categories:*');

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete category
// @route   DELETE /api/v1/categories/:id
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if category has children
    const hasChildren = await Category.findOne({ parent: id });
    if (hasChildren) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with subcategories'
      });
    }

    // Soft delete
    category.isActive = false;
    await category.save();

    // Clear cache
    await deleteCachePattern('categories:*');

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Bulk delete categories
// @route   DELETE /api/v1/categories/bulk
// @access  Private (Admin)
router.delete('/bulk', protect, authorize('admin'), async (req, res, next) => {
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
    await deleteCachePattern('categories:*');

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

export default router;
