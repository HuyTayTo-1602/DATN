# Sprint Progress — Chatbot LangGraph

---

## Sprint 1 — Hạ tầng & PDF extractor ✅ HOÀN THÀNH

**Ngày hoàn thành:** 2026-05-30

### Checkpoints

- [x] **Xóa stub cũ** — `app/routers/chatbot.py` (analyze-cv, analyze-job) và `app/services/chatbot_service.py` đã được gỡ bỏ. `main.py` cập nhật import sang module mới.
- [x] **Cấu trúc module** — Tạo `app/chatbot/` với các thư mục con:
  ```
  app/chatbot/
  ├── __init__.py
  ├── schemas.py       # ChatState TypedDict, ChatRequest/Response Pydantic models
  ├── graph.py         # Placeholder cho Sprint 2+
  ├── routes.py        # Router stub, endpoints sẽ thêm ở Sprint 2+
  ├── nodes/
  │   └── __init__.py  # Placeholder cho Sprint 2+
  └── services/
      ├── __init__.py
      ├── pdf_service.py
      └── applicant_service.py
  ```
- [x] **pdf_service** — `extract_text_from_url(cv_url: str) -> str`
  - Download PDF từ HTTP URL bằng `httpx` (timeout 30s, follow redirects)
  - Extract text bằng `pypdf.PdfReader`
  - Cache kết quả trong dict in-memory theo `md5(cv_url)`
  - Trả về `""` nếu URL lỗi hoặc không phải PDF (không raise exception)
  - Expose `clear_cache()` và `cache_size()` cho testing/admin
- [x] **applicant_service** — `get_applicants_by_job(job_id, recruiter_id, db) -> list[dict]`
  - `verify_job_ownership()`: JOIN `jobs → companies → user_id == recruiter_id`; raise 404 nếu job không tồn tại, 403 nếu không phải owner
  - Query `job_applications JOIN users OUTER JOIN user_profiles`
  - `cv_url` priority: application.cv_url → profile.cv_url → None
  - Trả về 11 trường: `application_id, user_id, email, full_name, skills, experience, education, bio, cv_url, application_status, cover_letter`
- [x] **schemas.py** — `ChatState(TypedDict)`, `ChatRequest`, `ChatResponse`, `JobSummary`
  - `role: Literal["recruiter", "job_seeker"]` ✓ (khớp DB)
  - `intent: Literal["general_qa", "applicant_query"]` ✓
  - `ChatRequest.message` có `max_length=2000` ✓
- [x] **config.py** — Đổi `LLM_API_KEY` → `ANTHROPIC_API_KEY`, `LLM_MODEL` default = `claude-sonnet-4-6`
- [x] **requirements.txt** — Thêm: `langgraph`, `langchain-core`, `langchain-anthropic`, `pypdf`, `pytest`, `pytest-asyncio`
- [x] **Unit tests** — `backend/tests/chatbot/`
  - `test_pdf_service.py`: 7 tests (valid PDF, cache hit, cache pre-seed, HTTP error, non-PDF bytes, multi-URL, clear_cache)
  - `test_applicant_service.py`: 9 tests (ownership OK/403/404, applicants list, empty list, cv_url priority/fallback/None, dict keys, 403 propagation)

### Cách chạy tests
```bash
cd backend
pip install -r requirements.txt
pytest tests/chatbot/ -v
```

---

## Sprint 2 — Auth, guardrails, intent router ✅ HOÀN THÀNH

**Ngày hoàn thành:** 2026-05-30

### Checkpoints

- [x] **4 nodes** tạo trong `app/chatbot/nodes/`:
  - `auth_check.py` — kiểm tra `user_id` khác None/0 và `role` thuộc `{"recruiter", "job_seeker"}`; trả `blocked_reason` nếu fail
  - `input_guardrail.py` — chặn message > 2000 ký tự và 11 regex injection pattern (ignore previous, system prompt, you are now, act as, pretend, jailbreak, DAN mode…); case-insensitive
  - `classify_intent.py` — rule-based: `job_id` có giá trị → `applicant_query`; message chứa "ứng viên/ứng tuyển/nộp đơn/applicant/candidate" → `applicant_query`; còn lại → `general_qa`
  - `output_guardrail.py` — 6 regex pattern phát hiện system prompt leak ("I was instructed to…", "here are my instructions…", "the system prompt says…"); thay thế bằng fallback an toàn
- [x] **graph.py** — `build_graph()` với `MemorySaver`:
  - Flow: `auth_check → input_guardrail → classify_intent → [general_qa | role_check] → output_guardrail → END`
  - Blocked path: bất kỳ node nào set `blocked_reason` → `blocked` node → END (bypass output_guardrail)
  - Placeholder nodes cho Sprint 3 (general_qa) và Sprint 4 (role_check)
  - `db` được forward qua `config["configurable"]["db"]` cho Sprint 4 nodes
- [x] **POST /api/v1/chatbot/message** trong `routes.py`:
  - `Depends(get_current_user)` → 401 nếu không có token
  - Inline role check → 403 nếu role là admin hoặc không hợp lệ
  - Tạo `thread_id` mới (UUID) nếu client không gửi
  - `ainvoke` với `MemorySaver` cho multi-turn conversation
  - Fallback answer nếu graph trả về empty string
- [x] **Unit tests** — `tests/chatbot/`
  - `test_nodes.py`: 34 test cases cho 4 nodes (không cần mock, pure function)
  - `test_routes.py`: 12 test cases (401/403 auth, happy path job_seeker & recruiter, Pydantic 422, state dict validation, thread_id handling, empty answer fallback)

### Cách chạy tests
```bash
cd backend
pytest tests/chatbot/test_nodes.py tests/chatbot/test_routes.py -v
```

---

## Sprint 3 — General Q&A ⬜ CHƯA BẮT ĐẦU

## Sprint 4 — Recruiter chọn job & load applicants ⬜ CHƯA BẮT ĐẦU

## Sprint 5 — Single-shot (≤ 10 ứng viên) ⬜ CHƯA BẮT ĐẦU

## Sprint 6 — Map-reduce (> 10 ứng viên) ⬜ CHƯA BẮT ĐẦU

## Sprint 7 — Lịch sử hội thoại ⬜ CHƯA BẮT ĐẦU

## Sprint 8 — Hardening & QA ⬜ CHƯA BẮT ĐẦU
