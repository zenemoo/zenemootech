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
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Layers,
  Filter,
  CheckSquare,
  Square,
  Users,
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
  if (!time24) return '';
  const match = time24.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time24;
  const h = parseInt(match[1], 10);
  const m = match[2];
  const period = h >= 12 && h < 24 ? 'PM' : 'AM';
  let displayHour = h % 12;
  if (h === 0 || h === 24) displayHour = 12;
  return `${displayHour}:${m} ${period}`;
};

const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
};

const getDayOfWeek = (dateStr: string): number => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' });
  const map: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const short = formatter.format(dt).toLowerCase();
  return map[short] !== undefined ? map[short] : dt.getDay();
};

const formatDatePretty = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
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

  // Sub-Navigation: Calendar (Default), Weekly Schedule, All Overrides
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'weekly' | 'overrides'>('calendar');

  // Calendar State
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [highlightNext30Days, setHighlightNext30Days] = useState<boolean>(false);
  const [multiSelectMode, setMultiSelectMode] = useState<boolean>(false);
  const [multiSelectedDates, setMultiSelectedDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Copy Day Modal State
  const [copySourceDay, setCopySourceDay] = useState<number | null>(null);
  const [selectedTargetDays, setSelectedTargetDays] = useState<number[]>([]);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);

  // Add / Edit Single Override Modal State (Classic)
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [overrideDate, setOverrideDate] = useState<string>('');
  const [overrideType, setOverrideType] = useState<'unavailable' | 'custom_hours' | 'blocked_range'>('unavailable');
  const [overrideRanges, setOverrideRanges] = useState<TimeRange[]>([{ start: '10:00', end: '18:00' }]);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(null);

  // Selected Date & Apply-To Rules Drawer / Modal State
  const [isRuleEditorOpen, setIsRuleEditorOpen] = useState<boolean>(false);
  const [editingDate, setEditingDate] = useState<string>('');
  const [ruleOperation, setRuleOperation] = useState<'change_hours' | 'close_day' | 'block_range' | 'restore_weekly'>('change_hours');
  const [ruleScope, setRuleScope] = useState<'this_date' | 'every_weekday' | 'selected_dates' | 'next_30_days_weekday' | 'custom_range'>('this_date');
  const [ruleRanges, setRuleRanges] = useState<TimeRange[]>([{ start: '10:00', end: '18:00' }]);
  const [ruleReason, setRuleReason] = useState<string>('');
  const [ruleRangeStart, setRuleRangeStart] = useState<string>('');
  const [ruleRangeEnd, setRuleRangeEnd] = useState<string>('');
  const [ruleWeekdaysFilter, setRuleWeekdaysFilter] = useState<number[]>([]);
  const [ruleApplying, setRuleApplying] = useState<boolean>(false);

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

  // Handle Day Toggle (active / inactive in weekly schedule)
  const handleToggleDay = (dayIndex: number) => {
    if (!config) return;
    setConfig((prev) => {
      if (!prev) return prev;
      const current = prev.weekly_hours[dayIndex] || { day: '', active: false, ranges: [] };
      const newActive = !current.active;
      let newRanges = current.ranges;
      if (newActive && (!newRanges || newRanges.length === 0)) {
        newRanges = [{ start: '10:00', end: '22:30' }];
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
      const curDay = prev.weekly_hours[dayIndex];
      return {
        ...prev,
        weekly_hours: {
          ...prev.weekly_hours,
          [dayIndex]: {
            ...curDay,
            ranges: [...curDay.ranges, { start: nextStart, end: nextEnd }],
          },
        },
      };
    });
  };

  // Remove time range from a day
  const handleRemoveRange = (dayIndex: number, rangeIndex: number) => {
    if (!config) return;
    setConfig((prev) => {
      if (!prev) return prev;
      const curDay = prev.weekly_hours[dayIndex];
      const newRanges = curDay.ranges.filter((_, idx) => idx !== rangeIndex);
      return {
        ...prev,
        weekly_hours: {
          ...prev.weekly_hours,
          [dayIndex]: {
            ...curDay,
            ranges: newRanges,
          },
        },
      };
    });
  };

  // Update a range start or end time
  const handleUpdateRangeTime = (dayIndex: number, rangeIndex: number, field: 'start' | 'end', value: string) => {
    if (!config) return;
    setConfig((prev) => {
      if (!prev) return prev;
      const curDay = prev.weekly_hours[dayIndex];
      const newRanges = curDay.ranges.map((r, idx) => {
        if (idx === rangeIndex) {
          return { ...r, [field]: value };
        }
        return r;
      });
      return {
        ...prev,
        weekly_hours: {
          ...prev.weekly_hours,
          [dayIndex]: {
            ...curDay,
            ranges: newRanges,
          },
        },
      };
    });
  };

  // Range validation helper
  const getDayRangeError = (ranges: TimeRange[]): string | null => {
    if (!ranges || ranges.length === 0) return 'At least one working range is required for an active day.';
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      if (r.start >= r.end) return `Range #${i + 1}: End time must be after start time.`;
      if (i > 0) {
        const prev = ranges[i - 1];
        if (r.start < prev.end) return `Range #${i + 1} overlaps with Range #${i}.`;
      }
    }
    return null;
  };

  // Copy modal actions
  const handleOpenCopyModal = (sourceDayIndex: number) => {
    setCopySourceDay(sourceDayIndex);
    setSelectedTargetDays([]);
    setIsCopyModalOpen(true);
  };

  const handleApplyCopySchedule = () => {
    if (!config || copySourceDay === null || selectedTargetDays.length === 0) return;
    const sourceSchedule = config.weekly_hours[copySourceDay];
    if (!sourceSchedule) return;

    setConfig((prev) => {
      if (!prev) return prev;
      const updatedWeekly = { ...prev.weekly_hours };
      selectedTargetDays.forEach((targetIndex) => {
        const targetDay = updatedWeekly[targetIndex] || { day: '', active: false, ranges: [] };
        updatedWeekly[targetIndex] = {
          ...targetDay,
          active: sourceSchedule.active,
          ranges: JSON.parse(JSON.stringify(sourceSchedule.ranges)),
        };
      });
      return {
        ...prev,
        weekly_hours: updatedWeekly,
      };
    });

    setIsCopyModalOpen(false);
    addToast('Schedule Copied', `Hours copied to ${selectedTargetDays.length} day(s). Remember to Save Changes.`, 'info');
  };

  // Apply to all active days shortcut
  const handleApplyToAllActiveDays = (sourceDayIndex: number) => {
    if (!config) return;
    const source = config.weekly_hours[sourceDayIndex];
    if (!source || !source.active) return;

    showConfirm(
      'Apply to All Active Days?',
      `Are you sure you want to copy ${source.day}'s hours to all other enabled days? Unsaved custom hours on those days will be overwritten.`,
      () => {
        setConfig((prev) => {
          if (!prev) return prev;
          const updated = { ...prev.weekly_hours };
          DAYS_OF_WEEK.forEach((d) => {
            if (d.index !== sourceDayIndex && updated[d.index]?.active) {
              updated[d.index] = {
                ...updated[d.index],
                ranges: JSON.parse(JSON.stringify(source.ranges)),
              };
            }
          });
          return { ...prev, weekly_hours: updated };
        });
        addToast('Applied to All Active Days', `${source.day}'s hours applied to all active days.`, 'info');
      }
    );
  };

  // Reset to default
  const handleResetToDefault = () => {
    showConfirm(
      'Reset to Default Hours?',
      'This will reset weekly operating hours to the default schedule (10:00 AM – 10:00 PM, 7 days/week). Existing date overrides will be preserved.',
      () => {
        setConfig((prev) => {
          if (!prev) return prev;
          const defWeekly: Record<number, DaySchedule> = {};
          DAYS_OF_WEEK.forEach((d) => {
            defWeekly[d.index] = {
              day: d.name,
              active: true,
              ranges: [{ start: '10:00', end: '22:30' }],
            };
          });
          return {
            ...prev,
            weekly_hours: defWeekly,
          };
        });
        addToast('Reset', 'Weekly hours reset to default. Click Save Changes to confirm.', 'info');
      }
    );
  };

  // Discard changes
  const handleDiscardChanges = () => {
    if (!originalConfigJson) return;
    showConfirm('Discard Unsaved Changes?', 'Are you sure you want to discard your unsaved changes?', () => {
      try {
        setConfig(JSON.parse(originalConfigJson));
        addToast('Changes Discarded', 'Reverted back to the last saved configuration.', 'info');
      } catch (_) {}
    });
  };

  // Save full configuration
  const handleSaveConfig = async () => {
    if (!config) return;

    // Validate all active days
    for (const d of DAYS_OF_WEEK) {
      const daySched = config.weekly_hours[d.index];
      if (daySched?.active) {
        const err = getDayRangeError(daySched.ranges);
        if (err) {
          addToast('Validation Error', `${d.name}: ${err}`, 'error');
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
        addToast('Settings Saved', 'Availability schedule and overrides updated successfully.', 'success');
      } else {
        addToast('Save Failed', res.data?.message || 'Unable to save availability settings.', 'error');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      addToast('Save Error', err.response?.data?.message || err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Date Override Modal Handlers (Classic modal)
  const handleOpenAddOverride = (existingOverride?: DateOverride) => {
    if (existingOverride) {
      setEditingOverrideId(existingOverride.id);
      setOverrideDate(existingOverride.date);
      setOverrideType(existingOverride.type);
      setOverrideRanges(existingOverride.ranges.length > 0 ? JSON.parse(JSON.stringify(existingOverride.ranges)) : [{ start: '10:00', end: '18:00' }]);
      setOverrideReason(existingOverride.reason || '');
    } else {
      setEditingOverrideId(null);
      setOverrideDate(new Date().toISOString().slice(0, 10));
      setOverrideType('unavailable');
      setOverrideRanges([{ start: '10:00', end: '18:00' }]);
      setOverrideReason('');
    }
    setIsOverrideModalOpen(true);
  };

  const handleSaveOverrideModal = () => {
    if (!overrideDate || !/^\d{4}-\d{2}-\d{2}$/.test(overrideDate)) {
      addToast('Invalid Date', 'Please choose a valid calendar date (YYYY-MM-DD).', 'error');
      return;
    }

    if (overrideType !== 'unavailable') {
      const err = getDayRangeError(overrideRanges);
      if (err) {
        addToast('Invalid Time Ranges', err, 'error');
        return;
      }
    }

    setConfig((prev) => {
      if (!prev) return prev;
      const overrides = [...(prev.date_overrides || [])];
      const newOverride: DateOverride = {
        id: editingOverrideId || `ovr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        date: overrideDate,
        type: overrideType,
        is_available: overrideType !== 'unavailable',
        ranges: overrideType === 'unavailable' ? [] : overrideRanges,
        reason: overrideReason.trim() || undefined,
        created_at: new Date().toISOString(),
      };

      if (editingOverrideId) {
        const idx = overrides.findIndex((o) => o.id === editingOverrideId);
        if (idx !== -1) overrides[idx] = newOverride;
      } else {
        if (overrideType === 'unavailable' || overrideType === 'custom_hours') {
          const existingIdx = overrides.findIndex((o) => o.date === overrideDate && (o.type === 'unavailable' || o.type === 'custom_hours'));
          if (existingIdx !== -1) {
            overrides[existingIdx] = newOverride;
          } else {
            overrides.push(newOverride);
          }
        } else {
          overrides.push(newOverride);
        }
      }

      return {
        ...prev,
        date_overrides: overrides,
      };
    });

    setIsOverrideModalOpen(false);
    addToast('Date Override Configured', `Override for ${overrideDate} staged. Click Save Changes to persist.`, 'info');
  };

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

  // Determine Effective Availability for any date
  const getDateEffectiveInfo = useCallback((dateStr: string) => {
    if (!config) {
      return {
        status: 'normal' as const,
        label: 'Normal Working Hours',
        reason: 'Regular weekly schedule',
        colorClass: 'border-cyan-500/20 bg-cyan-500/[0.03] text-slate-200',
        badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
        ranges: [],
        blockedRanges: [] as TimeRange[],
        isWorking: true,
      };
    }

    const overrides = (config.date_overrides || []).filter((o) => o.date === dateStr);
    const fullClosure = overrides.find((o) => o.type === 'unavailable' || o.is_available === false);
    const customHours = overrides.find((o) => o.type === 'custom_hours' && Array.isArray(o.ranges));
    const blocked = overrides.filter((o) => o.type === 'blocked_range' && Array.isArray(o.ranges));

    const dow = getDayOfWeek(dateStr);
    const weeklyDay = (config.weekly_hours || {})[dow] || (config.weekly_hours || {})[String(dow)];

    if (fullClosure) {
      return {
        status: 'closed' as const,
        label: 'Full-Day Closed',
        reason: fullClosure.reason || 'Closed',
        colorClass: 'border-red-500/40 bg-red-500/10 text-red-300',
        badgeClass: 'bg-red-500/20 text-red-300 border-red-500/30',
        ranges: [],
        blockedRanges: [] as TimeRange[],
        isWorking: false,
      };
    }

    const blockedRanges: TimeRange[] = [];
    blocked.forEach((b) => blockedRanges.push(...b.ranges));

    if (customHours) {
      return {
        status: blockedRanges.length > 0 ? ('blocked' as const) : ('custom' as const),
        label: blockedRanges.length > 0 ? 'Custom & Blocked' : 'Custom Hours',
        reason: customHours.reason || (blocked.length > 0 ? blocked[0]?.reason : 'Custom Operating Hours'),
        colorClass: blockedRanges.length > 0 ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-purple-500/40 bg-purple-500/10 text-purple-300',
        badgeClass: blockedRanges.length > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        ranges: customHours.ranges,
        blockedRanges,
        isWorking: true,
      };
    }

    if (!weeklyDay || !weeklyDay.active || !Array.isArray(weeklyDay.ranges) || weeklyDay.ranges.length === 0) {
      return {
        status: 'inactive' as const,
        label: 'Weekly Off',
        reason: 'Weekly non-working day',
        colorClass: 'border-white/5 bg-white/[0.01] text-slate-500',
        badgeClass: 'bg-white/5 text-slate-400 border-white/10',
        ranges: [],
        blockedRanges: [] as TimeRange[],
        isWorking: false,
      };
    }

    if (blockedRanges.length > 0) {
      return {
        status: 'blocked' as const,
        label: 'Partially Blocked',
        reason: blocked[0]?.reason || 'Time window blocked',
        colorClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        ranges: weeklyDay.ranges,
        blockedRanges,
        isWorking: true,
      };
    }

    return {
      status: 'normal' as const,
      label: 'Normal Working Hours',
      reason: 'Regular weekly schedule',
      colorClass: 'border-cyan-500/20 bg-cyan-500/[0.03] text-slate-200',
      badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
      ranges: weeklyDay.ranges,
      blockedRanges: [] as TimeRange[],
      isWorking: true,
    };
  }, [config]);

  // Calendar Grid Cells Generation
  const calendarGridDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth(); // 0-indexed

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isPast: boolean;
      isNext30Days: boolean;
    }> = [];

    const todayStr = new Date().toISOString().slice(0, 10);
    const next30EndStr = addDays(todayStr, 29);

    // Trailing days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        isNext30Days: dateStr >= todayStr && dateStr <= next30EndStr,
      });
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        isNext30Days: dateStr >= todayStr && dateStr <= next30EndStr,
      });
    }

    // Leading days into next month
    const remainder = (7 - (cells.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remainder; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        isNext30Days: dateStr >= todayStr && dateStr <= next30EndStr,
      });
    }

    return cells;
  }, [calendarMonth]);

  // Open Date Editor / Apply-To Rules Drawer for a date
  const handleOpenDateEditor = (dateStr: string) => {
    setSelectedDate(dateStr);
    setEditingDate(dateStr);
    const eff = getDateEffectiveInfo(dateStr);

    if (eff.status === 'closed') {
      setRuleOperation('close_day');
      setRuleReason(eff.reason || '');
      setRuleRanges([{ start: '10:00', end: '18:00' }]);
    } else if (eff.status === 'blocked') {
      setRuleOperation('block_range');
      setRuleRanges(eff.blockedRanges.length > 0 ? eff.blockedRanges : [{ start: '12:00', end: '14:00' }]);
      setRuleReason(eff.reason || '');
    } else {
      setRuleOperation('change_hours');
      setRuleRanges(eff.ranges.length > 0 ? JSON.parse(JSON.stringify(eff.ranges)) : [{ start: '10:00', end: '18:00' }]);
      setRuleReason('');
    }

    setRuleScope('this_date');
    setRuleRangeStart(dateStr);
    setRuleRangeEnd(addDays(dateStr, 14));
    setRuleWeekdaysFilter([getDayOfWeek(dateStr)]);
    setIsRuleEditorOpen(true);
  };

  // Toggle multi-selection for a date
  const handleToggleDateSelection = (dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMultiSelectedDates((prev) => {
      if (prev.includes(dateStr)) {
        return prev.filter((d) => d !== dateStr);
      }
      return [...prev, dateStr].sort();
    });
  };

  // Open Rule Editor for Batch Selected Dates
  const handleOpenBatchEditor = () => {
    if (multiSelectedDates.length === 0) return;
    const baseDate = multiSelectedDates[0];
    setEditingDate(baseDate);
    setSelectedDate(baseDate);
    setRuleOperation('change_hours');
    setRuleScope('selected_dates');
    setRuleRanges([{ start: '10:00', end: '18:00' }]);
    setRuleReason('Special Selected Dates');
    setIsRuleEditorOpen(true);
  };

  // Compute live list of affected dates based on scope
  const affectedDatesList = useMemo(() => {
    if (!editingDate) return [];

    if (ruleScope === 'this_date') {
      return [editingDate];
    }
    if (ruleScope === 'every_weekday') {
      return []; // Recurring weekly schedule affects all future occurrences of that weekday
    }
    if (ruleScope === 'selected_dates') {
      if (multiSelectedDates.length > 0) {
        return [...multiSelectedDates].sort();
      }
      return [editingDate];
    }
    if (ruleScope === 'next_30_days_weekday') {
      const targetDow = getDayOfWeek(editingDate);
      const list: string[] = [];
      for (let i = 0; i < 30; i++) {
        const dStr = addDays(editingDate, i);
        if (getDayOfWeek(dStr) === targetDow) {
          list.push(dStr);
        }
      }
      return list;
    }
    if (ruleScope === 'custom_range') {
      if (!ruleRangeStart || !ruleRangeEnd || ruleRangeStart > ruleRangeEnd) return [];
      const list: string[] = [];
      let cur = ruleRangeStart;
      let count = 0;
      while (cur <= ruleRangeEnd && count < 365) {
        if (ruleWeekdaysFilter.length === 0 || ruleWeekdaysFilter.includes(getDayOfWeek(cur))) {
          list.push(cur);
        }
        cur = addDays(cur, 1);
        count++;
      }
      return list;
    }
    return [editingDate];
  }, [editingDate, ruleScope, multiSelectedDates, ruleRangeStart, ruleRangeEnd, ruleWeekdaysFilter]);

  // Existing confirmed bookings on affected dates warning check
  const affectedExistingBookings = useMemo(() => {
    if (!existingBookings || existingBookings.length === 0) return [];
    if (ruleScope === 'every_weekday' && editingDate) {
      const targetDow = getDayOfWeek(editingDate);
      return existingBookings.filter((b) => {
        const isMatchingWeekday = getDayOfWeek(b.booking_date) === targetDow;
        const isConfirmed = b.status === 'confirmed' || b.status === 'pending';
        return isMatchingWeekday && isConfirmed;
      });
    }
    const dateSet = new Set(affectedDatesList);
    return existingBookings.filter(
      (b) => dateSet.has(b.booking_date) && (b.status === 'confirmed' || b.status === 'pending')
    );
  }, [existingBookings, ruleScope, editingDate, affectedDatesList]);

  // Apply Rule Execution
  const handleApplyRule = async () => {
    if (!config || !editingDate) return;

    if (ruleOperation === 'change_hours' || ruleOperation === 'block_range') {
      const err = getDayRangeError(ruleRanges);
      if (err) {
        addToast('Invalid Time Ranges', err, 'error');
        return;
      }
    }

    setRuleApplying(true);
    try {
      const res = await bookingApi.applyAdminAvailabilityRule({
        operation: ruleOperation,
        scope: ruleScope,
        baseDate: editingDate,
        targetDates: affectedDatesList,
        rangeStart: ruleRangeStart,
        rangeEnd: ruleRangeEnd,
        weekdaysFilter: ruleWeekdaysFilter,
        ranges: ruleRanges,
        reason: ruleReason,
      });

      if (res.data?.success && res.data?.config) {
        setConfig(res.data.config);
        setOriginalConfigJson(JSON.stringify(res.data.config));
        addToast(
          'Availability Rule Applied',
          `Successfully applied ${ruleOperation.replace('_', ' ')} (${res.data.affectedCount || 1} date(s) updated).`,
          'success'
        );
        setIsRuleEditorOpen(false);
        setMultiSelectedDates([]);
        setMultiSelectMode(false);
      } else {
        addToast('Error Applying Rule', res.data?.message || 'Operation failed.', 'error');
      }
    } catch (err: any) {
      console.error('Apply rule error:', err);
      addToast('Failed to Apply Rule', err.response?.data?.message || err.message, 'error');
    } finally {
      setRuleApplying(false);
    }
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
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Top Global Action Header Bar */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 bg-[#070a12]/80 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
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
                Interactive monthly calendar, weekly schedule, and scoped date overrides for Zenemoo discovery calls.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-cyan-300">
              <Globe className="w-3.5 h-3.5" /> Timezone: {config.timezone || 'Asia/Kolkata'}
            </span>
            <span>•</span>
            <span className="text-emerald-400">30-Minute Slots</span>
            <span>•</span>
            <span className="text-purple-300">2h Lead Buffer</span>
            <span>•</span>
            <span className="text-amber-400">Active Overrides: {(config.date_overrides || []).length}</span>
          </div>
        </div>

        {/* Global Save / Discard Actions */}
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

      {/* SUB-NAVIGATION TABS (Calendar, Weekly Hours, All Overrides) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSubTab('calendar')}
          className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'calendar'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/20'
              : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/10'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" /> Monthly Calendar &amp; Apply Rules
        </button>

        <button
          onClick={() => setActiveSubTab('weekly')}
          className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'weekly'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/20'
              : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/10'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Weekly Schedule (7 Days)
        </button>

        <button
          onClick={() => setActiveSubTab('overrides')}
          className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'overrides'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/20'
              : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/10'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Overrides &amp; Blocks List ({config.date_overrides?.length || 0})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: MONTHLY CALENDAR & APPLY RULES ENGINE */}
      {/* ========================================================================= */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-6">
          {/* Calendar Controls Bar */}
          <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 bg-[#070a12]/60 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Month & Year Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h3 className="text-base sm:text-lg font-bold text-white font-display min-w-[170px] text-center">
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>

              <button
                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCalendarMonth(new Date())}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-mono border border-white/10 transition-colors cursor-pointer ml-1"
              >
                Today
              </button>
            </div>

            {/* Quick Filter Shortcuts */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setHighlightNext30Days((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                  highlightNext30Days
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border-white/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                {highlightNext30Days ? 'Showing Next 30 Days' : 'Highlight Next 30 Days'}
              </button>

              <button
                onClick={() => {
                  setMultiSelectMode((prev) => !prev);
                  if (multiSelectMode) setMultiSelectedDates([]);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                  multiSelectMode
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border-white/10'
                }`}
              >
                {multiSelectMode ? <CheckSquare className="w-3.5 h-3.5 text-purple-400" /> : <Square className="w-3.5 h-3.5" />}
                {multiSelectMode ? `Multi-Select (${multiSelectedDates.length})` : 'Multi-Select Dates'}
              </button>

              {multiSelectMode && multiSelectedDates.length > 0 && (
                <button
                  onClick={handleOpenBatchEditor}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-500/20 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" /> Edit {multiSelectedDates.length} Dates
                </button>
              )}
            </div>
          </div>

          {/* Status Legend Bar */}
          <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-[#070a12]/40 backdrop-blur-md flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-300">
            <span className="text-slate-500 uppercase tracking-wider font-bold">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Normal Hours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span>Custom Hours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Partially Blocked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span>Full-Day Closed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <span>Weekly Off</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
                ● 1
              </span>
              <span>Confirmed Booking(s)</span>
            </div>
          </div>

          {/* Calendar Month Grid */}
          <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-white/10 bg-[#070a12]/60 backdrop-blur-xl overflow-hidden shadow-2xl">
            {/* Weekday Column Headers */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Date Cells */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarGridDays.map((cell) => {
                const eff = getDateEffectiveInfo(cell.dateStr);
                const isSelected = selectedDate === cell.dateStr;
                const isMultiSelected = multiSelectedDates.includes(cell.dateStr);
                const cellBookings = existingBookings.filter(
                  (b) => b.booking_date === cell.dateStr && (b.status === 'confirmed' || b.status === 'pending')
                );

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => {
                      if (multiSelectMode) {
                        setMultiSelectedDates((prev) =>
                          prev.includes(cell.dateStr) ? prev.filter((d) => d !== cell.dateStr) : [...prev, cell.dateStr].sort()
                        );
                      } else {
                        handleOpenDateEditor(cell.dateStr);
                      }
                    }}
                    className={`min-h-[78px] sm:min-h-[96px] p-1.5 sm:p-2.5 rounded-2xl border transition-all relative flex flex-col justify-between cursor-pointer select-none group ${
                      !cell.isCurrentMonth
                        ? 'opacity-30 bg-transparent border-white/5'
                        : isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-400/30 bg-cyan-500/10'
                        : isMultiSelected
                        ? 'border-purple-400 ring-2 ring-purple-400/30 bg-purple-500/10'
                        : cell.isNext30Days && highlightNext30Days
                        ? `${eff.colorClass} ring-1 ring-cyan-400/40`
                        : `${eff.colorClass} hover:border-white/30`
                    }`}
                  >
                    {/* Top Row: Date Number & Multi-select indicator / Today Badge */}
                    <div className="flex items-start justify-between gap-1">
                      <span
                        className={`text-xs sm:text-sm font-mono font-bold ${
                          cell.isToday
                            ? 'w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center font-extrabold shadow-md shadow-cyan-400/30'
                            : cell.isCurrentMonth
                            ? 'text-white'
                            : 'text-slate-500'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      <div className="flex items-center gap-1">
                        {multiSelectMode && cell.isCurrentMonth && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleDateSelection(cell.dateStr, e)}
                            className="text-slate-400 hover:text-white"
                          >
                            {isMultiSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600" />
                            )}
                          </button>
                        )}

                        {cellBookings.length > 0 && (
                          <span
                            className="px-1.5 py-0.2 rounded-md bg-blue-500/30 text-blue-300 border border-blue-500/50 text-[10px] font-bold font-mono"
                            title={`${cellBookings.length} confirmed booking(s) on this date`}
                          >
                            ● {cellBookings.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle / Bottom: Status Pill */}
                    <div className="mt-1">
                      <span
                        className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-md border font-semibold block truncate ${eff.badgeClass}`}
                        title={eff.reason}
                      >
                        {eff.label}
                      </span>
                    </div>

                    {/* Operating hours snippet on desktop */}
                    <div className="hidden sm:block text-[9px] font-mono text-slate-400 truncate mt-0.5">
                      {eff.isWorking && eff.ranges.length > 0 ? (
                        <span>{formatTime12H(eff.ranges[0].start)} – {formatTime12H(eff.ranges[eff.ranges.length - 1].end)}</span>
                      ) : (
                        <span className="italic">{eff.reason}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: WEEKLY SCHEDULE (7 DAYS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'weekly' && (
        <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-white/10 bg-[#070a12]/60 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white font-display flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> Weekly Schedule (Sunday – Saturday)
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Set recurring operating hours for each day of the week. Split shifts (e.g. morning + afternoon) are supported.
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

                            {/* Delete Range Button */}
                            {daySchedule.ranges.length > 1 && (
                              <button
                                onClick={() => handleRemoveRange(d.index, rangeIdx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Remove this time range"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Add Range Button */}
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

                      {/* Validation Error Banner */}
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
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: OVERRIDES & BLOCKS LIST */}
      {/* ========================================================================= */}
      {activeSubTab === 'overrides' && (
        <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-white/10 bg-[#070a12]/60 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white font-display flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-purple-400" /> Date Overrides &amp; Time Blocking
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Specific calendar dates marked as holidays, custom working hours, or blocked intervals.
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
                The public booking page currently follows the weekly schedule for all dates.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.date_overrides.map((ovr) => {
                const isUnavailable = ovr.type === 'unavailable' || ovr.is_available === false;
                const isCustomHours = ovr.type === 'custom_hours';

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
                        <h4 className="text-xs sm:text-sm font-bold text-white font-mono">{formatDatePretty(ovr.date)}</h4>
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
      )}

      {/* ========================================================================= */}
      {/* DRAWER / MODAL: SELECTED DATE & EXPLICIT "APPLY TO" RULES ENGINE */}
      {/* ========================================================================= */}
      {isRuleEditorOpen && editingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-white/20 bg-[#0c101a] max-w-xl w-full space-y-5 max-h-[92vh] overflow-y-auto relative shadow-2xl text-slate-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10 gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold inline-block mb-1">
                  Availability Rule Editor
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white font-display">
                  {formatDatePretty(editingDate)}
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Target date: <span className="text-white">{editingDate}</span> ({DAYS_OF_WEEK.find((d) => d.index === getDayOfWeek(editingDate))?.name})
                </p>
              </div>

              <button
                onClick={() => setIsRuleEditorOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Effective Availability Box */}
            {(() => {
              const eff = getDateEffectiveInfo(editingDate);
              const dateBookings = existingBookings.filter(
                (b) => b.booking_date === editingDate && (b.status === 'confirmed' || b.status === 'pending')
              );

              return (
                <div className={`p-3.5 rounded-2xl border text-xs font-mono space-y-1.5 ${eff.colorClass}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Current Status: {eff.label}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${eff.badgeClass}`}>
                      {eff.status.toUpperCase()}
                    </span>
                  </div>
                  {eff.reason && <p className="text-slate-300 italic text-[11px]">Note: "{eff.reason}"</p>}
                  {dateBookings.length > 0 && (
                    <div className="text-[11px] font-bold text-blue-300 pt-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {dateBookings.length} confirmed client booking(s) scheduled on this date.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Operation Type Switcher */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
                Select Action / Operation:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setRuleOperation('change_hours');
                    if (ruleScope === 'every_weekday') setRuleScope('this_date');
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                    ruleOperation === 'change_hours'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border-white/10'
                  }`}
                >
                  🕒 Set Hours
                </button>

                <button
                  type="button"
                  onClick={() => setRuleOperation('close_day')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                    ruleOperation === 'close_day'
                      ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-md'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border-white/10'
                  }`}
                >
                  ⛔ Full Day Off
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRuleOperation('block_range');
                    if (ruleScope === 'every_weekday') setRuleScope('this_date');
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                    ruleOperation === 'block_range'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border-white/10'
                  }`}
                >
                  🚫 Block Window
                </button>

                <button
                  type="button"
                  onClick={() => setRuleOperation('restore_weekly')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                    ruleOperation === 'restore_weekly'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border-white/10'
                  }`}
                >
                  🔄 Reset Weekly
                </button>
              </div>
            </div>

            {/* Time Ranges Configuration (For 'change_hours' or 'block_range') */}
            {(ruleOperation === 'change_hours' || ruleOperation === 'block_range') && (
              <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">
                    {ruleOperation === 'change_hours' ? 'Custom Working Hours:' : 'Blocked Interval(s):'}
                  </span>
                  {ruleOperation === 'change_hours' && (
                    <button
                      type="button"
                      onClick={() => setRuleRanges((prev) => [...prev, { start: '14:00', end: '18:00' }])}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Range
                    </button>
                  )}
                </div>

                {ruleRanges.map((range, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <select
                        value={range.start}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRuleRanges((prev) => prev.map((r, i) => (i === idx ? { ...r, start: val } : r)));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none pr-7"
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#0e1320] text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <span className="text-slate-400">–</span>

                    <div className="relative">
                      <select
                        value={range.end}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRuleRanges((prev) => prev.map((r, i) => (i === idx ? { ...r, end: val } : r)));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none pr-7"
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#0e1320] text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {ruleRanges.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRuleRanges((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reason / Note Input */}
            {ruleOperation !== 'restore_weekly' && (
              <div className="space-y-1.5 font-mono text-xs">
                <label className="block text-slate-300 font-bold uppercase tracking-wider">
                  Reason or Label (Optional):
                </label>
                <input
                  type="text"
                  placeholder={
                    ruleOperation === 'close_day'
                      ? 'e.g. Diwali Holiday, Personal Leave, Team Offsite'
                      : ruleOperation === 'block_range'
                      ? 'e.g. Board Review, Doctor Appointment'
                      : 'e.g. Afternoon Consultations Only'
                  }
                  value={ruleReason}
                  onChange={(e) => setRuleReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            {/* EXPLICIT "APPLY TO" SCOPE SELECTOR */}
            <div className="space-y-2.5 font-mono text-xs pt-1">
              <label className="block text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Apply This Rule To:
              </label>

              <div className="space-y-2 rounded-2xl bg-white/[0.02] border border-white/10 p-3.5">
                {/* 1. Only this date */}
                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <input
                    type="radio"
                    name="ruleScope"
                    value="this_date"
                    checked={ruleScope === 'this_date'}
                    onChange={() => setRuleScope('this_date')}
                    className="accent-cyan-400 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-white block">
                      Only this date ({formatDatePretty(editingDate)})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Creates a date-specific override without affecting any other date or weekly hours.
                    </span>
                  </div>
                </label>

                {/* 2. Every occurrence of this weekday (Only valid for change_hours, close_day, restore_weekly) */}
                {ruleOperation !== 'block_range' && (
                  <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <input
                      type="radio"
                      name="ruleScope"
                      value="every_weekday"
                      checked={ruleScope === 'every_weekday'}
                      onChange={() => setRuleScope('every_weekday')}
                      className="accent-cyan-400 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-cyan-300 block">
                        Every {DAYS_OF_WEEK.find((d) => d.index === getDayOfWeek(editingDate))?.name} going forward
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Updates the recurring weekly schedule. Applies to all future occurrences of this weekday.
                      </span>
                    </div>
                  </label>
                )}

                {/* 3. All matching weekdays in the next 30 days */}
                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <input
                    type="radio"
                    name="ruleScope"
                    value="next_30_days_weekday"
                    checked={ruleScope === 'next_30_days_weekday'}
                    onChange={() => setRuleScope('next_30_days_weekday')}
                    className="accent-cyan-400 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-white block">
                      All {DAYS_OF_WEEK.find((d) => d.index === getDayOfWeek(editingDate))?.name}s in the next 30 days
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Creates date overrides for matching weekdays in the next 30 days without altering the weekly schedule.
                    </span>
                  </div>
                </label>

                {/* 4. Selected dates from calendar */}
                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <input
                    type="radio"
                    name="ruleScope"
                    value="selected_dates"
                    checked={ruleScope === 'selected_dates'}
                    onChange={() => setRuleScope('selected_dates')}
                    className="accent-cyan-400 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-white block">
                      Selected dates ({multiSelectedDates.length > 0 ? multiSelectedDates.length : 1} date(s))
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Applies only to dates currently selected from the calendar.
                    </span>
                  </div>
                </label>

                {/* 5. Custom date range */}
                <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <input
                    type="radio"
                    name="ruleScope"
                    value="custom_range"
                    checked={ruleScope === 'custom_range'}
                    onChange={() => setRuleScope('custom_range')}
                    className="accent-cyan-400 cursor-pointer mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <span className="font-bold text-white block">Custom date range</span>
                      <span className="text-[11px] text-slate-400">
                        Choose a start date, end date, and optional weekday filter.
                      </span>
                    </div>

                    {ruleScope === 'custom_range' && (
                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 mt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Start Date</label>
                            <input
                              type="date"
                              value={ruleRangeStart}
                              onChange={(e) => setRuleRangeStart(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">End Date</label>
                            <input
                              type="date"
                              value={ruleRangeEnd}
                              onChange={(e) => setRuleRangeEnd(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Apply to Weekdays:</label>
                          <div className="flex flex-wrap gap-1">
                            {DAYS_OF_WEEK.map((d) => {
                              const isChecked = ruleWeekdaysFilter.includes(d.index);
                              return (
                                <button
                                  type="button"
                                  key={d.index}
                                  onClick={() => {
                                    setRuleWeekdaysFilter((prev) =>
                                      isChecked ? prev.filter((idx) => idx !== d.index) : [...prev, d.index]
                                    );
                                  }}
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                    isChecked
                                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                      : 'bg-white/[0.03] text-slate-500 border-white/5'
                                  }`}
                                >
                                  {d.short}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => setRuleWeekdaysFilter([])}
                              className="px-2 py-1 rounded-md text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                            >
                              All Days
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* PREVIEW OF AFFECTED DATES */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  Preview Affected Dates ({ruleScope === 'every_weekday' ? 'All Future Occurrences' : affectedDatesList.length}):
                </span>
                <span className="text-[11px] text-cyan-300 font-bold">
                  {ruleScope === 'every_weekday' ? 'Weekly Recurring' : `${affectedDatesList.length} date(s)`}
                </span>
              </div>

              {ruleScope === 'every_weekday' ? (
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px]">
                  ✓ This rule will update the master weekly schedule for every <strong>{DAYS_OF_WEEK.find((d) => d.index === getDayOfWeek(editingDate))?.name}</strong>.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {affectedDatesList.slice(0, 30).map((dStr) => (
                    <span
                      key={dStr}
                      className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[10px] text-white font-mono flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-cyan-400" />
                      {formatDatePretty(dStr)}
                    </span>
                  ))}
                  {affectedDatesList.length > 30 && (
                    <span className="px-2 py-1 text-[10px] text-slate-400 italic">
                      + {affectedDatesList.length - 30} more dates...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* EXISTING CONFIRMED BOOKINGS SAFETY WARNING */}
            {affectedExistingBookings.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Existing Bookings Safety Notice ({affectedExistingBookings.length} Bookings)</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  There are {affectedExistingBookings.length} confirmed/pending customer booking(s) scheduled on the affected dates.
                  Availability changes apply only to <strong>future booking choices</strong>. Existing customer appointments will <strong>NOT</strong> be cancelled, rescheduled, or modified.
                </p>
                <div className="max-h-24 overflow-y-auto space-y-1 text-[10px] bg-black/40 p-2 rounded-xl">
                  {affectedExistingBookings.slice(0, 10).map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold text-white">{b.full_name || 'Client'}</span>
                      <span className="text-slate-400">{b.booking_date}</span>
                    </div>
                  ))}
                  {affectedExistingBookings.length > 10 && (
                    <div className="text-slate-400 italic">...and {affectedExistingBookings.length - 10} more</div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsRuleEditorOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-mono text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApplyRule}
                disabled={ruleApplying}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {ruleApplying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Apply Changes ({ruleScope === 'every_weekday' ? 'Weekly' : `${affectedDatesList.length} Dates`})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COPY DAY SCHEDULE */}
      {/* ========================================================================= */}
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
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-mono text-slate-300">
              Select target days to overwrite with {DAYS_OF_WEEK.find((d) => d.index === copySourceDay)?.name}'s working hours:
            </p>

            <div className="space-y-2">
              {DAYS_OF_WEEK.filter((d) => d.index !== copySourceDay).map((d) => {
                const isChecked = selectedTargetDays.includes(d.index);
                return (
                  <label
                    key={d.index}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                      isChecked
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold">{d.name}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedTargetDays((prev) =>
                          isChecked ? prev.filter((idx) => idx !== d.index) : [...prev, d.index]
                        );
                      }}
                      className="rounded accent-cyan-400"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-mono text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCopySchedule}
                disabled={selectedTargetDays.length === 0}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Copy to {selectedTargetDays.length} Day(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SINGLE DATE OVERRIDE (CLASSIC MODAL) */}
      {/* ========================================================================= */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 rounded-3xl border border-white/20 bg-[#0c101a] max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-purple-400" />
                {editingOverrideId ? 'Edit Date Override' : 'Add Date Override'}
              </h3>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Calendar Date</label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Override Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideType('unavailable')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                      overrideType === 'unavailable'
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : 'bg-white/[0.02] text-slate-400 border-white/10'
                    }`}
                  >
                    Full Day Off
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideType('custom_hours')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                      overrideType === 'custom_hours'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-white/[0.02] text-slate-400 border-white/10'
                    }`}
                  >
                    Custom Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideType('blocked_range')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                      overrideType === 'blocked_range'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/[0.02] text-slate-400 border-white/10'
                    }`}
                  >
                    Block Window
                  </button>
                </div>
              </div>

              {overrideType !== 'unavailable' && (
                <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="font-bold text-slate-300 block mb-1">
                    {overrideType === 'custom_hours' ? 'Operating Time Ranges:' : 'Blocked Time Range:'}
                  </span>
                  {overrideRanges.map((range, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={range.start}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOverrideRanges((prev) => prev.map((r, i) => (i === idx ? { ...r, start: val } : r)));
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs cursor-pointer"
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#0e1320] text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-slate-400">–</span>
                      <select
                        value={range.end}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOverrideRanges((prev) => prev.map((r, i) => (i === idx ? { ...r, end: val } : r)));
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs cursor-pointer"
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#0e1320] text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">Reason / Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Holiday, Doctor Appointment, Board Meeting"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-mono text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOverrideModal}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-mono text-xs font-bold cursor-pointer shadow-lg shadow-purple-500/20"
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
