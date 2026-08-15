import { supabase } from '../config/supabase.js';

export const supabaseService = {
  // Query helpers
  async selectAll(table, orderBy = 'created_at', ascending = true) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending });
    if (error) throw error;
    return data || [];
  },

  async select(table, orderBy = 'created_at', ascending = true) {
    return this.selectAll(table, orderBy, ascending);
  },

  async selectById(table, id) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async insert(table, row) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }
    const { data, error } = await supabase
      .from(table)
      .insert([row])
      .select();
    if (error) throw error;
    return data && data[0] ? data[0] : null;
  },

  async update(table, id, row) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }
    const { data, error } = await supabase
      .from(table)
      .update(row)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data && data[0] ? data[0] : null;
  },

  async delete(table, id) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteByField(table, field, value) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(field, value);
    if (error) throw error;
    return true;
  },
};
