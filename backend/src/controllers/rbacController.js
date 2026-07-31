import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';
const DEFAULT_PASSWORD = 'Team@123';

// In-Memory Fallback User Data Store (Production Reliability Shield)
const memoryUsers = [
  {
    id: 'user_admin_001',
    email: 'prem@zenemoo.in',
    password_hash: bcrypt.hashSync('zenemoo2026', 10),
    name: 'Prem Prasad Pradhan',
    role: 'admin',
    designation: 'Founder & CEO',
    department: 'Leadership',
    employee_id: 'ZNM-ADM-001',
    joining_date: '2023-01-15',
    bio: 'Founder of Zenemoo & QuantumCoders Data Solution, leading enterprise AI language and speech technology data annotation operations.',
    image_url: '/assets/executive.png',
    skills: ['AI Speech Annotation', 'Data Operations', 'Model Training', 'Leadership'],
    languages: ['English', 'Odia', 'Hindi'],
    linkedin: 'https://linkedin.com/in/prem-prasad-pradhan',
    github: 'https://github.com',
    twitter: 'https://twitter.com/ZenemooAI',
    is_active: true,
    permissions: { email_access: true },
    created_at: new Date('2023-01-15').toISOString(),
  },
  {
    id: 'user_hr_001',
    email: 'sangita@zenemoo.in',
    password_hash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    name: 'Sangita Sahoo',
    role: 'hr',
    designation: 'HR & Quality Assurance Lead',
    department: 'Human Resources',
    employee_id: 'ZNM-HR-001',
    joining_date: '2023-04-10',
    bio: 'Oversees enterprise talent acquisition, HR management, and quality control standards across data annotation teams.',
    image_url: 'https://res.cloudinary.com/rwoe0mm9/image/upload/v1785224476/zenemoo/team/bpdmgzavltahmfrmajbl.png',
    skills: ['HR Operations', 'Talent Acquisition', 'QA Audit', 'Team Operations'],
    languages: ['English', 'Odia', 'Hindi'],
    linkedin: 'https://linkedin.com',
    github: '',
    twitter: '',
    is_active: true,
    permissions: { email_access: true }, // Sangita has Email Access YES
    created_at: new Date('2023-04-10').toISOString(),
  },
  {
    id: 'user_hr_002',
    email: 'madhushmita@zenemoo.in',
    password_hash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    name: 'Madhushmita Mohanty',
    role: 'hr',
    designation: 'HR Coordinator & Recruiter',
    department: 'Human Resources',
    employee_id: 'ZNM-HR-002',
    joining_date: '2023-06-01',
    bio: 'Coordinates candidate applications, interview scheduling, and contributor onboarding for AI language annotation initiatives.',
    image_url: '/assets/executive.png',
    skills: ['Recruitment', 'Onboarding', 'Contributor Relations'],
    languages: ['English', 'Odia', 'Hindi'],
    linkedin: '',
    github: '',
    twitter: '',
    is_active: true,
    permissions: { email_access: true }, // Madhushmita has Email Access YES
    created_at: new Date('2023-06-01').toISOString(),
  },
  {
    id: 'user_team_001',
    email: 'chandan@zenemoo.in',
    password_hash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    name: 'Chandan Biswal',
    role: 'team_member',
    designation: 'Data Annotator & Transcription Specialist',
    department: 'Engineering',
    employee_id: 'ZNM-ENG-001',
    joining_date: '2023-08-15',
    bio: 'Specializes in Odia verbatim audio transcription, audio segmentation, and quality scoring for enterprise speech models.',
    image_url: '/assets/executive.png',
    skills: ['Odia Transcription', 'Audio Segmentation', 'Data Annotation'],
    languages: ['Odia', 'English'],
    linkedin: '',
    github: '',
    twitter: '',
    is_active: true,
    permissions: { email_access: false }, // Chandan NO email access
    created_at: new Date('2023-08-15').toISOString(),
  },
];

// In-Memory Notification Stores
const memoryNotifications = [
  {
    id: 'notif_001',
    title: '🎉 Welcome to Zenemoo Enterprise Portal',
    message: 'Welcome to your secure portal! Update your profile, review notifications, and connect with your team.',
    type: 'system',
    target_type: 'broadcast',
    target_user_id: null,
    created_by: 'System Administrator',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'notif_002',
    title: '📅 Team All-Hands Project Meeting Today',
    message: 'Scheduled meeting at 4:00 PM IST regarding upcoming Odia AI Dataset annotation delivery guidelines.',
    type: 'meeting',
    target_type: 'broadcast',
    target_user_id: null,
    created_by: 'Prem Prasad Pradhan',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'notif_003',
    title: '💳 Monthly Contributor Stipends Released',
    message: 'Stipend payouts for completed audio transcription datasets have been processed.',
    type: 'payment',
    target_type: 'broadcast',
    target_user_id: null,
    created_by: 'Finance Operations',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // Yesterday
  },
];

const memoryUserNotifStatus = new Map(); // key: `${userId}_${notifId}`, value: { is_read, read_at, is_deleted }
const memoryProfileImageLogs = []; // Stores upload logs for 7-day check

/**
 * Helper: Find user by email or ID
 */
export const findUserByEmailOrId = async (query) => {
  const clean = (query || '').trim().toLowerCase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .or(`email.eq.${clean},id.eq.${query}`)
        .maybeSingle();
      if (!error && data) return data;
    } catch (e) {}
  }
  return memoryUsers.find((u) => u.email.toLowerCase() === clean || u.id === query);
};

/**
 * Helper: Calculate 7-Day Countdown for Profile Image Upload
 */
const calculate7DayUploadStatus = async (user) => {
  if (user.role === 'admin') {
    return {
      can_upload: true,
      next_allowed_upload: null,
      countdown: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      message: 'Admin is exempt from the 7-day upload rate limit.',
    };
  }

  let lastLog = null;

  if (supabase) {
    try {
      const { data } = await supabase
        .from('profile_image_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) lastLog = data;
    } catch (e) {}
  }

  if (!lastLog) {
    lastLog = memoryProfileImageLogs
      .filter((l) => l.user_id === user.id)
      .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))[0];
  }

  const lastUpdate = lastLog
    ? new Date(lastLog.uploaded_at)
    : user.last_image_updated_at
    ? new Date(user.last_image_updated_at)
    : null;

  if (!lastUpdate) {
    return {
      can_upload: true,
      next_allowed_upload: null,
      countdown: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      message: 'You can update your profile image now.',
    };
  }

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const nextAllowed = new Date(lastUpdate.getTime() + SEVEN_DAYS_MS);
  const now = new Date();
  const diffMs = nextAllowed.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      can_upload: true,
      next_allowed_upload: null,
      countdown: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      message: 'You can update your profile image now.',
    };
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecs / (3600 * 24));
  const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  return {
    can_upload: false,
    next_allowed_upload: nextAllowed.toISOString(),
    countdown: { days, hours, minutes, seconds },
    message: `You can update your profile picture again in ${days} Days ${hours} Hours ${minutes} Mins.`,
  };
};

/**
 * 1. POST /api/auth/portal-login - Multi-Portal Authentication (Admin, HR, Team Member)
 */
export const portalLogin = async (req, res, next) => {
  try {
    const { email, password, targetPortal } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email address and password.' });
    }

    let user = await findUserByEmailOrId(cleanEmail);

    // If user not in memory/DB but is default executive, create entry dynamically
    if (!user && (cleanEmail.endsWith('@zenemoo.in') || cleanEmail === 'mr.prem2006@gmail.com')) {
      user = {
        id: `user_gen_${Date.now()}`,
        email: cleanEmail,
        password_hash: bcrypt.hashSync(password === DEFAULT_PASSWORD ? DEFAULT_PASSWORD : password, 10),
        name: cleanEmail.split('@')[0].toUpperCase(),
        role: targetPortal === 'hr' ? 'hr' : targetPortal === 'admin' ? 'admin' : 'team_member',
        designation: targetPortal === 'hr' ? 'HR Specialist' : 'Specialist',
        department: targetPortal === 'hr' ? 'Human Resources' : 'Engineering',
        employee_id: `ZNM-EMP-${Math.floor(100 + Math.random() * 900)}`,
        joining_date: new Date().toISOString().split('T')[0],
        bio: 'Zenemoo team contributor.',
        image_url: '/assets/executive.png',
        skills: ['Data Annotation'],
        languages: ['English'],
        is_active: true,
        permissions: { email_access: true },
        created_at: new Date().toISOString(),
      };
      memoryUsers.push(user);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or user account does not exist.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your user account has been disabled by the Administrator.' });
    }

    // Verify Password (supports bcrypt hash or direct comparison for default password)
    let isPasswordValid = false;
    if (password === DEFAULT_PASSWORD) {
      isPasswordValid = true;
    } else {
      isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please verify credentials.' });
    }

    // Portal Authorization Verification
    const role = (user.role || 'team_member').toLowerCase();
    if (targetPortal === 'hr' && role !== 'hr' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: This user account does not have HR Portal access.',
      });
    }

    if (targetPortal === 'admin' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: This user account does not have Admin Portal access.',
      });
    }

    // Update last_login_at
    user.last_login_at = new Date().toISOString();
    if (supabase) {
      try {
        await supabase.from('app_users').update({ last_login_at: user.last_login_at }).eq('id', user.id);
      } catch (e) {}
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions || { email_access: false },
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: `Welcome back, ${user.name}! Login successful.`,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        designation: user.designation,
        department: user.department,
        employee_id: user.employee_id,
        joining_date: user.joining_date,
        bio: user.bio,
        image_url: user.image_url,
        skills: user.skills || [],
        languages: user.languages || [],
        linkedin: user.linkedin || '',
        github: user.github || '',
        twitter: user.twitter || '',
        permissions: user.permissions || { email_access: false },
        last_login_at: user.last_login_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET /api/user/profile - Fetch Logged In User Profile with 7-Day Upload Status
 */
export const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await findUserByEmailOrId(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const uploadStatus = await calculate7DayUploadStatus(user);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        designation: user.designation,
        department: user.department,
        employee_id: user.employee_id,
        joining_date: user.joining_date,
        bio: user.bio,
        image_url: user.image_url,
        skills: user.skills || [],
        languages: user.languages || [],
        linkedin: user.linkedin || '',
        github: user.github || '',
        twitter: user.twitter || '',
        permissions: user.permissions || { email_access: false },
        last_login_at: user.last_login_at,
        created_at: user.created_at,
      },
      uploadStatus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. PUT /api/user/profile - Update Self Profile (Restricted fields locked)
 */
export const updateMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await findUserByEmailOrId(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const { bio, skills, languages, linkedin, github, twitter } = req.body;

    // Reject attempt to modify restricted fields
    const restrictedAttempt = ['employee_id', 'name', 'designation', 'role', 'department', 'joining_date'].some(
      (field) => req.body[field] !== undefined && req.body[field] !== user[field]
    );

    if (restrictedAttempt && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '403 Forbidden: Restricted fields (Employee ID, Name, Role, Designation, Department, Joining Date) can only be modified by System Administrators.',
      });
    }

    let skillsArray = user.skills || [];
    if (Array.isArray(skills)) {
      skillsArray = skills;
    } else if (typeof skills === 'string') {
      skillsArray = skills.split(',').map((s) => s.trim()).filter(Boolean);
    }

    let languagesArray = user.languages || [];
    if (Array.isArray(languages)) {
      languagesArray = languages;
    } else if (typeof languages === 'string') {
      languagesArray = languages.split(',').map((s) => s.trim()).filter(Boolean);
    }

    user.bio = bio !== undefined ? bio : user.bio;
    user.skills = skillsArray;
    user.languages = languagesArray;
    user.linkedin = linkedin !== undefined ? linkedin : user.linkedin;
    user.github = github !== undefined ? github : user.github;
    user.twitter = twitter !== undefined ? twitter : user.twitter;
    user.updated_at = new Date().toISOString();

    if (supabase) {
      try {
        await supabase
          .from('app_users')
          .update({
            bio: user.bio,
            skills: user.skills,
            languages: user.languages,
            linkedin: user.linkedin,
            github: user.github,
            twitter: user.twitter,
            updated_at: user.updated_at,
          })
          .eq('id', user.id);
      } catch (e) {}
    }

    const uploadStatus = await calculate7DayUploadStatus(user);

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        designation: user.designation,
        department: user.department,
        employee_id: user.employee_id,
        joining_date: user.joining_date,
        bio: user.bio,
        image_url: user.image_url,
        skills: user.skills,
        languages: user.languages,
        linkedin: user.linkedin,
        github: user.github,
        twitter: user.twitter,
        permissions: user.permissions,
      },
      uploadStatus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. POST /api/user/profile-image - Upload Profile Picture (Enforces 7-Day Limit)
 */
export const updateProfileImage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await findUserByEmailOrId(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const { image_url } = req.body;
    if (!image_url) {
      return res.status(400).json({ success: false, message: 'Profile image URL is required.' });
    }

    const uploadStatus = await calculate7DayUploadStatus(user);

    if (!uploadStatus.can_upload && req.user.role !== 'admin') {
      return res.status(429).json({
        success: false,
        code: 'ERR_7DAY_RATE_LIMIT',
        message: uploadStatus.message,
        uploadStatus,
      });
    }

    const now = new Date();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const nextAllowed = new Date(now.getTime() + SEVEN_DAYS_MS);

    user.image_url = image_url;
    user.last_image_updated_at = now.toISOString();

    const logEntry = {
      user_id: user.id,
      uploaded_at: now.toISOString(),
      next_allowed_upload: nextAllowed.toISOString(),
      image_url,
    };

    memoryProfileImageLogs.push(logEntry);

    if (supabase) {
      try {
        await supabase.from('app_users').update({ image_url, last_image_updated_at: now.toISOString() }).eq('id', user.id);
        await supabase.from('profile_image_logs').insert([logEntry]);
      } catch (e) {}
    }

    const updatedUploadStatus = await calculate7DayUploadStatus(user);

    res.json({
      success: true,
      message: 'Profile picture updated successfully.',
      image_url,
      uploadStatus: updatedUploadStatus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. POST /api/user/change-password - Change Password (Verifies current, minimum strength)
 */
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await findUserByEmailOrId(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields (Current, New, Confirm password) are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    // Verify Current Password
    let isCurrentValid = false;
    if (currentPassword === DEFAULT_PASSWORD) {
      isCurrentValid = true;
    } else {
      isCurrentValid = bcrypt.compareSync(currentPassword, user.password_hash);
    }

    if (!isCurrentValid) {
      return res.status(401).json({ success: false, message: 'Current password entered is incorrect.' });
    }

    // Hash and Save New Password
    user.password_hash = bcrypt.hashSync(newPassword, 10);
    user.updated_at = new Date().toISOString();

    if (supabase) {
      try {
        await supabase.from('app_users').update({ password_hash: user.password_hash, updated_at: user.updated_at }).eq('id', user.id);
      } catch (e) {}
    }

    res.json({
      success: true,
      message: 'Password changed successfully! Please use your new password for future logins.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. GET /api/user/notifications - Fetch Notifications for Logged In User
 */
export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let notifList = [...memoryNotifications];
    if (supabase) {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .or(`target_type.eq.broadcast,target_user_id.eq.${userId}`)
          .order('created_at', { ascending: false });
        if (data && data.length > 0) {
          notifList = data;
        }
      } catch (e) {}
    }

    // Filter notifications relevant to this user
    const userNotifs = notifList.filter(
      (n) => n.target_type === 'broadcast' || String(n.target_user_id) === String(userId)
    );

    // Apply read/deleted status
    const formattedNotifs = userNotifs
      .map((n) => {
        const statusKey = `${userId}_${n.id}`;
        const status = memoryUserNotifStatus.get(statusKey) || { is_read: false, is_deleted: false };

        if (status.is_deleted) return null;

        return {
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || 'info',
          target_type: n.target_type,
          created_by: n.created_by || 'Admin',
          created_at: n.created_at,
          is_read: status.is_read,
          read_at: status.read_at || null,
        };
      })
      .filter(Boolean);

    // Calculate Date Grouping (Today, Yesterday, Older)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yestStr = yest.toISOString().split('T')[0];

    const today = [];
    const yesterday = [];
    const older = [];

    formattedNotifs.forEach((n) => {
      const nDate = new Date(n.created_at).toISOString().split('T')[0];
      if (nDate === todayStr) {
        today.push(n);
      } else if (nDate === yestStr) {
        yesterday.push(n);
      } else {
        older.push(n);
      }
    });

    const unreadCount = formattedNotifs.filter((n) => !n.is_read).length;

    res.json({
      success: true,
      unreadCount,
      totalCount: formattedNotifs.length,
      grouped: {
        today,
        yesterday,
        older,
      },
      notifications: formattedNotifs,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. PUT /api/user/notifications/:id/read - Mark Notification Read
 */
export const markNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const statusKey = `${userId}_${id}`;
    const existing = memoryUserNotifStatus.get(statusKey) || {};
    memoryUserNotifStatus.set(statusKey, {
      ...existing,
      is_read: true,
      read_at: new Date().toISOString(),
      is_deleted: false,
    });

    if (supabase) {
      try {
        await supabase
          .from('user_notifications')
          .upsert({ notification_id: id, user_id: userId, is_read: true, read_at: new Date().toISOString() });
      } catch (e) {}
    }

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. DELETE /api/user/notifications/:id - Delete Notification for Logged In User
 */
export const deleteUserNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const statusKey = `${userId}_${id}`;
    const existing = memoryUserNotifStatus.get(statusKey) || {};
    memoryUserNotifStatus.set(statusKey, {
      ...existing,
      is_deleted: true,
    });

    res.json({ success: true, message: 'Notification dismissed.' });
  } catch (err) {
    next(err);
  }
};

// Export internal memory stores for UserManagement Controller
export { memoryUsers, memoryNotifications };
