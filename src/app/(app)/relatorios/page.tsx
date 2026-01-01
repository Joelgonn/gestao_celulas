'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';

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
    FaCheckCircle,
    FaArrowLeft,
    FaInfoCircle,
    FaSpinner // Adicionado aqui para corrigir o erro de build
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
    label, value, onChange, options, icon, 
    placeholder = "Selecione...", searchable = false, disabled = false 
}: CustomSelectSheetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const selectedName = options.find(o => o.id === value)?.nome || null;
    const filteredOptions = options.filter(o => o.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className={`space-y-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
                {label}
            </label>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(true)}
                disabled={disabled}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none text-left group"
            >
                <div className="flex items-center gap-3 truncate">
                    <span className="text-gray-400 group-hover:text-emerald-600 transition-colors">{icon}</span>
                    <span className={`text-sm font-bold truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>
                        {selectedName || placeholder}
                    </span>
                </div>
                <FaChevronDown className="text-gray-300 text-xs ml-2 shrink-0" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4">
                    <div ref={modalRef} className="w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-[2rem]">
                            <h3 className="font-black text-gray-800 text-lg uppercase tracking-tighter">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-3 bg-gray-200 text-gray-600 rounded-2xl hover:bg-gray-300 transition-all active:scale-90"><FaTimes /></button>
                        </div>
                        {searchable && (
                            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div className="relative">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" placeholder="Buscar..." autoFocus className="w-full pl-11 pr-4 py-4 bg-gray-100 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="overflow-y-auto p-4 space-y-2 flex-1 pb-10 sm:pb-4">
                            {filteredOptions.length > 0 ? (filteredOptions.map((option) => (
                                <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }}
                                    className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-all ${value === option.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    <span className="text-sm font-bold truncate pr-4">{option.nome}</span>
                                    {value === option.id && <FaCheckCircle className="text-white shrink-0" />}
                                </button>
                            ))) : <div className="text-center py-12 text-gray-400 font-bold italic">Nenhum item encontrado.</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- TIPAGEM ---
type ReportTypeEnum = 'presenca_reuniao' | 'presenca_membro' | 'faltosos' | 'visitantes_periodo' | 'aniversariantes_mes' | 'alocacao_lideres' | 'chaves_ativacao';
type UnifiedReportData = { type: ReportTypeEnum; title: string; content: any; filename?: string; };

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

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        id: (i + 1).toString(),
        nome: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase()),
    }));

    const getReportTypeOptions = () => {
        const base = [
            { id: 'presenca_reuniao', nome: 'Presença por Reunião' },
            { id: 'presenca_membro', nome: 'Histórico de Membro' },
            { id: 'faltosos', nome: 'Membros Faltosos' },
            { id: 'visitantes_periodo', nome: 'Visitantes no Período' },
            { id: 'aniversariantes_mes', nome: 'Aniversariantes' },
        ];
        if (userRole === 'admin') {
            base.push({ id: 'alocacao_lideres', nome: 'Alocação de Líderes' });
            base.push({ id: 'chaves_ativacao', nome: 'Chaves de Ativação' });
        }
        return base;
    };

    useEffect(() => {
        async function fetchUserRoleOnMount() {
            setLoadingOptions(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                    if (profile) setUserRole(profile.role as 'admin' | 'líder');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingOptions(false);
            }
        }
        fetchUserRoleOnMount();
    }, []);

    const loadOptions = useCallback(async () => {
        if (userRole === null) return;
        setLoadingOptions(true);
        try {
            const celData = userRole === 'admin' ? await listarCelulasParaAdmin() : await listarCelulasParaLider();
            setCelulasFilterOptions(celData);
            
            const celId = selectedFilterCelulaId || (userRole === 'líder' && celData[0] ? celData[0].id : null);
            const isGlobal = ['alocacao_lideres', 'chaves_ativacao'].includes(selectedReportType || '');
            const finalCelId = isGlobal ? null : celId;

            const [m, r] = await Promise.all([listMembros(finalCelId), listReunioes(finalCelId)]);
            setMembrosOptions(m);
            setReunioesOptions(r);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingOptions(false);
        }
    }, [userRole, selectedFilterCelulaId, selectedReportType]);

    useEffect(() => { loadOptions(); }, [loadOptions]);

    const handleGenerateReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReportType) return addToast("Selecione o tipo.", 'warning');
        setLoadingReport(true);
        setReportDisplayData(null);

        try {
            const celId = selectedFilterCelulaId || (userRole === 'líder' && celulasFilterOptions[0] ? celulasFilterOptions[0].id : null);
            const params = {
                reuniaoId: selectedReuniaoId, membroId: selectedMembroId,
                startDate, endDate, month: parseInt(selectedBirthdayMonth),
                celulaId: ['alocacao_lideres', 'chaves_ativacao'].includes(selectedReportType) ? null : celId
            };

            let result: any;
            switch (selectedReportType) {
                case 'presenca_reuniao': result = await fetchReportDataPresencaReuniao(params.reuniaoId, params.celulaId); break;
                case 'presenca_membro': result = await fetchReportDataPresencaMembro(params.membroId, params.celulaId); break;
                case 'faltosos': result = await fetchReportDataFaltososPeriodo(params.startDate, params.endDate, params.celulaId); break;
                case 'visitantes_periodo': result = await fetchReportDataVisitantesPeriodo(params.startDate, params.endDate, params.celulaId); break;
                case 'aniversariantes_mes': result = await fetchReportDataAniversariantes(params.month, params.celulaId); break;
                case 'alocacao_lideres': result = await fetchReportDataAlocacaoLideres(); break;
                case 'chaves_ativacao': result = await fetchReportDataChavesAtivacao(); break;
            }

            if (!result) throw new Error("Nenhum dado encontrado.");

            let title = "";
            switch (selectedReportType) {
                case 'presenca_reuniao': title = `Presença - ${formatDateForDisplay(result.reuniao_detalhes.data_reuniao)}`; break;
                case 'presenca_membro': title = `Histórico - ${result.membro_data.nome}`; break;
                case 'faltosos': title = `Membros Faltosos`; break;
                case 'visitantes_periodo': title = `Relatório de Visitantes`; break;
                case 'aniversariantes_mes': title = `Aniversariantes - ${monthOptions.find(m => m.id === selectedBirthdayMonth)?.nome}`; break;
                case 'alocacao_lideres': title = `Alocação de Líderes`; break;
                case 'chaves_ativacao': title = `Status Chaves de Ativação`; break;
            }

            setReportDisplayData({ type: selectedReportType, title, content: result, filename: `${selectedReportType}_${Date.now()}.pdf` });
            addToast("Relatório gerado!", 'success');
        } catch (e: any) {
            addToast(e.message, 'error');
        } finally {
            setLoadingReport(false);
        }
    };

    const handleExportPdf = async () => {
        if (!reportDisplayData) return;
        setExportingPdf(true);
        try {
            const res = await fetch('/api/generate-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reportDisplayData) });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = reportDisplayData.filename || 'relatorio.pdf'; a.click();
            addToast("PDF Baixado!", 'success');
        } catch (e) { addToast('Erro no PDF', 'error'); } finally { setExportingPdf(false); }
    };

    const handleExportCsv = async () => {
        if (!reportDisplayData) return;
        setExportingCsv(true);
        try {
            let csv = "";
            const celId = selectedFilterCelulaId || null;
            switch (reportDisplayData.type) {
                case 'presenca_reuniao': csv = await exportReportDataPresencaReuniaoCSV(selectedReuniaoId, celId); break;
                case 'presenca_membro': csv = await exportReportDataPresencaMembroCSV(selectedMembroId, celId); break;
                case 'faltosos': csv = await exportReportDataFaltososPeriodoCSV(startDate, endDate, celId); break;
                case 'visitantes_periodo': csv = await exportReportDataVisitantesPeriodoCSV(startDate, endDate, celId); break;
                case 'aniversariantes_mes': csv = await exportReportDataAniversariantesCSV(parseInt(selectedBirthdayMonth), celId); break;
                case 'alocacao_lideres': csv = await exportReportDataAlocacaoLideresCSV(); break;
                case 'chaves_ativacao': csv = await exportReportDataChavesAtivacaoCSV(); break;
            }
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'relatorio.csv'; a.click();
            addToast("CSV Baixado!", 'success');
        } catch (e) { addToast('Erro no CSV', 'error'); } finally { setExportingCsv(false); }
    };

    if (loadingOptions && !celulasFilterOptions.length) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />
            
            {/* Header Emerald */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 shadow-lg px-4 pt-8 pb-20 sm:px-8 border-b border-green-500/20 shadow-lg">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10 text-white">
                            <FaFileAlt size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Central de Relatórios</h1>
                            <p className="text-emerald-100 text-sm font-bold opacity-80 uppercase tracking-widest">Análise de dados e exportação</p>
                        </div>
                    </div>
                    <Link href="/dashboard" className="bg-white/10 hover:bg-white/20 text-white p-3.5 rounded-2xl transition-all backdrop-blur-md border border-white/10">
                        <FaArrowLeft />
                    </Link>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-10 space-y-8">
                
                {/* Configuração do Relatório */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8">
                    <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><FaFilter size={16}/></div>
                        Configurar Relatório
                    </h2>
                    
                    <form onSubmit={handleGenerateReport} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* Filtro Célula */}
                            <CustomSelectSheet
                                label="Célula"
                                icon={<FaUsers />}
                                value={selectedFilterCelulaId}
                                onChange={setSelectedFilterCelulaId}
                                options={userRole === 'admin' ? [{ id: '', nome: 'Todas as Células' }, ...celulasFilterOptions] : celulasFilterOptions}
                                disabled={['alocacao_lideres', 'chaves_ativacao'].includes(selectedReportType || '')}
                                searchable
                            />

                            {/* Tipo de Relatório */}
                            <CustomSelectSheet
                                label="Tipo de Relatório"
                                icon={<FaChartBar />}
                                value={selectedReportType}
                                onChange={(val) => setSelectedReportType(val as any)}
                                options={getReportTypeOptions()}
                            />

                            {/* Campos Dinâmicos */}
                            {selectedReportType === 'presenca_reuniao' && (
                                <CustomSelectSheet label="Reunião" icon={<FaCalendarAlt />} value={selectedReuniaoId} onChange={setSelectedReuniaoId} searchable options={reunioesOptions.map(r => ({ id: r.id, nome: `${formatDateForDisplay(r.data_reuniao)} - ${r.tema}` }))} />
                            )}
                            {selectedReportType === 'presenca_membro' && (
                                <CustomSelectSheet label="Membro" icon={<FaUser />} value={selectedMembroId} onChange={setSelectedMembroId} searchable options={membrosOptions} />
                            )}
                            {['faltosos', 'visitantes_periodo'].includes(selectedReportType || '') && (
                                <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data Inicial</label>
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold text-gray-700" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data Final</label>
                                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold text-gray-700" />
                                    </div>
                                </div>
                            )}
                            {selectedReportType === 'aniversariantes_mes' && (
                                <CustomSelectSheet label="Mês" icon={<FaBirthdayCake />} value={selectedBirthdayMonth} onChange={setSelectedBirthdayMonth} options={monthOptions} />
                            )}
                        </div>

                        <button type="submit" disabled={loadingReport || !selectedReportType} className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-tighter cursor-pointer">
                            {loadingReport ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                            Gerar Relatório Agora
                        </button>
                    </form>
                </div>

                {/* Resultados */}
                <div className={`bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 min-h-[300px] flex flex-col ${reportDisplayData ? 'border-t-8 border-indigo-500' : ''}`}>
                    <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><FaChartBar size={16}/></div>
                        Visualização dos Dados
                    </h2>

                    {loadingReport ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 animate-pulse">
                            <LoadingSpinner />
                            <p className="mt-4 font-bold">Processando informações...</p>
                        </div>
                    ) : reportDisplayData ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                                <p className="text-center text-indigo-800 font-black text-sm uppercase tracking-widest">{reportDisplayData.title}</p>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                {reportDisplayData.type === 'presenca_reuniao' && <ReportPresencaReuniaoDisplay data={reportDisplayData.content as ReportDataPresencaReuniao} />}
                                {reportDisplayData.type === 'presenca_membro' && <ReportPresencaMembroDisplay data={reportDisplayData.content as ReportDataPresencaMembro} />}
                                {reportDisplayData.type === 'faltosos' && <ReportFaltososPeriodoDisplay data={reportDisplayData.content as ReportDataFaltososPeriodo} />}
                                {reportDisplayData.type === 'visitantes_periodo' && <ReportVisitantesPeriodoDisplay data={reportDisplayData.content as ReportDataVisitantesPeriodo} />}
                                {reportDisplayData.type === 'aniversariantes_mes' && <ReportAniversariantesDisplay data={reportDisplayData.content as ReportDataAniversariantes} />}
                                {reportDisplayData.type === 'alocacao_lideres' && <ReportAlocacaoLideresDisplay data={reportDisplayData.content as ReportDataAlocacaoLideres} />}
                                {reportDisplayData.type === 'chaves_ativacao' && <ReportChavesAtivacaoDisplay data={reportDisplayData.content as ReportDataChavesAtivacao} />}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button onClick={handleExportPdf} disabled={exportingPdf} className="flex items-center justify-center gap-3 bg-red-50 text-red-600 border border-red-200 py-4 rounded-2xl font-black hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
                                    {exportingPdf ? <FaSpinner className="animate-spin" /> : <FaFilePdf size={20}/>} EXPORTAR PDF
                                </button>
                                <button onClick={handleExportCsv} disabled={exportingCsv} className="flex items-center justify-center gap-3 bg-emerald-50 text-emerald-600 border border-emerald-100 py-4 rounded-2xl font-black hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
                                    {exportingCsv ? <FaSpinner className="animate-spin" /> : <FaFileCsv size={20}/>} EXPORTAR EXCEL (CSV)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 py-12">
                            <FaFileAlt size={64} className="opacity-10 mb-4" />
                            <p className="font-bold text-sm uppercase tracking-tighter">Nenhum dado para exibir no momento</p>
                            <p className="text-xs">Configure os filtros acima e clique em "Gerar Relatório".</p>
                        </div>
                    )}
                </div>

                <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 flex gap-4">
                    <FaInfoCircle className="text-blue-500 shrink-0 mt-1" />
                    <div className="text-xs text-blue-700 leading-relaxed">
                        <p className="font-bold uppercase mb-1">Dica de Exportação</p>
                        Utilize o formato <strong>CSV</strong> caso precise abrir os dados no Excel ou Google Sheets para cálculos adicionais. O formato <strong>PDF</strong> é ideal para impressão ou compartilhamento rápido via WhatsApp.
                    </div>
                </div>
            </div>
        </div>
    );
}