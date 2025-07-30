import fs from "fs/promises"
import File from "../models/File.js"
import path from "path";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";
import { PdfReader } from "pdfreader";

// Socket.IO instance
let io = null

export function setSocketIO(socketIO) {
  io = socketIO
  console.log("🔌 Socket.IO attached to scanner service")
}

// Dangerous keywords: rm -rf, eval, bitcoin
const DANGEROUS_KEYWORDS = [
  // Original keywords
  "rm -rf",
  "eval",
  "bitcoin",

  // Additional malware indicators
  "malware",
  "virus",
  "trojan",
  "ransomware",
  "keylogger",
  "backdoor",
  "exploit",
  "payload",
  "shell",
  "cmd.exe",
  "powershell",
  "wget",
  "curl",
  "base64",
  "decode",

  // Cryptocurrency related
  "cryptocurrency",
  "mining",
  "wallet address",
  "private key",

  // Suspicious commands
  "format c:",
  "del /f /s /q",
  "shutdown -s",
  "net user",
  "reg add",
  "taskkill",

  // Phishing indicators
  "click here now",
  "urgent action required",
  "verify your account",
  "suspended account",
  "confirm identity",
]


function extractTextWithPdfReader(filePath) {
  return new Promise((resolve, reject) => {
    let text = "";
    new PdfReader().parseFileItems(filePath, (err, item) => {
      if (err) reject(err);
      else if (!item) resolve(text); // End of file
      else if (item.text) text += item.text + " "; // Append found text
    });
  });
}

export async function extractTextFromDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value; // Plain text
}

// IMAGE (PNG/JPEG)
export async function extractTextFromImage(filePath) {
  const { data: { text } } = await Tesseract.recognize(filePath, "eng");
  return text;
}

// Malware Scanning Worker
export async function scanFile(fileId) {
  try {
    console.log(`🔍 Starting malware scan for file ID: ${fileId}`);

    const file = await File.findByIdAndUpdate(
      fileId,
      { status: "scanning" },
      { new: true }
    );
    if (!file) throw new Error("File not found");

    if (io) {
      io.emit("fileStatusUpdate", {
        fileId: file._id,
        status: "scanning",
        filename: file.originalName,
      });
    }

    const scanTime = Math.random() * 3000 + 2000;
    await new Promise((resolve) => setTimeout(resolve, scanTime));

    // --- Text Extraction ---
    let fileContent = "";
    const ext = path.extname(file.originalName).toLowerCase();
    try {
      if (ext === ".pdf") {
        fileContent = await extractTextWithPdfReader(file.path);
      } else if (ext === ".docx") {
        fileContent = await extractTextFromDocx(file.path);
      } else if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
        fileContent = await extractTextFromImage(file.path);
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }
      fileContent = fileContent.toLowerCase();
      console.log(`📄 Extracted ${fileContent.length} characters from ${ext} file.`);
      console.log("Preview:", fileContent.slice(0, 300));
    } catch (error) {
      console.error("Failed to extract text:", error);
      throw error;
    }

    // --- Keyword Scan ---
    const foundKeywords = [];
    let isInfected = false;
    for (const keyword of DANGEROUS_KEYWORDS) {
      if (fileContent.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
        isInfected = true;
        console.log(`🚨 Dangerous keyword found: "${keyword}"`);
      }
    }
    const result = isInfected ? "infected" : "clean";

    // --- MongoDB update ---
    const updatedFile = await File.findByIdAndUpdate(
      fileId,
      {
        status: "scanned",
        result,
        scannedAt: new Date().toISOString(),
        dangerousKeywords: foundKeywords,
      },
      { new: true }
    );
    if (io) {
      io.emit("fileStatusUpdate", {
        fileId: updatedFile._id,
        status: "scanned",
        result,
        filename: updatedFile.originalName,
        scannedAt: updatedFile.scannedAt,
      });
    }
    return { result, foundKeywords };
  } catch (error) {
    console.error(`❌ Scan failed for file ID ${fileId}:`, error);
    await File.findByIdAndUpdate(fileId, {
      status: "scanned",
      result: "clean",
      scannedAt: new Date().toISOString(),
    });
    throw error;
  }
}
