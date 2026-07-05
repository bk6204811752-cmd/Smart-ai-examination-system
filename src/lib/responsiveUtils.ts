/**
 * Responsive Utilities for Multi-Device Support
 * Ensures seamless experience across all screen sizes
 */

export enum ScreenSize {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  LARGE = 'large'
}

export enum Orientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape'
}

export interface DeviceInfo {
  screenSize: ScreenSize
  width: number
  height: number
  orientation: Orientation
  isTouchDevice: boolean
  isRetina: boolean
  devicePixelRatio: number
}

/**
 * Breakpoints matching Tailwind config
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

/**
 * Get current screen size category
 */
export const getScreenSize = (width: number): ScreenSize => {
  if (width < BREAKPOINTS.md) return ScreenSize.MOBILE
  if (width < BREAKPOINTS.lg) return ScreenSize.TABLET
  if (width < BREAKPOINTS['2xl']) return ScreenSize.DESKTOP
  return ScreenSize.LARGE
}

/**
 * Get current orientation
 */
export const getOrientation = (): Orientation => {
  return window.innerWidth > window.innerHeight 
    ? Orientation.LANDSCAPE 
    : Orientation.PORTRAIT
}

/**
 * Check if device has touch capability
 */
export const isTouchDevice = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - Legacy support
    (navigator.msMaxTouchPoints > 0)
  )
}

/**
 * Check if device has retina display
 */
export const isRetinaDisplay = (): boolean => {
  return window.devicePixelRatio > 1
}

/**
 * Get comprehensive device information
 */
export const getDeviceInfo = (): DeviceInfo => {
  const width = window.innerWidth
  const height = window.innerHeight
  
  return {
    screenSize: getScreenSize(width),
    width,
    height,
    orientation: getOrientation(),
    isTouchDevice: isTouchDevice(),
    isRetina: isRetinaDisplay(),
    devicePixelRatio: window.devicePixelRatio || 1
  }
}

/**
 * Media query matchers for reactive components
 */
export const mediaQueries = {
  mobile: `(max-width: ${BREAKPOINTS.md - 1}px)`,
  tablet: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,
  large: `(min-width: ${BREAKPOINTS['2xl']}px)`,
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  touch: '(hover: none) and (pointer: coarse)',
  retina: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)'
}

/**
 * Check if media query matches
 */
export const matchesMediaQuery = (query: string): boolean => {
  return window.matchMedia(query).matches
}

/**
 * Get optimal font size based on screen size
 */
export const getOptimalFontSize = (baseSize: number = 16): number => {
  const { screenSize } = getDeviceInfo()
  
  const multipliers = {
    [ScreenSize.MOBILE]: 0.875,   // 14px
    [ScreenSize.TABLET]: 0.9375,  // 15px
    [ScreenSize.DESKTOP]: 1,      // 16px
    [ScreenSize.LARGE]: 1.125     // 18px
  }
  
  return baseSize * multipliers[screenSize]
}

/**
 * Get optimal spacing based on screen size
 */
export const getOptimalSpacing = (baseSpacing: number = 16): number => {
  const { screenSize } = getDeviceInfo()
  
  const multipliers = {
    [ScreenSize.MOBILE]: 0.75,    // 12px
    [ScreenSize.TABLET]: 0.875,   // 14px
    [ScreenSize.DESKTOP]: 1,      // 16px
    [ScreenSize.LARGE]: 1.25      // 20px
  }
  
  return baseSpacing * multipliers[screenSize]
}

/**
 * Get optimal image quality based on screen
 */
export const getOptimalImageQuality = (): 'low' | 'medium' | 'high' => {
  const { screenSize, isRetina } = getDeviceInfo()
  
  if (screenSize === ScreenSize.MOBILE && !isRetina) return 'low'
  if (screenSize === ScreenSize.TABLET || (screenSize === ScreenSize.MOBILE && isRetina)) return 'medium'
  return 'high'
}

/**
 * Get column count for grid layouts
 */
export const getGridColumns = (options: {
  mobile?: number
  tablet?: number
  desktop?: number
  large?: number
} = {}): number => {
  const { screenSize } = getDeviceInfo()
  
  const defaults = {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    large: 4
  }
  
  const columns = { ...defaults, ...options }
  
  switch (screenSize) {
    case ScreenSize.MOBILE: return columns.mobile
    case ScreenSize.TABLET: return columns.tablet
    case ScreenSize.DESKTOP: return columns.desktop
    case ScreenSize.LARGE: return columns.large
    default: return columns.desktop
  }
}

/**
 * Format bytes for display based on locale
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Get safe area insets for notched devices
 */
export const getSafeAreaInsets = () => {
  const style = getComputedStyle(document.documentElement)
  
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0')
  }
}

/**
 * Lock screen orientation (mobile only)
 */
export const lockOrientation = async (orientation: 'portrait' | 'landscape' | 'portrait-primary' | 'landscape-primary'): Promise<boolean> => {
  if (!('orientation' in screen)) return false
  
  try {
    // @ts-ignore - Screen Orientation API
    await screen.orientation.lock(orientation)
    return true
  } catch (error) {
    console.warn('Orientation lock not supported:', error)
    return false
  }
}

/**
 * Unlock screen orientation
 */
export const unlockOrientation = (): void => {
  if ('orientation' in screen) {
    // @ts-ignore - Screen Orientation API
    screen.orientation.unlock()
  }
}

/**
 * Check if device is in fullscreen mode
 */
export const isFullscreen = (): boolean => {
  return !!(
    document.fullscreenElement ||
    // @ts-ignore - Vendor prefixes
    document.webkitFullscreenElement ||
    // @ts-ignore
    document.mozFullScreenElement ||
    // @ts-ignore
    document.msFullscreenElement
  )
}

/**
 * Request fullscreen on element
 */
export const requestFullscreen = async (element: HTMLElement = document.documentElement): Promise<boolean> => {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen()
    } else if ((element as any).webkitRequestFullscreen) {
      await (element as any).webkitRequestFullscreen()
    } else if ((element as any).mozRequestFullScreen) {
      await (element as any).mozRequestFullScreen()
    } else if ((element as any).msRequestFullscreen) {
      await (element as any).msRequestFullscreen()
    }
    return true
  } catch (error) {
    console.warn('Fullscreen request failed:', error)
    return false
  }
}

/**
 * Exit fullscreen mode
 */
export const exitFullscreen = async (): Promise<boolean> => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen()
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen()
    } else if ((document as any).mozCancelFullScreen) {
      await (document as any).mozCancelFullScreen()
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen()
    }
    return true
  } catch (error) {
    console.warn('Exit fullscreen failed:', error)
    return false
  }
}

/**
 * Vibrate device (mobile only)
 */
export const vibrate = (pattern: number | number[]): boolean => {
  if (!('vibrate' in navigator)) return false
  
  try {
    navigator.vibrate(pattern)
    return true
  } catch (error) {
    console.warn('Vibration not supported:', error)
    return false
  }
}

/**
 * Show notification (requires permission)
 */
export const showNotification = async (
  title: string, 
  options?: NotificationOptions
): Promise<boolean> => {
  if (!('Notification' in window)) return false
  
  if (Notification.permission === 'granted') {
    new Notification(title, options)
    return true
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      new Notification(title, options)
      return true
    }
  }
  
  return false
}

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  } catch (error) {
    console.warn('Clipboard copy failed:', error)
    return false
  }
}

/**
 * Share content using Web Share API (mobile)
 */
export const shareContent = async (data: ShareData): Promise<boolean> => {
  if (!('share' in navigator)) return false
  
  try {
    await navigator.share(data)
    return true
  } catch (error) {
    console.warn('Share failed:', error)
    return false
  }
}

/**
 * Check if device has camera
 */
export const hasCamera = async (): Promise<boolean> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.some(device => device.kind === 'videoinput')
  } catch (error) {
    return false
  }
}

/**
 * Check if device has microphone
 */
export const hasMicrophone = async (): Promise<boolean> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.some(device => device.kind === 'audioinput')
  } catch (error) {
    return false
  }
}

/**
 * Get network information
 */
export const getNetworkInfo = () => {
  // @ts-ignore - Experimental API
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  
  if (!connection) {
    return {
      effectiveType: 'unknown',
      downlink: undefined,
      rtt: undefined,
      saveData: false
    }
  }
  
  return {
    effectiveType: connection.effectiveType || 'unknown', // 4g, 3g, 2g, slow-2g
    downlink: connection.downlink, // Mbps
    rtt: connection.rtt, // Round trip time in ms
    saveData: connection.saveData || false
  }
}

/**
 * Check if device is online
 */
export const isOnline = (): boolean => {
  return navigator.onLine
}

/**
 * Get battery status (if available)
 */
export const getBatteryStatus = async () => {
  // @ts-ignore - Experimental API
  if (!('getBattery' in navigator)) {
    return null
  }
  
  try {
    // @ts-ignore
    const battery = await navigator.getBattery()
    return {
      level: battery.level * 100, // 0-100%
      charging: battery.charging,
      chargingTime: battery.chargingTime, // seconds
      dischargingTime: battery.dischargingTime // seconds
    }
  } catch (error) {
    return null
  }
}

/**
 * Prevent screen sleep (during exams)
 */
export const preventScreenSleep = async (): Promise<WakeLockSentinel | null> => {
  // @ts-ignore - Experimental API
  if (!('wakeLock' in navigator)) {
    console.warn('Wake Lock API not supported')
    return null
  }
  
  try {
    // @ts-ignore
    const wakeLock = await navigator.wakeLock.request('screen')
    console.log('Screen wake lock activated')
    return wakeLock
  } catch (error) {
    console.warn('Wake Lock request failed:', error)
    return null
  }
}

export default {
  getScreenSize,
  getOrientation,
  getDeviceInfo,
  matchesMediaQuery,
  getOptimalFontSize,
  getOptimalSpacing,
  getOptimalImageQuality,
  getGridColumns,
  formatBytes,
  getSafeAreaInsets,
  lockOrientation,
  unlockOrientation,
  isFullscreen,
  requestFullscreen,
  exitFullscreen,
  vibrate,
  showNotification,
  copyToClipboard,
  shareContent,
  hasCamera,
  hasMicrophone,
  getNetworkInfo,
  isOnline,
  getBatteryStatus,
  preventScreenSleep,
  BREAKPOINTS,
  mediaQueries
}
