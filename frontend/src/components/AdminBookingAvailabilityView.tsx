import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Save,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Globe,
  CalendarOff,
  Sliders,
  X,
  ChevronDown,
  Check,
  AlertTriangle,
  Info,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { bookingApi } from '../services/api';

export interface TimeRange {
  start: string; // "HH:mm" (24H)
  end: string;   // "HH:mm" (24H)
}

export interface DaySchedule {
  day: string;
  active: boolean;
  ranges: TimeRange[];
}

export interface DateOverride {
  id: string;
  date: string; // "YYYY-MM-DD"
  type: 'unavailable' | 'custom_hours' | 'blocked_range';
  is_available: boolean;
  ranges: TimeRange[];
  reason?: string;
  created_at?: string;
}

export interface AvailabilityConfig {
  id?: string;
  schedule_name: string;
  timezone: string;
  slot_duration: number;
  lead_buffer_minutes: number;
  weekly_hours: Record<number | string, DaySchedule>;
  date_overrides: DateOverride[];
  updated_at?: string;
  updated_by?: string;
}

interface AdminBookingAvailabilityViewProps {
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, opts?: any) => void;
  existingBookings?: Array<{ booking_date: string; status: string; full_name: string; start_time: string }>;
}

const DAYS_OF_WEEK = [
  { index: 1, name: 'Monday', short: 'Mon' },
  { index: 2, name: 'Tuesday', short: 'Tue' },
  { index: 3, name: 'Wednesday', short: 'Wed' },
  { index: 4, name: 'Thursday', short: 'Thu' },
  { index: 5, name: 'Friday', short: 'Fri' },
  { index: 6, name: 'Saturday', short: 'Sat' },
  { index: 0, name: 'Sunday', short: 'Sun' },
];

/**
 * Generate 30-minute interval time options from 00:00 to 24:00
 */
const TIME_OPTIONS = (() => {
  const options: Array<{ value: string; label: string }> = [];
  for (let h = 0; h <= 24; h++) {
    for (const m of [0, 30]) {
      if (h === 24 && m > 0) continue;
      const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const period = h >= 12 && h < 24 ? 'PM' : 'AM';
      let displayHour = h % 12;
      if (h === 0 || h === 24) displayHour = 12;
      const displayMin = String(m).padStart(2, '0');
      const label = `${displayHour}:${displayMin} ${period}`;
      options.push({ value: val, label });
    }
  }
  return options;
})();

const formatTime12H = (time24: string): string => {
  const match = time24.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time24;
  const h = parseInt(match[1], 10);
  const m = match[2];
  const period = h >= 12 && h < 24 ? 'PM' : 'AM';
  let displayHour = h % 12;
  if (h === 0 || h === 24) displayHour = 12;
  return `${displayHour}:${m} ${period}`;
};

export const AdminBookingAvailabilityView: React.FC<AdminBookingAvailabilityViewProps> = ({
  addToast,
  showConfirm,
  existingBookings = [],
}) => {
  const [config, setConfig] = useState<AvailabilityConfig | null>(null);
  const [originalConfigJson, setOriginalConfigJson] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Copy Day Modal State
  const [copySourceDay, setCopySourceDay] = useState<number | null>(null);
  const [selectedTargetDays, setSelectedTargetDays] = useState<number[]>([]);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);

  // Add / Edit Date Override Modal State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [overrideDate, setOverrideDate] = useState<string>('');
  const [overrideType, setOverrideType] = useState<'unavailable' | 'custom_hours' | 'blocked_range'>('unavailable');
  const [overrideRanges, setOverrideRanges] = useState<TimeRange[]>([{ start: '10:00', end: '18:00' }]);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(null);

  // Load config on mount
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getAdminAvailability();
      if (res.data?.success && res.data?.config) {
        setConfig(res.data.config);
        setOriginalConfigJson(JSON.stringify(res.data.config));
      } else {
        addToast('Error', 'Unable to load availability schedule.', 'error');
      }
    } catch (err: any) {
      console.error('Fetch availability error:', err);
      addToast('Error Loading Settings', err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!config || !originalConfigJson) return false;
    return JSON.stringify(config) !== originalConfigJson;
  }, [config, originalConfigJson]);

  // Handle Day Toggle (active / inactive)
  const handleToggleDay = (dayIndex: number) => {
    if (!config) return;
    setConfig((prev) => {
      if (!prev) return prev;
      const current = prev.weekly_hours[dayIndex] || { day: '', active: false, ranges: [] };
      const newActive = !current.active;
      let newRanges = current.ranges;
      if (newActive && (!newRanges || newRanges.length === 0)) {
        newRanges = [{ start: '10:00', end: '22:00' }];
      }
      return {
        ...prev,
        weekly_hours: {
          ...prev.weekly_hours,
          [dayIndex]: {
            ...current,
            active: newActive,
            ranges: newRanges,
          },
        },
      };
    });
  };

  // Add time range to a day
  const handleAddRange = (dayIndex: number) => {
    if (!config) return;
    const current = config.weekly_hours[dayIndex];
    if (!current) return;

    let nextStart = '14:00';
    let nextEnd = '18:00';

    if (current.ranges.length > 0) {
      const lastRange = current.ranges[current.ranges.length - 1];
      const lastEndParts = lastRange.end.split(':').map(Number);
      let lastEndHour = lastEndParts[0];
      if (lastEndHour + 1 < 24) {
        nextStart = `${String(lastEndHour + 1).padStart(2, '0')}:00`;
        const endHour = Math.min(lastEndHour + 4, 24);
        nextEnd = `${String(endHour).padStart(2, '0')}:00`;
      }
    }

    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        weekly_hours: {
          ...prev.weekly_hours,
          [dayIndex]: {
            ...current,
            ranges: [...current.ranges, { start: nextStart, end: nextEnd }],
          },
        },
      };
    });
  };

  // Remove time range from a day
  const handleRemoveRange = (dayIndex: number, rangeIndex: number) => {
    if (!config) return;
    const current = config.weekly_hours[dayIndex];
    if (!current || current.ranges.length <= 1) return;

    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        weekly_hours: {
          ...prev.weekly_hours,
          [dayIndex]: {
            ...current,
            ranges: current.ranges.filter((_, idx) => idx !== rangeIndex),
          },
        },
      };
    });
  };

  // Update specific range start/end
  const handleUpdateRangeTime = (dayIndex: number, rangeIndex: number, field: 'start' | 'end', value: string) => {
    if (!config) return;
    const current = config.weekly_hours[dayIndex];
    if (!current) return;

    const updatedRanges = current.ranges.map((r, idx) => {
      if (idx !== rangeIndex) return r;
      return { ...r, [field]: value };
    });

    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        weekly_hours: {
          ...prev.weekly_hours,
          [dayIndex]: {
            ...current,
            ranges: updatedRanges,
          },
        },
      };
    });
  };

  // Range validation helper for UI
  const getDayRangeError = (ranges: TimeRange[]): string | null => {
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      const startParts = r.start.split(':').map(Number);
      const endParts = r.end.split(':').map(Number);
      const startMins = startParts[0] * 60 + startParts[1];
      const endMins = endParts[0] * 60 + endParts[1];

      if (startMins >= endMins) {
        return `Start time must be before end time (${formatTime12H(r.start)} - ${formatTime12H(r.end)})`;
      }
      if (endMins - startMins < 30) {
        return 'Range must be at least 30 minutes long';
      }

      if (i > 0) {
        const prev = ranges[i - 1];
        const prevEndParts = prev.end.split(':').map(Number);
        const prevEndMins = prevEndParts[0] * 60 + prevEndParts[1];
        if (startMins < prevEndMins) {
          return `Overlapping ranges detected (${formatTime12H(prev.end)} and ${formatTime12H(r.start)})`;
        }
      }
    }
    return null;
  };

  // Open Copy Day Modal
  const handleOpenCopyModal = (sourceDayIndex: number) => {
    setCopySourceDay(sourceDayIndex);
    setSelectedTargetDays(DAYS_OF_WEEK.map((d) => d.index).filter((idx) => idx !== sourceDayIndex));
    setIsCopyModalOpen(true);
  };

  // Apply Copy Day Schedule
  const handleApplyCopySchedule = () => {
    if (!config || copySourceDay === null) return;
    const sourceSchedule = config.weekly_hours[copySourceDay];
    if (!sourceSchedule) return;

    setConfig((prev) => {
      if (!prev) return prev;
      const updatedWeekly = { ...prev.weekly_hours };
      selectedTargetDays.forEach((targetIndex) => {
        const targetDayName = prev.weekly_hours[targetIndex]?.day || DAYS_OF_WEEK.find((d) => d.index === targetIndex)?.name || '';
        updatedWeekly[targetIndex] = {
          day: targetDayName,
          active: sourceSchedule.active,
          ranges: JSON.parse(JSON.stringify(sourceSchedule.ranges)),
        };
      });
      return { ...prev, weekly_hours: updatedWeekly };
    });

    setIsCopyModalOpen(false);
    addToast('Schedule Copied', `Applied ${sourceSchedule.day}'s schedule to ${selectedTargetDays.length} day(s).`, 'success');
  };

  // Shortcut: Apply Schedule to All Enabled Days
  const handleApplyToAllActiveDays = (sourceDayIndex: number) => {
    if (!config) return;
    const sourceSchedule = config.weekly_hours[sourceDayIndex];
    if (!sourceSchedule) return;

    showConfirm(
      'Apply to All Active Days?',
      `Are you sure you want to copy ${sourceSchedule.day}'s hours to all active weekdays? Existing hours for those days will be overwritten.`,
      () => {
        setConfig((prev) => {
          if (!prev) return prev;
          const updatedWeekly = { ...prev.weekly_hours };
          Object.keys(updatedWeekly).forEach((key) => {
            const idx = Number(key);
            if (idx !== sourceDayIndex && updatedWeekly[idx]?.active) {
              updatedWeekly[idx] = {
                ...updatedWeekly[idx],
                ranges: JSON.parse(JSON.stringify(sourceSchedule.ranges)),
              };
            }
          });
          return { ...prev, weekly_hours: updatedWeekly };
        });
        addToast('Applied to All', `Applied ${sourceSchedule.day}'s hours to all active days.`, 'success');
      }
    );
  };

  // Reset to Default Schedule (10 AM - 10 PM)
  const handleResetToDefault = () => {
    showConfirm(
      'Reset to Standard Hours?',
      'This will reset your weekly hours to the standard Zenemoo default: 10:00 AM – 10:00 PM, 7 days a week. Unsaved overrides will not be affected.',
      () => {
        if (!config) return;
        const defaultWeekly: Record<number, DaySchedule> = {};
        DAYS_OF_WEEK.forEach((d) => {
          defaultWeekly[d.index] = {
            day: d.name,
            active: true,
            ranges: [{ start: '10:00', end: '22:00' }],
          };
        });

        setConfig((prev) => (prev ? { ...prev, weekly_hours: defaultWeekly } : prev));
        addToast('Reset', 'Weekly hours reset to 10:00 AM – 10:00 PM.', 'info');
      }
    );
  };

  // Discard Unsaved Changes
  const handleDiscardChanges = () => {
    if (!originalConfigJson) return;
    showConfirm(
      'Discard Unsaved Changes?',
      'Any changes made since your last save will be reverted.',
      () => {
        setConfig(JSON.parse(originalConfigJson));
        addToast('Changes Discarded', 'Reverted back to last saved schedule.', 'info');
      }
    );
  };

  // Save Configuration to Backend
  const handleSaveConfig = async () => {
    if (!config) return;

    // Validate all days before saving
    for (const d of DAYS_OF_WEEK) {
      const schedule = config.weekly_hours[d.index];
      if (schedule && schedule.active) {
        const error = getDayRangeError(schedule.ranges);
        if (error) {
          addToast('Validation Error', `${d.name}: ${error}`, 'error');
          return;
        }
      }
    }

    setSaving(true);
    try {
      const res = await bookingApi.updateAdminAvailability(config);
      if (res.data?.success && res.data?.config) {
        setConfig(res.data.config);
        setOriginalConfigJson(JSON.stringify(res.data.config));
        addToast('Schedule Saved', 'Availability and working hours updated successfully.', 'success');
      } else {
        addToast('Save Failed', res.data?.message || 'Could not save schedule.', 'error');
      }
    } catch (err: any) {
      console.error('Save availability error:', err);
      addToast('Save Error', err.response?.data?.message || err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Open Override Modal
  const handleOpenAddOverride = (existingOverride?: DateOverride) => {
    if (existingOverride) {
      setEditingOverrideId(existingOverride.id);
      setOverrideDate(existingOverride.date);
      setOverrideType(existingOverride.type);
      setOverrideRanges(existingOverride.ranges.length > 0 ? existingOverride.ranges : [{ start: '10:00', end: '18:00' }]);
      setOverrideReason(existingOverride.reason || '');
    } else {
      setEditingOverrideId(null);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setOverrideDate(tomorrow.toISOString().split('T')[0]);
      setOverrideType('unavailable');
      setOverrideRanges([{ start: '10:00', end: '18:00' }]);
      setOverrideReason('');
    }
    setIsOverrideModalOpen(true);
  };

  // Count existing confirmed bookings on the selected override date
  const existingBookingsOnDate = useMemo(() => {
    if (!overrideDate) return [];
    return existingBookings.filter(
      (b) => b.booking_date === overrideDate && (b.status === 'confirmed' || b.status === 'pending')
    );
  }, [overrideDate, existingBookings]);

  // Save Date Override
  const handleSaveOverride = () => {
    if (!overrideDate) {
      addToast('Validation Error', 'Please select a valid date.', 'error');
      return;
    }

    if (overrideType === 'custom_hours' || overrideType === 'blocked_range') {
      const rangeErr = getDayRangeError(overrideRanges);
      if (rangeErr) {
        addToast('Validation Error', rangeErr, 'error');
        return;
      }
    }

    const newOverride: DateOverride = {
      id: editingOverrideId || `ovr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: overrideDate,
      type: overrideType,
      is_available: overrideType !== 'unavailable',
      ranges: overrideType === 'unavailable' ? [] : overrideRanges,
      reason: overrideReason.trim(),
      created_at: new Date().toISOString(),
    };

    setConfig((prev) => {
      if (!prev) return prev;
      let updatedOverrides = [...(prev.date_overrides || [])];
      if (editingOverrideId) {
        updatedOverrides = updatedOverrides.map((o) => (o.id === editingOverrideId ? newOverride : o));
      } else {
        // Prevent duplicate override on the same date
        updatedOverrides = updatedOverrides.filter((o) => o.date !== overrideDate);
        updatedOverrides.push(newOverride);
      }
      // Sort overrides by date ascending
      updatedOverrides.sort((a, b) => a.date.localeCompare(b.date));
      return { ...prev, date_overrides: updatedOverrides };
    });

    setIsOverrideModalOpen(false);
    addToast(
      'Override Added',
      `${overrideDate} (${overrideType === 'unavailable' ? 'Day Off' : overrideType === 'custom_hours' ? 'Custom Hours' : 'Time Block'}) added. Click "Save Schedule" to apply.`,
      'info'
    );
  };

  // Delete Date Override
  const handleDeleteOverride = (overrideId: string, dateStr: string) => {
    showConfirm(
      'Remove Date Override?',
      `Are you sure you want to delete the override for ${dateStr}? Standard weekly working hours will be restored for this date.`,
      () => {
        setConfig((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            date_overrides: (prev.date_overrides || []).filter((o) => o.id !== overrideId),
          };
        });
        addToast('Override Removed', `Restored weekly schedule for ${dateStr}.`, 'info');
      }
    );
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-slate-400">Loading availability and working hours...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center glass-panel rounded-2xl border border-white/10 space-y-4">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-sm font-bold text-white font-mono">Unable to load availability configuration</h3>
        <button
          onClick={fetchConfig}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Action Header Bar */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 bg-[#070a12]/80 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-display">
                Availability &amp; Working Hours
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Configure weekly operating hours, block holidays, and set custom dates for Zenemoo 30-min calls.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-cyan-300">
              <Globe className="w-3.5 h-3.5" /> Timezone: {config.timezone || 'Asia/Kolkata'}
            </span>
            <span>•</span>
            <span className="text-emerald-400">30-Minute Slots</span>
            <span>•</span>
            <span className="text-purple-300">2h Lead Buffer</span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0">
          <button
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset weekly schedule to 10:00 AM - 10:00 PM"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Default
          </button>

          {hasUnsavedChanges && (
            <button
              onClick={handleDiscardChanges}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-mono text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Discard
            </button>
          )}

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className={`px-5 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              hasUnsavedChanges
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-cyan-500/20 animate-pulse'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
            }`}
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                {hasUnsavedChanges ? 'Save Changes *' : 'Saved'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 1: WEEKLY WORKING HOURS */}
      <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-white/10 bg-[#070a12]/60 backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white font-display flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" /> Weekly Schedule
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Set available time ranges for each day of the week. Split shifts (e.g. morning + afternoon) are supported.
            </p>
          </div>
          <div className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 self-start sm:self-auto">
            7 Days Weekly Engine
          </div>
        </div>

        {/* 7 Days Schedule List */}
        <div className="space-y-3.5 divide-y divide-white/5">
          {DAYS_OF_WEEK.map((d) => {
            const daySchedule = config.weekly_hours[d.index] || { day: d.name, active: false, ranges: [] };
            const isActive = daySchedule.active;
            const rangeError = isActive ? getDayRangeError(daySchedule.ranges) : null;

            return (
              <div
                key={d.index}
                className={`pt-3.5 first:pt-0 transition-colors rounded-2xl p-3 sm:p-4 ${
                  isActive ? 'bg-white/[0.02] border border-white/5' : 'bg-transparent opacity-60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left: Day Toggle & Name */}
                  <div className="flex items-center gap-3.5 min-w-[150px]">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleToggleDay(d.index)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500" />
                    </label>

                    <div>
                      <span className={`text-xs sm:text-sm font-bold font-mono block ${isActive ? 'text-white' : 'text-slate-500'}`}>
                        {d.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {isActive ? `${daySchedule.ranges.length} range(s)` : 'Unavailable'}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Ranges Editor or Unavailable Notice */}
                  <div className="flex-1 space-y-2.5">
                    {isActive ? (
                      daySchedule.ranges.map((range, rangeIdx) => (
                        <div key={rangeIdx} className="flex flex-wrap items-center gap-2 sm:gap-3">
                          {/* Start Time Select */}
                          <div className="relative">
                            <select
                              value={range.start}
                              onChange={(e) => handleUpdateRangeTime(d.index, rangeIdx, 'start', e.target.value)}
                              className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none pr-7"
                            >
                              {TIME_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-[#0e1320] text-white">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          <span className="text-slate-400 text-xs font-mono">–</span>

                          {/* End Time Select */}
                          <div className="relative">
                            <select
                              value={range.end}
                              onChange={(e) => handleUpdateRangeTime(d.index, rangeIdx, 'end', e.target.value)}
                              className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none pr-7"
                            >
                              {TIME_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-[#0e1320] text-white">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Delete Range Button (only if > 1 range) */}
                          {daySchedule.ranges.length > 1 && (
                            <button
                              onClick={() => handleRemoveRange(d.index, rangeIdx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Remove this time range"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Add Range Button inline on first row */}
                          {rangeIdx === 0 && (
                            <button
                              onClick={() => handleAddRange(d.index)}
                              className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                              title="Add split shift range"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Range
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs font-mono text-slate-500 italic block py-1">
                        Unavailable for bookings
                      </span>
                    )}

                    {/* Validation Error Banner for this Day */}
                    {rangeError && (
                      <div className="text-[11px] font-mono text-red-400 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{rangeError}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Quick Action Shortcuts */}
                  {isActive && (
                    <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                      <button
                        onClick={() => handleOpenCopyModal(d.index)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-[10px] font-mono flex items-center gap-1 border border-white/10 transition-colors cursor-pointer"
                        title="Copy this day's hours to other days"
                      >
                        <Copy className="w-3 h-3 text-cyan-400" /> Copy...
                      </button>

                      <button
                        onClick={() => handleApplyToAllActiveDays(d.index)}
                        className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-mono flex items-center gap-1 border border-cyan-500/20 transition-colors cursor-pointer"
                        title="Apply to all active days"
                      >
                        Apply to All
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: DATE OVERRIDES & TIME BLOCKING */}
      <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-white/10 bg-[#070a12]/60 backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white font-display flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-purple-400" /> Date Overrides &amp; Time Blocking
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Mark specific calendar dates as holidays, set special custom hours, or block specific time windows.
            </p>
          </div>

          <button
            onClick={() => handleOpenAddOverride()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-purple-500/20 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Date Override
          </button>
        </div>

        {/* Overrides List */}
        {(!config.date_overrides || config.date_overrides.length === 0) ? (
          <div className="p-8 text-center rounded-2xl border border-white/5 bg-white/[0.01] space-y-2">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-mono text-slate-400">No date overrides configured.</p>
            <p className="text-[11px] font-mono text-slate-500">
              The public booking page currently follows the weekly schedule above for all calendar dates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.date_overrides.map((ovr) => {
              const dObj = new Date(ovr.date + 'T00:00:00');
              const dayName = isNaN(dObj.getTime())
                ? ''
                : dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

              const isUnavailable = ovr.type === 'unavailable' || ovr.is_available === false;
              const isCustomHours = ovr.type === 'custom_hours';
              const isBlocked = ovr.type === 'blocked_range';

              return (
                <div
                  key={ovr.id}
                  className={`p-4 rounded-2xl border transition-all relative space-y-3 ${
                    isUnavailable
                      ? 'bg-red-500/[0.04] border-red-500/30'
                      : isCustomHours
                      ? 'bg-purple-500/[0.04] border-purple-500/30'
                      : 'bg-amber-500/[0.04] border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold border inline-block mb-1.5 ${
                          isUnavailable
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : isCustomHours
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}
                      >
                        {isUnavailable ? 'Full Day Off' : isCustomHours ? 'Custom Hours' : 'Time Block'}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white font-mono">{dayName || ovr.date}</h4>
                      <span className="text-[10px] font-mono text-slate-400">{ovr.date}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenAddOverride(ovr)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Edit override"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOverride(ovr.id, ovr.date)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete override"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Hours description */}
                  <div className="text-xs font-mono">
                    {isUnavailable ? (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Entire Day Closed
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          {isCustomHours ? 'Operating Hours:' : 'Blocked Interval:'}
                        </span>
                        {ovr.ranges.map((r, rIdx) => (
                          <div key={rIdx} className="text-white font-bold text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>{formatTime12H(r.start)} – {formatTime12H(r.end)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reason Footnote */}
                  {ovr.reason && (
                    <div className="pt-2 border-t border-white/5 text-[11px] font-mono text-slate-400 italic truncate">
                      "{ovr.reason}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: COPY DAY SCHEDULE */}
      {isCopyModalOpen && copySourceDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 rounded-3xl border border-white/20 bg-[#0c101a] max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Copy className="w-4 h-4 text-cyan-400" />
                Copy {DAYS_OF_WEEK.find((d) => d.index === copySourceDay)?.name}'s Schedule
              </h3>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-mono text-slate-400">
              Select the days you want to overwrite with {DAYS_OF_WEEK.find((d) => d.index === copySourceDay)?.name}'s schedule:
            </p>

            <div className="space-y-2">
              {DAYS_OF_WEEK.filter((d) => d.index !== copySourceDay).map((d) => {
                const isSelected = selectedTargetDays.includes(d.index);
                return (
                  <label
                    key={d.index}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-white font-bold'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{d.name}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setSelectedTargetDays((prev) => prev.filter((idx) => idx !== d.index));
                        } else {
                          setSelectedTargetDays((prev) => [...prev, d.index]);
                        }
                      }}
                      className="rounded border-white/20 text-cyan-500 focus:ring-0"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCopySchedule}
                disabled={selectedTargetDays.length === 0}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-mono text-xs font-bold"
              >
                Apply to {selectedTargetDays.length} Day(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT DATE OVERRIDE */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/20 bg-[#0c101a] max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-purple-400" />
                {editingOverrideId ? 'Edit Date Override' : 'Add Date Override'}
              </h3>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Date Input */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">Select Date *</label>
                <input
                  type="date"
                  required
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Warning if existing confirmed bookings exist on this date */}
              {existingBookingsOnDate.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Existing Confirmed Bookings ({existingBookingsOnDate.length})</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    This date already contains confirmed customer meetings. Adding an override prevents NEW bookings, but will NOT automatically cancel or delete existing meetings.
                  </p>
                </div>
              )}

              {/* Override Type Segmented Selector */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">Override Action *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideType('unavailable')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      overrideType === 'unavailable'
                        ? 'bg-red-500/20 border-red-500/50 text-white font-bold'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="block text-[11px]">Full Day Off</span>
                    <span className="text-[9px] text-slate-400">All slots closed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideType('custom_hours')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      overrideType === 'custom_hours'
                        ? 'bg-purple-500/20 border-purple-500/50 text-white font-bold'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="block text-[11px]">Custom Hours</span>
                    <span className="text-[9px] text-slate-400">Special shift hours</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideType('blocked_range')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      overrideType === 'blocked_range'
                        ? 'bg-amber-500/20 border-amber-500/50 text-white font-bold'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="block text-[11px]">Time Block</span>
                    <span className="text-[9px] text-slate-400">Block specific window</span>
                  </button>
                </div>
              </div>

              {/* Time Range Fields (for custom_hours and blocked_range) */}
              {(overrideType === 'custom_hours' || overrideType === 'blocked_range') && (
                <div className="space-y-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300 font-bold">
                      {overrideType === 'custom_hours' ? 'Allowed Working Hours' : 'Blocked Time Range'}
                    </span>
                    {overrideType === 'custom_hours' && (
                      <button
                        type="button"
                        onClick={() => setOverrideRanges((prev) => [...prev, { start: '14:00', end: '18:00' }])}
                        className="text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Range
                      </button>
                    )}
                  </div>

                  {overrideRanges.map((r, rIdx) => (
                    <div key={rIdx} className="flex items-center gap-2">
                      <select
                        value={r.start}
                        onChange={(e) =>
                          setOverrideRanges((prev) =>
                            prev.map((it, idx) => (idx === rIdx ? { ...it, start: e.target.value } : it))
                          )
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs font-mono"
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#0e1320] text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <span className="text-slate-400">–</span>

                      <select
                        value={r.end}
                        onChange={(e) =>
                          setOverrideRanges((prev) =>
                            prev.map((it, idx) => (idx === rIdx ? { ...it, end: e.target.value } : it))
                          )
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs font-mono"
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#0e1320] text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {overrideRanges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setOverrideRanges((prev) => prev.filter((_, idx) => idx !== rIdx))}
                          className="p-1 rounded text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Optional Reason / Notes */}
              <div>
                <label className="block text-slate-300 mb-1.5">Reason / Note (Optional)</label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="e.g. Diwali Holiday, Doctor Appointment, Team Review"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOverride}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-mono text-xs font-bold shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingAvailabilityView;
