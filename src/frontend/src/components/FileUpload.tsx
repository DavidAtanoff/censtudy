import { useState } from 'react'
import { X, File, Image, Music } from 'lucide-react'
import { uploadFile } from '@/lib/api'

interface Props {
  onUploadComplete: (fileUrl: string, fileId: number) => void
  acceptedTypes?: string
  maxSize?: number // in MB
}

export default function FileUpload({ onUploadComplete, acceptedTypes = "image/*,application/pdf,audio/*", maxSize = 10 }: Props) {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`)
      return
    }

    setError(null)
    setUploading(true)

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }

    try {
      const response = await uploadFile(file)

      const fileUrl = `${apiBase}/api/files/${response.data.id}/download`
      onUploadComplete(fileUrl, response.data.id)
    } catch (err) {
      setError('Failed to upload file')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const clearPreview = () => {
    setPreview(null)
    setError(null)
  }

  const getFileIcon = () => {
    if (acceptedTypes.includes('image')) return <Image className="w-8 h-8" />
    if (acceptedTypes.includes('audio')) return <Music className="w-8 h-8" />
    return <File className="w-8 h-8" />
  }

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition-colors bg-gray-50">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploading ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            ) : (
              <>
                {getFileIcon()}
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  Max size: {maxSize}MB
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept={acceptedTypes}
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
