import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Shared open/close behaviour for the header's popovers (Categories and User).
 *
 * Centralising this keeps both menus consistent: dismiss on outside pointer
 * down, dismiss on Escape with focus returned to the trigger, and close on
 * route change so a menu never lingers over the page the user just opened.
 */
const useDropdown = () => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const closeTimerRef = useRef(null)
  const panelId = useId()
  const { pathname } = useLocation()

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const close = useCallback(({ restoreFocus = false } = {}) => {
    clearCloseTimer()
    setIsOpen(false)
    if (restoreFocus && triggerRef.current) triggerRef.current.focus()
  }, [])

  const open = useCallback(() => {
    clearCloseTimer()
    setIsOpen(true)
  }, [])

  const toggle = useCallback(() => {
    clearCloseTimer()
    setIsOpen((prev) => !prev)
  }, [])

  // Hover is pointer-only affordance; a small delay stops the menu flickering
  // when the pointer crosses the gap between trigger and panel.
  const openOnHover = useCallback(() => {
    if (window.matchMedia('(hover: none)').matches) return
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => setIsOpen(true), 80)
  }, [])

  const closeOnHover = useCallback(() => {
    if (window.matchMedia('(hover: none)').matches) return
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => setIsOpen(false), 140)
  }, [])

  // Dismiss when the pointer lands outside the menu, or Escape is pressed.
  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        clearCloseTimer()
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close({ restoreFocus: true })
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, close])

  // Close after navigating.
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Never leave a pending timer behind on unmount.
  useEffect(() => clearCloseTimer, [])

  return {
    isOpen,
    panelId,
    containerRef,
    triggerRef,
    open,
    close,
    toggle,
    openOnHover,
    closeOnHover
  }
}

export default useDropdown