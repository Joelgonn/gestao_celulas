// src/app/(app)/relatorios/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';

import {
    fetchReportDataPresencaReuniao,
    fetchReportDataPresencaMembro,
    fetchReportDataFaltososPeriodo,
    fetchReportDataVisitantesPeriodo,
    fetchReportDataAniversariantes,
    fetchReportDataAlocacaoLideres,
    fetchReportDataChavesAtivacao,
    listMembros,
    listReunioes,
    exportReportDataPresencaReuniaoCSV,
    exportReportDataPresencaMembroCSV,
    exportReportDataFaltososPeriodoCSV,
    exportReportDataVisitantesPeriodoCSV,
    exportReportDataAniversariantesCSV,
    exportReportDataAlocacaoLideresCSV,
    exportReportDataChavesAtivacaoCSV,
} from '@/lib/reports_data';

import {
    listarCelulasParaAdmin,
    listarCelulasParaLider,
} from '@/lib/data';

import {
    CelulaOption,
    ReportDataPresencaReuniao,
    ReportDataPresencaMembro,
    ReportDataFaltososPeriodo,
    ReportDataVisitantesPeriodo,
    ReportDataAniversariantes,
    ReportDataAlocacaoLideres,
    ReportDataChavesAtivacao,
    ReuniaoOption,
    MembroOption,
} from '@/lib/types';

import { formatDateForDisplay } from '@/utils/formatters';

import { ReportPresencaReuniaoDisplay } from '@/components/relatorios/ReportPresencaReuniaoDisplay';
import { ReportPresencaMembroDisplay } from '@/components/relatorios/ReportPresencaMembroDisplay';
import { ReportFaltososPeriodoDisplay } from '@/components/relatorios/ReportFaltososPeriodoDisplay';
import { ReportVisitantesPeriodoDisplay } from '@/components/relatorios/ReportVisitantesPeriodoDisplay';
import { ReportAniversariantesDisplay } from '@/components/relatorios/ReportAniversariantesDisplay';
import { ReportAlocacaoLideresDisplay } from '@/components/relatorios/ReportAlocacaoLideresDisplay';
import { ReportChavesAtivacaoDisplay } from '@/components/relatorios/ReportChavesAtivacaoDisplay';

import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaFileAlt,
    FaFilter,
    FaCalendarAlt,
    FaUser,
    FaUsers,
    FaBirthdayCake,
    FaFilePdf,
    FaFileCsv,
    FaSearch,
    FaDownload,
    FaChartBar
} from 'react-icons/fa';

type ReportContent = ReportDataPresencaReuniao | ReportDataPresencaMembro | ReportDataFaltososPeriodo | ReportDataVisitantesPeriodo | ReportDataAniversariantes | ReportDataAlocacaoLideres | ReportDataChavesAtivacao;

type UnifiedReportData = {
    type: ReportTypeEnum;
    title: string;
    content: ReportContent;
    filename?: string;
};

type ReportTypeEnum = 'presenca_reuniao' | 'presenca_membro' | 'faltosos' | 'visitantes_periodo' | 'aniversariantes_mes' | 'alocacao_lideres' | 'chaves_ativacao';

export default function RelatoriosPage() {
    const [selectedReportType, setSelectedReportType] = useState<ReportTypeEnum | null>(null);
    const [reunioesOptions, setReunioesOptions] = useState<ReuniaoOption[]>([]);
    const [membrosOptions, setMembrosOptions] = useState<MembroOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(true);

    const [selectedReuniaoId, setSelectedReuniaoId] = useState<string>('');
    const [selectedMembroId, setSelectedMembroId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedBirthdayMonth, setSelectedBirthdayMonth] = useState<string>('');

    const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);
    const [celulasFilterOptions, setCelulasFilterOptions] = useState<CelulaOption[]>([]);
    const [selectedFilterCelulaId, setSelectedFilterCelulaId] = useState<string>('');

    const [reportDisplayData, setReportDisplayData] = useState<UnifiedReportData | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [exportingCsv, setExportingCsv] = useState(false);

    const { addToast, ToastContainer } = useToast();

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString(),
        label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }),
    }));

    useEffect(() => {
        async function fetchUserRoleOnMount() {
            setLoadingOptions(true);
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (user && !userError) {
                    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                    if (profile) {
                        setUserRole(profile.role as 'admin' | 'líder');
                    }
                }
            } catch (e: any) {
                console.error("Erro inicial:", e);
                addToast('Erro ao carregar perfil', 'error');
            }
        }
        fetchUserRoleOnMount();
    }, [addToast]);

    const loadAllDataAndAdjustFilter = useCallback(async () => {
        if (userRole === null) return;

        setLoadingOptions(true);
        try {
            let currentFetchedCelulasData: CelulaOption[] = [];
            if (userRole === 'admin') {
                currentFetchedCelulasData = await listarCelulasParaAdmin();
            } else if (userRole === 'líder') {
                currentFetchedCelulasData = await listarCelulasParaLider();
            }
            setCelulasFilterOptions(currentFetchedCelulasData);

            let effectiveFilterCelulaId = selectedFilterCelulaId;
            let filterUpdatedThisCycle = false;

            if (userRole === 'líder') {
                if (currentFetchedCelulasData.length === 1) {
                    if (selectedFilterCelulaId !== currentFetchedCelulasData[0].id) {
                        effectiveFilterCelulaId = currentFetchedCelulasData[0].id;
                        filterUpdatedThisCycle = true;
                    }
                } else if (currentFetchedCelulasData.length === 0 && selectedFilterCelulaId !== "") {
                    effectiveFilterCelulaId = "";
                    filterUpdatedThisCycle = true;
                }
            } else if (userRole === 'admin') {
                if (selectedFilterCelulaId !== "" && !currentFetchedCelulasData.some(c => c.id === selectedFilterCelulaId)) {
                    effectiveFilterCelulaId = "";
                    filterUpdatedThisCycle = true;
                }
            }

            if (filterUpdatedThisCycle) {
                setSelectedFilterCelulaId(effectiveFilterCelulaId);
                // addToast("Filtro de célula ajustado.", 'info'); // Opcional para não poluir a tela
                return;
            }

            // Reseta relatório se mudar permissão
            if (userRole !== 'admin' && (selectedReportType === 'alocacao_lideres' || selectedReportType === 'chaves_ativacao')) {
                setSelectedReportType(null);
                setReportDisplayData(null);
                return;
            }

            let celulaIdForData: string | null = null;
            if (userRole === 'admin') {
                celulaIdForData = effectiveFilterCelulaId === "" ? null : effectiveFilterCelulaId;
            } else if (userRole === 'líder' && currentFetchedCelulasData.length === 1) {
                celulaIdForData = currentFetchedCelulasData[0].id;
            }

            const finalId = (selectedReportType === 'alocacao_lideres' || selectedReportType === 'chaves_ativacao')
                ? null
                : celulaIdForData;

            const [membrosData, reunioesData] = await Promise.all([
                listMembros(finalId),
                listReunioes(finalId)
            ]);

            setMembrosOptions(membrosData);
            setReunioesOptions(reunioesData);

        } catch (e: any) {
            console.error("Erro dados selects:", e);
            addToast('Erro ao carregar opções', 'error');
        } finally {
            setLoadingOptions(false);
        }
    }, [userRole, selectedFilterCelulaId, selectedReportType, addToast]);

    useEffect(() => {
        if (userRole !== null) {
            loadAllDataAndAdjustFilter();
        }
    }, [userRole, selectedFilterCelulaId, selectedReportType, loadAllDataAndAdjustFilter]);


    const generateReportData = async (type: ReportTypeEnum, params: any) => {
        switch (type) {
            case 'presenca_reuniao': return fetchReportDataPresencaReuniao(params.reuniaoId, params.celulaId);
            case 'presenca_membro': return fetchReportDataPresencaMembro(params.membroId, params.celulaId);
            case 'faltosos': return fetchReportDataFaltososPeriodo(params.startDate, params.endDate, params.celulaId);
            case 'visitantes_periodo': return fetchReportDataVisitantesPeriodo(params.startDate, params.endDate, params.celulaId);
            case 'aniversariantes_mes': return fetchReportDataAniversariantes(params.month, params.celulaId);
            case 'alocacao_lideres': return fetchReportDataAlocacaoLideres();
            case 'chaves_ativacao': return fetchReportDataChavesAtivacao();
            default: return null;
        }
    };

    const handleGenerateReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReportType) {
            addToast("Selecione um tipo de relatório.", 'warning');
            return;
        }

        setLoadingReport(true);
        setReportDisplayData(null);

        try {
            let reportTitle = "";
            let celulaNameForTitle: string | null = null;

            let celulaFilterParam: string | null = null;
            if (userRole === 'admin') {
                celulaFilterParam = selectedFilterCelulaId === "" ? null : selectedFilterCelulaId;
            } else if (userRole === 'líder' && celulasFilterOptions.length === 1) {
                celulaFilterParam = celulasFilterOptions[0].id;
            }
            
            if (selectedReportType === 'alocacao_lideres' || selectedReportType === 'chaves_ativacao') {
                celulaFilterParam = null;
            }

            if (celulaFilterParam) {
                celulaNameForTitle = celulasFilterOptions.find(c => c.id === celulaFilterParam)?.nome || null;
            }

            const params = {
                reuniaoId: selectedReuniaoId,
                membroId: selectedMembroId,
                startDate: startDate,
                endDate: endDate,
                month: parseInt(selectedBirthdayMonth),
                celulaId: celulaFilterParam
            };

            const result = await generateReportData(selectedReportType, params);

            if (!result) {
                addToast("Nenhum dado encontrado.", 'info');
                setLoadingReport(false);
                return;
            }

            // Construção do título
            const today = formatDateForDisplay(new Date().toISOString().split('T')[0]);
            switch (selectedReportType) {
                case 'presenca_reuniao': reportTitle = `Presença - ${formatDateForDisplay((result as ReportDataPresencaReuniao).reuniao_detalhes.data_reuniao)}`; break;
                case 'presenca_membro': reportTitle = `Histórico - ${(result as ReportDataPresencaMembro).membro_data.nome}`; break;
                case 'faltosos': reportTitle = `Faltosos (${formatDateForDisplay(startDate)} a ${formatDateForDisplay(endDate)})`; break;
                case 'visitantes_periodo': reportTitle = `Visitantes (${formatDateForDisplay(startDate)} a ${formatDateForDisplay(endDate)})`; break;
                case 'aniversariantes_mes': reportTitle = `Aniversariantes de ${months.find(m => m.value === selectedBirthdayMonth)?.label}`; break;
                case 'alocacao_lideres': reportTitle = `Alocação de Líderes (${today})`; break;
                case 'chaves_ativacao': reportTitle = `Chaves de Ativação (${today})`; break;
            }
            if(celulaNameForTitle) reportTitle += ` - ${celulaNameForTitle}`;

            const filename = reportTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase() + ".pdf";

            setReportDisplayData({
                type: selectedReportType,
                title: reportTitle,
                content: result,
                filename: filename,
            });
            addToast("Relatório gerado!", 'success');

        } catch (e: any) {
            console.error("Erro gerar relatório:", e);
            addToast('Erro ao gerar relatório', 'error');
        } finally {
            setLoadingReport(false);
        }
    };

    const handleExportPdf = async () => {
        if (!reportDisplayData) return;
        setExportingPdf(true);
        try {
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportDisplayData),
            });

            if (!response.ok) throw new Error('Falha na API de PDF');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = reportDisplayData.filename || 'relatorio.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            addToast("PDF baixado!", 'success');
        } catch (err: any) {
            console.error("Erro PDF:", err);
            addToast('Erro ao exportar PDF', 'error');
        } finally {
            setExportingPdf(false);
        }
    };

    const handleExportCsv = async () => {
        if (!reportDisplayData) return;
        setExportingCsv(true);
        try {
            let csvData = "";
            let filename = (reportDisplayData.filename?.replace('.pdf', '.csv') || 'relatorio.csv');

            let celulaParam: string | null = null;
            if (userRole === 'admin') celulaParam = selectedFilterCelulaId === "" ? null : selectedFilterCelulaId;
            else if (userRole === 'líder' && celulasFilterOptions.length === 1) celulaParam = celulasFilterOptions[0].id;
            
            if (['alocacao_lideres', 'chaves_ativacao'].includes(reportDisplayData.type)) celulaParam = null;

            switch (reportDisplayData.type) {
                case 'presenca_reuniao': csvData = await exportReportDataPresencaReuniaoCSV(selectedReuniaoId, celulaParam); break;
                case 'presenca_membro': csvData = await exportReportDataPresencaMembroCSV(selectedMembroId, celulaParam); break;
                case 'faltosos': csvData = await exportReportDataFaltososPeriodoCSV(startDate, endDate, celulaParam); break;
                case 'visitantes_periodo': csvData = await exportReportDataVisitantesPeriodoCSV(startDate, endDate, celulaParam); break;
                case 'aniversariantes_mes': csvData = await exportReportDataAniversariantesCSV(parseInt(selectedBirthdayMonth), celulaParam); break;
                case 'alocacao_lideres': csvData = await exportReportDataAlocacaoLideresCSV(); break;
                case 'chaves_ativacao': csvData = await exportReportDataChavesAtivacaoCSV(); break;
                default: throw new Error("Tipo não suportado");
            }

            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast("CSV baixado!", 'success');
        } catch (err: any) {
            console.error("Erro CSV:", err);
            addToast('Erro ao exportar CSV', 'error');
        } finally {
            setExportingCsv(false);
        }
    };

    if (userRole === null || loadingOptions) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner />
                <p className="sr-only">Carregando...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <ToastContainer />
            
            {/* Header Responsivo */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 shadow-lg px-4 py-6 sm:px-8 pb-12">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                            <FaFileAlt /> Relatórios
                        </h1>
                        <p className="text-emerald-100 text-sm mt-1">Gerencie e exporte dados da célula</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-bold uppercase">
                        {userRole === 'admin' ? 'Administrador' : 'Líder'}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-6">
                
                {/* Painel de Filtros e Geração */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 sm:p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-100">
                        <FaFilter className="text-emerald-600" /> Configurar Relatório
                    </h2>
                    
                    <form onSubmit={handleGenerateReport} className="space-y-5">
                        
                        {/* Filtro de Célula (Admin) */}
                        {userRole !== null && (userRole === 'admin' || (userRole === 'líder' && celulasFilterOptions.length === 1)) && (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Filtrar por Célula</label>
                                <select
                                    value={selectedFilterCelulaId}
                                    onChange={(e) => setSelectedFilterCelulaId(e.target.value)}
                                    className="w-full text-base border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 transition-all bg-white"
                                    disabled={loadingReport || ['alocacao_lideres', 'chaves_ativacao'].includes(selectedReportType || '') || userRole === 'líder'}
                                >
                                    {userRole === 'admin' && <option value="">Todas as Células</option>}
                                    {celulasFilterOptions.map((celula) => (<option key={celula.id} value={celula.id}>{celula.nome}</option>))}
                                </select>
                                {['alocacao_lideres', 'chaves_ativacao'].includes(selectedReportType || '') && (
                                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1"><FaUsers /> Relatório global.</p>
                                )}
                            </div>
                        )}

                        {/* Tipo de Relatório */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Relatório</label>
                            <select 
                                value={selectedReportType || ''} 
                                onChange={(e) => { 
                                    setSelectedReportType(e.target.value as ReportTypeEnum); 
                                    setSelectedReuniaoId(''); 
                                    setSelectedMembroId(''); 
                                    setStartDate(new Date().toISOString().split('T')[0]); 
                                    setEndDate(new Date().toISOString().split('T')[0]); 
                                    setSelectedBirthdayMonth(''); 
                                }} 
                                className="w-full text-base border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 bg-white" 
                                required
                            >
                                <option value="">-- Selecione --</option>
                                <option value="presenca_reuniao">Presença por Reunião</option>
                                <option value="presenca_membro">Histórico de Membro</option>
                                <option value="faltosos">Membros Faltosos</option>
                                <option value="visitantes_periodo">Visitantes no Período</option>
                                <option value="aniversariantes_mes">Aniversariantes</option>
                                {userRole === 'admin' && (<><option value="alocacao_lideres">Alocação de Líderes</option><option value="chaves_ativacao">Chaves de Ativação</option></>)}
                            </select>
                        </div>

                        {/* Campos Dinâmicos Baseados no Tipo */}
                        {selectedReportType === 'presenca_reuniao' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Reunião</label>
                                <select value={selectedReuniaoId} onChange={(e) => setSelectedReuniaoId(e.target.value)} className="w-full text-base border-gray-300 rounded-lg p-3 bg-white" required>
                                    <option value="">-- Selecione --</option>
                                    {reunioesOptions.map((r) => (<option key={r.id} value={r.id}>{formatDateForDisplay(r.data_reuniao)} - {r.tema}</option>))}
                                </select>
                            </div>
                        )}

                        {selectedReportType === 'presenca_membro' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Membro</label>
                                <select value={selectedMembroId} onChange={(e) => setSelectedMembroId(e.target.value)} className="w-full text-base border-gray-300 rounded-lg p-3 bg-white" required>
                                    <option value="">-- Selecione --</option>
                                    {membrosOptions.map((m) => (<option key={m.id} value={m.id}>{m.nome}</option>))}
                                </select>
                            </div>
                        )}

                        {['faltosos', 'visitantes_periodo'].includes(selectedReportType || '') && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Início</label>
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full text-base border-gray-300 rounded-lg p-3 bg-white" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Fim</label>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full text-base border-gray-300 rounded-lg p-3 bg-white" required />
                                </div>
                            </div>
                        )}

                        {selectedReportType === 'aniversariantes_mes' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Mês</label>
                                <select value={selectedBirthdayMonth} onChange={(e) => setSelectedBirthdayMonth(e.target.value)} className="w-full text-base border-gray-300 rounded-lg p-3 bg-white" required>
                                    <option value="">-- Selecione --</option>
                                    {months.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
                                </select>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loadingReport || !selectedReportType} 
                            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-[0.98] disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2 text-lg"
                        >
                            {loadingReport ? <LoadingSpinner size="sm" /> : <FaSearch />}
                            Gerar Relatório
                        </button>
                    </form>
                </div>

                {/* Área de Resultados */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 sm:p-6 min-h-[200px]">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-100">
                        <FaChartBar className="text-blue-600" /> Resultados
                    </h2>

                    {loadingReport ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <LoadingSpinner />
                            <p className="mt-4 animate-pulse">Processando dados...</p>
                        </div>
                    ) : reportDisplayData ? (
                        <div className="animate-in fade-in slide-in-from-bottom duration-300">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
                                <h3 className="font-bold text-blue-900 text-lg">{reportDisplayData.title}</h3>
                            </div>

                            <div className="overflow-x-auto mb-8">
                                {reportDisplayData.type === 'presenca_reuniao' && <ReportPresencaReuniaoDisplay data={reportDisplayData.content as ReportDataPresencaReuniao} />}
                                {reportDisplayData.type === 'presenca_membro' && <ReportPresencaMembroDisplay data={reportDisplayData.content as ReportDataPresencaMembro} />}
                                {reportDisplayData.type === 'faltosos' && <ReportFaltososPeriodoDisplay data={reportDisplayData.content as ReportDataFaltososPeriodo} />}
                                {reportDisplayData.type === 'visitantes_periodo' && <ReportVisitantesPeriodoDisplay data={reportDisplayData.content as ReportDataVisitantesPeriodo} />}
                                {reportDisplayData.type === 'aniversariantes_mes' && <ReportAniversariantesDisplay data={reportDisplayData.content as ReportDataAniversariantes} />}
                                {reportDisplayData.type === 'alocacao_lideres' && <ReportAlocacaoLideresDisplay data={reportDisplayData.content as ReportDataAlocacaoLideres} />}
                                {reportDisplayData.type === 'chaves_ativacao' && <ReportChavesAtivacaoDisplay data={reportDisplayData.content as ReportDataChavesAtivacao} />}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={handleExportPdf} 
                                    disabled={exportingPdf} 
                                    className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-3 px-4 rounded-xl font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                    {exportingPdf ? <LoadingSpinner size="sm" /> : <FaFilePdf />} PDF
                                </button>
                                <button 
                                    onClick={handleExportCsv} 
                                    disabled={exportingCsv} 
                                    className="flex items-center justify-center gap-2 bg-green-50 text-green-600 border border-green-200 py-3 px-4 rounded-xl font-bold hover:bg-green-100 transition-colors disabled:opacity-50"
                                >
                                    {exportingCsv ? <LoadingSpinner size="sm" /> : <FaFileCsv />} CSV
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <FaFileAlt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Preencha os filtros acima para gerar um relatório.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}