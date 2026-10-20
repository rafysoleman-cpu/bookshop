/**
 * Loading placeholder for one product card. Mirrors ProductCard's grid and list
 * geometry so swapping the grid to skeletons on refetch does not shift layout.
 */
const ProductCardSkeleton = ({ viewMode = 'grid' }) => {
  const shimmer = 'bg-gray-200 dark:bg-slate-700 animate-pulse rounded'

  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex gap-4">
          <div className={`${shimmer} w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0`} />
          <div className="flex-1 min-w-0 py-1 space-y-3">
            <div className={`${shimmer} h-3 w-1/4`} />
            <div className={`${shimmer} h-4 w-3/4`} />
            <div className={`${shimmer} h-3 w-1/3`} />
            <div className={`${shimmer} h-5 w-24`} />
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className={`${shimmer} w-9 h-9 rounded-full`} />
            <div className={`${shimmer} w-9 h-9 rounded-lg`} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="aspect-square bg-gray-100 dark:bg-slate-800/70 flex-shrink-0">
        <div className={`${shimmer} w-full h-full rounded-none`} />
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2.5">
        <div className={`${shimmer} h-3 w-1/4`} />
        <div className={`${shimmer} h-4 w-full`} />
        <div className={`${shimmer} h-4 w-2/3`} />
        <div className={`${shimmer} h-3 w-1/3`} />
        <div className={`${shimmer} h-5 w-24 mt-2`} />
        <div className={`${shimmer} h-10 w-full mt-auto`} />
      </div>
    </div>
  )
}

/** Skeleton grid sized to one page of results. */
const ProductGridSkeleton = ({ count = 12, viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {Array.from({ length: Math.min(count, 8) }).map((_, index) => (
          <ProductCardSkeleton key={index} viewMode="list" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} viewMode="grid" />
      ))}
    </div>
  )
}

export { ProductCardSkeleton, ProductGridSkeleton }
export default ProductCardSkeleton