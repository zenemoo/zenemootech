import { supabase } from '../config/supabase.js';

export const supabaseService = {
  // Query helper
  async selectAll(table) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async selectById(table, id) {
    if (!supabase) return null;
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async insert(table, row) {
    if (!supabase) return null;
    const { data, error } = await supabase.from(table).insert([row]).select();
    if (error) throw error;
    return data[0];
  },

  async update(table, id, row) {
    if (!supabase) return null;
    const { data, error } = await supabase.from(table).update(row).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },

  async delete(table, id) {
    if (!supabase) return null;
    const { data, error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};
