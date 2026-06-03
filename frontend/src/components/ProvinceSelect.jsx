import { useState } from 'react'

export const VN_PROVINCES = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
  'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
  'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
  'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
  'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
  'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
  'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
  'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
  'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
  'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang',
  'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái',
  'Khác',
]

const KNOWN = VN_PROVINCES.filter((p) => p !== 'Khác')

/**
 * Dropdown 63 tỉnh thành VN + "Khác".
 * Khi chọn "Khác" → hiện ô text bắt buộc nhập.
 *
 * Props:
 *   value       – giá trị hiện tại (string)
 *   onChange    – callback(newValue: string)
 *   placeholder – text gợi ý cho <select>
 *   required    – có bắt buộc chọn không (default false)
 */
export default function ProvinceSelect({
  value,
  onChange,
  placeholder = '-- Chọn tỉnh/thành phố --',
  required = false,
}) {
  const [showOther, setShowOther] = useState(
    () => value !== '' && !KNOWN.includes(value),
  )

  const selectDisplayVal = showOther
    ? 'Khác'
    : KNOWN.includes(value) ? value : ''

  const handleDropdownChange = (e) => {
    if (e.target.value === 'Khác') {
      setShowOther(true)
      onChange('')
    } else {
      setShowOther(false)
      onChange(e.target.value)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select
        className="input"
        value={selectDisplayVal}
        onChange={handleDropdownChange}
        required={required && !showOther}
      >
        <option value="">{placeholder}</option>
        {VN_PROVINCES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {showOther && (
        <input
          className="input"
          placeholder="Nhập địa điểm cụ thể... (bắt buộc)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoFocus
          style={{ borderColor: value.trim() ? 'var(--border)' : 'var(--danger)' }}
        />
      )}
    </div>
  )
}
