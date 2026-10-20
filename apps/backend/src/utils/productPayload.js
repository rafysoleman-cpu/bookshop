const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const PRODUCT_STATUSES = ['draft', 'active', 'archived', 'deleted'];
const PRODUCT_VISIBILITIES = ['public', 'private', 'hidden'];
const BOOK_FORMATS = ['hardcover', 'paperback', 'ebook', 'audiobook'];
const WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz'];
const DIMENSION_UNITS = ['cm', 'in'];

export const MAX_PRODUCT_IMAGES = 10;
export const MAX_VARIANT_OPTIONS = 50;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isBlank = (value) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

export const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export const parseMoney = (value) => {
  if (isBlank(value)) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? roundMoney(parsed) : undefined;
};

export const parseNumber = (value) => {
  if (isBlank(value)) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalised)) return true;
    if (['false', '0', 'no', 'off', ''].includes(normalised)) return false;
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return undefined;
};

export const parseText = (value) => {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'string' ? value.trim() : String(value).trim();
};

const parseUniqueText = (value) => {
  const parsed = parseText(value);
  if (parsed === undefined) return undefined;
  return parsed.length > 0 ? parsed : undefined;
};

const parseSparseUniqueText = (value) => {
  const parsed = parseText(value);
  if (parsed === undefined) return undefined;
  return parsed.length > 0 ? parsed : null;
};

export const parseEnumValue = (value, allowed) => {
  const parsed = parseText(value);
  return parsed && allowed.includes(parsed) ? parsed : undefined;
};

export const parseObjectIds = (value) => {
  if (!Array.isArray(value)) return undefined;
  const ids = [...new Set(value.map((id) => parseText(id)).filter((id) => id && OBJECT_ID_PATTERN.test(id)))];
  return ids.length > 0 ? ids : [];
};

export const parseStringList = (value) => {
  if (!Array.isArray(value)) return undefined;
  const items = [...new Set(value.map((item) => parseText(item)).filter(Boolean))];
  return items;
};

const put = (target, key, value) => {
  if (value !== undefined) target[key] = value;
};

const parseWeight = (value) => {
  if (!isPlainObject(value)) return undefined;
  const amount = parseNumber(value.value);
  if (amount === undefined) return undefined;

  const weight = { value: amount, unit: parseEnumValue(value.unit, WEIGHT_UNITS) ?? 'kg' };
  return weight;
};

const parseDimensions = (value) => {
  if (!isPlainObject(value)) return undefined;

  const length = parseNumber(value.length);
  const width = parseNumber(value.width);
  const height = parseNumber(value.height);
  if (length === undefined || width === undefined || height === undefined) return undefined;

  return {
    length,
    width,
    height,
    unit: parseEnumValue(value.unit, DIMENSION_UNITS) ?? 'cm'
  };
};

const parseDate = (value) => {
  if (isBlank(value)) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const parseSeo = (value) => {
  if (!isPlainObject(value)) return undefined;

  const seo = {};
  put(seo, 'title', parseText(value.title) ?? '');
  put(seo, 'description', parseText(value.description) ?? '');
  put(seo, 'keywords', parseStringList(value.keywords) ?? []);

  return seo;
};

const parseVideo = (value) => {
  if (!isPlainObject(value)) return undefined;

  const url = parseText(value.url);
  const thumbnail = parseText(value.thumbnail);

  if (!url && !thumbnail) return { url: null, thumbnail: null };
  if (!url) return { url: null, thumbnail };

  return thumbnail ? { url, thumbnail } : { url };
};

const parseFlashSale = (value) => {
  if (!isPlainObject(value)) return undefined;

  const enabled = parseBoolean(value.enabled) ?? false;

  if (!enabled) {
    return {
      enabled: false,
      discountPercentage: null,
      startDate: null,
      endDate: null,
      maxQuantity: null
    };
  }

  const flashSale = { enabled: true };

  const discount = parseNumber(value.discountPercentage);
  put(flashSale, 'discountPercentage', discount);

  const start = value.startDate ? new Date(value.startDate) : null;
  const end = value.endDate ? new Date(value.endDate) : null;
  if (start && !Number.isNaN(start.getTime())) flashSale.startDate = start;
  if (end && !Number.isNaN(end.getTime())) flashSale.endDate = end;

  const maxQuantity = parseNumber(value.maxQuantity);
  put(flashSale, 'maxQuantity', maxQuantity);

  return flashSale;
};

const parseShipping = (value) => {
  if (!isPlainObject(value)) return undefined;

  const shipping = { freeShipping: parseBoolean(value.freeShipping) ?? false };

  const cost = parseMoney(value.shippingCost);
  if (cost !== undefined) shipping.shippingCost = cost;

  const weight = parseNumber(value.shippingWeight);
  if (weight !== undefined) shipping.shippingWeight = weight;

  if (isPlainObject(value.shippingDimensions)) {
    const length = parseNumber(value.shippingDimensions.length);
    const width = parseNumber(value.shippingDimensions.width);
    const height = parseNumber(value.shippingDimensions.height);
    if (length !== undefined && width !== undefined && height !== undefined) {
      shipping.shippingDimensions = { length, width, height };
    }
  }

  return shipping;
};

const parseTax = (value) => {
  if (!isPlainObject(value)) return undefined;

  const tax = { taxable: parseBoolean(value.taxable) ?? true };

  const rate = parseNumber(value.taxRate);
  if (rate !== undefined) tax.taxRate = rate;

  return tax;
};

const parseVariants = (value) => {
  if (!Array.isArray(value)) return undefined;

  return value
    .filter(isPlainObject)
    .map((variant) => {
      const options = parseStringList(variant.options)?.slice(0, MAX_VARIANT_OPTIONS) ?? [];
      const normalised = { name: parseText(variant.name) ?? '', options };

      put(normalised, 'price', parseMoney(variant.price));
      put(normalised, 'sku', parseText(variant.sku));
      put(normalised, 'image', parseText(variant.image));
      put(normalised, 'inventory', parseNumber(variant.inventory));

      return normalised;
    })
    .filter((variant) => variant.name !== '');
};

const parseInventory = (value, currentInventory) => {
  if (!isPlainObject(value)) return undefined;

  const inventory = {};

  put(inventory, 'trackQuantity', parseBoolean(value.trackQuantity));
  put(inventory, 'allowBackorder', parseBoolean(value.allowBackorder));
  put(inventory, 'lowStockThreshold', parseNumber(value.lowStockThreshold));

  inventory.quantity = parseNumber(value.quantity) ?? currentInventory?.quantity ?? 0;

  return inventory;
};

export const parseClientImages = (value) => {
  if (!Array.isArray(value)) return undefined;

  const images = value
    .filter(isPlainObject)
    .map((image) => {
      const url = parseText(image.url);
      if (!url) return null;

      const normalised = { url };
      put(normalised, 'alt', parseText(image.alt));
      put(normalised, 'isMain', parseBoolean(image.isMain));
      put(normalised, 'fileId', parseText(image.fileId));

      return normalised;
    })
    .filter(Boolean)
    .slice(0, MAX_PRODUCT_IMAGES);

  return images;
};

export const mergeImageLists = (keptImages, uploadedImages) => {
  const merged = [...(keptImages ?? []), ...(uploadedImages ?? [])].slice(0, MAX_PRODUCT_IMAGES);
  return ensureSingleMainImage(merged);
};

/**
 * Resolve the image list a client asked for.
 * `clientImages === undefined` means the client did not send image metadata at all,
 * in which case the upload list (if any) becomes the new product image list.
 */
export const resolveClientImages = (clientImages, uploadedImages) => {
  if (clientImages === undefined) {
    return mergeImageLists([], uploadedImages);
  }
  return mergeImageLists(clientImages, uploadedImages);
};

export const ensureSingleMainImage = (images) => {
  if (!Array.isArray(images) || images.length === 0) return [];

  const mainIndex = images.findIndex((image) => image?.isMain === true);

  return images.map((image, index) => ({
    ...image,
    isMain: mainIndex === -1 ? index === 0 : index === mainIndex
  }));
};

export const buildProductUpdate = (body, existingProduct) => {
  const update = {};

  put(update, 'name', parseText(body.name));
  put(update, 'slug', parseText(body.slug));
  put(update, 'shortDescription', parseText(body.shortDescription));
  put(update, 'description', parseText(body.description));
  put(update, 'author', parseText(body.author));
  put(update, 'isbn', parseSparseUniqueText(body.isbn));
  put(update, 'publisher', parseText(body.publisher));
  put(update, 'pages', parseNumber(body.pages));
  put(update, 'format', parseEnumValue(body.format, BOOK_FORMATS));
  put(update, 'language', parseText(body.language));
  put(update, 'edition', parseText(body.edition));
  put(update, 'publishedDate', parseDate(body.publishedDate));
  put(update, 'sku', parseUniqueText(body.sku));
  put(update, 'barcode', parseSparseUniqueText(body.barcode));

  put(update, 'price', parseMoney(body.price));
  put(update, 'compareAtPrice', parseMoney(body.compareAtPrice));
  put(update, 'costPrice', parseMoney(body.costPrice));

  if (body.category !== undefined) {
    const category = parseText(body.category);
    update.category = category && OBJECT_ID_PATTERN.test(category) ? category : undefined;
  }

  put(update, 'subcategories', parseObjectIds(body.subcategories));
  put(update, 'status', parseEnumValue(body.status, PRODUCT_STATUSES));
  put(update, 'visibility', parseEnumValue(body.visibility, PRODUCT_VISIBILITIES));
  put(update, 'featured', parseBoolean(body.featured));
  put(update, 'tags', parseStringList(body.tags));

  put(update, 'inventory', parseInventory(body.inventory, existingProduct?.inventory));
  put(update, 'weight', parseWeight(body.weight));
  put(update, 'dimensions', parseDimensions(body.dimensions));
  put(update, 'seo', parseSeo(body.seo));
  put(update, 'video', parseVideo(body.video));
  put(update, 'variants', parseVariants(body.variants));
  put(update, 'flashSale', parseFlashSale(body.flashSale));
  put(update, 'shipping', parseShipping(body.shipping));
  put(update, 'tax', parseTax(body.tax));

  const clientImages = parseClientImages(body.images ?? body.imagesJson);

  if (body.images !== undefined || body.imagesJson !== undefined) {
    update.images = resolveClientImages(clientImages, body.uploadedImages);
  }

  return Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined));
};

export const getRemovedImages = (existingImages, nextImages) => {
  if (!Array.isArray(existingImages)) return [];
  if (!Array.isArray(nextImages)) return [];

  const retained = new Set(nextImages.map((image) => image?.url).filter(Boolean));
  return existingImages.filter((image) => image?.url && !retained.has(image.url));
};
