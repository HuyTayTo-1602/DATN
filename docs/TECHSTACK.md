# TECHSTACK — Công nghệ sử dụng trong dự án CareerBridge

Tài liệu này liệt kê và giải thích chi tiết **các công nghệ chính ở lớp trên cùng** (top-level) của hệ thống tuyển dụng việc làm (job recruitment platform). Với mỗi công nghệ, tài liệu trình bày ba phần:

- **Định nghĩa** — công nghệ đó là gì.
- **Mục đích sử dụng** — vì sao dự án dùng nó, nó giải quyết vấn đề gì.
- **Cơ chế hoạt động** — nó vận hành như thế nào ở mức nguyên lý.

## Tổng quan kiến trúc

Hệ thống theo mô hình **client – server** tách biệt, đóng gói bằng Docker:

```
┌──────────────┐      HTTP /api + WebSocket      ┌──────────────────┐
│  Frontend    │  ───────────────────────────▶   │  Backend         │
│  React + Vite│  ◀───────────────────────────   │  FastAPI (ASGI)  │
└──────────────┘                                  └────────┬─────────┘
                                                           │
                          ┌────────────────────────────────┼───────────────────────────┐
                          ▼                                 ▼                           ▼
                  ┌──────────────┐                 ┌──────────────┐            ┌──────────────────┐
                  │ PostgreSQL   │                 │ MinIO        │            │ LLM (Claude/Groq)│
                  │ (dữ liệu)    │                 │ (file CV)    │            │ qua LangGraph    │
                  └──────────────┘                 └──────────────┘            └──────────────────┘
```

- **Frontend**: React (build/dev bằng Vite), gọi REST API và mở WebSocket tới backend.
- **Backend**: FastAPI chạy trên ASGI server Uvicorn, kiến trúc phân lớp `routers → services → models`.
- **Lưu trữ**: PostgreSQL cho dữ liệu quan hệ, MinIO cho file (CV PDF).
- **AI**: Chatbot tuyển dụng xây bằng LangGraph + LangChain, gọi LLM Claude (Anthropic) hoặc Groq.
- **Đóng gói**: Toàn bộ chạy bằng Docker Compose.

---

# 1. Frontend

## 1.1. React (v18)

**Định nghĩa.** React là thư viện JavaScript mã nguồn mở của Meta dùng để xây dựng giao diện người dùng (UI) dựa trên các **component** — những khối UI độc lập, tái sử dụng được.

**Mục đích sử dụng.** Dự án dùng React để dựng toàn bộ giao diện single-page application (SPA): trang việc làm, hồ sơ ứng viên, dashboard nhà tuyển dụng/admin, cửa sổ chatbot... React cho phép tách UI thành các component nhỏ (ví dụ `LocationFields`, `SelectDown`) và quản lý trạng thái (state) của từng phần giao diện một cách rõ ràng.

**Cơ chế hoạt động.**
- React mô tả UI bằng cú pháp **JSX** (HTML viết trong JavaScript). Mỗi component trả về một cây phần tử mô tả giao diện mong muốn ứng với state hiện tại.
- React duy trì một **Virtual DOM** — bản sao nhẹ của DOM thật trong bộ nhớ. Khi state thay đổi, React tạo cây Virtual DOM mới, dùng thuật toán **diffing (reconciliation)** để so sánh với cây cũ, rồi chỉ cập nhật đúng những phần DOM thật bị thay đổi. Nhờ vậy giảm thao tác DOM tốn kém và tăng hiệu năng.
- Cơ chế **Hooks** (`useState`, `useEffect`...) cho phép component lưu state và xử lý side-effect (gọi API, đăng ký sự kiện) mà không cần class.

## 1.2. Vite (v5)

**Định nghĩa.** Vite là công cụ build và dev server thế hệ mới cho ứng dụng web frontend.

**Mục đích sử dụng.** Dự án dùng Vite để (1) chạy dev server có hot-reload khi lập trình, và (2) build ra bộ file tĩnh tối ưu cho production. Trong `vite.config.js`, Vite còn được cấu hình **proxy** `/api` về backend (`http://backend:8000`) và bật proxy WebSocket (`ws: true`), giúp tránh lỗi CORS khi phát triển.

**Cơ chế hoạt động.**
- Khi **dev**, Vite tận dụng **ES modules (ESM)** gốc của trình duyệt: thay vì bundle toàn bộ ứng dụng trước, nó phục vụ từng module theo yêu cầu và chỉ biên dịch khi trình duyệt thật sự cần. Vì vậy server khởi động gần như tức thời.
- **Hot Module Replacement (HMR)**: khi một file thay đổi, Vite chỉ thay đúng module đó trong trình duyệt mà không reload cả trang, giữ nguyên state.
- Vite dùng **esbuild** (viết bằng Go) để transpile JS/JSX cực nhanh, và **Rollup** để bundle khi build production (tree-shaking, code-splitting, minify).
- Plugin `@vitejs/plugin-react` thêm hỗ trợ JSX và React Fast Refresh.

## 1.3. React Router DOM (v6)

**Định nghĩa.** Thư viện định tuyến (routing) phía client cho React.

**Mục đích sử dụng.** Cho phép SPA có nhiều "trang" (URL khác nhau) mà không cần tải lại trang từ server — ví dụ `/jobs`, `/profile`, `/admin`.

**Cơ chế hoạt động.** React Router lắng nghe thay đổi URL qua **History API** của trình duyệt. Khi URL đổi, nó so khớp với bảng route đã khai báo và render component tương ứng vào cây React, thay vì gửi request mới tới server. Điều hướng được thực hiện bằng client-side, giữ trải nghiệm mượt như app.

## 1.4. react-markdown + remark-gfm + rehype-raw

**Định nghĩa.** Bộ thư viện render nội dung **Markdown** thành component React. `remark-gfm` thêm cú pháp GitHub Flavored Markdown (bảng, checklist, gạch ngang...), `rehype-raw` cho phép render HTML thô nhúng trong Markdown.

**Mục đích sử dụng.** Dùng để hiển thị câu trả lời của **chatbot AI** dưới dạng văn bản có định dạng (danh sách, in đậm, bảng so sánh ứng viên...) thay vì plain text.

**Cơ chế hoạt động.** Markdown được phân tích thành cây cú pháp trừu tượng (AST) qua bộ máy **unified/remark**, chuyển sang AST HTML (rehype), rồi map từng node sang React element để hiển thị an toàn trong DOM.

---

# 2. Backend

## 2.1. Python 3.12

**Định nghĩa.** Ngôn ngữ lập trình bậc cao, thông dịch, đa năng.

**Mục đích sử dụng.** Là ngôn ngữ nền của toàn bộ backend: API, logic nghiệp vụ, xử lý CV, tích hợp AI. Được chọn vì hệ sinh thái mạnh về web (FastAPI), dữ liệu và đặc biệt là AI/LLM (LangChain, LangGraph).

**Cơ chế hoạt động.** Mã Python được trình thông dịch CPython biên dịch sang **bytecode** rồi thực thi trên máy ảo Python (PVM). Python 3.12 hỗ trợ tốt cú pháp **async/await**, nền tảng cho lập trình bất đồng bộ mà FastAPI tận dụng.

## 2.2. FastAPI (v0.115)

**Định nghĩa.** Web framework Python hiện đại, hiệu năng cao, để xây dựng API, dựa trên type hints và chuẩn ASGI.

**Mục đích sử dụng.** Là khung xương của backend — định nghĩa toàn bộ REST endpoint (`/auth`, `/jobs`, `/applications`, `/cvs`, `/chatbot`, `/notifications`, `/admin`...), xử lý request/response, xác thực, và tài liệu API tự động.

**Cơ chế hoạt động.**
- FastAPI dùng **type hints** của Python kết hợp **Pydantic** để tự động **validate** dữ liệu đầu vào/ra. Khai báo sai kiểu → trả lỗi 422 rõ ràng tự động.
- **Dependency Injection**: các phụ thuộc như session DB (`get_db`) hay user hiện tại được khai báo qua `Depends(...)`; FastAPI tự khởi tạo và dọn dẹp chúng cho mỗi request.
- Nhờ chuẩn **ASGI**, các endpoint `async` xử lý nhiều request đồng thời không bị chặn (non-blocking I/O), phù hợp các tác vụ chờ DB, gọi LLM, tải file.
- FastAPI tự sinh **OpenAPI schema** và giao diện **Swagger UI** (`/docs`) từ chính code.

## 2.3. Uvicorn (ASGI server)

**Định nghĩa.** Máy chủ web ASGI hiệu năng cao chạy ứng dụng Python bất đồng bộ.

**Mục đích sử dụng.** Là tiến trình thực sự lắng nghe cổng 8000 và chạy ứng dụng FastAPI (`uvicorn app.main:app`). FastAPI chỉ định nghĩa logic; Uvicorn mới là server nhận kết nối mạng.

**Cơ chế hoạt động.** Uvicorn triển khai chuẩn **ASGI** (Asynchronous Server Gateway Interface) — giao diện chuẩn giữa server và ứng dụng async Python. Nó chạy trên event loop (`uvloop`/`asyncio`), nhận HTTP request và kết nối WebSocket, chuyển thành "scope/event" theo chuẩn ASGI và gọi vào ứng dụng. Cờ `--reload` (dev) tự khởi động lại khi code đổi; production bỏ cờ này để tăng hiệu năng.

## 2.4. SQLAlchemy (v2.0) — ORM

**Định nghĩa.** Thư viện ORM (Object–Relational Mapping) và toolkit SQL cho Python.

**Mục đích sử dụng.** Cho phép thao tác cơ sở dữ liệu PostgreSQL bằng **đối tượng Python** thay vì viết SQL thủ công. Các bảng (User, Job, Application, Company, CV...) được mô tả bằng các class model kế thừa `Base`.

**Cơ chế hoạt động.**
- Mỗi class model ánh xạ tới một bảng; mỗi instance là một dòng. SQLAlchemy dịch thao tác trên object thành câu lệnh SQL.
- **Engine** quản lý **connection pool** (`pool_pre_ping=True` để kiểm tra kết nối còn sống trước khi dùng).
- **Session** (`SessionLocal`) là đơn vị làm việc (Unit of Work): theo dõi thay đổi trên object và chỉ ghi xuống DB khi `commit()`. Mỗi request HTTP nhận một session riêng qua dependency `get_db`, đảm bảo đóng session sau khi xử lý xong.

## 2.5. PostgreSQL (v16) — Cơ sở dữ liệu

**Định nghĩa.** Hệ quản trị cơ sở dữ liệu quan hệ (RDBMS) mã nguồn mở, mạnh mẽ, tuân thủ SQL chuẩn.

**Mục đích sử dụng.** Lưu trữ toàn bộ dữ liệu nghiệp vụ có cấu trúc và quan hệ: người dùng, công ty, tin tuyển dụng, đơn ứng tuyển, thông báo, dữ liệu text trích từ CV...

**Cơ chế hoạt động.** PostgreSQL tổ chức dữ liệu thành bảng với khóa chính/khóa ngoại, đảm bảo tính toàn vẹn quan hệ. Nó hỗ trợ **giao dịch ACID** (đảm bảo dữ liệu nhất quán kể cả khi lỗi), đánh **index** để truy vấn nhanh, và **MVCC** (Multi-Version Concurrency Control) cho phép nhiều phiên đọc/ghi đồng thời mà không khóa lẫn nhau. Backend kết nối qua driver **psycopg2**.

## 2.6. psycopg2 (Database driver)

**Định nghĩa.** Driver/adapter PostgreSQL cho Python.

**Mục đích sử dụng.** Là cầu nối cấp thấp để SQLAlchemy thật sự "nói chuyện" được với PostgreSQL — gửi câu lệnh SQL và nhận kết quả.

**Cơ chế hoạt động.** psycopg2 cài đặt chuẩn **DB-API 2.0** của Python, mã hóa/giải mã dữ liệu theo giao thức wire của PostgreSQL, quản lý kết nối socket tới DB server. Bản `psycopg2-binary` đi kèm thư viện C đã biên dịch sẵn.

## 2.7. Alembic — Database migrations

**Định nghĩa.** Công cụ quản lý phiên bản và migration schema cho SQLAlchemy.

**Mục đích sử dụng.** Giúp tiến hóa cấu trúc database (thêm cột, đổi bảng) một cách có kiểm soát và có thể tái lập giữa các môi trường (dev/prod), thay vì sửa tay.

**Cơ chế hoạt động.** Alembic sinh ra các **script migration** có `upgrade()`/`downgrade()`, theo dõi phiên bản schema hiện tại bằng một bảng version trong DB. Khi chạy `alembic upgrade`, nó áp dụng tuần tự các migration còn thiếu; có thể `downgrade` để quay lui.

## 2.8. Pydantic (v2) + pydantic-settings

**Định nghĩa.** Thư viện validate dữ liệu và quản lý cấu hình dựa trên type hints Python.

**Mục đích sử dụng.** (1) Định nghĩa **schema** request/response của API (các class trong `app/schemas`) để validate và serialize dữ liệu. (2) `pydantic-settings` đọc cấu hình ứng dụng từ biến môi trường/`.env` (DATABASE_URL, SECRET_KEY, MINIO_*, API key LLM...).

**Cơ chế hoạt động.** Pydantic dựng **model** từ type hints; khi nhận dữ liệu, nó ép kiểu, kiểm tra ràng buộc (ví dụ định dạng email qua `email-validator`) và báo lỗi chi tiết nếu sai. Lõi validate của Pydantic v2 viết bằng Rust nên rất nhanh. FastAPI dùng chính Pydantic để tự động hóa validate và sinh tài liệu.

## 2.9. Passlib (bcrypt) + python-jose (JWT) — Xác thực & bảo mật

**Định nghĩa.** Passlib là thư viện hash mật khẩu; python-jose tạo và xác thực **JWT** (JSON Web Token).

**Mục đích sử dụng.** Triển khai đăng nhập an toàn: mật khẩu được **hash** trước khi lưu DB; sau đăng nhập, server cấp JWT để client đính kèm vào các request sau nhằm chứng minh danh tính (`app/utils/hashing.py`, `app/utils/jwt.py`, `app/middleware/auth.py`).

**Cơ chế hoạt động.**
- **bcrypt** hash mật khẩu kèm **salt** ngẫu nhiên và chi phí tính toán cao (chậm có chủ đích) để chống brute-force; khi đăng nhập, mật khẩu nhập vào được hash lại và so sánh.
- **JWT** gồm 3 phần `header.payload.signature`. Payload chứa thông tin user (id, role) và hạn dùng; server ký bằng `SECRET_KEY`. Mỗi request, server xác minh chữ ký để tin tưởng token mà **không cần lưu session** trên server (stateless).

## 2.10. WebSocket (thông báo realtime)

**Định nghĩa.** Giao thức truyền dữ liệu hai chiều, song công (full-duplex) trên một kết nối TCP duy nhất.

**Mục đích sử dụng.** Đẩy **thông báo realtime** từ server tới client (ví dụ ứng viên có đơn được duyệt) mà không cần client liên tục hỏi server (`app/websocket/notification_hub.py`, `notification_dispatcher.py`). Vite proxy bật `ws: true` để chuyển tiếp WebSocket khi dev.

**Cơ chế hoạt động.** Kết nối khởi đầu bằng một HTTP request có header `Upgrade: websocket` (handshake); sau khi server chấp nhận, kênh TCP được "nâng cấp" thành kết nối WebSocket mở liên tục. Hai bên gửi message bất kỳ lúc nào. Uvicorn xử lý phần WebSocket theo chuẩn ASGI; server giữ danh sách kết nối đang mở (hub) và phát thông báo tới đúng người dùng.

## 2.11. PyMuPDF / pypdf / fpdf2 — Xử lý PDF

**Định nghĩa.** Bộ thư viện làm việc với PDF: **PyMuPDF** (import `fitz`) và **pypdf** để **trích xuất text** từ CV; **fpdf2** để **tạo file PDF** (dùng khi seed dữ liệu CV mẫu, render tiếng Việt qua font Unicode DejaVuSans).

**Mục đích sử dụng.** Đọc nội dung CV người dùng tải lên để phục vụ phân tích/đối sánh ứng viên (`app/services/cv_parse_service.py`, `app/chatbot/services/pdf_service.py`); và sinh file CV PDF mẫu cho dữ liệu seed.

**Cơ chế hoạt động.** PyMuPDF/pypdf phân tích cấu trúc file PDF (các object text, font, layout) và rút ra chuỗi văn bản theo trang. fpdf2 đi chiều ngược lại: dựng các lệnh vẽ text/đồ họa thành cấu trúc PDF và xuất ra file nhị phân.

## 2.12. httpx

**Định nghĩa.** HTTP client cho Python, hỗ trợ cả đồng bộ và bất đồng bộ.

**Mục đích sử dụng.** Backend dùng để gọi ra ngoài: tải CV từ URL, gọi API LLM khi cần.

**Cơ chế hoạt động.** httpx mở kết nối HTTP(S), hỗ trợ connection pooling và HTTP/2; phiên bản async tích hợp với event loop của asyncio để không chặn tiến trình trong lúc chờ phản hồi mạng.

## 2.13. pytest (+ pytest-asyncio)

**Định nghĩa.** Framework kiểm thử (testing) phổ biến cho Python; `pytest-asyncio` cho phép test hàm async.

**Mục đích sử dụng.** Viết và chạy unit test/integration test cho backend (services, chatbot nodes...) nhằm đảm bảo logic đúng và phát hiện regression.

**Cơ chế hoạt động.** pytest tự động phát hiện các hàm `test_*`, chạy chúng, dùng `assert` thuần Python để kiểm tra và báo cáo chi tiết khi fail. Cơ chế **fixture** cung cấp dữ liệu/môi trường (DB giả, client) cho test. `pytest-asyncio` cung cấp event loop để await coroutine trong test.

---

# 3. Lớp AI / Chatbot

## 3.1. LangGraph (v1.2)

**Định nghĩa.** Framework điều phối (orchestration) các ứng dụng LLM dưới dạng **đồ thị trạng thái** (state graph), thuộc hệ sinh thái LangChain.

**Mục đích sử dụng.** Là bộ não điều phối **chatbot tuyển dụng**. Toàn bộ luồng xử lý hội thoại được mô hình hóa thành đồ thị các **node**: `auth_check → input_guardrail → classify_intent → ...` rồi rẽ nhánh theo ý định người dùng (hỏi chung vs. truy vấn ứng viên), kiểm tra quyền, chọn job, tải ứng viên, gọi LLM một lần (≤10 ứng viên) hoặc map–reduce (>10), và guardrail đầu ra (`app/chatbot/graph.py`).

**Cơ chế hoạt động.**
- Lập trình viên định nghĩa một **`StateGraph`** với một đối tượng **state** dùng chung (`ChatState`). Mỗi **node** là một hàm nhận state và trả về phần state cập nhật.
- Các **edge** nối node theo thứ tự; **conditional edges** (hàm routing như `_route_after_classify`) quyết định đi nhánh nào dựa trên giá trị trong state — nhờ đó dựng được logic phân nhánh, kiểm soát phức tạp.
- **Checkpointer** (`MemorySaver`) lưu state theo từng phiên hội thoại, cho phép giữ ngữ cảnh/lịch sử giữa các lượt chat.
- Graph được `compile()` thành đối tượng chạy được (`invoke`/`ainvoke`).

## 3.2. LangChain (langchain-core, langchain-anthropic, langchain-groq)

**Định nghĩa.** Framework chuẩn hóa cách ứng dụng tương tác với các mô hình ngôn ngữ lớn (LLM) và các thành phần xung quanh. `langchain-core` cung cấp các abstraction lõi; `langchain-anthropic`/`langchain-groq` là adapter cho từng nhà cung cấp LLM.

**Mục đích sử dụng.** Cung cấp giao diện **thống nhất** để gọi LLM, nhờ đó dự án có thể đổi provider (Claude ↔ Groq) mà không phải viết lại logic. `llm_factory.py` chọn provider theo API key có sẵn.

**Cơ chế hoạt động.** LangChain trừu tượng hóa LLM thành các đối tượng "chat model" với phương thức chung (`invoke`); message được biểu diễn thống nhất (system/human/AI). Adapter dịch lời gọi chung này thành request HTTP đúng định dạng của từng API (Anthropic, Groq) và parse kết quả trả về dạng chuẩn — tích hợp mượt vào node của LangGraph.

## 3.3. Mô hình ngôn ngữ lớn (LLM) — Claude (Anthropic) / Groq

**Định nghĩa.** LLM là mô hình AI được huấn luyện trên lượng lớn văn bản, có khả năng hiểu và sinh ngôn ngữ tự nhiên. Dự án dùng **Claude** của Anthropic (ưu tiên) hoặc **Groq** làm dự phòng.

**Mục đích sử dụng.** Là trí tuệ thực sự đứng sau chatbot: phân loại ý định, trả lời câu hỏi chung, và **phân tích/đối sánh hồ sơ ứng viên** với tin tuyển dụng để đưa ra nhận định bằng ngôn ngữ tự nhiên.

**Cơ chế hoạt động.** LLM dựa trên kiến trúc **Transformer** với cơ chế **attention**: nó dự đoán token (mảnh từ) tiếp theo dựa trên toàn bộ ngữ cảnh đầu vào (prompt), lặp lại để sinh ra câu trả lời. Backend gửi prompt (kèm dữ liệu ứng viên/job) qua API; mô hình xử lý trên hạ tầng của nhà cung cấp và trả về văn bản. `max_tokens=4096` giới hạn độ dài đầu ra. Groq nổi bật ở tốc độ suy luận nhờ phần cứng chuyên dụng (LPU).

---

# 4. Lưu trữ & Hạ tầng

## 4.1. MinIO — Object storage

**Định nghĩa.** Hệ thống lưu trữ đối tượng (object storage) mã nguồn mở, **tương thích API Amazon S3**.

**Mục đích sử dụng.** Lưu trữ **file CV (PDF)** mà người dùng tải lên — loại dữ liệu nhị phân lớn, không phù hợp để nhét vào DB quan hệ. Backend đọc/ghi qua MinIO Python SDK (`app/integrations/minio_client.py`), bucket `cv-files`. Có hai endpoint: nội bộ (`minio:9000`) cho backend và public (`localhost:9000`) cho trình duyệt.

**Cơ chế hoạt động.** MinIO tổ chức dữ liệu thành **bucket** (thùng chứa) và **object** (file kèm metadata), truy cập qua HTTP REST API kiểu S3 với xác thực bằng access key/secret key. Nó hỗ trợ **presigned URL** — link tạm thời có chữ ký để client tải file trực tiếp mà không lộ credential. Console web ở cổng 9001.

## 4.2. Docker & Docker Compose

**Định nghĩa.** **Docker** là nền tảng container hóa — đóng gói ứng dụng cùng toàn bộ phụ thuộc vào một "container" chạy nhất quán ở mọi máy. **Docker Compose** điều phối nhiều container bằng một file YAML.

**Mục đích sử dụng.** Đóng gói và khởi chạy toàn bộ hệ thống bằng một lệnh (`docker-compose up -d`): PostgreSQL, MinIO, backend, frontend — đảm bảo môi trường đồng nhất, không phụ thuộc cấu hình máy cá nhân. Mỗi service có Dockerfile riêng (backend dùng `python:3.12-slim`, frontend dùng `node:20-alpine`).

**Cơ chế hoạt động.**
- **Docker image** được dựng từ **Dockerfile** theo từng **layer** (mỗi lệnh là một layer, được cache để build nhanh). Container là một instance đang chạy của image, **cô lập** về tiến trình, filesystem và mạng nhưng chia sẻ kernel của host (nhẹ hơn máy ảo).
- **Docker Compose** đọc `docker-compose.yml`, tạo một mạng nội bộ để các container gọi nhau bằng tên service (ví dụ `postgres`, `minio`, `backend`), quản lý thứ tự khởi động qua `depends_on` + `healthcheck`, và dùng **named volume** (`postgres_data`, `minio_data`) để dữ liệu không mất khi container restart.
- **Volume mount** mã nguồn (`./backend:/app`) giúp code thay đổi phản ánh ngay trong container khi phát triển.

## 4.3. Node.js (môi trường build frontend)

**Định nghĩa.** Môi trường thực thi JavaScript phía server, dựa trên engine V8 của Chrome.

**Mục đích sử dụng.** Không chạy trong production app, nhưng là nền tảng để cài dependency (`npm install`) và chạy Vite (dev server/build) cho frontend. Container frontend dùng `node:20-alpine`.

**Cơ chế hoạt động.** Node.js chạy JavaScript ngoài trình duyệt trên engine **V8** với mô hình **event loop** đơn luồng, non-blocking I/O. Trình quản lý gói **npm** đọc `package.json`, cài thư viện vào `node_modules` và chạy các script (`dev`, `build`, `preview`).

---

# 5. Bảng tóm tắt

| Lớp | Công nghệ | Vai trò chính |
|-----|-----------|---------------|
| Frontend | React 18 | Xây dựng UI dạng component |
| Frontend | Vite 5 | Dev server + build tool |
| Frontend | React Router DOM 6 | Định tuyến phía client |
| Frontend | react-markdown (+gfm, +raw) | Render câu trả lời chatbot |
| Backend | Python 3.12 | Ngôn ngữ nền |
| Backend | FastAPI | Web framework / REST API |
| Backend | Uvicorn | ASGI server |
| Backend | SQLAlchemy 2.0 | ORM truy cập DB |
| Backend | Alembic | Database migration |
| Backend | psycopg2 | Driver PostgreSQL |
| Backend | Pydantic 2 / settings | Validate dữ liệu & cấu hình |
| Backend | Passlib + python-jose | Hash mật khẩu & JWT |
| Backend | WebSocket | Thông báo realtime |
| Backend | PyMuPDF / pypdf / fpdf2 | Đọc & tạo PDF (CV) |
| Backend | httpx | HTTP client ra ngoài |
| Backend | pytest | Kiểm thử |
| AI | LangGraph | Điều phối luồng chatbot |
| AI | LangChain | Giao diện thống nhất với LLM |
| AI | Claude (Anthropic) / Groq | Mô hình ngôn ngữ lớn |
| Hạ tầng | PostgreSQL 16 | CSDL quan hệ |
| Hạ tầng | MinIO | Lưu trữ file (CV) |
| Hạ tầng | Docker / Compose | Container hóa & điều phối |
| Hạ tầng | Node.js 20 | Môi trường build frontend |
