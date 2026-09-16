import Taro from '@tarojs/taro'

import {
  classifyMediaSelectionError,
  getCompressedDimensions,
  isSupportedMealImage,
  MAX_COMPRESSED_MEAL_IMAGE_BYTES,
  MEAL_IMAGE_QUALITY
} from './meal-image-policy'

export * from './meal-image-policy'

export type MealImageSource = 'camera' | 'album'
export type MealImageErrorCode =
  | 'CANCELLED'
  | 'PERMISSION_DENIED'
  | 'IMAGE_UNSUPPORTED'
  | 'IMAGE_COMPRESS_FAILED'
  | 'IMAGE_TOO_LARGE'

export interface SelectedMealImage {
  localPath: string
  size: number
  source: MealImageSource
}

export class MealImageError extends Error {
  constructor(
    public readonly code: MealImageErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'MealImageError'
  }
}

export async function selectAndCompressMealImage(
  source: MealImageSource
): Promise<SelectedMealImage> {
  let selectedPath: string

  try {
    const result = await Taro.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: [source],
      sizeType: ['compressed'],
      camera: 'back'
    })
    const selected = result.tempFiles[0]

    if (!selected?.tempFilePath) {
      throw new Error('No image was selected')
    }

    selectedPath = selected.tempFilePath
  } catch (error) {
    const kind = classifyMediaSelectionError(error)

    if (kind === 'cancelled') {
      throw new MealImageError('CANCELLED', 'Image selection was cancelled')
    }

    if (kind === 'permission-denied') {
      throw new MealImageError(
        'PERMISSION_DENIED',
        'Camera or album permission was denied'
      )
    }

    throw new MealImageError('IMAGE_COMPRESS_FAILED', 'Unable to read the image')
  }

  try {
    const imageInfo = await Taro.getImageInfo({ src: selectedPath })

    if (!isSupportedMealImage(imageInfo.type, selectedPath)) {
      throw new MealImageError(
        'IMAGE_UNSUPPORTED',
        'Only JPG and PNG images are supported'
      )
    }

    const dimensions = getCompressedDimensions(imageInfo.width, imageInfo.height)
    const compressed = await Taro.compressImage({
      src: selectedPath,
      quality: MEAL_IMAGE_QUALITY,
      compressedWidth: dimensions.width,
      compressedHeight: dimensions.height
    })
    const fileInfo = await Taro.getFileInfo({ filePath: compressed.tempFilePath })

    if (!('size' in fileInfo)) {
      throw new Error(fileInfo.errMsg)
    }

    if (fileInfo.size > MAX_COMPRESSED_MEAL_IMAGE_BYTES) {
      throw new MealImageError(
        'IMAGE_TOO_LARGE',
        'The compressed image is still larger than 1MB'
      )
    }

    return {
      localPath: compressed.tempFilePath,
      size: fileInfo.size,
      source
    }
  } catch (error) {
    if (error instanceof MealImageError) throw error

    throw new MealImageError(
      'IMAGE_COMPRESS_FAILED',
      'Unable to compress the selected image'
    )
  }
}
