import { useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  Boxes,
  DollarSign,
  Image as ImageIcon,
  Layers,
  Percent,
  Plus,
  Search,
  Star,
  Trash2,
  Truck,
  Upload,
  Video,
  X
} from 'lucide-react'
import {
  BOOK_FORMAT_OPTIONS,
  DIMENSION_UNITS,
  IMAGE_ACCEPT,
  MAX_IMAGE_SIZE_MB,
  MAX_PRODUCT_IMAGES,
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_VISIBILITY_OPTIONS,
  WEIGHT_UNITS
} from '@bookshop/shared/product'

const INPUT =
  'block w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm disabled:opacity-60'
const LABEL = 'block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center'
const CARD =
  'bg-white dark:bg-slate-800 rounded-xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-4 sm:p-6 scroll-mt-24'
const SELECT = `${INPUT} appearance-none cursor-pointer`

const borderClass = (hasError) =>
  hasError
    ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/50'
    : 'border-gray-200/50 dark:border-slate-700/50'

const withOptions = (options, value) =>
  value && !options.some((option) => option.value === value)
    ? [...options, { value, label: value }]
    : options

const Field = ({ label, hint, error, required, children, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    <label className={LABEL}>
      {label}
      {required && <span className="ml-1 text-red-500 dark:text-red-400">*</span>}
      {hint && <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">{hint}</span>}
    </label>
    <div className="relative">{children}</div>
    {error && (
      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3 shrink-0" />
        {error}
      </p>
    )}
  </div>
)

const SectionCard = ({ id, icon: Icon, title, subtitle, badge, children }) => (
  <section id={id} className={CARD}>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">{title}</h2>
          {subtitle && <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge}
    </div>
    {children}
  </section>
)

const Toggle = ({ checked, onChange, label, description, disabled = false }) => (
  <label className={`flex items-start gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onChange(event.target.checked)}
      disabled={disabled}
      className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500"
    />
    <span>
      <span className="block text-sm font-medium text-gray-800 dark:text-slate-200">{label}</span>
      {description && <span className="block text-xs text-gray-500 dark:text-slate-400">{description}</span>}
    </span>
  </label>
)

const TokenInput = ({ label, hint, values, onChange, placeholder, error }) => {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    if (!value) return
    if (!values.includes(value)) onChange([...values, value])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      <label className={LABEL}>
        {label}
        {hint && <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">{hint}</span>}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              add()
            }
          }}
          className={INPUT}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow hover:from-indigo-600 hover:to-purple-700"
          aria-label={`Add ${label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((item) => item !== value))}
                className="ml-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
                aria-label={`Remove ${value}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * The one and only product form. Used by both the create and the edit page, so
 * they can never drift apart again.
 */
const ProductFormFields = ({ form, errors = {}, setValue, categories = [], images = {}, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false)
  const error = (path) => errors[path]

  const input = (path) => `${INPUT} ${borderClass(Boolean(error(path)))}`
  const select = (path) => `${SELECT} ${borderClass(Boolean(error(path)))}`

  const setImageList = images.onChange || (() => {})
  const imageList = Array.isArray(form.images) ? form.images : []
  const subcategoryOptions = categories.filter((category) => category?._id !== form.category)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Basic information -------------------------------------------------- */}
      <SectionCard
        id="basic"
        icon={BookOpen}
        title="Basic information"
        subtitle="Title, description and publication details"
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <Field label="Book title" required hint="Max 100 chars" error={error('name')}>
            <input
              type="text"
              value={form.name}
              maxLength={100}
              disabled={disabled}
              onChange={(event) => setValue('name', event.target.value)}
              className={input('name')}
              placeholder="Enter book title"
            />
          </Field>

          <Field
            label="URL slug"
            hint="Leave blank to generate automatically"
            error={error('slug')}
          >
            <input
              type="text"
              value={form.slug}
              maxLength={120}
              disabled={disabled}
              onChange={(event) => setValue('slug', event.target.value)}
              className={input('slug')}
              placeholder="book-url-slug"
            />
          </Field>

          <Field label="Short description" hint="Max 200 chars" error={error('shortDescription')} className="xl:col-span-2">
            <input
              type="text"
              value={form.shortDescription}
              maxLength={200}
              disabled={disabled}
              onChange={(event) => setValue('shortDescription', event.target.value)}
              className={input('shortDescription')}
              placeholder="One line summary shown in listings"
            />
          </Field>

          <Field label="Description" hint="Max 2000 chars" error={error('description')} className="xl:col-span-2">
            <textarea
              rows={5}
              value={form.description}
              maxLength={2000}
              disabled={disabled}
              onChange={(event) => setValue('description', event.target.value)}
              className={input('description')}
              placeholder="Full book description"
            />
          </Field>

          <Field label="Author" required hint="Max 150 chars" error={error('author')}>
            <input
              type="text"
              value={form.author}
              maxLength={150}
              disabled={disabled}
              onChange={(event) => setValue('author', event.target.value)}
              className={input('author')}
              placeholder="Author name"
            />
          </Field>

          <Field label="Publisher" hint="Max 150 chars" error={error('publisher')}>
            <input
              type="text"
              value={form.publisher}
              maxLength={150}
              disabled={disabled}
              onChange={(event) => setValue('publisher', event.target.value)}
              className={input('publisher')}
              placeholder="Publisher name"
            />
          </Field>

          <Field label="ISBN" hint="Max 20 chars, unique when provided" error={error('isbn')}>
            <input
              type="text"
              value={form.isbn}
              maxLength={20}
              disabled={disabled}
              onChange={(event) => setValue('isbn', event.target.value)}
              className={input('isbn')}
              placeholder="978-3-16-148410-0"
            />
          </Field>

          <Field label="Pages" hint="Whole number" error={error('pages')}>
            <input
              type="number"
              min="1"
              step="1"
              value={form.pages}
              disabled={disabled}
              onChange={(event) => setValue('pages', event.target.value)}
              className={input('pages')}
              placeholder="0"
            />
          </Field>

          <Field label="Format" error={error('format')}>
            <select
              value={form.format}
              disabled={disabled}
              onChange={(event) => setValue('format', event.target.value)}
              className={select('format')}
            >
              {withOptions(BOOK_FORMAT_OPTIONS, form.format).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Language" hint="Max 50 chars" error={error('language')}>
            <input
              type="text"
              value={form.language}
              maxLength={50}
              disabled={disabled}
              onChange={(event) => setValue('language', event.target.value)}
              className={input('language')}
              placeholder="English"
            />
          </Field>

          <Field label="Edition" hint="Max 50 chars" error={error('edition')}>
            <input
              type="text"
              value={form.edition}
              maxLength={50}
              disabled={disabled}
              onChange={(event) => setValue('edition', event.target.value)}
              className={input('edition')}
              placeholder="e.g. 2nd"
            />
          </Field>

          <Field label="Published date" error={error('publishedDate')}>
            <input
              type="date"
              value={form.publishedDate}
              disabled={disabled}
              onChange={(event) => setValue('publishedDate', event.target.value)}
              className={input('publishedDate')}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Pricing ------------------------------------------------------------ */}
      <SectionCard id="pricing" icon={DollarSign} title="Pricing" subtitle="Selling, compare-at and cost prices">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Field label="Price" required error={error('price')}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              disabled={disabled}
              onChange={(event) => setValue('price', event.target.value)}
              className={input('price')}
              placeholder="0.00"
            />
          </Field>

          <Field label="Compare at price" hint="Strikethrough price" error={error('compareAtPrice')}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.compareAtPrice}
              disabled={disabled}
              onChange={(event) => setValue('compareAtPrice', event.target.value)}
              className={input('compareAtPrice')}
              placeholder="0.00"
            />
          </Field>

          <Field label="Cost price" hint="Internal use" error={error('costPrice')}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.costPrice}
              disabled={disabled}
              onChange={(event) => setValue('costPrice', event.target.value)}
              className={input('costPrice')}
              placeholder="0.00"
            />
          </Field>
        </div>
      </SectionCard>

      {/* Inventory ---------------------------------------------------------- */}
      <SectionCard id="inventory" icon={Boxes} title="Inventory" subtitle="Identifiers and stock control">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Field label="SKU" hint="Unique when provided, max 64 chars" error={error('sku')}>
            <input
              type="text"
              value={form.sku}
              maxLength={64}
              disabled={disabled}
              onChange={(event) => setValue('sku', event.target.value)}
              className={input('sku')}
              placeholder="SKU-12345"
            />
          </Field>

          <Field label="Barcode" hint="Unique when provided, max 64 chars" error={error('barcode')}>
            <input
              type="text"
              value={form.barcode}
              maxLength={64}
              disabled={disabled}
              onChange={(event) => setValue('barcode', event.target.value)}
              className={input('barcode')}
              placeholder="1234567890123"
            />
          </Field>

          <Field label="Quantity" required hint="Current stock level" error={error('inventory.quantity')}>
            <input
              type="number"
              min="0"
              step="1"
              value={form.inventory.quantity}
              disabled={disabled}
              onChange={(event) => setValue('inventory.quantity', event.target.value)}
              className={input('inventory.quantity')}
              placeholder="0"
            />
          </Field>

          <Field
            label="Low stock threshold"
            hint="Alert below this level"
            error={error('inventory.lowStockThreshold')}
          >
            <input
              type="number"
              min="0"
              step="1"
              value={form.inventory.lowStockThreshold}
              disabled={disabled}
              onChange={(event) => setValue('inventory.lowStockThreshold', event.target.value)}
              className={input('inventory.lowStockThreshold')}
              placeholder="10"
            />
          </Field>
        </div>

        <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-slate-900/40 border border-gray-200/50 dark:border-slate-700/50">
            <Toggle
              checked={form.inventory.trackQuantity}
              onChange={(checked) => setValue('inventory.trackQuantity', checked)}
              label="Track quantity"
              description="Decrease stock automatically when orders are placed"
              disabled={disabled}
            />
          </div>
          <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-slate-900/40 border border-gray-200/50 dark:border-slate-700/50">
            <Toggle
              checked={form.inventory.allowBackorder}
              onChange={(checked) => setValue('inventory.allowBackorder', checked)}
              label="Allow backorder"
              description="Sell even when stock reaches zero"
              disabled={disabled}
            />
          </div>
        </div>
      </SectionCard>

      {/* Organisation ------------------------------------------------------- */}
      <SectionCard id="organization" icon={Layers} title="Organisation" subtitle="Genre, visibility and keywords">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Field label="Genre" required error={error('category')}>
            <select
              value={form.category}
              disabled={disabled}
              onChange={(event) => setValue('category', event.target.value)}
              className={select('category')}
            >
              <option value="">Select a genre</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status" required error={error('status')}>
            <select
              value={form.status}
              disabled={disabled}
              onChange={(event) => setValue('status', event.target.value)}
              className={select('status')}
            >
              {withOptions(PRODUCT_STATUS_OPTIONS, form.status).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Visibility" error={error('visibility')}>
            <select
              value={form.visibility}
              disabled={disabled}
              onChange={(event) => setValue('visibility', event.target.value)}
              className={select('visibility')}
            >
              {withOptions(PRODUCT_VISIBILITY_OPTIONS, form.visibility).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="space-y-2">
            <span className={LABEL}>Featured</span>
            <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-slate-900/40 border border-gray-200/50 dark:border-slate-700/50">
              <Toggle
                checked={form.featured}
                onChange={(checked) => setValue('featured', checked)}
                label="Show in featured books"
                description="Highlight this book on the storefront"
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 space-y-2">
          <span className={LABEL}>
            Subcategories
            <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">
              Optional, additional genres
            </span>
          </span>
          <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/40 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {subcategoryOptions.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-slate-400">No other genres available</p>
            )}
            {subcategoryOptions.map((category) => {
              const checked = form.subcategories.includes(category._id)
              return (
                <label
                  key={category._id}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() =>
                      setValue(
                        'subcategories',
                        checked
                          ? form.subcategories.filter((id) => id !== category._id)
                          : [...form.subcategories, category._id]
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600"
                  />
                  {category.name}
                </label>
              )
            })}
          </div>
          {error('subcategories') && (
            <p className="text-xs text-red-600 dark:text-red-400">{error('subcategories')}</p>
          )}
        </div>

        <div className="mt-4 sm:mt-6">
          <TokenInput
            label="Tags"
            hint="Press Enter to add"
            values={form.tags}
            onChange={(value) => setValue('tags', value)}
            placeholder="Add a tag..."
            error={error('tags')}
          />
        </div>
      </SectionCard>

      {/* Delivery ----------------------------------------------------------- */}
      <SectionCard id="shipping" icon={Truck} title="Delivery" subtitle="Weight, dimensions and shipping fees">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Field label="Weight" error={error('weight.value')}>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.weight.value}
                disabled={disabled}
                onChange={(event) => setValue('weight.value', event.target.value)}
                className={input('weight.value')}
                placeholder="0.00"
              />
              <select
                value={form.weight.unit}
                disabled={disabled}
                onChange={(event) => setValue('weight.unit', event.target.value)}
                className={`${select('weight.unit')} w-24`}
              >
                {WEIGHT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Dimensions" hint="L × W × H" error={error('dimensions.length')}>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.dimensions.length}
                disabled={disabled}
                onChange={(event) => setValue('dimensions.length', event.target.value)}
                className={input('dimensions.length')}
                placeholder="L"
              />
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.dimensions.width}
                disabled={disabled}
                onChange={(event) => setValue('dimensions.width', event.target.value)}
                className={input('dimensions.width')}
                placeholder="W"
              />
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.dimensions.height}
                disabled={disabled}
                onChange={(event) => setValue('dimensions.height', event.target.value)}
                className={input('dimensions.height')}
                placeholder="H"
              />
              <select
                value={form.dimensions.unit}
                disabled={disabled}
                onChange={(event) => setValue('dimensions.unit', event.target.value)}
                className={`${select('dimensions.unit')} w-20`}
              >
                {DIMENSION_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Shipping cost" error={error('shipping.shippingCost')}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.shipping.shippingCost}
              disabled={disabled}
              onChange={(event) => setValue('shipping.shippingCost', event.target.value)}
              className={input('shipping.shippingCost')}
              placeholder="0.00"
            />
          </Field>

          <Field label="Shipping weight" error={error('shipping.shippingWeight')}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.shipping.shippingWeight}
              disabled={disabled}
              onChange={(event) => setValue('shipping.shippingWeight', event.target.value)}
              className={input('shipping.shippingWeight')}
              placeholder="0.00"
            />
          </Field>

          <Field
            label="Shipping dimensions"
            hint="L × W × H (optional)"
            error={error('shipping.shippingDimensions.length')}
            className="md:col-span-2"
          >
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.shipping.shippingDimensions.length}
                disabled={disabled}
                onChange={(event) => setValue('shipping.shippingDimensions.length', event.target.value)}
                className={input('shipping.shippingDimensions.length')}
                placeholder="L"
              />
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.shipping.shippingDimensions.width}
                disabled={disabled}
                onChange={(event) => setValue('shipping.shippingDimensions.width', event.target.value)}
                className={input('shipping.shippingDimensions.width')}
                placeholder="W"
              />
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.shipping.shippingDimensions.height}
                disabled={disabled}
                onChange={(event) => setValue('shipping.shippingDimensions.height', event.target.value)}
                className={input('shipping.shippingDimensions.height')}
                placeholder="H"
              />
            </div>
          </Field>
        </div>

        <div className="mt-4 sm:mt-6 p-4 rounded-xl bg-gray-50/70 dark:bg-slate-900/40 border border-gray-200/50 dark:border-slate-700/50">
          <Toggle
            checked={form.shipping.freeShipping}
            onChange={(checked) => setValue('shipping.freeShipping', checked)}
            label="Free shipping"
            description="Ignore the shipping cost for this book"
            disabled={disabled}
          />
        </div>
      </SectionCard>

      {/* Tax and promotions ------------------------------------------------- */}
      <SectionCard id="promotions" icon={Percent} title="Tax & promotions" subtitle="Tax settings and flash sale">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-slate-900/40 border border-gray-200/50 dark:border-slate-700/50">
            <Toggle
              checked={form.tax.taxable}
              onChange={(checked) => setValue('tax.taxable', checked)}
              label="Taxable"
              disabled={disabled}
            />
          </div>

          <Field label="Tax rate (%)" error={error('tax.taxRate')}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.tax.taxRate}
              disabled={disabled}
              onChange={(event) => setValue('tax.taxRate', event.target.value)}
              className={input('tax.taxRate')}
              placeholder="0"
            />
          </Field>
        </div>

        <div className="mt-4 sm:mt-6 p-4 rounded-xl bg-gray-50/70 dark:bg-slate-900/40 border border-gray-200/50 dark:border-slate-700/50">
          <Toggle
            checked={form.flashSale.enabled}
            onChange={(checked) => setValue('flashSale.enabled', checked)}
            label="Flash sale"
            description="Run a time limited discount for this book"
            disabled={disabled}
          />
        </div>

        {form.flashSale.enabled && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Field label="Discount (%)" error={error('flashSale.discountPercentage')}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.flashSale.discountPercentage}
                disabled={disabled}
                onChange={(event) => setValue('flashSale.discountPercentage', event.target.value)}
                className={input('flashSale.discountPercentage')}
                placeholder="0"
              />
            </Field>
            <Field label="Starts" error={error('flashSale.startDate')}>
              <input
                type="datetime-local"
                value={form.flashSale.startDate}
                disabled={disabled}
                onChange={(event) => setValue('flashSale.startDate', event.target.value)}
                className={input('flashSale.startDate')}
              />
            </Field>
            <Field label="Ends" error={error('flashSale.endDate')}>
              <input
                type="datetime-local"
                value={form.flashSale.endDate}
                disabled={disabled}
                onChange={(event) => setValue('flashSale.endDate', event.target.value)}
                className={input('flashSale.endDate')}
              />
            </Field>
            <Field label="Max quantity" error={error('flashSale.maxQuantity')}>
              <input
                type="number"
                min="0"
                step="1"
                value={form.flashSale.maxQuantity}
                disabled={disabled}
                onChange={(event) => setValue('flashSale.maxQuantity', event.target.value)}
                className={input('flashSale.maxQuantity')}
                placeholder="0"
              />
            </Field>
          </div>
        )}
      </SectionCard>

      {/* Gallery ------------------------------------------------------------ */}
      <SectionCard
        id="images"
        icon={ImageIcon}
        title="Gallery"
        subtitle={`Up to ${MAX_PRODUCT_IMAGES} images, ${MAX_IMAGE_SIZE_MB}MB each`}
        badge={
          <span className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium">
            {imageList.length} / {MAX_PRODUCT_IMAGES}
          </span>
        }
      >
        <label
          onDragOver={(event) => {
            event.preventDefault()
            if (!disabled) setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            if (!disabled) setImageList(Array.from(event.dataTransfer.files ?? []))
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors ${
            isDragging
              ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40'
              : 'border-gray-300 dark:border-slate-600 hover:border-blue-400'
          }`}
        >
          <Upload className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
            {isDragging ? 'Drop images' : 'Upload images'}
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            Drag & drop or click • PNG, JPG, GIF or WebP • max {MAX_IMAGE_SIZE_MB}MB each
          </span>
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            disabled={disabled || imageList.length >= MAX_PRODUCT_IMAGES}
            className="hidden"
            onChange={(event) => {
              setImageList(Array.from(event.target.files ?? []))
              event.target.value = ''
            }}
          />
        </label>

        {error('images') && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error('images')}
          </p>
        )}

        {imageList.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {imageList.map((image, index) => (
              <div key={`${image.url || 'new'}-${index}`} className="space-y-2">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-900 border border-gray-200/60 dark:border-slate-700/60">
                  <img
                    src={image.previewUrl || image.url}
                    alt={image.alt || `Product image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {image.isMain && (
                    <span className="absolute top-1 left-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center gap-1">
                      <Star className="w-3 h-3" /> Main
                    </span>
                  )}

                  <div className="absolute top-1 right-1 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => images.onRemove?.(index)}
                      disabled={disabled}
                      className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {!image.isMain && (
                      <button
                        type="button"
                        onClick={() => images.onSetMain?.(index)}
                        disabled={disabled}
                        className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600"
                        aria-label="Set as main image"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="absolute bottom-1 left-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => images.onMove?.(index, -1)}
                      disabled={disabled || index === 0}
                      className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30"
                      aria-label="Move image left"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => images.onMove?.(index, 1)}
                      disabled={disabled || index === imageList.length - 1}
                      className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30"
                      aria-label="Move image right"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={image.alt}
                  maxLength={200}
                  disabled={disabled}
                  onChange={(event) => images.onAltChange?.(index, event.target.value)}
                  className={`${INPUT} !text-xs`}
                  placeholder="Alt text"
                  aria-label={`Alt text for image ${index + 1}`}
                />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Video -------------------------------------------------------------- */}
      <SectionCard id="video" icon={Video} title="Video" subtitle="Optional product video">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Field label="Video URL" error={error('video.url')}>
            <input
              type="url"
              value={form.video.url}
              disabled={disabled}
              onChange={(event) => setValue('video.url', event.target.value)}
              className={input('video.url')}
              placeholder="https://..."
            />
          </Field>
          <Field label="Thumbnail URL" error={error('video.thumbnail')}>
            <input
              type="url"
              value={form.video.thumbnail}
              disabled={disabled}
              onChange={(event) => setValue('video.thumbnail', event.target.value)}
              className={input('video.thumbnail')}
              placeholder="https://..."
            />
          </Field>
        </div>
      </SectionCard>

      {/* SEO ---------------------------------------------------------------- */}
      <SectionCard id="seo" icon={Search} title="Search optimisation" subtitle="Metadata used by search engines">
        <div className="space-y-4 sm:space-y-6">
          <Field label="SEO title" hint="Shown in search results" error={error('seo.title')}>
            <input
              type="text"
              value={form.seo.title}
              disabled={disabled}
              onChange={(event) => setValue('seo.title', event.target.value)}
              className={input('seo.title')}
              placeholder="SEO title"
            />
          </Field>
          <Field label="SEO description" hint="Shown in search results" error={error('seo.description')}>
            <textarea
              rows={3}
              value={form.seo.description}
              disabled={disabled}
              onChange={(event) => setValue('seo.description', event.target.value)}
              className={input('seo.description')}
              placeholder="SEO description"
            />
          </Field>
          <TokenInput
            label="SEO keywords"
            hint="Press Enter to add"
            values={form.seo.keywords}
            onChange={(value) => setValue('seo.keywords', value)}
            placeholder="Add a keyword..."
            error={error('seo.keywords')}
          />
        </div>
      </SectionCard>

      {/* Variants ----------------------------------------------------------- */}
      <SectionCard
        id="variants"
        icon={Layers}
        title="Variants"
        subtitle="Only needed when this book has multiple formats or bindings"
        badge={
          <button
            type="button"
            onClick={() =>
              setValue('variants', [
                ...form.variants,
                { name: '', options: '', price: '', sku: '', image: '', inventory: '0' }
              ])
            }
            disabled={disabled}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-800/70 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200"
          >
            <Plus className="w-4 h-4" /> Add variant
          </button>
        }
      >
        {form.variants.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            No variants. Add one only if this book has format options.
          </p>
        ) : (
          <div className="space-y-4">
            {form.variants.map((variant, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-200/60 dark:border-slate-700/60 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Variant {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setValue('variants', form.variants.filter((_, position) => position !== index))
                    }
                    disabled={disabled}
                    className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <Field label="Name" required error={error(`variants.${index}.name`)}>
                    <input
                      type="text"
                      value={variant.name}
                      disabled={disabled}
                      onChange={(event) =>
                        setValue(
                          'variants',
                          form.variants.map((item, position) =>
                            position === index ? { ...item, name: event.target.value } : item
                          )
                        )
                      }
                      className={`${INPUT} ${borderClass(Boolean(error(`variants.${index}.name`)))}`}
                      placeholder="Hardcover"
                    />
                  </Field>

                  <Field label="Options" hint="Comma separated" error={error(`variants.${index}.options`)}>
                    <input
                      type="text"
                      value={variant.options}
                      disabled={disabled}
                      onChange={(event) =>
                        setValue(
                          'variants',
                          form.variants.map((item, position) =>
                            position === index ? { ...item, options: event.target.value } : item
                          )
                        )
                      }
                      className={INPUT}
                      placeholder="Red, Large"
                    />
                  </Field>

                  <Field label="Price" required error={error(`variants.${index}.price`)}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.price}
                      disabled={disabled}
                      onChange={(event) =>
                        setValue(
                          'variants',
                          form.variants.map((item, position) =>
                            position === index ? { ...item, price: event.target.value } : item
                          )
                        )
                      }
                      className={`${INPUT} ${borderClass(Boolean(error(`variants.${index}.price`)))}`}
                      placeholder="0.00"
                    />
                  </Field>

                  <Field label="Stock" required error={error(`variants.${index}.inventory`)}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={variant.inventory}
                      disabled={disabled}
                      onChange={(event) =>
                        setValue(
                          'variants',
                          form.variants.map((item, position) =>
                            position === index ? { ...item, inventory: event.target.value } : item
                          )
                        )
                      }
                      className={`${INPUT} ${borderClass(Boolean(error(`variants.${index}.inventory`)))}`}
                      placeholder="0"
                    />
                  </Field>

                  <Field label="SKU" error={error(`variants.${index}.sku`)}>
                    <input
                      type="text"
                      value={variant.sku}
                      disabled={disabled}
                      onChange={(event) =>
                        setValue(
                          'variants',
                          form.variants.map((item, position) =>
                            position === index ? { ...item, sku: event.target.value } : item
                          )
                        )
                      }
                      className={INPUT}
                      placeholder="SKU-12345-HC"
                    />
                  </Field>

                  <Field label="Image URL" error={error(`variants.${index}.image`)}>
                    <input
                      type="url"
                      value={variant.image}
                      disabled={disabled}
                      onChange={(event) =>
                        setValue(
                          'variants',
                          form.variants.map((item, position) =>
                            position === index ? { ...item, image: event.target.value } : item
                          )
                        )
                      }
                      className={`${INPUT} ${borderClass(Boolean(error(`variants.${index}.image`)))}`}
                      placeholder="https://..."
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export default ProductFormFields
