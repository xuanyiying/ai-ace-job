-- Add performance optimization indexes
-- Requirement 10: System Performance & Availability

-- Resume indexes for common queries
CREATE INDEX IF NOT EXISTS idx_resumes_user_id_created_at ON "resumes"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_resumes_parse_status ON "resumes"("parseStatus");

-- Job indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_user_id_created_at ON "jobs"("userId", "createdAt" DESC);

-- Optimization indexes for common queries
CREATE INDEX IF NOT EXISTS idx_optimizations_user_id_created_at ON "optimizations"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_optimizations_status ON "optimizations"("status");

-- GeneratedPDF indexes for cleanup and queries
CREATE INDEX IF NOT EXISTS idx_generated_pdfs_user_id_created_at ON "generated_pdfs"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_generated_pdfs_expires_at ON "generated_pdfs"("expiresAt");

-- Template indexes for list queries
CREATE INDEX IF NOT EXISTS idx_templates_is_active_category ON "templates"("isActive", "category");

-- InterviewQuestion indexes
CREATE INDEX IF NOT EXISTS idx_interview_questions_optimization_id_type ON "interview_questions"("optimizationId", "questionType");
