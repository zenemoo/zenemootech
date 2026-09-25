-- ==============================================================================
-- ZENEMOO Production Safe Migration: Admin Talent Teams Server-Side Aggregation & Pagination
-- Additive, Non-destructive, Idempotent
-- Implements efficient database-side member count aggregation, multi-field search,
-- member_count DESC sorting with stable secondary sort, and pagination.
-- ==============================================================================

-- 1. Index optimization for member count aggregation and vendor lookups
CREATE INDEX IF NOT EXISTS idx_talent_team_members_vendor_status 
  ON talent_team_members(vendor_registration_id, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_talent_registrations_vendor_role 
  ON talent_registrations(primary_role) 
  WHERE primary_role != 'Individual Participant';

-- 2. Database-side paginated aggregation function for Admin Talent Teams
CREATE OR REPLACE FUNCTION get_admin_talent_teams_paginated(
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 25,
  p_search TEXT DEFAULT '',
  p_sort_field TEXT DEFAULT 'member_count',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  state TEXT,
  city_district TEXT,
  registration_code TEXT,
  primary_role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  total_members BIGINT,
  active_members BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INT;
  v_clean_search TEXT;
  v_page_size INT;
BEGIN
  -- Validate & constrain page size
  v_page_size := CASE 
    WHEN p_page_size IN (10, 25, 50) THEN p_page_size 
    ELSE 25 
  END;
  v_offset := GREATEST(0, (GREATEST(1, p_page) - 1) * v_page_size);
  v_clean_search := TRIM(COALESCE(p_search, ''));

  RETURN QUERY
  WITH vendor_base AS (
    SELECT
      v.id,
      v.full_name,
      v.email,
      v.phone,
      v.state,
      v.city_district,
      v.registration_code,
      v.primary_role,
      v.status,
      v.created_at,
      COALESCE(COUNT(m.id) FILTER (WHERE m.deleted_at IS NULL), 0)::BIGINT AS total_members,
      COALESCE(COUNT(m.id) FILTER (WHERE m.deleted_at IS NULL AND m.status = 'active'), 0)::BIGINT AS active_members
    FROM talent_registrations v
    LEFT JOIN talent_team_members m ON m.vendor_registration_id = v.id AND m.deleted_at IS NULL
    WHERE v.primary_role != 'Individual Participant'
      AND (
        v_clean_search = ''
        OR v.full_name ILIKE '%' || v_clean_search || '%'
        OR v.email ILIKE '%' || v_clean_search || '%'
        OR v.phone ILIKE '%' || v_clean_search || '%'
        OR v.registration_code ILIKE '%' || v_clean_search || '%'
        OR v.city_district ILIKE '%' || v_clean_search || '%'
        OR v.state ILIKE '%' || v_clean_search || '%'
      )
    GROUP BY
      v.id, v.full_name, v.email, v.phone, v.state, v.city_district,
      v.registration_code, v.primary_role, v.status, v.created_at
  ),
  counted AS (
    SELECT COUNT(*)::BIGINT AS total_matching FROM vendor_base
  )
  SELECT
    vb.id,
    vb.full_name,
    vb.email,
    vb.phone,
    vb.state,
    vb.city_district,
    vb.registration_code,
    vb.primary_role,
    vb.status,
    vb.created_at,
    vb.total_members,
    vb.active_members,
    c.total_matching AS total_count
  FROM vendor_base vb
  CROSS JOIN counted c
  ORDER BY
    CASE WHEN LOWER(p_sort_order) = 'asc' THEN
      CASE WHEN p_sort_field = 'member_count' THEN vb.total_members END
    END ASC,
    CASE WHEN LOWER(p_sort_order) != 'asc' THEN
      CASE WHEN p_sort_field = 'member_count' THEN vb.total_members END
    END DESC,
    vb.full_name ASC,
    vb.created_at DESC
  LIMIT v_page_size
  OFFSET v_offset;
END;
$$;
