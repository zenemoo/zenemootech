import { supabase } from '../config/supabase.js';

// 1. GET ALL OPPORTUNITY PROGRAMS (Sorted by position ASC)
export const getOpportunities = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      console.error('Supabase fetch opportunities error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ status: 'success', data: data || [] });
  } catch (err) {
    console.error('getOpportunities controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 2. CREATE NEW OPPORTUNITY PROGRAM
export const createOpportunity = async (req, res) => {
  try {
    const {
      name,
      title,
      partner_name,
      badge,
      status,
      description,
      features,
      requirements,
      action_url,
      poster_url,
      image_url,
      public_id,
      position,
    } = req.body;

    const opTitle = title || name || 'New Opportunity Program';
    const partnerName = partner_name || 'DesiCrew Solutions';

    // Count existing records to set default position
    let finalPosition = Number(position);
    if (!finalPosition || isNaN(finalPosition)) {
      const { count } = await supabase.from('opportunities').select('*', { count: 'exact', head: true });
      finalPosition = (count || 0) + 1;
    }

    const newRecord = {
      title: opTitle,
      partner_name: partnerName,
      badge: badge || 'ACTIVE',
      status: status || 'active',
      description: description || '',
      features: Array.isArray(features) ? features : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      action_url: action_url || '#desicrew-contributors',
      poster_url: poster_url || image_url || '',
      public_id: public_id || '',
      position: finalPosition,
    };

    const { data, error } = await supabase
      .from('opportunities')
      .insert([newRecord])
      .select();

    if (error) {
      console.error('Supabase insert opportunity error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    // Return updated full list
    const { data: fullList } = await supabase.from('opportunities').select('*').order('position', { ascending: true });
    return res.status(201).json({ status: 'success', data: data[0], opportunities: fullList });
  } catch (err) {
    console.error('createOpportunity controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 3. UPDATE OPPORTUNITY PROGRAM
export const updateOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('opportunities')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase update opportunity error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const { data: fullList } = await supabase.from('opportunities').select('*').order('position', { ascending: true });
    return res.json({ status: 'success', data: data[0], opportunities: fullList });
  } catch (err) {
    console.error('updateOpportunity controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 4. REORDER OPPORTUNITY POSITION
export const reorderOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPosition } = req.body;
    const targetPos = Number(newPosition);

    if (isNaN(targetPos) || targetPos < 1) {
      return res.status(400).json({ error: 'Invalid newPosition integer' });
    }

    // Fetch current list
    const { data: allOps, error: fetchErr } = await supabase
      .from('opportunities')
      .select('id, position')
      .order('position', { ascending: true });

    if (fetchErr) return res.status(500).json({ error: fetchErr.message });

    const currentIdx = allOps.findIndex((p) => p.id === id);
    if (currentIdx === -1) return res.status(404).json({ error: 'Opportunity not found' });

    const clampedPos = Math.max(1, Math.min(targetPos, allOps.length));
    const [moved] = allOps.splice(currentIdx, 1);
    allOps.splice(clampedPos - 1, 0, moved);

    // 2-Phase Offset Update
    for (let i = 0; i < allOps.length; i++) {
      await supabase.from('opportunities').update({ position: 1000 + i + 1 }).eq('id', allOps[i].id);
    }
    for (let i = 0; i < allOps.length; i++) {
      await supabase.from('opportunities').update({ position: i + 1 }).eq('id', allOps[i].id);
    }

    const { data: fullList } = await supabase.from('opportunities').select('*').order('position', { ascending: true });
    return res.json({ status: 'success', opportunities: fullList });
  } catch (err) {
    console.error('reorderOpportunity exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 5. DELETE OPPORTUNITY PROGRAM
export const deleteOpportunity = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('opportunities').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    // Re-index remaining positions
    const { data: remaining } = await supabase.from('opportunities').select('id').order('position', { ascending: true });
    if (remaining) {
      for (let i = 0; i < remaining.length; i++) {
        await supabase.from('opportunities').update({ position: i + 1 }).eq('id', remaining[i].id);
      }
    }

    const { data: fullList } = await supabase.from('opportunities').select('*').order('position', { ascending: true });
    return res.json({ status: 'success', opportunities: fullList });
  } catch (err) {
    console.error('deleteOpportunity controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
