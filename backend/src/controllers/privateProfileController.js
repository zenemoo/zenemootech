import { supabase } from '../config/supabase.js';
import {
  encryptSensitiveFields,
  decryptSensitiveFields,
  SENSITIVE_PROFILE_FIELDS,
} from '../utils/cryptoUtils.js';

// In-memory fallback cache for private profiles
const memoryPrivateProfiles = new Map();

/**
 * Calculates dynamic profile completion breakdown (0-100%) and actionable recommendations
 */
export function calculateProfileCompletion(data = {}) {
  const categories = {
    personal: {
      weight: 20,
      fields: ['date_of_birth', 'gender', 'blood_group', 'marital_status', 'nationality', 'languages_known', 'personal_email', 'personal_mobile'],
    },
    address: {
      weight: 20,
      fields: ['current_address', 'permanent_address', 'city', 'district', 'state', 'country', 'pin_code'],
    },
    professional: {
      weight: 20,
      fields: ['professional_bio', 'technical_skills', 'certifications', 'years_of_experience', 'current_role_summary', 'areas_of_expertise', 'linkedin_profile', 'portfolio_website'],
    },
    banking: {
      weight: 20,
      fields: ['account_holder_name', 'bank_name', 'account_number', 'ifsc_code', 'branch_name', 'upi_id'],
    },
    emergency: {
      weight: 20,
      fields: ['emergency_contact_name', 'relationship', 'emergency_contact_number', 'hobbies', 'about_me'],
    },
  };

  let totalScore = 0;
  const categoryScores = {};
  const suggestions = [];

  for (const [catKey, catObj] of Object.entries(categories)) {
    const filledCount = catObj.fields.filter((f) => {
      const val = data[f];
      return val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '[Protected Field]';
    }).length;

    const catPct = Math.round((filledCount / catObj.fields.length) * 100);
    const catContribution = Math.round((filledCount / catObj.fields.length) * catObj.weight);

    categoryScores[catKey] = {
      score: catPct,
      filled: filledCount,
      total: catObj.fields.length,
    };

    totalScore += catContribution;

    // Smart Suggestions
    if (catPct < 100) {
      if (catKey === 'personal') suggestions.push('Complete Personal Details (DOB, Mobile, Personal Email) to improve identity completeness.');
      else if (catKey === 'address') suggestions.push('Add full Address & PIN code for company record verification.');
      else if (catKey === 'professional') suggestions.push('Add Professional Bio, Skills, and LinkedIn link to showcase your background.');
      else if (catKey === 'banking') suggestions.push('Provide Banking Information (Bank Name, Account #, IFSC) for secure payroll processing.');
      else if (catKey === 'emergency') suggestions.push('Fill in Emergency Contact details for workplace safety compliance.');
    }
  }

  const finalPercentage = Math.min(100, totalScore);

  let statusLabel = 'Needs More Information';
  if (finalPercentage >= 90) statusLabel = 'Exceptional';
  else if (finalPercentage >= 75) statusLabel = 'Excellent';
  else if (finalPercentage >= 50) statusLabel = 'Good Progress';

  return {
    percentage: finalPercentage,
    statusLabel,
    categoryScores,
    suggestions,
  };
}

/**
 * GET /api/team/private-profile/me
 * Fetches the authenticated user's private employee profile (decrypting sensitive fields)
 */
export const getMyPrivateProfile = async (req, res, next) => {
  try {
    const teamMemberId = req.user?.team_member_id || req.user?.id;
    const userAccountId = req.user?.id;

    if (!teamMemberId && !userAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to identify team member account context.',
      });
    }

    let profileRecord = null;

    // 1. Query Supabase
    if (supabase) {
      try {
        let query = supabase.from('employee_private_profiles').select('*');
        if (teamMemberId) {
          query = query.eq('team_member_id', teamMemberId);
        } else {
          query = query.eq('user_account_id', userAccountId);
        }
        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          profileRecord = data;
        }
      } catch (e) {
        console.warn('Supabase private profile fetch warning:', e.message);
      }
    }

    // 2. Memory Fallback
    if (!profileRecord) {
      const memKey = teamMemberId || userAccountId;
      profileRecord = memoryPrivateProfiles.get(memKey) || null;
    }

    if (!profileRecord) {
      // Default empty structured template
      const emptyProfile = {
        team_member_id: teamMemberId || '',
        user_account_id: userAccountId || '',
        personal_email: '',
        personal_mobile: '',
        alternate_mobile: '',
        date_of_birth: '',
        gender: '',
        blood_group: '',
        marital_status: '',
        nationality: 'Indian',
        languages_known: '',
        current_address: '',
        permanent_address: '',
        city: '',
        district: '',
        state: '',
        country: 'India',
        pin_code: '',
        professional_bio: '',
        technical_skills: '',
        certifications: '',
        years_of_experience: '',
        current_role_summary: '',
        areas_of_expertise: '',
        portfolio_website: '',
        linkedin_profile: '',
        github_profile: '',
        twitter_profile: '',
        instagram_profile: '',
        account_holder_name: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch_name: '',
        upi_id: '',
        pan_number: '',
        aadhaar_number: '',
        passport_number: '',
        emergency_contact_name: '',
        relationship: '',
        emergency_contact_number: '',
        hobbies: '',
        interests: '',
        about_me: '',
        preferred_language: 'English',
        availability: 'Full-Time',
        profile_completion: 0,
        last_updated_at: null,
      };

      const completion = calculateProfileCompletion(emptyProfile);
      return res.json({
        success: true,
        profile: emptyProfile,
        completion,
      });
    }

    // Decrypt sensitive PII & Banking fields for authorized owner
    const decryptedProfile = decryptSensitiveFields(profileRecord, SENSITIVE_PROFILE_FIELDS);
    const completion = calculateProfileCompletion(decryptedProfile);

    res.json({
      success: true,
      profile: decryptedProfile,
      completion,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/team/private-profile/me
 * Updates the authenticated user's private employee profile (encrypting sensitive fields)
 */
export const updateMyPrivateProfile = async (req, res, next) => {
  try {
    const teamMemberId = req.user?.team_member_id || req.user?.id;
    const userAccountId = req.user?.id;

    if (!teamMemberId && !userAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to identify team member account context.',
      });
    }

    const payload = req.body || {};

    // 1. Calculate dynamic completion score on unencrypted data
    const completionInfo = calculateProfileCompletion(payload);

    // 2. Prepare record & encrypt sensitive fields before writing to DB
    const rawRecord = {
      ...payload,
      team_member_id: teamMemberId,
      user_account_id: userAccountId,
      profile_completion: completionInfo.percentage,
      last_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const encryptedRecord = encryptSensitiveFields(rawRecord, SENSITIVE_PROFILE_FIELDS);

    let savedData = null;

    // 3. Upsert to Supabase
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('employee_private_profiles')
          .upsert(encryptedRecord, { onConflict: 'team_member_id' })
          .select()
          .single();

        if (!error && data) {
          savedData = data;
        } else if (error) {
          console.warn('Supabase private profile upsert error:', error.message);
        }
      } catch (e) {
        console.warn('Supabase private profile upsert warning:', e.message);
      }
    }

    // 4. Memory Fallback
    const memKey = teamMemberId || userAccountId;
    memoryPrivateProfiles.set(memKey, encryptedRecord);

    if (!savedData) {
      savedData = encryptedRecord;
    }

    // Return decrypted profile back to client for seamless form state update
    const decryptedOutput = decryptSensitiveFields(savedData, SENSITIVE_PROFILE_FIELDS);

    res.json({
      success: true,
      message: '⚡ Private self-service profile saved securely.',
      profile: decryptedOutput,
      completion: completionInfo,
    });
  } catch (err) {
    next(err);
  }
};
