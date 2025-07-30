import { io, type Socket } from "socket.io-client"

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL

class SocketManager {
  private socket: Socket | null = null

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
      })

      this.socket.on("connect", () => {
        console.log("🔌 Connected to server")
      })

      this.socket.on("disconnect", () => {
        console.log("🔌 Disconnected from server")
      })

      this.socket.on("connect_error", (error) => {
        console.error("🔌 Connection error:", error)
      })
    }

    return this.socket
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }
}

export const socketManager = new SocketManager()
