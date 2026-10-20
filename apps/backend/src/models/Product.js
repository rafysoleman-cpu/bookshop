import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    required: false,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: false,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description cannot be more than 200 characters']
  },
  author: {
    type: String,
    trim: true,
    maxlength: [150, 'Author name cannot be more than 150 characters']
  },
  isbn: {
    type: String,
    trim: true,
    maxlength: [20, 'ISBN cannot be more than 20 characters']
  },
  publisher: {
    type: String,
    trim: true,
    maxlength: [150, 'Publisher name cannot be more than 150 characters']
  },
  pages: {
    type: Number,
    min: [1, 'Page count must be at least 1']
  },
  format: {
    type: String,
    enum: ['hardcover', 'paperback', 'ebook', 'audiobook'],
    default: 'paperback'
  },
  language: {
    type: String,
    trim: true,
    default: 'English',
    maxlength: [50, 'Language cannot be more than 50 characters']
  },
  edition: {
    type: String,
    trim: true,
    maxlength: [50, 'Edition cannot be more than 50 characters']
  },
  publishedDate: {
    type: Date
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  sku: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  barcode: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  compareAtPrice: {
    type: Number,
    min: [0, 'Compare at price cannot be negative']
  },
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative']
  },
  images: [{
    url: String,
    alt: String,
    fileId: String,
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  video: {
    url: String,
    thumbnail: String
  },
  variants: [{
    name: String,
    options: [String],
    price: Number,
    sku: String,
    image: String,
    inventory: Number
  }],
  inventory: {
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Inventory cannot be negative']
    },
    trackQuantity: {
      type: Boolean,
      default: true
    },
    allowBackorder: {
      type: Boolean,
      default: false
    },
    lowStockThreshold: {
      type: Number,
      default: 10
    }
  },
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['kg', 'g', 'lb', 'oz'],
      default: 'kg'
    }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'in'],
      default: 'cm'
    }
  },
  tags: [String],
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived', 'deleted'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'hidden'],
    default: 'public'
  },
  featured: {
    type: Boolean,
    default: false
  },
  flashSale: {
    enabled: {
      type: Boolean,
      default: false
    },
    discountPercentage: Number,
    startDate: Date,
    endDate: Date,
    maxQuantity: Number,
    soldQuantity: {
      type: Number,
      default: 0
    }
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  soldCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  wishlistCount: {
    type: Number,
    default: 0
  },
  shipping: {
    freeShipping: {
      type: Boolean,
      default: false
    },
    shippingCost: {
      type: Number,
      default: 0
    },
    shippingWeight: Number,
    shippingDimensions: {
      length: Number,
      width: Number,
      height: Number
    }
  },
  tax: {
    taxable: {
      type: Boolean,
      default: true
    },
    taxRate: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    source: String,
    externalId: String
  }
}, {
  timestamps: true
});

// Create text index for search
productSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  author: 'text',
  publisher: 'text'
});

// Compound indexes
productSchema.index({ isbn: 1 }, { unique: true, sparse: true });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ viewCount: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ 'flashSale.enabled': 1, 'flashSale.endDate': 1 });

// Keep blank ISBN values out of the unique sparse index
productSchema.pre('validate', function(next) {
  if (this.isbn === '' || this.isbn === null) {
    this.isbn = undefined;
  }
  next();
});

// Generate slug
productSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  }
  next();
});

// Update soldCount when order is completed
productSchema.methods.updateSoldCount = function(quantity) {
  this.soldCount += quantity;
  return this.save();
};

// Update ratings
productSchema.methods.updateRatings = async function() {
  const Review = mongoose.model('Review');
  const reviews = await Review.find({ product: this._id, status: 'approved' });
  
  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    this.ratings.average = totalRating / reviews.length;
    this.ratings.count = reviews.length;
  } else {
    this.ratings.average = 0;
    this.ratings.count = 0;
  }
  
  return this.save();
};

export default mongoose.model('Product', productSchema);
