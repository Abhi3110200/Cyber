"use client"
import { Toaster } from "react-hot-toast"
import { FileUpload } from "@/components/FileUpload"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <FileUpload />
      <Toaster position="top-right" />
    </div>
  )
}
