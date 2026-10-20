import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middlewares/auth.js';
import { validate, updateProfileSchema, changePasswordSchema, updateThemeSchema } from '../utils/validation.js';
import { deleteCache } from '../config/redis.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

const router = express.Router();

// All routes are protected
router.use(protect);

/**
 * Keep `Product.wishlistCount` in step with `User.wishlist`.
 *
 * `wishlistCount` is derived state — the authoritative record of who saved a
 * product is the wishlist array on the user document. Two rules keep it honest:
 *
 *  1. Only adjust the count on a real transition (the id was genuinely added,
 *     or was genuinely present before removal). A repeated no-op request must
 *     not inflate the number. Callers detect this with `modifiedCount` on an
 *     `$addToSet`/`$pull` rather than by checking first and then writing, which
 *     would race.
 *  2. Only decrement when the current count is above zero, so the field can
 *     never be driven negative by a removal from wishlists that predate this
 *     counter.
 */
const incrementWishlistCounts = async (productIds) => {
  const ids = [...new Set(productIds.map(String))];
  if (ids.length === 0) return;

  await Product.updateMany(
    { _id: { $in: ids } },
    { $inc: { wishlistCount: 1 } }
  );
};

const decrementWishlistCounts = async (productIds) => {
  const ids = [...new Set(productIds.map(String))];
  if (ids.length === 0) return;

  await Product.updateMany(
    { _id: { $in: ids }, wishlistCount: { $gt: 0 } },
    { $inc: { wishlistCount: -1 } }
  );
};

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
router.put('/profile', validate(updateProfileSchema), async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update interface theme preference
// @route   PUT /api/v1/users/theme
// @access  Private
router.put('/theme', validate(updateThemeSchema), async (req, res, next) => {
  try {
    const { theme } = req.body;

    // findByIdAndUpdate rather than save(): the `protect` middleware already
    // loaded the document, and saving it would write back every field it
    // read, which turns a cosmetic preference change into a lost-update race
    // against a concurrent profile or address edit.
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { themePreference: theme },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // The auth flow caches the serialised user under this key on login, so a
    // stale entry would hand the old preference back on the next sign-in.
    await deleteCache(`user:${req.user._id}`);

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Change password
// @route   PUT /api/v1/users/password
// @access  Private
router.put('/password', validate(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Check current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user addresses
// @route   GET /api/v1/users/addresses
// @access  Private
router.get('/addresses', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: req.user.addresses
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add address
// @route   POST /api/v1/users/addresses
// @access  Private
router.post('/addresses', async (req, res, next) => {
  try {
    const { type, name, phone, address, city, postalCode, country, isDefault } = req.body;
    
    const user = await User.findById(req.user._id);
    
    // If this is default, remove default from other addresses
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }
    
    user.addresses.push({
      type,
      name,
      phone,
      address,
      city,
      postalCode,
      country,
      isDefault: isDefault || false
    });
    
    await user.save();
    
    res.json({
      success: true,
      data: {
        addresses: user.addresses
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update address
// @route   PUT /api/v1/users/addresses/:addressId
// @access  Private
router.put('/addresses/:addressId', async (req, res, next) => {
  try {
    const { type, name, phone, address, city, postalCode, country, isDefault } = req.body;
    const { addressId } = req.params;
    
    const user = await User.findById(req.user._id);
    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Address not found'
      });
    }
    
    // If this is default, remove default from other addresses
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }
    
    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex],
      type,
      name,
      phone,
      address,
      city,
      postalCode,
      country,
      isDefault: isDefault || false
    };
    
    await user.save();
    
    res.json({
      success: true,
      data: {
        addresses: user.addresses
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete address
// @route   DELETE /api/v1/users/addresses/:addressId
// @access  Private
router.delete('/addresses/:addressId', async (req, res, next) => {
  try {
    const { addressId } = req.params;
    
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
    
    await user.save();
    
    res.json({
      success: true,
      data: {
        addresses: user.addresses
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's wishlist
// @route   GET /api/v1/users/wishlist
// @access  Private
router.get('/wishlist', async (req, res, next) => {
  try {
    // Match on populate so archived/draft/deleted products drop out of the
    // saved list instead of rendering as unbuyable entries in the storefront.
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      match: { status: 'active', visibility: 'public' }
    });
    
    res.json({
      success: true,
      data: {
        wishlist: user.wishlist
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add to wishlist
// @route   POST /api/v1/users/wishlist
// @access  Private
router.post('/wishlist', async (req, res, next) => {
  try {
    const { productId } = req.body;

    // Reject anything that is not a real product id before touching the
    // document, otherwise a bad id is persisted as a dead reference.
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product id'
      });
    }

    const product = await Product.findById(productId).select('_id');
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // `$addToSet` is idempotent, which fixes the duplicate bug: `wishlist`
    // holds ObjectId instances while `productId` arrives as a string, so the
    // previous `wishlist.includes(productId)` was a string-vs-ObjectId
    // comparison that was always false and appended on every call.
    //
    // The "was it already there?" test has to live in the filter, not in a
    // prior read: the filter is evaluated atomically with the update, so two
    // concurrent adds cannot both pass. We read `matchedCount` rather than
    // `modifiedCount` because the User model has `timestamps: true`, which
    // bumps `updatedAt` on every update — `modifiedCount` is therefore 1 even
    // when `$addToSet` adds nothing, and using it double-counted re-adds.
    const addResult = await User.updateOne(
      { _id: req.user._id, wishlist: { $ne: product._id } },
      { $addToSet: { wishlist: product._id } }
    );

    if (addResult.matchedCount === 1) {
      await incrementWishlistCounts([product._id]);
    }

    const updated = await User.findById(req.user._id).select('wishlist');
    
    res.json({
      success: true,
      data: {
        wishlist: updated.wishlist
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Remove a product from wishlist
// @route   DELETE /api/v1/users/wishlist/:productId
// @access  Private
router.delete('/wishlist/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product id'
      });
    }

    // Same reasoning as the add route: the guard goes in the filter so it is
    // evaluated atomically with the update, and `matchedCount` (not
    // `modifiedCount`, which `timestamps: true` always sets to 1) tells us
    // whether this call was the one that actually removed it.
    const pullResult = await User.updateOne(
      { _id: req.user._id, wishlist: productId },
      { $pull: { wishlist: productId } }
    );

    if (pullResult.matchedCount === 1) {
      await decrementWishlistCounts([productId]);
    }

    const updated = await User.findById(req.user._id).select('wishlist');

    res.json({
      success: true,
      data: {
        wishlist: updated.wishlist
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Clear the entire wishlist
// @route   DELETE /api/v1/users/wishlist
// @access  Private
router.delete('/wishlist', async (req, res, next) => {
  try {
    // Snapshot the array first: after `$set: []` the ids are gone, and the
    // counters still need to know what to decrement.
    const user = await User.findById(req.user._id).select('wishlist');
    const removedIds = (user?.wishlist || []).map(String);

    // One atomic write. Clearing by issuing one DELETE per item races against
    // itself: each handler reads the document, edits in memory and saves, so
    // concurrent requests overwrite one another and leave items behind.
    await User.updateOne({ _id: req.user._id }, { $set: { wishlist: [] } });

    // Each saved product loses exactly this one user, so a single bulk
    // decrement over the snapshot is correct. Duplicates are collapsed inside
    // the helper, which keeps the count right even for legacy rows that
    // accumulated repeats.
    await decrementWishlistCounts(removedIds);

    res.json({
      success: true,
      data: {
        wishlist: []
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
