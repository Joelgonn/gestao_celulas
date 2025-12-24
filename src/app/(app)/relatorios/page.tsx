// src/app/(app)/relatorios/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    FaChartBar,
    FaChevronDown,
    FaTimes,
    FaCheckCircle
} from 'react-icons/fa';

// --- COMPONENTE CUSTOMIZADO DE SELEÇÃO (BOTTOM SHEET) ---
interface CustomSelectSheetProps {
    label: string;
    value: string | null;
    onChange: (value: string) => void;
    options: { id: string; nome: string }[];
    icon: React.ReactNode;
    placeholder?: string;
    searchable?: boolean;
    disabled?: boolean;
}

const CustomSelectSheet = ({ 
    label, 
    value, 
    onChange, 
    options, 
    icon, 
    placeholder = "Selecione...",
    searchable = false,
    disabled = false
}: CustomSelectSheetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    const selectedName = options.find(o => o.id === value)?.nome || null;

    const filteredOptions = options.filter(option => 
        option.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`space-y-1 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                {icon} {label}
            </label>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(true)}
                disabled={disabled}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg flex items-center justify-between focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow outline-none text-left"
            >
                <span className={`text-base truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>
                    {selectedName || placeholder}
                </span>
                <FaChevronDown className="text-gray-400 text-xs ml-2" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
                    <div 
                        ref={modalRef}
                        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] animate-in slide-in-from-bottom duration-300"
                    >
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-800 text-lg">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-colors">
                                <FaTimes />
                            </button>
                        </div>

                        {searchable && (
                            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar..." 
                                        autoFocus
                                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-base"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => {
                                    const isSelected = value === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => handleSelect(option.id)}
                                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            <span className="text-base truncate pr-2">{option.nome}</span>
                                            {isSelected && <FaCheckCircle className="text-emerald-500 text-lg flex-shrink-0" />}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhum item encontrado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
// --- FIM COMPONENTE CUSTOMIZADO ---


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

    // Mapeamento dos meses para o CustomSelectSheet
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        id: (i + 1).toString(),
        nome: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase()),
    }));

    // Mapeamento dos tipos de relatório para o CustomSelectSheet
    const getReportTypeOptions = () => {
        const options = [
            { id: 'presenca_reuniao', nome: 'Presença por Reunião' },
            { id: 'presenca_membro', nome: 'Histórico de Membro' },
            { id: 'faltosos', nome: 'Membros Faltosos' },
            { id: 'visitantes_periodo', nome: 'Visitantes no Período' },
            { id: 'aniversariantes_mes', nome: 'Aniversariantes' },
        ];
        if (userRole === 'admin') {
            options.push({ id: 'alocacao_lideres', nome: 'Alocação de Líderes' });
            options.push({ id: 'chaves_ativacao', nome: 'Chaves de Ativação' });
        }
        return options;
    };

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

            const today = formatDateForDisplay(new Date().toISOString().split('T')[0]);
            switch (selectedReportType) {
                case 'presenca_reuniao': reportTitle = `Presença - ${formatDateForDisplay((result as ReportDataPresencaReuniao).reuniao_detalhes.data_reuniao)}`; break;
                case 'presenca_membro': reportTitle = `Histórico - ${(result as ReportDataPresencaMembro).membro_data.nome}`; break;
                case 'faltosos': reportTitle = `Faltosos (${formatDateForDisplay(startDate)} a ${formatDateForDisplay(endDate)})`; break;
                case 'visitantes_periodo': reportTitle = `Visitantes (${formatDateForDisplay(startDate)} a ${formatDateForDisplay(endDate)})`; break;
                case 'aniversariantes_mes': reportTitle = `Aniversariantes de ${monthOptions.find(m => m.id === selectedBirthdayMonth)?.nome}`; break;
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
                        
                        {/* Filtro de Célula (Admin) - Usando CustomSelectSheet */}
                        {userRole !== null && (userRole === 'admin' || (userRole === 'líder' && celulasFilterOptions.length === 1)) && (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <CustomSelectSheet
                                    label="Filtrar por Célula"
                                    icon={<FaFilter className="text-gray-500" />}
                                    value={selectedFilterCelulaId}
                                    onChange={(val) => setSelectedFilterCelulaId(val)}
                                    options={userRole === 'admin' ? [{ id: '', nome: 'Todas as Células' }, ...celulasFilterOptions] : celulasFilterOptions}
                                    disabled={loadingReport || ['alocacao_lideres', 'chaves_ativacao'].includes(selectedReportType || '') || userRole === 'líder'}
                                    searchable={userRole === 'admin'}
                                />
                                
                                {['alocacao_lideres', 'chaves_ativacao'].includes(selectedReportType || '') && (
                                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1"><FaUsers /> Relatório global.</p>
                                )}
                            </div>
                        )}

                        {/* Tipo de Relatório - Usando CustomSelectSheet */}
                        <CustomSelectSheet
                            label="Tipo de Relatório"
                            icon={<FaFileAlt className="text-green-600" />}
                            value={selectedReportType || ''}
                            onChange={(val) => {
                                setSelectedReportType(val as ReportTypeEnum);
                                setSelectedReuniaoId('');
                                setSelectedMembroId('');
                                setStartDate(new Date().toISOString().split('T')[0]);
                                setEndDate(new Date().toISOString().split('T')[0]);
                                setSelectedBirthdayMonth('');
                            }}
                            options={getReportTypeOptions()}
                            placeholder="Selecione o tipo..."
                        />

                        {/* Campos Dinâmicos - Usando CustomSelectSheet onde aplicável */}
                        {selectedReportType === 'presenca_reuniao' && (
                            <CustomSelectSheet
                                label="Reunião"
                                icon={<FaCalendarAlt className="text-blue-600" />}
                                value={selectedReuniaoId}
                                onChange={(val) => setSelectedReuniaoId(val)}
                                options={reunioesOptions.map(r => ({ id: r.id, nome: `${formatDateForDisplay(r.data_reuniao)} - ${r.tema}` }))}
                                placeholder="Selecione a reunião"
                                searchable
                            />
                        )}

                        {selectedReportType === 'presenca_membro' && (
                            <CustomSelectSheet
                                label="Membro"
                                icon={<FaUser className="text-purple-600" />}
                                value={selectedMembroId}
                                onChange={(val) => setSelectedMembroId(val)}
                                options={membrosOptions}
                                placeholder="Selecione o membro"
                                searchable
                            />
                        )}

                        {['faltosos', 'visitantes_periodo'].includes(selectedReportType || '') && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaCalendarAlt className="text-orange-600" /> Início
                                    </label>
                                    <input 
                                        type="date" 
                                        value={startDate} 
                                        onChange={(e) => setStartDate(e.target.value)} 
                                        className="w-full text-base border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaCalendarAlt className="text-orange-600" /> Fim
                                    </label>
                                    <input 
                                        type="date" 
                                        value={endDate} 
                                        onChange={(e) => setEndDate(e.target.value)} 
                                        className="w-full text-base border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" 
                                        required 
                                    />
                                </div>
                            </div>
                        )}

                        {selectedReportType === 'aniversariantes_mes' && (
                            <CustomSelectSheet
                                label="Mês"
                                icon={<FaBirthdayCake className="text-pink-600" />}
                                value={selectedBirthdayMonth}
                                onChange={(val) => setSelectedBirthdayMonth(val)}
                                options={monthOptions}
                                placeholder="Selecione o mês"
                            />
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