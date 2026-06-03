# Package services: chứa toàn bộ business logic của ứng dụng.
# Tách logic ra khỏi router giúp:
#   - Router chỉ lo nhận request và trả response (giao tiếp HTTP)
#   - Service lo xử lý nghiệp vụ (validate, tính toán, truy vấn DB)
#   - Dễ viết unit test cho business logic mà không cần HTTP context
