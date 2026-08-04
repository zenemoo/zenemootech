import { supabase } from '../config/supabase.js';

/**
 * GET /api/directory/members
 * Role-sanitized Enterprise Team Directory endpoint.
 */
export const getTeamDirectoryMembers = async (req, res) => {
  try {
    const userRole = req.user?.role || 'team';

    // 1. Fetch all members from primary `team` table
    let teamQuery = supabase
      ? supabase.from('team').select('*').order('created_at', { ascending: false })
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
          if (p.team_member_id) privateProfilesMap[p.team_member_id] = p;
          if (p.employee_id) privateProfilesMap[p.employee_id] = p;
          if (p.email) privateProfilesMap[p.email.toLowerCase()] = p;
        });
      }
    }

    // 3. Merge and sanitize fields based on User Role (Enforced on Backend)
    const sanitizedDirectory = teamMembers.map((member) => {
      const priv =
        privateProfilesMap[member.id] ||
        privateProfilesMap[member.employee_id] ||
        (member.email ? privateProfilesMap[member.email.toLowerCase()] : null);

      // Base Public Record (Visible to Team Members, HR, Admin)
      const publicData = {
        id: member.id,
        employee_id: member.employee_id || 'ZNM-E861',
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

      // HR ROLE: Return Operational Details (Phone, Email, Address, Emergency), Redact Financial Details
      if (userRole === 'hr') {
        return {
          ...publicData,
          personal_phone: priv?.phone_number || priv?.personal_phone || member.phone || '',
          personal_email: priv?.personal_email || '',
          address_current: priv?.current_address || priv?.address || '',
          address_permanent: priv?.permanent_address || '',
          emergency_contact_person: priv?.emergency_contact_person || priv?.emergency_contact || '',
          emergency_contact_phone: priv?.emergency_contact_phone || '',
          emergency_relationship: priv?.emergency_relationship || '',
          languages: priv?.languages || [],
          dob: priv?.date_of_birth || priv?.dob || '',
          blood_group: priv?.blood_group || '',
          experience: priv?.experience || '',
          linkedin_url: priv?.linkedin_url || '',
          github_url: priv?.github_url || '',
          portfolio_url: priv?.portfolio_url || '',
          private_bio: priv?.private_bio || '',
          // FINANCIAL FIELDS REDACTED / MASKED FOR HR
          bank_account_number: priv?.bank_account_number ? '•••• •••• ' + priv.bank_account_number.slice(-4) : 'Not Provided',
          ifsc_code: '•••• (Restricted)',
          pan_number: '•••• (Restricted)',
          upi_id: priv?.upi_id ? '••••@upi (Restricted)' : '',
        };
      }

      // ADMIN ROLE: Return Full Unrestricted Dataset
      return {
        ...publicData,
        personal_phone: priv?.phone_number || priv?.personal_phone || member.phone || '',
        personal_email: priv?.personal_email || '',
        address_current: priv?.current_address || priv?.address || '',
        address_permanent: priv?.permanent_address || '',
        emergency_contact_person: priv?.emergency_contact_person || priv?.emergency_contact || '',
        emergency_contact_phone: priv?.emergency_contact_phone || '',
        emergency_relationship: priv?.emergency_relationship || '',
        languages: priv?.languages || [],
        dob: priv?.date_of_birth || priv?.dob || '',
        blood_group: priv?.blood_group || '',
        experience: priv?.experience || '',
        linkedin_url: priv?.linkedin_url || '',
        github_url: priv?.github_url || '',
        portfolio_url: priv?.portfolio_url || '',
        private_bio: priv?.private_bio || '',
        // FULL UNMASKED FINANCIAL DETAILS FOR ADMIN
        bank_name: priv?.bank_name || '',
        account_holder: priv?.account_holder_name || member.name,
        bank_account_number: priv?.bank_account_number || '',
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
