import { supabase } from '../config/supabase.js';

const isUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const supabaseService = {
  // Query helper
  async selectAll(table) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) {
        console.warn(`Supabase selectAll (${table}) warning:`, error.message);
        return null;
      }
      return data;
    } catch (e) {
      console.warn(`Supabase selectAll (${table}) catch warning:`, e.message);
      return null;
    }
  },

  async selectById(table, id) {
    if (!supabase || !isUuid(id)) return null;
    try {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) {
        console.warn(`Supabase selectById (${table}) warning:`, error.message);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  async insert(table, row) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from(table).insert([row]).select();
      if (error) {
        console.warn(`Supabase insert (${table}) warning:`, error.message);
        return null;
      }
      return data ? data[0] : null;
    } catch (e) {
      console.warn(`Supabase insert (${table}) catch warning:`, e.message);
      return null;
    }
  },

  async update(table, id, row) {
    if (!supabase || !isUuid(id)) return null;
    try {
      const { data, error } = await supabase.from(table).update(row).eq('id', id).select();
      if (error) {
        console.warn(`Supabase update (${table}) warning:`, error.message);
        return null;
      }
      return data ? data[0] : null;
    } catch (e) {
      return null;
    }
  },

  async delete(table, id) {
    if (!supabase || !isUuid(id)) return false;
    try {
      const { data, error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        console.warn(`Supabase delete (${table}) warning:`, error.message);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  },
};
