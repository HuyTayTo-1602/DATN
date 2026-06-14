// ============================================================
// utils/locations.js
// Dữ liệu tỉnh/thành → quận/huyện dùng cho các dropdown địa chỉ.
// Đồng bộ với backend/scripts/seed/data/locations_vn.json để việc
// lọc/tìm kiếm theo địa điểm khớp với dữ liệu đã seed.
// ============================================================

export const DISTRICTS_BY_PROVINCE = {
  'Hà Nội': ['Thanh Xuân', 'Cầu Giấy', 'Hai Bà Trưng', 'Đống Đa', 'Ba Đình', 'Hoàn Kiếm', 'Hà Đông', 'Nam Từ Liêm'],
  'TP. Hồ Chí Minh': ['Quận 1', 'Quận 3', 'Quận 7', 'Bình Thạnh', 'Phú Nhuận', 'Tân Bình', 'Thủ Đức'],
  'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ'],
  'Hải Phòng': ['Hồng Bàng', 'Ngô Quyền', 'Lê Chân', 'Hải An', 'Kiến An'],
  'Cần Thơ': ['Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn'],
  'Bình Dương': ['Thủ Dầu Một', 'Dĩ An', 'Thuận An', 'Bến Cát'],
  'Đồng Nai': ['Biên Hòa', 'Long Khánh', 'Trảng Bom', 'Nhơn Trạch'],
  'Bắc Ninh': ['Bắc Ninh', 'Từ Sơn', 'Tiên Du', 'Yên Phong'],
  'Khánh Hòa': ['Nha Trang', 'Cam Ranh', 'Ninh Hòa', 'Diên Khánh'],
  'Thừa Thiên Huế': ['Huế', 'Hương Thủy', 'Hương Trà', 'Phú Vang'],
}

export const PROVINCES = Object.keys(DISTRICTS_BY_PROVINCE)

export const WORK_MODES = [
  { value: 'onsite', label: 'Tại văn phòng' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
]
