import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseService } from '../services/supabaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERSISTENT_FILE_PATH = path.join(__dirname, '../database/talent_registrations.json');

// Local disk fallback helpers
const loadDiskRegistrations = () => {
  try {
    if (fs.existsSync(PERSISTENT_FILE_PATH)) {
      const data = fs.readFileSync(PERSISTENT_FILE_PATH, 'utf-8');
      if (data) return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Error reading talent_registrations.json:', e.message);
  }
  return [];
};

const saveDiskRegistrations = (list) => {
  try {
    const dir = path.dirname(PERSISTENT_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PERSISTENT_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error writing talent_registrations.json:', e.message);
  }
};

/**
 * PUBLIC API: POST /api/talent-registration/register
 * Submit new candidate/partner registration
 */
export const registerTalent = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      countryCode = '+91',
      state,
      cityDistrict,
      preferredContact = 'WhatsApp',
      primaryRole,
      roleDetails = {},
      hasPreviousExperience = false,
      workCapabilities = [],
      availability = 'Immediately',
      workingPreference = 'Project Basis',
      equipmentResources = {},
      additionalInfo = {},
      consents = {},
      languages = [],
      experiences = [],
    } = req.body;

    // Required Field Validations
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'WhatsApp / Phone number is required.' });
    }
    if (!state || !state.trim()) {
      return res.status(400).json({ success: false, message: 'State selection is required.' });
    }
    if (!cityDistrict || !cityDistrict.trim()) {
      return res.status(400).json({ success: false, message: 'City / District is required.' });
    }
    if (!primaryRole || !primaryRole.trim()) {
      return res.status(400).json({ success: false, message: 'Primary role selection is required.' });
    }
    if (!Array.isArray(languages) || languages.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one language must be selected.' });
    }
    if (!consents?.termsAccepted || !consents?.privacyAccepted) {
      return res.status(400).json({ success: false, message: 'Terms and Privacy Policy agreement is required.' });
    }

    const timestamp = new Date().toISOString();
    const generatedId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const registrationRecord = {
      id: generatedId,
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      country_code: countryCode.trim(),
      state: state.trim(),
      city_district: cityDistrict.trim(),
      preferred_contact: preferredContact,
      primary_role: primaryRole,
      role_details: roleDetails,
      has_previous_experience: Boolean(hasPreviousExperience),
      work_capabilities: Array.isArray(workCapabilities) ? workCapabilities : [],
      availability: availability,
      working_preference: workingPreference,
      equipment_resources: equipmentResources,
      additional_info: additionalInfo,
      consents: {
        ...consents,
        submittedAt: timestamp,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      },
      status: 'pending',
      internal_notes: '',
      internal_scoring: 0,
      is_archived: false,
      created_at: timestamp,
      updated_at: timestamp,
      languages: languages.map((lang) => ({
        language: lang.language,
        proficiency: lang.proficiency || 'Native',
        speaker_availability: lang.speakerAvailability || 'I am a native speaker',
        capacity: Number(lang.capacity) || 1,
      })),
      experiences: Array.isArray(experiences) ? experiences : [],
    };

    // Attempt Supabase Insert
    let savedSupabaseId = null;
    try {
      const dbPayload = {
        full_name: registrationRecord.full_name,
        email: registrationRecord.email,
        phone: registrationRecord.phone,
        country_code: registrationRecord.country_code,
        state: registrationRecord.state,
        city_district: registrationRecord.city_district,
        preferred_contact: registrationRecord.preferred_contact,
        primary_role: registrationRecord.primary_role,
        role_details: registrationRecord.role_details,
        has_previous_experience: registrationRecord.has_previous_experience,
        work_capabilities: registrationRecord.work_capabilities,
        availability: registrationRecord.availability,
        working_preference: registrationRecord.working_preference,
        equipment_resources: registrationRecord.equipment_resources,
        additional_info: registrationRecord.additional_info,
        consents: registrationRecord.consents,
        status: 'pending',
        internal_notes: '',
        internal_scoring: 0,
        is_archived: false,
        created_at: timestamp,
        updated_at: timestamp,
      };

      const inserted = await supabaseService.insert('talent_registrations', dbPayload);
      if (inserted && inserted.id) {
        savedSupabaseId = inserted.id;
        registrationRecord.id = savedSupabaseId;

        // Insert Languages
        for (const langItem of registrationRecord.languages) {
          await supabaseService.insert('talent_languages', {
            registration_id: savedSupabaseId,
            language: langItem.language,
            proficiency: langItem.proficiency,
            speaker_availability: langItem.speaker_availability,
            capacity: langItem.capacity,
            created_at: timestamp,
          });
        }

        // Insert Experiences if available
        if (registrationRecord.has_previous_experience && Array.isArray(experiences)) {
          for (const expItem of experiences) {
            await supabaseService.insert('talent_experiences', {
              registration_id: savedSupabaseId,
              project_company_name: expItem.projectName || expItem.companyName || '',
              type_of_work: expItem.typeOfWork || '',
              languages_used: expItem.languagesUsed || '',
              work_volume: expItem.workVolume || '',
              duration: expItem.duration || '',
              description: expItem.description || '',
              created_at: timestamp,
            });
          }
        }
      }
    } catch (dbErr) {
      console.warn('Supabase talent registration insert warning (falling back to disk):', dbErr.message);
    }

    // Save to local disk backup
    const currentList = loadDiskRegistrations();
    currentList.unshift(registrationRecord);
    saveDiskRegistrations(currentList);

    return res.status(201).json({
      success: true,
      message: 'Registration Submitted Successfully. Information securely recorded for internal project matching.',
      registrationId: registrationRecord.id,
    });
  } catch (err) {
    console.error('registerTalent Server Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Registration submission failed. Please check details and try again.',
    });
  }
};

/**
 * ADMIN API: GET /api/talent-registration/admin/list
 * Multi-filter search & pagination for authorized admins
 */
export const getRegistrationsAdmin = async (req, res) => {
  try {
    const {
      search = '',
      language = '',
      state = '',
      city = '',
      role = '',
      workType = '',
      availability = '',
      minCapacity = '',
      status = '',
      isArchived = 'false',
    } = req.query;

    let items = [];

    // Try Supabase first
    try {
      const records = await supabaseService.selectAll('talent_registrations', 'created_at', false);
      const langs = await supabaseService.selectAll('talent_languages', 'created_at', false);
      const exps = await supabaseService.selectAll('talent_experiences', 'created_at', false);

      if (Array.isArray(records) && records.length > 0) {
        items = records.map((reg) => ({
          ...reg,
          languages: (langs || []).filter((l) => l.registration_id === reg.id),
          experiences: (exps || []).filter((e) => e.registration_id === reg.id),
        }));
      }
    } catch (dbErr) {
      console.warn('Supabase fetch warning, fallback to disk:', dbErr.message);
    }

    // Merge/Fallback with local disk
    if (items.length === 0) {
      items = loadDiskRegistrations();
    }

    // Apply Admin Filters
    let filtered = items.filter((item) => {
      // Archive Filter
      if (isArchived === 'true') {
        if (!item.is_archived) return false;
      } else {
        if (item.is_archived) return false;
      }

      // Status Filter
      if (status && status.toLowerCase() !== 'all') {
        if ((item.status || 'pending').toLowerCase() !== status.toLowerCase()) return false;
      }

      // Search (Name, Email, Phone, State, City, Role, Role Details, Experiences, Capabilities, Equipment, Additional Info)
      if (search && search.trim().length > 0) {
        const q = search.toLowerCase().trim();
        const roleDetailsText = typeof item.role_details === 'object' ? JSON.stringify(item.role_details) : String(item.role_details || '');
        const equipmentText = typeof item.equipment_resources === 'object' ? JSON.stringify(item.equipment_resources) : String(item.equipment_resources || '');
        const addInfoText = typeof item.additional_info === 'object' ? JSON.stringify(item.additional_info) : String(item.additional_info || '');
        const expText = (item.experiences || []).map((e) => `${e.project_company_name || e.projectName || ''} ${e.type_of_work || e.typeOfWork || ''} ${e.description || ''}`).join(' ');
        const langText = (item.languages || []).map((l) => `${l.language} ${l.proficiency} ${l.speaker_availability}`).join(' ');
        const capsText = (item.work_capabilities || []).join(' ');

        const textToMatch = `${item.full_name || ''} ${item.email || ''} ${item.phone || ''} ${item.state || ''} ${item.city_district || ''} ${item.primary_role || ''} ${roleDetailsText} ${equipmentText} ${addInfoText} ${expText} ${langText} ${capsText}`.toLowerCase();
        if (!textToMatch.includes(q)) return false;
      }

      // Language Filter
      if (language && language.trim().length > 0 && language.toLowerCase() !== 'all') {
        const targetLang = language.toLowerCase().trim();
        const hasLang = (item.languages || []).some((l) => (l.language || '').toLowerCase().includes(targetLang));
        if (!hasLang) return false;
      }

      // State Filter
      if (state && state.trim().length > 0 && state.toLowerCase() !== 'all') {
        if ((item.state || '').toLowerCase() !== state.toLowerCase().trim()) return false;
      }

      // City Filter
      if (city && city.trim().length > 0) {
        if (!(item.city_district || '').toLowerCase().includes(city.toLowerCase().trim())) return false;
      }

      // Role Filter
      if (role && role.trim().length > 0 && role.toLowerCase() !== 'all') {
        if ((item.primary_role || '').toLowerCase() !== role.toLowerCase().trim()) return false;
      }

      // Work Type Filter
      if (workType && workType.trim().length > 0 && workType.toLowerCase() !== 'all') {
        const wt = workType.toLowerCase().trim();
        const hasWork = (item.work_capabilities || []).some((c) => (c || '').toLowerCase().includes(wt));
        if (!hasWork) return false;
      }

      // Availability Filter
      if (availability && availability.trim().length > 0 && availability.toLowerCase() !== 'all') {
        if ((item.availability || '').toLowerCase() !== availability.toLowerCase().trim()) return false;
      }

      // Minimum Capacity Filter
      if (minCapacity && !isNaN(Number(minCapacity))) {
        const targetCap = Number(minCapacity);
        const maxCapacityInRecord = Math.max(
          1,
          ...(item.languages || []).map((l) => Number(l.capacity) || 1)
        );
        if (maxCapacityInRecord < targetCap) return false;
      }

      return true;
    });

    // Compute Summary Statistics
    const totalCount = items.length;
    const verifiedCount = items.filter((i) => (i.status || '').toLowerCase() === 'verified').length;
    const pendingCount = items.filter((i) => (i.status || '').toLowerCase() === 'pending' || !i.status).length;
    const coordinatorsCount = items.filter((i) => (i.primary_role || '').toLowerCase().includes('coordinator')).length;
    const vendorsCount = items.filter((i) => (i.primary_role || '').toLowerCase().includes('vendor') || (i.primary_role || '').toLowerCase().includes('agency')).length;
    const singersCount = items.filter((i) => (i.primary_role || '').toLowerCase().includes('singer') || (i.primary_role || '').toLowerCase().includes('vocal')).length;
    const recordingTeamsCount = items.filter((i) => (i.primary_role || '').toLowerCase().includes('recording team')).length;

    const uniqueLanguages = new Set();
    items.forEach((i) => {
      (i.languages || []).forEach((l) => {
        if (l.language) uniqueLanguages.add(l.language.trim());
      });
    });

    return res.status(200).json({
      success: true,
      stats: {
        total: totalCount,
        verified: verifiedCount,
        pending: pendingCount,
        coordinators: coordinatorsCount,
        vendors: vendorsCount,
        singers: singersCount,
        recordingTeams: recordingTeamsCount,
        languageCoverageCount: uniqueLanguages.size,
      },
      count: filtered.length,
      data: filtered,
    });
  } catch (err) {
    console.error('getRegistrationsAdmin Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch talent network registrations.' });
  }
};

/**
 * ADMIN API: GET /api/talent-registration/admin/detail/:id
 */
export const getRegistrationByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    let record = null;

    try {
      record = await supabaseService.selectById('talent_registrations', id);
      if (record) {
        const langs = await supabaseService.selectAll('talent_languages', 'created_at', false);
        const exps = await supabaseService.selectAll('talent_experiences', 'created_at', false);
        const notes = await supabaseService.selectAll('talent_admin_notes', 'created_at', false);

        record.languages = (langs || []).filter((l) => l.registration_id === id);
        record.experiences = (exps || []).filter((e) => e.registration_id === id);
        record.admin_notes_history = (notes || []).filter((n) => n.registration_id === id);
      }
    } catch (e) {}

    if (!record) {
      const diskList = loadDiskRegistrations();
      record = diskList.find((r) => r.id === id) || null;
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Talent registration record not found.' });
    }

    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    console.error('getRegistrationByIdAdmin Error:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving profile detail.' });
  }
};

/**
 * ADMIN API: PATCH /api/talent-registration/admin/status/:id
 */
export const updateRegistrationAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, internal_notes, internal_scoring, is_archived } = req.body;

    const updates = {
      updated_at: new Date().toISOString(),
    };
    if (status) updates.status = status;
    if (internal_notes !== undefined) updates.internal_notes = internal_notes;
    if (internal_scoring !== undefined) updates.internal_scoring = Number(internal_scoring);
    if (is_archived !== undefined) updates.is_archived = Boolean(is_archived);

    try {
      await supabaseService.update('talent_registrations', id, updates);
    } catch (e) {}

    // Also update local disk
    const diskList = loadDiskRegistrations();
    const idx = diskList.findIndex((r) => r.id === id);
    if (idx !== -1) {
      diskList[idx] = { ...diskList[idx], ...updates };
      saveDiskRegistrations(diskList);
    }

    return res.status(200).json({ success: true, message: 'Profile updated successfully.', updates });
  } catch (err) {
    console.error('updateRegistrationAdmin Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile status.' });
  }
};

/**
 * ADMIN API: POST /api/talent-registration/admin/note/:id
 */
export const addAdminNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const adminEmail = req.user?.email || 'admin@zenemoo.in';

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note text cannot be empty.' });
    }

    const notePayload = {
      registration_id: id,
      admin_email: adminEmail,
      note: note.trim(),
      created_at: new Date().toISOString(),
    };

    try {
      await supabaseService.insert('talent_admin_notes', notePayload);
    } catch (e) {}

    // Update disk note history
    const diskList = loadDiskRegistrations();
    const idx = diskList.findIndex((r) => r.id === id);
    if (idx !== -1) {
      if (!diskList[idx].admin_notes_history) diskList[idx].admin_notes_history = [];
      diskList[idx].admin_notes_history.push(notePayload);
      saveDiskRegistrations(diskList);
    }

    return res.status(200).json({ success: true, message: 'Admin note added.', notePayload });
  } catch (err) {
    console.error('addAdminNote Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add admin note.' });
  }
};

/**
 * ADMIN API: GET /api/talent-registration/admin/export
 * Download CSV export of matching resources
 */
export const exportRegistrationsAdmin = async (req, res) => {
  try {
    const diskList = loadDiskRegistrations();

    const headers = [
      'ID',
      'Full Name',
      'Email',
      'Phone',
      'State',
      'City/District',
      'Preferred Contact',
      'Role',
      'Languages & Capacity',
      'Work Capabilities',
      'Availability',
      'Status',
      'Submitted Date',
    ];

    const rows = diskList.map((item) => {
      const langSummary = (item.languages || [])
        .map((l) => `${l.language} (${l.proficiency}, cap:${l.capacity})`)
        .join('; ');
      const caps = (item.work_capabilities || []).join('; ');

      return [
        `"${item.id}"`,
        `"${(item.full_name || '').replace(/"/g, '""')}"`,
        `"${(item.email || '').replace(/"/g, '""')}"`,
        `"${item.country_code || '+91'} ${item.phone || ''}"`,
        `"${(item.state || '').replace(/"/g, '""')}"`,
        `"${(item.city_district || '').replace(/"/g, '""')}"`,
        `"${item.preferred_contact || ''}"`,
        `"${(item.primary_role || '').replace(/"/g, '""')}"`,
        `"${langSummary.replace(/"/g, '""')}"`,
        `"${caps.replace(/"/g, '""')}"`,
        `"${item.availability || ''}"`,
        `"${item.status || 'pending'}"`,
        `"${item.created_at || ''}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=zenemoo_talent_network_${Date.now()}.csv`);
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('exportRegistrationsAdmin Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate CSV export.' });
  }
};
