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
    BarElement
} from 'chart.js';

// ADICIONE O BLOCO DE REGISTRO DO CHART.JS AQUI, FORA DO COMPONENTE PRINCIPAL
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

// ADICIONAR ESTAS DUAS LINHAS NOVAS para o sistema de toast:
import useToast from '@/hooks/useToast';
import Toast from '@/components/ui/Toast';


// --- IMPORTAÇÕES DE FUNÇÕES DE dashboard_data.ts ---
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

// --- IMPORTAÇÕES DE INTERFACES DO NOVO ARQUIVO types.ts ---
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
} from '@/lib/types';

import { getPalavraDaSemana, PalavraDaSemana, CelulaOption } from '@/lib/data';

import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters';
import LoadingSpinner from '@/components/LoadingSpinner';

// CORREÇÃO AQUI: As importações de Fa são necessárias e não devem ser removidas
// Eu tinha pedido para remover o bloco de toast, e isso erroneamente levou a remoção dessas importações
// que estavam AGREGADAS no bloco que você tinha.
// O ideal é que as importações de Fa estejam SEPARADAS.
import {
    FaUserPlus,
    FaUsers,
    FaCalendarCheck,
    FaGlobe,
    FaHome,
    FaChartLine, // ESTE ÍCONE ESTAVA FALTANDO
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
    FaExclamationCircle,
    FaInfoCircle,
    FaChartBar,
    FaHistory,
    FaUserCheck,
    FaSearch,
    FaBookOpen,
    FaFileDownload
} from 'react-icons/fa'; // GARANTIR QUE ESTE BLOCO ESTÁ PRESENTE E COMPLETO

export default function DashboardPage() {
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

    // Estados para dados admin
    const [faltososAlert, setFaltososAlert] = useState<FaltososAlert | null>(null);
    const [unconvertedVisitorsAlert, setUnconvertedVisitorsAlert] = useState<UnconvertedVisitorsAlert | null>(null);
    const [birthdayAlert, setBirthdayAlert] = useState<BirthdayAlert | null>(null);
    const [averagePresenceRateData, setAveragePresenceRateData] = useState<AveragePresenceRateData | null>(null);
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

    const [palavraDaSemana, setPalavraDaSemana] = useState<PalavraDaSemana | null>(null);

    const router = useRouter();
    const { toasts, addToast, removeToast } = useToast();

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

        if (profileError || !profile) {
            currentUserRole = null;
        } else {
            currentUserRole = profile.role as 'admin' | 'líder';
            currentUserCelulaId = profile.celula_id;
        }
        setUserRole(currentUserRole);

        let celulaIdToFetch: string | null = null;
        const currentFilterValue = selectedFilterCelulaId;
        celulaIdToFetch = currentFilterValue || (currentUserRole === 'líder' ? currentUserCelulaId : null);

        if (currentUserRole === 'admin') {
            try {
                const celulasData = await getCelulasOptionsForAdmin();
                setCelulasFilterOptions(celulasData);
            } catch (error: any) {
                addToast('Erro ao carregar lista de células', 'error');
            }
        }

        if (currentUserRole === 'líder' && !selectedFilterCelulaId && currentUserCelulaId) {
             setSelectedFilterCelulaId(currentUserCelulaId);
        }

        try {
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

            if (currentUserRole === 'admin' && !celulaIdToFetch) {
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

            setTotalMembros(membrosCount as number);
            setTotalVisitantes(visitantesCount as number);
            setLastMeetingPresence(lastMeetingDetails as LastMeetingPresence | null);
            setRecentesMembros(recentMembrosList as MembroDashboard[]);
            setRecentesVisitantes(recentVisitantesList as VisitanteDashboard[]);
            setUltimasReunioes(lastMeetingsList as ReuniaoComNomes[]);
            setPalavraDaSemana(fetchedPalavraDaSemana as PalavraDaSemana | null);

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

                setFaltososAlert(null);
                setUnconvertedVisitorsAlert(null);
                setBirthdayAlert(null);
                setAveragePresenceRateData(null);
            } else if (currentUserRole === 'líder' || (currentUserRole === 'admin' && celulaIdToFetch)) {
                setFaltososAlert(specificRoleData[0]);
                setUnconvertedVisitorsAlert(specificRoleData[1]);
                setBirthdayAlert(specificRoleData[2]);
                setAveragePresenceRateData(specificRoleData[3]);

                setCelulasSummary(null);
                setTopBottomPresence(null);
                setCelulaGrowth(null);
                setMembersDistribution([]);
                setVisitorsDistribution([]);
                setGlobalRecentActivity([]);
                setVisitorsConversionAnalysis(null);
                setNewVisitorsTrendData(null);
                setDuplicateVisitorGroups(null);
            }


            if (showRefreshToast) {
                addToast('Dashboard atualizado com sucesso!', 'success');
            }
        } catch (error: any) {
            console.error("Erro ao carregar dados do dashboard:", error);
            addToast(`Erro ao carregar dados do dashboard: ${error.message}`, 'error');
        } finally {
            setLoadingStats(false);
            setRefreshing(false);
        }
    }, [router, selectedFilterCelulaId, addToast]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);


    const handleRefresh = () => { fetchDashboardData(true); };
    const handleFilterChange = (value: string) => {
        setSelectedFilterCelulaId(value);
    };

    // --- Configurações de ChartJS ---
    const chartData = { labels: averagePresenceRateData?.labels || [], datasets: [{ label: 'Presença Média (%)', data: averagePresenceRateData?.data || [], fill: true, backgroundColor: 'rgba(79, 70, 229, 0.2)', borderColor: 'rgba(79, 70, 229, 1)', tension: 0.3, pointBackgroundColor: 'rgba(79, 70, 229, 1)', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: 'rgba(79, 70, 229, 1)', pointRadius: 5, pointHoverRadius: 8, },], };
    const chartOptions = { responsive: true, plugins: { legend: { position: 'top' as const, labels: { font: { size: 14, weight: 700, }, color: '#333', }, }, title: { display: true, text: 'Média de Presença da Célula (Últimas 8 Semanas)', font: { size: 16, weight: 700, }, color: '#333', }, tooltip: { callbacks: { label: function(context: any) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += context.parsed.y + '%'; } return label; } } } }, scales: { x: { title: { display: true, text: 'Semana', font: { size: 12, weight: 700, }, color: '#555', }, grid: { display: false, }, }, y: { title: { display: true, text: 'Percentual (%)', font: { size: 12, weight: 700, }, beginAtZero: true, max: 100, ticks: { callback: function(value: any) { return value + '%'; } } }, }, }, };
    const membersPieData = { labels: membersDistribution.map(d => d.celula_nome), datasets: [{ label: 'Membros', data: membersDistribution.map(d => d.count), backgroundColor: ['#4F46E5', '#34D399', '#FCD34D', '#F87171', '#A78BFA', '#2DD4BF', '#FB923C', '#E879F9', '#60A5FA', '#F472B6'], hoverOffset: 4, },], };
    const visitorsPieData = { labels: visitorsDistribution.map(d => d.celula_nome), datasets: [{ label: 'Visitantes', data: visitorsDistribution.map(d => d.count), backgroundColor: ['#4F46E5', '#34D399', '#FCD34D', '#F87171', '#A78BFA', '#2DD4BF', '#FB923C', '#E879F9', '#60A5FA', '#F472B6'], hoverOffset: 4, },], };
    const pieOptions = { responsive: true, plugins: { legend: { position: 'right' as const, labels: { font: { size: 12, }, color: '#333', }, }, title: { display: false, }, tooltip: { callbacks: { label: function(context: any) { let label = context.label || ''; if (label) { label += ': '; } if (context.parsed !== null) { label += context.parsed + ' (' + context.raw + ')'; } return label; } } } }, };
    const newVisitorsTrendChartData = { labels: newVisitorsTrendData?.labels || [], datasets: [{ label: 'Novos Visitantes', data: newVisitorsTrendData?.data || [], fill: true, backgroundColor: 'rgba(52, 211, 153, 0.2)', borderColor: 'rgba(52, 211, 153, 1)', tension: 0.3, pointBackgroundColor: 'rgba(52, 211, 153, 1)', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: 'rgba(52, 211, 153, 1)', pointRadius: 5, pointHoverRadius: 8, },], };
    const newVisitorsTrendChartOptions = { responsive: true, plugins: { legend: { position: 'top' as const, labels: { font: { size: 14, weight: 700, }, color: '#333', }, }, title: { display: true, text: 'Tendência de Novos Visitantes (Últimos 6 Meses)', font: { size: 16, weight: 700, }, color: '#333', }, }, scales: { x: { title: { display: true, text: 'Mês', font: { size: 12, weight: 700, }, color: '#555', }, grid: { display: false, }, }, y: { title: { display: true, text: 'Número de Visitantes', font: { size: 12, weight: 700, }, beginAtZero: true, ticks: { stepSize: 1, }, }, }, }, };
    const growthBarData = { labels: celulaGrowth?.top_members.map(cell => cell.celula_nome) || [], datasets: [{ label: 'Novos Membros', data: celulaGrowth?.top_members.map(cell => cell.growth_members) || [], backgroundColor: 'rgba(59, 130, 246, 0.8)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1, }, { label: 'Novos Visitantes', data: celulaGrowth?.top_visitors.map(cell => cell.growth_visitors) || [], backgroundColor: 'rgba(16, 185, 129, 0.8)', borderColor: 'rgba(16, 185, 129, 1)', borderWidth: 1, },], };
    const growthBarOptions = { responsive: true, plugins: { legend: { position: 'top' as const, }, title: { display: true, text: 'Crescimento nas Células (Últimos 30 Dias)', }, }, scales: { x: { grid: { display: false, }, }, y: { beginAtZero: true, ticks: { stepSize: 1, }, }, }, };
    const getActivityIcon = (type: ActivityLogItem['type']) => { switch (type) { case 'member_added': return <FaUserPlus className="text-blue-500" />; case 'visitor_added': return <FaUsers className="text-green-500" />; case 'reunion_added': return <FaCalendarCheck className="text-purple-500" />; case 'celula_created': return <FaHome className="text-orange-500" />; case 'visitor_converted': return <FaUserCheck className="text-emerald-500" />; case 'profile_activated': return <FaGlobe className="text-indigo-500" />; default: return null; } };
    const getActivityColor = (type: ActivityLogItem['type']) => { switch (type) { case 'member_added': return 'bg-blue-50 border-blue-200'; case 'visitor_added': return 'bg-green-50 border-green-200'; case 'reunion_added': return 'bg-purple-50 border-purple-200'; case 'celula_created': return 'bg-orange-50 border-orange-200'; case 'visitor_converted': return 'bg-emerald-50 border-emerald-200'; case 'profile_activated': return 'bg-indigo-50 border-indigo-200'; default: return 'bg-gray-50 border-gray-200'; } };

    if (loadingStats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <>
            {/* NOVO: Container de Toasts global */}
            <div className="fixed top-4 right-4 z-50 w-80 space-y-2">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                        duration={toast.duration}
                    />
                ))}
            </div>
            {/* FIM NOVO: Container de Toasts */}

            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-2xl shadow-xl p-6 mb-8 text-white">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                            <div className="flex-1">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                        <FaChartLine className="text-2xl" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold">
                                            Dashboard
                                            {userRole === 'admin' && (<span className="text-emerald-200 text-lg ml-2">(Administrador)</span>)}
                                        </h1>
                                        <p className="text-emerald-100 mt-2">Visão geral do sistema de células</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                                    {userRole === 'admin' && (
                                        <div className="relative">
                                            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                                            <select
                                                value={selectedFilterCelulaId}
                                                onChange={(e) => handleFilterChange(e.target.value)}
                                                className="pl-10 pr-8 py-2.5 border border-white/30 bg-white/10 backdrop-blur-sm rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all duration-200 w-full sm:w-64 appearance-none cursor-pointer"
                                                disabled={loadingStats}
                                            >
                                                <option value="" className="text-gray-800">Todas as Células</option>
                                                {celulasFilterOptions.map((celula) => (
                                                    <option key={celula.id} value={celula.id} className="text-gray-800">
                                                        {celula.nome}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleRefresh}
                                        disabled={refreshing}
                                        className="flex items-center justify-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2.5 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                                    >
                                        <FaSync className={`text-sm ${refreshing ? 'animate-spin' : ''}`} />
                                        <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
                                    </button>
                                </div>

                                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                                    <span className="text-sm font-medium text-white">
                                        {userEmail}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Main Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 group">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-700 flex items-center space-x-2 mb-2">
                                        <div className="p-2 bg-blue-100 rounded-lg group-hover:scale-110 transition-transform duration-200">
                                            <FaUserFriends className="text-blue-600 text-lg" />
                                        </div>
                                        <span>Total de Membros</span>
                                    </h2>
                                    <p className="text-4xl font-bold text-blue-600 mt-2">{totalMembros}</p>
                                    <p className="text-sm text-gray-500 mt-1">Membros ativos na célula</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 group">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-700 flex items-center space-x-2 mb-2">
                                        <div className="p-2 bg-green-100 rounded-lg group-hover:scale-110 transition-transform duration-200">
                                            <FaUsers className="text-green-600 text-lg" />
                                        </div>
                                        <span>Total de Visitantes</span>
                                    </h2>
                                    <p className="text-4xl font-bold text-green-600 mt-2">{totalVisitantes}</p>
                                    <p className="text-sm text-gray-500 mt-1">Visitantes distintos registrados</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 group">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-700 flex items-center space-x-2 mb-2">
                                        <div className="p-2 bg-purple-100 rounded-lg group-hover:scale-110 transition-transform duration-200">
                                            <FaCalendarCheck className="text-purple-600 text-lg" />
                                        </div>
                                        <span>Última Reunião</span>
                                    </h2>
                                    {lastMeetingPresence ? (
                                        <div className="mt-2">
                                            <p className="text-2xl font-bold text-purple-600">
                                                M: {lastMeetingPresence.num_presentes_membros} / V: {lastMeetingPresence.num_presentes_visitantes} / C: {lastMeetingPresence.num_criancas}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {formatDateForDisplay(lastMeetingPresence.data_reuniao)}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate mt-1" title={lastMeetingPresence.tema}>
                                                {lastMeetingPresence.tema}
                                            </p>
                                            {(userRole === 'líder' || (userRole === 'admin' && selectedFilterCelulaId)) && lastMeetingPresence.id && (
                                                <Link
                                                    href={`/reunioes/presenca/${lastMeetingPresence.id}`}
                                                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mt-2 inline-flex items-center space-x-1 transition-colors duration-200"
                                                >
                                                    <FaEye className="text-sm" />
                                                    <span>Ajustar Presença</span>
                                                </Link>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xl text-gray-500 mt-2">Nenhuma Reunião</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Admin Global Views (apenas quando Admin e "Todas as Células" selecionado) */}
                    {userRole === 'admin' && !selectedFilterCelulaId && (
                        <>
                            {celulasSummary && (
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2"><div className="p-2 bg-indigo-100 rounded-lg"><FaHome className="text-indigo-600" /></div><span>Resumo de Células</span></h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300"><h3 className="text-lg font-semibold text-gray-700">Total de Células Ativas</h3><p className="text-4xl font-bold text-cyan-700 mt-2">{celulasSummary.totalCelulas}</p><Link href="/admin/celulas" className="text-indigo-600 hover:text-indigo-800 font-medium text-sm mt-2 inline-flex items-center space-x-1 transition-colors duration-200"><FaEye className="text-sm" /><span>Gerenciar Células</span></Link></div>
                                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300"><h3 className="text-lg font-semibold text-gray-700">Células sem Líder</h3><p className="text-4xl font-bold text-yellow-700 mt-2">{celulasSummary.celulasWithoutLeaders}</p><p className="text-sm text-gray-600 mt-1">{celulasSummary.celulasWithoutLeaders > 0 ? 'Requer atenção' : 'Todas com líderes'}</p></div>
                                    </div>
                                </div>
                            )}

                            {topBottomPresence && (
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2"><div className="p-2 bg-emerald-100 rounded-lg"><FaChartLine className="text-emerald-600" /></div><span>Top/Flop de Presença</span></h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center space-x-2">
                                                <FaArrowUp className="text-emerald-600" />
                                                <span>Top Presença</span>
                                            </h3>
                                            {topBottomPresence.top.length > 0 ? (
                                                <ul className="space-y-3">{topBottomPresence.top.map((cell, index) => (<li key={cell.celula_id} className="flex justify-between items-center p-3 hover:bg-emerald-50 rounded-lg transition-colors duration-200"><span className="font-medium text-gray-800">{index + 1}. {cell.celula_nome}</span><span className="font-bold text-emerald-600 bg-white px-3 py-1 rounded-full text-sm border border-emerald-200">{cell.avg_presence}%</span></li>))}</ul>
                                            ) : (
                                                <p className="text-gray-500 text-center py-4">Nenhum dado disponível</p>
                                            )}
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center space-x-2">
                                                <FaArrowDown className="text-red-600" />
                                                <span>Pior Presença</span>
                                            </h3>
                                            {topBottomPresence.bottom.length > 0 ? (
                                                <ul className="space-y-3">{topBottomPresence.bottom.map((cell, index) => (<li key={cell.celula_id} className="flex justify-between items-center p-3 hover:bg-red-50 rounded-lg transition-colors duration-200"><span className="font-medium text-gray-800">{index + 1}. {cell.celula_nome}</span><span className="font-bold text-red-600 bg-white px-3 py-1 rounded-full text-sm border border-red-200">{cell.avg_presence}%</span></li>))}</ul>
                                            ) : (
                                                <p className="text-gray-500 text-center py-4">Nenhum dado disponível</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {celulaGrowth && growthBarData.labels.length > 0 && (
                                <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2"><div className="p-2 bg-blue-100 rounded-lg"><FaChartBar className="text-blue-600" /></div><span>Crescimento nas Células</span></h2>
                                    <div className="h-72">
                                        <Bar data={growthBarData} options={growthBarOptions} />
                                    </div>
                                </div>
                            )}

                            {membersDistribution.length > 0 && (
                                <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2"><div className="p-2 bg-purple-100 rounded-lg"><FaChartPie className="text-purple-600" /></div><span>Distribuição de Membros por Célula</span></h2>
                                    <div className="h-64 flex items-center justify-center">
                                        <Pie data={membersPieData} options={pieOptions} />
                                    </div>
                                </div>
                            )}

                            {visitorsDistribution.length > 0 && (
                                <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2"><div className="p-2 bg-green-100 rounded-lg"><FaChartPie className="text-green-600" /></div><span>Distribuição de Visitantes por Célula</span></h2>
                                    <div className="h-64 flex items-center justify-center">
                                        <Pie data={visitorsPieData} options={pieOptions} />
                                    </div>
                                </div>
                            )}

                            {globalRecentActivity.length > 0 && (
                                <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2"><div className="p-2 bg-gray-100 rounded-lg"><FaHistory className="text-gray-600" /></div><span>Atividade Recente Global</span></h2>
                                    <ul className="space-y-3">
                                        {globalRecentActivity.map(activity => (
                                            <li key={activity.id} className={`flex items-center space-x-3 p-3 rounded-lg border ${getActivityColor(activity.type)}`}>
                                                <div className="flex-shrink-0">{getActivityIcon(activity.type)}</div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDateForDisplay(activity.created_at)} {activity.celula_nome && `(${activity.celula_nome})`}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {newVisitorsTrendData && newVisitorsTrendData.labels.length > 0 && (
                                <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2"><div className="p-2 bg-teal-100 rounded-lg"><FaChartLine className="text-teal-600" /></div><span>Tendência de Novos Visitantes</span></h2>
                                    <div className="h-64">
                                        <Line data={newVisitorsTrendChartData} options={newVisitorsTrendChartOptions} />
                                    </div>
                                </div>
                            )}

                            {visitorsConversionAnalysis && visitorsConversionAnalysis.length > 0 && (
                                <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2"><div className="p-2 bg-yellow-100 rounded-lg"><FaUserCheck className="text-yellow-600" /></div><span>Análise de Conversão de Visitantes</span></h2>
                                    <div className="space-y-4">
                                        {visitorsConversionAnalysis.map(analysis => (
                                            <div key={analysis.celula_id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                <h3 className="text-lg font-semibold text-yellow-800 flex items-center space-x-2">
                                                    <FaHome className="text-yellow-600" />
                                                    <span>{analysis.celula_nome}</span>
                                                    <span className="ml-auto text-yellow-700 font-bold">{analysis.total_unconverted_with_presences} visitantes</span>
                                                </h3>
                                                <ul className="mt-3 space-y-2">
                                                    {analysis.visitors.map(visitor => (
                                                        <li key={visitor.id} className="flex justify-between items-center text-sm p-2 bg-white rounded-md shadow-sm">
                                                            <span className="font-medium text-gray-800">{visitor.nome}</span>
                                                            <span className="text-gray-600">{formatPhoneNumberDisplay(visitor.telefone)}</span>
                                                            {/* CORREÇÃO AQUI: REMOVER ESTA LINHA DUPLICADA */}
                                                            {/* <span className="text-gray-500">{formatPhoneNumberDisplay(visitor.telefone)}</span> */} 
                                                        </li>
                                                    ))}
                                                </ul>
                                                <Link href={`/relatorios?type=visitantes&celula=${analysis.celula_id}`} className="text-yellow-700 hover:text-yellow-900 font-medium text-sm mt-3 inline-flex items-center space-x-1 transition-colors duration-200">
                                                    <FaSearch className="text-sm" />
                                                    <span>Ver detalhes</span>
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {duplicateVisitorGroups && duplicateVisitorGroups.length > 0 && (
                                <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2"><div className="p-2 bg-red-100 rounded-lg"><FaExclamationTriangle className="text-red-600" /></div><span>Visitantes Duplicados Detectados</span></h2>
                                    <div className="space-y-4">
                                        {duplicateVisitorGroups.map(group => (
                                            <div key={group.group_id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                <h3 className="text-lg font-semibold text-red-800 flex items-center space-x-2">
                                                    <FaInfoCircle className="text-red-600" />
                                                    <span>{group.type === 'nome' ? 'Nome Comum' : 'Telefone Comum'}: <span className="font-bold">{group.common_value}</span></span>
                                                </h3>
                                                <ul className="mt-3 space-y-2">
                                                    {group.visitors.map(visitor => (
                                                        <li key={visitor.id} className="flex justify-between items-center text-sm p-2 bg-white rounded-md shadow-sm">
                                                            <span className="font-medium text-gray-800">{visitor.nome}</span>
                                                            <span className="text-gray-600">{formatPhoneNumberDisplay(visitor.telefone)}</span>
                                                            <span className="text-gray-500">{visitor.celula_nome}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <p className="text-red-700 text-sm mt-3">Recomendado revisar e mesclar manualmente.</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Leader Alerts / Admin with Celula Filter (visível para Líder OU Admin com filtro) */}
                    {(userRole === 'líder' || (userRole === 'admin' && selectedFilterCelulaId)) && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <FaExclamationTriangle className="text-red-600" />
                                </div>
                                <span>Alertas da Célula</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Card da Palavra da Semana para Líderes */}
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-700">Palavra da Semana</h3>
                                        <div className="p-2 bg-indigo-100 rounded-lg">
                                            <FaBookOpen className="text-indigo-600 text-xl" />
                                        </div>
                                    </div>
                                    {palavraDaSemana ? (
                                        <>
                                            <p className="text-xl font-bold text-indigo-600 truncate" title={palavraDaSemana.titulo}>{palavraDaSemana.titulo}</p>
                                            <p className="text-sm text-gray-600 mt-2">
                                                Semana de: {formatDateForDisplay(palavraDaSemana.data_semana)}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1 truncate" title={palavraDaSemana.descricao || undefined}>
                                                {palavraDaSemana.descricao || 'Nenhuma descrição.'}
                                            </p>
                                            <a
                                                href={palavraDaSemana.url_arquivo}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-medium text-sm mt-3 transition-colors duration-200"
                                            >
                                                <FaFileDownload className="text-sm" />
                                                <span>Baixar Material</span>
                                            </a>
                                        </>
                                    ) : (
                                        <div className="text-center py-4">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <FaBookOpen className="text-gray-400 text-xl" />
                                            </div>
                                            <p className="text-lg text-gray-500">Nenhuma palavra disponível</p>
                                        </div>
                                    )}
                                </div>

                                {/* Faltosos Alert */}
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                    <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-700">Membros Faltosos</h3><div className="p-2 bg-red-100 rounded-lg"><FaExclamationTriangle className="text-red-600" /></div></div>
                                    {faltososAlert && faltososAlert.count > 0 ? (
                                        <><p className="text-3xl font-bold text-red-600">{faltososAlert.count}</p><p className="text-sm text-gray-600 mt-2">{faltososAlert.count === 1 ? 'membro com' : 'membros com'} 3+ ausências</p><Link href="/relatorios" className="text-red-600 hover:text-red-800 font-medium text-sm mt-3 inline-flex items-center space-x-1 transition-colors duration-200"><FaEye className="text-sm" /><span>Ver Relatório</span></Link></>
                                    ) : (<div className="text-center py-4"><div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><FaCheckCircle className="text-green-600 text-xl" /></div><p className="text-lg text-green-600 font-semibold">🎉 Nenhum membro faltoso</p></div>)}
                                </div>

                                {/* Unconverted Visitors Alert */}
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                    <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-700">Visitantes a Converter</h3><div className="p-2 bg-orange-100 rounded-lg"><FaUserPlus className="text-orange-600 text-xl" /></div></div>
                                    {unconvertedVisitorsAlert && unconvertedVisitorsAlert.count > 0 ? (
                                        <><p className="text-3xl font-bold text-orange-600">{unconvertedVisitorsAlert.count}</p><p className="text-sm text-gray-600 mt-2">{unconvertedVisitorsAlert.count === 1 ? 'visitante com' : 'visitantes com'} 30+ dias</p><Link href="/visitantes" className="text-orange-600 hover:text-orange-800 font-medium text-sm mt-3 inline-flex items-center space-x-1 transition-colors duration-200"><FaEye className="text-sm" /><span>Gerenciar</span></Link></>
                                    ) : (<div className="text-center py-4"><div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><FaCheckCircle className="text-green-600 text-xl" /></div><p className="text-lg text-green-600 font-semibold">👍 Todos convertidos</p></div>)}
                                </div>

                                {/* Birthday Alert */}
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                    <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-700">Aniversariantes</h3><div className="p-2 bg-pink-100 rounded-lg"><FaBirthdayCake className="text-pink-600 text-xl" /></div></div>
                                    {birthdayAlert && birthdayAlert.count > 0 ? (
                                        <><p className="text-3xl font-bold text-pink-600">{birthdayAlert.count}</p><ul className="text-sm text-gray-600 mt-2 space-y-1">{birthdayAlert.members.slice(0, 3).map((m) => (<li key={m.id} className="hover:bg-pink-50 p-1 rounded transition-colors duration-200">{m.nome} ({formatDateForDisplay(m.data_nascimento).substring(0, 5)})</li>))}{birthdayAlert.count > 3 && (<li className="text-pink-600 font-medium">E mais {birthdayAlert.count - 3}...</li>)}</ul><Link href="/membros" className="text-pink-600 hover:text-pink-800 font-medium text-sm mt-3 inline-flex items-center space-x-1 transition-colors duration-200"><FaEye className="text-sm" /><span>Ver Membros</span></Link></>
                                    ) : (<div className="text-center py-4"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><FaBirthdayCake className="text-gray-400 text-xl" /></div><p className="text-lg text-gray-500">🎂 Nenhum aniversariante</p></div>)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Engagement Chart (visível para Líder OU Admin com filtro) */}
                    {(userRole === 'líder' || (userRole === 'admin' && selectedFilterCelulaId)) && averagePresenceRateData && averagePresenceRateData.labels.length > 0 && (
                        <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2"><div className="p-2 bg-indigo-100 rounded-lg"><FaChartLine className="text-indigo-600" /></div><span>Engajamento da Célula</span></h2><div className="h-64"><Line data={chartData} options={chartOptions} /></div>
                        </div>
                    )}

                    {/* Recent Lists (Visível para ambos, ajustado pelo filtro) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center space-x-2"><div className="p-2 bg-yellow-100 rounded-lg"><FaCalendarCheck className="text-yellow-600" /></div><span>Últimas Reuniões</span></h2>
                            {ultimasReunioes.length > 0 ? (<ul className="space-y-3">{ultimasReunioes.map((reuniao) => (<li key={reuniao.id} className="pb-3 border-b border-gray-100 last:border-b-0 last:pb-0 hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200"><p className="font-medium text-gray-800">{formatDateForDisplay(reuniao.data_reuniao)}</p><p className="text-sm text-gray-600 mt-1 line-clamp-2" title={reuniao.tema}>{reuniao.tema}</p>{reuniao.celula_nome && (<span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">{reuniao.celula_nome}</span>)}<p className="text-xs text-gray-500 mt-1">M: {reuniao.num_presentes_membros} / V: {reuniao.num_presentes_visitantes}</p></li>))}</ul>) : (<p className="text-gray-500 text-center py-4">Nenhuma reunião encontrada</p>)}
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center space-x-2"><div className="p-2 bg-cyan-100 rounded-lg"><FaUserFriends className="text-cyan-600" /></div><span>Membros Recentes</span></h2>
                            {recentesMembros.length > 0 ? (<ul className="space-y-3">{recentesMembros.map((membro) => (<li key={membro.id} className="pb-3 border-b border-gray-100 last:border-b-0 last:pb-0 hover:bg-cyan-50 p-2 rounded-lg transition-colors duration-200"><p className="font-medium text-gray-800">{membro.nome}</p><p className="text-sm text-gray-600 mt-1">Desde: {formatDateForDisplay(membro.data_ingresso)}</p>{membro.celula_nome && (<span className="inline-block bg-cyan-100 text-cyan-800 text-xs px-2 py-1 rounded-full mt-1">{membro.celula_nome}</span>)}</li>))}</ul>) : (<p className="text-gray-500 text-center py-4">Nenhum membro recente</p>)}
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center space-x-2"><div className="p-2 bg-pink-100 rounded-lg"><FaUsers className="text-pink-600" /></div><span>Visitantes Recentes</span></h2>
                            {recentesVisitantes.length > 0 ? (<ul className="space-y-3">{recentesVisitantes.map((visitante) => (<li key={visitante.id} className="pb-3 border-b border-gray-100 last:border-b-0 last:pb-0 hover:bg-pink-50 p-2 rounded-lg transition-colors duration-200"><p className="font-medium text-gray-800">{visitante.nome}</p><p className="text-sm text-gray-600 mt-1">1ª Visita: {formatDateForDisplay(visitante.data_primeira_visita)}</p>{visitante.celula_nome && (<span className="inline-block bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full mt-1">{visitante.celula_nome}</span>)}</li>))}</ul>) : (<p className="text-gray-500 text-center py-4">Nenhum visitante recente</p>)}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}