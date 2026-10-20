import { Link } from 'react-router-dom'

const CategoryPill = ({ category, onClick }) => {
  const Component = onClick ? 'button' : Link
  const props = onClick 
    ? { onClick, type: 'button' }
    : { to: `/products?category=${category.slug}` }

  return (
    <Component
      {...props}
      className="category-pill inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-slate-800/70 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
    >
      {category.image && (
        <img
          src={category.image}
          alt={category.name}
          className="w-5 h-5 rounded-full object-cover"
        />
      )}
      <span>{category.name}</span>
      {category.productCount && (
        <span className="text-xs text-gray-500 dark:text-slate-400">({category.productCount})</span>
      )}
    </Component>
  )
}

export default CategoryPill
