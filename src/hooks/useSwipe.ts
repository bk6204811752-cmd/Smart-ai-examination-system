import { useRef, TouchEvent } from 'react'

interface SwipeInput {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  minSwipeDistance?: number
}

interface SwipeOutput {
  onTouchStart: (e: TouchEvent) => void
  onTouchMove: (e: TouchEvent) => void
  onTouchEnd: () => void
}

export const useSwipe = (input: SwipeInput): SwipeOutput => {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchEndRef = useRef<{ x: number; y: number } | null>(null)

  const minSwipeDistance = input.minSwipeDistance || 50

  const onTouchStart = (e: TouchEvent) => {
    touchEndRef.current = null
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    }
  }

  const onTouchMove = (e: TouchEvent) => {
    touchEndRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    }
  }

  const onTouchEnd = () => {
    const start = touchStartRef.current
    const end = touchEndRef.current
    if (!start || !end) return

    const distanceX = start.x - end.x
    const distanceY = start.y - end.y
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    const isUpSwipe = distanceY > minSwipeDistance
    const isDownSwipe = distanceY < -minSwipeDistance

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe && input.onSwipeLeft) {
        input.onSwipeLeft()
      }
      if (isRightSwipe && input.onSwipeRight) {
        input.onSwipeRight()
      }
    } else {
      if (isUpSwipe && input.onSwipeUp) {
        input.onSwipeUp()
      }
      if (isDownSwipe && input.onSwipeDown) {
        input.onSwipeDown()
      }
    }
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  }
}

export default useSwipe
