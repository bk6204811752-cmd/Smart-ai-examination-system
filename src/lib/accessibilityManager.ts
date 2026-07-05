/**
 * Accessibility Manager
 * Implements WCAG 2.1 Level AA compliance features
 */

interface A11yPreferences {
  highContrast: boolean
  largeText: boolean
  reducedMotion: boolean
  screenReader: boolean
  keyboardOnly: boolean
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
}

class AccessibilityManager {
  private preferences: A11yPreferences = {
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReader: false,
    keyboardOnly: false,
    colorBlindMode: 'none'
  }

  private readonly STORAGE_KEY = 'pcmt_accessibility_preferences'
  private focusableElements: HTMLElement[] = []
  private currentFocusIndex = -1

  /**
   * Initialize accessibility features
   */
  init() {
    this.loadPreferences()
    this.applyPreferences()
    this.setupKeyboardNavigation()
    this.detectScreenReader()
    this.detectMotionPreference()
    this.setupFocusManagement()
    
    // Disabled: Verbose initialization log
    // console.log('✅ Accessibility features initialized')
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Failed to load accessibility preferences:', error)
    }
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.preferences))
    } catch (error) {
      console.error('Failed to save accessibility preferences:', error)
    }
  }

  /**
   * Apply current preferences
   */
  private applyPreferences() {
    const root = document.documentElement

    // High contrast mode
    if (this.preferences.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Large text
    if (this.preferences.largeText) {
      root.classList.add('large-text')
    } else {
      root.classList.remove('large-text')
    }

    // Reduced motion
    if (this.preferences.reducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    // Color blind modes
    root.classList.remove('protanopia', 'deuteranopia', 'tritanopia')
    if (this.preferences.colorBlindMode !== 'none') {
      root.classList.add(this.preferences.colorBlindMode)
    }
  }

  /**
   * Setup keyboard navigation
   */
  private setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Skip if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Tab navigation enhancement
      if (e.key === 'Tab') {
        this.preferences.keyboardOnly = true
        document.body.classList.add('keyboard-navigation')
      }

      // Arrow key navigation for focusable elements
      if (this.preferences.keyboardOnly) {
        this.handleArrowNavigation(e)
      }

      // Escape key to close modals/dialogs
      if (e.key === 'Escape') {
        this.handleEscape()
      }
    })

    // Remove keyboard-only class on mouse use
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation')
    })
  }

  /**
   * Handle arrow key navigation
   */
  private handleArrowNavigation(e: KeyboardEvent) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return
    }

    e.preventDefault()
    
    // Update focusable elements list
    this.updateFocusableElements()

    if (this.focusableElements.length === 0) return

    // Navigate based on arrow key
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      this.currentFocusIndex = this.currentFocusIndex <= 0 
        ? this.focusableElements.length - 1 
        : this.currentFocusIndex - 1
    }

    this.focusableElements[this.currentFocusIndex]?.focus()
  }

  /**
   * Update list of focusable elements
   */
  private updateFocusableElements() {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',')

    this.focusableElements = Array.from(document.querySelectorAll(selector))
  }

  /**
   * Handle Escape key
   */
  private handleEscape() {
    // Close any open dialogs/modals
    const closeButtons = document.querySelectorAll('[role="dialog"] [aria-label*="close"]')
    if (closeButtons.length > 0) {
      (closeButtons[0] as HTMLElement).click()
    }
  }

  /**
   * Detect screen reader usage
   */
  private detectScreenReader() {
    // Check for common screen reader indicators
    if (
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('VoiceOver')
    ) {
      this.preferences.screenReader = true
      this.announcePageLoad()
    }
  }

  /**
   * Detect motion preference from OS
   */
  private detectMotionPreference() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    if (prefersReducedMotion.matches) {
      this.preferences.reducedMotion = true
      this.applyPreferences()
    }

    // Listen for changes
    prefersReducedMotion.addEventListener('change', (e) => {
      this.preferences.reducedMotion = e.matches
      this.applyPreferences()
      this.savePreferences()
    })
  }

  /**
   * Setup focus management
   */
  private setupFocusManagement() {
    // Add focus visible styles
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('using-keyboard')
      }
    })

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('using-keyboard')
    })
  }

  /**
   * Announce to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  /**
   * Announce page load
   */
  private announcePageLoad() {
    setTimeout(() => {
      this.announce('PCMT Exam System loaded. Press Tab to navigate.', 'polite')
    }, 1000)
  }

  /**
   * Toggle high contrast
   */
  toggleHighContrast() {
    this.preferences.highContrast = !this.preferences.highContrast
    this.applyPreferences()
    this.savePreferences()
    this.announce(`High contrast mode ${this.preferences.highContrast ? 'enabled' : 'disabled'}`)
  }

  /**
   * Toggle large text
   */
  toggleLargeText() {
    this.preferences.largeText = !this.preferences.largeText
    this.applyPreferences()
    this.savePreferences()
    this.announce(`Large text ${this.preferences.largeText ? 'enabled' : 'disabled'}`)
  }

  /**
   * Toggle reduced motion
   */
  toggleReducedMotion() {
    this.preferences.reducedMotion = !this.preferences.reducedMotion
    this.applyPreferences()
    this.savePreferences()
    this.announce(`Reduced motion ${this.preferences.reducedMotion ? 'enabled' : 'disabled'}`)
  }

  /**
   * Set color blind mode
   */
  setColorBlindMode(mode: A11yPreferences['colorBlindMode']) {
    this.preferences.colorBlindMode = mode
    this.applyPreferences()
    this.savePreferences()
    this.announce(`Color blind mode: ${mode}`)
  }

  /**
   * Get current preferences
   */
  getPreferences(): A11yPreferences {
    return { ...this.preferences }
  }

  /**
   * Add skip to main content link
   */
  addSkipLink() {
    const skipLink = document.createElement('a')
    skipLink.href = '#main-content'
    skipLink.className = 'skip-link'
    skipLink.textContent = 'Skip to main content'
    skipLink.addEventListener('click', (e) => {
      e.preventDefault()
      const main = document.getElementById('main-content')
      if (main) {
        main.focus()
        main.scrollIntoView()
      }
    })
    
    document.body.insertBefore(skipLink, document.body.firstChild)
  }

  /**
   * Validate ARIA labels
   */
  validateARIA() {
    const issues: string[] = []

    // Check for buttons without labels
    const unlabeledButtons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])')
    if (unlabeledButtons.length > 0) {
      issues.push(`${unlabeledButtons.length} buttons without ARIA labels`)
    }

    // Check for images without alt text
    const unlabeledImages = document.querySelectorAll('img:not([alt])')
    if (unlabeledImages.length > 0) {
      issues.push(`${unlabeledImages.length} images without alt text`)
    }

    // Check for form inputs without labels
    const unlabeledInputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])')
    if (unlabeledInputs.length > 0) {
      issues.push(`${unlabeledInputs.length} inputs without labels`)
    }

    // Disabled: Accessibility audit logging (too verbose)
    // if (issues.length > 0) {
    //   console.warn('⚠️ Accessibility issues found:', issues)
    // } else {
    //   console.log('✅ No accessibility issues found')
    // }

    return issues
  }
}

export const accessibilityManager = new AccessibilityManager()
