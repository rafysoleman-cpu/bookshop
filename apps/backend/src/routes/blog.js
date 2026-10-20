import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Blog Post Schema (simplified for now)
const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot be more than 500 characters']
  },
  featuredImage: {
    type: String,
    default: null
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  tags: [String],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  viewCount: {
    type: Number,
    default: 0
  },
  readTime: {
    type: Number,
    default: 0
  },
  publishedAt: Date
}, {
  timestamps: true
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

// @desc    Get all blog posts
// @route   GET /api/v1/blog
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { category, tag, search, status = 'published' } = req.query;

    const query = { status };

    if (category) query.category = category;
    if (tag) query.tags = { $in: [tag] };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ];
    }

    const posts = await BlogPost.find(query)
      .populate('author', 'name')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await BlogPost.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts,
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

// @desc    Get single blog post
// @route   GET /api/v1/blog/:slug
// @access  Public
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    const post = await BlogPost.findOne({ slug, status: 'published' })
      .populate('author', 'name');

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    // Increment view count
    post.viewCount += 1;
    await post.save();

    // Get related posts
    const relatedPosts = await BlogPost.find({
      _id: { $ne: post._id },
      status: 'published',
      $or: [
        { category: post.category },
        { tags: { $in: post.tags } }
      ]
    })
      .populate('author', 'name')
      .sort({ publishedAt: -1 })
      .limit(3);

    res.json({
      success: true,
      data: {
        post,
        relatedPosts
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get blog categories
// @route   GET /api/v1/blog/categories
// @access  Public
router.get('/categories/all', async (req, res, next) => {
  try {
    const categories = await BlogPost.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', count: 1 } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get popular posts
// @route   GET /api/v1/blog/popular
// @access  Public
router.get('/popular/list', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const posts = await BlogPost.find({ status: 'published' })
      .populate('author', 'name')
      .sort({ viewCount: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    next(error);
  }
});

export default router;
