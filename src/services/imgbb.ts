export const IMGBB_API_KEY = 'f6f560dbdcf0c91aea57b3cd55097799'
export const IMGBB_API_URL = 'https://api.imgbb.com/1/upload'

export interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
}

export const imgbbService = {
  async uploadImage(file: File, name?: string): Promise<string> {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file')
      }

      // Validate file size (max 32MB for ImgBB)
      if (file.size > 32 * 1024 * 1024) {
        throw new Error('Image size must be less than 32MB')
      }

      const formData = new FormData()
      formData.append('key', IMGBB_API_KEY)
      formData.append('image', file)
      if (name) {
        formData.append('name', name)
      }

      const response = await fetch(IMGBB_API_URL, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        return result.data.url
      } else {
        throw new Error(result.error?.message || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Image upload error:', error)
      throw error
    }
  },

  async uploadMultipleImages(files: FileList, namePrefix?: string): Promise<string[]> {
    const uploadPromises = Array.from(files).map((file, index) => 
      this.uploadImage(file, namePrefix ? `${namePrefix}-${index + 1}` : undefined)
    )
    return Promise.all(uploadPromises)
  }
}