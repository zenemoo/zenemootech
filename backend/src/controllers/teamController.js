import { supabaseService } from '../services/supabaseService.js';

const DEFAULT_TEAM = [
  {
    id: 'team_1',
    position: 1,
    name: 'Prem Prasad Pradhan',
    designation: 'Founder & Data Operations Director',
    role: 'Founder & Data Operations Director',
    bio: 'Leads team operations, project execution, and quality control for data and AI projects across DesiCrew partner ecosystem.',
    image_url: '/assets/executive.png',
    image: '/assets/executive.png',
    skills: ['Team Leadership', 'Project Management', 'Quality Control', 'Data Solutions'],
    badge: 'Founder',
    email: 'zenemootech@gmail.com',
    status: 'active',
    category: 'Leadership',
  },
  {
    id: 'team_2',
    position: 2,
    name: 'Madhushmita Das',
    designation: 'Audio Transcription Specialist',
    role: 'Audio Transcription Specialist',
    bio: 'Supports transcription and data annotation projects with a focus on accuracy, consistency, and multi-dialect language verification.',
    image_url: '/assets/executive.png',
    image: '/assets/executive.png',
    skills: ['Audio Transcription', 'Data Annotation', 'Odia/Hindi Accuracy', 'QC Support'],
    badge: 'Senior Annotator',
    email: 'zenemootech@gmail.com',
    status: 'active',
    category: 'Engineering',
  },
  {
    id: 'team_3',
    position: 3,
    name: 'Chandan Biswal',
    designation: 'Audio Transcription Specialist',
    role: 'Audio Transcription Specialist',
    bio: 'Works on transcription, data annotation, and file processing tasks. Contributes to daily production targets with high quality standards.',
    image_url: '/assets/executive.png',
    image: '/assets/executive.png',
    skills: ['Transcription', 'Data Annotation', 'Quality Focus', 'Speed Accuracy'],
    badge: 'Specialist',
    email: 'zenemootech@gmail.com',
    status: 'active',
    category: 'Engineering',
  },
];

let memoryTeam = [...DEFAULT_TEAM];

// Helper: Normalize team positions to guarantee 1..N sequential order with 0 gaps and 0 duplicates
const normalizeAndSavePositions = async (list) => {
  const targetList = Array.isArray(list) && list.length > 0 ? list : DEFAULT_TEAM;

  // Sort by position ASC; if positions are equal or invalid, maintain array order
  const sorted = [...targetList].sort((a, b) => {
    const posA = Number(a.position);
    const posB = Number(b.position);
    if (isNaN(posA) || isNaN(posB) || posA === posB) return 0;
    return posA - posB;
  });

  // Re-assign sequential position numbers 1..N
  const normalized = sorted.map((member, index) => ({
    ...member,
    position: index + 1,
    updated_at: new Date().toISOString(),
  }));

  // Update records in Supabase PostgreSQL
  try {
    for (const member of normalized) {
      if (member.id && !member.id.startsWith('temp_') && !member.id.startsWith('team_')) {
        await supabaseService.update('team', member.id, {
          position: member.position,
          updated_at: member.updated_at,
        });
      }
    }
  } catch (e) {
    console.warn('Supabase positions batch update warning:', e.message);
  }

  memoryTeam = normalized;
  return normalized;
};

// GET /api/team - Return members ordered by position ASC
export const getTeam = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('team');
    if (data && Array.isArray(data) && data.length > 0) {
      const normalized = await normalizeAndSavePositions(data);
      return res.json({ success: true, count: normalized.length, data: normalized });
    }

    // If Supabase table is empty, attempt auto-seed of default team members
    try {
      for (const m of DEFAULT_TEAM) {
        const payload = { ...m, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        delete payload.id;
        await supabaseService.insert('team', payload);
      }
      const seeded = await supabaseService.selectAll('team');
      if (seeded && seeded.length > 0) {
        const normalized = await normalizeAndSavePositions(seeded);
        return res.json({ success: true, count: normalized.length, data: normalized });
      }
    } catch (seedErr) {
      console.warn('Supabase auto-seed warning:', seedErr.message);
    }

    const normalizedMemory = await normalizeAndSavePositions(memoryTeam);
    res.json({ success: true, count: normalizedMemory.length, data: normalizedMemory });
  } catch (err) {
    const normalizedMemory = await normalizeAndSavePositions(memoryTeam);
    res.json({ success: true, count: normalizedMemory.length, data: normalizedMemory });
  }
};

// POST /api/team - Add new member automatically at end position
export const createTeamMember = async (req, res, next) => {
  try {
    const currentTeam = (await supabaseService.selectAll('team')) || memoryTeam || [];
    const maxPosition = currentTeam.reduce((max, m) => Math.max(max, Number(m.position || 0)), 0);
    const newPosition = maxPosition + 1;

    const imageUrl = req.body.image_url || req.body.image || '/assets/executive.png';
    const designation = req.body.designation || req.body.role || 'Specialist';

    const newMemberPayload = {
      position: newPosition,
      name: req.body.name || 'New Team Member',
      designation,
      role: designation,
      bio: req.body.bio || '',
      image_url: imageUrl,
      image: imageUrl,
      skills: req.body.skills || ['Specialist'],
      badge: req.body.badge || 'Specialist',
      email: req.body.email || '',
      phone: req.body.phone || '',
      linkedin: req.body.linkedin || '',
      github: req.body.github || '',
      status: req.body.status || 'active',
      category: req.body.category || 'Engineering',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let saved = null;
    try {
      saved = await supabaseService.insert('team', newMemberPayload);
    } catch (e) {
      console.warn('Supabase insert warning:', e.message);
    }

    const createdMember = saved || { id: Date.now().toString(), ...newMemberPayload };
    memoryTeam.push(createdMember);

    // Normalize positions
    const allMembers = (await supabaseService.selectAll('team')) || memoryTeam;
    const normalized = await normalizeAndSavePositions(allMembers);

    res.status(201).json({
      success: true,
      message: 'Team member added at end position',
      data: createdMember,
      team: normalized,
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

    const currentList = (await supabaseService.selectAll('team')) || memoryTeam || [];
    if (currentList.length === 0) {
      return res.status(404).json({ success: false, message: 'No team members found' });
    }

    const targetIndex = currentList.findIndex((m) => m.id === id);
    if (targetIndex === -1) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    // Clamp new position between 1 and total count
    const clampedPos = Math.max(1, Math.min(Number(newPosition), currentList.length));

    // Remove item from list
    const [targetMember] = currentList.splice(targetIndex, 1);
    
    // Insert item at new position (1-indexed to 0-indexed)
    currentList.splice(clampedPos - 1, 0, targetMember);

    // Normalize sequential numbers 1..N
    const updatedTeam = await normalizeAndSavePositions(currentList);

    res.json({
      success: true,
      message: `Reordered member to position ${clampedPos}`,
      data: updatedTeam,
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

    if (updatePayload.role && !updatePayload.designation) {
      updatePayload.designation = updatePayload.role;
    }
    if (updatePayload.image && !updatePayload.image_url) {
      updatePayload.image_url = updatePayload.image;
    }

    let updated = null;
    try {
      updated = await supabaseService.update('team', id, updatePayload);
    } catch (e) {}

    const result = updated || { id, ...updatePayload };
    memoryTeam = memoryTeam.map((m) => (m.id === id ? { ...m, ...result } : m));

    // If position was modified in update payload, re-order
    if (updatePayload.position !== undefined) {
      const allMembers = (await supabaseService.selectAll('team')) || memoryTeam;
      const normalized = await normalizeAndSavePositions(allMembers);
      return res.json({ success: true, message: 'Member updated and positions reordered', data: result, team: normalized });
    }

    const allMembers = (await supabaseService.selectAll('team')) || memoryTeam;
    const sorted = allMembers.sort((a, b) => Number(a.position || 1) - Number(b.position || 1));

    res.json({ success: true, message: 'Member updated successfully', data: result, team: sorted });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/team/:id - Delete member and decrement higher positions
export const deleteTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await supabaseService.delete('team', id);
    } catch (e) {}

    memoryTeam = memoryTeam.filter((m) => m.id !== id);

    // Re-normalize remaining members so no missing numbers
    const remaining = (await supabaseService.selectAll('team')) || memoryTeam;
    const normalized = await normalizeAndSavePositions(remaining);

    res.json({
      success: true,
      message: 'Team member deleted and remaining positions renumbered 1..N',
      team: normalized,
    });
  } catch (err) {
    next(err);
  }
};
