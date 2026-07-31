import bcrypt from 'bcryptjs';
import { supabaseService } from '../services/supabaseService.js';
import { supabase } from '../config/supabase.js';

// Fallback in-memory user account cache if DB table is pending creation
const memoryUserAccounts = [];

/**
 * 1. GET /api/users/search-roster
 * Search existing Team Roster by name, employee_id, or email
 */
export const searchRosterForAccess = async (req, res, next) => {
  try {
    const query = (req.query.q || '').trim().toLowerCase();
    
    let roster = await supabaseService.selectAll('team', 'name', true);
    if (!Array.isArray(roster)) roster = [];

    // Fetch existing user accounts to mark unlinked status
    let userAccounts = [];
    try {
      userAccounts = await supabaseService.selectAll('user_accounts');
    } catch (e) {
      userAccounts = memoryUserAccounts;
    }
    if (!Array.isArray(userAccounts)) userAccounts = memoryUserAccounts;

    const existingTeamMemberIds = new Set(userAccounts.map((u) => u.team_member_id).filter(Boolean));
    const existingEmails = new Set(userAccounts.map((u) => (u.email || '').toLowerCase()).filter(Boolean));

    // Filter matching team members
    const filtered = roster.filter((m) => {
      if (!query) return true;
      const name = (m.name || '').toLowerCase();
      const empId = (m.employee_id || m.id || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      const desig = (m.designation || '').toLowerCase();
      return name.includes(query) || empId.includes(query) || email.includes(query) || desig.includes(query);
    });

    const formatted = filtered.map((member) => ({
      id: member.id,
      position: member.position,
      name: member.name || 'Team Member',
      employee_id: member.employee_id || `EMP-${String(member.position).padStart(3, '0')}`,
      email: member.email || '',
      designation: member.designation || 'Specialist',
      department: member.department || 'Engineering',
      badge: member.badge || 'Specialist',
      image_url: member.image_url || '/assets/executive.png',
      joining_date: member.joining_date || '',
      has_access: existingTeamMemberIds.has(member.id) || (member.email && existingEmails.has(member.email.toLowerCase())),
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. POST /api/users/grant-access
 * Grant portal access to an existing Team Roster member
 */
export const grantUserAccess = async (req, res, next) => {
  try {
    const {
      team_member_id,
      role = 'team_member',
      password = 'Team@123',
      status = 'active',
      email_access = false,
      notification_access = true,
    } = req.body;

    if (!team_member_id) {
      return res.status(400).json({
        success: false,
        message: 'Please select an existing employee from the Team Roster.',
      });
    }

    // Verify Team Roster record exists
    const teamMember = await supabaseService.selectById('team', team_member_id);
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Selected team member record not found in Team Roster.',
      });
    }

    const email = (teamMember.email || req.body.email || `${teamMember.name.toLowerCase().replace(/\s+/g, '.')}@zenemoo.in`).trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password || 'Team@123', 10);

    const payload = {
      team_member_id: teamMember.id,
      email,
      password_hash: passwordHash,
      role: role.toLowerCase(),
      status: status.toLowerCase(),
      email_access: Boolean(email_access),
      notification_access: Boolean(notification_access),
      password_changed: false, // Forces password change on initial login if default Team@123
      updated_at: new Date().toISOString(),
    };

    let userRecord = null;
    let existingAccount = null;

    try {
      const allAccounts = await supabaseService.selectAll('user_accounts');
      if (Array.isArray(allAccounts)) {
        existingAccount = allAccounts.find(
          (u) => u.team_member_id === teamMember.id || (u.email && u.email.toLowerCase() === email)
        );
      }
    } catch (e) {}

    if (existingAccount) {
      // Update existing access
      try {
        userRecord = await supabaseService.update('user_accounts', existingAccount.id, payload);
      } catch (dbErr) {
        userRecord = { ...existingAccount, ...payload };
      }
    } else {
      // Create new access account
      payload.created_at = new Date().toISOString();
      try {
        userRecord = await supabaseService.insert('user_accounts', payload);
      } catch (dbErr) {
        console.warn('Supabase user_accounts insert fallback:', dbErr.message);
        payload.id = `user_${Date.now()}`;
        memoryUserAccounts.push(payload);
        userRecord = payload;
      }
    }

    res.status(201).json({
      success: true,
      message: `Portal access successfully granted for ${teamMember.name} (${role.toUpperCase()}).`,
      user: {
        id: userRecord?.id || `user_${Date.now()}`,
        team_member_id: teamMember.id,
        name: teamMember.name,
        email,
        employee_id: teamMember.employee_id || `EMP-${String(teamMember.position).padStart(3, '0')}`,
        designation: teamMember.designation,
        department: teamMember.department,
        image_url: teamMember.image_url,
        role,
        status,
        email_access,
        notification_access,
        password_changed: false,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. GET /api/users
 * Admin list all user accounts merged with Team Roster data
 */
export const getUsers = async (req, res, next) => {
  try {
    let dbAccounts = [];
    try {
      dbAccounts = await supabaseService.selectAll('user_accounts', 'created_at', false);
    } catch (e) {
      dbAccounts = memoryUserAccounts;
    }
    if (!Array.isArray(dbAccounts)) dbAccounts = memoryUserAccounts;

    let roster = await supabaseService.selectAll('team', 'position', true);
    if (!Array.isArray(roster)) roster = [];

    const rosterMap = new Map(roster.map((m) => [m.id, m]));

    const merged = dbAccounts.map((account) => {
      const member = rosterMap.get(account.team_member_id) || {};
      return {
        id: account.id,
        team_member_id: account.team_member_id,
        email: account.email || member.email || '',
        role: account.role || 'team_member',
        status: account.status || 'active',
        email_access: Boolean(account.email_access),
        notification_access: Boolean(account.notification_access),
        last_login: account.last_login,
        password_changed: Boolean(account.password_changed),
        created_at: account.created_at,
        // Single Source of Truth fields from Team Roster
        name: member.name || 'Admin User',
        employee_id: member.employee_id || `EMP-${String(member.position || 1).padStart(3, '0')}`,
        designation: member.designation || 'Specialist',
        department: member.department || 'Engineering',
        badge: member.badge || 'Specialist',
        skills: member.skills || [],
        bio: member.bio || '',
        image_url: member.image_url || '/assets/executive.png',
        joining_date: member.joining_date || '',
      };
    });

    res.json({
      success: true,
      count: merged.length,
      data: merged,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. PUT /api/users/:id
 * Admin updates role, status, email_access, notification_access
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, status, email_access, notification_access } = req.body;

    const payload = {
      updated_at: new Date().toISOString(),
    };
    if (role !== undefined) payload.role = role.toLowerCase();
    if (status !== undefined) payload.status = status.toLowerCase();
    if (email_access !== undefined) payload.email_access = Boolean(email_access);
    if (notification_access !== undefined) payload.notification_access = Boolean(notification_access);

    let updatedRecord = null;
    try {
      updatedRecord = await supabaseService.update('user_accounts', id, payload);
    } catch (e) {
      const idx = memoryUserAccounts.findIndex((u) => u.id === id);
      if (idx !== -1) {
        memoryUserAccounts[idx] = { ...memoryUserAccounts[idx], ...payload };
        updatedRecord = memoryUserAccounts[idx];
      }
    }

    res.json({
      success: true,
      message: 'User account permissions updated successfully.',
      data: updatedRecord || payload,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. POST /api/users/:id/reset-password
 * Admin resets user's password to default Team@123 (or custom password)
 */
export const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const newPassword = req.body.newPassword || 'Team@123';

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const payload = {
      password_hash: passwordHash,
      password_changed: false, // Force user to change on next login
      updated_at: new Date().toISOString(),
    };

    try {
      await supabaseService.update('user_accounts', id, payload);
    } catch (e) {
      const idx = memoryUserAccounts.findIndex((u) => u.id === id);
      if (idx !== -1) {
        memoryUserAccounts[idx] = { ...memoryUserAccounts[idx], ...payload };
      }
    }

    res.json({
      success: true,
      message: `Password reset successfully. Default password is '${newPassword}'. User will be prompted to change password on next login.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. DELETE /api/users/:id
 * Admin revokes portal access (Removes login account ONLY, leaves Team Roster intact!)
 */
export const deleteUserAccess = async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      await supabaseService.delete('user_accounts', id);
    } catch (e) {
      const idx = memoryUserAccounts.findIndex((u) => u.id === id);
      if (idx !== -1) memoryUserAccounts.splice(idx, 1);
    }

    res.json({
      success: true,
      message: 'Portal access revoked successfully. The employee record remains in the Team Roster.',
    });
  } catch (err) {
    next(err);
  }
};
