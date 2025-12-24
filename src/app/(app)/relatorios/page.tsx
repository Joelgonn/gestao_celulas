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


import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters';

import { ReportPresencaReuniaoDisplay } from '@/components/relatorios/ReportPresencaReuniaoDisplay';
import { ReportPresencaMembroDisplay } from '@/components/relatorios/ReportPresencaMembroDisplay';
import { ReportFaltososPeriodoDisplay } from '@/components/relatorios/ReportFaltososPeriodoDisplay';
import { ReportVisitantesPeriodoDisplay } from '@/components/relatorios/ReportVisitantesPeriodoDisplay';
import { ReportAniversariantesDisplay } from '@/components/relatorios/ReportAniversariantesDisplay';
import { ReportAlocacaoLideresDisplay } from '@/components/relatorios/ReportAlocacaoLideresDisplay';
import { ReportChavesAtivacaoDisplay } from '@/components/relatorios/ReportChavesAtivacaoDisplay';

import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

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

    const { addToast, removeToast, ToastContainer } = useToast();

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString(),
        label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }),
    }));

    useEffect(() => {
        async function fetchUserRoleOnMount() {
            setLoadingOptions(true);
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                let fetchedRole: 'admin' | 'líder' | null = null;
                if (user && !userError) {
                    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                    if (!profileError && profile) {
                        fetchedRole = profile.role as 'admin' | 'líder';
                    }
                }
                setUserRole(fetchedRole);
            } catch (e: any) {
                console.error("Erro inicial ao buscar usuário/perfil:", e);
                addToast('Erro inicial: ' + (e.message || 'Erro desconhecido.'), 'error');
            }
        }
        fetchUserRoleOnMount();
    }, []);

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
                addToast("Filtro de célula ajustado.", 'info');
                return;
            }

            let reportTypeNeedsReset = false;
            if (userRole !== 'admin' && (selectedReportType === 'alocacao_lideres' || selectedReportType === 'chaves_ativacao')) {
                reportTypeNeedsReset = true;
            }

            if (reportTypeNeedsReset) {
                setSelectedReportType(null);
                setReportDisplayData(null);
                addToast("Tipo de relatório resetado devido à permissão.", 'warning');
                return;
            }

            let celulaIdToPassForMembrosAndReunioes: string | null = null;
            if (userRole === 'admin') {
                celulaIdToPassForMembrosAndReunioes = effectiveFilterCelulaId === "" ? null : effectiveFilterCelulaId;
            } else if (userRole === 'líder' && currentFetchedCelulasData.length === 1) {
                celulaIdToPassForMembrosAndReunioes = currentFetchedCelulasData[0].id;
            }

            const finalCelulaIdForMembrosAndReunioes =
                (selectedReportType === 'alocacao_lideres' || selectedReportType === 'chaves_ativacao')
                    ? null
                    : celulaIdToPassForMembrosAndReunioes;

            const [membrosData, reunioesData] = await Promise.all([
                listMembros(finalCelulaIdForMembrosAndReunioes),
                listReunioes(finalCelulaIdForMembrosAndReunioes)
            ]);

            setMembrosOptions(membrosData);
            setReunioesOptions(reunioesData);
            addToast('Dados e opções carregados com sucesso!', 'success');

        } catch (e: any) {
            console.error("Erro ao carregar dados para os selects:", e);
            addToast('Erro ao carregar opções para relatórios: ' + (e.message || 'Erro desconhecido.'), 'error');
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
            addToast("Por favor, selecione um tipo de relatório.", 'warning');
            return;
        }

        setLoadingReport(true);
        setReportDisplayData(null);

        try {
            let reportTitle = "";
            let celulaNameForTitle: string | null = null;

            let celulaFilterParamForReport: string | null = null;
            if (userRole === 'admin') {
                celulaFilterParamForReport = selectedFilterCelulaId === "" ? null : selectedFilterCelulaId;
            } else if (userRole === 'líder' && celulasFilterOptions.length === 1) {
                celulaFilterParamForReport = celulasFilterOptions[0].id;
            }
            if (selectedReportType === 'alocacao_lideres' || selectedReportType === 'chaves_ativacao') {
                celulaFilterParamForReport = null;
            }

            if (celulaFilterParamForReport) {
                celulaNameForTitle = celulasFilterOptions.find(c => c.id === celulaFilterParamForReport)?.nome || null;
            }

            const anoAtual = new Date().getFullYear();

            const params = {
                reuniaoId: selectedReuniaoId,
                membroId: selectedMembroId,
                startDate: startDate,
                endDate: endDate,
                month: parseInt(selectedBirthdayMonth),
                celulaId: celulaFilterParamForReport
            };

            const result = await generateReportData(selectedReportType, params);

            if (!result) {
                addToast("Nenhum dado encontrado para este relatório com os parâmetros selecionados.", 'info');
                setReportDisplayData(null);
                return;
            }

            switch (selectedReportType) {
                case 'presenca_reuniao': reportTitle = "Relatório de Presença - Reunião em " + formatDateForDisplay((result as ReportDataPresencaReuniao).reuniao_detalhes.data_reuniao); break;
                case 'presenca_membro': reportTitle = "Histórico de Presença - " + (result as ReportDataPresencaMembro).membro_data.nome; break;
                case 'faltosos': reportTitle = "Membros Faltosos entre " + formatDateForDisplay(startDate) + " e " + formatDateForDisplay(endDate); break;
                case 'visitantes_periodo': reportTitle = "Visitantes entre " + formatDateForDisplay(startDate) + " e " + formatDateForDisplay(endDate); break;
                case 'aniversariantes_mes': reportTitle = "Aniversariantes de " + months.find(m => m.value === selectedBirthdayMonth)?.label + " de " + anoAtual; break;
                case 'alocacao_lideres': reportTitle = "Relatório de Alocação de Líderes (" + formatDateForDisplay(new Date().toISOString().split('T')[0]) + ")"; break;
                case 'chaves_ativacao': reportTitle = "Relatório de Chaves de Ativação (" + formatDateForDisplay(new Date().toISOString().split('T')[0]) + ")"; break;
            }
            if(celulaNameForTitle) reportTitle += " (" + celulaNameForTitle + ")";

            const baseFilename = reportTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase();
            const filenamePdf = baseFilename + ".pdf";

            setReportDisplayData({
                type: selectedReportType,
                title: reportTitle,
                content: result,
                filename: filenamePdf,
            });
            addToast("Relatório gerado com sucesso!", 'success');

        } catch (e: any) {
            console.error("Erro ao gerar relatório:", e);
            addToast('Erro ao gerar relatório: ' + (e.message || 'Erro desconhecido.'), 'error');
        } finally {
            setLoadingReport(false);
        }
    };

    const handleExportPdf = async () => {
        if (!reportDisplayData) {
            addToast("Gere um relatório primeiro para exportar para PDF!", 'warning');
            return;
        }

        setExportingPdf(true);

        try {
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportDisplayData),
            });

            if (!response.ok) {
                const errorJson = await response.json();
                throw new Error(errorJson.error || 'Erro ' + response.status + ': Falha na API de PDF.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = reportDisplayData.filename || 'relatorio.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            addToast("PDF gerado e download iniciado!", 'success');

        } catch (err: any) {
            console.error("Erro ao exportar PDF:", err);
            addToast('Erro ao exportar PDF: ' + (err.message || "Erro desconhecido."), 'error');
        } finally {
            setExportingPdf(false);
        }
    };

    const handleExportCsv = async () => {
        if (!reportDisplayData) {
            addToast("Gere um relatório primeiro para exportar para CSV!", 'warning');
            return;
        }

        setExportingCsv(true);

        try {
            let csvData = "";
            let filename = (reportDisplayData.filename?.replace('.pdf', '.csv') || 'relatorio.csv');

            let celulaFilterParamForExport: string | null = null;
            if (userRole === 'admin') {
                celulaFilterParamForExport = selectedFilterCelulaId === "" ? null : selectedFilterCelulaId;
            } else if (userRole === 'líder' && celulasFilterOptions.length === 1) {
                celulaFilterParamForExport = celulasFilterOptions[0].id;
            }
            if (reportDisplayData.type === 'alocacao_lideres' || reportDisplayData.type === 'chaves_ativacao') {
                celulaFilterParamForExport = null;
            }

            switch (reportDisplayData.type) {
                case 'presenca_reuniao': csvData = await exportReportDataPresencaReuniaoCSV(selectedReuniaoId, celulaFilterParamForExport); break;
                case 'presenca_membro': csvData = await exportReportDataPresencaMembroCSV(selectedMembroId, celulaFilterParamForExport); break;
                case 'faltosos': csvData = await exportReportDataFaltososPeriodoCSV(startDate, endDate, celulaFilterParamForExport); break;
                case 'visitantes_periodo': csvData = await exportReportDataVisitantesPeriodoCSV(startDate, endDate, celulaFilterParamForExport); break;
                case 'aniversariantes_mes': csvData = await exportReportDataAniversariantesCSV(parseInt(selectedBirthdayMonth), celulaFilterParamForExport); break;
                case 'alocacao_lideres': csvData = await exportReportDataAlocacaoLideresCSV(); break;
                case 'chaves_ativacao': csvData = await exportReportDataChavesAtivacaoCSV(); break;
                default: throw new Error("Tipo de relatório não suportado para exportação CSV.");
            }

            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert("Seu navegador não suporta download automático de arquivos. Por favor, copie o conteúdo CSV manualmente.");
                console.log(csvData);
            }
            addToast("CSV gerado e download iniciado!", 'success');

        } catch (err: any) {
            console.error("Erro ao exportar CSV:", err);
            addToast('Erro ao exportar CSV: ' + (err.message || "Erro desconhecido."), 'error');
        } finally {
            setExportingCsv(false);
        }
    };

    if (userRole === null) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div><div className="space-y-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div></div></div>
                        <LoadingSpinner />
                        <p className="mt-4 text-gray-600 text-center">Carregando informações do usuário...</p>
                    </div>
                </div>
            </div>
        );
    }
    
    if (loadingOptions) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div><div className="space-y-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div></div></div>
                        <LoadingSpinner />
                        <p className="mt-4 text-gray-600 text-center">Carregando opções de relatórios...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
            {/* MUDANÇA AQUI: Renderiza o ToastContainer do hook */}
            <ToastContainer />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"> {/* Ajuste de padding para telas menores */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-xl p-6 sm:p-8 mb-8 text-white"> {/* Padding ajustado */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Módulo de Relatórios</h1> {/* Fonte ajustada */}
                            <div className="flex items-center space-x-4 text-green-100 text-sm"> {/* Fonte ajustada */}
                                <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                    <span>Gerencie e exporte</span>
                                </div>
                            </div>
                        </div>
                        {userRole === 'admin' && (<div className="bg-green-400 text-green-900 px-3 py-1.5 rounded-full font-semibold text-sm">Administrador</div>)} {/* Padding e fonte ajustados */}
                        {userRole === 'líder' && (<div className="bg-blue-400 text-blue-900 px-3 py-1.5 rounded-full font-semibold text-sm">Líder</div>)} {/* Padding e fonte ajustados */}
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-8"> {/* Padding ajustado */}
                    <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center"><svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>Gerar Novo Relatório</h2> {/* Ícone ajustado */}
                    <form onSubmit={handleGenerateReport} className="space-y-6">
                        {/* Condicional para exibir o filtro de célula */}
                        {userRole !== null && (userRole === 'admin' || (userRole === 'líder' && celulasFilterOptions.length === 1)) && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <label htmlFor="filterCelula" className="block text-sm font-medium text-gray-700 mb-2 flex items-center"><svg className="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>Filtrar por Célula</label>
                                <select
                                    id="filterCelula"
                                    value={selectedFilterCelulaId}
                                    onChange={(e) => setSelectedFilterCelulaId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-sm" // Padding e fonte ajustados
                                    disabled={loadingOptions || loadingReport || selectedReportType === 'alocacao_lideres' || selectedReportType === 'chaves_ativacao' || userRole === 'líder'} // Desabilita se for líder
                                >
                                    {userRole === 'admin' && (<option value="">Todas as Células</option>)} {/* Apenas admin vê "Todas" */}
                                    {celulasFilterOptions.map((celula) => (<option key={celula.id} value={celula.id}>{celula.nome}</option>))}
                                </select>
                                {(selectedReportType === 'alocacao_lideres' || selectedReportType === 'chaves_ativacao') && (
                                    <p className="mt-2 text-xs sm:text-sm text-gray-500 flex items-center"> {/* Fonte ajustada */}
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>Este relatório é global e não pode ser filtrado por célula.
                                    </p>
                                )}
                                {userRole === 'líder' && celulasFilterOptions.length === 1 && (
                                    <p className="mt-2 text-xs sm:text-sm text-gray-500 flex items-center"> {/* Fonte ajustada */}
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>Você está visualizando os relatórios da sua célula: {celulasFilterOptions[0].nome}.
                                    </p>
                                )}
                            </div>
                        )}
                        {/* Se o líder não tem célula associada, pode mostrar uma mensagem ou desabilitar tudo */}
                        {userRole === 'líder' && celulasFilterOptions.length === 0 && !loadingOptions && (
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-4" role="alert">
                                <p className="font-bold text-sm">Atenção:</p> {/* Fonte ajustada */}
                                <p className="text-sm">Seu perfil de líder não está associado a nenhuma célula. Por favor, entre em contato com um administrador para resolver isso.</p>
                            </div>
                        )}
                        <div>
                            <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-2 flex items-center"><svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>Tipo de Relatório</label>
                            <select id="reportType" value={selectedReportType || ''} onChange={(e) => { setSelectedReportType(e.target.value as ReportTypeEnum); setSelectedReuniaoId(''); setSelectedMembroId(''); setStartDate(new Date().toISOString().split('T')[0]); setEndDate(new Date().toISOString().split('T')[0]); setSelectedBirthdayMonth(''); }} className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-sm" required disabled={loadingOptions || loadingReport || (userRole === 'líder' && celulasFilterOptions.length === 0)}>
                                <option value="">-- Selecione o Tipo de Relatório --</option>
                                <option value="presenca_reuniao">Presença por Reunião</option>
                                <option value="presenca_membro">Histórico de Presença de Membro</option>
                                <option value="faltosos">Membros Faltosos por Período</option>
                                <option value="visitantes_periodo">Visitantes por Período</option>
                                <option value="aniversariantes_mes">Aniversariantes por Mês</option>
                                {userRole === 'admin' && (<><option value="alocacao_lideres">Alocação de Líderes</option><option value="chaves_ativacao">Chaves de Ativação</option></>)}
                            </select>
                        </div>
                        {selectedReportType === 'presenca_reuniao' && (
                            <div>
                                <label htmlFor="reuniaoSelect" className="block text-sm font-medium text-gray-700 mb-2 flex items-center"><svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>Selecione a Reunião</label>
                                <select id="reuniaoSelect" value={selectedReuniaoId} onChange={(e) => setSelectedReuniaoId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm" required disabled={loadingOptions || loadingReport}>
                                    <option value="">-- Selecione uma Reunião --</option>
                                    {reunioesOptions.map((reuniao) => (<option key={reuniao.id} value={reuniao.id}>{formatDateForDisplay(reuniao.data_reuniao)} - {reuniao.tema} ({reuniao.ministrador_principal_nome || 'N/A'})</option>))}
                                </select>
                            </div>
                        )}
                        {selectedReportType === 'presenca_membro' && (
                            <div>
                                <label htmlFor="membroSelect" className="block text-sm font-medium text-gray-700 mb-2 flex items-center"><svg className="w-4 h-4 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>Selecione o Membro</label>
                                <select id="membroSelect" value={selectedMembroId} onChange={(e) => setSelectedMembroId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-sm" required disabled={loadingOptions || loadingReport}>
                                    <option value="">-- Selecione um Membro --</option>
                                    {membrosOptions.map((membro) => (<option key={membro.id} value={membro.id}>{membro.nome}</option>))}
                                </select>
                            </div>
                        )}
                        {(selectedReportType === 'faltosos' || selectedReportType === 'visitantes_periodo') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-x-4 sm:gap-y-4"> {/* Ajuste de espaçamento responsivo */}
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2 flex items-center"><svg className="w-4 h-4 mr-2 text-orange-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>Data Inicial</label>
                                    <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm" required disabled={loadingOptions || loadingReport} /> {/* Padding e fonte ajustados */}
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2 flex items-center"><svg className="w-4 h-4 mr-2 text-orange-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>Data Final</label>
                                    <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm" required disabled={loadingOptions || loadingReport} /> {/* Padding e fonte ajustados */}
                                </div>
                            </div>
                        )}
                        {selectedReportType === 'aniversariantes_mes' && (
                            <div>
                                <label htmlFor="birthdayMonth" className="block text-sm font-medium text-gray-700 mb-2 flex items-center"><svg className="w-4 h-4 mr-2 text-pink-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>Selecione o Mês</label>
                                <select id="birthdayMonth" value={selectedBirthdayMonth} onChange={(e) => setSelectedBirthdayMonth(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 text-sm" required disabled={loadingOptions || loadingReport}> {/* Padding e fonte ajustados */}
                                    <option value="">-- Selecione um Mês --</option>
                                    {months.map(month => (<option key={month.value} value={month.value}>{month.label}</option>))}
                                </select>
                            </div>
                        )}
                        <button type="submit" disabled={loadingReport || loadingOptions || !selectedReportType || (selectedReportType === 'presenca_reuniao' && !selectedReuniaoId) || (selectedReportType === 'presenca_membro' && !selectedMembroId) || ((selectedReportType === 'faltosos' || selectedReportType === 'visitantes_periodo') && (!startDate || !endDate)) || (selectedReportType === 'aniversariantes_mes' && !selectedBirthdayMonth) || (userRole === 'líder' && celulasFilterOptions.length === 0)} className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-5 sm:py-4 sm:px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center text-base"> {/* Padding e fonte ajustados */}
                            {loadingReport ? (<div className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-3"></div>Gerando Relatório...</div>) : (<div className="flex items-center"><svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>Gerar Relatório</div>)}
                        </button>
                    </form>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6"> {/* Padding ajustado */}
                    <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center"><svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>Resultados do Relatório</h2> {/* Ícone ajustado */}
                    {loadingReport ? (<div className="text-center p-8"><LoadingSpinner /><p className="mt-4 text-gray-600">Carregando resultados do relatório...</p></div>) : (<>{reportDisplayData ? (<><div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 sm:p-6 mb-6"><h3 className="text-xl sm:text-2xl font-bold text-blue-800 text-center">{reportDisplayData.title}</h3></div><div className="mb-6">{reportDisplayData.type === 'presenca_reuniao' && (<ReportPresencaReuniaoDisplay data={reportDisplayData.content as ReportDataPresencaReuniao} />)}{reportDisplayData.type === 'presenca_membro' && (<ReportPresencaMembroDisplay data={reportDisplayData.content as ReportDataPresencaMembro} />)}{reportDisplayData.type === 'faltosos' && (<ReportFaltososPeriodoDisplay data={reportDisplayData.content as ReportDataFaltososPeriodo} />)}{reportDisplayData.type === 'visitantes_periodo' && (<ReportVisitantesPeriodoDisplay data={reportDisplayData.content as ReportDataVisitantesPeriodo} />)}{reportDisplayData.type === 'aniversariantes_mes' && (<ReportAniversariantesDisplay data={reportDisplayData.content as ReportDataAniversariantes} />)}{reportDisplayData.type === 'alocacao_lideres' && (<ReportAlocacaoLideresDisplay data={reportDisplayData.content as ReportDataAlocacaoLideres} />)}{reportDisplayData.type === 'chaves_ativacao' && (<ReportChavesAtivacaoDisplay data={reportDisplayData.content as ReportDataChavesAtivacao} />)}</div><div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6"> {/* Layout responsivo para botões */}
                        <button onClick={handleExportPdf} disabled={exportingPdf} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-5 sm:py-3.5 sm:px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center text-sm"> {/* Padding e fonte ajustados */}
                            {exportingPdf ? (<div className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-3"></div>Exportando PDF...</div>) : (<div className="flex items-center"><svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>Exportar para PDF</div>)}</button>
                        <button onClick={handleExportCsv} disabled={exportingCsv} className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-5 sm:py-3.5 sm:px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center text-sm"> {/* Padding e fonte ajustados */}
                            {exportingCsv ? (<div className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-3"></div>Exportando CSV...</div>) : (<div className="flex items-center"><svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>Exportar para CSV</div>)}</button></div></>) : (<div className="text-center py-10 sm:py-12 text-gray-500"><svg className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg><p className="text-base sm:text-lg">Nenhum relatório gerado ainda.</p><p className="text-sm">Use o formulário acima para gerar um relatório.</p></div>)}</>)}
                </div>
            </div>
            <style jsx>{` @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .animate-slide-in { animation: slide-in 0.3s ease-out; } `}</style>
        </div>
    );
}