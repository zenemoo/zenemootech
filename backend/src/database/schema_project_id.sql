-- Zenemoo Project ID Architecture Migration
-- Ensures columns for unique Project Code & Type tracking on Opportunities and Applications

ALTER TABLE IF EXISTS opportunities 
  ADD COLUMN IF NOT EXISTS project_code TEXT,
  ADD COLUMN IF NOT EXISTS project_type TEXT;

ALTER TABLE IF EXISTS opportunity_applications 
  ADD COLUMN IF NOT EXISTS project_code TEXT;

-- Set public_id and project_code for initial 9 opportunities
UPDATE opportunities SET public_id = 'ZEN-GEN-001' WHERE id = 'aa772601-f8f0-4307-baea-1dbed15cb662';
UPDATE opportunities SET public_id = 'ZEN-ANN-002' WHERE id = '943d4fbf-c162-45e4-8559-ef283bdb9280';
UPDATE opportunities SET public_id = 'ZEN-AUD-003' WHERE id = 'a157b308-e2e8-4c0b-9e42-638e8f48750d';
UPDATE opportunities SET public_id = 'ZEN-DATA-004' WHERE id = '2df7e880-97ff-42f4-9978-18bd77ca53c7';
UPDATE opportunities SET public_id = 'ZEN-ANN-005' WHERE id = '767341e1-5d11-4e43-8179-b03e6897c46a';
UPDATE opportunities SET public_id = 'ZEN-AUD-006' WHERE id = 'e0975e6d-9459-40cb-b513-1e9e6a41ccec';
UPDATE opportunities SET public_id = 'ZEN-IMG-007' WHERE id = 'f3e5db25-97d9-45ee-8ecd-0cd638670979';
UPDATE opportunities SET public_id = 'ZEN-AUD-008' WHERE id = 'a0d8eb25-0df6-4824-998d-4e6ebcfa07e0';
UPDATE opportunities SET public_id = 'ZEN-IMG-009' WHERE id = '0562723b-abf8-4fa3-b29d-0ca63dee8b24';
