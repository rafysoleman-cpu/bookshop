/* eslint-env node */
/**
 * Contract test for the product domain.
 *
 * Runs without a database and without a browser:
 *   1. canonical form -> client validation
 *   2. form -> API payload -> multipart FormData
 *   3. multipart round trip -> Joi (the exact schema the API uses)
 *   4. Joi output -> backend normalisation -> Mongoose model validation
 *
 * Run with: node packages/shared/scripts/verify-contract.mjs
 */
import assert from 'node:assert/strict';

import {
  MAX_PRODUCT_IMAGES,
  MULTIPART_JSON_FIELDS,
  addProductImageFiles,
  buildProductFormData,
  createEmptyProductForm,
  productToForm,
  serializeProductForm,
  validateProductForm
} from '../src/product.js';
import { createProductSchema, updateProductSchema } from '../src/productJoi.js';
import { validate } from '../../../apps/backend/src/utils/validation.js';
import {
  buildProductCreate,
  buildProductUpdate,
  splitClearedPaths
} from '../../../apps/backend/src/utils/productPayload.js';
import Product from '../../../apps/backend/src/models/Product.js';

const CATEGORY_ID = '64b7f0c2a1b2c3d4e5f60718';
const SUBCATEGORY_ID = '64b7f0c2a1b2c3d4e5f60719';

let checks = 0;
const check = (label, fn) => {
  fn();
  checks += 1;
  console.log(`  ok  ${label}`);
};

/** Turn multipart FormData back into the object the API middleware builds. */
const parseMultipart = (formData) => {
  const data = {};
  const files = [];

  for (const [key, value] of formData.entries()) {
    if (key === 'images') {
      files.push(value);
      continue;
    }
    data[key] = MULTIPART_JSON_FIELDS.includes(key) ? JSON.parse(value) : value;
  }

  return { data, files };
};

const validateWithJoi = (schema, payload) => {
  const { error, value } = schema.validate(payload, { abortEarly: false, convert: true });
  assert.equal(error, undefined, error?.details?.map((detail) => detail.message).join('\n'));
  return value;
};

/**
 * Run the real Express validation middleware on raw multipart fields. This is
 * what proves the JSON field list used by the browser and the API agree.
 */
const runValidateMiddleware = (schema, rawBody) =>
  new Promise((resolve, reject) => {
    const req = {
      headers: { 'content-type': 'multipart/form-data; boundary=contract-test' },
      body: rawBody
    };
    const res = {
      code: 200,
      status(code) {
        this.code = code;
        return this;
      },
      json(payload) {
        resolve({ code: this.code, payload });
        return this;
      }
    };

    validate(schema)(req, res, (error) => {
      if (error) reject(error);
      else resolve({ code: 200, body: req.body });
    });
  });

const makeFile = (name) => new File([`image-${name}`], name, { type: 'image/png' });

const buildCompleteForm = () => {
  const form = createEmptyProductForm();

  form.name = 'The Pragmatic Programmer';
  form.slug = 'the-pragmatic-programmer';
  form.shortDescription = 'A classic for working developers.';
  form.description = 'Long description used for the contract test.';
  form.author = 'Andrew Hunt';
  form.isbn = '978-0201616224';
  form.publisher = 'Addison-Wesley';
  form.pages = '352';
  form.format = 'hardcover';
  form.language = 'English';
  form.edition = '2nd';
  form.publishedDate = '1999-10-30';
  form.sku = 'BOOK-001';
  form.barcode = '9780201616224';
  form.price = '39.99';
  form.compareAtPrice = '49.99';
  form.costPrice = '18.5';
  form.category = CATEGORY_ID;
  form.subcategories = [SUBCATEGORY_ID];
  form.status = 'active';
  form.visibility = 'public';
  form.featured = true;
  form.tags = ['programming', 'craftsmanship'];

  form.inventory = {
    quantity: '12',
    trackQuantity: true,
    allowBackorder: false,
    lowStockThreshold: '3'
  };
  form.weight = { value: '0.8', unit: 'kg' };
  form.dimensions = { length: '23', width: '15', height: '3', unit: 'cm' };
  form.shipping = {
    freeShipping: false,
    shippingCost: '4.5',
    shippingWeight: '0.9',
    shippingDimensions: { length: '24', width: '16', height: '4' }
  };
  form.tax = { taxable: true, taxRate: '19' };
  form.flashSale = {
    enabled: true,
    discountPercentage: '15',
    startDate: '2026-01-01T10:00',
    endDate: '2026-01-10T10:00',
    maxQuantity: '25'
  };
  form.video = { url: 'https://example.com/video.mp4', thumbnail: 'https://example.com/thumb.jpg' };
  form.seo = { title: 'Buy it', description: 'A classic book', keywords: ['book', 'dev'] };
  form.variants = [
    {
      name: 'Hardcover',
      options: 'Cloth, Large',
      price: '39.99',
      sku: 'BOOK-001-HC',
      image: 'https://example.com/variant.jpg',
      inventory: '5'
    }
  ];

  const { images } = addProductImageFiles([], [makeFile('cover.png'), makeFile('back.png')]);
  form.images = images;

  return form;
};

console.log('\n1. Client side validation');

check('a complete form has no errors', () => {
  const errors = validateProductForm(buildCompleteForm());
  assert.deepEqual(errors, {});
});

check('required fields are reported on an empty form', () => {
  const errors = validateProductForm(createEmptyProductForm());
  for (const field of ['name', 'author', 'category', 'price']) {
    assert.ok(errors[field], `expected an error for ${field}`);
  }
});

check('partial dimensions are rejected', () => {
  const form = buildCompleteForm();
  form.dimensions = { length: '10', width: '', height: '', unit: 'cm' };
  const errors = validateProductForm(form);
  assert.ok(errors['dimensions.width']);
  assert.ok(errors['dimensions.height']);
});

check('too many images are rejected', () => {
  const form = buildCompleteForm();
  const extra = Array.from({ length: MAX_PRODUCT_IMAGES }, (_, index) => makeFile(`extra-${index}.png`));
  const { images, errors } = addProductImageFiles(form.images, extra);
  assert.ok(errors.length > 0);
  assert.equal(images.length, MAX_PRODUCT_IMAGES);
});

console.log('\n2. Create contract (form -> multipart -> Joi -> model)');

const createForm = buildCompleteForm();
const { payload: createPayload, files: createFiles } = serializeProductForm(createForm, {
  mode: 'create'
});

check('serialised payload is JSON safe', () => {
  assert.equal(createPayload.imagesJson, undefined);
  assert.equal(typeof createPayload.mainImageIndex, 'number');
  assert.equal(createFiles.length, 2);
});

const createFormData = buildProductFormData(createPayload, createFiles);

check('multipart contains every file and the main image index', () => {
  assert.equal(createFormData.getAll('images').length, 2);
  assert.equal(createFormData.get('mainImageIndex'), '0');
  assert.equal(createFormData.get('format'), 'hardcover');
  assert.deepEqual(JSON.parse(createFormData.get('imageAlts')), ['cover', 'back']);
});

const { data: createBody, files: parsedFiles } = parseMultipart(createFormData);

const rawMultipartBody = {};
for (const [key, value] of createFormData.entries()) {
  if (key === 'images') continue;
  rawMultipartBody[key] = typeof value === 'string' ? value : value.name;
}

const middlewareResult = await runValidateMiddleware(createProductSchema, rawMultipartBody);

check('the real validate middleware accepts the browser payload', () => {
  assert.equal(middlewareResult.code, 200);
  assert.deepEqual(middlewareResult.body.imageAlts, ['cover', 'back']);
  assert.equal(middlewareResult.body.inventory.quantity, 12);
  assert.equal(middlewareResult.body.subcategories[0], SUBCATEGORY_ID);
  assert.equal(middlewareResult.body.mainImageIndex, '0');
});

check('Joi accepts the create payload produced by the form', () => {
  validateWithJoi(createProductSchema, createBody);
  assert.equal(parsedFiles.length, 2);
});

check('Mongoose accepts the normalised create payload', () => {
  const createDoc = buildProductCreate(
    createBody,
    parsedFiles.map((file) => ({ url: `https://cdn.example.com/${file.name}`, alt: 'cover' })),
    Number(createBody.mainImageIndex)
  );
  const document = new Product(createDoc);
  const error = document.validateSync();
  assert.equal(error, undefined, error?.message);
  assert.equal(document.images.length, 2);
  assert.equal(document.images[0].isMain, true);
  assert.equal(document.images[1].isMain, false);
  assert.equal(document.author, 'Andrew Hunt');
  assert.equal(document.inventory.quantity, 12);
});

console.log('\n3. Update contract (form -> multipart -> Joi -> clearing)');

const fakeProduct = {
  ...createForm,
  _id: '64b7f0c2a1b2c3d4e5f60720',
  category: { _id: CATEGORY_ID, name: 'Programming' },
  subcategories: [{ _id: SUBCATEGORY_ID }],
  publishedDate: '1999-10-30T00:00:00.000Z',
  price: 39.99,
  compareAtPrice: 49.99,
  taxRate: 19,
  weight: { value: 0.8, unit: 'kg' },
  dimensions: { length: 23, width: 15, height: 3, unit: 'cm' },
  shipping: {
    freeShipping: false,
    shippingCost: 4.5,
    shippingWeight: 0.9,
    shippingDimensions: { length: 24, width: 16, height: 4 }
  },
  flashSale: {
    enabled: true,
    discountPercentage: 15,
    startDate: '2026-01-01T10:00:00.000Z',
    endDate: '2026-01-10T10:00:00.000Z',
    maxQuantity: 25
  },
  images: [
    { url: 'https://cdn.example.com/cover.png', alt: 'cover', isMain: true },
    { url: 'https://cdn.example.com/back.png', alt: 'back', isMain: false }
  ]
};

const updateForm = productToForm(fakeProduct);
updateForm.price = '41.5';
updateForm.images = updateForm.images.map((image) => ({ ...image, file: null }));

check('product -> form -> serialised update payload validates', () => {
  const { payload } = serializeProductForm(updateForm, { mode: 'update' });
  assert.equal(payload.imagesJson.length, 2);
  validateWithJoi(updateProductSchema, payload);
});

check('clearing optional groups produces unset paths', () => {
  const clearedForm = { ...updateForm, dimensions: { length: '', width: '', height: '', unit: 'cm' } };
  const { payload } = serializeProductForm(clearedForm, { mode: 'update' });
  assert.equal(payload.dimensions, null);

  const validated = validateWithJoi(updateProductSchema, payload);
  const update = buildProductUpdate(validated, fakeProduct);
  const { assignable, cleared } = splitClearedPaths(update);

  assert.ok(cleared.includes('dimensions'));
  assert.equal(assignable.dimensions, undefined);
});

check('removing every stored image sends an empty list', () => {
  const noImages = { ...updateForm, images: [] };
  const { payload, files } = serializeProductForm(noImages, { mode: 'update' });
  assert.deepEqual(payload.imagesJson, []);
  assert.equal(files.length, 0);
  validateWithJoi(updateProductSchema, payload);
});

check('clearing scalar optional fields produces unset paths', () => {
  const form = {
    ...updateForm,
    pages: '',
    compareAtPrice: '',
    costPrice: '',
    publishedDate: '',
    barcode: '',
    sku: ''
  };
  const { payload } = serializeProductForm(form, { mode: 'update' });
  assert.equal(payload.pages, null);
  assert.equal(payload.compareAtPrice, null);
  assert.equal(payload.costPrice, null);
  assert.equal(payload.publishedDate, null);

  const parsed = parseMultipart(buildProductFormData(payload, []));
  const validated = validateWithJoi(updateProductSchema, parsed.data);
  const update = buildProductUpdate(validated, fakeProduct);
  const { cleared } = splitClearedPaths(update);

  for (const field of ['pages', 'compareAtPrice', 'costPrice', 'publishedDate', 'barcode', 'sku']) {
    assert.ok(cleared.includes(field), `expected ${field} to be unset`);
  }
});

check('the main image index survives the multipart round trip', () => {
  const form = buildCompleteForm();
  form.images = form.images.map((image, index) => ({ ...image, isMain: index === 1 }));
  const { payload, files } = serializeProductForm(form, { mode: 'create' });
  const parsed = parseMultipart(buildProductFormData(payload, files));
  assert.equal(parsed.data.mainImageIndex, '1');
  const validated = validateWithJoi(createProductSchema, parsed.data);
  assert.equal(validated.mainImageIndex, 1);
});

console.log(`\nAll ${checks} contract checks passed.\n`);
