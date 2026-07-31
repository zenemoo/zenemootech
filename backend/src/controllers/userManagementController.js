import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { memoryUsers } from './rbacController.js';

const DEFAULT_PASSWORD = 'Team@123';

/**
 * 1. GET /api/admin/users - List All Users & Permissions (Admin Only)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    let usersList = [...memoryUsers];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          usersList = data;
        }
      } catch (e) {}
    }

    const sanitizedUsers = usersList.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role || 'team_member',
      designation: u.designation || 'Specialist',
      department: u.department || 'Engineering',
      employee_id: u.employee_id || '',
      joining_date: u.joining_date || '',
      bio: u.bio || '',
      image_url: u.image_url || '/assets/executive.png',
      skills: u.skills || [],
      languages: u.languages || [],
      linkedin: u.linkedin || '',
      github: u.github || '',
      twitter: u.twitter || '',
      is_active: u.is_active !== false,
      permissions: u.permissions || { email_access: false },
      last_login_at: u.last_login_at || null,
      created_at: u.created_at || new Date().toISOString(),
    }));

    res.json({
      success: true,
      count: sanitizedUsers.length,
      users: sanitizedUsers,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. POST /api/admin/users - Create User Account (Admin Only)
 */
export const createUser = async (req, res, next) => {
  try {
    const {
      email,
      name,
      password,
      role = 'team_member',
      designation = 'Specialist',
      department = 'Engineering',
      employee_id,
      joining_date,
      bio = '',
      image_url = '/assets/executive.png',
      skills = [],
      permissions = { email_access: false },
    } = req.body;

    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !name) {
      return res.status(400).json({ success: false, message: 'Email address and Name are required.' });
    }

    // Check duplicate
    const existing = memoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: `A user account with email '${cleanEmail}' already exists.` });
    }

    const passToHash = password && password.trim() ? password.trim() : DEFAULT_PASSWORD;
    const password_hash = bcrypt.hashSync(passToHash, 10);
    const empId = employee_id || `ZNM-${(role || 'EMP').substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      password_hash,
      name: name.trim(),
      role: role.toLowerCase(),
      designation,
      department,
      employee_id: empId,
      joining_date: joining_date || new Date().toISOString().split('T')[0],
      bio,
      image_url,
      skills: Array.isArray(skills) ? skills : typeof skills === 'string' ? skills.split(',').map((s) => s.trim()) : [],
      languages: ['English', 'Odia'],
      is_active: true,
      permissions: typeof permissions === 'object' ? permissions : { email_access: false },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryUsers.unshift(newUser);

    if (supabase) {
      try {
        await supabase.from('app_users').insert([newUser]);
      } catch (e) {
        console.warn('Supabase app_users insert note:', e.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `User '${name}' created successfully with role '${role}' and initial password '${passToHash}'.`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        designation: newUser.designation,
        department: newUser.department,
        employee_id: newUser.employee_id,
        joining_date: newUser.joining_date,
        permissions: newUser.permissions,
        is_active: newUser.is_active,
      },
      initialPassword: passToHash,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. PUT /api/admin/users/:id - Edit User Details, Role, and Permissions
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, designation, department, employee_id, joining_date, bio, image_url, skills, permissions } = req.body;

    let user = memoryUsers.find((u) => u.id === id || u.email === id);
    if (!user && supabase) {
      try {
        const { data } = await supabase.from('app_users').select('*').eq('id', id).single();
        if (data) user = data;
      } catch (e) {}
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (name !== undefined) user.name = name.trim();
    if (role !== undefined) user.role = role.toLowerCase();
    if (designation !== undefined) user.designation = designation;
    if (department !== undefined) user.department = department;
    if (employee_id !== undefined) user.employee_id = employee_id;
    if (joining_date !== undefined) user.joining_date = joining_date;
    if (bio !== undefined) user.bio = bio;
    if (image_url !== undefined) user.image_url = image_url;
    if (skills !== undefined) user.skills = Array.isArray(skills) ? skills : typeof skills === 'string' ? skills.split(',') : user.skills;
    if (permissions !== undefined) user.permissions = typeof permissions === 'object' ? permissions : user.permissions;
    user.updated_at = new Date().toISOString();

    if (supabase) {
      try {
        await supabase
          .from('app_users')
          .update({
            name: user.name,
            role: user.role,
            designation: user.designation,
            department: user.department,
            employee_id: user.employee_id,
            joining_date: user.joining_date,
            bio: user.bio,
            image_url: user.image_url,
            skills: user.skills,
            permissions: user.permissions,
            updated_at: user.updated_at,
          })
          .eq('id', user.id);
      } catch (e) {}
    }

    res.json({
      success: true,
      message: `User '${user.name}' updated successfully.`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        designation: user.designation,
        department: user.department,
        employee_id: user.employee_id,
        joining_date: user.joining_date,
        permissions: user.permissions,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. PUT /api/admin/users/:id/toggle-status - Enable / Disable User Account
 */
export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let user = memoryUsers.find((u) => u.id === id || u.email === id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    user.is_active = !user.is_active;
    user.updated_at = new Date().toISOString();

    if (supabase) {
      try {
        await supabase.from('app_users').update({ is_active: user.is_active, updated_at: user.updated_at }).eq('id', user.id);
      } catch (e) {}
    }

    res.json({
      success: true,
      message: `User account '${user.name}' has been ${user.is_active ? 'ENABLED' : 'DISABLED'}.`,
      is_active: user.is_active,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. POST /api/admin/users/:id/reset-password - Reset User Password
 */
export const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    let user = memoryUsers.find((u) => u.id === id || u.email === id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const resetPass = newPassword && newPassword.trim() ? newPassword.trim() : DEFAULT_PASSWORD;
    user.password_hash = bcrypt.hashSync(resetPass, 10);
    user.updated_at = new Date().toISOString();

    if (supabase) {
      try {
        await supabase.from('app_users').update({ password_hash: user.password_hash, updated_at: user.updated_at }).eq('id', user.id);
      } catch (e) {}
    }

    res.json({
      success: true,
      message: `Password for '${user.name}' reset successfully to '${resetPass}'.`,
      newPassword: resetPass,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. DELETE /api/admin/users/:id - Delete User Account
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const idx = memoryUsers.findIndex((u) => u.id === id || u.email === id);
    if (idx !== -1) {
      memoryUsers.splice(idx, 1);
    }

    if (supabase) {
      try {
        await supabase.from('app_users').delete().eq('id', id);
      } catch (e) {}
    }

    res.json({
      success: true,
      message: 'User account deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
