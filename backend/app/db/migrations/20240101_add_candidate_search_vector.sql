-- =============================================================================
-- Migration: add_candidate_search_vector
-- Thêm cột search_vector (tsvector) vào user_profiles và cv_text,
-- tạo GIN index và trigger tự động cập nhật, rồi backfill dữ liệu cũ.
-- Chạy một lần trên database đang chạy; Base.metadata.create_all sẽ bỏ qua
-- cột này nếu bảng đã tồn tại — cần chạy file này thủ công.
-- =============================================================================

-- ── user_profiles ────────────────────────────────────────────────────────────

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_user_profiles_search_vector
    ON user_profiles USING GIN(search_vector);

CREATE OR REPLACE FUNCTION update_user_profile_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.skills,     '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.experience, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profiles_search_vector ON user_profiles;
CREATE TRIGGER trg_user_profiles_search_vector
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_user_profile_search_vector();

-- Backfill existing rows
UPDATE user_profiles
SET search_vector =
  setweight(to_tsvector('simple', COALESCE(full_name, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(skills,    '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(experience,'')), 'B');

-- ── cv_text ──────────────────────────────────────────────────────────────────

ALTER TABLE cv_text ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_cv_text_search_vector
    ON cv_text USING GIN(search_vector);

CREATE OR REPLACE FUNCTION update_cv_text_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', COALESCE(NEW.extracted_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cv_text_search_vector ON cv_text;
CREATE TRIGGER trg_cv_text_search_vector
  BEFORE INSERT OR UPDATE ON cv_text
  FOR EACH ROW EXECUTE FUNCTION update_cv_text_search_vector();

-- Backfill existing rows
UPDATE cv_text
SET search_vector = to_tsvector('simple', COALESCE(extracted_text, ''));
