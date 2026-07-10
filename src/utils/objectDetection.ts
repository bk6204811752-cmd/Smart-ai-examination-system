import * as tf from '@tensorflow/tfjs'
import * as cocossd from '@tensorflow-models/coco-ssd'

export interface DetectedObject {
  label: string
  score: number
  bbox: [number, number, number, number]
}

const SUSPICIOUS_CATEGORIES = [
  'cell phone',
  'book',
  'laptop',
  'tablet',
  'tv',
  'remote',
  'keyboard',
  'mouse',
  'person',
  'bottle',
  'cup',
  'backpack',
  'handbag',
  'suitcase',
  'clock',
  'vase',
  'scissors',
  'teddy bear',
  'hair drier',
  'toothbrush',
]

let model: cocossd.ObjectDetection | null = null
let loadingPromise: Promise<cocossd.ObjectDetection> | null = null
let loadAttempts = 0
const MAX_LOAD_ATTEMPTS = 8
let modelLoadFailed = false
let lastModelLoadError: string | null = null
let abortLoading = false

export function isObjectDetectionAvailable(): boolean {
  return model !== null
}

export function hasObjectDetectionFailed(): boolean {
  return modelLoadFailed
}

export function getLastModelLoadError(): string | null {
  return lastModelLoadError
}

export function getModelLoadStatus(): { attempts: number; maxAttempts: number; failed: boolean } {
  return { attempts: loadAttempts, maxAttempts: MAX_LOAD_ATTEMPTS, failed: modelLoadFailed }
}

export function resetObjectDetector(): void {
  model = null
  loadingPromise = null
  loadAttempts = 0
  modelLoadFailed = false
  lastModelLoadError = null
  abortLoading = false
}

export async function loadObjectDetector(): Promise<cocossd.ObjectDetection> {
  if (model) return model
  if (modelLoadFailed && loadAttempts >= MAX_LOAD_ATTEMPTS) {
    throw new Error(lastModelLoadError || 'Object detection model previously failed to load')
  }
  if (loadingPromise) return loadingPromise

  loadAttempts++
  abortLoading = false
  loadingPromise = (async () => {
    try {
      await tf.ready()
      const m = await cocossd.load({
        base: 'mobilenet_v2',
      })
      model = m
      modelLoadFailed = false
      lastModelLoadError = null
      loadAttempts = 0
      return m
    } catch (err) {
      loadingPromise = null
      const msg = err instanceof Error ? err.message : String(err)
      lastModelLoadError = msg
      console.warn(`[ObjectDetection] Load attempt ${loadAttempts}/${MAX_LOAD_ATTEMPTS} failed:`, msg)
      if (!abortLoading && loadAttempts < MAX_LOAD_ATTEMPTS) {
        const delay = Math.min(2000 * Math.pow(1.5, loadAttempts - 1), 15000)
        await new Promise(r => setTimeout(r, delay))
        return loadObjectDetector()
      }
      modelLoadFailed = true
      throw err
    }
  })()

  return loadingPromise
}

export function isSuspicious(label: string): boolean {
  return SUSPICIOUS_CATEGORIES.includes(label.toLowerCase())
}

export function closeObjectDetector(): void {
  model = null
  loadingPromise = null
  abortLoading = true
}

export async function detectSuspiciousObjects(
  video: HTMLVideoElement,
  scoreThreshold = 0.3
): Promise<{ phone: boolean; book: boolean; suspicious: DetectedObject[] }> {
  if (!video || video.readyState < 2 || video.videoWidth === 0) {
    return { phone: false, book: false, suspicious: [] }
  }
  const m = await loadObjectDetector()
  const predictions = await m.detect(video)

  let phone = false
  let book = false
  const suspicious: DetectedObject[] = []
  const vw = video.videoWidth || 1
  const vh = video.videoHeight || 1

  for (const pred of predictions) {
    if (pred.score < scoreThreshold) continue
    const label = pred.class.toLowerCase()
    const bbox = pred.bbox
    const obj: DetectedObject = {
      label,
      score: pred.score,
      bbox,
    }
    const boxWidth = bbox[2] / vw
    const boxHeight = bbox[3] / vh
    const minRelativeSize = 0.02
    if (boxWidth < minRelativeSize && boxHeight < minRelativeSize) continue

    if (label === 'cell phone') {
      phone = true
      suspicious.push(obj)
    } else if (label === 'book' || label === 'laptop' || label === 'tablet') {
      book = true
      suspicious.push(obj)
    } else if (isSuspicious(label)) {
      suspicious.push(obj)
    }
  }

  return { phone, book, suspicious }
}

export async function checkObjectDetectionHealth(): Promise<{
  available: boolean
  modelLoaded: boolean
  tfReady: boolean
  error: string | null
  loadStatus: { attempts: number; maxAttempts: number; failed: boolean }
}> {
  try {
    const tfReady = await tf.ready().then(() => true).catch(() => false)
    return {
      available: model !== null,
      modelLoaded: model !== null,
      tfReady,
      error: lastModelLoadError,
      loadStatus: getModelLoadStatus(),
    }
  } catch {
    return {
      available: false,
      modelLoaded: false,
      tfReady: false,
      error: 'TensorFlow.js backend not available',
      loadStatus: { attempts: loadAttempts, maxAttempts: MAX_LOAD_ATTEMPTS, failed: true },
    }
  }
}
