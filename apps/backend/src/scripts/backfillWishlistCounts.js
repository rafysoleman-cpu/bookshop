/**
 * Recompute `Product.wishlistCount` from the authoritative source: the
 * `wishlist` arrays on user documents.
 *
 * The wishlist routes now maintain the counter incrementally, but rows written
 * before that existed have `wishlistCount: 0` while users do have saved
 * products, so the field reads wrong until this runs. Safe to re-run — it sets
 * absolute values rather than adjusting them.
 *
 *   node src/scripts/backfillWishlistCounts.js            # dry run, prints plan
 *   node src/scripts/backfillWishlistCounts.js --apply    # performs the writes
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/database.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

dotenv.config();

const APPLY = process.argv.includes('--apply');

/** Count distinct users holding each product, collapsing legacy duplicates. */
const buildCounts = async () => {
  const rows = await User.aggregate([
    { $unwind: '$wishlist' },
    {
      $group: {
        _id: '$wishlist',
        // A legacy wishlist could hold the same id more than once; count the
        // user once.
        savers: { $addToSet: '$_id' }
      }
    },
    { $project: { _id: 1, count: { $size: '$savers' } } }
  ]);

  return new Map(rows.map((row) => [String(row._id), row.count]));
};

const main = async () => {
  await connectDB();

  const actual = await buildCounts();

  // Start from every product so ones that should drop to 0 are reset too.
  const desired = new Map();
  const products = await Product.find({}, '_id wishlistCount').lean();
  for (const product of products) {
    desired.set(String(product._id), actual.get(String(product._id)) || 0);
  }

  // Any wishlist entry pointing at a product that no longer exists.
  const orphans = [...actual.keys()].filter((id) => !desired.has(id));

  const stale = products.filter((product) => {
    const want = desired.get(String(product._id));
    return (product.wishlistCount || 0) !== want;
  });

  console.log(`\nProducts scanned : ${products.length}`);
  console.log(`Products to fix  : ${stale.length}`);
  console.log(`Orphan wishlist refs (product deleted, not fixable here): ${orphans.length}`);

  if (!stale.length) {
    console.log('\n✅ wishlistCount already consistent — nothing to do.');
  } else {
    const sample = stale.slice(0, 10).map((p) => ({
      product: String(p._id),
      current: p.wishlistCount || 0,
      shouldBe: desired.get(String(p._id))
    }));
    console.log('\nSample of changes:');
    console.table(sample);
  }

  if (orphans.length) {
    console.log('\nOrphaned ids:', orphans.slice(0, 10).join(', '));
    console.log('These reference removed products; clean them from User.wishlist.');
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write changes.');
  } else {
    const bulk = stale.map((product) => ({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { wishlistCount: desired.get(String(product._id)) } }
      }
    }));

    if (bulk.length) {
      const result = await Product.bulkWrite(bulk, { ordered: false });
      console.log(`\n✅ Updated ${result.modifiedCount} product(s).`);
    }

    if (orphans.length) {
      const cleaned = await User.updateMany(
        { wishlist: { $in: orphans } },
        { $pull: { wishlist: { $in: orphans } } }
      );
      console.log(`✅ Removed orphan refs from ${cleaned.modifiedCount} user(s).`);
    }
  }

  await mongoose.connection.close();
};

main().catch(async (error) => {
  console.error('❌ Backfill failed:', error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});