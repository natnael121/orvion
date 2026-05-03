export const IMGBB_API_KEY = 'f6f560dbdcf0c91aea57b3cd55097799'
export const IMGBB_API_URL = 'https://api.imgbb.com/1/upload'

export interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
}

export const uploadImageToImgBB = async (file: File): Promise<ImageUploadResult> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Please select a valid image file' }
    }

    // Validate file size (max 32MB for ImgBB)
    if (file.size > 32 * 1024 * 1024) {
      return { success: false, error: 'Image size must be less than 32MB' }
    }

    const formData = new FormData()
    formData.append('key', IMGBB_API_KEY)
    formData.append('image', file)

    const response = await fetch(IMGBB_API_URL, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (result.success) {
      return {
        success: true,
        url: result.data.url
      }
    } else {
      return {
        success: false,
        error: result.error?.message || 'Failed to upload image'
      }
    }
  } catch (error) {
    console.error('Image upload error:', error)
    return {
      success: false,
      error: 'Network error occurred while uploading image'
    }
  }
}

export const uploadMultipleImages = async (files: FileList): Promise<ImageUploadResult[]> => {
  const uploadPromises = Array.from(files).map(file => uploadImageToImgBB(file))
  return Promise.all(uploadPromises)
}