/**
 * Joi schemas generated from the shared field rules.
 *
 * The frontend uses the exact same rules (`product.js`) for client side
 * validation, so "required", "optional", min/max, enums and defaults are
 * defined in exactly one place.
 */
import Joi from 'joi';
import {
  MAX_PRODUCT_IMAGES,
  MAX_VARIANT_OPTIONS,
  OBJECT_ID_PATTERN,
  PRODUCT_FIELD_RULES,
  PRODUCT_GROUPS,
  SHIPPING_DIMENSION_FIELDS
} from './product.js';

const imageSchema = Joi.object({
  url: Joi.string().uri().required(),
  alt: Joi.string().allow('').max(200).optional(),
  fileId: Joi.string().allow('').optional(),
  isMain: Joi.boolean().optional()
});

const variantSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  options: Joi.array().items(Joi.string().trim().max(100)).max(MAX_VARIANT_OPTIONS).required(),
  price: Joi.number().min(0).required(),
  sku: Joi.string().allow('').optional(),
  image: Joi.string().uri().allow('').optional(),
  inventory: Joi.number().integer().min(0).required()
});

const isRequired = (rule, mode) => mode === 'create' && Boolean(rule.requiredOnCreate);

/**
 * Build the Joi schema for a single leaf field described in
 * PRODUCT_FIELD_RULES. `mode` only changes whether the field is required.
 */
const buildLeaf = (path, mode) => {
  const rule = PRODUCT_FIELD_RULES[path];
  if (!rule) throw new Error(`No product field rule defined for "${path}"`);

  const required = isRequired(rule, mode);
  let schema;

  switch (rule.type) {
    case 'string': {
      schema = Joi.string().trim();
      if (rule.min) schema = schema.min(rule.min);
      if (rule.max) schema = schema.max(rule.max);
      // Only fields without a lower bound may be cleared with an empty string.
      if (!rule.min) schema = schema.allow('');
      break;
    }
    case 'url': {
      schema = Joi.string().trim().uri().allow('');
      break;
    }
    case 'integer': {
      schema = Joi.number().integer();
      if (rule.min !== undefined) schema = schema.min(rule.min);
      if (rule.max !== undefined) schema = schema.max(rule.max);
      if (!required) schema = schema.allow(null, '');
      break;
    }
    case 'number': {
      schema = Joi.number();
      if (rule.min !== undefined) schema = schema.min(rule.min);
      if (rule.max !== undefined) schema = schema.max(rule.max);
      if (!required) schema = schema.allow(null, '');
      break;
    }
    case 'money': {
      schema = Joi.alternatives().try(
        Joi.number().min(rule.min ?? 0),
        Joi.string().allow('')
      );
      if (!required) schema = schema.allow(null);
      break;
    }
    case 'date': {
      schema = Joi.date().allow(null, '');
      break;
    }
    case 'enum': {
      schema = Joi.string().valid(...rule.values);
      break;
    }
    case 'boolean': {
      schema = Joi.boolean();
      break;
    }
    case 'objectId': {
      schema = Joi.string().trim().pattern(OBJECT_ID_PATTERN);
      break;
    }
    case 'stringArray': {
      schema = Joi.array().items(Joi.string().trim().min(1).max(rule.itemMax ?? 200));
      break;
    }
    case 'objectIdArray': {
      schema = Joi.array().items(Joi.string().trim().pattern(OBJECT_ID_PATTERN));
      break;
    }
    default:
      throw new Error(`Unsupported product field type "${rule.type}" for "${path}"`);
  }

  return required ? schema.required() : schema.optional();
};

/** Build a nested object schema from PRODUCT_GROUPS. */
const buildGroup = (groupKey, mode) => {
  const group = PRODUCT_GROUPS[groupKey];
  const children = {};

  group.fields.forEach((field) => {
    if (field === 'shippingDimensions') {
      children.shippingDimensions = Joi.object(
        Object.fromEntries(
          SHIPPING_DIMENSION_FIELDS.map((dimension) => [
            dimension,
            buildLeaf(`shipping.shippingDimensions.${dimension}`, mode)
          ])
        )
      )
        .optional()
        .allow(null);
      return;
    }

    children[field] = buildLeaf(`${groupKey}.${field}`, mode);
  });

  let schema = Joi.object(children);

  // Children are marked required individually; the group itself is required on
  // create only when the database path is required (inventory).
  if (mode === 'create' && group.requiredOnCreate) return schema.required();
  return schema.optional().allow(null);
};

const baseSchema = (mode) => {
  const schema = {};

  Object.keys(PRODUCT_FIELD_RULES).forEach((path) => {
    if (path.includes('.')) return; // nested groups are handled below
    if (['mainImageIndex', 'imageAlt', 'uploadId'].includes(path)) return;
    schema[path] = buildLeaf(path, mode);
  });

  Object.keys(PRODUCT_GROUPS).forEach((groupKey) => {
    schema[groupKey] = buildGroup(groupKey, mode);
  });

  schema.variants = Joi.array().items(variantSchema).max(100).optional();
  schema.uploadId = Joi.string().trim().max(120).optional();
  schema.imageAlt = Joi.string().allow('').max(200).optional();
  schema.imageAlts = Joi.array()
    .items(Joi.string().allow('').max(200))
    .max(MAX_PRODUCT_IMAGES)
    .optional();
  schema.mainImageIndex = Joi.number().integer().min(0).max(MAX_PRODUCT_IMAGES - 1).optional();

  return schema;
};

export const createProductSchema = Joi.object({
  ...baseSchema('create'),
  images: Joi.array().items(imageSchema).max(MAX_PRODUCT_IMAGES).optional(),
  imagesJson: Joi.array().items(imageSchema).max(MAX_PRODUCT_IMAGES).optional(),
  uploadedImages: Joi.array().items(imageSchema).max(MAX_PRODUCT_IMAGES).optional()
});

export const updateProductSchema = Joi.object({
  ...baseSchema('update'),
  imagesJson: Joi.array().items(imageSchema).max(MAX_PRODUCT_IMAGES).optional(),
  uploadedImages: Joi.array().items(imageSchema).max(MAX_PRODUCT_IMAGES).optional()
});

export { imageSchema, variantSchema };
