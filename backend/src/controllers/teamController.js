import { supabaseService } from '../services/supabaseService.js';

// Helper: Normalize team positions in database to guarantee 1..N sequential order with 0 gaps and 0 duplicates
const normalizeAndSavePositions = async () => {
  const list = await supabaseService.selectAll('team', 'position', true);
  if (!Array.isArray(list) || list.length === 0) return [];

  // Sort by position ASC (fallback to created_at)
  const sorted = [...list].sort((a, b) => Number(a.position || 1) - Number(b.position || 1));

  // Check if normalization is needed
  const updatedList = [];

  for (let index = 0; index < sorted.length; index++) {
    const member = sorted[index];
    const expectedPosition = index + 1;

    if (member.position !== expectedPosition) {
      const updated = await supabaseService.update('team', member.id, {
        position: expectedPosition,
        updated_at: new Date().toISOString(),
      });
      updatedList.push(updated || { ...member, position: expectedPosition });
    } else {
      updatedList.push(member);
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

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
    if (currentList.length === 0) {
      return res.status(404).json({ success: false, message: 'No team members found' });
    }

    const targetIndex = currentList.findIndex((m) => m.id === id);
    if (targetIndex === -1) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    // Clamp target position between 1 and count
    const clampedPos = Math.max(1, Math.min(Number(newPosition), currentList.length));

    // Remove item from array and insert at clamped index
    const [targetMember] = currentList.splice(targetIndex, 1);
    currentList.splice(clampedPos - 1, 0, targetMember);

    // Update position values in Supabase PostgreSQL
    for (let index = 0; index < currentList.length; index++) {
      const member = currentList[index];
      const pos = index + 1;
      await supabaseService.update('team', member.id, {
        position: pos,
        updated_at: new Date().toISOString(),
      });
    }

    const freshTeam = await supabaseService.selectAll('team', 'position', true);

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
      'updated_at',
    ];

    for (const key of validColumns) {
      if (updatePayload[key] !== undefined) {
        cleanPayload[key] = updatePayload[key];
      }
    }

    const updated = await supabaseService.update('team', id, cleanPayload);

    // Re-normalize positions to guarantee no duplicates or gaps
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
