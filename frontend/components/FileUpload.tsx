"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, ImageIcon, CheckCircle, AlertCircle, Loader2, X } from "lucide-react"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

import { uploadFile } from "@/lib/api"
import Link from "next/link"

const ALLOWED_TYPES = [".pdf", ".docx", ".jpg", ".jpeg", ".png"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const router = useRouter()

  const validateFile = (file: File): string | null => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase()

    if (!ALLOWED_TYPES.includes(extension)) {
      return `File type ${extension} not allowed. Allowed types: ${ALLOWED_TYPES.join(", ")}`
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`
    }

    return null
  }

  const handleFileSelect = useCallback((selectedFile: File) => {
  const error = validateFile(selectedFile)
  if (error) {
    toast.error(error)
    return
  }

  setFile(selectedFile)
  toast.success("File selected successfully")
}, []) 

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [handleFileSelect])

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + Math.random() * 20
      })
    }, 200)

    try {
      await uploadFile(file)

      setUploadProgress(100)
      toast.success("File uploaded successfully! Scan in progress...")

      // Clear form
      setFile(null)
      const fileInput = document.getElementById("file-input") as HTMLInputElement
      if (fileInput) fileInput.value = ""

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard")
      }, 1500)
    } catch (error: unknown) {
      console.error("Upload error:", error)
      let errorMessage = "Upload failed. Please try again."
      if (typeof error === "object" && error !== null && "response" in error) {
        const errObj = error as { response?: { data?: { error?: string } } }
        errorMessage = errObj.response?.data?.error || errorMessage
      }
      toast.error(errorMessage)
    } finally {
      clearInterval(progressInterval)
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const removeFile = () => {
    setFile(null)
    const fileInput = document.getElementById("file-input") as HTMLInputElement
    if (fileInput) fileInput.value = ""
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
      return <ImageIcon className="h-5 w-5" />
    }
    return <FileText className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Upload className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-3xl font-bold text-gray-900">Secure File Upload</CardTitle>
        <CardDescription className="text-gray-600 text-lg">
          Upload your files securely for malware scanning and analysis
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Drag and Drop Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            id="file-input"
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />

          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your file here, or <span className="text-blue-600">browse</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">Supports PDF, DOCX, JPG, PNG up to 5MB</p>
            </div>
          </div>
        </div>

        {/* File Type Badges */}
        <div className="flex flex-wrap gap-2 justify-center">
          {ALLOWED_TYPES.map((type) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {type.toUpperCase().replace(".", "")}
            </Badge>
          ))}
        </div>

        {/* Selected File Display */}
        {file && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getFileIcon(file.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              {!uploading && (
                <Button variant="ghost" size="sm" onClick={removeFile} className="ml-2 h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 text-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Upload & Scan File
            </>
          )}
        </Button>

        {/* Security Notice */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Your files are encrypted during upload and scanned for malware using advanced detection algorithms.
          </AlertDescription>
        </Alert>

        <div className="pt-4 border-t border-gray-200">
              <Link
                href="/dashboard"
                className="block w-full text-center py-2.5 px-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 font-medium"
              >
                Go to Dashboard →
              </Link>
            </div>
      </CardContent>
    </Card>
  )
}
