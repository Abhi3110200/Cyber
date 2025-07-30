import express from "express"
import dotenv from "dotenv"
import mongoose from "mongoose"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import { createServer } from "http"
import { Server } from "socket.io"

// Routes & Services
import fileRoutes from "./src/routes/files.js"
import { setSocketIO } from "./src/services/scanner.js"

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)
const PORT = process.env.PORT 
const mongoURI = process.env.MONGODB_URI
const FRONTEND_URL = process.env.FRONTEND_URL

// Setup Socket.IO
export const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
})
setSocketIO(io) // attach to scanner service

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!mongoURI) throw new Error("MONGODB_URI is not defined.")
    console.log("🔗 Connecting to MongoDB...")
    await mongoose.connect(mongoURI)
    console.log("✅ MongoDB connected successfully")
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    process.exit(1)
  }
}

// Middlewares
app.use(helmet())
app.use(cors({ origin: FRONTEND_URL, credentials: true }))
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// General rate limiting
// app.use(rateLimit({
//   windowMs: 15 * 60 * 10000,
//   max: 100,
//   message: "Too many requests, try again later.",
// }))

// Upload-specific rate limit
// const uploadLimiter = rateLimit({
//   windowMs: 15 * 60 * 10000,
//   max: 10,
//   message: "Too many uploads, try again later.",
// })

// Routes
app.use("/api", fileRoutes)

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Home route
app.get("/", (req, res) => {
  res.send("🚀 Server is running!")
})

// Handle Socket.IO events
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`)

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`)
  })
})

// Global error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error)
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large" })
  }
  res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
  })
})

// Start server
const startServer = async () => {
  await connectDB()
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📊 Dashboard: ${FRONTEND_URL}`)
    console.log(`🔗 API: http://localhost:${PORT}/api`)
  })
}

startServer()
