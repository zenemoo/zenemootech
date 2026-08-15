import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseService } from '../services/supabaseService.js';
import { sendMailViaBrevo } from '../services/emailService.js';

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

const generateRandomAlphanumericSegment = (length = 4) => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateUniqueRegistrationCode = (existingCodes = new Set()) => {
  let attempts = 0;
  while (attempts < 100) {
    const part1 = generateRandomAlphanumericSegment(4);
    const part2 = generateRandomAlphanumericSegment(4);
    const code = `ZEN-${part1}-${part2}`;
    if (!existingCodes.has(code)) {
      return code;
    }
    attempts++;
  }
  return `ZEN-${Date.now().toString(36).toUpperCase().substring(0, 4)}-${generateRandomAlphanumericSegment(4)}`;
};

/**
 * PUBLIC API: POST /api/talent-registration/register
 * Submit new candidate/partner registration
 */
export const registerTalent = async (req, res) => {
  try {
    const {
      fullName,
      gender = 'Male',
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
    if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Please select a valid gender selection (Male, Female, or Other).' });
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

    const normalizedEmail = email.trim().toLowerCase();

    // ── SECURITY CHECK: DUPLICATE EMAIL VERIFICATION ──
    const existingCodes = new Set();
    try {
      const existingDbRecords = await supabaseService.selectAll('talent_registrations');
      (existingDbRecords || []).forEach((r) => {
        if (r.registration_code) existingCodes.add(r.registration_code);
        if (r.id) existingCodes.add(r.id);
      });

      const duplicateDb = (existingDbRecords || []).find((r) => (r.email || '').toLowerCase() === normalizedEmail);
      if (duplicateDb) {
        return res.status(400).json({
          success: false,
          isDuplicate: true,
          message: `The email address "${normalizedEmail}" is already registered in our Zenemoo AI Data Talent & Partner Network. If you need to update your details or availability, please contact contact@zenemoo.in.`,
        });
      }
    } catch (err) {}

    const diskList = loadDiskRegistrations();
    diskList.forEach((r) => {
      if (r.registration_code) existingCodes.add(r.registration_code);
      if (r.id) existingCodes.add(r.id);
    });

    const duplicateDisk = diskList.find((r) => (r.email || '').toLowerCase() === normalizedEmail);
    if (duplicateDisk) {
      return res.status(400).json({
        success: false,
        isDuplicate: true,
        message: `The email address "${normalizedEmail}" is already registered in our Zenemoo AI Data Talent & Partner Network. If you need to update your details or availability, please contact contact@zenemoo.in.`,
      });
    }

    const timestamp = new Date().toISOString();
    // ── GENERATE STRICTLY UNIQUE ALPHANUMERIC REGISTRATION CODE (ZEN-XXXX-XXXX) ──
    const registrationCode = generateUniqueRegistrationCode(existingCodes);
    const generatedId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const registrationRecord = {
      id: generatedId,
      registration_code: registrationCode,
      full_name: fullName.trim(),
      gender: gender.trim(),
      email: normalizedEmail,
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
        registration_code: registrationRecord.registration_code,
        full_name: registrationRecord.full_name,
        gender: registrationRecord.gender,
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
    diskList.unshift(registrationRecord);
    saveDiskRegistrations(diskList);

    // ── DISPATCH CONFIRMATION EMAIL TO APPLICANT ONLY (NO ADMIN EMAILS SENT) ──
    try {
      const langSummary = languages.map((l) => `${l.language} (${l.proficiency})`).join(', ');

      const applicantHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zenemoo AI Data Network Registration</title>
</head>
<body style="margin:0; padding:0; background-color:#050505; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#050505; padding:30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#0d0f17; border:1px solid #1e293b; border-radius:16px; overflow:hidden; box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="padding:32px 24px; background:linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #9333ea 100%); text-align:center;">
              <h1 style="margin:0; font-size:26px; font-weight:800; color:#ffffff; letter-spacing:1.5px; text-transform:uppercase;">ZENEMOO</h1>
              <p style="margin:6px 0 0 0; font-size:12px; color:#e0f2fe; text-transform:uppercase; letter-spacing:2px; font-weight:600;">AI Data Talent &amp; Partner Network</p>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding:32px 24px;">
              <h2 style="margin:0 0 16px 0; font-size:18px; color:#ffffff; font-weight:700;">Registration Confirmed ✓</h2>
              <p style="margin:0 0 20px 0; font-size:14px; line-height:1.6; color:#94a3b8;">
                Dear <strong style="color:#ffffff;">${fullName.trim()}</strong>,<br>
                Thank you for submitting your application to the <strong>Zenemoo AI Data Network</strong>. Your profile details have been securely recorded into our internal project matching engine.
              </p>
              
              <!-- Unique Tracking Code Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0; background-color:#061826; border:1px solid #0891b2; border-radius:12px; text-align:center; padding:18px;">
                <tr>
                  <td>
                    <span style="font-size:11px; text-transform:uppercase; color:#22d3ee; letter-spacing:1px; display:block; font-weight:700; margin-bottom:6px;">Your Unique Registration Tracking ID</span>
                    <span style="font-size:24px; font-weight:900; color:#ffffff; font-family:'Courier New', Courier, monospace; letter-spacing:3px;">${registrationCode}</span>
                  </td>
                </tr>
              </table>

              <!-- Registration Summary -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0; background-color:#161926; border-radius:12px; padding:18px;">
                <tr>
                  <td style="padding:6px 0; font-size:13px; color:#94a3b8; width:40%;">Primary Role:</td>
                  <td style="padding:6px 0; font-size:13px; color:#ffffff; font-weight:700;">${primaryRole}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; font-size:13px; color:#94a3b8;">Location:</td>
                  <td style="padding:6px 0; font-size:13px; color:#ffffff; font-weight:700;">${state.trim()}, ${cityDistrict.trim()}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; font-size:13px; color:#94a3b8;">Languages:</td>
                  <td style="padding:6px 0; font-size:13px; color:#38bdf8; font-weight:700;">${langSummary}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; font-size:13px; color:#94a3b8;">Availability:</td>
                  <td style="padding:6px 0; font-size:13px; color:#4ade80; font-weight:700;">${availability}</td>
                </tr>
              </table>

              <!-- Confidentiality Notice -->
              <div style="background-color:#1e1b4b; border-left:4px solid #818cf8; padding:14px 16px; border-radius:8px; margin-bottom:24px;">
                <p style="margin:0; font-size:12px; color:#c7d2fe; line-height:1.5;">
                  🔒 <strong>Strict Privacy Protection:</strong> Your submitted profile is confidential and used ONLY by authorized Zenemoo administrators for project recruitment matching. Profiles are never displayed publicly anywhere.
                </p>
              </div>

              <p style="margin:0; font-size:13px; color:#94a3b8; line-height:1.5;">
                If you need to update your details, please contact our team at <a href="mailto:contact@zenemoo.in" style="color:#38bdf8; text-decoration:none; font-weight:600;">contact@zenemoo.in</a> referencing your Tracking ID (<strong>${registrationCode}</strong>).
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px; background-color:#07080c; border-top:1px solid #1e293b; text-align:center; font-size:11px; color:#64748b; line-height:1.6;">
              Zenemoo Enterprise AI Language &amp; Data Solutions<br>
              K. Barida, Main Road, Odisha, India – 761031 | <a href="https://www.zenemoo.in" style="color:#64748b; text-decoration:underline;">www.zenemoo.in</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const sender = process.env.EMAIL_FROM || 'Zenemoo AI Network <contact@zenemoo.in>';
      await sendMailViaBrevo({
        sender,
        recipients: normalizedEmail,
        subject: `Zenemoo AI Data Network — Registration Confirmation [ID: ${registrationCode}]`,
        html: applicantHtml,
      });
    } catch (mailErr) {
      console.error('Applicant confirmation email dispatch error:', mailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Registration Submitted Successfully. Information securely recorded for internal project matching.',
      registrationId: registrationRecord.id,
      registrationCode: registrationCode,
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

/**
 * ADMIN API: DELETE /api/talent-registration/admin/delete/:id
 * Permanently delete candidate registration from Supabase DB & local disk
 */
export const deleteRegistrationAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Registration ID parameter is required.' });
    }

    // 1. Delete child & parent rows in Supabase Database
    try {
      const allDbRecords = await supabaseService.selectAll('talent_registrations').catch(() => []);
      const targetDbRecord = (allDbRecords || []).find(
        (r) => r.id === id || r.registration_code === id || (r.email || '').toLowerCase() === id.toLowerCase()
      );

      const targetId = targetDbRecord ? targetDbRecord.id : id;

      await supabaseService.deleteByField('talent_languages', 'registration_id', targetId).catch(() => {});
      await supabaseService.deleteByField('talent_experiences', 'registration_id', targetId).catch(() => {});
      await supabaseService.deleteByField('talent_admin_notes', 'registration_id', targetId).catch(() => {});
      await supabaseService.delete('talent_registrations', targetId).catch(() => {});

      if (targetDbRecord && targetDbRecord.registration_code) {
        await supabaseService.deleteByField('talent_registrations', 'registration_code', targetDbRecord.registration_code).catch(() => {});
      }
    } catch (dbErr) {
      console.warn('Supabase delete error (continuing local disk delete):', dbErr.message);
    }

    // 2. Delete from Local Disk persistent store
    const diskList = loadDiskRegistrations();
    const filteredDisk = diskList.filter(
      (item) => item.id !== id && item.registration_code !== id && (item.email || '').toLowerCase() !== id.toLowerCase()
    );
    saveDiskRegistrations(filteredDisk);

    return res.status(200).json({
      success: true,
      message: 'Registration record permanently deleted from database and local disk.',
    });
  } catch (err) {
    console.error('deleteRegistrationAdmin Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete registration record.',
    });
  }
};
