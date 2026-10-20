import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    name: String,
    option: String
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
  sessionId: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 2592000 // 30 days
  }
}, {
  timestamps: true
});

// Create indexes (expiresAt is already indexed via expires option)
cartSchema.index({ user: 1 });
cartSchema.index({ sessionId: 1 });

// Calculate subtotal
cartSchema.methods.calculateSubtotal = function() {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// Add item to cart
cartSchema.methods.addItem = function(product, quantity = 1, variant = null) {
  const existingItem = this.items.find(item => 
    item.product.toString() === product._id.toString() &&
    (!variant || (item.variant.name === variant.name && item.variant.option === variant.option))
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({
      product: product._id,
      variant: variant,
      quantity: quantity,
      price: product.price
    });
  }

  return this.save();
};

// Remove item from cart
cartSchema.methods.removeItem = function(productId, variant = null) {
  this.items = this.items.filter(item => {
    const productMatch = item.product.toString() !== productId.toString();
    const variantMatch = variant ? 
      !(item.variant.name === variant.name && item.variant.option === variant.option) : 
      true;
    return productMatch || variantMatch;
  });

  return this.save();
};

// Update item quantity
cartSchema.methods.updateItemQuantity = function(productId, quantity, variant = null) {
  const item = this.items.find(item => 
    item.product.toString() === productId.toString() &&
    (!variant || (item.variant.name === variant.name && item.variant.option === variant.option))
  );

  if (item) {
    if (quantity <= 0) {
      return this.removeItem(productId, variant);
    } else {
      item.quantity = quantity;
      return this.save();
    }
  }

  return Promise.resolve(this);
};

// Clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

// Merge guest cart with user cart
cartSchema.methods.mergeWithGuestCart = function(guestCart) {
  guestCart.items.forEach(guestItem => {
    const existingItem = this.items.find(item => 
      item.product.toString() === guestItem.product.toString() &&
      JSON.stringify(item.variant) === JSON.stringify(guestItem.variant)
    );

    if (existingItem) {
      existingItem.quantity += guestItem.quantity;
    } else {
      this.items.push(guestItem);
    }
  });

  return this.save();
};

export default mongoose.model('Cart', cartSchema);
