'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './SupabaseAuthProvider';

// ===== SVG Icons (Lucide-style) =====
const Icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  wallet: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
    </svg>
  ),
  chart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
    </svg>
  ),
  brain: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
      <path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/>
      <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
    </svg>
  ),
  arrowUp: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>
    </svg>
  ),
  arrowDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 12-7 7-7-7"/><path d="M12 5v14"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  home: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  clock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  messageCircle: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
    </svg>
  ),
};

// ===== Color Tokens =====
const colors = {
  primary: '#7C3AED',     // violet-600
  primaryLight: '#A78BFA', // violet-400
  primaryBg: 'rgba(124,58,237,0.08)',
  success: '#10B981',
  successBg: 'rgba(16,185,129,0.08)',
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.08)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.08)',
  info: '#3B82F6',
  infoBg: 'rgba(59,130,246,0.08)',
};

// ===== SVG Area Chart =====
function AreaChart({ data, valueKey = 'count', labelKey = 'date', height = 180, color = colors.primary, showLabels = true }) {
  if (!data || data.length === 0) return <EmptyState text="Sem dados ainda" />;

  const values = data.map(d => d[valueKey] || 0);
  const max = Math.max(...values, 1);
  const w = 100;
  const h = 100;
  const padding = 2;

  const points = values.map((v, i) => ({
    x: padding + (i / Math.max(values.length - 1, 1)) * (w - padding * 2),
    y: h - padding - (v / max) * (h - padding * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;

  return (
    <div style={{ height }} className="relative w-full">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={color} className="opacity-0 hover:opacity-100 transition-opacity" vectorEffect="non-scaling-stroke">
            <title>{`${data[i][labelKey]}: ${values[i]}`}</title>
          </circle>
        ))}
      </svg>
      {showLabels && data.length <= 14 && (
        <div className="flex justify-between mt-1 px-0.5">
          {data.map((d, i) => (
            <span key={i} className="text-[9px] text-gray-400 dark:text-gray-500 truncate" style={{ maxWidth: `${100 / data.length}%` }}>
              {d[labelKey]?.slice(5)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== SVG Bar Chart =====
function BarChart({ data, valueKey = 'count', labelKey = 'label', height = 180, color = colors.primary, horizontal = false }) {
  if (!data || data.length === 0) return <EmptyState text="Sem dados ainda" />;

  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);

  if (horizontal) {
    return (
      <div className="space-y-2" style={{ minHeight: height }}>
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 dark:text-gray-400 w-20 truncate text-right" title={d[labelKey]}>
              {d[labelKey]}
            </span>
            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                style={{
                  width: `${Math.max(3, (d[valueKey] / max) * 100)}%`,
                  backgroundColor: color,
                }}
              >
                <span className="text-[10px] font-bold text-white drop-shadow-sm">{d[valueKey]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ height }} className="flex items-end gap-[3px] w-full">
      {data.map((d, i) => {
        const h = Math.max(4, (d[valueKey] / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
            <div className="relative w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t-md transition-all duration-300 group-hover:opacity-80"
                style={{ height: `${h}%`, backgroundColor: color }}
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                  {d[valueKey]}
                </div>
              </div>
            </div>
            <span className="text-[8px] text-gray-400 dark:text-gray-500 mt-1 truncate w-full text-center">
              {d[labelKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ===== Donut Chart =====
function DonutChart({ data, size = 140, thickness = 24 }) {
  if (!data || data.length === 0) return <EmptyState text="Sem dados" />;

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyState text="Sem dados" />;

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const chartColors = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const pct = d.value / total;
          const dashArray = `${pct * circumference} ${circumference}`;
          const rotation = (offset * 360) - 90;
          const el = (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={chartColors[i % chartColors.length]}
              strokeWidth={thickness}
              strokeDasharray={dashArray}
              strokeDashoffset="0"
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
              className="transition-all duration-500"
            >
              <title>{`${d.label}: ${d.value} (${(pct * 100).toFixed(0)}%)`}</title>
            </circle>
          );
          offset += pct;
          return el;
        })}
        <text x={size / 2} y={size / 2 - 6} textAnchor="middle" className="fill-gray-800 dark:fill-gray-200 text-lg font-bold" style={{ fontSize: '18px' }}>
          {total}
        </text>
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle" className="fill-gray-400 text-[10px]" style={{ fontSize: '10px' }}>
          total
        </text>
      </svg>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
            <span className="text-xs text-gray-600 dark:text-gray-400">{d.label}</span>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 ml-auto tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Empty State =====
function EmptyState({ text, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
          <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/><path d="m19 9-5 5-4-4-3 3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p className="text-sm text-gray-400 dark:text-gray-500">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ===== KPI Card =====
function KPICard({ label, value, sub, icon, trend, color = 'primary' }) {
  const colorMap = {
    primary: { bg: 'bg-violet-50 dark:bg-violet-950/30', icon: 'text-violet-600 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-900/50' },
    success: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/50' },
    danger: { bg: 'bg-red-50 dark:bg-red-950/30', icon: 'text-red-500 dark:text-red-400', border: 'border-red-100 dark:border-red-900/50' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', icon: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/50' },
    info: { bg: 'bg-blue-50 dark:bg-blue-950/30', icon: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/50' },
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <div className={`rounded-2xl border ${c.border} bg-white dark:bg-[#1a1625] p-5 transition-all hover:shadow-md hover:shadow-black/5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1.5 tabular-nums">{value}</p>
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center ${c.icon}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {trend >= 0 ? Icons.arrowUp : Icons.arrowDown}
            {Math.abs(trend)}%
          </span>
        )}
        {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

// ===== Card Container =====
function Card({ title, children, className = '', action }) {
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1625] p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ===== Plan Badge =====
function PlanBadge({ plan }) {
  const styles = {
    free: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    pro: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    premium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${styles[plan] || styles.free}`}>
      {plan}
    </span>
  );
}

function StatusBadge({ status }) {
  const isActive = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
      isActive
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {isActive ? 'Ativo' : 'Inativo'}
    </span>
  );
}

// ===== Word Cloud (simple) =====
function WordCloud({ keywords }) {
  if (!keywords || keywords.length === 0) return <EmptyState text="Poucos dados para gerar insights" />;

  const maxCount = Math.max(...keywords.map(k => k.count), 1);

  return (
    <div className="flex flex-wrap gap-2 items-center justify-center py-2">
      {keywords.map((k, i) => {
        const intensity = k.count / maxCount;
        const size = 12 + intensity * 14; // 12px to 26px
        const opacity = 0.4 + intensity * 0.6;
        return (
          <span
            key={i}
            className="inline-block px-2 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium transition-all hover:scale-110 cursor-default"
            style={{ fontSize: size, opacity }}
            title={`${k.word}: ${k.count} menções`}
          >
            {k.word}
          </span>
        );
      })}
    </div>
  );
}

// ===== Main Admin Dashboard =====
export default function AdminDashboard() {
  const { user, getAccessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [usage, setUsage] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchApi = useCallback(async (path) => {
    const token = await getAccessToken();
    const res = await fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erro ${res.status}`);
    }
    return res.json();
  }, [getAccessToken]);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchApi('/api/admin/stats');
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  }, [fetchApi]);

  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: userPage, limit: 50 });
      if (searchTerm) params.set('search', searchTerm);
      if (filterPlan) params.set('plan', filterPlan);
      if (filterStatus) params.set('status', filterStatus);
      const data = await fetchApi(`/api/admin/users?${params}`);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  }, [fetchApi, userPage, searchTerm, filterPlan, filterStatus]);

  const loadUsage = useCallback(async () => {
    try {
      const data = await fetchApi('/api/admin/usage?days=30');
      setUsage(data);
    } catch {
      setUsage(null);
    }
  }, [fetchApi]);

  const loadInsights = useCallback(async () => {
    try {
      const data = await fetchApi('/api/admin/insights?days=30');
      setInsights(data);
    } catch {
      setInsights(null);
    }
  }, [fetchApi]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      await Promise.all([loadStats(), loadUsage(), loadInsights()]);
      setLoading(false);
    })();
  }, [loadStats, loadUsage, loadInsights]);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
  }, [activeTab, loadUsers]);

  const handleUserAction = async (userId, action, value) => {
    setActionLoading(userId);
    try {
      const token = await getAccessToken();
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, value }),
      });
      await loadUsers();
      if (activeTab === 'dashboard') await loadStats();
    } catch {}
    setActionLoading(null);
  };

  // Donut data for plans
  const planDonut = useMemo(() => {
    if (!stats?.planCounts) return [];
    return [
      { label: 'Free', value: stats.planCounts.free || 0 },
      { label: 'Pro', value: stats.planCounts.pro || 0 },
      { label: 'Premium', value: stats.planCounts.premium || 0 },
    ].filter(d => d.value > 0);
  }, [stats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0b1a]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-[3px] border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400 font-medium">Carregando painel...</p>
        </div>
      </div>
    );
  }

  if (error === 'Acesso negado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0b1a]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Acesso Restrito</h2>
          <p className="text-sm text-gray-500">Você não tem permissão para acessar o painel admin.</p>
          <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors">
            {Icons.home} Voltar ao app
          </a>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
    { id: 'users', label: 'Usuários', icon: Icons.users },
    { id: 'financial', label: 'Financeiro', icon: Icons.wallet },
    { id: 'monitoring', label: 'Monitoramento', icon: Icons.chart },
    { id: 'insights', label: 'Insights', icon: Icons.brain },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0b1a]">
      {/* Header */}
      <header className="bg-white dark:bg-[#1a1625] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-gray-400 hover:text-violet-600 transition-colors" aria-label="Voltar ao app">
              {Icons.home}
            </a>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
            <h1 className="text-lg font-extrabold bg-gradient-to-r from-violet-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Maluar Admin
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">{user?.email}</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white dark:bg-[#1a1625] border-b border-gray-200 dark:border-gray-800 sticky top-[57px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ===== DASHBOARD ===== */}
        {activeTab === 'dashboard' && stats && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                label="Total Usuários" value={stats.totalUsers}
                sub={`+${stats.newUsersWeek} esta semana`}
                icon={Icons.users} color="primary"
              />
              <KPICard
                label="MRR" value={`R$ ${stats.revenue?.mrr?.toFixed(2)}`}
                sub={`${stats.revenue?.conversionRate}% conversão`}
                icon={Icons.wallet} color="success"
              />
              <KPICard
                label="Msgs Hoje" value={stats.totalMessagesToday}
                sub={`${stats.totalMessages} total`}
                icon={Icons.messageCircle} color="info"
              />
              <KPICard
                label="Custo IA/mês"
                value={stats.revenue?.monthlyCost !== null ? `US$ ${stats.revenue.monthlyCost}` : '—'}
                sub={stats.revenue?.margin !== null ? `Margem: R$ ${stats.revenue.margin}` : 'Sem dados'}
                icon={Icons.chart} color="danger"
              />
            </div>

            {/* Charts row */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card title="Distribuição por Plano">
                <DonutChart data={planDonut} />
              </Card>

              <Card title="Por Nível">
                {stats.levelCounts && (
                  <div className="space-y-3">
                    {Object.entries(stats.levelCounts).map(([level, count]) => {
                      const labels = { iniciante: 'Iniciante', intermediario: 'Intermediária', avancada: 'Avançada' };
                      const pct = stats.totalUsers ? ((count / stats.totalUsers) * 100).toFixed(0) : 0;
                      return (
                        <div key={level} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">{labels[level] || level}</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200 tabular-nums">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card title="Por Status">
                {stats.statusCounts && (
                  <div className="space-y-3">
                    {Object.entries(stats.statusCounts).map(([status, count]) => {
                      const pct = stats.totalUsers ? ((count / stats.totalUsers) * 100).toFixed(0) : 0;
                      return (
                        <div key={status} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <StatusBadge status={status} />
                            <span className="font-bold text-gray-800 dark:text-gray-200 tabular-nums">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${status === 'active' ? 'bg-emerald-500' : 'bg-red-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Recent users */}
            <Card title="Últimos Cadastros">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {stats.recentUsers?.map((u, i) => (
                  <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{u.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <PlanBadge plan={u.plan} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      {Icons.clock}
                      <span className="text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* ===== USUÁRIOS ===== */}
        {activeTab === 'users' && (
          <>
            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{Icons.search}</div>
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setUserPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none text-gray-700 dark:text-gray-200 transition-all"
                />
              </div>
              <select
                value={filterPlan}
                onChange={(e) => { setFilterPlan(e.target.value); setUserPage(1); }}
                className="px-4 py-2.5 text-xs bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none transition-all"
              >
                <option value="">Todos planos</option>
                <option value="free">Grátis</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setUserPage(1); }}
                className="px-4 py-2.5 text-xs bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none transition-all"
              >
                <option value="">Todos status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>

            {/* Tabela */}
            <Card className="!p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                      <th className="text-left px-5 py-3.5 text-gray-500 font-semibold uppercase tracking-wider">Usuário</th>
                      <th className="text-left px-5 py-3.5 text-gray-500 font-semibold uppercase tracking-wider">Plano</th>
                      <th className="text-left px-5 py-3.5 text-gray-500 font-semibold uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3.5 text-gray-500 font-semibold uppercase tracking-wider">Msgs Hoje</th>
                      <th className="text-left px-5 py-3.5 text-gray-500 font-semibold uppercase tracking-wider">Cadastro</th>
                      <th className="text-right px-5 py-3.5 text-gray-500 font-semibold uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {users?.users?.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {u.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700 dark:text-gray-200">{u.name}</p>
                              <p className="text-[10px] text-gray-400">{u.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><PlanBadge plan={u.plan} /></td>
                        <td className="px-5 py-3.5"><StatusBadge status={u.status || 'active'} /></td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-gray-700 dark:text-gray-300 tabular-nums">{u.messages_today || 0}</span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 tabular-nums">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {(u.status || 'active') === 'active' ? (
                              <button
                                onClick={() => handleUserAction(u.id, 'deactivate')}
                                disabled={actionLoading === u.id}
                                className="px-2.5 py-1.5 text-[10px] font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                              >
                                Desativar
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUserAction(u.id, 'activate')}
                                disabled={actionLoading === u.id}
                                className="px-2.5 py-1.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                              >
                                Ativar
                              </button>
                            )}
                            <select
                              defaultValue={u.plan}
                              onChange={(e) => handleUserAction(u.id, 'changePlan', e.target.value)}
                              disabled={actionLoading === u.id}
                              className="px-2 py-1.5 text-[10px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 transition-colors"
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                              <option value="premium">Premium</option>
                            </select>
                            <button
                              onClick={() => handleUserAction(u.id, 'resetMessages')}
                              disabled={actionLoading === u.id}
                              className="px-2.5 py-1.5 text-[10px] font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
                              title="Resetar contador de mensagens"
                            >
                              Reset
                            </button>
                            <button
                              onClick={() => handleUserAction(u.id, 'resetPassword')}
                              disabled={actionLoading === u.id}
                              className="px-2.5 py-1.5 text-[10px] font-semibold bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
                              title="Enviar email de redefinição de senha"
                            >
                              Senha
                            </button>
                            <button
                              onClick={() => setConfirmDelete(u)}
                              disabled={actionLoading === u.id}
                              className="px-2.5 py-1.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-950/70"
                              title="Excluir usuário permanentemente"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Paginação */}
            {users && users.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{users.total} usuários encontrados</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    disabled={userPage <= 1}
                    className="p-2 bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-lg disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Página anterior"
                  >
                    {Icons.chevronLeft}
                  </button>
                  <span className="px-3 py-2 text-xs text-gray-500 font-medium tabular-nums">{userPage} / {users.totalPages}</span>
                  <button
                    onClick={() => setUserPage(p => Math.min(users.totalPages, p + 1))}
                    disabled={userPage >= users.totalPages}
                    className="p-2 bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-lg disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Próxima página"
                  >
                    {Icons.chevronRight}
                  </button>
                </div>
              </div>
            )}

            {/* Modal de confirmação de exclusão */}
            {confirmDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-[#1a1625] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-800">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </div>
                  <h3 className="text-center font-bold text-gray-800 dark:text-white mb-1">Excluir Usuário</h3>
                  <p className="text-center text-sm text-gray-500 mb-1">Tem certeza que deseja excluir permanentemente:</p>
                  <p className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{confirmDelete.name}</p>
                  <p className="text-center text-xs text-gray-400 mb-4">{confirmDelete.email}</p>
                  <p className="text-center text-xs text-red-500 mb-4">Esta ação não pode ser desfeita.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        await handleUserAction(confirmDelete.id, 'deleteUser');
                        setConfirmDelete(null);
                      }}
                      disabled={actionLoading === confirmDelete.id}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === confirmDelete.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== FINANCEIRO ===== */}
        {activeTab === 'financial' && stats && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard label="MRR (Receita Mensal)" value={`R$ ${stats.revenue?.mrr?.toFixed(2)}`} icon={Icons.wallet} color="success" />
              <KPICard
                label="Assinantes Pro" value={stats.planCounts?.pro || 0}
                sub={`× R$ 29,90 = R$ ${((stats.planCounts?.pro || 0) * 29.90).toFixed(2)}`}
                color="primary"
              />
              <KPICard
                label="Assinantes Premium" value={stats.planCounts?.premium || 0}
                sub={`× R$ 59,90 = R$ ${((stats.planCounts?.premium || 0) * 59.90).toFixed(2)}`}
                color="warning"
              />
              <KPICard
                label="Taxa de Conversão" value={`${stats.revenue?.conversionRate}%`}
                sub={`${(stats.planCounts?.pro || 0) + (stats.planCounts?.premium || 0)} pagantes de ${stats.totalUsers}`}
                color="info"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card title="Custo IA (últimos 30 dias)">
                {usage ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Custo Total</p>
                        <p className="text-xl font-extrabold text-red-500 mt-0.5 tabular-nums">US$ {usage.totals?.cost?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Projeção Mensal</p>
                        <p className="text-xl font-extrabold text-gray-700 dark:text-gray-200 mt-0.5 tabular-nums">US$ {usage.totals?.projectedMonthlyCost?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Requisições</p>
                        <p className="text-xl font-extrabold text-gray-700 dark:text-gray-200 mt-0.5 tabular-nums">{usage.totals?.requests}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Custo Médio/dia</p>
                        <p className="text-xl font-extrabold text-gray-700 dark:text-gray-200 mt-0.5 tabular-nums">US$ {usage.totals?.avgDailyCost?.toFixed(2)}</p>
                      </div>
                    </div>
                    <AreaChart data={usage.dailyUsage} valueKey="cost" labelKey="date" color={colors.danger} />
                  </>
                ) : (
                  <EmptyState text="Execute o SQL migration pra ativar o monitoramento" />
                )}
              </Card>

              <Card title="Margem Estimada">
                <div className="space-y-0">
                  {[
                    { label: 'Receita mensal (MRR)', value: `R$ ${stats.revenue?.mrr?.toFixed(2)}`, color: 'text-emerald-600' },
                    { label: 'Custo IA (est. em R$)', value: usage?.totals?.projectedMonthlyCost ? `- R$ ${(usage.totals.projectedMonthlyCost * 5.5).toFixed(2)}` : '—', color: 'text-red-500' },
                    { label: 'Vercel (Hobby)', value: 'R$ 0,00', color: 'text-gray-500' },
                    { label: 'Supabase (Free)', value: 'R$ 0,00', color: 'text-gray-500' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-xs text-gray-500">{row.label}</span>
                      <span className={`text-xs font-bold ${row.color} tabular-nums`}>{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-3 mt-1 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl px-3 -mx-1">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Margem Líquida</span>
                    <span className="text-sm font-extrabold text-emerald-600 tabular-nums">
                      {usage?.totals?.projectedMonthlyCost
                        ? `R$ ${(stats.revenue.mrr - usage.totals.projectedMonthlyCost * 5.5).toFixed(2)}`
                        : `R$ ${stats.revenue?.mrr?.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ===== MONITORAMENTO ===== */}
        {activeTab === 'monitoring' && (
          <>
            {usage ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard label="Requisições (30d)" value={usage.totals?.requests || 0} icon={Icons.chart} color="primary" />
                  <KPICard label="Tokens Input" value={((usage.totals?.inputTokens || 0) / 1000).toFixed(0) + 'K'} color="info" />
                  <KPICard label="Tokens Output" value={((usage.totals?.outputTokens || 0) / 1000).toFixed(0) + 'K'} color="warning" />
                  <KPICard label="Custo Total" value={`US$ ${usage.totals?.cost?.toFixed(2)}`} icon={Icons.wallet} color="danger" />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card title="Uso por Modelo">
                    <BarChart
                      data={Object.entries(usage.modelBreakdown || {}).map(([model, count]) => ({
                        label: model.replace('claude-', '').replace('claude-sonnet-4-20250514', 'Sonnet'),
                        count,
                      }))}
                      horizontal
                      color={colors.primary}
                    />
                  </Card>

                  <Card title="Uso por Feature">
                    <BarChart
                      data={Object.entries(usage.featureBreakdown || {}).map(([feature, count]) => ({
                        label: feature.charAt(0).toUpperCase() + feature.slice(1),
                        count,
                      }))}
                      horizontal
                      color={colors.info}
                    />
                  </Card>
                </div>

                <Card title="Requisições por Dia (últimos 14 dias)">
                  <AreaChart data={usage.dailyUsage} valueKey="requests" labelKey="date" height={200} color={colors.primary} />
                </Card>

                <Card title="Custo por Dia (US$)">
                  <AreaChart data={usage.dailyUsage} valueKey="cost" labelKey="date" height={200} color={colors.danger} />
                </Card>
              </>
            ) : (
              <Card>
                <EmptyState
                  text="Execute o SQL migration no Supabase para criar a tabela usage_logs. Os dados serão registrados automaticamente."
                />
              </Card>
            )}
          </>
        )}

        {/* ===== INSIGHTS ===== */}
        {activeTab === 'insights' && (
          <>
            {insights ? (
              <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard
                    label="Mensagens (30d)" value={insights.summary?.totalMessages || 0}
                    icon={Icons.messageCircle} color="primary"
                  />
                  <KPICard
                    label="Conversas Únicas" value={insights.summary?.uniqueChats || 0}
                    icon={Icons.brain} color="info"
                  />
                  <KPICard
                    label="Tamanho Médio" value={`${insights.summary?.avgMessageLength || 0} chars`}
                    color="warning"
                  />
                  <KPICard
                    label="Top Palavra" value={insights.topKeywords?.[0]?.word || '—'}
                    sub={insights.topKeywords?.[0] ? `${insights.topKeywords[0].count} menções` : ''}
                    color="success"
                  />
                </div>

                {/* Word Cloud & Top Keywords */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card title="Nuvem de Palavras (últimos 30 dias)">
                    <WordCloud keywords={insights.topKeywords?.slice(0, 25)} />
                  </Card>

                  <Card title="Top Palavras-Chave">
                    <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                      {insights.topKeywords?.slice(0, 15).map((k, i) => {
                        const maxCount = insights.topKeywords[0]?.count || 1;
                        return (
                          <div key={i} className="flex items-center gap-3 py-1.5">
                            <span className="text-[10px] text-gray-400 w-5 text-right tabular-nums">{i + 1}</span>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 w-28 truncate">{k.word}</span>
                            <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded transition-all duration-500 flex items-center px-2"
                                style={{ width: `${(k.count / maxCount) * 100}%` }}
                              >
                                {(k.count / maxCount) > 0.2 && (
                                  <span className="text-[10px] font-bold text-white">{k.count}</span>
                                )}
                              </div>
                            </div>
                            {(k.count / maxCount) <= 0.2 && (
                              <span className="text-[10px] font-bold text-gray-500 tabular-nums w-8">{k.count}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                {/* Top Phrases */}
                <Card title="Frases Mais Comuns (bigramas)">
                  {insights.topPhrases?.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {insights.topPhrases.map((p, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-2.5">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">&ldquo;{p.phrase}&rdquo;</span>
                          <span className="text-xs font-bold text-violet-600 dark:text-violet-400 tabular-nums ml-3">{p.count}x</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="Poucos dados para extrair frases" />
                  )}
                </Card>

                {/* Activity Charts */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card title="Atividade por Hora do Dia">
                    <BarChart
                      data={insights.hourlyActivity}
                      valueKey="count"
                      labelKey="hour"
                      height={160}
                      color={colors.primary}
                    />
                  </Card>

                  <Card title="Atividade por Dia da Semana">
                    <BarChart
                      data={insights.weekdayActivity}
                      valueKey="count"
                      labelKey="day"
                      height={160}
                      color={colors.info}
                    />
                  </Card>
                </div>

                {/* Volume diário */}
                <Card title="Volume de Mensagens por Dia">
                  <AreaChart
                    data={insights.dailyMessages}
                    valueKey="count"
                    labelKey="date"
                    height={200}
                    color={colors.success}
                  />
                </Card>

                {/* Perguntas recentes */}
                <Card title="Últimas Perguntas dos Usuários">
                  <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[400px] overflow-y-auto">
                    {insights.recentQuestions?.map((q, i) => (
                      <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {Icons.messageCircle}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">{q.content}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(q.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            ) : (
              <Card>
                <EmptyState text="Sem dados de conversas para analisar. Os insights aparecerão quando houver mensagens." />
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
