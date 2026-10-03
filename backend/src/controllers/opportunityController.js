import { supabase } from '../config/supabase.js';
import { ensureOpportunitySheetExists } from '../services/googleSheetsService.js';
import { sendZenemooNotification } from '../services/pushNotificationEngine.js';

// In-Memory Public Cache (3-Minute TTL)
let opportunitiesCache = {
  data: null,
  timestamp: 0,
};
const OPPORTUNITIES_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

// In-Memory Admin Cache (30-second TTL for fast admin operations)
let adminOpportunitiesCache = {
  data: null,
  timestamp: 0,
};
const ADMIN_OPPORTUNITIES_CACHE_TTL = 30 * 1000; // 30 seconds

export const invalidateOpportunitiesCache = () => {
  opportunitiesCache = { data: null, timestamp: 0 };
  adminOpportunitiesCache = { data: null, timestamp: 0 };
};

const OPPORTUNITY_PUBLIC_COLUMNS = 'id, position, title, partner_name, badge, status, description, company_logo, poster_url, public_id, features, requirements, language_skills, eligibility_criteria, whatsapp_group_url, whatsapp_channel_url, telegram_url, contact_support_url, linkedin_post_url, x_post_url, facebook_post_url, instagram_url, youtube_url, other_social_url, application_post_url, pdf_link, contact_details, custom_questions, action_url, about_project, what_you_will_do, experience_requirements, equipment_requirements, internet_requirements, working_hours, project_duration, payment_info, payment_frequency, work_mode, availability_requirement, project_highlights, benefits, why_join, important_notes, created_at, updated_at';

// 1. GET PUBLIC OPPORTUNITY PROGRAMS (Sorted by position ASC, excluding drafts)
export const getOpportunities = async (req, res) => {
  try {
    const now = Date.now();
    if (opportunitiesCache.data && now - opportunitiesCache.timestamp < OPPORTUNITIES_CACHE_TTL) {
      return res.json({ status: 'success', data: opportunitiesCache.data, cached: true });
    }

    const { data, error } = await supabase
      .from('opportunities')
      .select(OPPORTUNITY_PUBLIC_COLUMNS)
      .neq('status', 'draft')
      .order('position', { ascending: true });

    if (error) {
      console.error('Supabase fetch opportunities error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const resultList = data || [];
    opportunitiesCache = {
      data: resultList,
      timestamp: Date.now(),
    };

    return res.json({ status: 'success', data: resultList });
  } catch (err) {
    console.error('getOpportunities controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 1B. GET ALL OPPORTUNITIES FOR ADMIN (Sorted by position ASC, includes all statuses: active, coming_soon, stopped, draft)
export const getAdminOpportunities = async (req, res) => {
  try {
    const now = Date.now();
    if (adminOpportunitiesCache.data && now - adminOpportunitiesCache.timestamp < ADMIN_OPPORTUNITIES_CACHE_TTL) {
      return res.json({ status: 'success', data: adminOpportunitiesCache.data, cached: true });
    }

    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      console.error('Supabase fetch admin opportunities error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const resultList = data || [];
    adminOpportunitiesCache = {
      data: resultList,
      timestamp: Date.now(),
    };

    return res.json({ status: 'success', data: resultList });
  } catch (err) {
    console.error('getAdminOpportunities controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// Canonical Whitelist & Normalizer for all supported opportunity fields
export const sanitizeOpportunityPayload = (body, isCreate = false, fallbackPosition = 1) => {
  const opTitle = body.title || body.name || (isCreate ? 'New Opportunity Program' : undefined);
  const partnerName = body.partner_name || (isCreate ? 'Zenemoo' : undefined);

  const payload = {};

  // Core Fields
  if (opTitle !== undefined) payload.title = String(opTitle).trim();
  if (partnerName !== undefined) payload.partner_name = String(partnerName).trim();
  if (body.badge !== undefined) payload.badge = body.badge ? String(body.badge).trim() : null;
  if (body.status !== undefined) payload.status = body.status || 'active';
  if (body.description !== undefined) payload.description = String(body.description || '').trim();
  if (body.action_url !== undefined) payload.action_url = String(body.action_url || '').trim();
  if (body.public_id !== undefined) payload.public_id = body.public_id ? String(body.public_id).trim() : null;
  if (body.position !== undefined || isCreate) {
    const pos = Number(body.position);
    payload.position = (!pos || isNaN(pos) || pos < 1) ? fallbackPosition : pos;
  }

  // Media
  if (body.company_logo !== undefined) payload.company_logo = body.company_logo ? String(body.company_logo).trim() : null;
  if (body.poster_url !== undefined || body.image_url !== undefined) {
    const pUrl = body.poster_url || body.image_url;
    payload.poster_url = pUrl ? String(pUrl).trim() : null;
  }

  // Social & Communication Links
  if (body.whatsapp_group_url !== undefined) payload.whatsapp_group_url = body.whatsapp_group_url ? String(body.whatsapp_group_url).trim() : null;
  if (body.whatsapp_channel_url !== undefined) payload.whatsapp_channel_url = body.whatsapp_channel_url ? String(body.whatsapp_channel_url).trim() : null;
  if (body.telegram_url !== undefined) payload.telegram_url = body.telegram_url ? String(body.telegram_url).trim() : null;
  if (body.contact_support_url !== undefined) payload.contact_support_url = body.contact_support_url ? String(body.contact_support_url).trim() : null;
  if (body.linkedin_post_url !== undefined) payload.linkedin_post_url = body.linkedin_post_url ? String(body.linkedin_post_url).trim() : null;
  if (body.x_post_url !== undefined) payload.x_post_url = body.x_post_url ? String(body.x_post_url).trim() : null;
  if (body.facebook_post_url !== undefined) payload.facebook_post_url = body.facebook_post_url ? String(body.facebook_post_url).trim() : null;
  if (body.instagram_url !== undefined) payload.instagram_url = body.instagram_url ? String(body.instagram_url).trim() : null;
  if (body.youtube_url !== undefined) payload.youtube_url = body.youtube_url ? String(body.youtube_url).trim() : null;
  if (body.other_social_url !== undefined) payload.other_social_url = body.other_social_url ? String(body.other_social_url).trim() : null;
  if (body.application_post_url !== undefined) payload.application_post_url = body.application_post_url ? String(body.application_post_url).trim() : null;
  if (body.pdf_link !== undefined) payload.pdf_link = body.pdf_link ? String(body.pdf_link).trim() : null;

  // Contact Details JSON
  if (body.contact_details !== undefined) {
    if (body.contact_details && typeof body.contact_details === 'object' && !Array.isArray(body.contact_details)) {
      payload.contact_details = {
        contact_person: body.contact_details.contact_person ? String(body.contact_details.contact_person).trim() : undefined,
        email: body.contact_details.email ? String(body.contact_details.email).trim() : undefined,
        phone: body.contact_details.phone ? String(body.contact_details.phone).trim() : undefined,
      };
    } else {
      payload.contact_details = {};
    }
  }

  // Work Information
  if (body.work_mode !== undefined) payload.work_mode = body.work_mode ? String(body.work_mode).trim() : 'remote';
  if (body.working_hours !== undefined) payload.working_hours = body.working_hours ? String(body.working_hours).trim() : null;
  if (body.payment_info !== undefined) payload.payment_info = body.payment_info ? String(body.payment_info).trim() : null;
  if (body.payment_frequency !== undefined) payload.payment_frequency = body.payment_frequency ? String(body.payment_frequency).trim() : null;
  if (body.project_duration !== undefined) payload.project_duration = body.project_duration ? String(body.project_duration).trim() : null;
  if (body.availability_requirement !== undefined) payload.availability_requirement = body.availability_requirement ? String(body.availability_requirement).trim() : null;

  // Project Scope & Requirements
  if (body.about_project !== undefined) payload.about_project = body.about_project ? String(body.about_project).trim() : null;
  if (body.what_you_will_do !== undefined) payload.what_you_will_do = Array.isArray(body.what_you_will_do) ? body.what_you_will_do.map((s) => String(s).trim()).filter(Boolean) : [];
  if (body.language_skills !== undefined) payload.language_skills = Array.isArray(body.language_skills) ? body.language_skills.map((s) => String(s).trim()).filter(Boolean) : [];
  if (body.requirements !== undefined) payload.requirements = Array.isArray(body.requirements) ? body.requirements.map((s) => String(s).trim()).filter(Boolean) : [];
  if (body.eligibility_criteria !== undefined) payload.eligibility_criteria = Array.isArray(body.eligibility_criteria) ? body.eligibility_criteria.map((s) => String(s).trim()).filter(Boolean) : [];
  if (body.experience_requirements !== undefined) payload.experience_requirements = body.experience_requirements ? String(body.experience_requirements).trim() : null;
  if (body.equipment_requirements !== undefined) payload.equipment_requirements = body.equipment_requirements ? String(body.equipment_requirements).trim() : null;
  if (body.internet_requirements !== undefined) payload.internet_requirements = body.internet_requirements ? String(body.internet_requirements).trim() : null;

  // Highlights & Benefits
  if (body.project_highlights !== undefined) payload.project_highlights = Array.isArray(body.project_highlights) ? body.project_highlights.map((s) => String(s).trim()).filter(Boolean) : [];
  if (body.benefits !== undefined) payload.benefits = Array.isArray(body.benefits) ? body.benefits.map((s) => String(s).trim()).filter(Boolean) : [];
  if (body.why_join !== undefined) payload.why_join = body.why_join ? String(body.why_join).trim() : null;
  if (body.important_notes !== undefined) payload.important_notes = body.important_notes ? String(body.important_notes).trim() : null;

  // Custom Form Builder Questions & Legacy Features
  if (body.custom_questions !== undefined) payload.custom_questions = Array.isArray(body.custom_questions) ? body.custom_questions : [];
  if (body.features !== undefined) payload.features = Array.isArray(body.features) ? body.features.map((s) => String(s).trim()).filter(Boolean) : [];

  return payload;
};

// 2. CREATE NEW OPPORTUNITY PROGRAM
export const createOpportunity = async (req, res) => {
  try {
    const rawPos = Number(req.body.position);
    let finalPosition = (!rawPos || isNaN(rawPos) || rawPos < 1) ? 1 : rawPos;

    // Shift existing records >= finalPosition by +1
    const { data: existingRows } = await supabase
      .from('opportunities')
      .select('id, position')
      .order('position', { ascending: true });

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      for (let i = 0; i < existingRows.length; i++) {
        const row = existingRows[i];
        const newPos = (i >= finalPosition - 1) ? (i + 2) : (i + 1);
        await supabase.from('opportunities').update({ position: 10000 + newPos }).eq('id', row.id);
      }
      for (let i = 0; i < existingRows.length; i++) {
        const row = existingRows[i];
        const newPos = (i >= finalPosition - 1) ? (i + 2) : (i + 1);
        await supabase.from('opportunities').update({ position: newPos }).eq('id', row.id);
      }
    }

    const newRecord = sanitizeOpportunityPayload(req.body, true, finalPosition);

    const { data, error } = await supabase
      .from('opportunities')
      .insert([newRecord])
      .select();

    if (error) {
      console.error('Supabase insert opportunity error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const createdRecord = data[0];

    // Asynchronously pre-create dedicated sheet tab in Google Sheets for this new project
    ensureOpportunitySheetExists(createdRecord).catch((sheetErr) => {
      console.warn('[Google Sheets Ensure Sheet Note]:', sheetErr.message);
    });

    // AUTOMATIC OPPORTUNITY PUSH NOTIFICATION (Fires ONLY after successful DB insert)
    let notificationSummary = null;
    try {
      const notifRes = await sendZenemooNotification({
        notification_type: 'opportunity_published',
        title: '🎯 New Opportunity Available',
        message: `A new opportunity "${createdRecord.title}" is now available. Check the opportunity details and apply now.`,
        url: `/opportunities`,
        opportunity_id: createdRecord.id,
        target_type: 'broadcast',
      });
      notificationSummary = notifRes?.summary?.formatted_summary;
    } catch (notifErr) {
      console.warn('[Automatic Opportunity Notification Error]:', notifErr.message);
    }

    invalidateOpportunitiesCache();
    // Return updated full list with notification dispatch status
    const { data: fullList } = await supabase.from('opportunities').select('*').order('position', { ascending: true });
    return res.status(201).json({
      status: 'success',
      data: createdRecord,
      opportunities: fullList,
      notification_sent: true,
      notification_summary: notificationSummary || 'Notification sent to active subscribers.',
    });
  } catch (err) {
    console.error('createOpportunity controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 3. UPDATE OPPORTUNITY PROGRAM (Idempotent — NO opportunity notification sent on edits!)
export const updateOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const sanitized = sanitizeOpportunityPayload(req.body, false);
    const updates = { ...sanitized, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('opportunities')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase update opportunity error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const updatedRecord = data[0];

    // Pre-create/verify dedicated sheet tab in Google Sheets
    if (updatedRecord) {
      ensureOpportunitySheetExists(updatedRecord).catch((sheetErr) => {
        console.warn('[Google Sheets Ensure Sheet Note]:', sheetErr.message);
      });
    }

    invalidateOpportunitiesCache();
    const { data: fullList } = await supabase.from('opportunities').select('*').order('position', { ascending: true });
    return res.json({ status: 'success', data: updatedRecord, opportunities: fullList });
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
      await supabase.from('opportunities').update({ position: 10000 + i + 1 }).eq('id', allOps[i].id);
    }
    for (let i = 0; i < allOps.length; i++) {
      await supabase.from('opportunities').update({ position: i + 1 }).eq('id', allOps[i].id);
    }

    invalidateOpportunitiesCache();
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
    if (remaining && remaining.length > 0) {
      for (let i = 0; i < remaining.length; i++) {
        await supabase.from('opportunities').update({ position: 10000 + i + 1 }).eq('id', remaining[i].id);
      }
      for (let i = 0; i < remaining.length; i++) {
        await supabase.from('opportunities').update({ position: i + 1 }).eq('id', remaining[i].id);
      }
    }

    invalidateOpportunitiesCache();
    const { data: fullList } = await supabase.from('opportunities').select('*').order('position', { ascending: true });
    return res.json({ status: 'success', opportunities: fullList });
  } catch (err) {
    console.error('deleteOpportunity controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
