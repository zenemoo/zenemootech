import { supabase } from '../config/supabase.js';
import { decryptField } from '../utils/cryptoUtils.js';

/**
 * Decrypt any string properties inside an object starting with `ENC:`
 */
const decryptObjectFields = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  for (const key in result) {
    const val = result[key];
    if (typeof val === 'string' && val.startsWith('ENC:')) {
      result[key] = decryptField(val);
    }
  }
  return result;
};

/**
 * Directly sources Employee ID from Supabase `team.employee_id` column.
 * Fallback matches TeamMemberProfilePage.tsx: ZNM- + first 5 chars of member.id
 */
const getEmployeeId = (member, priv) => {
  if (member.employee_id && typeof member.employee_id === 'string' && member.employee_id.trim() !== '') {
    return member.employee_id.trim();
  }
  if (priv && priv.employee_id && typeof priv.employee_id === 'string' && priv.employee_id.trim() !== '') {
    return priv.employee_id.trim();
  }
  // Fallback matching public profile page formula: ZNM- + first 5 chars of record id
  const rawId = String(member.id || '202401').replace(/-/g, '').substring(0, 5).toUpperCase();
  return `ZNM-${rawId}`;
};

/**
 * GET /api/directory/members
 * Role-sanitized Enterprise Team Directory endpoint with 100% decrypted data.
 */
export const getTeamDirectoryMembers = async (req, res) => {
  try {
    const userRole = req.user?.role || 'team';

    // 1. Fetch all members from primary `team` table in Supabase
    let teamQuery = supabase
      ? supabase.from('team').select('*').order('position', { ascending: true })
      : null;

    let teamMembers = [];
    if (teamQuery) {
      const { data, error } = await teamQuery;
      if (!error && data) {
        teamMembers = data;
      }
    }

    // 2. Fetch all private profiles from `employee_private_profiles`
    let privateProfilesMap = {};
    if (supabase) {
      const { data: privData, error: privError } = await supabase
        .from('employee_private_profiles')
        .select('*');

      if (!privError && privData) {
        privData.forEach((p) => {
          const decryptedP = decryptObjectFields(p);
          if (decryptedP.team_member_id) privateProfilesMap[decryptedP.team_member_id] = decryptedP;
          if (decryptedP.employee_id) privateProfilesMap[decryptedP.employee_id] = decryptedP;
          if (decryptedP.email) privateProfilesMap[decryptedP.email.toLowerCase()] = decryptedP;
          if (decryptedP.personal_email) privateProfilesMap[decryptedP.personal_email.toLowerCase()] = decryptedP;
        });
      }
    }

    // 3. Merge and sanitize fields based on User Role (Enforced on Backend)
    const sanitizedDirectory = teamMembers.map((member) => {
      const rawPriv =
        privateProfilesMap[member.id] ||
        privateProfilesMap[member.employee_id] ||
        (member.email ? privateProfilesMap[member.email.toLowerCase()] : null);

      const priv = rawPriv ? decryptObjectFields(rawPriv) : null;
      const explicitEmployeeId = getEmployeeId(member, priv);

      // Base Public Record (Visible to Team Members, HR, Admin)
      const publicData = {
        id: member.id,
        employee_id: explicitEmployeeId,
        position_num: member.position || 0,
        position: member.position_title || member.position || member.designation || 'Specialist',
        name: member.name,
        photo: member.image_url || member.photo || '/assets/executive.png',
        designation: member.designation || 'Specialist',
        department: member.department || 'Engineering',
        badge: member.badge || 'Team Member',
        skills: member.skills || [],
        public_bio: member.bio || member.public_bio || '',
        company_email: member.email || '',
        company_phone: member.company_phone || member.phone || '',
        joining_date: member.joining_date || member.created_at || 'Active Roster',
        status: member.status || 'Active',
        is_private_profile_completed: !!priv,
      };

      // TEAM MEMBER ROLE: Return Public Data ONLY
      if (userRole !== 'admin' && userRole !== 'hr') {
        return publicData;
      }

      // HR ROLE: Return Operational Details (Personal Mobile, Personal Email, Address, Emergency), Redact Financial Details
      if (userRole === 'hr') {
        return {
          ...publicData,
          personal_phone: priv?.personal_mobile || priv?.phone_number || priv?.mobile_number || priv?.alternate_mobile || '',
          personal_email: priv?.personal_email || priv?.personal_mail || '',
          address_current: priv?.current_address || priv?.address || '',
          address_permanent: priv?.permanent_address || '',
          emergency_contact_person: priv?.emergency_contact_name || priv?.emergency_contact_person || priv?.emergency_contact || '',
          emergency_contact_phone: priv?.emergency_contact_number || priv?.emergency_contact_phone || '',
          emergency_relationship: priv?.relationship || priv?.emergency_relationship || '',
          languages: Array.isArray(priv?.languages_known)
            ? priv.languages_known
            : (priv?.languages_known || '').split(',').map((s) => s.trim()).filter(Boolean),
          dob: priv?.date_of_birth || priv?.dob || '',
          blood_group: priv?.blood_group || '',
          experience: priv?.years_of_experience || priv?.experience || '',
          linkedin_url: priv?.linkedin_profile || priv?.linkedin_url || '',
          github_url: priv?.github_profile || priv?.github_url || '',
          portfolio_url: priv?.portfolio_website || priv?.portfolio_url || '',
          private_bio: priv?.professional_bio || priv?.private_bio || '',
          // FINANCIAL FIELDS REDACTED / MASKED FOR HR
          bank_account_number: priv?.account_number || priv?.bank_account_number ? '•••• •••• ' + String(priv.account_number || priv.bank_account_number).slice(-4) : '',
          ifsc_code: '•••• (Restricted)',
          pan_number: '•••• (Restricted)',
          upi_id: priv?.upi_id ? '••••@upi (Restricted)' : '',
        };
      }

      // ADMIN ROLE: Return Full Decrypted Unrestricted Dataset
      return {
        ...publicData,
        personal_phone: priv?.personal_mobile || priv?.phone_number || priv?.mobile_number || priv?.alternate_mobile || '',
        personal_email: priv?.personal_email || priv?.personal_mail || '',
        address_current: priv?.current_address || priv?.address || '',
        address_permanent: priv?.permanent_address || '',
        emergency_contact_person: priv?.emergency_contact_name || priv?.emergency_contact_person || priv?.emergency_contact || '',
        emergency_contact_phone: priv?.emergency_contact_number || priv?.emergency_contact_phone || '',
        emergency_relationship: priv?.relationship || priv?.emergency_relationship || '',
        languages: Array.isArray(priv?.languages_known)
          ? priv.languages_known
          : (priv?.languages_known || '').split(',').map((s) => s.trim()).filter(Boolean),
        dob: priv?.date_of_birth || priv?.dob || '',
        blood_group: priv?.blood_group || '',
        experience: priv?.years_of_experience || priv?.experience || '',
        linkedin_url: priv?.linkedin_profile || priv?.linkedin_url || '',
        github_url: priv?.github_profile || priv?.github_url || '',
        portfolio_url: priv?.portfolio_website || priv?.portfolio_url || '',
        private_bio: priv?.professional_bio || priv?.private_bio || '',
        // FULL UNMASKED DECRYPTED FINANCIAL DETAILS FOR ADMIN
        bank_name: priv?.bank_name || '',
        account_holder: priv?.account_holder_name || member.name,
        bank_account_number: priv?.account_number || priv?.bank_account_number || '',
        ifsc_code: priv?.ifsc_code || '',
        pan_number: priv?.pan_number || '',
        upi_id: priv?.upi_id || '',
      };
    });

    return res.json({
      success: true,
      role: userRole,
      count: sanitizedDirectory.length,
      data: sanitizedDirectory,
    });
  } catch (error) {
    console.error('Error fetching team directory members:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch team directory members',
      error: error.message,
    });
  }
};
