"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  Eye,
  Upload,
  Activity,
} from "lucide-react"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { getFiles, getFile, getQueueStatus, type FileData } from "@/lib/api"
import { socketManager } from "@/lib/socket"

export function Dashboard() {
  const [files, setFiles] = useState<FileData[]>([])
  const [allFiles, setAllFiles] = useState<FileData[]>([]) // Store all files for local filtering
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  const [queueStatus, setQueueStatus] = useState({ size: 0, processing: false })
  const [stats, setStats] = useState({
    total: 0,
    clean: 0,
    infected: 0,
    pending: 0,
  })
  const router = useRouter()

  const fetchFiles = async () => {
    try {
      console.log("📊 Fetching all files...")
      // Always fetch all files first
      const response = await getFiles("all")
      console.log("📊 All files received:", response.files.length)

      setAllFiles(response.files)

      // Apply local filtering
      const filteredFiles = applyFilter(response.files, filter)
      setFiles(filteredFiles)

      // Calculate stats from all files
      const total = response.files.length
      const clean = response.files.filter((f) => f.result === "clean").length
      const infected = response.files.filter((f) => f.result === "infected").length
      const pending = response.files.filter((f) => f.status === "pending" || f.status === "scanning").length

      setStats({ total, clean, infected, pending })
      console.log("📊 Stats calculated:", { total, clean, infected, pending })
    } catch (error) {
      console.error("Failed to fetch files:", error)
      toast.error("Failed to load files")
    } finally {
      setLoading(false)
    }
  }

  // Local filtering function
  const applyFilter = (fileList: FileData[], filterValue: string): FileData[] => {
    console.log(`🔍 Applying filter: ${filterValue} to ${fileList.length} files`)

    let filtered: FileData[]

    switch (filterValue) {
      case "pending":
        filtered = fileList.filter((f) => f.status === "pending")
        break
      case "scanning":
        filtered = fileList.filter((f) => f.status === "scanning")
        break
      case "scanned":
        filtered = fileList.filter((f) => f.status === "scanned")
        break
      case "clean":
        filtered = fileList.filter((f) => f.result === "clean")
        break
      case "infected":
        filtered = fileList.filter((f) => f.result === "infected")
        break
      case "all":
      default:
        filtered = fileList
        break
    }

    console.log(`🔍 Filter result: ${filtered.length} files match "${filterValue}"`)
    return filtered
  }

  // Handle filter change
  const handleFilterChange = (newFilter: string) => {
    console.log(`🔍 Filter changed from "${filter}" to "${newFilter}"`)
    setFilter(newFilter)

    // Apply filter to existing data immediately
    const filteredFiles = applyFilter(allFiles, newFilter)
    setFiles(filteredFiles)
  }

  const fetchQueueStatus = async () => {
    try {
      const status = await getQueueStatus()
      setQueueStatus(status)
    } catch (error) {
      console.error("Failed to fetch queue status:", error)
    }
  }

  useEffect(() => {
    fetchFiles()
    fetchQueueStatus()

    // Set up auto-refresh
    const interval = setInterval(() => {
      fetchFiles()
      fetchQueueStatus()
    }, 5000)

    // Set up socket connection for real-time updates
    const socket = socketManager.connect()

    socket.on("fileStatusUpdate", (data) => {
      console.log("📡 Real-time update:", data)

      // Update both allFiles and files
      setAllFiles((prevFiles) => {
        const updatedFiles = prevFiles.map((file) =>
          file.id === data.fileId
            ? { ...file, status: data.status, result: data.result, scannedAt: data.scannedAt }
            : file,
        )

        // Also update the filtered files
        const filteredFiles = applyFilter(updatedFiles, filter)
        setFiles(filteredFiles)

        return updatedFiles
      })

      // Show toast notification
      if (data.status === "scanned") {
        const message =
          data.result === "infected" ? `🚨 Malware detected in ${data.filename}!` : `✅ ${data.filename} is clean`

        toast(message, {
          icon: data.result === "infected" ? "🚨" : "✅",
          duration: 5000,
        })
      }
    })

    return () => {
      clearInterval(interval)
      socketManager.disconnect()
    }
  }, [])

  // Re-apply filter when allFiles changes
  useEffect(() => {
    if (allFiles.length > 0) {
      const filteredFiles = applyFilter(allFiles, filter)
      setFiles(filteredFiles)
    }
  }, [allFiles, filter])

  const handleViewDetails = async (fileId: string) => {
    try {
      const file = await getFile(fileId)
      setSelectedFile(file)
    } catch (error) {
      toast.error("Failed to load file details")
    }
  }

  const getStatusIcon = (status: string, result: string | null) => {
    if (status === "pending") return <Clock className="h-4 w-4 text-yellow-500" />
    if (status === "scanning") return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
    if (result === "clean") return <CheckCircle className="h-4 w-4 text-green-500" />
    if (result === "infected") return <AlertTriangle className="h-4 w-4 text-red-500" />
    return <Clock className="h-4 w-4 text-gray-500" />
  }

  const getStatusBadge = (status: string, result: string | null) => {
    if (status === "pending")
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Pending
        </Badge>
      )
    if (status === "scanning")
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Scanning
        </Badge>
      )
    if (result === "clean")
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Clean
        </Badge>
      )
    if (result === "infected") return <Badge variant="destructive">Infected</Badge>
    return <Badge variant="secondary">Unknown</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Security Dashboard</h1>
                <p className="text-sm sm:text-base text-gray-600">Monitor your file scans and security status</p>
              </div>
            </div>
            <Button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
              <Upload className="mr-2 h-4 w-4" />
              Upload New File
            </Button>
          </div>

          {/* Queue Status */}
          {queueStatus.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-blue-900 text-sm sm:text-base">
                  {queueStatus.processing ? "Processing" : "Queued"}: {queueStatus.size} file
                  {queueStatus.size !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Total Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-3xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">All uploaded files</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Clean Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-3xl font-bold text-green-600">{stats.clean}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total > 0 ? Math.round((stats.clean / stats.total) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Threats Detected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-3xl font-bold text-red-600">{stats.infected}</div>
              <p className="text-xs text-gray-500 mt-1">Quarantined safely</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Pending Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-3xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-gray-500 mt-1">In queue or processing</p>
            </CardContent>
          </Card>
        </div>

        {/* Files Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <CardTitle className="text-lg sm:text-xl">File Scan Results</CardTitle>
                <CardDescription className="text-sm">
                  Your uploaded files and their security scan status
                  {filter !== "all" && (
                    <span className="block sm:inline sm:ml-2 text-blue-600 mt-1 sm:mt-0">
                      (Filtered: {files.length} of {stats.total} files)
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <Select value={filter} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-28 sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Files</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="scanning">Scanning</SelectItem>
                    <SelectItem value="clean">Clean</SelectItem>
                    <SelectItem value="infected">Infected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-base sm:text-lg">
                  {filter === "all" ? "No files found" : `No ${filter} files found`}
                </p>
                <p className="text-gray-400 text-sm">
                  {filter === "all" ? "Upload a file to get started" : `Try changing the filter or upload more files`}
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors space-y-3 sm:space-y-0"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      {getStatusIcon(file.status, file.result)}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{file.filename}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-gray-500 space-y-1 sm:space-y-0">
                          <span>{formatFileSize(file.size)}</span>
                          <span>Uploaded: {formatDate(file.uploadedAt)}</span>
                          {file.scannedAt && <span>Scanned: {formatDate(file.scannedAt)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-3">
                      {getStatusBadge(file.status, file.result)}

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(file.id)}>
                            <Eye className="h-4 w-4" />
                            <span className="ml-1 sm:hidden">Details</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>File Details</DialogTitle>
                            <DialogDescription>Detailed information about the scanned file</DialogDescription>
                          </DialogHeader>
                          {selectedFile && (
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Filename</label>
                                <p className="text-sm text-gray-900 break-all">{selectedFile.filename}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Size</label>
                                <p className="text-sm text-gray-900">{formatFileSize(selectedFile.size)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Type</label>
                                <p className="text-sm text-gray-900">{selectedFile.mimetype}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Status</label>
                                <div className="mt-1">{getStatusBadge(selectedFile.status, selectedFile.result)}</div>
                              </div>
                              {selectedFile.dangerousKeywords && selectedFile.dangerousKeywords.length > 0 && (
                                <div>
                                  <label className="text-sm font-medium text-gray-700">Detected Threats</label>
                                  <div className="mt-1 space-y-1">
                                    {selectedFile.dangerousKeywords.map((keyword, index) => (
                                      <Badge key={index} variant="destructive" className="mr-1 mb-1">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div>
                                <label className="text-sm font-medium text-gray-700">Uploaded</label>
                                <p className="text-sm text-gray-900">{formatDate(selectedFile.uploadedAt)}</p>
                              </div>
                              {selectedFile.scannedAt && (
                                <div>
                                  <label className="text-sm font-medium text-gray-700">Scanned</label>
                                  <p className="text-sm text-gray-900">{formatDate(selectedFile.scannedAt)}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
