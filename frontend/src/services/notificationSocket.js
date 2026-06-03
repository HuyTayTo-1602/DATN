/**
 * notificationSocket.js
 * Thin wrapper around native WebSocket for notification realtime.
 * DB is the source of truth — socket is best-effort.
 */

const RECONNECT_DELAY_MS = 5000
const MAX_RECONNECTS = 10

export function createNotificationSocket({ onMessage, onOpen, onClose } = {}) {
  let ws = null
  let reconnectCount = 0
  let stopped = false

  function getToken() {
    return localStorage.getItem('access_token')
  }

  function buildUrl() {
    const token = getToken()
    if (!token) return null
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/api/v1/notifications/ws?token=${token}`
  }

  function connect() {
    if (stopped) return
    const url = buildUrl()
    if (!url) return  // not logged in

    ws = new WebSocket(url)

    ws.onopen = () => {
      reconnectCount = 0
      onOpen?.()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage?.(data)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      onClose?.()
      if (!stopped && reconnectCount < MAX_RECONNECTS) {
        reconnectCount++
        setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    ws.onerror = () => {
      // onclose fires after onerror — reconnect handled there
    }
  }

  function disconnect() {
    stopped = true
    ws?.close()
    ws = null
  }

  connect()
  return { disconnect }
}
