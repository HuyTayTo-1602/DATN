-- Migration: Remove "reviewed" status from job_applications
-- All existing "reviewed" records are reset to "pending" (chờ xét),
-- since the recruiter has not yet made a final decision.

UPDATE job_applications
SET status = 'pending'
WHERE status = 'reviewed';
