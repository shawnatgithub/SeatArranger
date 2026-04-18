import type Konva from 'konva'

export type ExportConfig = {
  freeQueueMs: number
  watermarkText: string
  pixelRatio: number
}

const numberFromEnv = (v: string | undefined) => {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export const getExportConfig = (): ExportConfig => {
  const freeQueueMs =
    numberFromEnv(process.env.NEXT_PUBLIC_FREE_EXPORT_QUEUE_MS) ??
    numberFromEnv(process.env.NEXT_PUBLIC_EXPORT_QUEUE_MS) ??
    15_000

  const pixelRatio = numberFromEnv(process.env.NEXT_PUBLIC_EXPORT_PIXEL_RATIO) ?? 2

  const watermarkText =
    process.env.NEXT_PUBLIC_FREE_EXPORT_WATERMARK_TEXT ??
    process.env.NEXT_PUBLIC_WATERMARK_TEXT ??
    'Seat Arranger'

  return { freeQueueMs, watermarkText, pixelRatio }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const dataUrlToBlob = async (dataUrl: string) => {
  const res = await fetch(dataUrl)
  return res.blob()
}

const blobToImage = (blob: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })

export const exportStageToPng = async (
  stage: Konva.Stage,
  options: { addWatermark: boolean; queueMs: number; watermarkText: string; pixelRatio: number },
): Promise<Blob> => {
  if (options.queueMs > 0) {
    await sleep(options.queueMs)
  }

  const dataUrl = stage.toDataURL({ pixelRatio: options.pixelRatio })
  if (!options.addWatermark) return dataUrlToBlob(dataUrl)

  const blob = await dataUrlToBlob(dataUrl)
  const img = await blobToImage(blob)

  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height

  const ctx = canvas.getContext('2d')
  if (!ctx) return blob

  ctx.drawImage(img, 0, 0)

  const fontSize = Math.max(16, Math.round(Math.min(canvas.width, canvas.height) * 0.03))
  ctx.font = `${fontSize}px sans-serif`
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText(options.watermarkText, canvas.width - fontSize, canvas.height - fontSize)

  const outBlob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? blob), 'image/png'),
  )

  return outBlob
}

