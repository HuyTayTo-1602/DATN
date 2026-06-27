# Triển khai Web tuyển dụng (ĐATN) lên Google Cloud Compute Engine

Hướng dẫn này triển khai web tuyển dụng **JobCV** (repository này) lên một VM Google Cloud Compute Engine bằng Docker Compose.

Ứng dụng chạy các container sau:

- `frontend` (React + Vite dev server) ở cổng `5173`
- `backend` (FastAPI) ở cổng `8000`
- `postgres` (PostgreSQL 16) ở cổng `5432`
- `minio` (object storage lưu file CV) ở cổng `9000` (API) và `9001` (web console)

Lần triển khai đầu tiên, mở web tại:

```text
http://YOUR_VM_EXTERNAL_IP:5173
```

## 0. Cần chuẩn bị trước khi bắt đầu

Bạn cần:

1. Một tài khoản Google.
2. Một project Google Cloud đã bật billing.
3. Repository này đã được đẩy lên GitHub (`https://github.com/HuyTayTo-1602/DATN`).
4. Quyền truy cập cơ bản vào Google Cloud Console.

Nếu code chưa được đẩy lên đâu cả, hãy push trước. VM cần một nơi để tải code về.

## 1. Tạo hoặc chọn một project Google Cloud

1. Mở Google Cloud Console: <https://console.cloud.google.com/>
2. Ở phía trên cùng, nhấn vào ô chọn project.
3. Nhấn **New Project**, hoặc chọn một project có sẵn.
4. Đảm bảo project đã bật billing.
5. Trong thanh tìm kiếm, gõ **Compute Engine API**.
6. Mở nó và nhấn **Enable** nếu chưa được bật.

## 2. Tạo một VM Compute Engine

1. Trong Google Cloud Console, tìm **Compute Engine**.
2. Mở **Compute Engine > VM instances**.
3. Nhấn **Create instance**.
4. Dùng các thiết lập sau trong phần **Machine configuration**:

```text
Name: jobcv-vm
Region: chọn region gần người dùng nhất (vd: asia-southeast1)
Zone: zone bất kỳ trong region đó
Machine type: e2-standard-2
```

5. Tìm phần **OS and Storage**.
6. Cạnh boot disk, nhấn **Change**.
7. Trong tab **Public images**, chọn:

```text
Operating system: Ubuntu
Version: Ubuntu 24.04 LTS
Boot disk type: Balanced persistent disk
Size: 30 GB
```

8. Nhấn **Select**.
9. Tìm phần **Networking**.
10. Tìm khu vực **Firewall**.
11. Tích **Allow HTTP traffic**.

Ghi chú:

- `e2-standard-2` có 2 vCPU và 8 GB RAM. Mức này thoải mái cho toàn bộ stack vì Postgres, MinIO, backend và Vite frontend đều chạy chung trên một VM.
- `Allow HTTP traffic` mở cổng `80`, nhưng ứng dụng này hiện chạy ở cổng `5173`, nên bạn vẫn cần tạo firewall rule riêng ở bước tiếp theo.
- Nếu không thấy **Allow HTTP traffic**, nó thường nằm trong **Networking > Firewall** ở bên trái form tạo VM.

12. Nhấn **Create**.
13. Chờ đến khi VM hiện dấu tích xanh.

## 3. Tạo firewall rule cho frontend

Container frontend lắng nghe ở cổng `5173`.

1. Trong Google Cloud Console, vào **VPC network > Firewall**.
2. Nhấn **Create firewall rule**.
3. Điền:

```text
Name: allow-jobcv-frontend-5173
Network: default
Direction of traffic: Ingress
Action on match: Allow
Targets: All instances in the network
Source IPv4 ranges: 0.0.0.0/0
Protocols and ports: tcp:5173
```

4. Nhấn **Create**.

Tùy chọn để test trang Swagger docs của backend:

Tạo thêm một firewall rule cho `tcp:8000`. Nếu được, đặt **Source IPv4 ranges** là IP của riêng bạn thay vì `0.0.0.0/0`.

Không tạo firewall rule công khai cho:

```text
5432
9000
9001
```

Đó là các cổng của Postgres và MinIO (storage API + admin console). Hãy giữ chúng ở chế độ riêng tư. File CV được phục vụ tới người dùng thông qua backend, nên trình duyệt không cần truy cập trực tiếp công khai vào MinIO trong lần triển khai đầu tiên bằng IP.

## 4. SSH vào VM

1. Vào **Compute Engine > VM instances**.
2. Tìm `jobcv-vm`.
3. Nhấn **SSH**.
4. Một cửa sổ terminal trên trình duyệt sẽ mở ra.

Tất cả lệnh bên dưới đều chạy trong terminal SSH này.

## 5. Cập nhật Ubuntu

```bash
sudo apt update
sudo apt upgrade -y
```

## 6. Cài Git và Nano

```bash
sudo apt install -y git nano
```

`git` để tải repository về. `nano` là một trình soạn thảo terminal dễ dùng để chỉnh `docker-compose.yml`.

Kiểm tra Git:

```bash
git --version
```

## 7. Cài Docker và Docker Compose

Chạy các lệnh sau trên VM:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

```bash
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Kiểm tra Docker:

```bash
sudo docker run hello-world
docker compose version
```

Cho phép user SSH chạy Docker mà không cần gõ `sudo` mỗi lần:

```bash
sudo usermod -aG docker $USER
```

Đóng tab SSH, mở SSH lại, rồi kiểm tra:

```bash
docker ps
```

Nếu `docker ps` chạy không lỗi nghĩa là Docker đã sẵn sàng.

## 8. Tải code dự án về

Repository ở chế độ public nên bạn có thể clone qua HTTPS:

```bash
cd ~
git clone https://github.com/HuyTayTo-1602/DATN.git
cd DATN
```

Thiết lập danh tính Git để các commit và pull về sau gọn gàng:

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

Nếu repository ở chế độ private, tạo SSH key trên VM bằng
`ssh-keygen -t ed25519 -C "your-email@example.com"`, thêm public key từ
`cat ~/.ssh/id_ed25519.pub` vào <https://github.com/settings/keys>, rồi clone
bằng `git clone git@github.com:HuyTayTo-1602/DATN.git`.

## 9. Cấu hình các giá trị cho production

Dự án này đọc cấu hình từ các khối `environment:` trong `docker-compose.yml`.
Những giá trị đó ghi đè mọi file `.env`, nên khi triển khai bạn chỉnh trực tiếp
trong `docker-compose.yml`.

File compose nằm ở thư mục gốc của repository:

```bash
cd ~/DATN
nano docker-compose.yml
```

Thay đổi các giá trị sau khỏi mặc định của môi trường development.

### 9.1 Mật khẩu Postgres

Trong service `postgres`:

```yaml
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD
      POSTGRES_DB: job_recruitment
```

### 9.2 Cấu hình backend

Trong service `backend`, cập nhật `DATABASE_URL` dùng cùng mật khẩu, đặt
`SECRET_KEY` mạnh, tắt debug, và thêm `ALLOWED_ORIGINS` để trình duyệt được phép
gọi API. `ALLOWED_ORIGINS` **không** có sẵn trong compose mặc định, nên hãy tự
thêm dòng này:

```yaml
    environment:
      DATABASE_URL: postgresql://postgres:CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD@postgres:5432/job_recruitment
      SECRET_KEY: CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
      DEBUG: "false"
      ALLOWED_ORIGINS: '["http://YOUR_VM_EXTERNAL_IP:5173"]'
      MINIO_ENDPOINT: minio:9000
      MINIO_PUBLIC_ENDPOINT: YOUR_VM_EXTERNAL_IP:9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
      MINIO_BUCKET_NAME: cv-files
      MINIO_SECURE: "false"
```

Nếu dùng tính năng chatbot, thêm các API key của LLM:

```yaml
      ANTHROPIC_API_KEY: your-claude-api-key
      GROQ_API_KEY: your-groq-api-key
```

Tạo `SECRET_KEY` mạnh bằng:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Quan trọng:

- Thay `YOUR_VM_EXTERNAL_IP` bằng IP external của VM (lấy trong danh sách VM của
  Compute Engine).
- `ALLOWED_ORIGINS` phải là JSON hợp lệ (dấu nháy kép bên trong, bọc trong dấu
  nháy đơn cho YAML).
- `MINIO_PUBLIC_ENDPOINT` là địa chỉ mà **trình duyệt** dùng để tải file CV. Xem
  ghi chú về MinIO bên dưới.

Lưu trong nano:

1. Nhấn `Ctrl + O`.
2. Nhấn `Enter`.
3. Nhấn `Ctrl + X`.

### 9.3 MinIO và file CV (quan trọng)

File CV được lưu trong MinIO. Khi ứng viên hoặc nhà tuyển dụng xem/tải một CV,
trình duyệt lấy file đó từ `MINIO_PUBLIC_ENDPOINT` thông qua một URL có chữ ký
tạm thời.

Với lần triển khai bằng IP này, đặt:

```yaml
      MINIO_PUBLIC_ENDPOINT: YOUR_VM_EXTERNAL_IP:9000
      MINIO_SECURE: "false"
```

và tạm thời mở `tcp:9000` cho riêng IP của bạn để test. Khi đã đưa ứng dụng ra
sau một tên miền có HTTPS, hãy cho việc tải CV đi qua Nginx thay vì mở cổng
`9000` — phần này được trình bày trong
[connect-hostinger-domain-to-gcp-vm.md](connect-hostinger-domain-to-gcp-vm.md).

## 10. Khởi chạy ứng dụng

Đảm bảo bạn đang ở thư mục gốc của repository:

```bash
cd ~/DATN
pwd
```

Output phải kết thúc bằng:

```text
/DATN
```

Khởi chạy tất cả:

```bash
docker compose up -d --build
```

Kiểm tra các container:

```bash
docker compose ps
```

Chờ đến khi `postgres` và `minio` ở trạng thái healthy và `backend`, `frontend`
đang chạy. Backend tự tạo các bảng cơ sở dữ liệu trong lần khởi động đầu tiên.

## 11. Seed dữ liệu mẫu

Dự án có sẵn các seed script tạo roles, user demo, công ty, tin tuyển dụng, ứng
viên, CV, đơn ứng tuyển và thông báo. Chạy seed tổng trong container backend:

```bash
docker compose exec backend python scripts/seed/run_full_seed.py
```

Để xóa dữ liệu seed hiện có và seed lại từ đầu:

```bash
docker compose exec backend python scripts/seed/run_full_seed.py --truncate --yes
```

## 12. Kiểm tra triển khai

Trong terminal SSH của VM:

```bash
curl http://localhost:8000/
```

Kết quả mong đợi (endpoint health/root):

```json
{"message":"Job Recruitment API đang hoạt động","docs":"/docs"}
```

Từ trình duyệt của bạn:

```text
http://YOUR_VM_EXTERNAL_IP:5173
```

Nếu bạn đã mở cổng backend `8000`, có thể test thêm trang API docs:

```text
http://YOUR_VM_EXTERNAL_IP:8000/docs
```

## 13. Các lệnh thường dùng

Chạy các lệnh này từ thư mục `~/DATN`.

Xem trạng thái container:

```bash
docker compose ps
```

Xem log của tất cả container:

```bash
docker compose logs -f
```

Chỉ xem log backend:

```bash
docker compose logs -f backend
```

Khởi động lại ứng dụng:

```bash
docker compose restart
```

Dừng ứng dụng:

```bash
docker compose down
```

Dừng ứng dụng và xóa volume database + CV:

```bash
docker compose down -v
```

Chỉ dùng `docker compose down -v` khi bạn chấp nhận xóa dữ liệu Postgres và các
file CV đã upload trên VM.

## 14. Triển khai code mới về sau

Khi bạn cập nhật code và push lên GitHub, SSH vào VM rồi chạy:

```bash
cd ~/DATN
git pull
docker compose up -d --build
```

Nếu bạn đổi dữ liệu seed và muốn làm mới nó:

```bash
docker compose exec backend python scripts/seed/run_full_seed.py --truncate --yes
```

Kiểm tra lại ứng dụng:

```bash
docker compose ps
curl http://localhost:8000/
```

Lưu ý: `git pull` có thể xung đột với `docker-compose.yml` bạn đã chỉnh. Nếu vậy,
giữ lại các giá trị production của bạn và áp lại các thay đổi từ upstream bằng
tay, hoặc về sau hãy tách secret ra một file riêng (xem phần Ghi chú production).

## 15. Xử lý sự cố

### Trình duyệt không mở được trang web

Kiểm tra:

1. VM đang chạy.
2. IP external đúng.
3. Firewall rule cho phép `tcp:5173`.
4. Container frontend đang chạy:

```bash
cd ~/DATN
docker compose ps
docker compose logs -f frontend
```

### Backend báo unhealthy

Xem log backend:

```bash
docker compose logs -f backend
```

Nguyên nhân thường gặp:

- Mật khẩu trong `DATABASE_URL` không khớp với `POSTGRES_PASSWORD`.
- Postgres vẫn đang khởi động.
- Một biến môi trường bắt buộc bị thiếu hoặc sai định dạng.

### Gọi API bị lỗi CORS

Console của trình duyệt báo lỗi CORS khi `ALLOWED_ORIGINS` không chứa địa chỉ bạn
dùng để mở trang. Đảm bảo service `backend` có, ví dụ:

```yaml
      ALLOWED_ORIGINS: '["http://YOUR_VM_EXTERNAL_IP:5173"]'
```

Sau đó build lại:

```bash
docker compose up -d --build
```

### File CV không mở hoặc không tải được

Kiểm tra:

- `MINIO_PUBLIC_ENDPOINT` trỏ tới địa chỉ mà trình duyệt truy cập được.
- Container MinIO ở trạng thái healthy: `docker compose ps`.
- Với triển khai bằng IP, `tcp:9000` truy cập được từ máy của bạn.

### Docker báo Permission Denied

Chạy:

```bash
sudo usermod -aG docker $USER
```

Sau đó đóng SSH và mở lại.

### VM quá chậm

Dừng VM và đổi machine type sang loại lớn hơn, ví dụ:

```text
e2-standard-4
```

Sau đó khởi động lại VM.

## 16. Ghi chú quan trọng cho production

Hướng dẫn này dùng đúng cấu hình Docker hiện có của repository. Nó phù hợp cho
demo đồ án hoặc lần triển khai VM đầu tiên.

Trước khi dùng cho người dùng thật, hãy cải thiện các mục sau:

1. Thêm HTTPS với tên miền (xem hướng dẫn về tên miền).
2. Phục vụ frontend bằng production build thay vì Vite dev server.
3. Ngừng mở công khai cổng backend `8000` trừ khi bạn cần.
4. Đổi thông tin đăng nhập MinIO `minioadmin` / `minioadmin`.
5. Tách secret (`SECRET_KEY`, mật khẩu, API key) ra khỏi `docker-compose.yml`
   sang một file `.env`/Secret Manager riêng và tham chiếu tới, để `git pull`
   không xung đột với các chỉnh sửa của bạn.
6. Thêm snapshot disk VM hoặc backup database + MinIO.

## 17. Dọn dẹp để tránh bị tính phí

Khi đã test xong:

1. Vào **Compute Engine > VM instances**.
2. Chọn `jobcv-vm`.
3. Nhấn **Stop** để tạm dừng tính phí compute.
4. Nhấn **Delete** nếu không cần nữa.

Kiểm tra thêm:

- **VPC network > IP addresses** xem có static IP không dùng nào không.
- **Disks** xem có persistent disk nào chưa gắn không.
- **Snapshots** nếu bạn đã tạo.

## Tài liệu tham khảo

- Google Cloud: Create a Linux VM instance in Compute Engine: <https://cloud.google.com/compute/docs/create-linux-vm-instance>
- Google Cloud: Use VPC firewall rules: <https://cloud.google.com/firewall/docs/using-firewalls>
- Google Cloud: Configure static external IP addresses: <https://cloud.google.com/compute/docs/ip-addresses/configure-static-external-ip-address>
- Docker: Install Docker Engine on Ubuntu: <https://docs.docker.com/engine/install/ubuntu/>
- MinIO: MinIO Docker quickstart: <https://min.io/docs/minio/container/index.html>
