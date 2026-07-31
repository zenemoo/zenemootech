import { supabaseService } from '../services/supabaseService.js';
import { generateTeamMemberSummary } from '../services/aiService.js';

// Helper: Normalize team positions in database using a 2-phase offset update to prevent PostgreSQL UNIQUE constraint violations
const normalizeAndSavePositions = async (customList = null) => {
  let list = customList;
  if (!list) {
    list = await supabaseService.selectAll('team', 'position', true);
  }
  if (!Array.isArray(list) || list.length === 0) return [];

  // 1. Phase One: Update all positions to temporary high offset values (10000 + index) to prevent UNIQUE key collisions
  for (let index = 0; index < list.length; index++) {
    const member = list[index];
    try {
      await supabaseService.update('team', member.id, {
        position: 10000 + index,
      });
    } catch (e) {
      console.warn('Phase 1 offset update warning:', e.message);
    }
  }

  // 2. Phase Two: Assign final sequential positions 1..N
  const updatedList = [];
  for (let index = 0; index < list.length; index++) {
    const member = list[index];
    const finalPos = index + 1;
    try {
      const updated = await supabaseService.update('team', member.id, {
        position: finalPos,
        updated_at: new Date().toISOString(),
      });
      updatedList.push(updated || { ...member, position: finalPos });
    } catch (e) {
      console.error('Phase 2 position update error:', e.message);
      updatedList.push({ ...member, position: finalPos });
    }
  }

  return updatedList.sort((a, b) => Number(a.position) - Number(b.position));
};

// GET /api/team - Return members ordered by position ASC
export const getTeam = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('team', 'position', true);
    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/team - Add new member automatically at end position (max + 1)
export const createTeamMember = async (req, res, next) => {
  try {
    const currentTeam = await supabaseService.selectAll('team', 'position', true);
    const maxPosition = currentTeam.reduce((max, m) => Math.max(max, Number(m.position || 0)), 0);
    const newPosition = maxPosition + 1;

    const imageUrl = req.body.image_url || req.body.image || '/assets/executive.png';
    const designation = req.body.designation || req.body.role || 'Specialist';

    let skillsArray = [];
    if (Array.isArray(req.body.skills)) {
      skillsArray = req.body.skills;
    } else if (typeof req.body.skills === 'string') {
      skillsArray = req.body.skills.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    }

    const newMemberPayload = {
      position: newPosition,
      name: req.body.name || 'New Team Member',
      designation,
      department: req.body.department || req.body.category || 'Engineering',
      badge: req.body.badge || 'Specialist',
      skills: skillsArray,
      bio: req.body.bio || '',
      image_url: imageUrl,
      public_id: req.body.public_id || '',
      linkedin: req.body.linkedin || '',
      github: req.body.github || '',
      twitter: req.body.twitter || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      status: req.body.status || 'active',
      slug: req.body.slug || '',
      employee_id: req.body.employee_id || '',
      joining_date: req.body.joining_date || '',
      experience: req.body.experience || '',
      location: req.body.location || '',
      languages: req.body.languages || [],
      availability: req.body.availability || 'Available for Projects',
      portfolio: req.body.portfolio || '',
      long_bio: req.body.long_bio || '',
      ai_summary: req.body.ai_summary || '',
      projects_completed: req.body.projects_completed || '',
      accuracy: req.body.accuracy || '',
      datasets_processed: req.body.datasets_processed || '',
      hours_worked: req.body.hours_worked || '',
      completion_rate: req.body.completion_rate || '',
      quality_score: req.body.quality_score || '',
      timeline: req.body.timeline || [],
      achievements: req.body.achievements || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Auto generate AI summary on creation if not provided
    if (!newMemberPayload.ai_summary) {
      newMemberPayload.ai_summary = await generateTeamMemberSummary(newMemberPayload);
    }

    const createdMember = await supabaseService.insert('team', newMemberPayload);
    const updatedTeam = await normalizeAndSavePositions();

    res.status(201).json({
      success: true,
      message: 'Team member added successfully',
      data: createdMember,
      team: updatedTeam,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/team/reorder - Move member to new position & shift all affected members
export const reorderTeam = async (req, res, next) => {
  try {
    const { id, newPosition } = req.body;
    if (!id || newPosition === undefined) {
      return res.status(400).json({ success: false, message: 'Member ID and newPosition are required' });
    }

    const currentList = await supabaseService.selectAll('team', 'position', true);
    if (!Array.isArray(currentList) || currentList.length === 0) {
      return res.status(404).json({ success: false, message: 'No team members found' });
    }

    const targetIndex = currentList.findIndex((m) => m.id === id);
    if (targetIndex === -1) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    // Clamp target position between 1 and count
    const clampedPos = Math.max(1, Math.min(Number(newPosition), currentList.length));

    // Remove target item and re-insert at clamped position (0-indexed)
    const [targetMember] = currentList.splice(targetIndex, 1);
    currentList.splice(clampedPos - 1, 0, targetMember);

    // Save positions via 2-phase offset update to prevent PostgreSQL UNIQUE constraint collision
    const freshTeam = await normalizeAndSavePositions(currentList);

    res.json({
      success: true,
      message: `Reordered member to position ${clampedPos}`,
      data: freshTeam,
      team: freshTeam,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/team/:id - Update fields & handle position changes
export const updateTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatePayload = { ...req.body, updated_at: new Date().toISOString() };

    // Support legacy field names for smooth transition
    if (updatePayload.role && !updatePayload.designation) {
      updatePayload.designation = updatePayload.role;
    }
    if (updatePayload.image && !updatePayload.image_url) {
      updatePayload.image_url = updatePayload.image;
    }
    if (updatePayload.category && !updatePayload.department) {
      updatePayload.department = updatePayload.category;
    }
    if (updatePayload.skills) {
      if (typeof updatePayload.skills === 'string') {
        updatePayload.skills = updatePayload.skills.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      }
    }

    // Clean payload to match team table columns only
    const cleanPayload = {};
    const validColumns = [
      'position',
      'name',
      'designation',
      'department',
      'badge',
      'skills',
      'bio',
      'image_url',
      'public_id',
      'linkedin',
      'github',
      'twitter',
      'email',
      'phone',
      'status',
      'slug',
      'employee_id',
      'joining_date',
      'experience',
      'location',
      'languages',
      'availability',
      'portfolio',
      'long_bio',
      'ai_summary',
      'projects_completed',
      'accuracy',
      'datasets_processed',
      'hours_worked',
      'completion_rate',
      'quality_score',
      'timeline',
      'achievements',
      'updated_at',
    ];

    for (const key of validColumns) {
      if (updatePayload[key] !== undefined) {
        cleanPayload[key] = updatePayload[key];
      }
    }

    const updated = await supabaseService.update('team', id, cleanPayload);

    // Re-normalize positions using 2-phase offset update
    const updatedTeam = await normalizeAndSavePositions();

    res.json({
      success: true,
      message: 'Team member updated successfully',
      data: updated,
      team: updatedTeam,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/team/:id/generate-summary - Explicit Admin trigger to generate AI summary via Groq
export const generateMemberSummary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const member = await supabaseService.selectById('team', id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    const aiSummary = await generateTeamMemberSummary(member);
    const updated = await supabaseService.update('team', id, {
      ai_summary: aiSummary,
      updated_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'AI summary generated successfully',
      ai_summary: aiSummary,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/team/profile/me - Self-service profile updates (Allowed fields ONLY)
export const updateSelfProfile = async (req, res, next) => {
  try {
    const teamMemberId = req.user?.team_member_id;
    const cleanEmail = (req.user?.email || '').toLowerCase();
    const role = (req.user?.role || 'team_member').toLowerCase();

    let targetMember = null;
    if (teamMemberId) {
      targetMember = await supabaseService.selectById('team', teamMemberId);
    }
    if (!targetMember && cleanEmail) {
      const allMembers = await supabaseService.selectAll('team');
      if (Array.isArray(allMembers)) {
        targetMember = allMembers.find((m) => (m.email || '').toLowerCase() === cleanEmail);
      }
    }

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: 'Your employee profile record was not found in Team Roster.',
      });
    }

    // Filter allowed fields ONLY (Self-service restrictions)
    const updatePayload = {};
    const allowedSelfFields = [
      'bio',
      'skills',
      'languages',
      'linkedin',
      'github',
      'twitter',
      'phone',
      'portfolio',
      'availability',
      'long_bio',
    ];

    if (Array.isArray(req.body.skills)) {
      updatePayload.skills = req.body.skills;
    } else if (typeof req.body.skills === 'string') {
      updatePayload.skills = req.body.skills.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    }

    if (Array.isArray(req.body.languages)) {
      updatePayload.languages = req.body.languages;
    } else if (typeof req.body.languages === 'string') {
      updatePayload.languages = req.body.languages.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    }

    for (const field of allowedSelfFields) {
      if (req.body[field] !== undefined && field !== 'skills' && field !== 'languages') {
        updatePayload[field] = req.body[field];
      }
    }

    updatePayload.updated_at = new Date().toISOString();

    const updated = await supabaseService.update('team', targetMember.id, updatePayload);

    res.json({
      success: true,
      message: 'Profile details updated successfully in Team Roster.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/team/profile/upload-image - Upload profile picture with 7-day rule enforcement
export const uploadSelfImage = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const teamMemberId = req.user?.team_member_id;
    const cleanEmail = (req.user?.email || '').toLowerCase();
    const role = (req.user?.role || 'team_member').toLowerCase();
    const { image_url } = req.body;

    if (!image_url) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required.',
      });
    }

    let targetMember = null;
    if (teamMemberId) {
      targetMember = await supabaseService.selectById('team', teamMemberId);
    }
    if (!targetMember && cleanEmail) {
      const allMembers = await supabaseService.selectAll('team');
      if (Array.isArray(allMembers)) {
        targetMember = allMembers.find((m) => (m.email || '').toLowerCase() === cleanEmail);
      }
    }

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: 'Your employee profile record was not found in Team Roster.',
      });
    }

    // 7-day rule verification for non-admin users
    if (role !== 'admin' && supabase) {
      try {
        const { data: latestLog } = await supabase
          .from('profile_image_logs')
          .select('next_allowed_upload, uploaded_at')
          .or(`user_id.eq.${userId},team_member_id.eq.${targetMember.id}`)
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestLog && latestLog.next_allowed_upload) {
          const nextTime = new Date(latestLog.next_allowed_upload).getTime();
          const now = Date.now();
          if (now < nextTime) {
            const remainingSeconds = Math.ceil((nextTime - now) / 1000);
            const days = Math.floor(remainingSeconds / 86400);
            const hours = Math.floor((remainingSeconds % 86400) / 3600);
            const mins = Math.floor((remainingSeconds % 3600) / 60);
            const msg = `You can update your profile picture again in ${days} Days ${hours} Hours ${mins} Mins`;

            return res.status(403).json({
              success: false,
              code: 'PROFILE_IMAGE_COOLDOWN_ACTIVE',
              message: msg,
              remaining_seconds: remainingSeconds,
              next_allowed_upload: latestLog.next_allowed_upload,
            });
          }
        }
      } catch (e) {}
    }

    // Update single-source Team Roster record
    const updated = await supabaseService.update('team', targetMember.id, {
      image_url,
      updated_at: new Date().toISOString(),
    });

    // Log upload in profile_image_logs
    if (supabase) {
      try {
        const nextAllowed = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('profile_image_logs').insert([
          {
            user_id: userId || null,
            team_member_id: targetMember.id,
            uploaded_at: new Date().toISOString(),
            next_allowed_upload: nextAllowed,
            image_url,
          },
        ]);
      } catch (e) {}
    }

    res.json({
      success: true,
      message: 'Profile picture updated successfully in Team Roster.',
      data: updated,
      next_allowed_upload: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/team/:id - Delete member and renumber remaining 1..N
export const deleteTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    await supabaseService.delete('team', id);

    // Renumber remaining members 1..N
    const updatedTeam = await normalizeAndSavePositions();

    res.json({
      success: true,
      message: 'Team member deleted and positions renumbered 1..N',
      team: updatedTeam,
      data: updatedTeam,
    });
  } catch (err) {
    next(err);
  }
};


