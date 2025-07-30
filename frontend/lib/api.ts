import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

export interface FileData {
  id: string
  filename: string
  size: number
  mimetype: string
  status: "pending" | "scanning" | "scanned"
  result: "clean" | "infected" | null
  uploadedAt: string
  scannedAt: string | null
  dangerousKeywords?: string[]
}

export interface UploadResponse {
  message: string
  file: {
    id: string
    filename: string
    size: number
    status: string
    uploadedAt: string
  }
}

export interface FilesResponse {
  files: FileData[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append("file", file)

  const response = await api.post("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return response.data
}

export const getFiles = async (status?: string): Promise<FilesResponse> => {
  const params = new URLSearchParams()
  if (status && status !== "all") params.append("status", status)
  // params.append("page", page.toString())
  // params.append("limit", limit.toString())

  const response = await api.get(`/api/files`);
  console.log(response.data);
  return response.data
}

export const getFile = async (id: string): Promise<FileData> => {
  const response = await api.get(`/api/files/${id}`)
  return response.data
}

export const getQueueStatus = async (): Promise<{ size: number; processing: boolean }> => {
  const response = await api.get("/api/queue/status");
  console.log(response.data);
  return response.data
}
