import { supabaseService } from '../services/supabaseService.js';

let memoryTeam = [];

export const getTeam = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('team');
    if (data && Array.isArray(data) && data.length > 0) {
      return res.json({ success: true, count: data.length, data });
    }
    res.json({ success: true, count: memoryTeam.length, data: memoryTeam });
  } catch (err) {
    res.json({ success: true, count: memoryTeam.length, data: memoryTeam });
  }
};

export const createTeamMember = async (req, res, next) => {
  try {
    const newMember = {
      name: req.body.name,
      role: req.body.role,
      image: req.body.image,
      bio: req.body.bio || '',
      skills: req.body.skills || [],
      badge: req.body.badge || 'Specialist',
      email: req.body.email || '',
      linkedin: req.body.linkedin || '',
      github: req.body.github || '',
    };

    let saved = null;
    try {
      saved = await supabaseService.insert('team', newMember);
    } catch (e) {
      console.warn('Supabase team insert warning:', e.message);
    }

    const resultMember = saved || { id: Date.now().toString(), ...newMember };
    memoryTeam.unshift(resultMember);

    res.status(201).json({ success: true, data: resultMember });
  } catch (err) {
    next(err);
  }
};

export const updateTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedData = { ...req.body };

    let updated = null;
    try {
      updated = await supabaseService.update('team', id, updatedData);
    } catch (e) {}

    const resultMember = updated || { id, ...updatedData };
    memoryTeam = memoryTeam.map((m) => (m.id === id ? { ...m, ...resultMember } : m));

    res.json({ success: true, data: resultMember });
  } catch (err) {
    next(err);
  }
};

export const deleteTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await supabaseService.delete('team', id);
    } catch (e) {}

    memoryTeam = memoryTeam.filter((m) => m.id !== id);
    res.json({ success: true, message: 'Team member deleted' });
  } catch (err) {
    next(err);
  }
};
