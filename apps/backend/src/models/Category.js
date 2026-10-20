import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Category name cannot be more than 50 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  image: {
    type: String,
    default: null
  },
  icon: {
    type: String,
    default: null
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0
  },
  path: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  metadata: {
    productCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Create indexes (slug is already indexed via unique: true)
categorySchema.index({ parent: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ isActive: 1, sortOrder: 1 });

// Generate slug
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Update level and path when parent changes
categorySchema.pre('save', async function(next) {
  if (this.isModified('parent')) {
    if (this.parent) {
      const parentCategory = await this.constructor.findById(this.parent);
      this.level = parentCategory.level + 1;
      this.path = parentCategory.path ? `${parentCategory.path}/${this.slug}` : this.slug;
    } else {
      this.level = 0;
      this.path = this.slug;
    }
  }
  next();
});

// Get children categories
categorySchema.methods.getChildren = function() {
  return this.constructor.find({ parent: this._id, isActive: true }).sort({ sortOrder: 1, name: 1 });
};

// Get full path
categorySchema.methods.getFullPath = async function() {
  if (!this.parent) return [this];
  
  const parent = await this.constructor.findById(this.parent);
  const parentPath = await parent.getFullPath();
  return [...parentPath, this];
};

export default mongoose.model('Category', categorySchema);
