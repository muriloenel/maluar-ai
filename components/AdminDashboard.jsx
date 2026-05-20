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
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  pix: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M2 12h20M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7"/>
    </svg>
  ),
};

// ===== Color Tokens =====
const CATEGORY_LABELS = {
  quotas: '📊 Quotas & Limites',
  ai: '🤖 IA & Bot',
  business: '💰 Negócio',
  system: '⚙️ Sistema',
};

const CATEGORY_META = {
  quotas: {
    icon: '📊',
    title: 'Quotas & Limites',
    desc: 'Controle de mensagens, imagens e rate limits por plano',
    gradient: 'from-blue-500 to-cyan-400',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800/40',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  ai: {
    icon: '🤖',
    title: 'IA & Bot',
    desc: 'Modelos, tokens, temperatura e instruções personalizadas',
    gradient: 'from-violet-500 to-purple-400',
    bg: 'bg-violet-50 dark:bg-violet-950/20',
    border: 'border-violet-200 dark:border-violet-800/40',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  },
  business: {
    icon: '💰',
    title: 'Negócio',
    desc: 'Preços e valores para cálculos de MRR',
    gradient: 'from-amber-500 to-orange-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800/40',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  system: {
    icon: '⚙️',
    title: 'Sistema',
    desc: 'Manutenção, avisos globais e controle de acesso',
    gradient: 'from-rose-500 to-pink-400',
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    border: 'border-rose-200 dark:border-rose-800/40',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
};

const CONFIG_DESCRIPTIONS = {
  quota_messages_free: 'Mensagens que usuárias grátis podem enviar por dia',
  quota_messages_pro: 'Mensagens que usuárias Pro podem enviar por dia',
  quota_messages_premium: 'Mensagens ilimitadas para Premium (use 9999)',
  quota_images_free: 'Geração de imagens IA por dia (0 = desabilitado)',
  quota_images_pro: 'Imagens que Pro pode gerar por dia',
  quota_images_premium: 'Imagens que Premium pode gerar por dia',
  rate_limit_free: 'Máximo de requisições por minuto — Free',
  rate_limit_pro: 'Máximo de requisições por minuto — Pro',
  rate_limit_premium: 'Máximo de requisições por minuto — Premium',
  ai_model_default: 'Modelo usado para perguntas simples e conversas casuais',
  ai_model_complex: 'Modelo usado quando detecta perguntas longas/complexas',
  ai_max_tokens_casual: 'Tamanho máximo de resposta para perguntas casuais',
  ai_max_tokens_complex: 'Tamanho máximo de resposta para perguntas complexas',
  ai_max_tokens_image: 'Tamanho máximo de resposta quando há imagem anexa',
  ai_temperature: 'Criatividade das respostas (0 = precisa, 1 = criativa)',
  ai_extra_instructions: 'Instruções que serão injetadas no prompt do bot em tempo real',
  price_free: 'Para cálculo de MRR no dashboard',
  price_pro: 'Preço mensal do plano Pro (R$)',
  price_premium: 'Preço mensal do plano Premium (R$)',
  maintenance_mode: 'Quando ativo, bloqueia todas as APIs e mostra mensagem de manutenção',
  maintenance_message: 'Mensagem exibida quando o modo manutenção está ativo',
  global_banner: 'Banner exibido no topo do app para todas as usuárias',
  global_banner_type: 'Cor e estilo do banner global',
};

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
  const [registrations, setRegistrations] = useState(null);
  const [regPeriod, setRegPeriod] = useState('day');
  const [regChartType, setRegChartType] = useState('bar'); // bar | area | cumulative
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
  const [filterLevel, setFilterLevel] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ name: '', email: '', phone: '' });
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createdUserPassword, setCreatedUserPassword] = useState(null);
  const [configs, setConfigs] = useState(null);
  const [configEdits, setConfigEdits] = useState({});
  const [configSaving, setConfigSaving] = useState(false);
  const [configDefaults, setConfigDefaults] = useState({});

  // Assinaturas states
  const [pixPayments, setPixPayments] = useState(null);
  const [stripeSubscriptions, setStripeSubscriptions] = useState([]);
  const [pixAlerts, setPixAlerts] = useState({ expiringSoon: 0, justExpired: 0 });
  const [pixExpiredNow, setPixExpiredNow] = useState([]);
  const [pixFilter, setPixFilter] = useState('all'); // all | active | expiring | expired | cancelled | pix | stripe
  const [pixShowForm, setPixShowForm] = useState(false);
  const [pixUserSearch, setPixUserSearch] = useState('');
  const [pixSearchResults, setPixSearchResults] = useState([]);
  const [pixSelectedUser, setPixSelectedUser] = useState(null);
  const [pixPlan, setPixPlan] = useState('pro');
  const [pixPaidAt, setPixPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [pixNotes, setPixNotes] = useState('');
  const [pixSaving, setPixSaving] = useState(false);
  const [pixActionLoading, setPixActionLoading] = useState(null);
  const [pixNotifications, setPixNotifications] = useState([]);
  const [pixEmailSent, setPixEmailSent] = useState(false);

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

  const loadRegistrations = useCallback(async (period) => {
    try {
      const data = await fetchApi(`/api/admin/stats/registrations?period=${period || regPeriod}`);
      setRegistrations(data);
    } catch {}
  }, [fetchApi, regPeriod]);

  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: userPage, limit: 50 });
      if (searchTerm) params.set('search', searchTerm);
      if (filterPlan) params.set('plan', filterPlan);
      if (filterStatus) params.set('status', filterStatus);
      if (filterLevel) params.set('level', filterLevel);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);
      if (sortField) params.set('sort', sortField);
      if (sortDir) params.set('dir', sortDir);
      const data = await fetchApi(`/api/admin/users?${params}`);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  }, [fetchApi, userPage, searchTerm, filterPlan, filterStatus, filterLevel, filterDateFrom, filterDateTo, sortField, sortDir]);

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

  const loadConfigs = useCallback(async () => {
    try {
      const data = await fetchApi('/api/admin/config');
      setConfigs(data.configs);
      setConfigDefaults(data.defaults || {});
      setConfigEdits({});
    } catch {
      setConfigs(null);
    }
  }, [fetchApi]);

  const saveConfigs = useCallback(async () => {
    if (Object.keys(configEdits).length === 0) return;
    setConfigSaving(true);
    try {
      const token = await getAccessToken();
      // Converter tipos: números ficam como número, booleans como boolean
      const updates = {};
      for (const [key, val] of Object.entries(configEdits)) {
        if (key === 'maintenance_mode') {
          updates[key] = val === 'true' || val === true;
        } else if (key.startsWith('quota_') || key.startsWith('rate_limit_') || key.startsWith('ai_max_tokens_') || key.startsWith('price_') || key === 'ai_temperature') {
          updates[key] = Number(val);
        } else {
          updates[key] = val;
        }
      }
      await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      await loadConfigs();
    } catch {}
    setConfigSaving(false);
  }, [configEdits, getAccessToken, loadConfigs]);

  // ===== Pix Functions =====
  const loadPix = useCallback(async () => {
    try {
      const [data, usersData] = await Promise.all([
        fetchApi('/api/admin/pix'),
        fetchApi('/api/admin/users?limit=1'),
      ]);
      setPixPayments(data.payments || []);
      setStripeSubscriptions(data.stripeSubscriptions || []);
      setPixAlerts(data.alerts || { expiringSoon: 0, justExpired: 0 });
      if (usersData?.planCounts) setUsers(prev => prev ? { ...prev, planCounts: usersData.planCounts } : { planCounts: usersData.planCounts });
      // Notificações de expirados agora
      if (data.expiredNow?.length > 0) {
        setPixExpiredNow(data.expiredNow);
        setPixNotifications(prev => [
          ...data.expiredNow.map(e => ({
            type: 'expired',
            message: `Plano rebaixado para Free (Pix expirado)`,
            userId: e.userId,
          })),
          ...prev,
        ]);
      }
    } catch (err) {
      console.error('[PIX] Erro ao carregar:', err.message);
      setPixPayments([]);
    }
  }, [fetchApi]);

  const searchPixUsers = useCallback(async (term) => {
    if (!term || term.length < 2) { setPixSearchResults([]); return; }
    try {
      const data = await fetchApi(`/api/admin/users?search=${encodeURIComponent(term)}&limit=10`);
      setPixSearchResults(data.users || []);
    } catch {
      setPixSearchResults([]);
    }
  }, [fetchApi]);

  const createPixPayment = useCallback(async () => {
    if (!pixSelectedUser) return;
    setPixSaving(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/admin/pix', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: pixSelectedUser.id,
          plan: pixPlan,
          paidAt: pixPaidAt,
          notes: pixNotes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Erro ao registrar: ${err.error || 'Erro desconhecido'}`);
        setPixSaving(false);
        return;
      }
      // Reset form
      setPixShowForm(false);
      setPixSelectedUser(null);
      setPixUserSearch('');
      setPixPlan('pro');
      setPixPaidAt(new Date().toISOString().split('T')[0]);
      setPixNotes('');
      await loadPix();
    } catch (err) {
      console.error('[PIX] Erro ao registrar:', err);
      alert('Erro ao registrar pagamento. Verifique o console.');
    }
    setPixSaving(false);
  }, [pixSelectedUser, pixPlan, pixPaidAt, pixNotes, getAccessToken, loadPix]);

  const handlePixAction = useCallback(async (paymentId, action) => {
    setPixActionLoading(paymentId);
    try {
      const token = await getAccessToken();
      await fetch('/api/admin/pix', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      });
      await loadPix();
    } catch {}
    setPixActionLoading(null);
  }, [getAccessToken, loadPix]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      await Promise.all([loadStats(), loadUsage(), loadInsights(), loadRegistrations()]);
      setLoading(false);
    })();
  }, [loadStats, loadUsage, loadInsights]);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'config') loadConfigs();
    if (activeTab === 'pix') loadPix();
  }, [activeTab, loadUsers, loadConfigs, loadPix]);

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

  const handleCreateUser = async () => {
    const { name, email, phone } = createUserForm;
    if (!name.trim() || !email.trim()) return alert('Nome e email são obrigatórios');
    setCreateUserLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.replace(/\D/g, '') }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Erro: ${data.error || 'Erro desconhecido'}`);
      } else {
        setCreatedUserPassword(data.password);
        setCreateUserForm({ name: '', email: '', phone: '' });
        await loadUsers();
      }
    } catch (err) {
      alert('Erro ao criar usuário: ' + err.message);
    }
    setCreateUserLoading(false);
  };

  const formatPhoneDisplay = (p) => {
    if (!p) return '—';
    const d = String(p).replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return p;
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
    { id: 'config', label: 'Configurações', icon: Icons.settings },
    { id: 'pix', label: 'Assinaturas', icon: Icons.wallet },
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
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard
                label="Total Usuários" value={stats.totalUsers}
                sub={`+${stats.newUsersWeek} esta semana`}
                icon={Icons.users} color="primary"
              />
              <KPICard
                label="Online Agora" value={stats.onlineNow || 0}
                sub={stats.onlineUsers?.length ? stats.onlineUsers.slice(0, 3).map(u => u.name?.split(' ')[0]).join(', ') + (stats.onlineUsers.length > 3 ? '…' : '') : 'Ninguém agora'}
                icon={Icons.clock} color="success"
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

            {/* ===== CADASTROS DE USUÁRIOS ===== */}
            {registrations && (
              <>
                {/* Header com filtros */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      {Icons.users}
                      <span>Cadastros de Usuários</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">Acompanhe o crescimento da base de usuários</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Filtro de período */}
                    <div className="flex bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                      {[
                        { id: 'day', label: 'Dia' },
                        { id: 'week', label: 'Semana' },
                        { id: 'month', label: 'Mês' },
                        { id: 'year', label: 'Ano' },
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setRegPeriod(p.id); loadRegistrations(p.id); }}
                          className={`px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                            regPeriod === p.id
                              ? 'bg-violet-600 text-white'
                              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {/* Tipo de gráfico */}
                    <div className="flex bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                      {[
                        { id: 'bar', label: '▮▮' },
                        { id: 'area', label: '📈' },
                        { id: 'cumulative', label: '📊' },
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setRegChartType(t.id)}
                          className={`px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                            regChartType === t.id
                              ? 'bg-violet-600 text-white'
                              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                          }`}
                          title={t.id === 'bar' ? 'Barras' : t.id === 'area' ? 'Área' : 'Acumulado'}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* KPIs de cadastros */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard
                    label="Período Visível"
                    value={registrations.totalInPeriod}
                    sub={`de ${registrations.total} total`}
                    icon={Icons.users} color="primary"
                  />
                  <KPICard
                    label={`Média/${regPeriod === 'day' ? 'dia' : regPeriod === 'week' ? 'sem' : regPeriod === 'month' ? 'mês' : 'ano'}`}
                    value={registrations.avgPerPeriod}
                    sub="por período"
                    icon={Icons.chart} color="info"
                  />
                  <KPICard
                    label="Pico"
                    value={registrations.maxDay?.count || 0}
                    sub={registrations.maxDay?.label || '—'}
                    icon={Icons.arrowUp} color="success"
                  />
                  <KPICard
                    label="Tendência"
                    value={`${registrations.trend > 0 ? '+' : ''}${registrations.trend}%`}
                    sub="2ª vs 1ª metade"
                    icon={registrations.trend >= 0 ? Icons.arrowUp : Icons.arrowDown}
                    color={registrations.trend >= 0 ? 'success' : 'danger'}
                  />
                </div>

                {/* Gráfico principal */}
                <Card title={regChartType === 'cumulative' ? 'Crescimento Acumulado' : `Novos Cadastros por ${regPeriod === 'day' ? 'Dia' : regPeriod === 'week' ? 'Semana' : regPeriod === 'month' ? 'Mês' : 'Ano'}`}>
                  {regChartType === 'bar' && (
                    <BarChart
                      data={registrations.data}
                      valueKey="count"
                      labelKey="label"
                      height={220}
                      color={colors.primary}
                    />
                  )}
                  {regChartType === 'area' && (
                    <AreaChart
                      data={registrations.data}
                      valueKey="count"
                      labelKey="label"
                      height={220}
                      color={colors.primary}
                    />
                  )}
                  {regChartType === 'cumulative' && (
                    <AreaChart
                      data={registrations.data}
                      valueKey="cumulative"
                      labelKey="label"
                      height={220}
                      color={colors.success}
                    />
                  )}
                </Card>

                {/* Gráficos detalhados — breakdown */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Cadastros por Plano */}
                  <Card title="Cadastros por Plano">
                    {registrations.data?.length > 0 ? (
                      <div style={{ height: 200 }} className="relative w-full">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                          {['free', 'pro', 'premium'].map((plan, planIdx) => {
                            const planColors = { free: '#3B82F6', pro: '#7C3AED', premium: '#F59E0B' };
                            const values = registrations.data.map(d => d.plans?.[plan] || 0);
                            const max = Math.max(...registrations.data.map(d => Math.max(d.plans?.free || 0, d.plans?.pro || 0, d.plans?.premium || 0)), 1);
                            const w = 100;
                            const h = 100;
                            const padding = 2;
                            const points = values.map((v, i) => ({
                              x: padding + (i / Math.max(values.length - 1, 1)) * (w - padding * 2),
                              y: h - padding - (v / max) * (h - padding * 2),
                            }));
                            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                            return (
                              <path key={plan} d={linePath} fill="none" stroke={planColors[plan]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.8} />
                            );
                          })}
                        </svg>
                        <div className="flex justify-center gap-4 mt-2">
                          {[
                            { plan: 'free', label: 'Free', color: '#3B82F6' },
                            { plan: 'pro', label: 'Pro', color: '#7C3AED' },
                            { plan: 'premium', label: 'Premium', color: '#F59E0B' },
                          ].map(p => (
                            <div key={p.plan} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{p.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <EmptyState text="Sem dados" />
                    )}
                  </Card>

                  {/* Cadastros por Nível */}
                  <Card title="Cadastros por Nível">
                    {registrations.data?.length > 0 ? (
                      <div style={{ height: 200 }} className="relative w-full">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                          {['iniciante', 'intermediario', 'avancada'].map((level) => {
                            const levelColors = { iniciante: '#10B981', intermediario: '#3B82F6', avancada: '#EC4899' };
                            const values = registrations.data.map(d => d.levels?.[level] || 0);
                            const max = Math.max(...registrations.data.map(d => Math.max(d.levels?.iniciante || 0, d.levels?.intermediario || 0, d.levels?.avancada || 0)), 1);
                            const w = 100;
                            const h = 100;
                            const padding = 2;
                            const points = values.map((v, i) => ({
                              x: padding + (i / Math.max(values.length - 1, 1)) * (w - padding * 2),
                              y: h - padding - (v / max) * (h - padding * 2),
                            }));
                            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                            return (
                              <path key={level} d={linePath} fill="none" stroke={levelColors[level]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.8} />
                            );
                          })}
                        </svg>
                        <div className="flex justify-center gap-4 mt-2">
                          {[
                            { level: 'iniciante', label: 'Iniciante', color: '#10B981' },
                            { level: 'intermediario', label: 'Intermediária', color: '#3B82F6' },
                            { level: 'avancada', label: 'Avançada', color: '#EC4899' },
                          ].map(l => (
                            <div key={l.level} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{l.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <EmptyState text="Sem dados" />
                    )}
                  </Card>
                </div>

                {/* Tabela detalhada dos últimos períodos */}
                <Card title="Detalhamento por Período" className="!p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                          <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Período</th>
                          <th className="text-right px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Total</th>
                          <th className="text-right px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Free</th>
                          <th className="text-right px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Pro</th>
                          <th className="text-right px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Premium</th>
                          <th className="text-right px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Acumulado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {registrations.data?.slice().reverse().map((d, i) => (
                          <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-200">{d.label}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-gray-800 dark:text-gray-200 tabular-nums">{d.count}</td>
                            <td className="px-4 py-2.5 text-right text-blue-600 dark:text-blue-400 tabular-nums">{d.plans?.free || 0}</td>
                            <td className="px-4 py-2.5 text-right text-violet-600 dark:text-violet-400 tabular-nums">{d.plans?.pro || 0}</td>
                            <td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-400 tabular-nums">{d.plans?.premium || 0}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">{d.cumulative}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}

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
            {/* Cabeçalho + Botão Criar */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Usuários</h2>
                <p className="text-xs text-gray-400">{users?.total || 0} usuários encontrados</p>
                {users?.planCounts && (
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Grátis: {users.planCounts.free || 0}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400 px-2 py-0.5 rounded-full">Pro: {users.planCounts.pro || 0}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">Premium: {users.planCounts.premium || 0}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => { setShowCreateUser(true); setCreatedUserPassword(null); }}
                className="px-4 py-2.5 text-xs font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                Cadastrar Usuário
              </button>
            </div>

            {/* Filtros */}
            <Card className="!p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="relative flex-1 min-w-[200px]">
                  <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">Busca</label>
                  <div className="absolute left-3 bottom-2.5 text-gray-400">{Icons.search}</div>
                  <input
                    type="text"
                    placeholder="Nome, email ou telefone..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setUserPage(1); }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none text-gray-700 dark:text-gray-200 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">Plano</label>
                  <select
                    value={filterPlan}
                    onChange={(e) => { setFilterPlan(e.target.value); setUserPage(1); }}
                    className="px-4 py-2.5 text-xs bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none transition-all"
                  >
                    <option value="">Todos</option>
                    <option value="free">Grátis</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setUserPage(1); }}
                    className="px-4 py-2.5 text-xs bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none transition-all"
                  >
                    <option value="">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">Nível</label>
                  <select
                    value={filterLevel}
                    onChange={(e) => { setFilterLevel(e.target.value); setUserPage(1); }}
                    className="px-4 py-2.5 text-xs bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none transition-all"
                  >
                    <option value="">Todos</option>
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediario">Intermediária</option>
                    <option value="avancada">Avançada</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">De</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => { setFilterDateFrom(e.target.value); setUserPage(1); }}
                    className="px-3 py-2.5 text-xs bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500/30 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">Até</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => { setFilterDateTo(e.target.value); setUserPage(1); }}
                    className="px-3 py-2.5 text-xs bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500/30 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">Ordenar</label>
                  <select
                    value={`${sortField}_${sortDir}`}
                    onChange={(e) => { const [f, d] = e.target.value.split('_'); setSortField(f); setSortDir(d); setUserPage(1); }}
                    className="px-4 py-2.5 text-xs bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500/30 outline-none transition-all"
                  >
                    <option value="created_at_desc">Mais recentes</option>
                    <option value="created_at_asc">Mais antigos</option>
                    <option value="name_asc">Nome A-Z</option>
                    <option value="name_desc">Nome Z-A</option>
                    <option value="messages_today_desc">Mais mensagens hoje</option>
                  </select>
                </div>
                {(filterPlan || filterStatus || filterLevel || filterDateFrom || filterDateTo || searchTerm) && (
                  <button
                    onClick={() => { setFilterPlan(''); setFilterStatus(''); setFilterLevel(''); setFilterDateFrom(''); setFilterDateTo(''); setSearchTerm(''); setUserPage(1); }}
                    className="px-3 py-2.5 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </Card>

            {/* Tabela */}
            <Card className="!p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                      <th className="text-left px-5 py-3.5 text-gray-500 font-semibold uppercase tracking-wider">Usuário</th>
                      <th className="text-left px-5 py-3.5 text-gray-500 font-semibold uppercase tracking-wider">Telefone</th>
                      <th className="text-left px-5 py-3.5 text-gray-500 font-semibold uppercase tracking-wider">Plano</th>
                      <th className="text-left px-5 py-3.5 text-gray-500 font-semibold uppercase tracking-wider">Nível</th>
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
                              <p className="font-semibold text-gray-700 dark:text-gray-200">{u.name || '—'}</p>
                              <p className="text-[10px] text-gray-400">{u.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {u.phone ? (
                            <a href={`https://wa.me/55${String(u.phone).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-colors" title="Abrir no WhatsApp">
                              {formatPhoneDisplay(u.phone)}
                            </a>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3.5"><PlanBadge plan={u.plan} /></td>
                        <td className="px-5 py-3.5">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{u.level || '—'}</span>
                        </td>
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

            {/* Modal Cadastrar Usuário */}
            {showCreateUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-[#1a1625] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-800">
                  {createdUserPassword ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500"><path d="M20 6 9 17l-5-5"/></svg>
                      </div>
                      <h3 className="text-center font-bold text-gray-800 dark:text-white mb-2">Usuário Criado!</h3>
                      <p className="text-center text-sm text-gray-500 mb-4">Envie a senha abaixo para o usuário:</p>
                      <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-4 mb-4 text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Senha gerada</p>
                        <p className="text-xl font-mono font-bold text-violet-600 dark:text-violet-400 select-all">{createdUserPassword}</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { navigator.clipboard.writeText(createdUserPassword); }}
                          className="flex-1 px-4 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
                        >
                          Copiar Senha
                        </button>
                        <button
                          onClick={() => { setShowCreateUser(false); setCreatedUserPassword(null); }}
                          className="flex-1 px-4 py-2.5 text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          Fechar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-center font-bold text-gray-800 dark:text-white mb-1">Cadastrar Usuário</h3>
                      <p className="text-center text-sm text-gray-500 mb-5">Uma senha aleatória será gerada automaticamente.</p>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-gray-500 font-semibold mb-1 block">Nome *</label>
                          <input
                            type="text"
                            value={createUserForm.name}
                            onChange={(e) => setCreateUserForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Nome completo"
                            className="w-full px-4 py-2.5 text-sm bg-white dark:bg-[#0f0b1a] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none text-gray-700 dark:text-gray-200"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-semibold mb-1 block">Email *</label>
                          <input
                            type="email"
                            value={createUserForm.email}
                            onChange={(e) => setCreateUserForm(f => ({ ...f, email: e.target.value }))}
                            placeholder="email@exemplo.com"
                            className="w-full px-4 py-2.5 text-sm bg-white dark:bg-[#0f0b1a] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none text-gray-700 dark:text-gray-200"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-semibold mb-1 block">Telefone</label>
                          <input
                            type="tel"
                            value={createUserForm.phone}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                              let formatted = digits;
                              if (digits.length > 2) formatted = `(${digits.slice(0,2)}) ${digits.slice(2)}`;
                              if (digits.length > 7) formatted = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
                              setCreateUserForm(f => ({ ...f, phone: formatted }));
                            }}
                            placeholder="(11) 99999-9999"
                            className="w-full px-4 py-2.5 text-sm bg-white dark:bg-[#0f0b1a] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none text-gray-700 dark:text-gray-200"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => { setShowCreateUser(false); setCreateUserForm({ name: '', email: '', phone: '' }); }}
                          className="flex-1 px-4 py-2.5 text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleCreateUser}
                          disabled={createUserLoading || !createUserForm.name.trim() || !createUserForm.email.trim()}
                          className="flex-1 px-4 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
                        >
                          {createUserLoading ? 'Criando...' : 'Criar Usuário'}
                        </button>
                      </div>
                    </>
                  )}
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

        {/* ===== CONFIG TAB ===== */}
        {activeTab === 'config' && (
          <>
            {configs ? (
              <div className="space-y-8">
                {/* Hero header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 p-6 sm:p-8 text-white">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTh2Mkg2di0yaDMweiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        {Icons.settings}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Configurações do App</h2>
                        <p className="text-white/70 text-sm">Controle em tempo real — alterações refletem instantaneamente</p>
                      </div>
                    </div>
                    {Object.keys(configEdits).length > 0 && (
                      <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 w-fit">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-sm font-medium">{Object.keys(configEdits).length} alteração{Object.keys(configEdits).length > 1 ? 'ões' : ''} não salva{Object.keys(configEdits).length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Alertas de recomendação */}
                {stats && (stats.aiCostMonth > 50 || (stats.totalUsers > 100 && stats.conversionRate < 5)) && (
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                        <span className="text-lg">💡</span>
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">Recomendações Inteligentes</h3>
                        {stats.aiCostMonth > 50 && (
                          <p className="text-sm text-amber-700 dark:text-amber-400">
                            Custo IA alto (${stats.aiCostMonth?.toFixed(2)}/mês). Reduza <code className="px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-800/40 text-xs font-mono">max_tokens_casual</code> para 200.
                          </p>
                        )}
                        {stats.totalUsers > 100 && stats.conversionRate < 5 && (
                          <p className="text-sm text-amber-700 dark:text-amber-400">
                            Conversão baixa ({stats.conversionRate?.toFixed(1)}%). Use o campo &ldquo;Instruções extras&rdquo; para promover planos Pro.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Categorias */}
                {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
                  const items = configs[catKey];
                  if (!items || items.length === 0) return null;
                  const editedCount = items.filter(i => configEdits[i.key] !== undefined).length;

                  return (
                    <div key={catKey} className={`rounded-2xl border ${meta.border} ${meta.bg} overflow-hidden`}>
                      {/* Category header */}
                      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-gray-200/50 dark:border-gray-700/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white shadow-sm`}>
                              <span className="text-lg">{meta.icon}</span>
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-gray-800 dark:text-white">{meta.title}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{meta.desc}</p>
                            </div>
                          </div>
                          {editedCount > 0 && (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.badge}`}>
                              {editedCount} editado{editedCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Config items */}
                      <div className="divide-y divide-gray-200/40 dark:divide-gray-700/20">
                        {items.map((item) => {
                          const editValue = configEdits[item.key] !== undefined ? configEdits[item.key] : item.value;
                          const isEdited = configEdits[item.key] !== undefined;
                          const isBoolean = item.key === 'maintenance_mode';
                          const isTextArea = item.key === 'ai_extra_instructions' || item.key === 'maintenance_message' || item.key === 'global_banner';
                          const isSelect = item.key === 'global_banner_type';
                          const description = CONFIG_DESCRIPTIONS[item.key] || '';

                          return (
                            <div key={item.key} className={`px-5 sm:px-6 py-4 transition-colors ${isEdited ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'hover:bg-white/40 dark:hover:bg-white/[0.02]'}`}>
                              <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                                {/* Label + description */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                      {item.label || item.key}
                                    </label>
                                    {isEdited && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        EDITADO
                                      </span>
                                    )}
                                  </div>
                                  {description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 lg:mb-0">{description}</p>
                                  )}
                                  {item.updated_at && (
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                                      {Icons.clock} {new Date(item.updated_at).toLocaleString('pt-BR')}
                                    </p>
                                  )}
                                </div>

                                {/* Input */}
                                <div className="lg:w-72 shrink-0">
                                  {isBoolean ? (
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => {
                                          const current = editValue === true || editValue === 'true';
                                          setConfigEdits(prev => ({ ...prev, [item.key]: (!current).toString() }));
                                        }}
                                        className={`relative inline-flex h-7 w-[52px] items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                          (editValue === true || editValue === 'true')
                                            ? 'bg-red-500 focus:ring-red-500'
                                            : 'bg-gray-300 dark:bg-gray-600 focus:ring-violet-500'
                                        }`}
                                      >
                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                          (editValue === true || editValue === 'true') ? 'translate-x-[27px]' : 'translate-x-[3px]'
                                        }`} />
                                      </button>
                                      <span className={`text-sm font-medium ${
                                        (editValue === true || editValue === 'true')
                                          ? 'text-red-600 dark:text-red-400'
                                          : 'text-gray-500 dark:text-gray-400'
                                      }`}>
                                        {(editValue === true || editValue === 'true')
                                          ? '🔴 ATIVO'
                                          : '🟢 Desativado'}
                                      </span>
                                    </div>
                                  ) : isTextArea ? (
                                    <textarea
                                      value={typeof editValue === 'string' ? editValue : JSON.stringify(editValue)}
                                      onChange={(e) => setConfigEdits(prev => ({ ...prev, [item.key]: e.target.value }))}
                                      rows={3}
                                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all resize-y ${
                                        isEdited
                                          ? 'border-amber-400 dark:border-amber-600 bg-white dark:bg-gray-900 ring-2 ring-amber-200 dark:ring-amber-900/40'
                                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                                      } text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 placeholder-gray-400`}
                                      placeholder={item.key === 'ai_extra_instructions' ? 'Ex: Hoje promova o plano Pro para iniciantes...' : item.key === 'global_banner' ? 'Ex: 🎉 Promoção: 50% off no plano Pro!' : ''}
                                    />
                                  ) : isSelect ? (
                                    <select
                                      value={editValue}
                                      onChange={(e) => setConfigEdits(prev => ({ ...prev, [item.key]: e.target.value }))}
                                      className={`px-3.5 py-2.5 rounded-xl border text-sm w-full transition-all ${
                                        isEdited
                                          ? 'border-amber-400 dark:border-amber-600 bg-white dark:bg-gray-900 ring-2 ring-amber-200 dark:ring-amber-900/40'
                                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                                      } text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500`}
                                    >
                                      <option value="info">ℹ️ Info (azul)</option>
                                      <option value="warning">⚠️ Aviso (amarelo)</option>
                                      <option value="success">✅ Sucesso (verde)</option>
                                    </select>
                                  ) : (
                                    <div className="relative">
                                      <input
                                        type={typeof configDefaults[item.key] === 'number' ? 'number' : 'text'}
                                        value={typeof editValue === 'string' ? editValue : JSON.stringify(editValue)}
                                        onChange={(e) => setConfigEdits(prev => ({ ...prev, [item.key]: e.target.value }))}
                                        step={item.key === 'ai_temperature' ? '0.1' : item.key.startsWith('price_') ? '0.01' : '1'}
                                        min={item.key === 'ai_temperature' ? '0' : '0'}
                                        max={item.key === 'ai_temperature' ? '1' : undefined}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                                          isEdited
                                            ? 'border-amber-400 dark:border-amber-600 bg-white dark:bg-gray-900 ring-2 ring-amber-200 dark:ring-amber-900/40'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                                        } text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500`}
                                      />
                                      {item.key === 'ai_temperature' && (
                                        <div className="mt-2">
                                          <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={editValue}
                                            onChange={(e) => setConfigEdits(prev => ({ ...prev, [item.key]: e.target.value }))}
                                            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                                          />
                                          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                                            <span>Precisa</span>
                                            <span>Criativa</span>
                                          </div>
                                        </div>
                                      )}
                                      {item.key.startsWith('price_') && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">R$</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Botão salvar flutuante */}
                {Object.keys(configEdits).length > 0 && (
                  <div className="sticky bottom-6 flex justify-center z-30">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-violet-500/20 border border-gray-200 dark:border-gray-700 p-2 flex items-center gap-3">
                      <div className="pl-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                          {Object.keys(configEdits).length} alteração{Object.keys(configEdits).length > 1 ? 'ões' : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => setConfigEdits({})}
                        className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      >
                        Descartar
                      </button>
                      <button
                        onClick={saveConfigs}
                        disabled={configSaving}
                        className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-violet-400 disabled:to-purple-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/25 transition-all flex items-center gap-2"
                      >
                        {configSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5"/>
                            </svg>
                            Salvar alterações
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1625] p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-1">Configurações indisponíveis</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Verifique se a tabela <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-mono">app_config</code> foi criada no Supabase.
                </p>
              </div>
            )}
          </>
        )}

        {/* ===== PIX ===== */}
        {activeTab === 'pix' && (
          <>
            {/* Notificações de expirados */}
            {pixExpiredNow.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔴</span>
                  <span className="text-sm font-bold text-red-700 dark:text-red-400">
                    {pixExpiredNow.length} plano(s) rebaixado(s) automaticamente
                  </span>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400/80">
                  Pagamentos Pix expiraram e os planos foram revertidos para Free. Os usuários foram notificados por email.
                </p>
              </div>
            )}

            {/* Alerta de vencimentos próximos */}
            {pixAlerts.expiringSoon > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                      {pixAlerts.expiringSoon} pagamento(s) vencem nos próximos 5 dias
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">
                      Entre em contato para renovação.
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const token = await getAccessToken();
                      await fetch('/api/admin/pix/notify', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      setPixEmailSent(true);
                      setTimeout(() => setPixEmailSent(false), 5000);
                    } catch {}
                  }}
                  disabled={pixEmailSent}
                  className="px-3 py-1.5 text-[11px] font-semibold bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap"
                >
                  {pixEmailSent ? '✅ Email enviado!' : '📧 Enviar alerta por email'}
                </button>
              </div>
            )}

            {/* Alerta de inconsistência: mais usuários pagos que assinaturas ativas */}
            {(() => {
              const activePixCount = Array.isArray(pixPayments) ? pixPayments.filter(p => p.status === 'active').length : 0;
              const activeStripeCount = stripeSubscriptions.filter(s => s.status === 'active' || s.status === 'cancelling' || s.status === 'trialing').length;
              const totalActivePayments = activePixCount + activeStripeCount;
              const paidUsersCount = (users?.planCounts?.pro || 0) + (users?.planCounts?.premium || 0);
              const diff = paidUsersCount - totalActivePayments;
              if (diff > 0 && users?.planCounts) return (
                <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">Inconsistência detectada</p>
                    <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">
                      Existem <strong>{paidUsersCount}</strong> usuários com plano pago (Pro: {users.planCounts.pro || 0}, Premium: {users.planCounts.premium || 0}), mas apenas <strong>{totalActivePayments}</strong> assinatura{totalActivePayments !== 1 ? 's' : ''} ativa{totalActivePayments !== 1 ? 's' : ''} (Pix: {activePixCount}, Stripe: {activeStripeCount}).
                      <strong> {diff} usuário{diff !== 1 ? 's' : ''}</strong> pode{diff !== 1 ? 'm' : ''} estar sem pagamento registrado.
                    </p>
                  </div>
                </div>
              );
              return null;
            })()}

            {/* Header + botão novo */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  {Icons.wallet}
                  <span>Assinaturas</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Gerencie pagamentos Pix e assinaturas Stripe</p>
              </div>
              <button
                onClick={() => setPixShowForm(!pixShowForm)}
                className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors"
              >
                {pixShowForm ? 'Cancelar' : '+ Registrar Pagamento'}
              </button>
            </div>

            {/* Formulário novo pagamento */}
            {pixShowForm && (
              <Card title="Registrar Pagamento Pix">
                <div className="space-y-4">
                  {/* Buscar usuário */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Usuário</label>
                    {pixSelectedUser ? (
                      <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">{pixSelectedUser.name?.[0]?.toUpperCase() || '?'}</div>
                          <div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{pixSelectedUser.name}</p>
                            <p className="text-[10px] text-gray-400">{pixSelectedUser.email}</p>
                          </div>
                        </div>
                        <button onClick={() => { setPixSelectedUser(null); setPixUserSearch(''); }} className="text-xs text-red-500 hover:text-red-700 font-semibold">Trocar</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{Icons.search}</div>
                        <input
                          type="text"
                          placeholder="Buscar por nome ou email..."
                          value={pixUserSearch}
                          onChange={(e) => { setPixUserSearch(e.target.value); searchPixUsers(e.target.value); }}
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none text-gray-700 dark:text-gray-200"
                        />
                        {pixSearchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                            {pixSearchResults.map(u => (
                              <button
                                key={u.id}
                                onClick={() => {
                                  const hasActive = Array.isArray(pixPayments) && pixPayments.some(p => p.user_id === u.id && p.status === 'active');
                                  if (hasActive) {
                                    alert('Este usuário já possui um pagamento Pix ativo.');
                                    return;
                                  }
                                  setPixSelectedUser(u); setPixSearchResults([]); setPixUserSearch('');
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                              >
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{u.name?.[0]?.toUpperCase() || '?'}</div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{u.name}</p>
                                  <p className="text-[10px] text-gray-400 truncate">{u.email || '—'}</p>
                                </div>
                                <PlanBadge plan={u.plan} />
                                {Array.isArray(pixPayments) && pixPayments.some(p => p.user_id === u.id && p.status === 'active') && (
                                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full ml-auto">PIX ATIVO</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Plano e Data */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Plano</label>
                      <select
                        value={pixPlan}
                        onChange={(e) => setPixPlan(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none"
                      >
                        <option value="pro">Pro — R$ 29,90</option>
                        <option value="premium">Premium — R$ 59,90</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Data do pagamento</label>
                      <input
                        type="date"
                        value={pixPaidAt}
                        onChange={(e) => setPixPaidAt(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Observação */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Observação (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Pagou via Pix Nubank"
                      value={pixNotes}
                      onChange={(e) => setPixNotes(e.target.value)}
                      maxLength={500}
                      className="w-full px-4 py-2.5 text-sm bg-white dark:bg-[#1a1625] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none text-gray-700 dark:text-gray-200"
                    />
                  </div>

                  {/* Info de vencimento */}
                  {pixPaidAt && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      {Icons.clock}
                      <span className="text-xs text-blue-700 dark:text-blue-300">
                        Vencimento: <strong>{new Date(new Date(pixPaidAt).getTime() + 30 * 86400000).toLocaleDateString('pt-BR')}</strong> (30 dias)
                      </span>
                    </div>
                  )}

                  {/* Botão salvar */}
                  <button
                    onClick={createPixPayment}
                    disabled={!pixSelectedUser || pixSaving}
                    className="w-full py-2.5 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {pixSaving ? 'Registrando...' : `Registrar Pix — R$ ${pixPlan === 'premium' ? '59,90' : '29,90'}`}
                  </button>
                </div>
              </Card>
            )}

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'active', label: '🟢 Ativos' },
                { id: 'expiring', label: '🟡 Vencendo' },
                { id: 'expired', label: '🔴 Expirados' },
                { id: 'cancelled', label: '⬜ Cancelados' },
                { id: 'pix', label: '💰 Pix' },
                { id: 'stripe', label: '💳 Stripe' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setPixFilter(f.id)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
                    pixFilter === f.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-white dark:bg-[#1a1625] text-gray-500 border border-gray-200 dark:border-gray-800 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Tabela de assinaturas */}
            <Card className="!p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Usuário</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Forma</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Plano</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Valor</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Início</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Vence/Renova</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(() => {
                      // Normalizar pagamentos Pix para formato unificado
                      const pixItems = (pixPayments || []).map(p => ({
                        ...p,
                        method: 'pix',
                        start_date: p.paid_at,
                        end_date: p.expires_at,
                      }));
                      // Normalizar Stripe subscriptions para formato unificado
                      const stripeItems = stripeSubscriptions.map(s => ({
                        ...s,
                        start_date: s.created_at,
                        end_date: s.current_period_end,
                      }));
                      // Unificar e filtrar
                      const allItems = [...pixItems, ...stripeItems];
                      return allItems
                        .filter(p => {
                          if (pixFilter === 'pix') return p.method === 'pix';
                          if (pixFilter === 'stripe') return p.method === 'stripe';
                          if (pixFilter === 'all') return true;
                          if (pixFilter === 'expiring') {
                            if (p.method === 'stripe') return p.status === 'cancelling';
                            const daysLeft = Math.ceil((new Date(p.end_date) - new Date()) / 86400000);
                            return p.status === 'active' && daysLeft <= 5 && daysLeft > 0;
                          }
                          if (pixFilter === 'active') return p.status === 'active' || p.status === 'trialing';
                          if (pixFilter === 'cancelled') return p.status === 'cancelled' || p.status === 'cancelling';
                          return p.status === pixFilter;
                        })
                        .sort((a, b) => {
                          // Ativos primeiro, depois por data
                          const order = { active: 0, trialing: 0, cancelling: 1, past_due: 1, expiring: 1, expired: 2, cancelled: 3, unknown: 4 };
                          const diff = (order[a.status] ?? 5) - (order[b.status] ?? 5);
                          if (diff !== 0) return diff;
                          return new Date(a.end_date || 0) - new Date(b.end_date || 0);
                        })
                        .map(p => {
                          const now = new Date();
                          const endDate = p.end_date ? new Date(p.end_date) : null;
                          const daysLeft = endDate ? Math.ceil((endDate - now) / 86400000) : null;
                          let statusIcon = '🟢';
                          let statusLabel = 'Ativo';
                          let statusClass = 'text-emerald-600 dark:text-emerald-400';

                          if (p.method === 'stripe') {
                            if (p.status === 'active') { statusIcon = '🟢'; statusLabel = daysLeft ? `Renova em ${daysLeft}d` : 'Ativo'; }
                            else if (p.status === 'cancelling') { statusIcon = '🟡'; statusLabel = daysLeft ? `Cancela em ${daysLeft}d` : 'Cancelando'; statusClass = 'text-amber-600 dark:text-amber-400'; }
                            else if (p.status === 'past_due') { statusIcon = '🔴'; statusLabel = 'Pagamento pendente'; statusClass = 'text-red-600 dark:text-red-400'; }
                            else if (p.status === 'trialing') { statusIcon = '🔵'; statusLabel = 'Trial'; statusClass = 'text-blue-600 dark:text-blue-400'; }
                            else if (p.status === 'cancelled') { statusIcon = '⬜'; statusLabel = 'Cancelado'; statusClass = 'text-gray-500'; }
                            else { statusIcon = '❓'; statusLabel = p.stripe_status || 'Desconhecido'; statusClass = 'text-gray-400'; }
                          } else {
                            if (p.status === 'expired') { statusIcon = '🔴'; statusLabel = 'Expirado'; statusClass = 'text-red-600 dark:text-red-400'; }
                            else if (p.status === 'cancelled') { statusIcon = '⬜'; statusLabel = 'Cancelado'; statusClass = 'text-gray-500'; }
                            else if (daysLeft !== null && daysLeft <= 0) { statusIcon = '🔴'; statusLabel = 'Expirado'; statusClass = 'text-red-600 dark:text-red-400'; }
                            else if (daysLeft !== null && daysLeft <= 5) { statusIcon = '🟡'; statusLabel = `${daysLeft}d restante${daysLeft > 1 ? 's' : ''}`; statusClass = 'text-amber-600 dark:text-amber-400'; }
                            else if (daysLeft !== null) { statusLabel = `${daysLeft}d restantes`; }
                          }

                          return (
                            <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{p.user_name?.[0]?.toUpperCase() || '?'}</div>
                                  <div>
                                    <p className="font-semibold text-gray-700 dark:text-gray-200">{p.user_name}</p>
                                    <p className="text-[10px] text-gray-400">{p.user_email || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {p.method === 'stripe' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">💳 Stripe</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">💰 Pix</span>
                                )}
                              </td>
                              <td className="px-4 py-3"><PlanBadge plan={p.plan} /></td>
                              <td className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-300 tabular-nums">R$ {Number(p.amount || 0).toFixed(2).replace('.', ',')}</td>
                              <td className="px-4 py-3 text-gray-500 tabular-nums">{p.start_date ? new Date(p.start_date).toLocaleDateString('pt-BR') : '—'}</td>
                              <td className="px-4 py-3 text-gray-500 tabular-nums">{p.end_date ? new Date(p.end_date).toLocaleDateString('pt-BR') : '—'}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${statusClass}`}>
                                  {statusIcon} {statusLabel}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1.5">
                                  {p.method === 'pix' && (p.status === 'active' || p.status === 'expired') && (
                                    <button
                                      onClick={() => handlePixAction(p.id, 'renew')}
                                      disabled={pixActionLoading === p.id}
                                      className="px-2.5 py-1.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                    >
                                      Renovar +30d
                                    </button>
                                  )}
                                  {p.method === 'pix' && p.status === 'active' && (
                                    <button
                                      onClick={() => { if (confirm(`Cancelar pagamento Pix de ${p.user_name}?`)) handlePixAction(p.id, 'cancel'); }}
                                      disabled={pixActionLoading === p.id}
                                      className="px-2.5 py-1.5 text-[10px] font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                                    >
                                      Cancelar
                                    </button>
                                  )}
                                  {p.method === 'stripe' && (
                                    <span className="text-[10px] text-gray-400 italic">Gerenciado pelo Stripe</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>
                {(!pixPayments || pixPayments.length === 0) && stripeSubscriptions.length === 0 && (
                  <div className="py-12 text-center">
                    <span className="text-3xl mb-3 block">💸</span>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhuma assinatura encontrada</p>
                    <p className="text-xs text-gray-400 mt-1">Clique em &quot;Registrar Pagamento&quot; para adicionar um pagamento Pix</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Resumo */}
            {((pixPayments && pixPayments.length > 0) || stripeSubscriptions.length > 0) && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                  label="Total Ativos"
                  value={
                    (Array.isArray(pixPayments) ? pixPayments.filter(p => p.status === 'active').length : 0) +
                    stripeSubscriptions.filter(s => s.status === 'active' || s.status === 'cancelling' || s.status === 'trialing').length
                  }
                  sub="assinaturas ativas"
                  icon={Icons.users} color="success"
                />
                <KPICard
                  label="💰 Pix Ativos"
                  value={Array.isArray(pixPayments) ? pixPayments.filter(p => p.status === 'active').length : 0}
                  sub={`R$ ${(Array.isArray(pixPayments) ? pixPayments.filter(p => p.status === 'active').reduce((s, p) => s + Number(p.amount), 0) : 0).toFixed(2).replace('.', ',')}/mês`}
                  icon={Icons.wallet} color="primary"
                />
                <KPICard
                  label="💳 Stripe Ativos"
                  value={stripeSubscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length}
                  sub={`R$ ${stripeSubscriptions.filter(s => s.status === 'active' || s.status === 'trialing').reduce((s, p) => s + Number(p.amount || 0), 0).toFixed(2).replace('.', ',')}/mês`}
                  icon={Icons.chart} color="info"
                />
                <KPICard
                  label="Vencendo"
                  value={pixAlerts.expiringSoon + stripeSubscriptions.filter(s => s.status === 'cancelling').length}
                  sub="próximos 5 dias"
                  icon={Icons.clock} color="warning"
                />
                <KPICard
                  label="Expirados"
                  value={(Array.isArray(pixPayments) ? pixPayments.filter(p => p.status === 'expired').length : 0) + stripeSubscriptions.filter(s => s.status === 'cancelled' || s.status === 'past_due').length}
                  sub="precisam ação"
                  icon={Icons.arrowDown} color="danger"
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
