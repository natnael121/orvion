import React, { useState, useRef } from 'react'
import { Upload, X, Plus, Loader2 } from 'lucide-react'
import { uploadMultipleImages } from '../../utils/imageUpload'

interface MultiImageUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
  className?: string
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({ 
  value, 
  onChange, 
  maxImages = 5,
  className = ""
}) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // Check if adding these files would exceed the limit
    if (value.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const results = await uploadMultipleImages(files)
      const successfulUploads = results
        .filter(result => result.success && result.url)
        .map(result => result.url!)

      const failedUploads = results.filter(result => !result.success)
      
      if (successfulUploads.length > 0) {
        onChange([...value, ...successfulUploads])
      }

      if (failedUploads.length > 0) {
        setError(`${failedUploads.length} image(s) failed to upload`)
      }
    } catch (error) {
      setError('Failed to upload images')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = (index: number) => {
    const newImages = value.filter((_, i) => i !== index)
    onChange(newImages)
    setError(null)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleAddUrl = (url: string) => {
    if (url.trim() && value.length < maxImages) {
      onChange([...value, url.trim()])
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {value.map((imageUrl, index) => (
          <div key={index} className="relative group">
            <img
              src={imageUrl}
              alt={`Product image ${index + 1}`}
              className="w-full h-24 object-cover rounded-lg border"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(index)}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
              {index + 1}
            </div>
          </div>
        ))}

        {/* Add Image Button */}
        {value.length < maxImages && (
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={uploading}
            className="w-full h-24 border-2 border-dashed border-telegram-hint rounded-lg flex flex-col items-center justify-center space-y-1 hover:border-telegram-button transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 text-telegram-button animate-spin" />
                <span className="text-xs text-telegram-hint">Uploading...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-telegram-hint" />
                <span className="text-xs text-telegram-hint">Add Image</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-sm flex items-center space-x-1">
          <X className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="text-xs text-telegram-hint">
        {value.length} / {maxImages} images • Click to upload or drag and drop
      </div>

      {/* Manual URL input as fallback */}
      <div className="text-xs text-telegram-hint">
        <details>
          <summary className="cursor-pointer hover:text-telegram-text">Or add image URL manually</summary>
          <div className="mt-2 flex space-x-2">
            <input
              type="url"
              className="flex-1 p-2 border rounded bg-telegram-secondary-bg text-telegram-text text-sm"
              placeholder="https://example.com/image.jpg"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const input = e.target as HTMLInputElement
                  handleAddUrl(input.value)
                  input.value = ''
                }
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement
                handleAddUrl(input.value)
                input.value = ''
              }}
              className="px-3 py-2 bg-telegram-button text-telegram-button-text rounded text-sm"
            >
              Add
            </button>
          </div>
        </details>
      </div>
    </div>
  )
}

export default MultiImageUpload