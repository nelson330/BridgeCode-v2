import type { ServerWebSocket } from 'bun'
import { logger } from '../../core/logger'
import { RoomManager } from './room'

export interface WsSocketData {
  pin?: string
  participantId?: string
  sessionId?: string
  isHost?: boolean
}

export function handleWsMessage(ws: ServerWebSocket<WsSocketData>, rawMessage: string | Buffer) {
  try {
    const text = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString('utf8')
    const message = JSON.parse(text)

    switch (message.type) {
      case 'HOST_JOIN': {
        const room = message.pin
          ? RoomManager.getRoomByPin(message.pin)
          : message.sessionId
            ? RoomManager.getRoomById(message.sessionId)
            : undefined

        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Sala no encontrada' }))
          return
        }

        const clientSocket = {
          send: (data: string) => ws.send(data),
          close: () => ws.close(),
        }

        room.addHostSocket(clientSocket)
        ws.data = {
          pin: room.pin,
          sessionId: room.sessionId,
          isHost: true,
        }
        break
      }

      case 'JOIN': {
        const room = RoomManager.getRoomByPin(message.pin)
        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Código PIN no válido o sala cerrada' }))
          return
        }

        const clientSocket = {
          send: (data: string) => ws.send(data),
          close: () => ws.close(),
        }

        const participantId = room.addParticipant(clientSocket, message.displayName, message.userId)
        ws.data = {
          pin: message.pin,
          participantId,
          sessionId: room.sessionId,
          isHost: false,
        }
        break
      }

      case 'SUBMIT_ANSWER': {
        if (!ws.data.pin || !ws.data.participantId) return
        const room = RoomManager.getRoomByPin(ws.data.pin)
        if (room) {
          room.submitAnswer(ws.data.participantId, message.answerJson, message.latencyMs || 0)
        }
        break
      }

      case 'SPIN_ROULETTE': {
        if (!ws.data.pin) return
        const room = RoomManager.getRoomByPin(ws.data.pin)
        if (room) {
          room.spinRoulette()
        }
        break
      }

      case 'FOCUS_CHANGE': {
        if (!ws.data.pin || !ws.data.participantId) return
        const room = RoomManager.getRoomByPin(ws.data.pin)
        if (room) {
          room.recordFocusEvent(ws.data.participantId, message.hasFocus === true)
        }
        break
      }

      default:
        break
    }
  } catch (err: any) {
    logger.warn({ err }, 'Error handling WebSocket message')
  }
}

export function handleWsClose(ws: ServerWebSocket<WsSocketData>) {
  const clientSocket = {
    send: (data: string) => ws.send(data),
    close: () => ws.close(),
  }

  if (ws.data.pin) {
    const room = RoomManager.getRoomByPin(ws.data.pin)
    if (room) {
      if (ws.data.isHost) {
        room.removeHostSocket(clientSocket)
      } else if (ws.data.participantId) {
        room.removeParticipant(ws.data.participantId)
      }
    }
  }
}
