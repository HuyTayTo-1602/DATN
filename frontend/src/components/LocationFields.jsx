import { PROVINCES, DISTRICTS_BY_PROVINCE } from '../utils/locations'

// ============================================================
// LocationFields – nhóm 3 ô địa chỉ tách cột dùng chung:
//   Tỉnh/Thành phố (select) · Quận/Huyện (select) · Địa chỉ chi tiết (input)
// Gọi onChange với object patch, ví dụ { province, district: '' }.
// Khi đổi tỉnh sẽ tự reset quận/huyện cho đồng bộ.
// ============================================================
const LocationFields = ({
  province = '',
  district = '',
  addressDetail = '',
  onChange,
  required = false,
  showDetail = true,
  detailFull = true,
}) => {
  const districts = DISTRICTS_BY_PROVINCE[province] || []
  const star = required ? ' *' : ''

  return (
    <>
      <div className="field">
        <label>Tỉnh/Thành phố{star}</label>
        <select
          className="select"
          value={province}
          onChange={(e) => onChange({ province: e.target.value, district: '' })}
        >
          <option value="">-- Chọn tỉnh/thành phố --</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="field">
        <label>Quận/Huyện{star}</label>
        <select
          className="select"
          value={district}
          disabled={!province}
          onChange={(e) => onChange({ district: e.target.value })}
        >
          <option value="">{province ? '-- Chọn quận/huyện --' : '-- Chọn tỉnh trước --'}</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {showDetail && (
        <div className={detailFull ? 'field full' : 'field'}>
          <label>Địa chỉ chi tiết</label>
          <input
            className="input"
            placeholder="Số nhà, tên đường..."
            value={addressDetail}
            onChange={(e) => onChange({ address_detail: e.target.value })}
          />
        </div>
      )}
    </>
  )
}

export default LocationFields
