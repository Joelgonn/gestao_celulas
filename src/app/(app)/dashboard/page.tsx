'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement,
    BarElement,
    ChartOptions
} from 'chart.js';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler, ArcElement, BarElement
);

import useToast from '@/hooks/useToast';
import {
    getTotalMembros,
    getTotalVisitantesDistintos,
    getPresenceCountsLastMeeting,
    getRecentesMembros,
    getRecentesVisitantes,
    getUltimasReunioes,
    getFaltososAlert,
    getUnconvertedVisitorsAlert,
    getBirthdaysThisWeek,
    getCelulasOptionsForAdmin,
    getAveragePresenceRate,
    getCelulasSummary,
    getTopBottomPresence,
    getCelulaGrowth,
    getMembersByCelulaDistribution,
    getVisitorsByCelulaDistribution,
    getGlobalRecentActivity,
    getVisitorsConversionAnalysis,
    getNewVisitorsTrend,
    detectDuplicateVisitors,
} from '@/lib/dashboard_data';

import { getPalavraDaSemana } from '@/lib/data';
import {
    LastMeetingPresence, MembroDashboard, VisitanteDashboard, ReuniaoComNomes,
    FaltososAlert, UnconvertedVisitorsAlert, BirthdayAlert, AveragePresenceRateData,
    CelulasSummary, TopFlopPresence, CelulaGrowth, MembersByCelulaDistribution,
    VisitorsByCelulaDistribution, ActivityLogItem, VisitorsConversionAnalysis,
    NewVisitorsTrendData, DuplicateVisitorGroup, PalavraDaSemana, CelulaOption
} from '@/lib/types';

import { formatDateForDisplay } from '@/utils/formatters';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaUserPlus, FaUsers, FaCalendarCheck, FaHome, FaChartLine,
    FaExclamationTriangle, FaBirthdayCake, FaUserFriends, FaArrowUp,
    FaArrowDown, FaEdit, FaFilter, FaSync, FaCheckCircle, FaBookOpen,
    FaFileDownload, FaChevronRight, FaArrowRight,
    FaChartBar // Adicionado aqui para corrigir o erro de build
} from 'react-icons/fa';

export default function DashboardPage() {
    const [totalMembros, setTotalMembros] = useState(0);
    const [totalVisitantes, setTotalVisitantes] = useState(0);
    const [lastMeetingPresence, setLastMeetingPresence] = useState<LastMeetingPresence | null>(null);
    const [recentesMembros, setRecentesMembros] = useState<MembroDashboard[]>([]);
    const [recentesVisitantes, setRecentesVisitantes] = useState<VisitanteDashboard[]>([]);
    const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [celulasSummary, setCelulasSummary] = useState<CelulasSummary | null>(null);
    const [topBottomPresence, setTopBottomPresence] = useState<{ top: TopFlopPresence[]; bottom: TopFlopPresence[] } | null>(null);
    const [membersDistribution, setMembersDistribution] = useState<MembersByCelulaDistribution[]>([]);
    const [celulasFilterOptions, setCelulasFilterOptions] = useState<CelulaOption[]>([]);
    const [selectedFilterCelulaId, setSelectedFilterCelulaId] = useState<string>('');

    const [faltososAlert, setFaltososAlert] = useState<FaltososAlert | null>(null);
    const [birthdayAlert, setBirthdayAlert] = useState<BirthdayAlert | null>(null);
    const [averagePresenceRateData, setAveragePresenceRateData] = useState<AveragePresenceRateData | null>(null);
    const [palavraDaSemana, setPalavraDaSemana] = useState<PalavraDaSemana | null>(null);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const fetchDashboardData = useCallback(async (showRefreshToast = false) => {
        setLoadingStats(true);
        if (showRefreshToast) setRefreshing(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.replace('/login');
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, celula_id')
            .eq('id', user.id)
            .single();

        const currentUserRole = profile?.role as 'admin' | 'líder';
        setUserRole(currentUserRole);

        const celulaIdToFetch = selectedFilterCelulaId || (currentUserRole === 'líder' ? profile?.celula_id : null);

        if (currentUserRole === 'admin') {
            const celulasData = await getCelulasOptionsForAdmin();
            setCelulasFilterOptions(celulasData);
        }

        try {
            const commonDataPromises = [
                getTotalMembros(celulaIdToFetch),
                getTotalVisitantesDistintos(celulaIdToFetch),
                getPresenceCountsLastMeeting(celulaIdToFetch),
                getRecentesMembros(5, celulaIdToFetch),
                getRecentesVisitantes(5, celulaIdToFetch),
                getPalavraDaSemana(),
            ];

            let specificRoleDataPromises: Promise<any>[] = [];

            if (currentUserRole === 'admin' && !celulaIdToFetch) {
                specificRoleDataPromises = [
                    getCelulasSummary(),
                    getTopBottomPresence(),
                    getMembersByCelulaDistribution(),
                ];
            } else {
                specificRoleDataPromises = [
                    getFaltososAlert(celulaIdToFetch),
                    getBirthdaysThisWeek(celulaIdToFetch),
                    getAveragePresenceRate(celulaIdToFetch),
                ];
            }

            const results = await Promise.all([...commonDataPromises, ...specificRoleDataPromises]);

            setTotalMembros(results[0]);
            setTotalVisitantes(results[1]);
            setLastMeetingPresence(results[2]);
            setRecentesMembros(results[3]);
            setRecentesVisitantes(results[4]);
            setPalavraDaSemana(results[5]);

            if (currentUserRole === 'admin' && !celulaIdToFetch) {
                setCelulasSummary(results[6]);
                setTopBottomPresence(results[7]);
                setMembersDistribution(results[8]);
            } else {
                setFaltososAlert(results[6]);
                setBirthdayAlert(results[7]);
                setAveragePresenceRateData(results[8]);
            }

            if (showRefreshToast) addToast('Dashboard atualizado!', 'success');
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingStats(false);
            setRefreshing(false);
        }
    }, [router, selectedFilterCelulaId, addToast]);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

    const commonChartOptions: ChartOptions<any> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 11, weight: 'bold' } } } }
    };

    const presenceLineData = { 
        labels: averagePresenceRateData?.labels || [], 
        datasets: [{ label: 'Presença %', data: averagePresenceRateData?.data || [], fill: true, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981', tension: 0.4, pointRadius: 4, pointBackgroundColor: '#10b981' }] 
    };

    if (loadingStats) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />
            
            {/* Top Header Section */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 pt-8 pb-20 px-4 sm:px-8 border-b border-green-500/20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                            Resumo Geral
                        </h1>
                        <p className="text-emerald-100 text-sm font-medium mt-1 opacity-80 uppercase tracking-widest">
                            {userRole === 'admin' ? 'Painel Administrativo' : 'Painel do Líder'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        {userRole === 'admin' && (
                            <div className="relative flex-1 sm:flex-none sm:w-64 group">
                                <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 z-10" />
                                <select
                                    value={selectedFilterCelulaId}
                                    onChange={(e) => setSelectedFilterCelulaId(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-gray-700 font-bold text-sm shadow-xl outline-none focus:ring-4 focus:ring-white/20 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Todas as Células</option>
                                    {celulasFilterOptions.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>
                        )}
                        <button 
                            onClick={() => fetchDashboardData(true)} 
                            disabled={refreshing}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white p-3.5 rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            <FaSync className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-10 space-y-8">
                
                {/* Main KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col justify-between group hover:border-blue-200 transition-all">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform"><FaUsers size={24}/></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Membros</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-4xl font-black text-gray-900 leading-none">{totalMembros}</p>
                            <Link href="/membros" className="text-xs font-bold text-blue-500 mt-2 flex items-center gap-1 hover:underline">Ver todos <FaChevronRight size={8}/></Link>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col justify-between group hover:border-pink-200 transition-all">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl group-hover:scale-110 transition-transform"><FaUserFriends size={24}/></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Visitantes</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-4xl font-black text-gray-900 leading-none">{totalVisitantes}</p>
                            <Link href="/visitantes" className="text-xs font-bold text-pink-500 mt-2 flex items-center gap-1 hover:underline">Ver todos <FaChevronRight size={8}/></Link>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col justify-between group hover:border-purple-200 transition-all">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform"><FaCalendarCheck size={24}/></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Última Reunião</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-xl font-black text-gray-900 truncate">{lastMeetingPresence ? formatDateForDisplay(lastMeetingPresence.data_reuniao) : 'Nenhuma'}</p>
                            <p className="text-xs font-bold text-purple-500 mt-1">Presença: {lastMeetingPresence ? lastMeetingPresence.num_presentes_membros + lastMeetingPresence.num_presentes_visitantes : 0}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col justify-between group hover:border-amber-200 transition-all">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform"><FaChartLine size={24}/></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Células</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-4xl font-black text-gray-900 leading-none">{celulasSummary?.totalCelulas || 1}</p>
                            <p className="text-xs font-bold text-amber-500 mt-2">Ativas no sistema</p>
                        </div>
                    </div>
                </div>

                {/* Specific Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150" />
                            <div className="p-8 flex flex-col sm:flex-row gap-6 items-center">
                                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-[2rem] flex items-center justify-center shrink-0">
                                    <FaBookOpen size={32} />
                                </div>
                                <div className="flex-1 text-center sm:text-left">
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Palavra da Semana</span>
                                    <h2 className="text-2xl font-black text-gray-900 mt-1 mb-3">{palavraDaSemana?.titulo || 'Prepare seu coração!'}</h2>
                                    {palavraDaSemana && (
                                        <a href={palavraDaSemana.url_arquivo} target="_blank" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 cursor-pointer">
                                            <FaFileDownload /> Baixar Guia PDF
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8">
                            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                                Engajamento das Reuniões
                            </h3>
                            <div className="h-64">
                                <Line data={presenceLineData} options={commonChartOptions} />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-8">
                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-6">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 ml-2">Área de Atenção</h3>
                            <div className="space-y-4">
                                <div className={`p-4 rounded-3xl border-2 flex items-center gap-4 ${faltososAlert?.count ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className={`p-3 rounded-2xl ${faltososAlert?.count ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-400'}`}>
                                        <FaExclamationTriangle size={20} />
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-gray-900">{faltososAlert?.count || 0}</p>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Faltosos (3+ semanas)</p>
                                    </div>
                                    <FaArrowRight className="ml-auto text-gray-300" size={12} />
                                </div>

                                <div className={`p-4 rounded-3xl border-2 flex items-center gap-4 ${birthdayAlert?.count ? 'bg-pink-50 border-pink-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className={`p-3 rounded-2xl ${birthdayAlert?.count ? 'bg-pink-100 text-pink-600' : 'bg-gray-200 text-gray-400'}`}>
                                        <FaBirthdayCake size={20} />
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-gray-900">{birthdayAlert?.count || 0}</p>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Aniversariantes da Semana</p>
                                    </div>
                                    <FaArrowRight className="ml-auto text-gray-300" size={12} />
                                </div>
                            </div>
                        </div>

                        {userRole === 'admin' && topBottomPresence && (
                            <div className="bg-indigo-900 rounded-[2.5rem] shadow-xl p-6 text-white overflow-hidden relative border border-indigo-800">
                                <div className="absolute bottom-0 right-0 opacity-10 transform translate-x-4 translate-y-4"><FaChartBar size={120} /></div>
                                <h3 className="text-sm font-black text-indigo-300 uppercase tracking-widest mb-4">Top Performance</h3>
                                <div className="space-y-3 relative z-10">
                                    {topBottomPresence.top.slice(0,3).map((c, i) => (
                                        <div key={c.celula_id} className="flex justify-between items-center bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/5">
                                            <span className="text-xs font-bold truncate max-w-[120px]">{i+1}. {c.celula_nome}</span>
                                            <span className="text-xs font-black bg-emerald-400 text-emerald-900 px-2 py-0.5 rounded-lg">{c.avg_presence}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8">
                        <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                            <div className="w-2 h-6 bg-emerald-500 rounded-full" /> Novos Membros
                        </h3>
                        <div className="space-y-4">
                            {recentesMembros.length > 0 ? recentesMembros.map(m => (
                                <div key={m.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-2xl transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">{m.nome.charAt(0)}</div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 group-hover:text-emerald-700 transition-colors">{m.nome}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{formatDateForDisplay(m.data_ingresso)}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-1 rounded-lg uppercase">{m.celula_nome}</span>
                                </div>
                            )) : <p className="text-center text-gray-400 text-sm italic py-4">Nenhum registro.</p>}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8">
                        <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                            <div className="w-2 h-6 bg-blue-500 rounded-full" /> Novos Visitantes
                        </h3>
                        <div className="space-y-4">
                            {recentesVisitantes.length > 0 ? recentesVisitantes.map(v => (
                                <div key={v.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-2xl transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">{v.nome.charAt(0)}</div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{v.nome}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{formatDateForDisplay(v.data_primeira_visita)}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-1 rounded-lg uppercase">{v.celula_nome}</span>
                                </div>
                            )) : <p className="text-center text-gray-400 text-sm italic py-4">Nenhum registro.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}