import { PROVINCES, DISTRICTS_BY_PROVINCE } from '../utils/locations'
import SelectDown from './SelectDown'

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
        <SelectDown
          value={province}
          options={PROVINCES}
          placeholder="-- Chọn tỉnh/thành phố --"
          searchable
          onChange={(p) => onChange({ province: p, district: '' })}
        />
      </div>

      <div className="field">
        <label>Quận/Huyện{star}</label>
        <SelectDown
          value={district}
          options={districts}
          disabled={!province}
          placeholder={province ? '-- Chọn quận/huyện --' : '-- Chọn tỉnh trước --'}
          searchable
          onChange={(d) => onChange({ district: d })}
        />
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
