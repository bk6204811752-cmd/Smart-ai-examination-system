import { useState, useEffect } from 'react'

interface MobileDetect {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
}

export const useMobileDetect = (): MobileDetect => {
  const [deviceInfo, setDeviceInfo] = useState<MobileDetect>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false
  })

  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const width = window.innerWidth

      const isMobile = width < 768 || /iPhone|iPod|Android.*Mobile/i.test(ua)
      const isTablet = (width >= 768 && width < 1024) || /iPad|Android(?!.*Mobile)/i.test(ua)
      const isDesktop = width >= 1024 && !isMobile && !isTablet

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice
      })
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return deviceInfo
}

export default useMobileDetect
