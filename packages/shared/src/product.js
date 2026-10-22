/* global URL, FormData */
/**
 * Single source of truth for the product (book) domain.
 *
 * This module is intentionally dependency free so it can be imported by the
 * browser bundle (AdminProductAdd / AdminProductEdit) and by the backend. It
 * describes:
 *   - every enum the database accepts
 *   - every editable field, its label, type and constraints
 *   - the canonical empty form / product -> form mapping
 *   - client side validation that mirrors the server Joi schema
 *   - serialisation of the form into the API payload shape
 *
 * The Joi schema in `productJoi.js` is generated from the same rules, so the
 * frontend, the API contract and the Mongoose model cannot drift apart.
 */

/* ------------------------------------------------------------------ */
/* Enums and limits                                                    */
/* ------------------------------------------------------------------ */

export const PRODUCT_STATUSES = ['draft', 'active', 'archived', 'deleted'];

export const PRODUCT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' }
];

export const PRODUCT_VISIBILITIES = ['public', 'private', 'hidden'];

export const PRODUCT_VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'hidden', label: 'Hidden' }
];

export const BOOK_FORMATS = ['hardcover', 'paperback', 'ebook', 'audiobook'];

export const BOOK_FORMAT_OPTIONS = [
  { value: 'paperback', label: 'Paperback' },
  { value: 'hardcover', label: 'Hardcover' },
  { value: 'ebook', label: 'Ebook' },
  { value: 'audiobook', label: 'Audiobook' }
];

export const WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz'];
export const DIMENSION_UNITS = ['cm', 'in'];

export const MAX_PRODUCT_IMAGES = 10;
export const MAX_IMAGE_SIZE_MB = 20;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const MAX_VARIANT_OPTIONS = 50;
export const IMAGE_ACCEPT = 'image/*';

export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

/** Defaults that must match the Mongoose schema defaults. */
export const PRODUCT_DEFAULTS = {
  format: 'paperback',
  language: 'English',
  status: 'draft',
  visibility: 'public',
  featured: false,
  inventoryQuantity: 0,
  trackQuantity: true,
  allowBackorder: false,
  lowStockThreshold: 10,
  weightUnit: 'kg',
  dimensionUnit: 'cm',
  freeShipping: false,
  taxable: true,
  taxRate: 0
};

/* ------------------------------------------------------------------ */
/* Field rules                                                         */
/* ------------------------------------------------------------------ */

/**
 * Flat rule map keyed by API path.
 * `type` drives both client validation and Joi generation.
 * `requiredOnCreate` also means "required everywhere": the Mongoose model
 * requires these paths, so the forms require them in create and edit alike.
 */
export const PRODUCT_FIELD_RULES = {
  name: { label: 'Book title', type: 'string', requiredOnCreate: true, min: 1, max: 100 },
  slug: { label: 'URL slug', type: 'string', min: 1, max: 120 },
  shortDescription: { label: 'Short description', type: 'string', max: 200 },
  description: { label: 'Description', type: 'string', max: 2000 },
  author: { label: 'Author', type: 'string', requiredOnCreate: true, min: 1, max: 150 },
  isbn: { label: 'ISBN', type: 'string', max: 20 },
  publisher: { label: 'Publisher', type: 'string', max: 150 },
  pages: { label: 'Pages', type: 'integer', min: 1 },
  format: { label: 'Format', type: 'enum', values: BOOK_FORMATS },
  language: { label: 'Language', type: 'string', max: 50 },
  edition: { label: 'Edition', type: 'string', max: 50 },
  publishedDate: { label: 'Published date', type: 'date' },
  sku: { label: 'SKU', type: 'string', max: 64 },
  barcode: { label: 'Barcode', type: 'string', max: 64 },
  category: { label: 'Genre', type: 'objectId', requiredOnCreate: true },
  subcategories: { label: 'Subcategories', type: 'objectIdArray' },
  price: { label: 'Price', type: 'money', requiredOnCreate: true, min: 0 },
  compareAtPrice: { label: 'Compare at price', type: 'money', min: 0 },
  costPrice: { label: 'Cost price', type: 'money', min: 0 },
  status: { label: 'Status', type: 'enum', values: PRODUCT_STATUSES },
  visibility: { label: 'Visibility', type: 'enum', values: PRODUCT_VISIBILITIES },
  featured: { label: 'Featured', type: 'boolean' },
  tags: { label: 'Tags', type: 'stringArray', itemMax: 200 },
  uploadId: { label: 'Upload id', type: 'string' },
  mainImageIndex: { label: 'Main image index', type: 'integer', min: 0, max: MAX_PRODUCT_IMAGES - 1 },
  imageAlt: { label: 'Image alt text', type: 'string' },

  'inventory.quantity': { label: 'Quantity', type: 'integer', requiredOnCreate: true, min: 0 },
  'inventory.trackQuantity': { label: 'Track quantity', type: 'boolean' },
  'inventory.allowBackorder': { label: 'Allow backorder', type: 'boolean' },
  'inventory.lowStockThreshold': { label: 'Low stock threshold', type: 'integer', min: 0 },

  'weight.value': { label: 'Weight', type: 'number', min: 0 },
  'weight.unit': { label: 'Weight unit', type: 'enum', values: WEIGHT_UNITS },

  'dimensions.length': { label: 'Length', type: 'number', min: 0, groupOf: 'dimensions' },
  'dimensions.width': { label: 'Width', type: 'number', min: 0, groupOf: 'dimensions' },
  'dimensions.height': { label: 'Height', type: 'number', min: 0, groupOf: 'dimensions' },
  'dimensions.unit': { label: 'Dimension unit', type: 'enum', values: DIMENSION_UNITS },

  'seo.title': { label: 'SEO title', type: 'string' },
  'seo.description': { label: 'SEO description', type: 'string' },
  'seo.keywords': { label: 'SEO keywords', type: 'stringArray', itemMax: 200 },

  'video.url': { label: 'Video URL', type: 'url' },
  'video.thumbnail': { label: 'Video thumbnail URL', type: 'url' },

  'shipping.freeShipping': { label: 'Free shipping', type: 'boolean' },
  'shipping.shippingCost': { label: 'Shipping cost', type: 'money', min: 0 },
  'shipping.shippingWeight': { label: 'Shipping weight', type: 'number', min: 0 },
  'shipping.shippingDimensions.length': { label: 'Shipping length', type: 'number', min: 0, groupOf: 'shippingDimensions' },
  'shipping.shippingDimensions.width': { label: 'Shipping width', type: 'number', min: 0, groupOf: 'shippingDimensions' },
  'shipping.shippingDimensions.height': { label: 'Shipping height', type: 'number', min: 0, groupOf: 'shippingDimensions' },

  'tax.taxable': { label: 'Taxable', type: 'boolean' },
  'tax.taxRate': { label: 'Tax rate', type: 'number', min: 0 },

  'flashSale.enabled': { label: 'Flash sale', type: 'boolean' },
  'flashSale.discountPercentage': { label: 'Discount percentage', type: 'number', min: 0, max: 100 },
  'flashSale.startDate': { label: 'Flash sale start', type: 'date' },
  'flashSale.endDate': { label: 'Flash sale end', type: 'date' },
  'flashSale.maxQuantity': { label: 'Flash sale quantity', type: 'integer', min: 0 }
};

/**
 * Object groups accepted by the API. The Joi builder uses this to nest the
 * flat rules above. Keys are API paths, values are the child keys.
 */
export const PRODUCT_GROUPS = {
  inventory: { fields: ['quantity', 'trackQuantity', 'allowBackorder', 'lowStockThreshold'], requiredOnCreate: true },
  weight: { fields: ['value', 'unit'] },
  dimensions: { fields: ['length', 'width', 'height', 'unit'] },
  seo: { fields: ['title', 'description', 'keywords'] },
  video: { fields: ['url', 'thumbnail'], requiredChildrenWhenPresent: ['url'] },
  shipping: { fields: ['freeShipping', 'shippingCost', 'shippingWeight', 'shippingDimensions'] },
  tax: { fields: ['taxable', 'taxRate'] },
  flashSale: { fields: ['enabled', 'discountPercentage', 'startDate', 'endDate', 'maxQuantity'] }
};

/** Nested object inside `shipping`. */
export const SHIPPING_DIMENSION_FIELDS = ['length', 'width', 'height'];

/** Fields serialised as real JSON in multipart requests. */
export const MULTIPART_JSON_FIELDS = [
  'dimensions',
  'tags',
  'weight',
  'inventory',
  'seo',
  'subcategories',
  'imagesJson',
  'uploadedImages',
  'imageAlts',
  'video',
  'variants',
  'flashSale',
  'shipping',
  'tax',
  // Sent as JSON so an explicit `null` (clear this value) survives multipart.
  'pages',
  'compareAtPrice',
  'costPrice',
  'publishedDate'
];

/** Optional values that the server treats as "not provided" when empty. */
export const OPTIONAL_EMPTY_FIELDS = ['pages', 'compareAtPrice', 'costPrice'];

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

export const isBlank = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

export const toText = (value) => {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value.trim() : String(value).trim();
};

export const toInputValue = (value) => {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
};

export const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

export const toDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16);
};

export const toNumberOrNull = (value) => {
  if (isBlank(value)) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toIntegerOrNull = (value) => {
  if (isBlank(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseCsv = (value, max = Infinity) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => toText(item)).filter(Boolean))].slice(0, max);
  }
  if (typeof value !== 'string') return [];
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, max);
};

export const slugify = (value) =>
  toText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Which form section a validation error belongs to (used to scroll to it). */
export const PRODUCT_FIELD_SECTIONS = {
  name: 'basic',
  slug: 'basic',
  shortDescription: 'basic',
  description: 'basic',
  author: 'basic',
  isbn: 'basic',
  publisher: 'basic',
  pages: 'basic',
  format: 'basic',
  language: 'basic',
  edition: 'basic',
  publishedDate: 'basic',
  price: 'pricing',
  compareAtPrice: 'pricing',
  costPrice: 'pricing',
  sku: 'inventory',
  barcode: 'inventory',
  category: 'organization',
  subcategories: 'organization',
  status: 'organization',
  visibility: 'organization',
  featured: 'organization',
  tags: 'organization',
  weight: 'shipping',
  dimensions: 'shipping',
  shipping: 'shipping',
  tax: 'promotions',
  flashSale: 'promotions',
  images: 'images',
  video: 'video',
  seo: 'seo',
  variants: 'variants'
};

export const getProductSectionForField = (path) => {
  const root = String(path).split('.')[0];
  return PRODUCT_FIELD_SECTIONS[root] || 'basic';
};

export const getPath = (object, path) =>
  path.split('.').reduce((cursor, key) => (cursor == null ? undefined : cursor[key]), object);

/* ------------------------------------------------------------------ */
/* Canonical form state                                                */
/* ------------------------------------------------------------------ */

export const createEmptyProductForm = () => ({
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  author: '',
  isbn: '',
  publisher: '',
  pages: '',
  format: PRODUCT_DEFAULTS.format,
  language: PRODUCT_DEFAULTS.language,
  edition: '',
  publishedDate: '',
  sku: '',
  barcode: '',
  price: '',
  compareAtPrice: '',
  costPrice: '',
  category: '',
  subcategories: [],
  status: PRODUCT_DEFAULTS.status,
  visibility: PRODUCT_DEFAULTS.visibility,
  featured: PRODUCT_DEFAULTS.featured,
  tags: [],
  inventory: {
    quantity: String(PRODUCT_DEFAULTS.inventoryQuantity),
    trackQuantity: PRODUCT_DEFAULTS.trackQuantity,
    allowBackorder: PRODUCT_DEFAULTS.allowBackorder,
    lowStockThreshold: String(PRODUCT_DEFAULTS.lowStockThreshold)
  },
  weight: { value: '', unit: PRODUCT_DEFAULTS.weightUnit },
  dimensions: { length: '', width: '', height: '', unit: PRODUCT_DEFAULTS.dimensionUnit },
  shipping: {
    freeShipping: PRODUCT_DEFAULTS.freeShipping,
    shippingCost: '',
    shippingWeight: '',
    shippingDimensions: { length: '', width: '', height: '' }
  },
  tax: { taxable: PRODUCT_DEFAULTS.taxable, taxRate: String(PRODUCT_DEFAULTS.taxRate) },
  flashSale: { enabled: false, discountPercentage: '', startDate: '', endDate: '', maxQuantity: '' },
  video: { url: '', thumbnail: '' },
  seo: { title: '', description: '', keywords: [] },
  variants: [],
  images: []
});

/** Map an API product document onto the canonical form. */
export const productToForm = (product = {}) => {
  const form = createEmptyProductForm();

  form.name = product.name ?? '';
  form.slug = product.slug ?? '';
  form.shortDescription = product.shortDescription ?? '';
  form.description = product.description ?? '';
  form.author = product.author ?? '';
  form.isbn = product.isbn ?? '';
  form.publisher = product.publisher ?? '';
  form.pages = toInputValue(product.pages);
  form.format = product.format ?? PRODUCT_DEFAULTS.format;
  form.language = product.language ?? PRODUCT_DEFAULTS.language;
  form.edition = product.edition ?? '';
  form.publishedDate = toDateInput(product.publishedDate);
  form.sku = product.sku ?? '';
  form.barcode = product.barcode ?? '';
  form.price = toInputValue(product.price);
  form.compareAtPrice = toInputValue(product.compareAtPrice);
  form.costPrice = toInputValue(product.costPrice);
  form.category =
    product.category && typeof product.category === 'object'
      ? product.category._id ?? ''
      : product.category ?? '';
  form.subcategories = Array.isArray(product.subcategories)
    ? product.subcategories
        .map((sub) => (sub && typeof sub === 'object' ? sub._id : sub))
        .filter(Boolean)
    : [];
  form.status = product.status ?? PRODUCT_DEFAULTS.status;
  form.visibility = product.visibility ?? PRODUCT_DEFAULTS.visibility;
  form.featured = Boolean(product.featured);
  form.tags = Array.isArray(product.tags) ? [...product.tags] : [];

  form.inventory = {
    quantity: toInputValue(product.inventory?.quantity ?? PRODUCT_DEFAULTS.inventoryQuantity),
    trackQuantity: product.inventory?.trackQuantity ?? PRODUCT_DEFAULTS.trackQuantity,
    allowBackorder: product.inventory?.allowBackorder ?? PRODUCT_DEFAULTS.allowBackorder,
    lowStockThreshold: toInputValue(product.inventory?.lowStockThreshold ?? PRODUCT_DEFAULTS.lowStockThreshold)
  };

  form.weight = {
    value: toInputValue(product.weight?.value),
    unit: product.weight?.unit || PRODUCT_DEFAULTS.weightUnit
  };

  form.dimensions = {
    length: toInputValue(product.dimensions?.length),
    width: toInputValue(product.dimensions?.width),
    height: toInputValue(product.dimensions?.height),
    unit: product.dimensions?.unit || PRODUCT_DEFAULTS.dimensionUnit
  };

  form.shipping = {
    freeShipping: product.shipping?.freeShipping ?? PRODUCT_DEFAULTS.freeShipping,
    shippingCost: toInputValue(product.shipping?.shippingCost),
    shippingWeight: toInputValue(product.shipping?.shippingWeight),
    shippingDimensions: {
      length: toInputValue(product.shipping?.shippingDimensions?.length),
      width: toInputValue(product.shipping?.shippingDimensions?.width),
      height: toInputValue(product.shipping?.shippingDimensions?.height)
    }
  };

  form.tax = {
    taxable: product.tax?.taxable ?? PRODUCT_DEFAULTS.taxable,
    taxRate: toInputValue(product.tax?.taxRate ?? PRODUCT_DEFAULTS.taxRate)
  };

  form.flashSale = {
    enabled: Boolean(product.flashSale?.enabled),
    discountPercentage: toInputValue(product.flashSale?.discountPercentage),
    startDate: toDateTimeInput(product.flashSale?.startDate),
    endDate: toDateTimeInput(product.flashSale?.endDate),
    maxQuantity: toInputValue(product.flashSale?.maxQuantity)
  };

  form.video = {
    url: product.video?.url ?? '',
    thumbnail: product.video?.thumbnail ?? ''
  };

  form.seo = {
    title: product.seo?.title ?? '',
    description: product.seo?.description ?? '',
    keywords: Array.isArray(product.seo?.keywords) ? [...product.seo.keywords] : []
  };

  form.variants = Array.isArray(product.variants)
    ? product.variants.map((variant) => ({
        name: variant?.name ?? '',
        options: Array.isArray(variant?.options) ? variant.options.join(', ') : '',
        price: toInputValue(variant?.price),
        sku: variant?.sku ?? '',
        image: variant?.image ?? '',
        inventory: toInputValue(variant?.inventory)
      }))
    : [];

  form.images = Array.isArray(product.images)
    ? product.images.map((image, index) => ({
        url: image?.url ?? '',
        alt: image?.alt ?? '',
        fileId: image?.fileId ?? '',
        isMain: image?.isMain ?? index === 0,
        file: null,
        previewUrl: ''
      }))
    : [];

  return form;
};

/* ------------------------------------------------------------------ */
/* Client side validation (mirrors the Joi schema)                     */
/* ------------------------------------------------------------------ */

const validationPaths = () => Object.keys(PRODUCT_FIELD_RULES);

const isNumeric = (value) => {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string' && value.trim() !== '') return Number.isFinite(Number(value));
  return false;
};

/**
 * @returns {Record<string, string>} errors keyed by form path (dot notation).
 */
export const validateProductForm = (form) => {
  const errors = {};
  const addError = (path, message) => {
    if (!errors[path]) errors[path] = message;
  };

  validationPaths().forEach((path) => {
    const rule = PRODUCT_FIELD_RULES[path];
    if (!rule) return;

    const value = getPath(form, path);
    const required = Boolean(rule.requiredOnCreate);

    if (isBlank(value)) {
      if (required) addError(path, `${rule.label} is required`);
      return;
    }

    switch (rule.type) {
      case 'string': {
        const text = toText(value);
        if (rule.min && text.length < rule.min) addError(path, `${rule.label} is required`);
        if (rule.max && text.length > rule.max) {
          addError(path, `${rule.label} must be ${rule.max} characters or fewer`);
        }
        break;
      }
      case 'url': {
        const text = toText(value);
        try {
          // eslint-disable-next-line no-new
          new URL(text);
        } catch {
          addError(path, `Enter a valid ${rule.label.toLowerCase()}`);
        }
        break;
      }
      case 'integer': {
        if (!isNumeric(value)) {
          addError(path, `${rule.label} must be a number`);
          break;
        }
        const number = Number(value);
        if (!Number.isInteger(number)) addError(path, `${rule.label} must be a whole number`);
        else if (rule.min !== undefined && number < rule.min) {
          addError(path, `${rule.label} must be at least ${rule.min}`);
        } else if (rule.max !== undefined && number > rule.max) {
          addError(path, `${rule.label} must be at most ${rule.max}`);
        }
        break;
      }
      case 'number': {
        if (!isNumeric(value)) {
          addError(path, `${rule.label} must be a number`);
          break;
        }
        const number = Number(value);
        if (rule.min !== undefined && number < rule.min) {
          addError(path, `${rule.label} must be at least ${rule.min}`);
        } else if (rule.max !== undefined && number > rule.max) {
          addError(path, `${rule.label} must be at most ${rule.max}`);
        }
        break;
      }
      case 'money': {
        if (!isNumeric(value)) {
          addError(path, `${rule.label} must be a number`);
          break;
        }
        if (Number(value) < (rule.min ?? 0)) {
          addError(path, `${rule.label} cannot be negative`);
        }
        break;
      }
      case 'date': {
        if (Number.isNaN(new Date(value).getTime())) addError(path, `${rule.label} is not a valid date`);
        break;
      }
      case 'objectId': {
        if (!OBJECT_ID_PATTERN.test(String(value))) addError(path, `Select a valid ${rule.label.toLowerCase()}`);
        break;
      }
      case 'enum': {
        if (!rule.values.includes(value)) addError(path, `${rule.label} is invalid`);
        break;
      }
      case 'stringArray': {
        if (!Array.isArray(value)) {
          addError(path, `${rule.label} must be a list`);
          break;
        }
        const tooLong = value.find((item) => rule.itemMax && toText(item).length > rule.itemMax);
        if (tooLong) addError(path, `Each ${rule.label.toLowerCase()} entry must be ${rule.itemMax} characters or fewer`);
        break;
      }
      case 'objectIdArray': {
        if (!Array.isArray(value)) {
          addError(path, `${rule.label} must be a list`);
          break;
        }
        if (value.some((item) => !OBJECT_ID_PATTERN.test(String(item)))) {
          addError(path, `${rule.label} contains an invalid selection`);
        }
        break;
      }
      default:
        break;
    }
  });

  // Object groups that must be complete once any member is filled in.
  const dimensionPaths = ['dimensions.length', 'dimensions.width', 'dimensions.height'];
  const filledDimensions = dimensionPaths.filter((path) => !isBlank(getPath(form, path)));
  if (filledDimensions.length > 0 && filledDimensions.length < dimensionPaths.length) {
    dimensionPaths.forEach((path) => {
      if (isBlank(getPath(form, path))) addError(path, 'Fill in all three dimensions');
    });
  }

  const shippingDimensionPaths = SHIPPING_DIMENSION_FIELDS.map((field) => `shipping.shippingDimensions.${field}`);
  const filledShippingDimensions = shippingDimensionPaths.filter((path) => !isBlank(getPath(form, path)));
  if (filledShippingDimensions.length > 0 && filledShippingDimensions.length < shippingDimensionPaths.length) {
    shippingDimensionPaths.forEach((path) => {
      if (isBlank(getPath(form, path))) addError(path, 'Fill in all three shipping dimensions');
    });
  }

  // Variants
  if (Array.isArray(form.variants)) {
    form.variants.forEach((variant, index) => {
      if (isBlank(variant?.name)) addError(`variants.${index}.name`, 'Variant name is required');
      if (variant?.name && toText(variant.name).length > 100) {
        addError(`variants.${index}.name`, 'Variant name must be 100 characters or fewer');
      }
      if (!isNumeric(variant?.price)) addError(`variants.${index}.price`, 'Variant price is required');
      else if (Number(variant.price) < 0) addError(`variants.${index}.price`, 'Variant price cannot be negative');
      if (!isNumeric(variant?.inventory)) addError(`variants.${index}.inventory`, 'Variant stock is required');
      else if (Number(variant.inventory) < 0) addError(`variants.${index}.inventory`, 'Variant stock cannot be negative');
      if (variant?.image) {
        try {
          // eslint-disable-next-line no-new
          new URL(variant.image);
        } catch {
          addError(`variants.${index}.image`, 'Variant image must be a valid URL');
        }
      }
    });
  }

  // Images (files and existing entries share the maximum)
  if (Array.isArray(form.images) && form.images.length > MAX_PRODUCT_IMAGES) {
    addError('images', `Only ${MAX_PRODUCT_IMAGES} images are allowed`);
  }

  // Flash sale sanity check (the API accepts partial values, but an inverted
  // window is always a mistake).
  if (form.flashSale?.enabled) {
    const start = toText(form.flashSale.startDate);
    const end = toText(form.flashSale.endDate);
    if (start && end && new Date(start) >= new Date(end)) {
      addError('flashSale.endDate', 'End date must be after the start date');
    }
  }

  return errors;
};

/* ------------------------------------------------------------------ */
/* Serialisation (form -> API payload)                                 */
/* ------------------------------------------------------------------ */

const serializeString = (value) => toText(value);

const serializeImageList = (images) =>
  (Array.isArray(images) ? images : [])
    .filter((image) => !image?.file && image?.url)
    .slice(0, MAX_PRODUCT_IMAGES)
    .map((image) => ({
      url: image.url,
      alt: image.alt ?? '',
      ...(image.fileId ? { fileId: image.fileId } : {}),
      isMain: Boolean(image.isMain)
    }));

const serializeVariants = (variants) =>
  (Array.isArray(variants) ? variants : [])
    .filter((variant) => !isBlank(variant?.name))
    .map((variant) => ({
      name: toText(variant.name),
      options: parseCsv(variant.options, MAX_VARIANT_OPTIONS),
      price: toNumberOrNull(variant.price) ?? 0,
      sku: toText(variant.sku),
      image: toText(variant.image),
      inventory: toIntegerOrNull(variant.inventory) ?? 0
    }));

/**
 * Split the image list into already stored images and newly selected files.
 * `mainImageIndex` always refers to the final list the API will store, which is
 * `[existing..., uploaded...]` for updates and simply the file order on create.
 */
export const splitProductImages = (images) => {
  const list = Array.isArray(images) ? images : [];
  const existing = list.filter((image) => image?.file ? false : Boolean(image?.url));
  const newEntries = list.filter((image) => Boolean(image?.file));
  const ordered = [...existing, ...newEntries];
  const foundIndex = ordered.findIndex((image) => image?.isMain);
  return {
    existing: serializeImageList(existing),
    files: newEntries.map((image) => image.file),
    alts: newEntries.map((image) => toText(image.alt)),
    mainImageIndex: foundIndex === -1 ? 0 : foundIndex
  };
};

/**
 * Convert the canonical form into the API payload (everything except the files
 * themselves, which travel as multipart parts).
 *
 * @param {object} form
 * @param {{ mode?: 'create'|'update' }} options
 */
export const serializeProductForm = (form, { mode = 'create' } = {}) => {
  const isUpdate = mode === 'update';
  const payload = {};

  payload.name = serializeString(form.name);
  if (form.slug !== undefined && toText(form.slug) !== '') payload.slug = toText(form.slug);
  payload.shortDescription = serializeString(form.shortDescription);
  payload.description = serializeString(form.description);
  payload.author = serializeString(form.author);
  payload.isbn = serializeString(form.isbn);
  payload.publisher = serializeString(form.publisher);
  payload.format = form.format;
  payload.language = serializeString(form.language);
  payload.edition = serializeString(form.edition);

  const pages = toIntegerOrNull(form.pages);
  payload.pages = pages;

  payload.publishedDate = toText(form.publishedDate) || null;

  payload.sku = serializeString(form.sku);
  payload.barcode = serializeString(form.barcode);

  payload.price = toNumberOrNull(form.price) ?? 0;
  payload.compareAtPrice = toNumberOrNull(form.compareAtPrice);
  payload.costPrice = toNumberOrNull(form.costPrice);

  payload.category = form.category;
  payload.subcategories = Array.isArray(form.subcategories) ? [...form.subcategories] : [];

  payload.status = form.status;
  payload.visibility = form.visibility;
  payload.featured = Boolean(form.featured);
  payload.tags = [...(Array.isArray(form.tags) ? form.tags : [])];

  payload.inventory = {
    quantity: toIntegerOrNull(form.inventory?.quantity) ?? 0,
    trackQuantity: Boolean(form.inventory?.trackQuantity),
    allowBackorder: Boolean(form.inventory?.allowBackorder),
    lowStockThreshold: toIntegerOrNull(form.inventory?.lowStockThreshold) ?? PRODUCT_DEFAULTS.lowStockThreshold
  };

  const weightValue = toNumberOrNull(form.weight?.value);
  payload.weight =
    weightValue === null
      ? null
      : { value: weightValue, unit: form.weight?.unit || PRODUCT_DEFAULTS.weightUnit };

  const dimensionValues = ['length', 'width', 'height'].map((key) => toNumberOrNull(form.dimensions?.[key]));
  payload.dimensions =
    dimensionValues.every((value) => value === null)
      ? null
      : {
          length: dimensionValues[0] ?? 0,
          width: dimensionValues[1] ?? 0,
          height: dimensionValues[2] ?? 0,
          unit: form.dimensions?.unit || PRODUCT_DEFAULTS.dimensionUnit
        };

  const shippingDimensionValues = SHIPPING_DIMENSION_FIELDS.map((key) =>
    toNumberOrNull(form.shipping?.shippingDimensions?.[key])
  );
  payload.shipping = {
    freeShipping: Boolean(form.shipping?.freeShipping),
    shippingCost: toNumberOrNull(form.shipping?.shippingCost),
    shippingWeight: toNumberOrNull(form.shipping?.shippingWeight),
    shippingDimensions: shippingDimensionValues.every((value) => value === null)
      ? null
      : {
          length: shippingDimensionValues[0] ?? 0,
          width: shippingDimensionValues[1] ?? 0,
          height: shippingDimensionValues[2] ?? 0
        }
  };

  payload.tax = {
    taxable: Boolean(form.tax?.taxable),
    taxRate: toNumberOrNull(form.tax?.taxRate)
  };

  payload.flashSale = {
    enabled: Boolean(form.flashSale?.enabled),
    discountPercentage: form.flashSale?.enabled ? toNumberOrNull(form.flashSale.discountPercentage) : null,
    startDate: form.flashSale?.enabled && toText(form.flashSale.startDate) ? form.flashSale.startDate : null,
    endDate: form.flashSale?.enabled && toText(form.flashSale.endDate) ? form.flashSale.endDate : null,
    maxQuantity: form.flashSale?.enabled ? toIntegerOrNull(form.flashSale.maxQuantity) : null
  };

  payload.video = {
    url: serializeString(form.video?.url),
    thumbnail: serializeString(form.video?.thumbnail)
  };

  payload.seo = {
    title: serializeString(form.seo?.title),
    description: serializeString(form.seo?.description),
    keywords: [...(Array.isArray(form.seo?.keywords) ? form.seo.keywords : [])]
  };

  payload.variants = serializeVariants(form.variants);

  const { existing, files, alts, mainImageIndex } = splitProductImages(form.images);
  payload.mainImageIndex = mainImageIndex;
  if (files.length > 0) payload.imageAlts = alts;

  if (isUpdate) {
    payload.imagesJson = existing;
  }

  return { payload, files };
};

/**
 * Serialise the API payload into multipart form data.
 * Nested structures are stringified because the backend only parses the
 * whitelisted JSON fields back into real values. `null` is sent for those
 * fields so an explicit "clear this value" survives the transport.
 */
export const buildProductFormData = (payload = {}, files = []) => {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;

    if (value === null) {
      if (MULTIPART_JSON_FIELDS.includes(key)) formData.append(key, JSON.stringify(null));
      return;
    }

    if (MULTIPART_JSON_FIELDS.includes(key) || typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
      return;
    }

    formData.append(key, String(value));
  });

  (Array.isArray(files) ? files : []).forEach((file) => {
    if (file) formData.append('images', file);
  });

  return formData;
};

/* ------------------------------------------------------------------ */
/* Image helpers                                                       */
/* ------------------------------------------------------------------ */

export const validateImageFile = (file) => {
  if (!file) return 'Choose an image file';
  if (!file.type?.startsWith('image/')) return `${file.name || 'File'} is not an image`;
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `${file.name || 'File'} is larger than ${MAX_IMAGE_SIZE_MB}MB`;
  }
  return null;
};

/**
 * Append validated files to an image list. Works for both the add page (all
 * images are files) and the edit page (stored images + new files).
 *
 * @returns {{ images: object[], errors: string[] }}
 */
export const addProductImageFiles = (images, files, createPreviewUrl = () => '') => {
  const list = Array.isArray(images) ? [...images] : [];
  const errors = [];
  const additions = [];

  Array.from(files ?? []).forEach((file) => {
    const problem = validateImageFile(file);
    if (problem) {
      errors.push(problem);
      return;
    }
    if (list.length + additions.length >= MAX_PRODUCT_IMAGES) {
      errors.push(`Only ${MAX_PRODUCT_IMAGES} images are allowed`);
      return;
    }

    const { name = '' } = file;
    additions.push({
      url: '',
      alt: name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      fileId: '',
      isMain: false,
      file,
      previewUrl: createPreviewUrl(file)
    });
  });

  const merged = [...list, ...additions];
  if (merged.length > 0 && !merged.some((image) => image.isMain)) {
    merged[0] = { ...merged[0], isMain: true };
  }

  return { images: merged, errors };
};

export const removeProductImageAt = (images, index) => {
  const list = Array.isArray(images) ? [...images] : [];
  const removed = list[index] ?? null;
  const next = list.filter((_, position) => position !== index);

  if (next.length > 0 && !next.some((image) => image.isMain)) {
    next[0] = { ...next[0], isMain: true };
  }

  return { images: next, removed };
};

export const setMainProductImageAt = (images, index) =>
  (Array.isArray(images) ? images : []).map((image, position) => ({
    ...image,
    isMain: position === index
  }));

export const moveProductImage = (images, index, direction) => {
  const list = Array.isArray(images) ? [...images] : [];
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;

  const [moved] = list.splice(index, 1);
  list.splice(target, 0, moved);
  return list;
};

export const updateProductImageAlt = (images, index, alt) =>
  (Array.isArray(images) ? images : []).map((image, position) =>
    position === index ? { ...image, alt } : image
  );
