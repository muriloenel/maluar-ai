'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './SupabaseAuthProvider';

// ===== KPI Card =====
function KPI({ label, value, sub, color = 'accent' }) {
  return (
    <div className="bg-white dark:bg-[#1E1A2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-extrabold mt-1 ${color === 'green' ? 'text-green-600' : color === 'rose' ? 'text-rose-500' : 'text-[#7F77DD]'}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ===== Simple Bar Chart =====
function MiniChart({ data, valueKey = 'cost', labelKey = 'date', height = 120 }) {
  if (!data || data.length === 0) return <p className="text-xs text-gray-400 text-center py-4">Sem dados ainda</p>;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.slice(-14).map((d, i) => {
        const h = Math.max(4, (d[valueKey] / max) * height);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-[#7F77DD] rounded-t-sm transition-all hover:bg-[#9B6EC7]"
              style={{ height: h }}
              title={`${d[labelKey]}: ${typeof d[valueKey] === 'number' ? d[valueKey].toFixed(4) : d[valueKey]}`}
            />
            {data.length <= 14 && (
              <span className="text-[8px] text-gray-400 -rotate-45 origin-top-left whitespace-nowrap">
                {d[labelKey]?.slice(5)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== Plan Badge =====
function PlanBadge({ plan }) {
  const colors = {
    free: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    pro: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    premium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colors[plan] || colors.free}`}>
      {plan}
    </span>
  );
}

function StatusBadge({ status }) {
  return status === 'active' ? (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Ativo</span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Inativo</span>
  );
}

// ===== Main Admin Dashboard =====
export default function AdminDashboard() {
  const { user, getAccessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

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
    } catch (err) {
      // usage_logs pode não existir ainda
      setUsage(null);
    }
  }, [fetchApi]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      await Promise.all([loadStats(), loadUsage()]);
      setLoading(false);
    })();
  }, [loadStats, loadUsage]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#120F1E]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-3 border-[#7F77DD] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Carregando painel admin...</p>
        </div>
      </div>
    );
  }

  if (error === 'Acesso negado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#120F1E]">
        <div className="text-center space-y-4">
          <p className="text-4xl">🔒</p>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Acesso Restrito</h2>
          <p className="text-sm text-gray-500">Você não tem permissão para acessar o painel admin.</p>
          <a href="/" className="inline-block px-4 py-2 bg-[#7F77DD] text-white rounded-lg text-sm font-semibold">Voltar ao app</a>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
    { id: 'users', label: '👥 Usuários', icon: '👥' },
    { id: 'financial', label: '💰 Financeiro', icon: '💰' },
    { id: 'monitoring', label: '📈 Monitoramento', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#120F1E]">
      {/* Header */}
      <header className="bg-white dark:bg-[#1E1A2E] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-gray-400 hover:text-[#7F77DD]">← App</a>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
            <h1 className="text-lg font-extrabold bg-gradient-to-r from-[#534AB7] via-[#7F77DD] to-[#D4537E] bg-clip-text text-transparent">
              Maluar Admin
            </h1>
          </div>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white dark:bg-[#1E1A2E] border-b border-gray-200 dark:border-gray-700 px-4 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#7F77DD] text-[#7F77DD]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* ===== DASHBOARD ===== */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="Total Usuários" value={stats.totalUsers} sub={`+${stats.newUsersWeek} esta semana`} />
              <KPI label="MRR" value={`R$ ${stats.revenue?.mrr?.toFixed(2)}`} sub={`${stats.revenue?.conversionRate}% conversão`} color="green" />
              <KPI label="Msgs Hoje" value={stats.totalMessagesToday} sub={`${stats.totalMessages} total`} />
              <KPI label="Custo IA/mês" value={stats.revenue?.monthlyCost !== null ? `US$ ${stats.revenue.monthlyCost}` : '—'} sub={stats.revenue?.margin !== null ? `Margem: R$ ${stats.revenue.margin}` : 'Sem dados'} color="rose" />
            </div>

            {/* Distribuições */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#1E1A2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Por Plano</h3>
                {Object.entries(stats.planCounts).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between py-1.5">
                    <PlanBadge plan={plan} />
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-[#7F77DD] rounded-full" style={{ width: `${stats.totalUsers ? (count / stats.totalUsers * 100) : 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-[#1E1A2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Por Nível</h3>
                {Object.entries(stats.levelCounts).map(([level, count]) => {
                  const labels = { iniciante: '🌱 Iniciante', intermediario: '💅 Intermediária', avancada: '✨ Avançada' };
                  return (
                    <div key={level} className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-gray-600 dark:text-gray-300">{labels[level] || level}</span>
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{count}</span>
                    </div>
                  );
                })}
              </div>
              <div className="bg-white dark:bg-[#1E1A2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Por Status</h3>
                {Object.entries(stats.statusCounts || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between py-1.5">
                    <StatusBadge status={status} />
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Últimos cadastros */}
            <div className="bg-white dark:bg-[#1E1A2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Últimos Cadastros</h3>
              <div className="space-y-2">
                {stats.recentUsers?.map((u, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">{u.name}</span>
                      <PlanBadge plan={u.plan} />
                    </div>
                    <span className="text-[11px] text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== USUÁRIOS ===== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setUserPage(1); }}
                className="flex-1 min-w-[200px] px-3 py-2 text-sm bg-white dark:bg-[#1E1A2E] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#7F77DD]/30 focus:border-[#7F77DD] outline-none text-gray-700 dark:text-gray-200"
              />
              <select
                value={filterPlan}
                onChange={(e) => { setFilterPlan(e.target.value); setUserPage(1); }}
                className="px-3 py-2 text-xs bg-white dark:bg-[#1E1A2E] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200"
              >
                <option value="">Todos planos</option>
                <option value="free">Grátis</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setUserPage(1); }}
                className="px-3 py-2 text-xs bg-white dark:bg-[#1E1A2E] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200"
              >
                <option value="">Todos status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>

            {/* Tabela */}
            <div className="bg-white dark:bg-[#1E1A2E] rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wide">Usuário</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wide">Plano</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wide">Msgs Hoje</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wide">Cadastro</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-semibold uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.users?.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-700 dark:text-gray-200">{u.name}</p>
                        <p className="text-[10px] text-gray-400">{u.email || '—'}</p>
                        {u.phone && <p className="text-[10px] text-gray-400">📱 {u.phone}</p>}
                      </td>
                      <td className="px-4 py-3"><PlanBadge plan={u.plan} /></td>
                      <td className="px-4 py-3"><StatusBadge status={u.status || 'active'} /></td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.messages_today || 0}</td>
                      <td className="px-4 py-3 text-gray-400">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {(u.status || 'active') === 'active' ? (
                            <button
                              onClick={() => handleUserAction(u.id, 'deactivate')}
                              disabled={actionLoading === u.id}
                              className="px-2 py-1 text-[10px] font-semibold bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:opacity-50"
                            >
                              Desativar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(u.id, 'activate')}
                              disabled={actionLoading === u.id}
                              className="px-2 py-1 text-[10px] font-semibold bg-green-50 text-green-600 rounded-md hover:bg-green-100 disabled:opacity-50"
                            >
                              Ativar
                            </button>
                          )}
                          <select
                            defaultValue={u.plan}
                            onChange={(e) => handleUserAction(u.id, 'changePlan', e.target.value)}
                            disabled={actionLoading === u.id}
                            className="px-1 py-1 text-[10px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md disabled:opacity-50"
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="premium">Premium</option>
                          </select>
                          <button
                            onClick={() => handleUserAction(u.id, 'resetMessages')}
                            disabled={actionLoading === u.id}
                            className="px-2 py-1 text-[10px] font-semibold bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
                            title="Resetar contador de mensagens"
                          >
                            Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {users && users.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{users.total} usuários encontrados</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    disabled={userPage <= 1}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-[#1E1A2E] border rounded-lg disabled:opacity-30"
                  >
                    ←
                  </button>
                  <span className="px-3 py-1.5 text-xs text-gray-500">{userPage} / {users.totalPages}</span>
                  <button
                    onClick={() => setUserPage(p => Math.min(users.totalPages, p + 1))}
                    disabled={userPage >= users.totalPages}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-[#1E1A2E] border rounded-lg disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== FINANCEIRO ===== */}
        {activeTab === 'financial' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="MRR (Receita Mensal)" value={`R$ ${stats.revenue?.mrr?.toFixed(2)}`} color="green" />
              <KPI label="Assinantes Pro" value={stats.planCounts?.pro || 0} sub={`× R$ 29,90 = R$ ${((stats.planCounts?.pro || 0) * 29.90).toFixed(2)}`} />
              <KPI label="Assinantes Premium" value={stats.planCounts?.premium || 0} sub={`× R$ 59,90 = R$ ${((stats.planCounts?.premium || 0) * 59.90).toFixed(2)}`} />
              <KPI label="Taxa de Conversão" value={`${stats.revenue?.conversionRate}%`} sub={`${(stats.planCounts?.pro || 0) + (stats.planCounts?.premium || 0)} pagantes de ${stats.totalUsers}`} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#1E1A2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Custo IA (últimos 30 dias)</h3>
                {usage ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-[10px] text-gray-400">Custo Total</p>
                        <p className="text-lg font-bold text-rose-500">US$ {usage.totals?.cost?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Projeção Mensal</p>
                        <p className="text-lg font-bold text-gray-700 dark:text-gray-200">US$ {usage.totals?.projectedMonthlyCost?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Requisições</p>
                        <p className="text-lg font-bold text-gray-700 dark:text-gray-200">{usage.totals?.requests}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Custo Médio/dia</p>
                        <p className="text-lg font-bold text-gray-700 dark:text-gray-200">US$ {usage.totals?.avgDailyCost?.toFixed(2)}</p>
                      </div>
                    </div>
                    <MiniChart data={usage.dailyUsage} />
                  </>
                ) : (
                  <p className="text-xs text-gray-400 py-4 text-center">Execute o SQL migration pra ativar o monitoramento de custos</p>
                )}
              </div>

              <div className="bg-white dark:bg-[#1E1A2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Margem Estimada</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-500">Receita mensal (MRR)</span>
                    <span className="text-xs font-bold text-green-600">R$ {stats.revenue?.mrr?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-500">Custo IA (estimado em R$)</span>
                    <span className="text-xs font-bold text-rose-500">
                      {usage?.totals?.projectedMonthlyCost ? `- R$ ${(usage.totals.projectedMonthlyCost * 5.5).toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-500">Vercel (Hobby)</span>
                    <span className="text-xs font-bold text-gray-600">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-500">Supabase (Free)</span>
                    <span className="text-xs font-bold text-gray-600">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between py-2 bg-green-50 dark:bg-green-900/20 rounded-lg px-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Margem Líquida</span>
                    <span className="text-xs font-extrabold text-green-600">
                      {usage?.totals?.projectedMonthlyCost
                        ? `R$ ${(stats.revenue.mrr - usage.totals.projectedMonthlyCost * 5.5).toFixed(2)}`
                        : `R$ ${stats.revenue?.mrr?.toFixed(2)}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== MONITORAMENTO ===== */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            {usage ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KPI label="Requisições (30d)" value={usage.totals?.requests || 0} />
                  <KPI label="Tokens Input" value={((usage.totals?.inputTokens || 0) / 1000).toFixed(0) + 'K'} />
                  <KPI label="Tokens Output" value={((usage.totals?.outputTokens || 0) / 1000).toFixed(0) + 'K'} />
                  <KPI label="Custo Total" value={`US$ ${usage.totals?.cost?.toFixed(2)}`} color="rose" />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#1E1A2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Uso por Modelo</h3>
                    {Object.entries(usage.modelBreakdown || {}).map(([model, count]) => (
                      <div key={model} className="flex items-center justify-between py-2">
                        <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">{model}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-[#7F77DD] rounded-full" style={{ width: `${usage.totals.requests ? (count / usage.totals.requests * 100) : 0}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white dark:bg-[#1E1A2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Uso por Feature</h3>
                    {Object.entries(usage.featureBreakdown || {}).map(([feature, count]) => (
                      <div key={feature} className="flex items-center justify-between py-2">
                        <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">{feature}</span>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1E1A2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Requisições por Dia (últimos 14 dias)</h3>
                  <MiniChart data={usage.dailyUsage} valueKey="requests" height={150} />
                </div>

                <div className="bg-white dark:bg-[#1E1A2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Custo por Dia (US$)</h3>
                  <MiniChart data={usage.dailyUsage} valueKey="cost" height={150} />
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-4xl mb-4">📊</p>
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">Monitoramento de Uso</h3>
                <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
                  Execute o SQL migration no Supabase para criar a tabela <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">usage_logs</code>.
                  Os dados de custo começarão a ser registrados automaticamente a cada requisição.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
