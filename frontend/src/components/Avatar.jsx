import { useState } from 'react'
import { initials, colorFromString } from '../utils/format'

export const Avatar = ({ name = '', size = 'md', src }) => {
  const [failed, setFailed] = useState(false)
  const cls = size === 'lg' ? 'avatar avatar-lg' : size === 'xl' ? 'avatar avatar-xl' : size === 'sm' ? 'avatar avatar-sm' : 'avatar'
  if (src && !failed) {
    return (
      <div className={cls} style={{ overflow: 'hidden', padding: 0 }}>
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }
  return (
    <div className={cls} style={{ background: colorFromString(name || '?') }}>
      {initials(name)}
    </div>
  )
}

export const CompanyLogo = ({ company, size = 48 }) => {
  const [failed, setFailed] = useState(false)
  const name = company?.name || '?'
  if (company?.logo_url && !failed) {
    return (
      <div className="company-logo" style={{ width: size, height: size, overflow: 'hidden' }}>
        <img
          src={company.logo_url}
          alt={name}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }
  return (
    <div className="company-logo" style={{ width: size, height: size, background: colorFromString(name), fontSize: size * 0.4 }}>
      {initials(name)}
    </div>
  )
}
