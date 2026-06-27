# Kết nối tên miền `careerbridge.pro` với VM GCP

Hướng dẫn này trỏ tên miền `careerbridge.pro` về VM Google Cloud đang chạy web
tuyển dụng ĐATN (JobCV).

Thay `YOUR_VM_EXTERNAL_IP` bên dưới bằng IP external thật của VM (lấy trong
**Compute Engine > VM instances**).

Dùng hướng dẫn này sau khi ứng dụng đã chạy trên VM theo
[deploy-google-compute-engine.md](deploy-google-compute-engine.md).

## 1. Đặt một static IP

Trong Google Cloud Console:

1. Mở **Compute Engine > VM instances**.
2. Tìm VM đang chạy ứng dụng (`jobcv-vm`).
3. Ghi lại **External IP** của nó.

Tên miền nên trỏ về một static IP external. Nếu IP đang là ephemeral, hãy đặt nó
thành cố định trước:

1. Mở **VPC network > IP addresses**.
2. Tìm IP external của VM.
3. Nếu kiểu của nó là **Ephemeral**, chọn **Reserve static address**.
4. Đặt tên, ví dụ:

```text
jobcv-static-ip
```

5. Lưu reservation.

## 2. Mở các cổng firewall trên GCP

DNS chỉ điều hướng người dùng tới VM. VM còn cần các firewall rule cho phép lưu
lượng web đi vào.

Với một tên miền production, hãy mở:

```text
tcp:80
tcp:443
```

Trong Google Cloud Console:

1. Mở **VPC network > Firewall**.
2. Nhấn **Create firewall rule**.
3. Tạo rule cho HTTP:

```text
Name: allow-jobcv-http
Network: default
Direction of traffic: Ingress
Action on match: Allow
Targets: All instances in the network
Source IPv4 ranges: 0.0.0.0/0
Protocols and ports: tcp:80
```

4. Tạo rule thứ hai cho HTTPS:

```text
Name: allow-jobcv-https
Network: default
Direction of traffic: Ingress
Action on match: Allow
Targets: All instances in the network
Source IPv4 ranges: 0.0.0.0/0
Protocols and ports: tcp:443
```

Giữ các cổng database và dịch vụ nội bộ đóng với internet công khai:

```text
5432
9000
9001
```

Khi đã có Nginx và HTTPS, bạn cũng có thể xóa các rule công khai tạm thời
`tcp:5173` và `tcp:9000` từ giai đoạn triển khai bằng IP, vì toàn bộ lưu lượng
(bao gồm cả tải CV) sẽ đi qua cổng `80`/`443`.

## 3. Thêm bản ghi DNS tại nhà cung cấp tên miền

Chỉnh DNS tại nơi quản lý nameserver của `careerbridge.pro` (ví dụ hPanel của
Hostinger, hoặc trang quản lý DNS của nhà đăng ký tên miền).

1. Đăng nhập vào nhà cung cấp tên miền.
2. Mở trang quản lý DNS của `careerbridge.pro`.
3. Thêm hoặc cập nhật các bản ghi sau (thay IP bằng static IP của VM):

```text
Type: A
Name: @
Points to: YOUR_VM_EXTERNAL_IP
TTL: default
```

```text
Type: CNAME
Name: www
Points to: careerbridge.pro
TTL: default
```

Nếu nhà cung cấp không cho dùng CNAME cho `www`, hãy dùng bản ghi A thay thế:

```text
Type: A
Name: www
Points to: YOUR_VM_EXTERNAL_IP
TTL: default
```

Xóa hoặc thay các bản ghi cũ đang trỏ `@` hoặc `www` về một IP khác. Nếu có bản
ghi `AAAA` cho `@` hoặc `www` mà VM chưa cấu hình IPv6, hãy xóa các bản ghi
`AAAA` đó để trình duyệt không thử một đường IPv6 không hợp lệ.

## 4. Chờ DNS lan truyền (propagation)

Thay đổi DNS không có hiệu lực ngay. Thường chỉ vài phút, nhưng cũng có thể mất
vài giờ.

Kiểm tra từ máy của bạn:

```powershell
Resolve-DnsName careerbridge.pro
Resolve-DnsName www.careerbridge.pro
```

Kết quả mong đợi:

```text
YOUR_VM_EXTERNAL_IP
```

Trên Linux hoặc macOS:

```bash
dig +short careerbridge.pro
dig +short www.careerbridge.pro
```

## 5. Test nhanh với cổng hiện có của ứng dụng

Cấu hình Docker Compose hiện tại mở frontend ở cổng `5173`.

Sau khi DNS phân giải xong, URL này sẽ hoạt động nếu ứng dụng đang chạy và rule
`tcp:5173` vẫn còn:

```text
http://careerbridge.pro:5173
```

Cách này hữu ích để test, nhưng chưa phải URL production cuối cùng vì người dùng
không nên phải gõ `:5173`.

## 6. Thêm Nginx cho URL tên miền gọn gàng

Dùng Nginx trên VM để proxy lưu lượng web thông thường:

- `http://careerbridge.pro` -> container frontend ở `localhost:5173`
- `/api/...` -> container backend ở `localhost:8000`
- `/cv-files/...` -> container MinIO ở `localhost:9000` (để file CV tải qua tên
  miền thay vì IP và cổng thô)

SSH vào VM, sau đó cài Nginx:

```bash
sudo apt update
sudo apt install -y nginx
```

Tạo file cấu hình site:

```bash
sudo nano /etc/nginx/sites-available/careerbridge.pro
```

Dán nội dung:

```nginx
server {
    listen 80;
    server_name careerbridge.pro www.careerbridge.pro;

    # Backend API (FastAPI phục vụ mọi thứ dưới /api/v1)
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File CV lưu trong MinIO (bucket: cv-files)
    location /cv-files/ {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20m;
    }

    # Frontend (Vite dev server, cần WebSocket cho hot reload)
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Kích hoạt site:

```bash
sudo ln -s /etc/nginx/sites-available/careerbridge.pro /etc/nginx/sites-enabled/careerbridge.pro
sudo nginx -t
sudo systemctl reload nginx
```

Bây giờ test:

```text
http://careerbridge.pro
```

## 7. Cập nhật cấu hình ứng dụng cho tên miền

Cấu hình của dự án này nằm trong các khối `environment:` của `docker-compose.yml`
ở thư mục gốc repository. Chỉnh nó trên VM:

```bash
cd ~/DATN
nano docker-compose.yml
```

Trong service `backend`, cho phép các origin của tên miền và trỏ public endpoint
của MinIO về tên miền để link CV hoạt động qua `http` (trước khi có SSL):

```yaml
      ALLOWED_ORIGINS: '["http://careerbridge.pro","http://www.careerbridge.pro"]'
      MINIO_PUBLIC_ENDPOINT: careerbridge.pro
      MINIO_SECURE: "false"
```

Vite dev server của frontend từ chối các hostname lạ. Cho phép tên miền trong
`frontend/vite.config.js`:

```js
server: {
  host: '0.0.0.0',
  port: 5173,
  allowedHosts: ['careerbridge.pro', 'www.careerbridge.pro'],
  proxy: {
    '/api': {
      target: process.env.BACKEND_URL || 'http://localhost:8000',
      changeOrigin: true,
      ws: true,
    },
  },
}
```

Build lại và khởi động lại:

```bash
docker compose up -d --build
```

## 8. Bật HTTPS với Let's Encrypt

Sau khi `http://careerbridge.pro` chạy được, cài Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Yêu cầu cấp chứng chỉ:

```bash
sudo certbot --nginx -d careerbridge.pro -d www.careerbridge.pro
```

Certbot sẽ tự cập nhật cấu hình Nginx cho HTTPS và thiết lập tự động gia hạn.

Sau đó cập nhật `docker-compose.yml` lại để origin và link CV dùng `https`:

```yaml
      ALLOWED_ORIGINS: '["https://careerbridge.pro","https://www.careerbridge.pro"]'
      MINIO_PUBLIC_ENDPOINT: careerbridge.pro
      MINIO_SECURE: "true"
```

`MINIO_SECURE: "true"` khiến ứng dụng sinh ra link dạng
`https://careerbridge.pro/cv-files/...` để file CV không gây cảnh báo
mixed-content trên trang HTTPS.

Build lại và khởi động lại:

```bash
docker compose up -d --build
```

URL cuối cùng:

```text
https://careerbridge.pro
https://www.careerbridge.pro
```

## 9. Checklist kiểm tra

Chạy các lệnh sau từ máy của bạn:

```powershell
Resolve-DnsName careerbridge.pro
Resolve-DnsName www.careerbridge.pro
curl.exe -I http://careerbridge.pro
curl.exe -I https://careerbridge.pro
```

Chạy các lệnh sau trên VM:

```bash
cd ~/DATN
docker compose ps
curl http://localhost:8000/
curl -I http://localhost:5173
sudo nginx -t
sudo systemctl status nginx --no-pager
```

Mong đợi:

- DNS trả về static IP của VM.
- Endpoint root của backend trả về `{"message":"Job Recruitment API đang hoạt động","docs":"/docs"}`.
- Lệnh test cấu hình Nginx trả về `syntax is ok` và `test is successful`.
- `https://careerbridge.pro` mở được ứng dụng mà không cần `:5173`.
- Đăng nhập hoạt động, và upload + xem CV hoạt động (xác nhận MinIO truy cập được
  qua tên miền).

## 10. Xử lý sự cố

### DNS không phân giải về IP của VM

Kiểm tra:

- Bản ghi A cho `@` trỏ về static IP của VM.
- Bản ghi `www` trỏ về `careerbridge.pro` hoặc trực tiếp về IP của VM.
- Bạn đã chỉnh DNS tại nhà cung cấp nameserver đang hoạt động.
- Các bản ghi A hoặc AAAA cũ bị xung đột đã được xóa.
- Đã đủ thời gian cho DNS lan truyền.

### `http://careerbridge.pro` không mở được

Kiểm tra:

- Firewall GCP cho phép `tcp:80`.
- Nginx đã cài và đang chạy.
- Các container Docker đang chạy.
- Frontend truy cập được trên VM bằng `curl -I http://localhost:5173`.

### Frontend báo "Blocked request. This host is not allowed."

Vite dev server đang từ chối tên miền. Thêm `allowedHosts` trong
`frontend/vite.config.js` (Phần 7) rồi chạy `docker compose up -d --build`.

### Gọi API bị lỗi CORS

`ALLOWED_ORIGINS` trong service `backend` phải chứa đúng scheme + host bạn dùng
để mở trang (`https://careerbridge.pro`). Cập nhật rồi build lại.

### File CV không tải được

Kiểm tra:

- Location `/cv-files/` trong Nginx tồn tại và `sudo nginx -t` đạt.
- `MINIO_PUBLIC_ENDPOINT` khớp với tên miền và `MINIO_SECURE` khớp với scheme
  (`true` cho HTTPS).
- Container MinIO ở trạng thái healthy: `docker compose ps`.

### Cấp chứng chỉ HTTPS thất bại

Kiểm tra:

- Cả `careerbridge.pro` và `www.careerbridge.pro` đều phân giải về IP của VM.
- Firewall GCP cho phép `tcp:80` và `tcp:443`.
- Nginx vượt qua `sudo nginx -t`.
- Chạy lại Certbot sau khi DNS đã đúng.

## Tài liệu tham khảo

- Hostinger Help Center: Manage A records at Hostinger: <https://www.hostinger.com/support/4468886/>
- Hostinger Help Center: Where to find Hostinger nameservers: <https://support.hostinger.com/en/articles/1583247-where-to-find-hostinger-nameservers>
- Google Cloud: Configure static external IP addresses: <https://cloud.google.com/compute/docs/ip-addresses/configure-static-external-ip-address>
- Certbot: Nginx on Ubuntu: <https://certbot.eff.org/instructions?ws=nginx&os=snap>
