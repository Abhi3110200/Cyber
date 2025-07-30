import mongoose from "mongoose"

const FileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  mimetype: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "scanning", "scanned"],
    default: "pending",
  },
  result: {
    type: String,
    enum: ["clean", "infected"],
    default: null,
  },
  uploadedAt: { type: Date, default: Date.now },
  scannedAt: { type: String, default: null },
  dangerousKeywords: [{ type: String }],
})

export default mongoose.model("File", FileSchema)
