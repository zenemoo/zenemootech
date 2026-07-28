import { supabaseService } from '../services/supabaseService.js';

// Helper: Normalize partner positions using 2-phase offset update to prevent PostgreSQL UNIQUE key collisions
const normalizeAndSavePositions = async (customList = null) => {
  let list = customList;
  if (!list) {
    list = await supabaseService.selectAll('partners', 'position', true);
  }
  if (!Array.isArray(list) || list.length === 0) return [];

  // Phase 1: Temporary offset update
  for (let index = 0; index < list.length; index++) {
    const item = list[index];
    try {
      await supabaseService.update('partners', item.id, {
        position: 10000 + index,
      });
    } catch (e) {
      console.warn('Partner Phase 1 position offset warning:', e.message);
    }
  }

  // Phase 2: Final 1..N sequential update
  const updatedList = [];
  for (let index = 0; index < list.length; index++) {
    const item = list[index];
    const finalPos = index + 1;
    try {
      const updated = await supabaseService.update('partners', item.id, {
        position: finalPos,
        updated_at: new Date().toISOString(),
      });
      updatedList.push(updated || { ...item, position: finalPos });
    } catch (e) {
      console.error('Partner Phase 2 position update error:', e.message);
      updatedList.push({ ...item, position: finalPos });
    }
  }

  return updatedList.sort((a, b) => Number(a.position) - Number(b.position));
};

// GET /api/partners - Get all partner records ordered by position ASC
export const getPartners = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('partners', 'position', true);
    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/partners - Add new partner company with Cloudinary logo
export const createPartner = async (req, res, next) => {
  try {
    const currentList = await supabaseService.selectAll('partners', 'position', true);
    const maxPos = currentList.reduce((max, p) => Math.max(max, Number(p.position || 0)), 0);
    const newPosition = maxPos + 1;

    const payload = {
      position: newPosition,
      name: req.body.name || 'New Partner Company',
      role: req.body.role || 'Language Data & AI Partner',
      badge: req.body.badge || 'AI Partner',
      image_url: req.body.image_url || req.body.image || '',
      public_id: req.body.public_id || '',
      website_url: req.body.website_url || req.body.url || '',
      status: req.body.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const created = await supabaseService.insert('partners', payload);
    const updatedList = await normalizeAndSavePositions();

    res.status(201).json({
      success: true,
      message: 'Partner company created successfully',
      data: created,
      partners: updatedList,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/partners/reorder - Reorder partner position
export const reorderPartner = async (req, res, next) => {
  try {
    const { id, newPosition } = req.body;
    if (!id || newPosition === undefined) {
      return res.status(400).json({ success: false, message: 'Partner ID and newPosition are required' });
    }

    const currentList = await supabaseService.selectAll('partners', 'position', true);
    if (!Array.isArray(currentList) || currentList.length === 0) {
      return res.status(404).json({ success: false, message: 'No partner records found' });
    }

    const targetIndex = currentList.findIndex((p) => p.id === id);
    if (targetIndex === -1) {
      return res.status(404).json({ success: false, message: 'Partner company not found' });
    }

    const clampedPos = Math.max(1, Math.min(Number(newPosition), currentList.length));
    const [targetItem] = currentList.splice(targetIndex, 1);
    currentList.splice(clampedPos - 1, 0, targetItem);

    const freshList = await normalizeAndSavePositions(currentList);

    res.json({
      success: true,
      message: `Reordered partner to position ${clampedPos}`,
      data: freshList,
      partners: freshList,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/partners/:id - Update partner company details
export const updatePartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatePayload = { ...req.body, updated_at: new Date().toISOString() };

    const validColumns = [
      'position',
      'name',
      'role',
      'badge',
      'image_url',
      'public_id',
      'website_url',
      'status',
      'updated_at',
    ];

    const cleanPayload = {};
    for (const col of validColumns) {
      if (updatePayload[col] !== undefined) {
        cleanPayload[col] = updatePayload[col];
      }
    }

    const updated = await supabaseService.update('partners', id, cleanPayload);
    const updatedList = await normalizeAndSavePositions();

    res.json({
      success: true,
      message: 'Partner company updated successfully',
      data: updated,
      partners: updatedList,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/partners/:id - Delete partner company record
export const deletePartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    await supabaseService.delete('partners', id);
    const updatedList = await normalizeAndSavePositions();

    res.json({
      success: true,
      message: 'Partner company deleted successfully',
      partners: updatedList,
      data: updatedList,
    });
  } catch (err) {
    next(err);
  }
};
