const Icon = ({ name, size = 18, ...rest }) => {
  const s = size
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', ...rest }
  switch (name) {
    case 'search':       return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    case 'map-pin':      return <svg {...common}><path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 1 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
    case 'money':        return <svg {...common}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v.01M18 14v.01"/></svg>
    case 'calendar':     return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
    case 'bell':         return <svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
    case 'chevron-down': return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>
    case 'chevron-right':return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>
    case 'chevron-left': return <svg {...common}><path d="m15 18-6-6 6-6"/></svg>
    case 'briefcase':    return <svg {...common}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
    case 'building':     return <svg {...common}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/></svg>
    case 'users':        return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    case 'user':         return <svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    case 'file':         return <svg {...common}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>
    case 'plus':         return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>
    case 'pencil':       return <svg {...common}><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>
    case 'trash':        return <svg {...common}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
    case 'eye':          return <svg {...common}><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8"/><circle cx="12" cy="12" r="3"/></svg>
    case 'eye-off':      return <svg {...common}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.7 5.12A10.94 10.94 0 0 1 12 5c5 0 9 4 10 7-.4 1-1.1 2.1-2 3.2M6.6 6.6C3.6 8.4 2 12 2 12s4 8 10 8a10.5 10.5 0 0 0 4.8-1.1M2 2l20 20"/></svg>
    case 'logout':       return <svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
    case 'settings':     return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1"/></svg>
    case 'check':        return <svg {...common}><path d="M5 12l5 5L20 7"/></svg>
    case 'x':            return <svg {...common}><path d="M18 6 6 18M6 6l12 12"/></svg>
    case 'globe':        return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/></svg>
    case 'phone':        return <svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.35 1.84.59 2.8.72a2 2 0 0 1 1.73 2.04z"/></svg>
    case 'send':         return <svg {...common}><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>
    case 'sparkles':     return <svg {...common}><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/><path d="M19 16l.6 1.8L21.4 18.4l-1.8.6L19 21l-.6-1.8-1.8-.6L18.4 18z"/></svg>
    case 'message':      return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    case 'upload':       return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
    case 'menu':         return <svg {...common}><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    case 'star':         return <svg {...common}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
    case 'heart':        return <svg {...common}><path d="M20.84 4.6a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.07a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.79 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    case 'arrow-right':  return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7"/></svg>
    case 'arrow-left':   return <svg {...common}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
    case 'arrow-up':     return <svg {...common}><path d="M12 19V5M5 12l7-7 7 7"/></svg>
    case 'arrow-down':   return <svg {...common}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
    case 'dashboard':    return <svg {...common}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
    case 'document':     return <svg {...common}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/></svg>
    case 'inbox':        return <svg {...common}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
    case 'filter':       return <svg {...common}><path d="M22 3H2l8 9.46V19l4 2v-8.54z"/></svg>
    case 'warning':      return <svg {...common}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0M12 9v4M12 17h.01"/></svg>
    case 'info':         return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
    case 'cv':           return <svg {...common}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><circle cx="10" cy="13" r="1.5"/><path d="M7.5 18a2.5 2.5 0 0 1 5 0M14.5 13h3M14.5 16h2"/></svg>
    case 'clock':        return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
    case 'zoom-in':      return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M11 8v6M8 11h6"/></svg>
    case 'zoom-out':     return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11h6"/></svg>
    case 'download':     return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
    case 'maximize':     return <svg {...common}><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
    default: return null
  }
}

export default Icon
