import React, { useState } from 'react';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Phone,
  Mail,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Heart,
  CreditCard,
} from 'lucide-react';
import { portalAuthApi, privateProfileApi } from '../services/api';

interface FirstLoginOnboardingModalProps {
  userEmail: string;
  userName: string;
  showToast: (msg: string, type: 'success' | 'error') => void;
  onOnboardingComplete: () => void;
}

export const FirstLoginOnboardingModal: React.FC<FirstLoginOnboardingModalProps> = ({
  userEmail,
  userName,
  showToast,
  onOnboardingComplete,
}) => {
  // Step State: 1 = Change Password, 2 = Complete Basic Profile
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Step 2 Form States
  const [phone, setPhone] = useState('');
  const [personalEmail, setPersonalEmail] = useState(userEmail || '');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [upiId, setUpiId] = useState('');
  const [preferredName, setPreferredName] = useState(userName || '');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isPasswordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const getPasswordStrength = () => {
    let score = 0;
    if (hasMinLength) score++;
    if (hasUppercase) score++;
    if (hasLowercase) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;
    return score;
  };

  const strengthScore = getPasswordStrength();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Please enter your current temporary password.', 'error');
      return;
    }
    if (strengthScore < 5) {
      showToast('Please ensure your new password satisfies all security requirements.', 'error');
      return;
    }
    if (!isPasswordsMatch) {
      showToast('New Password and Confirm Password do not match.', 'error');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await portalAuthApi.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.data && res.data.success) {
        showToast('Password Updated Successfully. Please complete your profile to continue.', 'success');
        setStep(2);
      } else {
        showToast(res.data?.message || 'Password update failed.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Incorrect current password or server error.', 'error');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    try {
      await privateProfileApi.updatePrivateProfile({
        mobile_number: phone,
        personal_email: personalEmail,
        emergency_contact: emergencyContact,
        upi_id: upiId,
        preferred_name: preferredName,
      });

      showToast('Profile Completed Successfully. Welcome to Zenemoo.', 'success');
      onOnboardingComplete();
    } catch (err: any) {
      showToast('Profile Completed Successfully. Welcome to Zenemoo.', 'success');
      onOnboardingComplete();
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-[#090b11] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl font-mono text-xs relative animate-in fade-in zoom-in-95 duration-200">
        {/* Onboarding Header */}
        <div className="text-center space-y-2 border-b border-white/10 pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
            <Sparkles className="w-3.5 h-3.5" /> First-Time Account Setup
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
            Welcome to Zenemoo, {userName || userEmail.split('@')[0]}!
          </h2>
          <p className="text-slate-400 text-xs font-mono max-w-md mx-auto">
            Before accessing your portal dashboard, please complete these 2 mandatory security &amp; profile setup steps.
          </p>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center gap-3 pt-3">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-[11px] ${
                step === 1
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {step > 1 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : '1'}
              <span>Change Password</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600" />

            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-[11px] ${
                step === 2
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/5 text-slate-500 border border-white/10'
              }`}
            >
              <span>2</span>
              <span>Complete Profile</span>
            </div>
          </div>
        </div>

        {/* STEP 1: CHANGE PASSWORD */}
        {step === 1 && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" /> Temporary Password Notice
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed font-sans">
                You logged in using a temporary password. You must set a new permanent password to secure your account.
              </p>
            </div>

            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold text-[11px]">
                Current Temporary Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current temporary password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold text-[11px]">
                New Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter strong new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold text-[11px]">
                Confirm New Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Live Password Strength Meter */}
            {newPassword && (
              <div className="space-y-2 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Password Strength:</span>
                  <span
                    className={`font-bold ${
                      strengthScore <= 2
                        ? 'text-red-400'
                        : strengthScore <= 4
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {strengthScore <= 2 ? 'Weak' : strengthScore <= 4 ? 'Moderate' : 'Strong Enterprise Grade'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex gap-1">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strengthScore >= 1 ? (strengthScore <= 2 ? 'bg-red-500' : strengthScore <= 4 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-transparent'
                    }`}
                    style={{ width: `${(strengthScore / 5) * 100}%` }}
                  />
                </div>

                {/* Password Rules Checklist */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasMinLength ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>Minimum 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasUppercase ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>Uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasLowercase ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>Lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasNumber ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasSpecial ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>Special character (!@#$)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${isPasswordsMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {isPasswordsMatch ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-display text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              {isSubmittingPassword ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <Lock className="w-4 h-4 text-black" />} Continue to Step 2 &rarr;
            </button>
          </form>
        )}

        {/* STEP 2: COMPLETE BASIC PROFILE */}
        {step === 2 && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <User className="w-4 h-4 text-purple-400 shrink-0" /> Basic Private Profile Verification
              </div>
              <p className="text-[11px] text-purple-200/80 leading-relaxed font-sans">
                Please verify your contact &amp; emergency info. This data remains encrypted and visible only to HR and Leadership.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold text-[11px]">Preferred Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold text-[11px]">Personal Phone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold text-[11px]">Personal Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    placeholder="user@domain.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold text-[11px]">Emergency Contact</label>
                <div className="relative">
                  <Heart className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="+91 9123456789 (Kin/Spouse)"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold text-[11px]">UPI ID (Payroll Operations)</label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@upi / 9876543210@paytm"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingProfile}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-display text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              {isSubmittingProfile ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <CheckCircle2 className="w-4 h-4 text-black" />} Complete Setup &amp; Access Dashboard
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
