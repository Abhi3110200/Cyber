import { EventEmitter } from "events"

// Custom Queue - Dequeue file scanning jobs
class SimpleQueue extends EventEmitter {
  constructor() {
    super()
    this.jobs = []
    this.processing = false
  }

  // Enqueue file scanning jobs
  enqueue(job) {
    this.jobs.push(job)
    console.log(`📋 Job enqueued: ${job.filename} (Queue size: ${this.jobs.length})`)

    if (!this.processing) {
      this.processNext()
    }
  }

  // Dequeue file scanning jobs from custom queue
  async processNext() {
    if (this.jobs.length === 0) {
      this.processing = false
      return
    }

    this.processing = true
    const job = this.jobs.shift() // Dequeue

    console.log(`🔄 Processing job: ${job.filename}`)
    this.emit("jobStarted", job)

    try {
      await this.processJob(job)
      this.emit("jobCompleted", job)
    } catch (error) {
      console.error(`❌ Job failed: ${job.filename}`, error)
      this.emit("jobFailed", job, error)
    }

    // Process next job
    setTimeout(() => this.processNext(), 100)
  }

  async processJob(job) {
    const { scanFile } = await import("./scanner.js")
    await scanFile(job.fileId)
  }

  getQueueSize() {
    return this.jobs.length
  }

  getQueueStatus() {
    return {
      size: this.jobs.length,
      processing: this.processing,
    }
  }
}

export const scanQueue = new SimpleQueue()
