# Thiết kế Chatbot Tuyển Dụng (LangGraph)

Tài liệu này mô tả việc bổ sung tính năng chatbot vào hệ thống tuyển dụng hiện tại (đã hoàn thành CRUD). Chatbot phục vụ 2 role: **Recruiter** (người tuyển dụng) và **Job Seeker** (ứng viên). Người **chưa đăng nhập** không được sử dụng tính năng này.

---

## 1. Mô tả tính năng

### 1.1. Phân quyền truy cập
- Endpoint chatbot yêu cầu user đã đăng nhập (JWT/session). Nếu chưa đăng nhập → trả `401 Unauthorized`.
- Hệ thống tự nhận diện role (`recruiter` / `job_seeker`) từ `users.role_id` để định tuyến luồng xử lý.

### 1.2. Tính năng cho Recruiter
- **Chọn job đã đăng**: chatbot liệt kê các job thuộc `companies.user_id = current_user.id`, recruiter chọn 1 job (hoặc nhiều) làm phạm vi hỏi.
- **Hỏi về ứng viên đã ứng tuyển job đó**:
  - Lấy danh sách `job_applications` theo `job_id`.
  - Với mỗi ứng viên: lấy `user_profiles` + CV file (PDF). **Trích xuất text PDF trước**, rồi đưa vào context.
  - Nếu số ứng viên ≤ 10: nhét toàn bộ vào 1 context window và để LLM trả lời trực tiếp.
  - Nếu số ứng viên > 10: chia **batch 10 người**, mỗi batch gọi LLM tóm tắt/đánh giá theo câu hỏi → cuối cùng gọi LLM tổng hợp (map-reduce).
- **Ví dụ câu hỏi**: "Top 3 ứng viên phù hợp nhất với job Backend Senior?", "Ai có kinh nghiệm Python > 3 năm?", "So sánh ứng viên A và B".

### 1.3. Tính năng cho Job Seeker
- **Không** được truy cập dữ liệu ứng viên khác hay danh sách job applications.
- Chỉ dùng được phần Q&A chung (xem mục 1.4).

### 1.4. Q&A chung (cả 2 role)
- Trả lời các câu hỏi về: **tuyển dụng, thị trường lao động, kinh tế, nghề nghiệp, kỹ năng, phỏng vấn, lương thưởng, CV**…
- Câu hỏi **ngoài phạm vi** (chính trị nhạy cảm, code malware, nội dung 18+, hỏi đời tư người nổi tiếng…) → từ chối lịch sự.

### 1.5. Guardrails (nhẹ)
- **Input guardrail**:
  - Chặn prompt injection cơ bản: phát hiện cụm "ignore previous instructions", "system prompt", "you are now…".
  - Giới hạn độ dài input (ví dụ ≤ 2000 ký tự).
  - Lọc topic: nếu LLM phân loại câu hỏi không thuộc domain cho phép → từ chối.
- **Output guardrail**:
  - Không để lộ system prompt.
  - Recruiter không nhận được dữ liệu ứng viên ngoài job mình sở hữu (kiểm tra ownership ở tầng DB query, không tin LLM).
  - Job Seeker không nhận được dữ liệu của ứng viên khác.

---

## 2. Công nghệ và đồ thị LangGraph

### 2.1. Stack
- **Backend**: giữ nguyên framework hiện tại của dự án, thêm module `chatbot/`.
- **LLM orchestration**: `langgraph` + `langchain-core`.
- **LLM provider**: Claude (Anthropic API) hoặc OpenAI — cấu hình qua env.
- **PDF extraction**: `pypdf` (mặc định) hoặc `pdfplumber` cho CV có bảng. OCR (`pytesseract`) là tuỳ chọn cho PDF scan. CV được truy cập qua `cv_url` (HTTP URL) — service download file về bộ nhớ tạm rồi mới extract; **việc xây dựng cv_url input sẽ bổ sung sau**.
- **State store**: `MemorySaver` của LangGraph cho dev; chuyển sang Postgres checkpointer khi prod để lưu lịch sử hội thoại.
- **Caching**: cache text đã trích xuất từ PDF theo hash của URL (`cv_url`) để tránh download + parse lại.

### 2.2. Đồ thị LangGraph

Đồ thị chính có dạng router theo role và intent:

```
                      ┌─────────────────┐
                      │   auth_check    │  (chặn nếu chưa đăng nhập)
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │ input_guardrail │  (chặn injection, giới hạn length)
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │ classify_intent │  (general_qa | applicant_query)
                      └────────┬────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
       ┌────────▼─────────┐         ┌─────────▼──────────┐
       │  general_qa_node │         │ role_check (must=  │
       │ (domain filter + │         │  recruiter)        │
       │  trả lời)        │         └─────────┬──────────┘
       └────────┬─────────┘                   │
                │                  ┌──────────▼──────────┐
                │                  │ select_job_node     │
                │                  │ (xác nhận job_id    │
                │                  │  thuộc recruiter)   │
                │                  └──────────┬──────────┘
                │                             │
                │                  ┌──────────▼──────────┐
                │                  │ load_applicants     │
                │                  │ (DB + extract PDF)  │
                │                  └──────────┬──────────┘
                │                             │
                │                   ┌─────────▼─────────┐
                │                   │ size <= 10 ?      │
                │                   └────┬─────────┬────┘
                │                    yes │         │ no
                │                ┌───────▼──┐   ┌──▼─────────────┐
                │                │ single_  │   │ batch_map      │
                │                │ shot_llm │   │ (mỗi batch 10) │
                │                └───────┬──┘   └──┬─────────────┘
                │                        │         │
                │                        │   ┌─────▼─────────┐
                │                        │   │ reduce_llm    │
                │                        │   │ (tổng hợp)    │
                │                        │   └─────┬─────────┘
                │                        │         │
                │                        └────┬────┘
                │                             │
                └──────────────┬──────────────┘
                               │
                      ┌────────▼─────────┐
                      │ output_guardrail │
                      └────────┬─────────┘
                               │
                              END
```

**State schema (gợi ý)**:
```python
class ChatState(TypedDict):
    user_id: int
    role: Literal["recruiter", "job_seeker"]
    message: str
    job_id: Optional[int]
    intent: Optional[Literal["general_qa", "applicant_query"]]
    applicants: list[dict]      # [{user_id, profile, cv_text}]
    batch_summaries: list[str]  # khi map-reduce
    answer: str
    blocked_reason: Optional[str]
```

**Logic batch (map-reduce)**:
- Map: với mỗi batch 10 ứng viên → prompt "Dựa trên câu hỏi `{message}`, đánh giá/tóm tắt 10 ứng viên này, trả về JSON `[{applicant_id, score, highlights}]`".
- Reduce: gom các JSON, prompt "Từ danh sách đã đánh giá, trả lời câu hỏi gốc `{message}` (xếp hạng / so sánh / lọc)".

---

## 3. Sprints triển khai

### ✅ Sprint 1 — Hạ tầng & PDF extractor (1–2 ngày)
- [x] **Xóa** 2 endpoint stub cũ (`POST /api/v1/chatbot/analyze-cv`, `POST /api/v1/chatbot/analyze-job`) và file `chatbot_service.py` placeholder hiện tại.
- [x] Tạo module `chatbot/` với cấu trúc: `graph.py`, `nodes/`, `services/`, `schemas.py`, `routes.py`.
- [x] Cài `langgraph`, `langchain-anthropic` (hoặc `langchain-openai`), `pypdf`, `httpx` (download CV từ URL).
- [x] Viết service `pdf_service.extract_text_from_url(cv_url: str) -> str`: download PDF từ HTTP URL về bộ nhớ tạm → extract text → cache kết quả theo `hash(cv_url)`.
- [x] Viết service `applicant_service.get_applicants_by_job(job_id, recruiter_id)` — query `job_applications` JOIN `users` JOIN `user_profiles`, **kiểm tra ownership** (`companies.user_id == recruiter_id`).
- [x] Unit test cho 2 service trên (mock HTTP download cho pdf_service).

### ✅ Sprint 2 — Auth, guardrails, intent router (1 ngày)
- [x] Endpoint `POST /api/v1/chatbot/message` yêu cầu auth → trả 401 nếu chưa login.
- [x] Node `auth_check`, `input_guardrail` (regex chặn injection + giới hạn length).
- [x] Node `classify_intent` dùng LLM với prompt phân loại (`general_qa` / `applicant_query`) hoặc rule-based đơn giản (có chứa `job_id` / từ khoá "ứng viên" → applicant_query).
- [x] Node `output_guardrail` cơ bản: strip system prompt nếu LLM lỡ trả về, đảm bảo không có dữ liệu ngoài phạm vi.

### ✅ Sprint 3 — Luồng General Q&A (1 ngày)
- [x] Node `general_qa_node` với system prompt giới hạn domain (tuyển dụng / kinh tế / nghề nghiệp) — `app/chatbot/nodes/general_qa.py`.
- [x] Domain filter tích hợp trong system prompt (`app/chatbot/prompts/general_qa_system.txt`): LLM từ chối lịch sự nếu câu hỏi ngoài phạm vi.
- [x] LLM factory với dependency injection (`app/chatbot/services/llm_factory.py`) — dễ mock trong test.
- [x] `graph.py` cập nhật: thay `_general_qa_placeholder` bằng `general_qa_node` thực.
- [x] `app/config.py` thêm `extra = "ignore"` để bỏ qua biến env không khai báo.
- [x] 22 unit test (`tests/chatbot/test_general_qa.py`): in-domain, out-of-domain, role access (recruiter + job_seeker), LLM invocation, error handling, system prompt file validation — tất cả pass.
- [x] Cả recruiter và job_seeker đều dùng được node này.

### ✅ Sprint 4 — Luồng Recruiter chọn job & load applicants (1–2 ngày)
- [x] Node `role_check_node` (`app/chatbot/nodes/role_check.py`): recruiter đi tiếp, job_seeker/admin → `blocked_reason` → `blocked` node.
- [x] Endpoint `GET /api/v1/chatbot/my-jobs` (`app/chatbot/routes.py` + `app/chatbot/services/job_service.py`): trả danh sách job (id, title, status) của recruiter; 403 cho job_seeker/admin.
- [x] Node `select_job_node` (`app/chatbot/nodes/select_job.py`): nhận `job_id` từ state + DB từ `RunnableConfig`, gọi `verify_job_ownership`; block nếu thiếu job_id / 404 / 403.
- [x] Node `load_applicants_node` (`app/chatbot/nodes/load_applicants.py`): query DB lấy ứng viên, extract CV text song song (`asyncio.gather`), enrich dict với `cv_text`; block nếu DB raise 403/404.
- [x] `graph.py` mở rộng: `role_check` → `select_job` → `load_applicants` → `answer_applicants` (placeholder Sprint 5/6) → `output_guardrail`; mọi node xấu đều route về `blocked`.
- [x] `app/config.py` đã có `extra = "ignore"` (giữ nguyên từ Sprint 3).
- [x] 35 unit/integration test mới (`test_sprint4_nodes.py` — 22 tests, `test_my_jobs_endpoint.py` — 13 tests): role_check, select_job ownership, load_applicants parallel extraction, /my-jobs auth & data — tất cả pass.
- [x] Tổng: 119/120 tests pass (1 pre-existing fail không liên quan Sprint 4).

### ✅ Sprint 5 — Single-shot trả lời (≤ 10 ứng viên) (1 ngày)
- [x] `schemas.py` thêm `job_info: Optional[dict]` vào ChatState; `routes.py` khởi tạo `job_info=None`.
- [x] `select_job_node` cập nhật: trả về `{"job_info": {...}}` sau khi xác nhận ownership (Sprint 4 test đã cập nhật tương ứng).
- [x] `app/chatbot/prompts/single_shot_system.txt` — system prompt chuyên cho phân tích ứng viên (trích dẫn, xếp hạng, từ chối câu hỏi ngoài phạm vi).
- [x] `app/chatbot/nodes/single_shot_llm.py` — DI factory `make_single_shot_node(llm=None)`, hàm thuần `truncate_cv` (giới hạn 8 000 ký tự ≈ 2 000 token), `build_human_prompt` (job_info + danh sách ứng viên + câu hỏi).
- [x] `graph.py` cập nhật: thay `answer_applicants` placeholder bằng routing 3 chiều `_route_after_load_applicants` — `blocked` / `single_shot` (≤ 10) / `batch_map` (> 10, Sprint 6 placeholder); nối `single_shot_llm → output_guardrail`.
- [x] 43 unit test mới (`test_single_shot_llm.py`): `truncate_cv`, `build_human_prompt`, node invocation (0/1/5/10 ứng viên), error handling, system prompt file, size routing boundary (≤10 → single_shot, ≥11 → batch_map) — tất cả pass.
- [x] Sprint 4 test `test_sprint4_nodes.py` cập nhật: `test_passes_when_job_is_owned` và thêm `test_returns_job_info_with_correct_fields`.
- [x] Tổng: 163/164 tests pass (1 pre-existing fail không liên quan).

### ✅ Sprint 6 — Map-reduce (> 10 ứng viên) (1–2 ngày)
- [x] `app/chatbot/prompts/batch_map_system.txt` — system prompt cho MAP phase: yêu cầu LLM trả JSON `[{applicant_id, name, score, highlights, concerns, relevance}]`, quy tắc chấm điểm 1–10.
- [x] `app/chatbot/prompts/reduce_llm_system.txt` — system prompt cho REDUCE phase: tổng hợp batch summaries, trả lời câu hỏi gốc có cấu trúc.
- [x] `app/chatbot/nodes/batch_map.py` — DI factory `make_batch_map_node(llm=None)`, `BATCH_SIZE=10`, `BATCH_CV_MAX_CHARS=4000`, `build_batch_prompt` (exported), `asyncio.gather` chạy song song tất cả batch; batch lỗi trả `"[]"` (không propagate exception).
- [x] `app/chatbot/nodes/reduce_llm.py` — DI factory `make_reduce_llm_node(llm=None)`, `build_reduce_prompt` (exported), tổng hợp `batch_summaries` + câu hỏi + job_info; error → safe fallback.
- [x] `graph.py` hoàn thiện: thay `_batch_map_placeholder` bằng `batch_map_node`; thêm `reduce_llm_node`; chuỗi `batch_map → reduce_llm → output_guardrail` đã được nối đầy đủ.
- [x] Edge điều kiện `_route_after_load_applicants` (đã có từ Sprint 5): `≤10 → single_shot`, `>10 → batch_map`.
- [x] 42 unit test mới (`test_batch_map_reduce.py`): `build_batch_prompt`, batching (11/25/50 ứng viên → 2/3/5 LLM calls), parallel execution, batch error resilience, `build_reduce_prompt`, `reduce_llm` invocation, prompt file validation, BATCH_SIZE boundary — tất cả pass.
- [x] Tổng: 205/206 tests pass (1 pre-existing fail không liên quan).

### ✅ Sprint 7 — Lịch sử hội thoại & hoàn thiện (1 ngày)
- [x] `MemorySaver` đã cấu hình từ Sprint 1; `thread_id` đã được truyền vào `config["configurable"]` — multi-turn context hoạt động. Prod: thay bằng `PostgresSaver` (hướng dẫn trong comment `routes.py`).
- [x] Mỗi user/session có `thread_id` riêng: FE tự sinh UUID, backend giữ nguyên nếu client cung cấp hoặc tự sinh nếu thiếu.
- [x] `app/chatbot/services/history_service.py` — in-memory store với thread ownership (user_id ràng buộc lần đầu ghi; đọc sai owner → `None` → HTTP 403); helpers `append_turn`, `get_history`, `clear_thread`, `clear_all`.
- [x] `schemas.py` thêm `ChatHistoryItem(role, content, created_at)`.
- [x] `GET /api/v1/chatbot/history?thread_id=...` — trả `list[ChatHistoryItem]`; 200 `[]` nếu thread chưa tồn tại; 403 nếu không phải owner; 401 nếu chưa auth.
- [x] `POST /message` cập nhật: sau khi graph trả lời, gọi `append_turn` lưu lịch sử; ghi log INFO (user_id, role, thread_id, msg_len, answer_len, elapsed_ms — **không log nội dung**).
- [x] 33 tests mới (`test_history.py`): service append/ownership/helpers, endpoint auth/data/403, history sau POST /message, logging PII-free, multi-turn thread isolation — tất cả pass.
- [x] Tổng: 238/239 tests pass (1 pre-existing fail không liên quan).

### ✅ Sprint 8 — Hardening & QA (1 ngày)
- [x] **Bộ test prompt injection** (`tests/chatbot/test_sprint8_hardening.py` — `TestPromptInjectionBlocked`): 18 jailbreak patterns (ignore previous, system prompt, DAN mode, pretend/act as…) + 8 SQL/data-exfiltration patterns (SELECT…FROM, UNION SELECT, DROP TABLE, "list all users in DB/database/system") — tất cả bị chặn bởi `input_guardrail_node`; 10 legitimate messages pass.
- [x] **Thêm SQL/data-exfiltration patterns** vào `app/chatbot/nodes/input_guardrail.py`: `SELECT .* FROM`, `UNION SELECT`, `DROP TABLE`, `list all \w+ in/from (the)? db/database/system`.
- [x] **Test phân quyền** (`TestJobSeekerCannotUseApplicantFlow` + `TestRecruiterOwnership`): job_seeker/admin bị chặn tại `role_check_node` và `/my-jobs` (403); recruiter A không xem được job của recruiter B (`verify_job_ownership` → 403, `get_applicants_by_job` → 403, `select_job_node` → blocked_reason); recruiter đúng chủ sở hữu → pass.
- [x] **Rate limit** (`app/chatbot/services/rate_limiter.py`): sliding-window 30 req/60 s/user, thread-safe với `threading.Lock`; `check_rate_limit`, `get_request_count`, `reset_user`, `reset_all`; tích hợp vào `POST /message` → HTTP 429 khi vượt giới hạn.
- [x] **68 unit/integration test mới** (`test_sprint8_hardening.py`): injection (30 tests), permission (14 tests), rate limit service (11 tests), rate limit endpoint (3 tests) — tất cả pass.
- [x] Tổng: **306/307 tests pass** (1 pre-existing fail không liên quan Sprint 8).
- [ ] Cập nhật README và API docs (Swagger/Postman) — nằm ngoài phạm vi backend code.

---

## Ghi chú cho Claude Code
- Dùng **dependency injection** cho LLM client để dễ test (mock).
- Tách rõ **tầng DB query** (trả raw data) và **tầng LLM** (chỉ nhận text/dict đã sạch) — không để LLM tự sinh SQL.
- Mọi truy cập dữ liệu ứng viên **phải** đi qua check ownership ở tầng service, không tin tham số từ LLM.
- Prompt template để trong file `.txt` hoặc `.j2` riêng, không hardcode trong code Python.

---

## 4. Thiết kế Frontend Chatbot

### 4.1. Kiểu giao diện: Trang riêng `/chat`

Route `/chat` với layout 2 cột. Yêu cầu đăng nhập — redirect về `/login` nếu chưa auth.

```
┌─────────────────────────────────────────────────────┐
│  Header / Navbar (chung với toàn app)               │
├──────────────────┬──────────────────────────────────┤
│  Left Panel      │  Chat Area                       │
│  (280px, fixed)  │  (flex-grow)                     │
│                  │                                  │
│ [Recruiter]      │  🤖 Xin chào! Tôi có thể        │
│ ─────────────    │  giúp gì cho bạn?                │
│ Job của bạn:     │                                  │
│ ○ Backend Sr     │  👤 Top 3 ứng viên phù hợp       │
│ ● FE Junior  ✓   │  nhất với FE Junior?             │
│ ○ PM Senior      │                                  │
│                  │  🤖 Dựa trên 8 CV đã nộp:       │
│ [Candidate]      │  **1. Nguyễn Văn A** — 5 năm    │
│ ─────────────    │  React, TypeScript...            │
│ Hỏi về:          │  **2. Trần Thị B** — ...         │
│ • Tuyển dụng     │                                  │
│ • Thị trường LĐ  │                                  │
│ • Kỹ năng / CV   │                                  │
│ • Lương thưởng   │                                  │
│                  │                                  │
│ [Xóa lịch sử]   │  ┌─────────────────────────┐     │
│                  │  │ Nhập tin nhắn...        │ ▶   │
└──────────────────┴──┴─────────────────────────┴─────┘
```

### 4.2. Cấu trúc component

```
frontend/src/
├── pages/
│   └── ChatPage.jsx              # Page chính, layout 2 cột
├── components/
│   └── chat/
│       ├── ChatSidebar.jsx       # Left panel — job selector hoặc topic hints
│       ├── ChatWindow.jsx        # Danh sách tin nhắn + scroll
│       ├── ChatMessage.jsx       # Từng bubble tin nhắn (user / bot)
│       ├── ChatInput.jsx         # Textarea + nút gửi
│       └── JobSelector.jsx       # Dropdown / radio list chọn job (recruiter only)
└── services/
    └── chatService.js            # API calls tới /api/v1/chatbot/
```

### 4.3. Logic frontend theo role

**Recruiter:**
1. Vào `/chat` → sidebar gọi `GET /api/v1/chatbot/my-jobs` lấy danh sách job.
2. Recruiter chọn 1 job → `job_id` được gắn vào mọi request tiếp theo.
3. Mỗi tin nhắn gửi: `POST /api/v1/chatbot/message` với `{ message, job_id, thread_id }`.
4. Hiển thị kết quả dạng markdown (bold, numbered list) trong bubble.

**Candidate (job_seeker):**
1. Vào `/chat` → sidebar hiển thị các chủ đề gợi ý (không có job selector).
2. Mỗi tin nhắn gửi: `POST /api/v1/chatbot/message` với `{ message, thread_id }`.
3. Không có `job_id` trong request.

### 4.4. Quản lý state frontend

```javascript
// State trong ChatPage
const [messages, setMessages] = useState([]);   // [{role, content, timestamp}]
const [selectedJobId, setSelectedJobId] = useState(null);  // recruiter only
const [threadId] = useState(() => generateThreadId());     // uuid cố định theo session
const [isLoading, setIsLoading] = useState(false);
```

- `threadId` tạo 1 lần khi mount, lưu vào `sessionStorage` để reload không mất context.
- Không dùng global state (Redux/Zustand) — ChatPage tự quản lý đủ.
- Streaming response (nếu backend hỗ trợ SSE): dùng `EventSource` hoặc `fetch` với `ReadableStream`.

### 4.5. API contract (Frontend ↔ Backend)

```
POST /api/v1/chatbot/message
Authorization: Bearer <token>
{
  "message": "Top 3 ứng viên phù hợp nhất?",
  "job_id": 42,          // null nếu là candidate hoặc general Q&A
  "thread_id": "uuid"    // để duy trì lịch sử hội thoại
}

→ 200 OK
{
  "answer": "Dựa trên 12 CV...",
  "thread_id": "uuid"
}

→ 400 Bad Request  { "detail": "Input quá dài (> 2000 ký tự)" }
→ 401 Unauthorized
→ 403 Forbidden    { "detail": "Bạn không có quyền xem job này" }

GET /api/v1/chatbot/my-jobs
Authorization: Bearer <token>  (recruiter only)
→ [{ "id": 42, "title": "Backend Senior", "status": "active" }, ...]

GET /api/v1/chatbot/history?thread_id=uuid
→ [{ "role": "user"|"assistant", "content": "...", "created_at": "..." }, ...]
```

### 4.6. UX chi tiết

- **Loading state**: hiển thị "đang xử lý..." bubble có animation (3 chấm nhảy) trong khi chờ LLM.
- **Markdown rendering**: dùng thư viện nhẹ như `marked` hoặc `react-markdown` để render **bold**, bullet list, table trong response của bot.
- **Scroll**: tự cuộn xuống cuối khi có tin nhắn mới (`useEffect` + `scrollIntoView`).
- **Job selector**: hiển thị chỉ các job có `status: "active"`. Khi chọn job, hiện badge xác nhận "Đang hỏi về: [Job Title]".
- **Error handling**: nếu API trả 4xx/5xx → hiển thị toast hoặc bubble lỗi đỏ, không crash page.
- **Responsive**: trên mobile (< 768px) sidebar ẩn, thay bằng dropdown chọn job ở top bar.

### 4.7. Điều hướng

- Thêm link "AI Assistant" vào Navbar (hiển thị cho cả recruiter và job_seeker, ẩn với guest).
- Route: `<Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />`
- Từ `MyJobsPage`, mỗi job card có nút "Phân tích ứng viên" → navigate tới `/chat?job_id=42` để tự động chọn job.
