-- Migration: note sur releves
ALTER TABLE releves ADD COLUMN IF NOT EXISTS note TEXT;
