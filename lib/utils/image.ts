/**
 * 压缩图片到指定大小以下
 * @param file 原始图片文件
 * @param maxSizeBytes 最大文件大小（字节）
 * @returns 压缩后的图片文件
 */
export async function compressImage(file: File, maxSizeBytes: number): Promise<File> {
  // 如果文件已经小于最大大小，直接返回
  if (file.size <= maxSizeBytes) {
    return file
  }

  // 创建图片元素
  const img = document.createElement("img")
  const imgLoaded = new Promise<void>((resolve) => {
    img.onload = () => resolve()
  })
  img.src = URL.createObjectURL(file)
  await imgLoaded

  // 初始压缩质量
  let quality = 0.9
  let compressedFile: File | null = null
  let canvas: HTMLCanvasElement | null = null

  // 如果文件是JPEG或PNG，使用canvas压缩
  if (file.type === "image/jpeg" || file.type === "image/png") {
    // 创建canvas
    canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("无法创建canvas上下文")
    }

    // 设置canvas尺寸
    // 如果图片太大，先缩小尺寸
    const MAX_WIDTH = 1920
    const MAX_HEIGHT = 1080
    let width = img.width
    let height = img.height

    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      if (width / height > MAX_WIDTH / MAX_HEIGHT) {
        height = Math.round((height * MAX_WIDTH) / width)
        width = MAX_WIDTH
      } else {
        width = Math.round((width * MAX_HEIGHT) / height)
        height = MAX_HEIGHT
      }
    }

    canvas.width = width
    canvas.height = height
    ctx.drawImage(img, 0, 0, width, height)

    // 尝试不同的质量级别，直到文件大小小于最大值
    while (quality > 0.1) {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b)
            else resolve(new Blob([], { type: file.type }))
          },
          file.type,
          quality,
        )
      })

      if (blob.size <= maxSizeBytes) {
        compressedFile = new File([blob], file.name, { type: file.type })
        break
      }

      // 降低质量继续尝试
      quality -= 0.1
    }

    // 如果所有质量级别都无法达到目标大小，使用最低质量
    if (!compressedFile) {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b)
            else resolve(new Blob([], { type: file.type }))
          },
          file.type,
          0.1,
        )
      })
      compressedFile = new File([blob], file.name, { type: file.type })
    }
  }

  // 清理资源
  URL.revokeObjectURL(img.src)

  // 返回压缩后的文件或原始文件
  return compressedFile || file
}
