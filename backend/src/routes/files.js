import express from "express"
import File from "../models/File.js"
import { upload } from "../middleware/upload.js"
import { scanQueue } from "../services/queue.js"

const router = express.Router()

// POST /upload – File Upload API with flexible field name handling
router.post("/upload", upload.flexible(), async (req, res) => {
  try {
    console.log("📤 Processing upload request...")
    console.log("Files received:", req.files?.length || 0)
    console.log("Single file:", req.file ? req.file.originalname : "none")

    // Check if we have any files
    if (!req.file && (!req.files || req.files.length === 0)) {
      console.log("❌ No files found in request")
      return res.status(400).json({ error: "No file uploaded" })
    }

    // Use req.file if available, otherwise use first file from req.files
    const file = req.file || req.files[0]

    if (!file) {
      console.log("❌ No file object found")
      return res.status(400).json({ error: "No file uploaded" })
    }

    console.log("📁 Processing file:", {
      originalname: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
    })

    // Save file metadata to MongoDB
    const fileDoc = new File({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      status: "pending",
    })

    await fileDoc.save()
    console.log("💾 File metadata saved to database")

    // Enqueue a background job to scan the file
    scanQueue.enqueue({
      id: `scan-${Date.now()}`,
      fileId: String(fileDoc._id),
      filename: fileDoc.originalName,
      path: fileDoc.path,
      createdAt: new Date(),
    })

    res.status(201).json({
      message: "File uploaded successfully. Scan in progress...",
      file: {
        id: String(fileDoc._id),
        filename: fileDoc.originalName,
        size: fileDoc.size,
        status: fileDoc.status,
        uploadedAt: fileDoc.uploadedAt,
      },
    })
  } catch (error) {
    console.error("❌ Upload processing error:", error)

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 5MB." })
    }

    res.status(500).json({
      error: error.message || "File upload failed",
    })
  }
})

// Alternative upload endpoint that tries multiple approaches
router.post("/upload-alt", (req, res) => {
  console.log("📤 Alternative upload endpoint")

  // Try with 'file' field name first
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.log("❌ Failed with 'file' field, trying 'any'...")

      // If that fails, try with any field name
      upload.any()(req, res, (err2) => {
        if (err2) {
          console.error("❌ Both upload methods failed:", err2.message)
          return res.status(400).json({ error: err2.message })
        }

        // Process the uploaded file(s)
        if (req.files && req.files.length > 0) {
          req.file = req.files[0]
        }

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" })
        }

        res.json({
          message: "File uploaded successfully",
          file: {
            originalname: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
          },
        })
      })
    } else {
      // Success with 'file' field name
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" })
      }

      res.json({
        message: "File uploaded successfully",
        file: {
          originalname: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      })
    }
  })
})

// GET /files – Fetch Scanned Files
router.get("/files", async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query

    const filter = {}

    if (status && status !== "all") {
      if (status === "pending") {
        filter.status = "pending"
      } else if (status === "scanning") {
        filter.status = "scanning"
      } else if (status === "scanned") {
        filter.status = "scanned"
      } else if (status === "clean") {
        filter.status = "scanned"
        filter.result = "clean"
      } else if (status === "infected") {
        filter.status = "scanned"
        filter.result = "infected"
      }
    }

    const files = await File.find(filter)
      .sort({ uploadedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .select("-path")

    const total = await File.countDocuments(filter)

    res.json({
      files: files.map((file) => ({
        id: String(file._id),
        filename: file.originalName,
        size: file.size,
        mimetype: file.mimetype,
        status: file.status,
        result: file.result,
        uploadedAt: file.uploadedAt,
        scannedAt: file.scannedAt,
        dangerousKeywords: file.dangerousKeywords,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    console.error("Fetch files error:", error)
    res.status(500).json({ error: "Failed to fetch files" })
  }
})

// GET /files/:id - Get Single File Details
router.get("/files/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id).select("-path")

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    res.json({
      id: String(file._id),
      filename: file.originalName,
      size: file.size,
      mimetype: file.mimetype,
      status: file.status,
      result: file.result,
      uploadedAt: file.uploadedAt,
      scannedAt: file.scannedAt,
      dangerousKeywords: file.dangerousKeywords,
    })
  } catch (error) {
    console.error("Fetch file error:", error)
    res.status(500).json({ error: "Failed to fetch file" })
  }
})

// GET /queue/status - Get Queue Status
router.get("/queue/status", (req, res) => {
  const status = scanQueue.getQueueStatus()
  res.json(status)
})

// Test route
router.get("/test", (req, res) => {
  res.json({
    message: "File routes are working!",
    timestamp: new Date().toISOString(),
  })
})

export default router
