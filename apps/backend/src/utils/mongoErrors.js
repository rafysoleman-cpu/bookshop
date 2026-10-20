const DUPLICATE_FIELD_MESSAGES = {
  slug: 'A product with this URL slug already exists. Please use a different slug.',
  sku: 'A product with this SKU already exists. Please use a different SKU.',
  barcode: 'A product with this barcode already exists. Please use a different barcode.',
  email: 'An account with this email already exists.',
  phone: 'This phone number is already registered.',
  name: 'A record with this name already exists.',
  code: 'A coupon with this code already exists.',
  slugOrSku: 'That slug or SKU is already taken by another product.'
};

const FALLBACK_DUPLICATE_MESSAGE =
  'This record conflicts with an existing one. Please use different unique values.';

const keysOf = (source) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return [];
  return Object.keys(source);
};

export const isDuplicateKeyError = (error) => error?.code === 11000 || error?.code === 11001;

export const getDuplicateFields = (error) => {
  const fromPattern = keysOf(error?.keyPattern);
  if (fromPattern.length > 0) return fromPattern;

  const fromValue = keysOf(error?.keyValue);
  if (fromValue.length > 0) return fromValue;

  const fromMessage = typeof error?.errmsg === 'string'
    ? (error.errmsg.match(/index:\s+(\S+?)_\d+/)?.[1] ?? '')
    : '';

  return fromMessage ? [fromMessage] : [];
};

export const describeDuplicateKeyError = (error, entity = 'record') => {
  const fields = getDuplicateFields(error);

  if (fields.length === 0) {
    return FALLBACK_DUPLICATE_MESSAGE;
  }

  const messages = fields.map((field) => {
    if (DUPLICATE_FIELD_MESSAGES[field]) return DUPLICATE_FIELD_MESSAGES[field];

    const readable = field.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
    return `Another ${entity} already uses this ${readable}.`;
  });

  return [...new Set(messages)].join(' ');
};

export const isValidationError = (error) =>
  error?.name === 'ValidationError' && Boolean(error?.errors);

export const describeValidationError = (error) => {
  if (!isValidationError(error)) return null;

  const messages = Object.values(error.errors)
    .map((issue) => issue?.message)
    .filter(Boolean);

  return messages.length > 0 ? [...new Set(messages)].join('. ') : 'Validation failed';
};

export const describeCastError = (error) => {
  if (error?.name !== 'CastError') return null;
  return `Invalid value for "${error.path ?? 'field'}".`;
};
