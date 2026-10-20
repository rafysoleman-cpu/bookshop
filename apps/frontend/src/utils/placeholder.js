// Helper function for placeholder images
export const getPlaceholderImage = (width = 300, height = 300) => {
  return `data:image/svg+xml,%3Csvg width='${width}' height='${height}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='14' fill='%239ca3af' text-anchor='middle' dy='.3em'%3E${width}x${height}%3C/text%3E%3C/svg%3E`
}
