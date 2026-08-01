import { supabaseService } from '../services/supabaseService.js';
import { generateTeamMemberSummary } from '../services/aiService.js';

// Helper: Normalize team positions in database cleanly
const normalizeAndSavePositions = async (customList = null) => {
  try {
    let list = customList;
    if (!list) {
      list = await supabaseService.selectAll('team', 'position', true);
    }
    if (!Array.isArray(list) || list.length === 0) return [];

    // Assign final sequential positions 1..N cleanly
    const updatedList = [];
    for (let index = 0; index < list.length; index++) {
      const member = list[index];
      const finalPos = index + 1;
      if (Number(member.position) !== finalPos) {
        try {
          const updated = await supabaseService.update('team', member.id, {
            position: finalPos,
            updated_at: new Date().toISOString(),
          });
          updatedList.push(updated || { ...member, position: finalPos });
        } catch (e) {
          updatedList.push({ ...member, position: finalPos });
        }
      } else {
        updatedList.push(member);
      }
    }
    return updatedList.sort((a, b) => Number(a.position) - Number(b.position));
  } catch (err) {
    console.warn('normalizeAndSavePositions warning:', err.message);
    return customList || [];
  }
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

// Helper: Resilient Supabase Insert that dynamically prunes unknown columns, handles data types, and resolves position collisions
const insertResiliently = async (table, payload) => {
  let currentPayload = { ...payload };
  delete currentPayload.id;

  const skillsAsArray = Array.isArray(currentPayload.skills)
    ? currentPayload.skills
    : (typeof currentPayload.skills === 'string' ? currentPayload.skills.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const skillsAsString = skillsAsArray.join(', ');

  const languagesAsArray = Array.isArray(currentPayload.languages)
    ? currentPayload.languages
    : (typeof currentPayload.languages === 'string' ? currentPayload.languages.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const languagesAsString = languagesAsArray.join(', ');

  let attemptCount = 0;
  const maxAttempts = 15;

  while (attemptCount < maxAttempts) {
    attemptCount++;
    try {
      const result = await supabaseService.insert(table, currentPayload);
      if (result) return result;
    } catch (err) {
      const errMsg = (err.message || err.details || '').toLowerCase();
      console.warn(`[Insert Attempt ${attemptCount}] Error:`, err.message);

      // Handle Unknown/Missing Column error from PostgreSQL / PostgREST (e.g. PGRST204 or 42703)
      const columnMatch = err.message?.match(/column ["']?(\w+)["']? of relation|Could not find column ['"]?(\w+)['"]?/i);
      if (columnMatch) {
        const missingCol = columnMatch[1] || columnMatch[2];
        if (missingCol && missingCol in currentPayload) {
          console.warn(`Stripping unknown column '${missingCol}' from team insert payload`);
          delete currentPayload[missingCol];
          continue;
        }
      }

      // Handle type mismatch on skills column
      if (errMsg.includes('skills') || errMsg.includes('array') || errMsg.includes('text[]')) {
        if (Array.isArray(currentPayload.skills)) {
          currentPayload.skills = skillsAsString;
          continue;
        } else if (typeof currentPayload.skills === 'string') {
          currentPayload.skills = skillsAsArray;
          continue;
        }
      }

      // Handle type mismatch on languages column
      if (errMsg.includes('languages')) {
        if (Array.isArray(currentPayload.languages)) {
          currentPayload.languages = languagesAsString;
          continue;
        } else if (typeof currentPayload.languages === 'string') {
          currentPayload.languages = languagesAsArray;
          continue;
        }
      }

      // Handle position unique key collision
      if (errMsg.includes('position') || errMsg.includes('unique') || errMsg.includes('duplicate key')) {
        try {
          const currentTeam = await supabaseService.selectAll('team', 'position', true);
          const maxPos = Array.isArray(currentTeam) && currentTeam.length > 0
            ? currentTeam.reduce((max, m) => Math.max(max, Number(m.position || 0)), 0)
            : 0;
          currentPayload.position = maxPos + 1;
          continue;
        } catch (_) {
          delete currentPayload.position;
          continue;
        }
      }

      // Fallback: If error remains, prune optional non-core fields one by one
      const optionalFields = [
        'datasets_processed', 'hours_worked', 'completion_rate', 'quality_score',
        'timeline', 'achievements', 'projects_completed', 'accuracy',
        'joining_date', 'experience', 'location', 'availability', 'portfolio',
        'long_bio', 'ai_summary', 'languages', 'slug', 'employee_id', 'public_id',
        'linkedin', 'github', 'twitter', 'phone'
      ];
      const fieldToRemove = optionalFields.find((f) => f in currentPayload);
      if (fieldToRemove) {
        console.warn(`Pruning optional field '${fieldToRemove}' to ensure insert success`);
        delete currentPayload[fieldToRemove];
        continue;
      }

      // Final fallback if error persists
      throw err;
    }
  }

  return currentPayload;
};

// Helper: Resilient Supabase Update that dynamically prunes unknown columns on update
const updateResiliently = async (table, id, payload) => {
  let currentPayload = { ...payload };
  delete currentPayload.id;

  let attemptCount = 0;
  const maxAttempts = 15;

  while (attemptCount < maxAttempts) {
    attemptCount++;
    try {
      const result = await supabaseService.update(table, id, currentPayload);
      return result;
    } catch (err) {
      console.warn(`[Update Attempt ${attemptCount}] Error:`, err.message);

      // Handle Unknown/Missing Column error
      const columnMatch = err.message?.match(/column ["']?(\w+)["']? of relation|Could not find column ['"]?(\w+)['"]?/i);
      if (columnMatch) {
        const missingCol = columnMatch[1] || columnMatch[2];
        if (missingCol && missingCol in currentPayload) {
          delete currentPayload[missingCol];
          continue;
        }
      }

      // Handle skills array/string type mismatch
      if ((err.message || '').includes('skills') || (err.message || '').includes('array')) {
        if (Array.isArray(currentPayload.skills)) {
          currentPayload.skills = currentPayload.skills.join(', ');
          continue;
        } else if (typeof currentPayload.skills === 'string') {
          currentPayload.skills = currentPayload.skills.split(',').map((s) => s.trim()).filter(Boolean);
          continue;
        }
      }

      // Prune optional fields if unknown column error occurs
      const optionalFields = [
        'datasets_processed', 'hours_worked', 'completion_rate', 'quality_score',
        'timeline', 'achievements', 'projects_completed', 'accuracy',
        'joining_date', 'experience', 'location', 'availability', 'portfolio',
        'long_bio', 'ai_summary', 'languages', 'slug', 'employee_id', 'public_id'
      ];
      const fieldToRemove = optionalFields.find((f) => f in currentPayload);
      if (fieldToRemove) {
        delete currentPayload[fieldToRemove];
        continue;
      }

      throw err;
    }
  }
  return currentPayload;
};

// POST /api/team - Add new member automatically at end position (max + 1)
export const createTeamMember = async (req, res, next) => {
  try {
    let currentTeam = [];
    try {
      currentTeam = await supabaseService.selectAll('team', 'position', true);
    } catch (e) {
      currentTeam = [];
    }
    const maxPosition = Array.isArray(currentTeam) && currentTeam.length > 0
      ? currentTeam.reduce((max, m) => Math.max(max, Number(m.position || 0)), 0)
      : 0;
    const newPosition = maxPosition + 1;

    const imageUrl = req.body.image_url || req.body.image || '/assets/executive.png';
    const designation = req.body.designation || req.body.role || 'Specialist';

    let skillsArray = [];
    if (Array.isArray(req.body.skills)) {
      skillsArray = req.body.skills;
    } else if (typeof req.body.skills === 'string') {
      skillsArray = req.body.skills.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    }
    if (skillsArray.length === 0) {
      skillsArray = ['Specialist'];
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

    delete newMemberPayload.id;

    // Auto generate AI summary on creation if not provided (non-blocking)
    if (!newMemberPayload.ai_summary) {
      try {
        newMemberPayload.ai_summary = await generateTeamMemberSummary(newMemberPayload);
      } catch (e) {
        newMemberPayload.ai_summary = `${newMemberPayload.name} is a dedicated ${newMemberPayload.designation} at Zenemoo.`;
      }
    }

    const createdMember = await insertResiliently('team', newMemberPayload);

    // Re-normalize positions using 2-phase offset update and get full team list
    const updatedTeam = await normalizeAndSavePositions();

    res.status(201).json({
      success: true,
      message: 'Team member added successfully',
      data: createdMember || newMemberPayload,
      team: Array.isArray(updatedTeam) && updatedTeam.length > 0 ? updatedTeam : undefined,
    });
  } catch (err) {
    console.error('Final Error creating team member:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to add team member. Please try again.',
    });
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

    const updated = await updateResiliently('team', id, cleanPayload);

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

// In-memory pending updates fallback store
const memoryPendingUpdates = [];

// PUT /api/team/profile/me - Self-service profile updates (Admin approval workflow)
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

    // If non-admin user, route through Admin Approval Workflow
    if (role !== 'admin') {
      const pendingPayload = {
        team_member_id: targetMember.id,
        user_id: req.user?.id || null,
        employee_name: targetMember.name,
        employee_id: targetMember.employee_id || `EMP-${String(targetMember.position || 1).padStart(3, '0')}`,
        requested_changes: updatePayload,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      if (supabase) {
        try {
          await supabase.from('pending_profile_updates').insert([pendingPayload]);
        } catch (e) {}
      }
      memoryPendingUpdates.unshift({ id: `pending_${Date.now()}`, ...pendingPayload });

      return res.json({
        success: true,
        message: 'Profile update submitted for Administrator approval. Changes will appear on the website once approved.',
        is_pending_approval: true,
      });
    }

    // Direct update for Super Admin
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

// POST /api/team/profile/upload-image - Upload profile picture with 7-day rule & Admin approval workflow
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

    // Route non-admin image uploads through Admin Approval Workflow
    if (role !== 'admin') {
      const pendingPayload = {
        team_member_id: targetMember.id,
        user_id: userId || null,
        employee_name: targetMember.name,
        employee_id: targetMember.employee_id || `EMP-${String(targetMember.position || 1).padStart(3, '0')}`,
        requested_changes: { image_url, updated_at: new Date().toISOString() },
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      if (supabase) {
        try {
          await supabase.from('pending_profile_updates').insert([pendingPayload]);
        } catch (e) {}
      }
      memoryPendingUpdates.unshift({ id: `pending_${Date.now()}`, ...pendingPayload });

      return res.json({
        success: true,
        message: 'Profile picture update submitted for Administrator approval. It will appear on the website once approved.',
        is_pending_approval: true,
      });
    }

    // Update single-source Team Roster record for Super Admin
    const updated = await supabaseService.update('team', targetMember.id, {
      image_url,
      updated_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Profile picture updated successfully in Team Roster.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/team/profile-updates/pending - Admin list pending profile updates
export const getPendingProfileUpdates = async (req, res, next) => {
  try {
    let list = [];
    if (supabase) {
      try {
        const { data } = await supabase
          .from('pending_profile_updates')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (Array.isArray(data)) list = data;
      } catch (e) {}
    }
    if (list.length === 0) {
      list = memoryPendingUpdates.filter((u) => u.status === 'pending');
    }

    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/team/profile-updates/:id/approve - Admin approves pending profile update
export const approveProfileUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    let pendingRecord = null;

    if (supabase) {
      try {
        const { data } = await supabase
          .from('pending_profile_updates')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (data) pendingRecord = data;
      } catch (e) {}
    }

    if (!pendingRecord) {
      pendingRecord = memoryPendingUpdates.find((u) => u.id === id);
    }

    if (!pendingRecord) {
      return res.status(404).json({ success: false, message: 'Pending profile update request not found.' });
    }

    // Apply requested changes directly to single-source team table
    const changes = pendingRecord.requested_changes || {};
    changes.updated_at = new Date().toISOString();

    const updatedMember = await supabaseService.update('team', pendingRecord.team_member_id, changes);

    // Mark status = approved
    if (supabase) {
      try {
        await supabase
          .from('pending_profile_updates')
          .update({ status: 'approved', updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (e) {}
    }
    pendingRecord.status = 'approved';

    res.json({
      success: true,
      message: `Approved profile update for ${pendingRecord.employee_name}. Changes are now live on the website!`,
      data: updatedMember,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/team/profile-updates/:id/reject - Admin rejects pending profile update
export const rejectProfileUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    if (supabase) {
      try {
        await supabase
          .from('pending_profile_updates')
          .update({ status: 'rejected', admin_notes: admin_notes || 'Rejected by Admin', updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (e) {}
    }

    const rec = memoryPendingUpdates.find((u) => u.id === id);
    if (rec) rec.status = 'rejected';

    res.json({
      success: true,
      message: 'Pending profile update rejected.',
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


