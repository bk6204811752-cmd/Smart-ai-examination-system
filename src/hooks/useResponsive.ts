/**
 * React Hook for Responsive Design
 * Real-time screen size detection and updates
 */

import { useState, useEffect } from 'react'
import {
  getDeviceInfo,
  DeviceInfo,
  ScreenSize,
  matchesMediaQuery,
  mediaQueries,
  getGridColumns,
} from '../lib/responsiveUtils'

/**
 * Hook to get current device information
 * Updates on window resize
 */
export const useDeviceInfo = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo())

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo())
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return deviceInfo
}

/**
 * Hook to check if current screen is mobile
 */
export const useIsMobile = (): boolean => {
  const { screenSize } = useDeviceInfo()
  return screenSize === ScreenSize.MOBILE
}

/**
 * Hook to check if current screen is tablet
 */
export const useIsTablet = (): boolean => {
  const { screenSize } = useDeviceInfo()
  return screenSize === ScreenSize.TABLET
}

/**
 * Hook to check if current screen is desktop
 */
export const useIsDesktop = (): boolean => {
  const { screenSize } = useDeviceInfo()
  return screenSize === ScreenSize.DESKTOP || screenSize === ScreenSize.LARGE
}

/**
 * Hook to track media query matches
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(matchesMediaQuery(query))

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handleChange = () => setMatches(mediaQuery.matches)

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    // Legacy browsers
    else {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [query])

  return matches
}

/**
 * Hook for conditional rendering based on screen size
 */
export const useBreakpoint = () => {
  const isMobile = useMediaQuery(mediaQueries.mobile)
  const isTablet = useMediaQuery(mediaQueries.tablet)
  const isDesktop = useMediaQuery(mediaQueries.desktop)
  const isLarge = useMediaQuery(mediaQueries.large)

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLarge,
    current: isMobile ? 'mobile' : isTablet ? 'tablet' : isDesktop ? 'desktop' : 'large',
  }
}

/**
 * Hook for responsive grid columns
 */
export const useGridColumns = (options?: {
  mobile?: number
  tablet?: number
  desktop?: number
  large?: number
}): number => {
  const [columns, setColumns] = useState<number>(getGridColumns(options))

  useEffect(() => {
    const handleResize = () => {
      setColumns(getGridColumns(options))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [options])

  return columns
}

/**
 * Hook to detect orientation changes
 */
export const useOrientation = () => {
  const { orientation } = useDeviceInfo()
  const [isPortrait, setIsPortrait] = useState(orientation === 'portrait')

  useEffect(() => {
    const handleOrientationChange = () => {
      setIsPortrait(window.innerWidth < window.innerHeight)
    }

    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', handleOrientationChange)

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleOrientationChange)
    }
  }, [])

  return {
    isPortrait,
    isLandscape: !isPortrait,
    orientation: isPortrait ? 'portrait' : 'landscape',
  }
}

/**
 * Hook to get window dimensions
 */
export const useWindowSize = () => {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      }, 150) // Debounce resize events
    }

    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return size
}

/**
 * Hook to check if device is touch-enabled
 */
export const useIsTouchDevice = (): boolean => {
  const { isTouchDevice } = useDeviceInfo()
  return isTouchDevice
}

/**
 * Hook for network status
 */
export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Hook for responsive values
 * Returns different values based on screen size
 */
export const useResponsiveValue = <T>(values: {
  mobile?: T
  tablet?: T
  desktop?: T
  large?: T
  default: T
}): T => {
  const { current } = useBreakpoint()

  if (current === 'mobile' && values.mobile !== undefined) return values.mobile
  if (current === 'tablet' && values.tablet !== undefined) return values.tablet
  if (current === 'desktop' && values.desktop !== undefined) return values.desktop
  if (current === 'large' && values.large !== undefined) return values.large

  return values.default
}

/**
 * Hook for screen reader detection
 */
export const useScreenReader = (): boolean => {
  const [isScreenReader, setIsScreenReader] = useState(false)

  useEffect(() => {
    // Detect if screen reader is active
    const checkScreenReader = () => {
      const isUsingScreenReader =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        // @ts-expect-error - navigator.userAgent string checks for screen readers
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS')

      setIsScreenReader(isUsingScreenReader)
    }

    checkScreenReader()
  }, [])

  return isScreenReader
}

/**
 * Hook for preferred color scheme
 */
export const usePrefersColorScheme = (): 'light' | 'dark' | null => {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)')

  if (prefersDark) return 'dark'
  if (prefersLight) return 'light'
  return null
}

/**
 * Hook for hover capability detection
 */
export const useHoverCapability = (): boolean => {
  return useMediaQuery('(hover: hover) and (pointer: fine)')
}

export default {
  useDeviceInfo,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useMediaQuery,
  useBreakpoint,
  useGridColumns,
  useOrientation,
  useWindowSize,
  useIsTouchDevice,
  useOnlineStatus,
  useResponsiveValue,
  useScreenReader,
  usePrefersColorScheme,
  useHoverCapability,
}
