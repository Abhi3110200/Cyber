# Secure File Scanner Backend

A Node.js backend service for secure file upload and malware scanning with custom queue implementation.

## 🚀 Features

### 1. POST /upload – File Upload API
- ✅ Accept file types: `.pdf`, `.docx`, `.jpg`, `.png` (Max 5MB)
- ✅ Store the file in local `uploads/` directory
- ✅ Save metadata in MongoDB with required fields
- ✅ Enqueue a background job to scan the file

### 2. Malware Scanning Worker
- ✅ Dequeue file scanning jobs from custom queue
- ✅ Simulate malware scanning: Wait 2–5 seconds using `setTimeout()`
- ✅ Check for dangerous keywords: `rm -rf`, `eval`, `bitcoin`
- ✅ Mark as infected if keywords found, else mark as clean
- ✅ Update MongoDB with:
  - `status`: "scanned"
  - `result`: "clean" or "infected"  
  - `scannedAt`: ISO timestamp

### 3. GET /files – Fetch Scanned Files
- ✅ Returns list of uploaded files with metadata:
  - Filename
  - Status: `pending`, `scanning`, `scanned`
  - Result: `clean`, `infected`
  - Uploaded/Scanned timestamps

## 🛠️ Tech Stack

- **Backend**: Node.js (JavaScript ES6 modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Queue**: Custom in-memory queue implementation
- **Real-time**: Socket.IO for live updates

## 📁 Project Structure

```
backend/
├── models/
│   └── File.js              # MongoDB schema
├── routes/
│   └── files.js             # API endpoints
├── services/
│   ├── queue.js             # Custom queue implementation
│   └── scanner.js           # Malware scanning worker
├── middleware/
│   └── upload.js            # File upload handling
├── uploads/                 # Uploaded files storage
├── server.js                # Main server
└── package.json
```
## 🚀 Quick Start

1. **Install dependencies**:
```bash
npm install
```

2. **Setup environment**:
```bash
cp .env.example .env
# Edit .env with your MongoDB URI   
```

3. **Start server**:
```bash
npm run dev
```

## 🧪 Testing Malware Detection

Upload files containing these keywords to trigger infection:
- **"rm -rf"** - Dangerous shell command
- **"eval"** - Code execution function  
- **"bitcoin"** - Cryptocurrency-related content

## 📊 MongoDB Schema

```javascript
{
  "filename": "invoice.pdf",
  "originalName": "user-invoice.pdf", 
  "path": "/uploads/invoice.pdf",
  "size": 1024576,
  "mimetype": "application/pdf",
  "status": "scanned",           // pending | scanning | scanned
  "result": "clean",             // clean | infected
  "uploadedAt": "2024-01-15T10:30:00.000Z",
  "scannedAt": "2024-01-15T10:30:05.123Z",  // ISO timestamp
  "dangerousKeywords": ["rm -rf"]
}
```

## 🔧 API Endpoints

- `POST /api/upload` - Upload file for scanning
- `GET /api/files` - Get all files with status/result
- `GET /api/files/:id` - Get specific file details
- `GET /api/queue/status` - Get queue processing status
- `GET /health` - Health check

## ⚡ Queue System

Custom in-memory queue that:
- Enqueues scanning jobs when files are uploaded
- Dequeues jobs for background processing
- Processes one job at a time with proper error handling
- Emits events for job lifecycle management

## 🔒 Security Features

- File type validation (PDF, DOCX, JPG, PNG only)
- File size limits (5MB maximum)
- Rate limiting (100 requests/15min, 10 uploads/15min)
- CORS protection
- Input sanitization
- Secure file storage with unique naming

## 📈 Real-time Updates

WebSocket integration provides live updates for:
- File upload completion
- Scan status changes (pending → scanning → scanned)
- Scan results (clean/infected)
- Queue processing status

The system meets all CyberXplore requirements with clean, production-ready code!
