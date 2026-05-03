import React, { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { uploadImageToImgBB } from '../../utils/imageUpload'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  placeholder?: string
  className?: string
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  value, 
  onChange, 
  placeholder = "Upload image",
  className = ""
}) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const result = await uploadImageToImgBB(file)
      
      if (result.success && result.url) {
        onChange(result.url)
      } else {
        setError(result.error || 'Failed to upload image')
      }
    } catch (error) {
      setError('Failed to upload image')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = () => {
    onChange('')
    setError(null)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-32 object-cover rounded-lg border"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={uploading}
          className="w-full h-32 border-2 border-dashed border-telegram-hint rounded-lg flex flex-col items-center justify-center space-y-2 hover:border-telegram-button transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-telegram-button animate-spin" />
              <span className="text-sm text-telegram-hint">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-telegram-hint" />
              <span className="text-sm text-telegram-hint">{placeholder}</span>
              <span className="text-xs text-telegram-hint">Click to upload image</span>
            </>
          )}
        </button>
      )}

      {error && (
        <div className="text-red-500 text-sm flex items-center space-x-1">
          <X className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Manual URL input as fallback */}
      <div className="text-xs text-telegram-hint">
        <details>
          <summary className="cursor-pointer hover:text-telegram-text">Or enter URL manually</summary>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full mt-2 p-2 border rounded bg-telegram-secondary-bg text-telegram-text text-sm"
            placeholder="https://example.com/image.jpg"
          />
        </details>
      </div>
    </div>
  )
}

export default ImageUpload