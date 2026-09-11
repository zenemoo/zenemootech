import crypto from 'crypto';
import { supabase } from '../config/supabase.js';

/**
 * Helper: Generates a system-level human-readable member code (e.g. MEM-A1B2-C3D4).
 */
const generateMemberCode = () => {
  const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `MEM-${p1}-${p2}`;
};

/**
 * Helper: Resolves authenticated talent registration and verifies "Vendor / Agency" role.
 */
export const getAuthenticatedVendor = async (req) => {
  const email = req.talentEmail;
  if (!email) {
    return { error: 'Unauthenticated talent user', status: 401 };
  }

  if (!supabase) {
    return { error: 'Database connection unavailable', status: 500 };
  }

  const { data: vendor, error } = await supabase
    .from('talent_registrations')
    .select('id, full_name, email, primary_role, registration_code, status, team_invite_token, team_invite_active')
    .ilike('email', email)
    .maybeSingle();

  if (error) {
    console.error('[Vendor Verification Error]:', error.message);
    return { error: 'Database query error during vendor verification', status: 500 };
  }

  if (!vendor) {
    return { error: 'No talent profile found for authenticated session', status: 404 };
  }

  if (vendor.primary_role !== 'Vendor / Agency') {
    return {
      error: 'Access restricted: Team management is only available for Vendor / Agency profiles.',
      status: 403,
      isVendor: false,
    };
  }

  return { vendor, isVendor: true };
};

/**
 * GET /api/talent-hub/team/status
 * Retrieves vendor team overview status, invite token, and statistics.
 */
export const getVendorTeamStatus = async (req, res) => {
  try {
    const authResult = await getAuthenticatedVendor(req);
    if (authResult.error) {
      return res.status(authResult.status).json({
        success: false,
        message: authResult.error,
        isVendor: false,
      });
    }

    const { vendor } = authResult;

    // Fetch team member statistics
    const { data: members, error: countErr } = await supabase
      .from('talent_team_members')
      .select('id, status, created_at')
      .eq('vendor_registration_id', vendor.id)
      .is('deleted_at', null);

    if (countErr) {
      console.error('[Vendor Team Stats Error]:', countErr.message);
    }

    const memberList = members || [];
    const totalMembers = memberList.length;
    const activeMembers = memberList.filter((m) => m.status === 'active').length;

    // Recently added in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentlyAdded = memberList.filter((m) => m.created_at >= thirtyDaysAgo).length;

    // If vendor doesn't have an invite token yet, generate one automatically
    let inviteToken = vendor.team_invite_token;
    if (!inviteToken) {
      inviteToken = crypto.randomBytes(12).toString('hex');
      await supabase
        .from('talent_registrations')
        .update({
          team_invite_token: inviteToken,
          team_invite_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendor.id);
    }

    return res.json({
      success: true,
      isVendor: true,
      vendor: {
        id: vendor.id,
        fullName: vendor.full_name,
        registrationCode: vendor.registration_code,
        primaryRole: vendor.primary_role,
      },
      stats: {
        totalMembers,
        activeMembers,
        recentlyAdded,
      },
      invite: {
        token: inviteToken,
        isActive: vendor.team_invite_active !== false,
      },
    });
  } catch (err) {
    console.error('[getVendorTeamStatus Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/talent-hub/team/members
 * Retrieves paginated, searchable list of team members belonging to the authenticated Vendor.
 */
export const getVendorTeamMembers = async (req, res) => {
  try {
    const authResult = await getAuthenticatedVendor(req);
    if (authResult.error) {
      return res.status(authResult.status).json({ success: false, message: authResult.error });
    }

    const { vendor } = authResult;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 20));
    const searchQuery = (req.query.q || '').trim();
    const statusFilter = (req.query.status || 'all').trim().toLowerCase();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('talent_team_members')
      .select('*', { count: 'exact' })
      .eq('vendor_registration_id', vendor.id)
      .is('deleted_at', null);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (searchQuery) {
      query = query.or(
        `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,member_code.ilike.%${searchQuery}%,city_district.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%`
      );
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: members, count, error } = await query;

    if (error) {
      console.error('[getVendorTeamMembers Query Error]:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to retrieve team members' });
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return res.json({
      success: true,
      members: members || [],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (err) {
    console.error('[getVendorTeamMembers Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/talent-hub/team/members
 * Creates a team member manually under the authenticated Vendor.
 */
export const addVendorTeamMemberManual = async (req, res) => {
  try {
    const authResult = await getAuthenticatedVendor(req);
    if (authResult.error) {
      return res.status(authResult.status).json({ success: false, message: authResult.error });
    }

    const { vendor } = authResult;
    const {
      full_name,
      email,
      phone,
      country_code,
      gender,
      state,
      city_district,
      languages,
      preferred_contact,
      availability,
      skills_notes,
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }

    // Check duplicate email under this vendor
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (normalizedEmail) {
      const { data: existing } = await supabase
        .from('talent_team_members')
        .select('id, full_name')
        .eq('vendor_registration_id', vendor.id)
        .ilike('email', normalizedEmail)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({
          success: false,
          message: `This person (${existing.full_name}) is already part of your team.`,
        });
      }
    }

    const memberPayload = {
      vendor_registration_id: vendor.id,
      member_code: generateMemberCode(),
      full_name: full_name.trim(),
      email: normalizedEmail || null,
      phone: (phone || '').trim() || null,
      country_code: (country_code || '+91').trim(),
      gender: gender || 'Not Specified',
      state: (state || '').trim() || null,
      city_district: (city_district || '').trim() || null,
      languages: Array.isArray(languages) ? languages : typeof languages === 'string' && languages.trim() ? [languages.trim()] : [],
      preferred_contact: preferred_contact || 'WhatsApp',
      availability: availability || 'Immediately',
      skills_notes: (skills_notes || '').trim() || null,
      status: 'active',
      source: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newMember, error } = await supabase
      .from('talent_team_members')
      .insert(memberPayload)
      .select()
      .single();

    if (error) {
      console.error('[addVendorTeamMemberManual Error]:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to create team member record' });
    }

    return res.json({
      success: true,
      message: 'Team member added successfully!',
      member: newMember,
    });
  } catch (err) {
    console.error('[addVendorTeamMemberManual Catch Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PUT /api/talent-hub/team/members/:id
 * Updates an existing team member belonging to the authenticated Vendor.
 */
export const updateVendorTeamMember = async (req, res) => {
  try {
    const authResult = await getAuthenticatedVendor(req);
    if (authResult.error) {
      return res.status(authResult.status).json({ success: false, message: authResult.error });
    }

    const { vendor } = authResult;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Member ID parameter is required' });
    }

    // Verify ownership
    const { data: existing, error: findErr } = await supabase
      .from('talent_team_members')
      .select('id, vendor_registration_id')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (findErr || !existing) {
      return res.status(404).json({ success: false, message: 'Team member record not found' });
    }

    if (existing.vendor_registration_id !== vendor.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this team member' });
    }

    const {
      full_name,
      email,
      phone,
      country_code,
      gender,
      state,
      city_district,
      languages,
      preferred_contact,
      availability,
      skills_notes,
      status,
    } = req.body;

    const updatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updatePayload.full_name = full_name.trim();
    if (email !== undefined) updatePayload.email = (email || '').trim().toLowerCase() || null;
    if (phone !== undefined) updatePayload.phone = (phone || '').trim() || null;
    if (country_code !== undefined) updatePayload.country_code = country_code.trim();
    if (gender !== undefined) updatePayload.gender = gender;
    if (state !== undefined) updatePayload.state = (state || '').trim() || null;
    if (city_district !== undefined) updatePayload.city_district = (city_district || '').trim() || null;
    if (languages !== undefined) {
      updatePayload.languages = Array.isArray(languages) ? languages : typeof languages === 'string' && languages.trim() ? [languages.trim()] : [];
    }
    if (preferred_contact !== undefined) updatePayload.preferred_contact = preferred_contact;
    if (availability !== undefined) updatePayload.availability = availability;
    if (skills_notes !== undefined) updatePayload.skills_notes = skills_notes;
    if (status !== undefined) updatePayload.status = status;

    const { data: updatedMember, error: updateErr } = await supabase
      .from('talent_team_members')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('[updateVendorTeamMember Error]:', updateErr.message);
      return res.status(500).json({ success: false, message: 'Failed to update team member' });
    }

    return res.json({
      success: true,
      message: 'Team member updated successfully',
      member: updatedMember,
    });
  } catch (err) {
    console.error('[updateVendorTeamMember Catch Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * DELETE /api/talent-hub/team/members/:id
 * Soft-deletes a team member belonging to the authenticated Vendor.
 */
export const deleteVendorTeamMember = async (req, res) => {
  try {
    const authResult = await getAuthenticatedVendor(req);
    if (authResult.error) {
      return res.status(authResult.status).json({ success: false, message: authResult.error });
    }

    const { vendor } = authResult;
    const { id } = req.params;

    // Verify ownership
    const { data: existing, error: findErr } = await supabase
      .from('talent_team_members')
      .select('id, vendor_registration_id, full_name')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (findErr || !existing) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    if (existing.vendor_registration_id !== vendor.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this member' });
    }

    // Soft delete
    const { error: delErr } = await supabase
      .from('talent_team_members')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'removed',
      })
      .eq('id', id);

    if (delErr) {
      console.error('[deleteVendorTeamMember Error]:', delErr.message);
      return res.status(500).json({ success: false, message: 'Failed to remove team member' });
    }

    return res.json({
      success: true,
      message: `${existing.full_name} has been removed from your team.`,
    });
  } catch (err) {
    console.error('[deleteVendorTeamMember Catch Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/talent-hub/team/invite-token
 * Generates or regenerates a cryptographically secure team invitation token for the Vendor.
 */
export const generateVendorInviteToken = async (req, res) => {
  try {
    const authResult = await getAuthenticatedVendor(req);
    if (authResult.error) {
      return res.status(authResult.status).json({ success: false, message: authResult.error });
    }

    const { vendor } = authResult;
    const newToken = crypto.randomBytes(16).toString('hex');

    const { error } = await supabase
      .from('talent_registrations')
      .update({
        team_invite_token: newToken,
        team_invite_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendor.id);

    if (error) {
      console.error('[generateVendorInviteToken Error]:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to generate invitation link' });
    }

    return res.json({
      success: true,
      message: 'New invitation link generated successfully!',
      token: newToken,
      isActive: true,
    });
  } catch (err) {
    console.error('[generateVendorInviteToken Catch Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/talent-hub/team/export
 * Retrieves complete team member data for the authenticated Vendor for PDF/CSV/XLSX export.
 */
export const getVendorTeamExportData = async (req, res) => {
  try {
    const authResult = await getAuthenticatedVendor(req);
    if (authResult.error) {
      return res.status(authResult.status).json({ success: false, message: authResult.error });
    }

    const { vendor } = authResult;

    const { data: members, error } = await supabase
      .from('talent_team_members')
      .select('*')
      .eq('vendor_registration_id', vendor.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: 'Failed to export team members' });
    }

    return res.json({
      success: true,
      vendor: {
        fullName: vendor.full_name,
        registrationCode: vendor.registration_code,
        primaryRole: vendor.primary_role,
      },
      members: members || [],
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[getVendorTeamExportData Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════
// ── PUBLIC SHARE-LINK ENDPOINTS (NO AUTH REQUIRED) ──
// ══════════════════════════════════════════════════════════════════════

/**
 * GET /api/public/team-invite/:token
 * Public endpoint to verify invitation token and retrieve minimal vendor display details.
 */
export const getPublicTeamInviteInfo = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Invitation token is missing' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database unavailable' });
    }

    const { data: vendor, error } = await supabase
      .from('talent_registrations')
      .select('id, full_name, primary_role, registration_code, status, team_invite_active')
      .eq('team_invite_token', token.trim())
      .maybeSingle();

    if (error || !vendor) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'This team invitation link is invalid or has expired.',
      });
    }

    if (vendor.team_invite_active === false || vendor.status === 'suspended') {
      return res.status(410).json({
        success: false,
        valid: false,
        message: 'This team invitation link is currently inactive.',
      });
    }

    return res.json({
      success: true,
      valid: true,
      vendor: {
        fullName: vendor.full_name,
        primaryRole: vendor.primary_role,
        registrationCode: vendor.registration_code,
      },
    });
  } catch (err) {
    console.error('[getPublicTeamInviteInfo Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/public/team-invite/:token/submit
 * Public endpoint to submit a team member form via invitation link.
 */
export const submitPublicTeamMember = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Invitation token is required' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable' });
    }

    // Resolve vendor from token
    const { data: vendor, error: findErr } = await supabase
      .from('talent_registrations')
      .select('id, full_name, team_invite_active, status')
      .eq('team_invite_token', token.trim())
      .maybeSingle();

    if (findErr || !vendor || vendor.team_invite_active === false || vendor.status === 'suspended') {
      return res.status(400).json({
        success: false,
        message: 'This invitation link is invalid or no longer accepting submissions.',
      });
    }

    const {
      full_name,
      email,
      phone,
      country_code,
      gender,
      state,
      city_district,
      languages,
      preferred_contact,
      availability,
      skills_notes,
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();

    // Prevent duplicate submission under the same vendor
    if (normalizedEmail) {
      const { data: existing } = await supabase
        .from('talent_team_members')
        .select('id')
        .eq('vendor_registration_id', vendor.id)
        .ilike('email', normalizedEmail)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'You have already submitted your details to this team.',
        });
      }
    }

    const memberPayload = {
      vendor_registration_id: vendor.id,
      member_code: generateMemberCode(),
      full_name: full_name.trim(),
      email: normalizedEmail || null,
      phone: (phone || '').trim() || null,
      country_code: (country_code || '+91').trim(),
      gender: gender || 'Not Specified',
      state: (state || '').trim() || null,
      city_district: (city_district || '').trim() || null,
      languages: Array.isArray(languages) ? languages : typeof languages === 'string' && languages.trim() ? [languages.trim()] : [],
      preferred_contact: preferred_contact || 'WhatsApp',
      availability: availability || 'Immediately',
      skills_notes: (skills_notes || '').trim() || null,
      status: 'active',
      source: 'share_link',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertErr } = await supabase
      .from('talent_team_members')
      .insert(memberPayload);

    if (insertErr) {
      console.error('[submitPublicTeamMember Error]:', insertErr.message);
      return res.status(500).json({ success: false, message: 'Failed to submit team registration' });
    }

    return res.json({
      success: true,
      message: 'Your details have been successfully added to the team!',
      vendorName: vendor.full_name,
    });
  } catch (err) {
    console.error('[submitPublicTeamMember Catch Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════
// ── ADMIN TALENT TEAMS ENDPOINTS ──
// ══════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/talent-teams
 * Admin endpoint: Retrieves all Vendor / Agency talent registrations with their team member counts.
 */
export const getAdminTalentTeamsOverview = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable' });
    }

    // Query all Vendor / Agency registrations
    const { data: vendors, error: vendorErr } = await supabase
      .from('talent_registrations')
      .select('id, full_name, email, phone, state, city_district, registration_code, status, created_at')
      .eq('primary_role', 'Vendor / Agency')
      .order('created_at', { ascending: false });

    if (vendorErr) {
      console.error('[getAdminTalentTeamsOverview Error]:', vendorErr.message);
      return res.status(500).json({ success: false, message: 'Failed to query vendor registrations' });
    }

    const vendorList = vendors || [];
    if (vendorList.length === 0) {
      return res.json({ success: true, vendors: [], totalVendors: 0, totalTeamMembers: 0 });
    }

    // Query team member counts per vendor
    const { data: members, error: memberErr } = await supabase
      .from('talent_team_members')
      .select('id, vendor_registration_id, status, created_at')
      .is('deleted_at', null);

    const memberList = members || [];

    const vendorsWithMetrics = vendorList.map((v) => {
      const vMembers = memberList.filter((m) => m.vendor_registration_id === v.id);
      return {
        ...v,
        totalMembers: vMembers.length,
        activeMembers: vMembers.filter((m) => m.status === 'active').length,
      };
    });

    return res.json({
      success: true,
      vendors: vendorsWithMetrics,
      totalVendors: vendorList.length,
      totalTeamMembers: memberList.length,
    });
  } catch (err) {
    console.error('[getAdminTalentTeamsOverview Catch Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/admin/talent-teams/:vendorId/members
 * Admin endpoint: Retrieves paginated team members for a specific Vendor.
 */
export const getAdminVendorTeamMembers = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 20));
    const searchQuery = (req.query.q || '').trim();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('talent_team_members')
      .select('*', { count: 'exact' })
      .eq('vendor_registration_id', vendorId)
      .is('deleted_at', null);

    if (searchQuery) {
      query = query.or(
        `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,member_code.ilike.%${searchQuery}%`
      );
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: members, count, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: 'Failed to retrieve vendor team members' });
    }

    return res.json({
      success: true,
      members: members || [],
      pagination: {
        page,
        limit,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit) || 1,
      },
    });
  } catch (err) {
    console.error('[getAdminVendorTeamMembers Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/admin/talent-teams/export
 * Admin endpoint: Exports all team members across all vendors for master reporting.
 */
export const getAdminAllTeamMembersExport = async (req, res) => {
  try {
    const { vendorId } = req.query;

    let vendorQuery = supabase
      .from('talent_registrations')
      .select('id, full_name, email, registration_code')
      .eq('primary_role', 'Vendor / Agency');

    if (vendorId) {
      vendorQuery = vendorQuery.eq('id', vendorId);
    }

    const { data: vendors } = await vendorQuery;
    const vendorMap = {};
    (vendors || []).forEach((v) => {
      vendorMap[v.id] = v;
    });

    let memberQuery = supabase
      .from('talent_team_members')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (vendorId) {
      memberQuery = memberQuery.eq('vendor_registration_id', vendorId);
    }

    const { data: members, error } = await memberQuery;

    if (error) {
      return res.status(500).json({ success: false, message: 'Failed to retrieve team members for export' });
    }

    const enrichedMembers = (members || []).map((m) => {
      const v = vendorMap[m.vendor_registration_id] || {};
      return {
        ...m,
        vendorName: v.full_name || 'Vendor',
        vendorCode: v.registration_code || '-',
        vendorEmail: v.email || '-',
      };
    });

    return res.json({
      success: true,
      members: enrichedMembers,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[getAdminAllTeamMembersExport Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
