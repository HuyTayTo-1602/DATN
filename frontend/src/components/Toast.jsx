import { createContext, useCallback, useContext, useState } from 'react'
import Icon from './Icon'

const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((type, message) => {
    const id = Date.now() + Math.random()
    setToasts((ts) => [...ts, { id, type, message }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4000)
  }, [])

  const toast = {
    show,
    success: (msg) => show('success', msg),
    error: (msg) => show('error', msg),
    info: (msg) => show('info', msg),
    warning: (msg) => show('warning', msg),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastStack toasts={toasts} />
    </ToastContext.Provider>
  )
}

const ToastStack = ({ toasts }) => (
  <div className="toast-stack">
    {toasts.map((t) => (
      <div key={t.id} className={`toast ${t.type}`}>
        <div className="toast-icon">
          <Icon name={t.type === 'success' ? 'check' : t.type === 'error' ? 'x' : t.type === 'warning' ? 'warning' : 'info'} size={14} />
        </div>
        <div>{t.message}</div>
      </div>
    ))}
  </div>
)
