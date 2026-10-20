import { useRef } from 'react'
import { Check } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { THEME_OPTIONS } from '../../config/theme'

/**
 * "Theme & Appearance" selector for /settings.
 *
 * A radio group rather than three independent buttons: arrow keys move between
 * options and only one can be selected, which is the behaviour a set of
 * mutually exclusive theme choices should have. Selection is driven from the
 * shared theme store, so this card and the UserMenu quick toggle are two views
 * of one value and cannot disagree.
 *
 * The dark option is labelled around eye comfort rather than just "Dark", since
 * that is the reason to reach for it at night.
 */
const ThemeAppearanceCard = () => {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const optionRefs = useRef({})

  const handleKeyDown = (event, index) => {
    const lastIndex = THEME_OPTIONS.length - 1
    let nextIndex = null

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = index === lastIndex ? 0 : index + 1
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = index === 0 ? lastIndex : index - 1
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = lastIndex
    }

    if (nextIndex === null) return

    event.preventDefault()
    const nextValue = THEME_OPTIONS[nextIndex].value
    setTheme(nextValue)
    optionRefs.current[nextValue]?.focus()
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 transition-colors duration-200">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
        Theme &amp; Appearance
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
        Customize your interface view or enable Dark Mode to reduce eye strain
        during night-time browsing.
      </p>

      <div
        role="radiogroup"
        aria-label="Theme"
        className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {THEME_OPTIONS.map((option, index) => {
          const { value, label, description, icon: Icon } = option
          const isSelected = theme === value

          // On 'system' the effective mode can differ from the choice, so the
          // card reports which way the OS is currently leaning. This has to
          // follow `resolvedTheme`, not `theme`: keying off `theme` just reports
          // back the user's own selection and labels a light-leaning OS as
          // "dark" for as long as System stays selected.
          const isSystemDark = resolvedTheme === 'dark'

          return (
            <button
              key={value}
              ref={(node) => {
                optionRefs.current[value] = node
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setTheme(value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:ring-offset-slate-900 ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 ring-1 ring-primary-500 dark:border-primary-400'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-900'
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200 ${
                  isSelected
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800/70 text-gray-500 dark:text-slate-400 group-hover:bg-gray-200 dark:group-hover:bg-slate-700'
                }`}
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>

              <span
                className={`text-sm font-semibold ${
                  isSelected
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-900 dark:text-slate-100'
                }`}
              >
                {label}
              </span>

              <span className="text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                {description}
              </span>

              {value === 'system' && (
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  Currently {isSystemDark ? 'dark' : 'light'}
                </span>
              )}

              {isSelected && (
                <span
                  className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white dark:bg-primary-500"
                  aria-hidden="true"
                >
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-5 text-xs text-gray-500 dark:text-slate-400">
        Dark Mode uses a soft dark slate background (#0f172a) instead of pure
        black, which keeps text contrast gentler on your eyes in low light.
        {theme !== 'system' &&
          ' Your choice is saved to your account and follows you to any device.'}
      </p>
    </div>
  )
}

export default ThemeAppearanceCard