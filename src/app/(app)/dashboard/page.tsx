// src/app/(app)/dashboard/page.tsx
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

// REGISTRO DOS COMPONENTES DO CHART.JS
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement,
    BarElement
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
    LastMeetingPresence,
    MembroDashboard,
    VisitanteDashboard,
    ReuniaoComNomes,
    FaltososAlert,
    UnconvertedVisitorsAlert,
    BirthdayAlert,
    AveragePresenceRateData,
    CelulasSummary,
    TopFlopPresence,
    CelulaGrowth,
    MembersByCelulaDistribution,
    VisitorsByCelulaDistribution,
    ActivityLogItem,
    VisitorsConversionAnalysis,
    NewVisitorsTrendData,
    DuplicateVisitorGroup,
    PalavraDaSemana,
    CelulaOption
} from '@/lib/types';

import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaUserPlus,
    FaUsers,
    FaCalendarCheck,
    FaGlobe,
    FaHome,
    FaChartLine,
    FaExclamationTriangle,
    FaBirthdayCake,
    FaUserFriends,
    FaChartPie,
    FaArrowUp,
    FaArrowDown,
    FaEye,
    FaEdit,
    FaFilter,
    FaSync,
    FaCheckCircle,
    FaInfoCircle,
    FaChartBar,
    FaHistory,
    FaUserCheck,
    FaSearch,
    FaBookOpen,
    FaFileDownload
} from 'react-icons/fa';

export default function DashboardPage() {
    // --- ESTADOS ---
    const [totalMembros, setTotalMembros] = useState(0);
    const [totalVisitantes, setTotalVisitantes] = useState(0);
    const [lastMeetingPresence, setLastMeetingPresence] = useState<LastMeetingPresence | null>(null);
    const [recentesMembros, setRecentesMembros] = useState<MembroDashboard[]>([]);
    const [recentesVisitantes, setRecentesVisitantes] = useState<VisitanteDashboard[]>([]);
    const [ultimasReunioes, setUltimasReunioes] = useState<ReuniaoComNomes[]>([]);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Estados Admin
    const [celulasSummary, setCelulasSummary] = useState<CelulasSummary | null>(null);
    const [topBottomPresence, setTopBottomPresence] = useState<{ top: TopFlopPresence[]; bottom: TopFlopPresence[] } | null>(null);
    const [celulaGrowth, setCelulaGrowth] = useState<{ top_members: CelulaGrowth[]; top_visitors: CelulaGrowth[] } | null>(null);
    const [membersDistribution, setMembersDistribution] = useState<MembersByCelulaDistribution[]>([]);
    const [visitorsDistribution, setVisitorsDistribution] = useState<VisitorsByCelulaDistribution[]>([]);
    const [globalRecentActivity, setGlobalRecentActivity] = useState<ActivityLogItem[]>([]);
    const [visitorsConversionAnalysis, setVisitorsConversionAnalysis] = useState<VisitorsConversionAnalysis[] | null>(null);
    const [newVisitorsTrendData, setNewVisitorsTrendData] = useState<NewVisitorsTrendData | null>(null);
    const [duplicateVisitorGroups, setDuplicateVisitorGroups] = useState<DuplicateVisitorGroup[] | null>(null);
    const [celulasFilterOptions, setCelulasFilterOptions] = useState<CelulaOption[]>([]);
    const [selectedFilterCelulaId, setSelectedFilterCelulaId] = useState<string>('');

    // Estados Líder/Célula
    const [faltososAlert, setFaltososAlert] = useState<FaltososAlert | null>(null);
    const [unconvertedVisitorsAlert, setUnconvertedVisitorsAlert] = useState<UnconvertedVisitorsAlert | null>(null);
    const [birthdayAlert, setBirthdayAlert] = useState<BirthdayAlert | null>(null);
    const [averagePresenceRateData, setAveragePresenceRateData] = useState<AveragePresenceRateData | null>(null);
    const [palavraDaSemana, setPalavraDaSemana] = useState<PalavraDaSemana | null>(null);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    // --- FETCH DATA ---
    const fetchDashboardData = useCallback(async (showRefreshToast = false) => {
        setLoadingStats(true);
        if (showRefreshToast) setRefreshing(true);

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            router.replace('/login');
            setLoadingStats(false);
            setRefreshing(false);
            return;
        }
        setUserEmail(user.email || 'Usuário');

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, celula_id')
            .eq('id', user.id)
            .single();

        let currentUserRole: 'admin' | 'líder' | null = null;
        let currentUserCelulaId: string | null = null;

        if (!profileError && profile) {
            currentUserRole = profile.role as 'admin' | 'líder';
            currentUserCelulaId = profile.celula_id;
        }
        setUserRole(currentUserRole);

        let celulaIdToFetch: string | null = null;
        // Se filtro selecionado, usa ele. Se não, e for líder, usa a do perfil.
        celulaIdToFetch = selectedFilterCelulaId || (currentUserRole === 'líder' ? currentUserCelulaId : null);

        if (currentUserRole === 'admin') {
            try {
                const celulasData = await getCelulasOptionsForAdmin();
                setCelulasFilterOptions(celulasData);
            } catch (error) {
                console.error('Erro ao carregar opções de células');
            }
        }

        // Se é líder e não tem filtro selecionado mas tem célula, seta o filtro visualmente (opcional, mas bom pra UX)
        if (currentUserRole === 'líder' && !selectedFilterCelulaId && currentUserCelulaId) {
             setSelectedFilterCelulaId(currentUserCelulaId);
        }

        try {
            // Promessas Comuns
            const commonDataPromises = [
                getTotalMembros(celulaIdToFetch),
                getTotalVisitantesDistintos(celulaIdToFetch),
                getPresenceCountsLastMeeting(celulaIdToFetch),
                getRecentesMembros(5, celulaIdToFetch),
                getRecentesVisitantes(5, celulaIdToFetch),
                getUltimasReunioes(5, celulaIdToFetch),
                getPalavraDaSemana(),
            ];

            let specificRoleDataPromises: Promise<any>[] = [];

            // Lógica de Admin Global vs Célula Específica
            if (currentUserRole === 'admin' && !celulaIdToFetch) {
                // Admin Global
                specificRoleDataPromises = [
                    getCelulasSummary(),
                    getTopBottomPresence(),
                    getCelulaGrowth(),
                    getMembersByCelulaDistribution(),
                    getVisitorsByCelulaDistribution(),
                    getGlobalRecentActivity(10),
                    getVisitorsConversionAnalysis(),
                    getNewVisitorsTrend(),
                    detectDuplicateVisitors(),
                ];
            } else if (currentUserRole === 'líder' || (currentUserRole === 'admin' && celulaIdToFetch)) {
                // Líder ou Admin filtrando
                specificRoleDataPromises = [
                    getFaltososAlert(celulaIdToFetch),
                    getUnconvertedVisitorsAlert(celulaIdToFetch),
                    getBirthdaysThisWeek(celulaIdToFetch),
                    getAveragePresenceRate(celulaIdToFetch),
                ];
            }

            const allPromises = [...commonDataPromises, ...specificRoleDataPromises];
            const results = await Promise.all(allPromises);

            const [
                membrosCount,
                visitantesCount,
                lastMeetingDetails,
                recentMembrosList,
                recentVisitantesList,
                lastMeetingsList,
                fetchedPalavraDaSemana,
                ...specificRoleData
            ] = results;

            // Setar dados comuns
            setTotalMembros(membrosCount as number);
            setTotalVisitantes(visitantesCount as number);
            setLastMeetingPresence(lastMeetingDetails as LastMeetingPresence | null);
            setRecentesMembros(recentMembrosList as MembroDashboard[]);
            setRecentesVisitantes(recentVisitantesList as VisitanteDashboard[]);
            setUltimasReunioes(lastMeetingsList as ReuniaoComNomes[]);
            setPalavraDaSemana(fetchedPalavraDaSemana as PalavraDaSemana | null);

            // Setar dados específicos
            if (currentUserRole === 'admin' && !celulaIdToFetch) {
                setCelulasSummary(specificRoleData[0]);
                setTopBottomPresence(specificRoleData[1]);
                setCelulaGrowth(specificRoleData[2]);
                setMembersDistribution(specificRoleData[3]);
                setVisitorsDistribution(specificRoleData[4]);
                setGlobalRecentActivity(specificRoleData[5]);
                setVisitorsConversionAnalysis(specificRoleData[6]);
                setNewVisitorsTrendData(specificRoleData[7]);
                setDuplicateVisitorGroups(specificRoleData[8]);
                
                // Limpar estados de view de célula
                setFaltososAlert(null); setUnconvertedVisitorsAlert(null); setBirthdayAlert(null); setAveragePresenceRateData(null);
            } else {
                setFaltososAlert(specificRoleData[0]);
                setUnconvertedVisitorsAlert(specificRoleData[1]);
                setBirthdayAlert(specificRoleData[2]);
                setAveragePresenceRateData(specificRoleData[3]);
                
                // Limpar estados de view global
                setCelulasSummary(null); setTopBottomPresence(null); setCelulaGrowth(null); setMembersDistribution([]); setVisitorsDistribution([]); setGlobalRecentActivity([]); setVisitorsConversionAnalysis(null); setNewVisitorsTrendData(null); setDuplicateVisitorGroups(null);
            }

            if (showRefreshToast) addToast('Dashboard atualizado!', 'success');
        } catch (error: any) {
            console.error("Erro fetch dashboard:", error);
            addToast(`Erro ao carregar dados: ${error.message}`, 'error');
        } finally {
            setLoadingStats(false);
            setRefreshing(false);
        }
    }, [router, selectedFilterCelulaId, addToast]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleRefresh = () => { fetchDashboardData(true); };
    const handleFilterChange = (value: string) => { setSelectedFilterCelulaId(value); };

    // --- CHART OPTIONS COM RESPONSIVIDADE ---
    const commonChartOptions: ChartOptions<any> = {
        responsive: true,
        maintainAspectRatio: false, // Importante para containers CSS controlarem a altura
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { size: 11 } } },
        }
    };

    const chartData = { 
        labels: averagePresenceRateData?.labels || [], 
        datasets: [{ label: 'Presença (%)', data: averagePresenceRateData?.data || [], fill: true, backgroundColor: 'rgba(79, 70, 229, 0.2)', borderColor: 'rgba(79, 70, 229, 1)', tension: 0.3, pointRadius: 3 }] 
    };
    
    const membersPieData = { 
        labels: membersDistribution.map(d => d.celula_nome), 
        datasets: [{ data: membersDistribution.map(d => d.count), backgroundColor: ['#4F46E5', '#34D399', '#FCD34D', '#F87171', '#A78BFA', '#2DD4BF', '#FB923C', '#E879F9', '#60A5FA', '#F472B6'] }] 
    };
    
    const visitorsPieData = { 
        labels: visitorsDistribution.map(d => d.celula_nome), 
        datasets: [{ data: visitorsDistribution.map(d => d.count), backgroundColor: ['#4F46E5', '#34D399', '#FCD34D', '#F87171', '#A78BFA', '#2DD4BF', '#FB923C', '#E879F9', '#60A5FA', '#F472B6'] }] 
    };
    
    const newVisitorsTrendChartData = { 
        labels: newVisitorsTrendData?.labels || [], 
        datasets: [{ label: 'Novos Visitantes', data: newVisitorsTrendData?.data || [], fill: true, backgroundColor: 'rgba(52, 211, 153, 0.2)', borderColor: 'rgba(52, 211, 153, 1)', tension: 0.3 }] 
    };
    
    const growthBarData = { 
        labels: celulaGrowth?.top_members.map(cell => cell.celula_nome) || [], 
        datasets: [
            { label: 'Novos Membros', data: celulaGrowth?.top_members.map(cell => cell.growth_members) || [], backgroundColor: 'rgba(59, 130, 246, 0.8)' }, 
            { label: 'Novos Visitantes', data: celulaGrowth?.top_visitors.map(cell => cell.growth_visitors) || [], backgroundColor: 'rgba(16, 185, 129, 0.8)' }
        ] 
    };

    // Helper functions para atividade recente
    const getActivityIcon = (type: ActivityLogItem['type']) => { switch (type) { case 'member_added': return <FaUserPlus className="text-blue-500" />; case 'visitor_added': return <FaUsers className="text-green-500" />; case 'reunion_added': return <FaCalendarCheck className="text-purple-500" />; case 'celula_created': return <FaHome className="text-orange-500" />; case 'visitor_converted': return <FaUserCheck className="text-emerald-500" />; case 'profile_activated': return <FaGlobe className="text-indigo-500" />; default: return null; } };
    const getActivityColor = (type: ActivityLogItem['type']) => { switch (type) { case 'member_added': return 'bg-blue-50 border-blue-200'; case 'visitor_added': return 'bg-green-50 border-green-200'; case 'reunion_added': return 'bg-purple-50 border-purple-200'; case 'celula_created': return 'bg-orange-50 border-orange-200'; case 'visitor_converted': return 'bg-emerald-50 border-emerald-200'; case 'profile_activated': return 'bg-indigo-50 border-indigo-200'; default: return 'bg-gray-50 border-gray-200'; } };

    if (loadingStats) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <>
            <ToastContainer />

            <div className="min-h-screen bg-gray-50 pb-20">
                
                {/* Header Responsivo */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-600 shadow-lg px-4 pt-6 pb-12 sm:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                                    <FaChartLine /> Dashboard
                                </h1>
                                <p className="text-emerald-100 text-sm mt-1">
                                    Bem-vindo, {userRole === 'admin' ? 'Administrador' : 'Líder'}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                                {userRole === 'admin' && (
                                    <div className="relative w-full sm:w-64">
                                        <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                                        <select
                                            value={selectedFilterCelulaId}
                                            onChange={(e) => handleFilterChange(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm appearance-none cursor-pointer"
                                        >
                                            <option value="" className="text-gray-900">Todas as Células</option>
                                            {celulasFilterOptions.map((celula) => (
                                                <option key={celula.id} value={celula.id} className="text-gray-900">
                                                    {celula.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl font-medium transition-all w-full sm:w-auto text-sm"
                                >
                                    <FaSync className={refreshing ? 'animate-spin' : ''} />
                                    {refreshing ? 'Atualizando...' : 'Atualizar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                    
                    {/* Stats Cards (Grid Mobile First) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Membros</p>
                                <p className="text-3xl font-bold text-gray-800 mt-1">{totalMembros}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                <FaUserFriends size={24} />
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Visitantes</p>
                                <p className="text-3xl font-bold text-gray-800 mt-1">{totalVisitantes}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-xl text-green-600">
                                <FaUsers size={24} />
                            </div>
                        </div>

                        {/* Card Última Reunião */}
                        <div className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 relative overflow-hidden">
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium flex items-center gap-1">
                                        <FaCalendarCheck className="text-purple-500" /> Última Reunião
                                    </p>
                                    {lastMeetingPresence ? (
                                        <>
                                            <p className="text-sm font-bold text-gray-800 mt-2 truncate max-w-[150px] sm:max-w-full">
                                                {formatDateForDisplay(lastMeetingPresence.data_reuniao)}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">{lastMeetingPresence.tema}</p>
                                            <div className="flex gap-2 mt-2 text-xs font-semibold">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">M: {lastMeetingPresence.num_presentes_membros}</span>
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">V: {lastMeetingPresence.num_presentes_visitantes}</span>
                                            </div>
                                            {(userRole === 'líder' || (userRole === 'admin' && selectedFilterCelulaId)) && lastMeetingPresence.id && (
                                                <Link href={`/reunioes/presenca/${lastMeetingPresence.id}`} className="absolute top-4 right-4 text-purple-600 bg-purple-50 p-2 rounded-lg hover:bg-purple-100">
                                                    <FaEdit />
                                                </Link>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-lg font-bold text-gray-400 mt-2">Sem registros</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* === CONTEÚDO ADMIN GLOBAL === */}
                    {userRole === 'admin' && !selectedFilterCelulaId && (
                        <div className="space-y-8">
                            
                            {/* Resumo de Células */}
                            {celulasSummary && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-700 mb-2">Total Células</h3>
                                        <p className="text-4xl font-extrabold text-indigo-600">{celulasSummary.totalCelulas}</p>
                                        <Link href="/admin/celulas" className="text-sm text-indigo-500 font-medium hover:underline mt-2 inline-block">Gerenciar</Link>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-700 mb-2">Sem Líder</h3>
                                        <p className="text-4xl font-extrabold text-amber-500">{celulasSummary.celulasWithoutLeaders}</p>
                                        <p className="text-xs text-gray-400 mt-1">Células precisando de atenção</p>
                                    </div>
                                </div>
                            )}

                            {/* Rankings */}
                            {topBottomPresence && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                                            <FaArrowUp className="text-emerald-500" /> Top Presença
                                        </h3>
                                        <ul className="space-y-2">
                                            {topBottomPresence.top.map((c, i) => (
                                                <li key={c.celula_id} className="flex justify-between items-center text-sm p-2 bg-emerald-50/50 rounded-lg">
                                                    <span className="font-medium text-gray-700">{i+1}. {c.celula_nome}</span>
                                                    <span className="font-bold text-emerald-600">{c.avg_presence}%</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                                            <FaArrowDown className="text-red-500" /> Menor Presença
                                        </h3>
                                        <ul className="space-y-2">
                                            {topBottomPresence.bottom.map((c, i) => (
                                                <li key={c.celula_id} className="flex justify-between items-center text-sm p-2 bg-red-50/50 rounded-lg">
                                                    <span className="font-medium text-gray-700">{i+1}. {c.celula_nome}</span>
                                                    <span className="font-bold text-red-600">{c.avg_presence}%</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Gráficos Admin */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {celulaGrowth && (
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 mb-4">Crescimento (30 dias)</h3>
                                        <div className="h-64 w-full">
                                            <Bar data={growthBarData} options={commonChartOptions} />
                                        </div>
                                    </div>
                                )}
                                {newVisitorsTrendData && (
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 mb-4">Novos Visitantes (6 meses)</h3>
                                        <div className="h-64 w-full">
                                            <Line data={newVisitorsTrendChartData} options={commonChartOptions} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pizza Charts */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {membersDistribution.length > 0 && (
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 text-center mb-2">Membros por Célula</h3>
                                        <div className="h-64 w-full flex justify-center">
                                            <Pie data={membersPieData} options={commonChartOptions} />
                                        </div>
                                    </div>
                                )}
                                {visitorsDistribution.length > 0 && (
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 text-center mb-2">Visitantes por Célula</h3>
                                        <div className="h-64 w-full flex justify-center">
                                            <Pie data={visitorsPieData} options={commonChartOptions} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* === CONTEÚDO LÍDER / FILTRO ATIVO === */}
                    {(userRole === 'líder' || (userRole === 'admin' && selectedFilterCelulaId)) && (
                        <div className="space-y-6">
                            
                            {/* Gráfico de Presença (Principal) */}
                            {averagePresenceRateData && averagePresenceRateData.labels.length > 0 && (
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <FaChartLine className="text-indigo-500" /> Engajamento (8 semanas)
                                    </h3>
                                    <div className="h-64 w-full">
                                        <Line data={chartData} options={commonChartOptions} />
                                    </div>
                                </div>
                            )}

                            {/* Alertas em Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                
                                {/* Palavra da Semana */}
                                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border border-indigo-100">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-indigo-900">Palavra da Semana</h3>
                                        <FaBookOpen className="text-indigo-400" />
                                    </div>
                                    {palavraDaSemana ? (
                                        <div className="mt-3">
                                            <p className="font-bold text-indigo-700 line-clamp-1">{palavraDaSemana.titulo}</p>
                                            <p className="text-xs text-indigo-500 mt-1">{formatDateForDisplay(palavraDaSemana.data_semana)}</p>
                                            <a 
                                                href={palavraDaSemana.url_arquivo} 
                                                target="_blank" 
                                                className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                                            >
                                                <FaFileDownload /> Baixar PDF
                                            </a>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-indigo-400 mt-4 italic">Nenhuma palavra disponível.</p>
                                    )}
                                </div>

                                {/* Faltosos */}
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-gray-800">Faltosos (3+)</h3>
                                        <FaExclamationTriangle className={faltososAlert?.count ? "text-red-500" : "text-gray-300"} />
                                    </div>
                                    <div className="mt-2">
                                        <p className={`text-4xl font-bold ${faltososAlert?.count ? "text-red-600" : "text-gray-300"}`}>
                                            {faltososAlert?.count || 0}
                                        </p>
                                        {faltososAlert && faltososAlert.count > 0 && (
                                            <Link href="/relatorios" className="text-xs text-red-500 underline mt-2 inline-block">Ver relatório</Link>
                                        )}
                                    </div>
                                </div>

                                {/* Aniversariantes */}
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-gray-800">Aniversários</h3>
                                        <FaBirthdayCake className="text-pink-400" />
                                    </div>
                                    {birthdayAlert && birthdayAlert.count > 0 ? (
                                        <div className="mt-3 space-y-2">
                                            {birthdayAlert.members.slice(0, 2).map(m => (
                                                <div key={m.id} className="text-sm bg-pink-50 text-pink-700 px-2 py-1 rounded">
                                                    🎉 {m.nome} ({formatDateForDisplay(m.data_nascimento).slice(0,5)})
                                                </div>
                                            ))}
                                            {birthdayAlert.count > 2 && (
                                                <p className="text-xs text-pink-500 text-center">+ {birthdayAlert.count - 2} outros</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-sm mt-4 italic">Nenhum nesta semana.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Listas Recentes (Comuns a todos) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        {/* Membros Recentes */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FaUserPlus className="text-cyan-500" /> Novos Membros
                            </h3>
                            {recentesMembros.length > 0 ? (
                                <ul className="divide-y divide-gray-50">
                                    {recentesMembros.map(m => (
                                        <li key={m.id} className="py-3 flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-gray-800 text-sm">{m.nome}</p>
                                                <p className="text-xs text-gray-400">{formatDateForDisplay(m.data_ingresso)}</p>
                                            </div>
                                            {m.celula_nome && (
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{m.celula_nome}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400 italic text-center py-4">Nenhum registro recente.</p>
                            )}
                        </div>

                        {/* Visitantes Recentes */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FaUsers className="text-pink-500" /> Novos Visitantes
                            </h3>
                            {recentesVisitantes.length > 0 ? (
                                <ul className="divide-y divide-gray-50">
                                    {recentesVisitantes.map(v => (
                                        <li key={v.id} className="py-3 flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-gray-800 text-sm">{v.nome}</p>
                                                <p className="text-xs text-gray-400">{formatDateForDisplay(v.data_primeira_visita)}</p>
                                            </div>
                                            {v.celula_nome && (
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{v.celula_nome}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400 italic text-center py-4">Nenhum registro recente.</p>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}