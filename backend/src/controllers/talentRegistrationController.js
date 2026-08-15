import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseService } from '../services/supabaseService.js';
import { sendMailViaBrevo } from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERSISTENT_FILE_PATH = path.join(__dirname, '../database/talent_registrations.json');

const formatIstDateTime = (isoDateString) => {
  try {
    const d = isoDateString ? new Date(isoDateString) : new Date();
    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    };
    const formatted = d.toLocaleString('en-IN', options);
    return `${formatted} (IST)`;
  } catch (_) {
    return `${new Date().toLocaleDateString('en-IN')} (IST)`;
  }
};

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
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Zenemoo AI Data Network Registration — Confirmation [ID: ${registrationCode}]</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    
    @media screen and (max-width: 620px) {
      .email-wrapper { padding: 10px 8px !important; }
      .container-table { width: 100% !important; max-width: 100% !important; border-radius: 12px !important; }
      .content-padding { padding: 20px 16px !important; }
      .header-title { font-size: 20px !important; line-height: 1.3 !important; }
      .app-id-text { font-size: 18px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; -webkit-font-smoothing:antialiased;">
  <!-- Outer Corporate Wrapper Table -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-wrapper" style="background-color:#f1f5f9; padding: 30px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container Card (Centered 620px Max Width) -->
        <table role="presentation" class="container-table" width="620" border="0" cellspacing="0" cellpadding="0" style="width:620px; max-width:620px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.08); border: 1px solid #cbd5e1; margin:0 auto;">
          
          <!-- 1. ZENEMOO BRAND HEADER -->
          <tr>
            <td style="background-color:#090d16; background-image: linear-gradient(135deg, #090d16 0%, #0f172a 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #06b6d4;">
              <a href="https://www.zenemoo.in" target="_blank" style="text-decoration:none; display:inline-block;">
                <img src="https://raw.githubusercontent.com/zenemoo/zenemootech/main/frontend/public/assets/logo-email.png"
                     srcset="https://www.zenemoo.in/assets/logo-email.png 1x, https://www.zenemoo.in/assets/logo.png 2x"
                     width="56"
                     height="56"
                     alt="Zenemoo"
                     style="display:block; margin:0 auto; width:56px; height:56px; max-width:56px; border-radius:50%; background:#ffffff; padding:2px; border:2px solid #06b6d4; object-fit:cover;">
              </a>
              <div style="font-family:'Segoe UI', Arial, sans-serif; font-size:22px; font-weight:800; color:#ffffff; letter-spacing:2px; margin-top:10px;">
                ZENEMOO
              </div>
              <div style="font-family: monospace; font-size:10px; color:#38bdf8; letter-spacing:2.5px; text-transform:uppercase; margin-top:3px;">
                AI DATA TALENT &amp; PARTNER NETWORK
              </div>
            </td>
          </tr>

          <!-- 2. ACKNOWLEDGMENT HEADING -->
          <tr>
            <td class="content-padding" style="padding: 32px 32px 20px 32px; background-color:#ffffff;">
              <h1 class="header-title" style="margin:0 0 10px 0; font-size:24px; font-weight:800; color:#0f172a; line-height:1.3;">
                Registration Confirmed ✓
              </h1>
              <p style="margin:0 0 8px 0; font-size:15px; font-weight:600; color:#0284c7;">
                Dear ${fullName.trim()},
              </p>
              <p style="margin:0 0 10px 0; font-size:14px; color:#475569; line-height:1.6;">
                Thank you for registering with the <strong style="color:#0f172a;">Zenemoo AI Data Talent &amp; Partner Network</strong>. Your profile details and technical capabilities have been recorded into our internal project matching system.
              </p>
              <p style="margin:0; font-size:13px; color:#64748b; line-height:1.5;">
                Please save your unique tracking code below for any future profile updates or correspondence with our team.
              </p>
            </td>
          </tr>

          <!-- 3. UNIQUE TRACKING ID CARD -->
          <tr>
            <td class="content-padding" style="padding: 0 32px 20px 32px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f0f9ff; border:1px solid #bae6fd; border-radius:12px; margin-bottom:12px;">
                <tr>
                  <td style="padding:20px; text-align:center;">
                    <div style="font-size:11px; font-family:monospace; font-weight:bold; color:#0284c7; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">
                      YOUR UNIQUE REGISTRATION TRACKING ID
                    </div>
                    <div class="app-id-text" style="font-size:24px; font-weight:900; font-family:monospace; color:#0369a1; letter-spacing:3px; background:#ffffff; padding:10px 16px; border-radius:8px; border:1px solid #93c5fd; display:inline-block;">
                      ${registrationCode}
                    </div>
                    <div style="font-size:11px; color:#64748b; margin-top:8px;">
                      Recorded on: <strong style="color:#334155;">${formatIstDateTime(timestamp)}</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CANDIDATE PROFILE SUMMARY CARD -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                <tr>
                  <td style="padding:20px;">
                    <div style="font-size:13px; font-weight:800; color:#0f172a; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px;">
                      Registration Details Summary
                    </div>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:13px; color:#475569;">
                      <tr>
                        <td width="38%" style="padding:6px 0; color:#64748b; font-weight:600;">Full Name:</td>
                        <td style="padding:6px 0; color:#0f172a; font-weight:700;">${fullName.trim()}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#64748b; font-weight:600;">Gender:</td>
                        <td style="padding:6px 0; color:#0f172a; font-weight:700;">${gender}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#64748b; font-weight:600;">Primary Role:</td>
                        <td style="padding:6px 0; color:#0284c7; font-weight:700;">${primaryRole}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#64748b; font-weight:600;">Location:</td>
                        <td style="padding:6px 0; color:#0f172a; font-weight:700;">${state.trim()}, ${cityDistrict.trim()}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#64748b; font-weight:600;">Languages:</td>
                        <td style="padding:6px 0; color:#0369a1; font-weight:700;">${langSummary}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#64748b; font-weight:600;">Availability:</td>
                        <td style="padding:6px 0; color:#16a34a; font-weight:700;">${availability} (${workingPreference})</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 4. CONFIDENTIALITY & PRIVACY NOTICE CARD -->
          <tr>
            <td class="content-padding" style="padding: 0 32px 24px 32px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f5f3ff; border:1px solid #ddd6fe; border-radius:12px; padding:16px;">
                <tr>
                  <td>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="30" valign="top" style="padding-right:10px;">
                          <div style="font-size:20px;">🔒</div>
                        </td>
                        <td valign="top">
                          <div style="font-size:11px; font-family:monospace; font-weight:bold; color:#6d28d9; text-transform:uppercase; letter-spacing:0.5px;">
                            STRICT PRIVACY PROTECTION GUARANTEE
                          </div>
                          <div style="font-size:12px; color:#5b21b6; margin-top:4px; line-height:1.5;">
                            Your profile is confidential and used ONLY by authorized Zenemoo administrators for project matching and recruitment coordination. Profiles are never displayed publicly anywhere.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 5. WHAT HAPPENS NEXT & NEED HELP CARDS -->
          <tr>
            <td class="content-padding" style="padding: 0 32px 28px 32px;">
              
              <!-- WHAT HAPPENS NEXT -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:12px;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:10px;">What Happens Next?</div>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:12px; color:#475569;">
                      <tr>
                        <td width="20" valign="top" style="padding-bottom:8px; color:#10b981; font-weight:bold;">✓</td>
                        <td style="padding-bottom:8px; line-height:1.4;">Our team indexes your profile by language, role, and location.</td>
                      </tr>
                      <tr>
                        <td width="20" valign="top" style="padding-bottom:8px; color:#3b82f6; font-weight:bold;">✓</td>
                        <td style="padding-bottom:8px; line-height:1.4;">When a relevant AI data or annotation project matches your skillset, our team contacts you directly via WhatsApp or Email.</td>
                      </tr>
                      <tr>
                        <td width="20" valign="top" style="color:#8b5cf6; font-weight:bold;">✓</td>
                        <td style="line-height:1.4;">If you need to update your contact or availability details, contact <a href="mailto:contact@zenemoo.in" style="color:#0284c7; text-decoration:none; font-weight:600;">contact@zenemoo.in</a> with your tracking ID.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- NEED HELP -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:4px;">Need Help?</div>
                    <div style="font-size:11px; color:#64748b; margin-bottom:8px;">If you have any questions, feel free to reach us:</div>
                    <div style="font-size:11px; font-family:monospace; line-height:1.8; color:#0f172a;">
                      &bull; Contact: <a href="mailto:contact@zenemoo.in" style="color:#0284c7; text-decoration:none;">contact@zenemoo.in</a><br>
                      &bull; Support: <a href="mailto:support@zenemoo.in" style="color:#0284c7; text-decoration:none;">support@zenemoo.in</a><br>
                      &bull; Website: <a href="https://www.zenemoo.in" target="_blank" style="color:#0284c7; text-decoration:none; font-weight:bold;">www.zenemoo.in</a>
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- 6. OFFICIAL FOOTER BANNER WITH SOCIAL MEDIA ICONS -->
          <tr>
            <td style="background-color:#f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <div style="font-size:13px; font-weight:700; color:#0f172a; margin-bottom:3px;">
                Building the future with <span style="color:#0284c7;">AI and People</span>.
              </div>

              <!-- Official Real Social Media Icons -->
              <div style="margin:12px 0;">
                <a href="https://www.linkedin.com/company/zenemoo/" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo LinkedIn">
                  <img src="https://img.icons8.com/color/36/000000/linkedin.png" width="22" height="22" alt="LinkedIn" style="width:22px; height:22px; vertical-align:middle;">
                </a>
                <a href="https://x.com/zenemooofficial" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo X">
                  <img src="https://img.icons8.com/color/36/000000/twitter--v1.png" width="22" height="22" alt="X (Twitter)" style="width:22px; height:22px; vertical-align:middle;">
                </a>
                <a href="https://www.instagram.com/zenemooofficial" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo Instagram">
                  <img src="https://img.icons8.com/color/36/000000/instagram-new.png" width="22" height="22" alt="Instagram" style="width:22px; height:22px; vertical-align:middle;">
                </a>
                <a href="https://www.youtube.com/channel/UCj8ryPiPOeM_HrWqkNsFkTg" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo YouTube">
                  <img src="https://img.icons8.com/color/36/000000/youtube-play.png" width="22" height="22" alt="YouTube" style="width:22px; height:22px; vertical-align:middle;">
                </a>
                <a href="https://whatsapp.com/channel/0029Vb8VOTHGOj9eWQiiPs08" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo WhatsApp">
                  <img src="https://img.icons8.com/color/36/000000/whatsapp.png" width="22" height="22" alt="WhatsApp" style="width:22px; height:22px; vertical-align:middle;">
                </a>
              </div>

              <!-- Links -->
              <div style="font-size:11px; font-family:monospace; color:#64748b; margin-bottom:10px;">
                <a href="https://www.zenemoo.in/#privacy" target="_blank" style="color:#0284c7; text-decoration:none;">Privacy Policy</a> &bull; 
                <a href="https://www.zenemoo.in/#terms" target="_blank" style="color:#0284c7; text-decoration:none;">Terms &amp; Conditions</a> &bull; 
                <a href="https://www.zenemoo.in" target="_blank" style="color:#0284c7; text-decoration:none;">Official Site</a>
              </div>

              <div style="font-size:10px; font-family:monospace; color:#94a3b8; line-height:1.4;">
                This is an automated confirmation email from Zenemoo regarding your registration.<br>
                Please do not reply directly to this automated email.<br>
                &copy; 2026 Zenemoo Enterprise AI Data Solutions. All rights reserved.
              </div>
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
