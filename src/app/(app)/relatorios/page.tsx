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
    MembroOption,
    ReuniaoOption,
    ReportDataPresencaReuniao,
    ReportDataPresencaMembro,
    ReportDataFaltososPeriodo,
    ReportDataVisitantesPeriodo,
    ReportDataAniversariantes,
    ReportDataAlocacaoLideres,
    ReportDataChavesAtivacao,

    // Importar funções de exportação CSV
    exportReportDataPresencaReuniaoCSV,
    exportReportDataPresencaMembroCSV,
    exportReportDataFaltososPeriodoCSV,
    exportReportDataVisitantesPeriodoCSV,
    exportReportDataAniversariantesCSV,
    exportReportDataAlocacaoLideresCSV,
    exportReportDataChavesAtivacaoCSV,
} from '@/lib/reports_data'; 

import { listarCelulasParaAdmin, CelulaOption } from '@/lib/data';
import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters';

import { ReportPresencaReuniaoDisplay } from '@/components/relatorios/ReportPresencaReuniaoDisplay';
import { ReportPresencaMembroDisplay } from '@/components/relatorios/ReportPresencaMembroDisplay';
import { ReportFaltososPeriodoDisplay } from '@/components/relatorios/ReportFaltososPeriodoDisplay';
import { ReportVisitantesPeriodoDisplay } from '@/components/relatorios/ReportVisitantesPeriodoDisplay';
import { ReportAniversariantesDisplay } from '@/components/relatorios/ReportAniversariantesDisplay';
import { ReportAlocacaoLideresDisplay } from '@/components/relatorios/ReportAlocacaoLideresDisplay';
import { ReportChavesAtivacaoDisplay } from '@/components/relatorios/ReportChavesAtivacaoDisplay';

// Componente Toast moderno
interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 5000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    const getStyles = () => {
        const base = "flex items-center p-4 mb-2 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out animate-slide-in";
        switch (type) {
            case 'success':
                return `${base} bg-green-50 border border-green-200 text-green-800`;
            case 'error':
                return `${base} bg-red-50 border border-red-200 text-red-800`;
            case 'warning':
                return `${base} bg-yellow-50 border border-yellow-200 text-yellow-800`;
            case 'info':
                return `${base} bg-blue-50 border border-blue-200 text-blue-800`;
        }
    };

    return (
        <div className={getStyles()}>
            <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${type === 'success' ? 'bg-green-100 text-green-500' : type === 'error' ? 'bg-red-100 text-red-500' : type === 'warning' ? 'bg-yellow-100 text-yellow-500' : 'bg-blue-100 text-blue-500'}`}>
                {getIcon()}
            </div>
            <div className="ml-3 text-sm font-medium">{message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex h-8 w-8 hover:bg-gray-100 transition-colors duration-200"
                onClick={onClose}
            >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
};

// Hook para gerenciar toasts
const useToast = () => {
    const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

    const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return { toasts, addToast, removeToast };
};

// Componente de Loading com spinner animado
const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
);

// ============================================================================
//                                DEFINIÇÕES DE TIPOS LOCAIS
// ============================================================================

type UnifiedReportData = {
    type: ReportTypeEnum;
    title: string;
    content: ReportDataPresencaReuniao | ReportDataPresencaMembro | ReportDataFaltososPeriodo | ReportDataVisitantesPeriodo | ReportDataAniversariantes | ReportDataAlocacaoLideres | ReportDataChavesAtivacao;
    filename?: string; 
};

type ReportTypeEnum = 'presenca_reuniao' | 'presenca_membro' | 'faltosos' | 'visitantes_periodo' | 'aniversariantes_mes' | 'alocacao_lideres' | 'chaves_ativacao';

// ============================================================================
//                                COMPONENTE PRINCIPAL
// ============================================================================

export default function RelatoriosPage() {
    const [selectedReportType, setSelectedReportType] = useState<ReportTypeEnum | null>(null);
    const [reunioesOptions, setReunioesOptions] = useState<ReuniaoOption[]>([]);
    const [membrosOptions, setMembrosOptions] = useState<MembroOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(true); 
    
    // Parâmetros do formulário de relatório
    const [selectedReuniaoId, setSelectedReuniaoId] = useState<string>('');
    const [selectedMembroId, setSelectedMembroId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedBirthdayMonth, setSelectedBirthdayMonth] = useState<string>('');

    // Novos estados para o filtro de célula do admin
    const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);
    const [celulasFilterOptions, setCelulasFilterOptions] = useState<CelulaOption[]>([]);
    const [selectedFilterCelulaId, setSelectedFilterCelulaId] = useState<string>('');

    // Estados para o feedback e resultados
    const [reportDisplayData, setReportDisplayData] = useState<UnifiedReportData | null>(null); 
    const [loadingReport, setLoadingReport] = useState(false); 
    const [exportingPdf, setExportingPdf] = useState(false);   
    const [exportingCsv, setExportingCsv] = useState(false);   

    // Usar o hook de toast
    const { toasts, addToast, removeToast } = useToast();

    // Array de meses para o dropdown de aniversariantes
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString(),
        label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }),
    }));

    // useCallback para a função de carregamento de dados
    const loadDataAndOptions = useCallback(async (currentRole: 'admin' | 'líder' | null, currentFilterCelulaId: string | null) => {
        setLoadingOptions(true);
        try {
            // Carrega opções de célula se for admin
            if (currentRole === 'admin') {
                const celulasData = await listarCelulasParaAdmin();
                setCelulasFilterOptions(celulasData);
            } else {
                setCelulasFilterOptions([]);
                // Se o usuário não é admin, garante que o filtro de célula esteja limpo
                if (selectedFilterCelulaId !== '') setSelectedFilterCelulaId('');
            }
            
            // Carrega membros e reuniões com base na role e filtro de célula
            const membersAndReunionsCelulaId = (selectedReportType === 'alocacao_lideres' || selectedReportType === 'chaves_ativacao') ? null : currentFilterCelulaId;

            const [membrosData, reunioesData] = await Promise.all([
                listMembros(membersAndReunionsCelulaId),
                listReunioes(membersAndReunionsCelulaId)
            ]);

            setMembrosOptions(membrosData);
            setReunioesOptions(reunioesData);

            addToast('Dados carregados com sucesso!', 'success');

        } catch (e: any) {
            console.error("Erro ao carregar dados para os selects:", e);
            addToast(`Erro ao carregar opções para relatórios: ${e.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setLoadingOptions(false);
        }
    }, [selectedFilterCelulaId, selectedReportType, addToast]);

    // useEffect para carregar userRole e então chamar loadDataAndOptions
    useEffect(() => {
        async function fetchUserAndInitialData() {
            setLoadingOptions(true);
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                let fetchedRole: 'admin' | 'líder' | null = null;
                if (user && !userError) {
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    if (!profileError && profile) {
                        fetchedRole = profile.role as 'admin' | 'líder';
                    }
                }
                setUserRole(fetchedRole);
                loadDataAndOptions(fetchedRole, selectedFilterCelulaId === "" ? null : selectedFilterCelulaId);

            } catch (e: any) {
                console.error("Erro inicial ao buscar usuário/perfil:", e);
                addToast(`Erro inicial: ${e.message || 'Erro desconhecido.'}`, 'error');
                setLoadingOptions(false);
            }
        }
        fetchUserAndInitialData();
    }, [loadDataAndOptions, selectedFilterCelulaId, addToast]);

    // useEffect para resetar selectedReportType quando a role ou o filtro de célula mudar
    useEffect(() => {
        const currentReportType = selectedReportType;
        let shouldReset = false;

        if (userRole !== 'admin' && (currentReportType === 'alocacao_lideres' || currentReportType === 'chaves_ativacao')) {
            shouldReset = true;
        }

        if (shouldReset) {
            setSelectedReportType(null);
            setReportDisplayData(null);
            addToast("Tipo de relatório resetado devido à mudança de permissão ou filtro de célula incompatível.", 'warning');
        }
        
        loadDataAndOptions(userRole, selectedFilterCelulaId === "" ? null : selectedFilterCelulaId);

    }, [userRole, selectedFilterCelulaId, selectedReportType, loadDataAndOptions, addToast]);

    // Lógica para gerar o relatório na tela
    const handleGenerateReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReportType) {
            addToast("Por favor, selecione um tipo de relatório.", 'warning');
            return;
        }

        setLoadingReport(true);
        setReportDisplayData(null); 

        try {
            let result: UnifiedReportData['content'] | null = null;
            let reportTitle = "";
            let celulaNameForTitle: string | null = null;

            if (selectedFilterCelulaId) {
                celulaNameForTitle = celulasFilterOptions.find(c => c.id === selectedFilterCelulaId)?.nome || null;
            }

            // Para relatórios globais de admin, o filtro de célula deve ser null
            const celulaFilterParam = (selectedReportType === 'alocacao_lideres' || selectedReportType === 'chaves_ativacao') 
                                        ? null 
                                        : (selectedFilterCelulaId === "" ? null : selectedFilterCelulaId);
            const anoAtual = new Date().getFullYear();

            switch (selectedReportType) {
                case 'presenca_reuniao':
                    if (!selectedReuniaoId) throw new Error("Selecione uma reunião para o relatório de presença.");
                    result = await fetchReportDataPresencaReuniao(selectedReuniaoId, celulaFilterParam);
                    if (result) {
                        const cellName = result.reuniao_detalhes.celula_nome || celulaNameForTitle;
                        reportTitle = `Relatório de Presença - Reunião em ${formatDateForDisplay(result.reuniao_detalhes.data_reuniao)}${cellName ? ` (${cellName})` : ''}`;
                    }
                    break;
                case 'presenca_membro':
                    if (!selectedMembroId) throw new Error("Selecione um membro para o relatório de presença.");
                    result = await fetchReportDataPresencaMembro(selectedMembroId, celulaFilterParam);
                    if (result && result.membro_data) {
                        const cellName = (result.membro_data as any).celula_nome || celulaNameForTitle;
                        reportTitle = `Histórico de Presença do Membro - ${result.membro_data.nome}${cellName ? ` (${cellName})` : ''}`;
                    }
                    break;
                case 'faltosos':
                    if (!startDate || !endDate) throw new Error("Selecione um período para o relatório de faltosos.");
                    result = await fetchReportDataFaltososPeriodo(startDate, endDate, celulaFilterParam);
                    if (result) {
                        reportTitle = `Membros Faltosos entre ${formatDateForDisplay(startDate)} e ${formatDateForDisplay(endDate)}${celulaNameForTitle ? ` da Célula ${celulaNameForTitle}` : ''}`;
                    }
                    break;
                case 'visitantes_periodo':
                    if (!startDate || !endDate) throw new Error("Selecione um período para o relatório de visitantes.");
                    result = await fetchReportDataVisitantesPeriodo(startDate, endDate, celulaFilterParam);
                    if (result) {
                        reportTitle = `Visitantes entre ${formatDateForDisplay(startDate)} e ${formatDateForDisplay(endDate)}${celulaNameForTitle ? ` da Célula ${celulaNameForTitle}` : ''}`;
                    }
                    break;
                case 'aniversariantes_mes':
                    if (!selectedBirthdayMonth) throw new Error("Selecione o mês para o relatório de aniversariantes.");
                    const mesNum = parseInt(selectedBirthdayMonth);
                    result = await fetchReportDataAniversariantes(mesNum, celulaFilterParam);
                    if (result) {
                        const mesNome = months.find(m => m.value === selectedBirthdayMonth)?.label;
                        reportTitle = `Aniversariantes de ${mesNome} de ${anoAtual}${celulaNameForTitle ? ` da Célula ${celulaNameForTitle}` : ''}`;
                    }
                    break;
                case 'alocacao_lideres':
                    if (userRole !== 'admin') throw new Error("Apenas administradores podem gerar o relatório de Alocação de Líderes.");
                    result = await fetchReportDataAlocacaoLideres();
                    if (result) {
                        reportTitle = `Relatório de Alocação de Líderes (${formatDateForDisplay(new Date().toISOString().split('T')[0])})`;
                    }
                    break;
                case 'chaves_ativacao':
                    if (userRole !== 'admin') throw new Error("Apenas administradores podem gerar o relatório de Chaves de Ativação.");
                    result = await fetchReportDataChavesAtivacao();
                    if (result) {
                        reportTitle = `Relatório de Chaves de Ativação (${formatDateForDisplay(new Date().toISOString().split('T')[0])})`;
                    }
                    break;
                default:
                    throw new Error("Tipo de relatório inválido.");
            }
            
            const hasData = (result && (
                ((selectedReportType === 'presenca_reuniao' || selectedReportType === 'presenca_membro') && result) ||
                ((selectedReportType === 'faltosos') && (result as ReportDataFaltososPeriodo).faltosos && (result as ReportDataFaltososPeriodo).faltosos.length > 0) ||
                ((selectedReportType === 'visitantes_periodo') && (result as ReportDataVisitantesPeriodo).visitantes && (result as ReportDataVisitantesPeriodo).visitantes.length > 0) ||
                ((selectedReportType === 'aniversariantes_mes') && ((result as ReportDataAniversariantes).membros.length > 0 || (result as ReportDataAniversariantes).visitantes.length > 0)) ||
                ((selectedReportType === 'alocacao_lideres') && ((result as ReportDataAlocacaoLideres).lideres_alocados.length > 0 || (result as ReportDataAlocacaoLideres).lideres_nao_alocados.length > 0 || (result as ReportDataAlocacaoLideres).celulas_sem_lider_atribuido.length > 0)) ||
                ((selectedReportType === 'chaves_ativacao') && ((result as ReportDataChavesAtivacao).chaves_ativas.length > 0 || (result as ReportDataChavesAtivacao).chaves_usadas.length > 0))
            ));

            if (hasData) {
                const baseFilename = reportTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase();
                const filenamePdf = `${baseFilename}.pdf`;

                setReportDisplayData({
                    type: selectedReportType,
                    title: reportTitle,
                    content: result,
                    filename: filenamePdf,
                });
                addToast("Relatório gerado com sucesso!", 'success');
            } else {
                addToast("Nenhum dado encontrado para este relatório com os parâmetros selecionados.", 'info');
                setReportDisplayData(null); 
            }

        } catch (e: any) {
            console.error("Erro ao gerar relatório:", e);
            addToast(`Erro ao gerar relatório: ${e.message || 'Erro desconhecido.'}`, 'error');
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
            // --- INÍCIO DA REFATORAÇÃO ---
            // A chamada agora vai para a rota de API do Next.js
            const response = await fetch('/api/generate-pdf', { 
            // --- FIM DA REFATORAÇÃO ---
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportDisplayData), 
            });

            if (!response.ok) {
                const errorJson = await response.json();
                throw new Error(errorJson.error || `Erro ${response.status}: Falha na API de PDF.`);
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
            addToast(`Erro ao exportar PDF: ${err.message || "Erro desconhecido."}`, 'error');
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

            // Para relatórios globais de admin, o filtro de célula deve ser null
            const celulaFilterParam = (reportDisplayData.type === 'alocacao_lideres' || reportDisplayData.type === 'chaves_ativacao')
                                        ? null
                                        : (selectedFilterCelulaId === "" ? null : selectedFilterCelulaId);

            switch (reportDisplayData.type) {
                case 'presenca_reuniao':
                    csvData = await exportReportDataPresencaReuniaoCSV(selectedReuniaoId, celulaFilterParam);
                    break;
                case 'presenca_membro':
                    csvData = await exportReportDataPresencaMembroCSV(selectedMembroId, celulaFilterParam);
                    break;
                case 'faltosos':
                    csvData = await exportReportDataFaltososPeriodoCSV(startDate, endDate, celulaFilterParam);
                    break;
                case 'visitantes_periodo':
                    csvData = await exportReportDataVisitantesPeriodoCSV(startDate, endDate, celulaFilterParam);
                    break;
                case 'aniversariantes_mes':
                    csvData = await exportReportDataAniversariantesCSV(parseInt(selectedBirthdayMonth), celulaFilterParam);
                    break;
                case 'alocacao_lideres':
                    csvData = await exportReportDataAlocacaoLideresCSV();
                    break;
                case 'chaves_ativacao':
                    csvData = await exportReportDataChavesAtivacaoCSV();
                    break;
                default:
                    throw new Error("Tipo de relatório não suportado para exportação CSV.");
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
            addToast(`Erro ao exportar CSV: ${err.message || "Erro desconhecido."}`, 'error');
        } finally {
            setExportingCsv(false);
        }
    };

    if (loadingOptions) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                            <div className="space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                        <LoadingSpinner />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
            {/* Container de Toasts */}
            <div className="fixed top-4 right-4 z-50 w-80 space-y-2">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>

            <div className="max-w-6xl mx-auto px-4">
                {/* Header com Gradiente */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Módulo de Relatórios</h1>
                            <div className="flex items-center space-x-4 text-green-100">
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>Gerencie e exporte relatórios do sistema</span>
                                </div>
                            </div>
                        </div>
                        {userRole === 'admin' && (
                            <div className="bg-green-400 text-green-900 px-4 py-2 rounded-full font-semibold">
                                Administrador
                            </div>
                        )}
                    </div>
                </div>

                {/* Formulário de Seleção de Relatório */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        Gerar Novo Relatório
                    </h2>
                    
                    <form onSubmit={handleGenerateReport} className="space-y-6">
                        {userRole === 'admin' && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <label htmlFor="filterCelula" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                    </svg>
                                    Filtrar por Célula
                                </label>
                                <select
                                    id="filterCelula"
                                    value={selectedFilterCelulaId}
                                    onChange={(e) => setSelectedFilterCelulaId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                    disabled={loadingOptions || loadingReport || selectedReportType === 'alocacao_lideres' || selectedReportType === 'chaves_ativacao'}
                                >
                                    <option value="">Todas as Células</option>
                                    {celulasFilterOptions.map((celula) => (
                                        <option key={celula.id} value={celula.id}>
                                            {celula.nome}
                                        </option>
                                    ))}
                                </select>
                                {(selectedReportType === 'alocacao_lideres' || selectedReportType === 'chaves_ativacao') && (
                                    <p className="mt-2 text-sm text-gray-500 flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        Este relatório é global e não pode ser filtrado por célula.
                                    </p>
                                )}
                            </div>
                        )}

                        <div>
                            <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Tipo de Relatório
                            </label>
                            <select
                                id="reportType"
                                value={selectedReportType || ''}
                                onChange={(e) => {
                                    setSelectedReportType(e.target.value as ReportTypeEnum);
                                    setSelectedReuniaoId('');
                                    setSelectedMembroId('');
                                    setStartDate(new Date().toISOString().split('T')[0]);
                                    setEndDate(new Date().toISOString().split('T')[0]);
                                    setSelectedBirthdayMonth('');
                                }}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                required
                                disabled={loadingOptions || loadingReport}
                            >
                                <option value="">-- Selecione o Tipo de Relatório --</option>
                                <option value="presenca_reuniao">Presença por Reunião</option>
                                <option value="presenca_membro">Histórico de Presença de Membro</option>
                                <option value="faltosos">Membros Faltosos por Período</option>
                                <option value="visitantes_periodo">Visitantes por Período</option>
                                <option value="aniversariantes_mes">Aniversariantes por Mês</option>
                                {userRole === 'admin' && (
                                    <>
                                        <option value="alocacao_lideres">Alocação de Líderes</option>
                                        <option value="chaves_ativacao">Chaves de Ativação</option>
                                    </>
                                )}
                            </select>
                        </div>

                        {selectedReportType === 'presenca_reuniao' && (
                            <div>
                                <label htmlFor="reuniaoSelect" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    Selecione a Reunião
                                </label>
                                <select
                                    id="reuniaoSelect"
                                    value={selectedReuniaoId}
                                    onChange={(e) => setSelectedReuniaoId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    required
                                    disabled={loadingOptions || loadingReport}
                                >
                                    <option value="">-- Selecione uma Reunião --</option>
                                    {reunioesOptions.map((reuniao) => (
                                        <option key={reuniao.id} value={reuniao.id}>
                                            {formatDateForDisplay(reuniao.data_reuniao)} - {reuniao.tema} ({reuniao.ministrador_principal_nome || 'N/A'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selectedReportType === 'presenca_membro' && (
                            <div>
                                <label htmlFor="membroSelect" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                    Selecione o Membro
                                </label>
                                <select
                                    id="membroSelect"
                                    value={selectedMembroId}
                                    onChange={(e) => setSelectedMembroId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                    required
                                    disabled={loadingOptions || loadingReport}
                                >
                                    <option value="">-- Selecione um Membro --</option>
                                    {membrosOptions.map((membro) => (
                                        <option key={membro.id} value={membro.id}>
                                            {membro.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {(selectedReportType === 'faltosos' || selectedReportType === 'visitantes_periodo') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                        </svg>
                                        Data Inicial
                                    </label>
                                    <input
                                        type="date"
                                        id="startDate"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                                        required
                                        disabled={loadingOptions || loadingReport}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                        </svg>
                                        Data Final
                                    </label>
                                    <input
                                        type="date"
                                        id="endDate"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                                        required
                                        disabled={loadingOptions || loadingReport}
                                    />
                                </div>
                            </div>
                        )}

                        {selectedReportType === 'aniversariantes_mes' && (
                            <div>
                                <label htmlFor="birthdayMonth" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Selecione o Mês
                                </label>
                                <select
                                    id="birthdayMonth"
                                    value={selectedBirthdayMonth}
                                    onChange={(e) => setSelectedBirthdayMonth(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                                    required
                                    disabled={loadingOptions || loadingReport}
                                >
                                    <option value="">-- Selecione um Mês --</option>
                                    {months.map(month => (
                                        <option key={month.value} value={month.value}>{month.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loadingReport || loadingOptions || !selectedReportType || 
                                      (selectedReportType === 'presenca_reuniao' && !selectedReuniaoId) || 
                                      (selectedReportType === 'presenca_membro' && !selectedMembroId) ||
                                      ((selectedReportType === 'faltosos' || selectedReportType === 'visitantes_periodo') && (!startDate || !endDate)) ||
                                      (selectedReportType === 'aniversariantes_mes' && !selectedBirthdayMonth)
                                    }
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center"
                        >
                            {loadingReport ? (
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                    Gerando Relatório...
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Gerar Relatório
                                </div>
                            )}
                        </button>
                    </form>
                </div>

                {/* Área de Exibição dos Resultados */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Resultados do Relatório
                    </h2>
                    {loadingReport ? (
                        <div className="text-center p-8">
                            <LoadingSpinner />
                            <p className="mt-4 text-gray-600">Carregando resultados do relatório...</p>
                        </div>
                    ) : (
                        <>
                            {reportDisplayData ? (
                                <>
                                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 mb-6">
                                        <h3 className="text-2xl font-bold text-blue-800 text-center">{reportDisplayData.title}</h3>
                                    </div>
                                    <div className="mb-6">
                                        {reportDisplayData.type === 'presenca_reuniao' && (
                                            <ReportPresencaReuniaoDisplay data={reportDisplayData.content as ReportDataPresencaReuniao} />
                                        )}
                                        {reportDisplayData.type === 'presenca_membro' && (
                                            <ReportPresencaMembroDisplay data={reportDisplayData.content as ReportDataPresencaMembro} />
                                        )}
                                        {reportDisplayData.type === 'faltosos' && (
                                            <ReportFaltososPeriodoDisplay data={reportDisplayData.content as ReportDataFaltososPeriodo} />
                                        )}
                                        {reportDisplayData.type === 'visitantes_periodo' && (
                                            <ReportVisitantesPeriodoDisplay data={reportDisplayData.content as ReportDataVisitantesPeriodo} />
                                        )}
                                        {reportDisplayData.type === 'aniversariantes_mes' && (
                                            <ReportAniversariantesDisplay data={reportDisplayData.content as ReportDataAniversariantes} />
                                        )}
                                        {reportDisplayData.type === 'alocacao_lideres' && (
                                            <ReportAlocacaoLideresDisplay data={reportDisplayData.content as ReportDataAlocacaoLideres} />
                                        )}
                                        {reportDisplayData.type === 'chaves_ativacao' && ( 
                                            <ReportChavesAtivacaoDisplay data={reportDisplayData.content as ReportDataChavesAtivacao} />
                                        )}
                                    </div>
                                    <div className="flex space-x-4 mt-6">
                                        <button
                                            onClick={handleExportPdf}
                                            disabled={exportingPdf}
                                            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center"
                                        >
                                            {exportingPdf ? (
                                                <div className="flex items-center">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                                    Exportando PDF...
                                                </div>
                                            ) : (
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                    Exportar para PDF
                                                </div>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleExportCsv}
                                            disabled={exportingCsv}
                                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center"
                                        >
                                            {exportingCsv ? (
                                                <div className="flex items-center">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                                    Exportando CSV...
                                                </div>
                                            ) : (
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                    Exportar para CSV
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-lg">Nenhum relatório gerado ainda.</p>
                                    <p className="text-sm">Use o formulário acima para gerar um relatório.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Estilos de animação */}
            <style jsx>{`
                @keyframes slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}