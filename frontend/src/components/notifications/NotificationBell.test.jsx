import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotificationBell from './NotificationBell'

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../services/api', () => ({
  notificationsApi: {
    unreadCount: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

vi.mock('../../services/notificationSocket', () => ({
  createNotificationSocket: vi.fn(() => ({ disconnect: vi.fn() })),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { notificationsApi } from '../../services/api'
import { createNotificationSocket } from '../../services/notificationSocket'
import { useAuth } from '../../context/AuthContext'

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  notificationsApi.unreadCount.mockResolvedValue({ count: 0 })
  notificationsApi.list.mockResolvedValue([])
  useAuth.mockReturnValue({ user: { id: 1, email: 'test@test.com', role: 'job_seeker' } })
})

// ── Render ───────────────────────────────────────────────────

describe('NotificationBell – render', () => {
  it('hiển thị icon chuông khi đã đăng nhập', async () => {
    renderBell()
    expect(screen.getByRole('button', { name: /thông báo/i })).toBeInTheDocument()
  })

  it('không hiển thị khi chưa đăng nhập', () => {
    useAuth.mockReturnValue({ user: null })
    renderBell()
    expect(screen.queryByRole('button', { name: /thông báo/i })).not.toBeInTheDocument()
  })
})

// ── Badge ────────────────────────────────────────────────────

describe('NotificationBell – badge unread count', () => {
  it('không hiển thị badge khi count = 0', async () => {
    notificationsApi.unreadCount.mockResolvedValue({ count: 0 })
    renderBell()
    await waitFor(() => expect(notificationsApi.unreadCount).toHaveBeenCalledOnce())
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('hiển thị badge với số đúng khi có unread', async () => {
    notificationsApi.unreadCount.mockResolvedValue({ count: 5 })
    renderBell()
    expect(await screen.findByText('5')).toBeInTheDocument()
  })

  it('hiển thị 99+ khi count vượt 99', async () => {
    notificationsApi.unreadCount.mockResolvedValue({ count: 120 })
    renderBell()
    expect(await screen.findByText('99+')).toBeInTheDocument()
  })
})

// ── Dropdown ─────────────────────────────────────────────────

describe('NotificationBell – dropdown', () => {
  it('mở dropdown khi click chuông', async () => {
    renderBell()
    const btn = screen.getByRole('button', { name: /thông báo/i })
    fireEvent.click(btn)
    expect(await screen.findByText('Thông báo')).toBeInTheDocument()
  })

  it('đóng dropdown khi click lần hai', async () => {
    renderBell()
    const btn = screen.getByRole('button', { name: /thông báo/i })
    fireEvent.click(btn)
    await screen.findByText('Thông báo')
    fireEvent.click(btn)
    await waitFor(() => expect(screen.queryByText('Thông báo')).not.toBeInTheDocument())
  })
})

// ── WebSocket ─────────────────────────────────────────────────

describe('NotificationBell – WebSocket', () => {
  it('khởi tạo socket khi mount', async () => {
    renderBell()
    await waitFor(() => expect(createNotificationSocket).toHaveBeenCalledOnce())
  })

  it('gọi disconnect khi unmount', async () => {
    const disconnect = vi.fn()
    createNotificationSocket.mockReturnValue({ disconnect })
    const { unmount } = renderBell()
    await waitFor(() => expect(createNotificationSocket).toHaveBeenCalled())
    unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('tăng unread count khi nhận message từ socket', async () => {
    notificationsApi.unreadCount.mockResolvedValue({ count: 2 })
    let capturedOnMessage

    createNotificationSocket.mockImplementation(({ onMessage }) => {
      capturedOnMessage = onMessage
      return { disconnect: vi.fn() }
    })

    renderBell()
    expect(await screen.findByText('2')).toBeInTheDocument()

    // Simulate incoming WebSocket notification
    capturedOnMessage({ id: 99, title: 'Mới', type: 'application_submitted' })

    expect(await screen.findByText('3')).toBeInTheDocument()
  })
})
