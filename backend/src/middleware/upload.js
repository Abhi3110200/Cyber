import multer from "multer"
import path from "path"
import fs from "fs"

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log(`✅ Created uploads directory: ${uploadsDir}`)
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const originalName = path.parse(file.originalname).name; // Without extension
    const extension = path.extname(file.originalname);       // Includes .pdf or .docx etc.

    const safeName = originalName.replace(/\s+/g, "_").replace(/[^\w\-]/g, ""); // Clean filename
    const timestamp = Date.now();

    const newFileName = `${safeName}-${timestamp}${extension}`; // Final format
    cb(null, newFileName);
  }
})

// File filter - Accept: .pdf, .docx, .jpg, .png (Max 5MB)
const fileFilter = (req, file, cb) => {
  console.log("📁 File filter - Received file:", {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
  })

  const allowedTypes = [".pdf", ".docx", ".jpg", ".jpeg", ".png"]
  const fileExtension = path.extname(file.originalname).toLowerCase()

  if (allowedTypes.includes(fileExtension)) {
    cb(null, true)
  } else {
    cb(new Error(`File type ${fileExtension} not allowed. Allowed: ${allowedTypes.join(", ")}`))
  }
}

// Create multer instance with more flexible configuration
const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only allow 1 file
  },
})

// Export a custom middleware that handles any field name
export const upload = {
  single: (fieldName = "file") => multerUpload.single(fieldName),
  any: () => multerUpload.any(),
  fields: (fields) => multerUpload.fields(fields),

  // Custom middleware that accepts any field name
  flexible: () => {
    return (req, res, next) => {
      console.log("🔧 Using flexible upload middleware")

      // Try different approaches
      const uploadAny = multerUpload.any()

      uploadAny(req, res, (err) => {
        if (err) {
          console.error("❌ Multer flexible error:", err.message)
          return next(err)
        }

        console.log("✅ Files received:", req.files?.length || 0)

        // If we have files, set the first one as req.file for compatibility
        if (req.files && req.files.length > 0) {
          req.file = req.files[0]
          console.log("📁 Set req.file:", req.file.originalname)
        }

        next()
      })
    }
  },
}
