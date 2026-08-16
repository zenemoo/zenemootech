import React, { useState, useMemo } from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  Mic,
  Globe,
  UserCheck,
  Handshake,
  Building,
  ArrowLeft,
  Download,
  Filter,
  Sliders,
  RotateCcw,
  Sparkles,
  TrendingUp,
  MapPin,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  PieChart,
  BarChart2,
  Calendar,
  AlertTriangle,
  Award,
  Check,
} from 'lucide-react';

interface AdminNetworkAnalyticsProps {
  registrations: any[];
  onFilterSelect: (filterType: string, value: string) => void;
  onClose: () => void;
  onExportCsv: () => void;
}

export const AdminNetworkAnalytics: React.FC<AdminNetworkAnalyticsProps> = ({
  registrations = [],
  onFilterSelect,
  onClose,
  onExportCsv,
}) => {
  // Global Analytics Filters State
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('All Languages');
  const [filterState, setFilterState] = useState<string>('All States');
  const [filterRole, setFilterRole] = useState<string>('All Roles');
  const [filterWorkType, setFilterWorkType] = useState<string>('All Work Types');
  const [filterAvailability, setFilterAvailability] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [growthTimeframe, setGrowthTimeframe] = useState<string>('30');

  // Matrix Sort State
  const [matrixSortField, setMatrixSortField] = useState<string>('resources');
  const [matrixSortOrder, setMatrixSortOrder] = useState<'asc' | 'desc'>('desc');

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterDateRange !== 'all') count++;
    if (filterLanguage !== 'All Languages') count++;
    if (filterState !== 'All States') count++;
    if (filterRole !== 'All Roles') count++;
    if (filterWorkType !== 'All Work Types') count++;
    if (filterAvailability !== 'all') count++;
    if (filterStatus !== 'all') count++;
    return count;
  }, [
    filterDateRange,
    filterLanguage,
    filterState,
    filterRole,
    filterWorkType,
    filterAvailability,
    filterStatus,
  ]);

  const handleResetAnalyticsFilters = () => {
    setFilterDateRange('all');
    setFilterLanguage('All Languages');
    setFilterState('All States');
    setFilterRole('All Roles');
    setFilterWorkType('All Work Types');
    setFilterAvailability('all');
    setFilterStatus('all');
  };

  // Filtered dataset for Analytics calculations
  const filteredDataset = useMemo(() => {
    let data = [...registrations];

    // Date Range
    if (filterDateRange !== 'all') {
      const now = new Date().getTime();
      const days = parseInt(filterDateRange, 10);
      if (!isNaN(days)) {
        const threshold = now - days * 24 * 60 * 60 * 1000;
        data = data.filter((r) => new Date(r.created_at || 0).getTime() >= threshold);
      }
    }

    // Language
    if (filterLanguage !== 'All Languages' && filterLanguage.toLowerCase() !== 'all') {
      const targetLang = filterLanguage.toLowerCase().trim();
      data = data.filter((r) => {
        const langList = Array.isArray(r.languages) ? r.languages : [];
        return langList.some((l: any) => {
          const lName = (typeof l === 'string' ? l : (l?.language || '')).toLowerCase();
          return lName.includes(targetLang) || targetLang.includes(lName);
        });
      });
    }

    // State
    if (filterState !== 'All States' && filterState.toLowerCase() !== 'all') {
      const targetState = filterState.toLowerCase().replace(/\([^)]*\)/g, '').trim();
      data = data.filter((r) => {
        const s = (r.state || '').toLowerCase().trim();
        return s.includes(targetState) || targetState.includes(s);
      });
    }

    // Role
    if (filterRole !== 'All Roles' && filterRole.toLowerCase() !== 'all') {
      const targetRole = filterRole.toLowerCase().trim();
      const roleTokens = targetRole.split(/[\/\s,]+/).filter((t) => t.length > 2);
      data = data.filter((r) => {
        const itemRole = (r.primary_role || '').toLowerCase();
        return (
          itemRole.includes(targetRole) ||
          targetRole.includes(itemRole) ||
          roleTokens.some((tok) => itemRole.includes(tok))
        );
      });
    }

    // Work Type
    if (filterWorkType !== 'All Work Types' && filterWorkType.toLowerCase() !== 'all') {
      const wt = filterWorkType.toLowerCase().trim();
      const wtTokens = wt.split(/[\/\s,]+/).filter((t) => t.length > 2);
      data = data.filter((r) => {
        const capsList = Array.isArray(r.work_capabilities) ? r.work_capabilities : [];
        return capsList.some((c: any) => {
          const cStr = (typeof c === 'string' ? c : String(c)).toLowerCase();
          return cStr.includes(wt) || wt.includes(cStr) || wtTokens.some((tok) => cStr.includes(tok));
        });
      });
    }

    // Availability
    if (filterAvailability !== 'all') {
      const targetAvail = filterAvailability.toLowerCase().trim();
      data = data.filter((r) => {
        const itemAvail = (r.availability || '').toLowerCase();
        return itemAvail.includes(targetAvail) || targetAvail.includes(itemAvail);
      });
    }

    // Status
    if (filterStatus !== 'all') {
      const targetStatus = filterStatus.toLowerCase().trim();
      data = data.filter((r) => (r.status || 'pending').toLowerCase() === targetStatus);
    }

    return data;
  }, [
    registrations,
    filterDateRange,
    filterLanguage,
    filterState,
    filterRole,
    filterWorkType,
    filterAvailability,
    filterStatus,
  ]);

  // ── 1. COMPUTED TOP METRIC CARDS ──
  const metrics = useMemo(() => {
    const total = filteredDataset.length;
    const verified = filteredDataset.filter((r) => r.status === 'verified').length;
    const pending = filteredDataset.filter((r) => r.status === 'pending' || !r.status).length;
    
    const coordinators = filteredDataset.filter((r) => {
      const roleStr = (r.primary_role || '').toLowerCase();
      return roleStr.includes('coordinator') || roleStr.includes('recruiter');
    }).length;

    const individuals = filteredDataset.filter((r) => {
      const roleStr = (r.primary_role || '').toLowerCase();
      return roleStr.includes('individual') || roleStr.includes('participant');
    }).length;

    const vendors = filteredDataset.filter((r) => {
      const roleStr = (r.primary_role || '').toLowerCase();
      return roleStr.includes('vendor') || roleStr.includes('agency') || roleStr.includes('organization');
    }).length;

    const singers = filteredDataset.filter((r) => {
      const roleStr = (r.primary_role || '').toLowerCase();
      return roleStr.includes('singer') || roleStr.includes('vocal');
    }).length;

    const recordingTeams = filteredDataset.filter((r) => {
      const roleStr = (r.primary_role || '').toLowerCase();
      return roleStr.includes('recording') || roleStr.includes('team');
    }).length;

    // Unique languages
    const langSet = new Set<string>();
    filteredDataset.forEach((r) => {
      (r.languages || []).forEach((l: any) => {
        const lName = (typeof l === 'string' ? l : l?.language || '').trim();
        if (lName) langSet.add(lName);
      });
    });

    const immediate = filteredDataset.filter((r) => {
      const avail = (r.availability || '').toLowerCase();
      return avail.includes('immediately') || avail.includes('immediate');
    }).length;

    return {
      total,
      verified,
      pending,
      coordinators,
      individuals,
      vendors,
      singers,
      recordingTeams,
      uniqueLanguages: langSet.size,
      immediate,
    };
  }, [filteredDataset]);

  // ── 2. LANGUAGE DISTRIBUTION & MATRIX DATA ──
  const languageMatrix = useMemo(() => {
    const map = new Map<
      string,
      {
        language: string;
        resources: number;
        nativeCount: number;
        coordinators: number;
        capacity: number;
        immediate: number;
      }
    >();

    filteredDataset.forEach((r) => {
      const isCoord = (r.primary_role || '').toLowerCase().includes('coordinator');
      const isImmed = (r.availability || '').toLowerCase().includes('immediately');

      (r.languages || []).forEach((l: any) => {
        const rawLangName = typeof l === 'string' ? l : (l?.language || '').trim();
        if (!rawLangName) return;

        const langName = rawLangName === 'Other' ? 'Other / Unspecified' : rawLangName;
        const isNative = typeof l === 'object' && (l?.proficiency || '').toLowerCase().includes('native');
        const capVal = typeof l === 'object' ? Number(l?.capacity) || 1 : 1;

        const existing = map.get(langName) || {
          language: langName,
          resources: 0,
          nativeCount: 0,
          coordinators: 0,
          capacity: 0,
          immediate: 0,
        };

        existing.resources += 1;
        if (isNative) existing.nativeCount += 1;
        if (isCoord) existing.coordinators += 1;
        existing.capacity += capVal;
        if (isImmed) existing.immediate += 1;

        map.set(langName, existing);
      });
    });

    const list = Array.from(map.values());

    // Sort matrix
    list.sort((a: any, b: any) => {
      let valA = a[matrixSortField] || 0;
      let valB = b[matrixSortField] || 0;
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }
      if (valA < valB) return matrixSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return matrixSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredDataset, matrixSortField, matrixSortOrder]);

  // Top 6 Languages for Donut Chart
  const topLanguages = useMemo(() => {
    const list = [...languageMatrix].sort((a, b) => b.resources - a.resources);
    const totalResourceAssociations = list.reduce((acc, curr) => acc + curr.resources, 0) || 1;
    
    const top = list.slice(0, 6);
    const otherCount = list.slice(6).reduce((acc, curr) => acc + curr.resources, 0);

    const colors = ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#64748b'];

    const items = top.map((item, idx) => ({
      name: item.language,
      count: item.resources,
      pct: ((item.resources / totalResourceAssociations) * 100).toFixed(1),
      color: colors[idx % colors.length],
    }));

    if (otherCount > 0) {
      items.push({
        name: 'Others',
        count: otherCount,
        pct: ((otherCount / totalResourceAssociations) * 100).toFixed(1),
        color: colors[6],
      });
    }

    return { items, total: totalResourceAssociations };
  }, [languageMatrix]);

  // ── 3. ROLES DISTRIBUTION ──
  const roleDistribution = useMemo(() => {
    const roleCounts: Record<string, number> = {
      'Individual Participant': 0,
      Coordinator: 0,
      Vendor: 0,
      'Recording Team': 0,
      Singer: 0,
      'Field Agent': 0,
      'Speaker Recruiter': 0,
      Organization: 0,
      Other: 0,
    };

    filteredDataset.forEach((r) => {
      const roleStr = (r.primary_role || '').toLowerCase();
      if (roleStr.includes('individual') || roleStr.includes('participant')) roleCounts['Individual Participant'] += 1;
      else if (roleStr.includes('coordinator')) roleCounts['Coordinator'] += 1;
      else if (roleStr.includes('vendor') || roleStr.includes('agency')) roleCounts['Vendor'] += 1;
      else if (roleStr.includes('recording') || roleStr.includes('team')) roleCounts['Recording Team'] += 1;
      else if (roleStr.includes('singer') || roleStr.includes('vocal')) roleCounts['Singer'] += 1;
      else if (roleStr.includes('field')) roleCounts['Field Agent'] += 1;
      else if (roleStr.includes('recruiter')) roleCounts['Speaker Recruiter'] += 1;
      else if (roleStr.includes('community') || roleStr.includes('organization')) roleCounts['Organization'] += 1;
      else roleCounts['Other'] += 1;
    });

    const maxCount = Math.max(1, ...Object.values(roleCounts));

    const colors: Record<string, string> = {
      'Individual Participant': '#8b5cf6',
      Coordinator: '#10b981',
      Vendor: '#f59e0b',
      'Recording Team': '#3b82f6',
      Singer: '#ec4899',
      'Field Agent': '#06b6d4',
      'Speaker Recruiter': '#6366f1',
      Organization: '#a855f7',
      Other: '#64748b',
    };

    return Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count,
      pct: maxCount > 0 ? (count / maxCount) * 100 : 0,
      color: colors[role] || '#06b6d4',
    }));
  }, [filteredDataset]);

  // ── 4. AVAILABILITY OVERVIEW ──
  const availabilityDistribution = useMemo(() => {
    const counts = {
      Immediately: 0,
      'Within 1 Week': 0,
      'Within 2 Weeks': 0,
      Flexible: 0,
      Other: 0,
    };

    filteredDataset.forEach((r) => {
      const avail = (r.availability || '').toLowerCase();
      if (avail.includes('immediately') || avail.includes('immediate')) counts['Immediately'] += 1;
      else if (avail.includes('1 week') || avail.includes('1-3 days')) counts['Within 1 Week'] += 1;
      else if (avail.includes('2 weeks') || avail.includes('week')) counts['Within 2 Weeks'] += 1;
      else if (avail.includes('flexible') || avail.includes('project')) counts['Flexible'] += 1;
      else counts['Other'] += 1;
    });

    const total = filteredDataset.length || 1;
    const colors: Record<string, string> = {
      Immediately: '#10b981',
      'Within 1 Week': '#06b6d4',
      'Within 2 Weeks': '#f59e0b',
      Flexible: '#8b5cf6',
      Other: '#64748b',
    };

    return Object.entries(counts).map(([key, count]) => ({
      name: key,
      count,
      pct: ((count / total) * 100).toFixed(1),
      color: colors[key],
    }));
  }, [filteredDataset]);

  // ── 5. STATE DISTRIBUTION (LOCATION) ──
  const stateDistribution = useMemo(() => {
    const map = new Map<string, number>();

    filteredDataset.forEach((r) => {
      const stateName = (r.state || 'Unspecified').trim();
      map.set(stateName, (map.get(stateName) || 0) + 1);
    });

    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const total = filteredDataset.length || 1;
    const topStates = sorted.slice(0, 6);
    const otherCount = sorted.slice(6).reduce((acc, curr) => acc + curr[1], 0);

    const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#3b82f6', '#64748b'];

    const items = topStates.map(([state, count], idx) => ({
      state,
      count,
      pct: ((count / total) * 100).toFixed(1),
      color: colors[idx % colors.length],
    }));

    if (otherCount > 0) {
      items.push({
        state: 'Others',
        count: otherCount,
        pct: ((otherCount / total) * 100).toFixed(1),
        color: colors[6],
      });
    }

    return {
      items,
      totalStates: map.size,
      topStateName: sorted[0] ? sorted[0][0] : 'None',
      topStateCount: sorted[0] ? sorted[0][1] : 0,
    };
  }, [filteredDataset]);

  // ── 6. TOP CITIES / DISTRICTS ──
  const topCities = useMemo(() => {
    const map = new Map<string, { city: string; state: string; count: number }>();

    filteredDataset.forEach((r) => {
      const city = (r.city_district || '').trim();
      const state = (r.state || '').trim();
      if (!city) return;

      const key = `${city}_${state}`;
      const existing = map.get(key) || { city, state, count: 0 };
      existing.count += 1;
      map.set(key, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredDataset]);

  // ── 7. WORK TYPE DISTRIBUTION ──
  const workTypeDistribution = useMemo(() => {
    const map = new Map<string, number>();

    filteredDataset.forEach((r) => {
      (r.work_capabilities || []).forEach((cap: any) => {
        const capStr = (typeof cap === 'string' ? cap : String(cap)).trim();
        if (capStr) {
          map.set(capStr, (map.get(capStr) || 0) + 1);
        }
      });
    });

    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const totalAssociations = sorted.reduce((acc, curr) => acc + curr[1], 0) || 1;
    const top = sorted.slice(0, 6);
    const otherCount = sorted.slice(6).reduce((acc, curr) => acc + curr[1], 0);

    const colors = ['#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#64748b'];

    const items = top.map(([workType, count], idx) => ({
      workType,
      count,
      pct: ((count / totalAssociations) * 100).toFixed(1),
      color: colors[idx % colors.length],
    }));

    if (otherCount > 0) {
      items.push({
        workType: 'Others',
        count: otherCount,
        pct: ((otherCount / totalAssociations) * 100).toFixed(1),
        color: colors[6],
      });
    }

    return {
      items,
      mostCommon: sorted[0] ? sorted[0][0] : 'Audio Recording',
      mostCommonCount: sorted[0] ? sorted[0][1] : 0,
    };
  }, [filteredDataset]);

  // ── 8. VERIFICATION STATUS ──
  const statusDistribution = useMemo(() => {
    const map = {
      verified: 0,
      pending: 0,
      rejected: 0,
      archived: 0,
    };

    filteredDataset.forEach((r) => {
      const st = (r.status || 'pending').toLowerCase();
      if (st === 'verified') map.verified += 1;
      else if (st === 'rejected') map.rejected += 1;
      else if (st === 'archived' || r.is_archived) map.archived += 1;
      else map.pending += 1;
    });

    const total = filteredDataset.length || 1;

    return [
      { status: 'verified', label: 'Verified', count: map.verified, color: '#10b981', pct: ((map.verified / total) * 100).toFixed(1) },
      { status: 'pending', label: 'Pending', count: map.pending, color: '#f59e0b', pct: ((map.pending / total) * 100).toFixed(1) },
      { status: 'rejected', label: 'Rejected', count: map.rejected, color: '#ef4444', pct: ((map.rejected / total) * 100).toFixed(1) },
      { status: 'archived', label: 'Archived', count: map.archived, color: '#64748b', pct: ((map.archived / total) * 100).toFixed(1) },
    ];
  }, [filteredDataset]);

  // ── 9. NETWORK GROWTH TREND ──
  const growthTrend = useMemo(() => {
    const daysLimit = parseInt(growthTimeframe, 10) || 30;
    const now = new Date().getTime();
    const threshold = now - daysLimit * 24 * 60 * 60 * 1000;

    const map = new Map<string, number>();

    filteredDataset.forEach((r) => {
      const t = new Date(r.created_at || 0).getTime();
      if (t >= threshold) {
        const dateStr = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        map.set(dateStr, (map.get(dateStr) || 0) + 1);
      }
    });

    const list = Array.from(map.entries()).map(([date, count]) => ({ date, count }));
    const maxVal = Math.max(1, ...list.map((i) => i.count));

    return { list, maxVal, totalInRange: list.reduce((a, b) => a + b.count, 0) };
  }, [filteredDataset, growthTimeframe]);

  // ── 10. RECENT REGISTRATIONS LIST ──
  const recentRegistrations = useMemo(() => {
    return [...filteredDataset]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5);
  }, [filteredDataset]);

  // Helper function to render Donut Chart SVG
  const renderSvgDonut = (
    items: { name: string; count: number; color: string; pct: string }[],
    totalLabel: string | number
  ) => {
    let cumulative = 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    return (
      <div className="relative w-36 h-36 mx-auto flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {items.map((item, idx) => {
            const pctValue = parseFloat(item.pct) / 100;
            const strokeDasharray = `${pctValue * circumference} ${circumference}`;
            const strokeDashoffset = -cumulative * circumference;
            cumulative += pctValue;

            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth="14"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 hover:opacity-80"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono">
          <span className="text-xl font-black text-white">{totalLabel}</span>
          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Total</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* ── 1. TOP NAVIGATION & HEADER ── */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all border border-white/15"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Talent Network
            </button>
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <PieChart className="w-3.5 h-3.5 text-cyan-400" /> Network Analytics <span className="text-[9px] bg-cyan-500 text-black px-1.5 py-0.2 rounded font-extrabold ml-1">Beta</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Zenemoo AI Workforce Intelligence Dashboard
          </h1>
          <p className="text-xs text-slate-400 font-mono max-w-2xl leading-relaxed">
            Detailed real-time metrics and capacity analytics across languages, roles, geography, and availability for internal AI data project planning.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onExportCsv}
            className="w-full md:w-auto px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs font-mono flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Download className="w-4 h-4 text-black" /> Export Analytics
          </button>
          <button
            onClick={onClose}
            className="w-full md:w-auto px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs font-mono flex items-center justify-center gap-2 cursor-pointer border border-white/15 transition-all"
          >
            <X className="w-4 h-4" /> Hide Analytics
          </button>
        </div>
      </div>

      {/* ── 2. GLOBAL ANALYTICS FILTERS BAR ── */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Global Analytics Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] border border-cyan-500/30">
                {activeFiltersCount} Active
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetAnalyticsFilters}
              className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* Timeframe */}
          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="180">Last 6 Months</option>
          </select>

          {/* Language */}
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="All Languages">All Languages</option>
            {languageMatrix.map((l) => (
              <option key={l.language} value={l.language}>
                {l.language} ({l.resources})
              </option>
            ))}
          </select>

          {/* State */}
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="All States">All States</option>
            {stateDistribution.items.map((s) => (
              <option key={s.state} value={s.state}>
                {s.state} ({s.count})
              </option>
            ))}
          </select>

          {/* Role */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="All Roles">All Roles</option>
            <option value="Individual Participant">Individual Participant</option>
            <option value="Coordinator">Coordinator</option>
            <option value="Vendor / Agency">Vendor / Agency</option>
            <option value="Singer / Vocal Artist">Singer / Vocal Artist</option>
            <option value="Recording Team">Recording Team</option>
          </select>

          {/* Work Type */}
          <select
            value={filterWorkType}
            onChange={(e) => setFilterWorkType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="All Work Types">All Work Types</option>
            {workTypeDistribution.items.map((w) => (
              <option key={w.workType} value={w.workType}>
                {w.workType}
              </option>
            ))}
          </select>

          {/* Availability */}
          <select
            value={filterAvailability}
            onChange={(e) => setFilterAvailability(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all">All Availability</option>
            <option value="immediately">Immediately</option>
            <option value="1 week">Within 1 Week</option>
            <option value="2 weeks">Within 2 Weeks</option>
            <option value="flexible">Flexible</option>
          </select>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Removable Active Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Active Analytics Filters:</span>
            {filterDateRange !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 text-[11px]">
                Time: {filterDateRange} days
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterDateRange('all')} />
              </span>
            )}
            {filterLanguage !== 'All Languages' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 text-[11px]">
                Lang: {filterLanguage}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterLanguage('All Languages')} />
              </span>
            )}
            {filterState !== 'All States' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 text-[11px]">
                State: {filterState}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState('All States')} />
              </span>
            )}
            {filterRole !== 'All Roles' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 text-[11px]">
                Role: {filterRole}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterRole('All Roles')} />
              </span>
            )}
            {filterWorkType !== 'All Work Types' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 text-[11px]">
                Work: {filterWorkType}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterWorkType('All Work Types')} />
              </span>
            )}
            {filterAvailability !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 text-[11px]">
                Avail: {filterAvailability}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterAvailability('all')} />
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 text-[11px]">
                Status: {filterStatus}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterStatus('all')} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── 3. TOP SUMMARY CARDS (RESPONSIVE GRID) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-10 gap-3 font-mono text-xs">
        {/* Total Network */}
        <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 space-y-1 hover:border-cyan-400 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Total Network</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{metrics.total}</div>
          <div className="text-[10px] text-slate-500">All Registered</div>
        </div>

        {/* Verified */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-[10px] uppercase font-bold">
            <span>Verified</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300">{metrics.verified}</div>
          <div className="text-[10px] text-emerald-500 font-bold">
            {metrics.total > 0 ? ((metrics.verified / metrics.total) * 100).toFixed(1) : 0}% of total
          </div>
        </div>

        {/* Pending */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-[10px] uppercase font-bold">
            <span>Pending</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-300">{metrics.pending}</div>
          <div className="text-[10px] text-amber-500 font-bold">
            {metrics.total > 0 ? ((metrics.pending / metrics.total) * 100).toFixed(1) : 0}% of total
          </div>
        </div>

        {/* Coordinators */}
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
          <div className="flex items-center justify-between text-cyan-400 text-[10px] uppercase font-bold">
            <span>Coordinators</span>
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300">{metrics.coordinators}</div>
          <div className="text-[10px] text-cyan-400 font-bold">
            {metrics.total > 0 ? ((metrics.coordinators / metrics.total) * 100).toFixed(1) : 0}% of total
          </div>
        </div>

        {/* Individual */}
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-1">
          <div className="flex items-center justify-between text-purple-400 text-[10px] uppercase font-bold">
            <span>Individual</span>
            <Users className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300">{metrics.individuals}</div>
          <div className="text-[10px] text-purple-400 font-bold">
            {metrics.total > 0 ? ((metrics.individuals / metrics.total) * 100).toFixed(1) : 0}% of total
          </div>
        </div>

        {/* Vendors */}
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-1">
          <div className="flex items-center justify-between text-purple-400 text-[10px] uppercase font-bold">
            <span>Vendors</span>
            <Handshake className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300">{metrics.vendors}</div>
          <div className="text-[10px] text-purple-400 font-bold">
            {metrics.total > 0 ? ((metrics.vendors / metrics.total) * 100).toFixed(1) : 0}% of total
          </div>
        </div>

        {/* Singers */}
        <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/30 space-y-1">
          <div className="flex items-center justify-between text-pink-400 text-[10px] uppercase font-bold">
            <span>Singers</span>
            <Mic className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <div className="text-2xl font-extrabold text-pink-300">{metrics.singers}</div>
          <div className="text-[10px] text-pink-400 font-bold">
            {metrics.total > 0 ? ((metrics.singers / metrics.total) * 100).toFixed(1) : 0}% of total
          </div>
        </div>

        {/* Recording Teams */}
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-1">
          <div className="flex items-center justify-between text-indigo-400 text-[10px] uppercase font-bold">
            <span>Recording Teams</span>
            <Building className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-300">{metrics.recordingTeams}</div>
          <div className="text-[10px] text-indigo-400 font-bold">
            {metrics.total > 0 ? ((metrics.recordingTeams / metrics.total) * 100).toFixed(1) : 0}% of total
          </div>
        </div>

        {/* Unique Languages */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Languages</span>
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400">{metrics.uniqueLanguages}</div>
          <div className="text-[10px] text-slate-500">Unique Languages</div>
        </div>

        {/* Available Immediately */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-[10px] uppercase font-bold">
            <span>Available Now</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300">{metrics.immediate}</div>
          <div className="text-[10px] text-emerald-500 font-bold">
            {metrics.total > 0 ? ((metrics.immediate / metrics.total) * 100).toFixed(1) : 0}% Immediate
          </div>
        </div>
      </div>

      {/* ── 4. MAIN CHARTS ROW (LANGUAGE, ROLES, AVAILABILITY) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
        {/* Language Distribution Card */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" /> Languages Distribution
              </h3>
              <p className="text-slate-400 text-[10px]">Unique languages in your network</p>
            </div>
            <a
              href="#language-capacity-matrix"
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
            >
              View All
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
            {renderSvgDonut(topLanguages.items, topLanguages.items.length)}
            <div className="space-y-1.5 w-full flex-1">
              {topLanguages.items.map((item) => (
                <div
                  key={item.name}
                  onClick={() => item.name !== 'Others' && onFilterSelect('language', item.name)}
                  className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                  title={`Click to filter candidates speaking ${item.name}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-200 font-bold">{item.name}</span>
                  </div>
                  <span className="text-slate-400 font-mono">
                    {item.count} <span className="text-[10px] text-slate-500">({item.pct}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resources by Role Vertical Bar Chart */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-400" /> Resources by Role
              </h3>
              <p className="text-slate-400 text-[10px]">Distribution of resources by primary role</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end space-y-2 pt-4">
            <div className="grid grid-cols-5 items-end gap-2 h-40 pt-6 px-2 border-b border-white/10">
              {roleDistribution.slice(0, 5).map((r) => (
                <div
                  key={r.role}
                  onClick={() => onFilterSelect('role', r.role)}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                  title={`Click to filter by Role: ${r.role}`}
                >
                  <span className="text-[10px] font-bold text-white group-hover:text-cyan-300">{r.count}</span>
                  <div
                    className="w-full rounded-t-lg transition-all duration-300 group-hover:brightness-125"
                    style={{
                      height: `${Math.max(8, r.pct)}%`,
                      backgroundColor: r.color,
                    }}
                  />
                  <span className="text-[9px] text-slate-400 font-bold truncate w-full text-center mt-1">
                    {r.role.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-slate-500 text-center pt-1">
              Click any bar to filter Talent Network by role
            </div>
          </div>
        </div>

        {/* Availability Overview Donut Chart */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Availability Overview
              </h3>
              <p className="text-slate-400 text-[10px]">When registered resources can start</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
            {renderSvgDonut(availabilityDistribution, metrics.total)}
            <div className="space-y-1.5 w-full flex-1">
              {availabilityDistribution.map((item) => (
                <div
                  key={item.name}
                  onClick={() => onFilterSelect('availability', item.name)}
                  className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                  title={`Click to filter resources available ${item.name}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-200 font-bold">{item.name}</span>
                  </div>
                  <span className="text-slate-400 font-mono">
                    {item.count} <span className="text-[10px] text-slate-500">({item.pct}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. SECONDARY CHARTS ROW (STATES, WORK TYPES, RECENT REGISTRATIONS) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
        {/* Resources by State Horizontal Bar Chart */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" /> Resources by State
              </h3>
              <p className="text-slate-400 text-[10px]">Top states with candidate concentration ({stateDistribution.totalStates} States Covered)</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {stateDistribution.items.map((s) => (
              <div
                key={s.state}
                onClick={() => s.state !== 'Others' && onFilterSelect('state', s.state)}
                className="space-y-1 cursor-pointer group p-1 rounded-lg hover:bg-white/5 transition-colors"
                title={`Click to filter candidates in ${s.state}`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-bold group-hover:text-cyan-300">{s.state}</span>
                  <span className="text-slate-400 font-mono">
                    {s.count} <span className="text-[10px] text-slate-500">({s.pct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Work Capability Distribution */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" /> Work Capability Distribution
              </h3>
              <p className="text-slate-400 text-[10px]">Types of work resources can perform</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {workTypeDistribution.items.map((w) => (
              <div
                key={w.workType}
                onClick={() => w.workType !== 'Others' && onFilterSelect('workType', w.workType)}
                className="space-y-1 cursor-pointer group p-1 rounded-lg hover:bg-white/5 transition-colors"
                title={`Click to filter candidates capable of ${w.workType}`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-bold group-hover:text-indigo-300">{w.workType}</span>
                  <span className="text-slate-400 font-mono">
                    {w.count} <span className="text-[10px] text-slate-500">({w.pct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${w.pct}%`, backgroundColor: w.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registrations List */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" /> Recent Registrations
              </h3>
              <p className="text-slate-400 text-[10px]">Latest candidate signups in system</p>
            </div>
            <button
              onClick={onClose}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {recentRegistrations.length === 0 ? (
              <div className="text-slate-500 text-center py-6">No recent registrations.</div>
            ) : (
              recentRegistrations.map((r) => (
                <div
                  key={r.id}
                  onClick={onClose}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 hover:bg-white/[0.06] cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5 truncate">
                    <div className="text-white font-bold truncate flex items-center gap-1.5">
                      <span>{r.full_name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {r.primary_role}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {r.state} • {(r.languages || []).map((l: any) => (typeof l === 'string' ? l : l.language)).slice(0, 2).join(', ')}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                      r.status === 'verified'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {r.status || 'pending'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 6. LANGUAGE + CAPACITY MATRIX TABLE SECTION ── */}
      <div id="language-capacity-matrix" className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" /> Language &amp; Resource Capacity Matrix
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Comprehensive breakdown of language coverage, native speaker ratios, coordinator count, total recruitable capacity, and immediate availability.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Sort Matrix:</span>
            <select
              value={matrixSortField}
              onChange={(e) => setMatrixSortField(e.target.value)}
              className="bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-white focus:outline-none cursor-pointer"
            >
              <option value="resources">Total Resources</option>
              <option value="nativeCount">Native Speakers</option>
              <option value="coordinators">Coordinators</option>
              <option value="capacity">Recruitable Capacity</option>
              <option value="immediate">Immediate Availability</option>
            </select>
            <button
              onClick={() => setMatrixSortOrder(matrixSortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 font-bold"
            >
              {matrixSortOrder.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Language</th>
                <th className="p-3.5 text-center">Total Resources</th>
                <th className="p-3.5 text-center">Native Speakers</th>
                <th className="p-3.5 text-center">Coordinators</th>
                <th className="p-3.5 text-center">Speaker Capacity</th>
                <th className="p-3.5 text-center">Immediate Availability</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {languageMatrix.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No language data available for current filters.
                  </td>
                </tr>
              ) : (
                languageMatrix.map((item) => (
                  <tr
                    key={item.language}
                    onClick={() => onFilterSelect('language', item.language)}
                    className="hover:bg-cyan-500/[0.06] transition-colors cursor-pointer group"
                    title={`Click to filter candidate list by ${item.language}`}
                  >
                    <td className="p-3.5 font-bold text-white group-hover:text-cyan-300 flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{item.language}</span>
                    </td>
                    <td className="p-3.5 text-center font-bold text-cyan-300">{item.resources}</td>
                    <td className="p-3.5 text-center font-bold text-emerald-400">{item.nativeCount}</td>
                    <td className="p-3.5 text-center font-bold text-purple-400">{item.coordinators}</td>
                    <td className="p-3.5 text-center font-bold text-amber-300">
                      {item.capacity > 0 ? item.capacity : 'Data N/A'}
                    </td>
                    <td className="p-3.5 text-center font-bold text-emerald-300">{item.immediate}</td>
                    <td className="p-3.5 text-right">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-bold group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                        Filter Candidates →
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 7. NETWORK GROWTH & VERIFICATION STATUS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
        {/* Network Growth Line/Bar Chart */}
        <div className="md:col-span-2 glass-panel p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" /> Network Growth Trend
              </h3>
              <p className="text-slate-400 text-[10px]">Candidate registrations timeline</p>
            </div>
            <div className="flex items-center gap-1">
              {['7', '30', '90', '180'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setGrowthTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    growthTimeframe === tf
                      ? 'bg-cyan-500 text-black shadow'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  {tf === '180' ? '6 Months' : `${tf} Days`}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 space-y-2">
            {growthTrend.list.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Not enough historical growth data in range.</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-end gap-1.5 h-36 border-b border-white/10 pb-2 px-2">
                  {growthTrend.list.map((item, idx) => {
                    const heightPct = (item.count / growthTrend.maxVal) * 100;
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1 group"
                        title={`${item.date}: ${item.count} registrations`}
                      >
                        <span className="text-[9px] text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.count}
                        </span>
                        <div
                          className="w-full rounded-t bg-cyan-500/80 group-hover:bg-cyan-400 transition-all duration-300"
                          style={{ height: `${Math.max(10, heightPct)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>{growthTrend.list[0]?.date}</span>
                  <span>Total New: {growthTrend.totalInRange} candidates</span>
                  <span>{growthTrend.list[growthTrend.list.length - 1]?.date}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Verification Status Distribution */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Verification Status
              </h3>
              <p className="text-slate-400 text-[10px]">Status breakdown across network</p>
            </div>
          </div>

          <div className="space-y-3 my-auto">
            {statusDistribution.map((item) => (
              <div
                key={item.status}
                onClick={() => onFilterSelect('status', item.status)}
                className="space-y-1 cursor-pointer group p-1.5 rounded-xl hover:bg-white/5 transition-colors"
                title={`Click to filter by Status: ${item.label}`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {item.count} <span className="text-[10px] text-slate-500">({item.pct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 8. KEY INSIGHTS ENGINE ── */}
      <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-amber-400 font-bold text-sm">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Zenemoo Network Insights</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 font-mono text-xs">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <span className="text-cyan-400 font-bold block text-sm">{metrics.uniqueLanguages} Languages</span>
            <p className="text-slate-300 text-[11px]">Diverse language coverage represented across registered candidates.</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <span className="text-emerald-400 font-bold block text-sm">
              {metrics.total > 0 ? ((metrics.immediate / metrics.total) * 100).toFixed(1) : 0}% Available Now
            </span>
            <p className="text-slate-300 text-[11px]">High availability for immediate AI data project deployments.</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <span className="text-purple-400 font-bold block text-sm">{stateDistribution.topStateName} Top State</span>
            <p className="text-slate-300 text-[11px]">Highest candidate density ({stateDistribution.topStateCount} candidates).</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <span className="text-indigo-400 font-bold block text-sm">{workTypeDistribution.mostCommon}</span>
            <p className="text-slate-300 text-[11px]">Most requested work capability among candidates.</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <span className="text-amber-400 font-bold block text-sm">
              {metrics.total > 0 ? ((metrics.individuals / metrics.total) * 100).toFixed(1) : 0}% Individual
            </span>
            <p className="text-slate-300 text-[11px]">Majority of network consists of individual participants.</p>
          </div>
        </div>
      </div>

      {/* ── 9. BOTTOM RETURN BUTTON ── */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onClose}
          className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs font-mono flex items-center gap-2 cursor-pointer shadow-xl shadow-cyan-500/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-black" /> Return to Talent Network Candidate Roster
        </button>
      </div>
    </div>
  );
};
