import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

const isTypingTarget = (element) =>
  element &&
  (element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.isContentEditable)

/**
 * Storefront search field.
 *
 * Two instances are mounted (an inline one for the desktop bar and a full-width
 * "bar" one for the mobile second row); CSS decides which is visible, so the
 * keyboard shortcut guards against focusing the hidden copy.
 *
 * Submitting navigates to /search?q=..., which SearchPage.jsx reads.
 */
const HeaderSearch = ({ variant = 'inline', onNavigate }) => {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // "/" or Cmd/Ctrl+K focuses search, the convention users already expect.
  // Ignored while typing elsewhere and when this instance is display:none.
  useEffect(() => {
    const handleShortcut = (event) => {
      const input = inputRef.current
      if (!input || input.offsetParent === null) return

      const isKCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      if (!isKCombo && !(event.key === '/' && !isTypingTarget(event.target))) return

      event.preventDefault()
      input.focus()
    }

    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    setQuery('')
    onNavigate?.()
  }

  const sizeClass = variant === 'bar' ? 'h-11 text-base' : 'h-10 text-sm'

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <label htmlFor={`header-search-${variant}`} className="sr-only">
        Search books
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500"
          aria-hidden="true"
        />
        <input
          id={`header-search-${variant}`}
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search books…"
          autoComplete="off"
          className={`w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-800/70 pl-9 pr-3 text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-colors duration-200 hover:border-gray-400 dark:hover:border-slate-500 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${sizeClass}`}
        />
      </div>
      <p className="sr-only">Press slash or Control plus K to focus the search field.</p>
    </form>
  )
}

export default HeaderSearch