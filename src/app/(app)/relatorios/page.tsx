'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    FaSpinner
} from 'react-icons/fa';

// --- COMPONENTES VISUAIS AUXILIARES ---

const DateInput = ({ label, value, onChange }: any) => (
    <div className="space-y-1">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
            {label}
        </label>
        <div className="relative group">
            <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
                type="date" 
                value={value} 
                onChange={onChange} 
                className="w-full pl-11 pr-4 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all border-gray-100 focus:border-emerald-500 appearance-none" 
            />
        </div>
    </div>
);

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
        const handleClick = (e: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) setIsOpen(false); };
        if (isOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    return (
        <div className={`space-y-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
                {label}
            </label>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(true)}
                disabled={disabled}
                className="w-full px-4 py-4 border-2 rounded-2xl flex items-center justify-between bg-gray-50 transition-all hover:border-emerald-200 border-gray-100 group focus:border-emerald-500 focus:bg-white"
            >
                <div className="flex items-center gap-3 truncate">
                    <span className="text-gray-400 group-hover:text-emerald-500 transition-colors">{icon}</span>
                    <span className={`text-sm font-bold truncate ${selectedName ? 'text-gray-700' : 'text-gray-400'}`}>
                        {selectedName || placeholder}
                    </span>
                </div>
                <FaChevronDown className="text-gray-300 text-xs ml-2 shrink-0" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
                    <div ref={modalRef} className="w-full sm:max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-black text-gray-800 uppercase tracking-tighter">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-3 bg-gray-200 text-gray-600 rounded-2xl active:scale-90"><FaTimes /></button>
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
                                    className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-all ${value === option.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    <span className="text-sm font-bold truncate">{option.nome}</span>
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
    const resultRef = useRef<HTMLDivElement>(null);

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
            } catch (e) { console.error(e); } finally { setLoadingOptions(false); }
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
        } catch (e) { console.error(e); } finally { setLoadingOptions(false); }
    }, [userRole, selectedFilterCelulaId, selectedReportType]);

    useEffect(() => { loadOptions(); }, [loadOptions]);

    const handleGenerateReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReportType) return addToast("Selecione o tipo de relatório.", 'warning');
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

            if (!result) throw new Error("Nenhum dado encontrado para os filtros selecionados.");

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
            addToast("Relatório gerado com sucesso!", 'success');
            setTimeout(() => { resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);

        } catch (e: any) { addToast(e.message, 'error'); } finally { setLoadingReport(false); }
    };

    // --- LÓGICA DE PDF NO CLIENTE ---
    const handleExportPdf = () => {
        if (!reportDisplayData) return;
        setExportingPdf(true);

        try {
            const doc = new jsPDF();
            const { title, content, type } = reportDisplayData;

            // Cabeçalho Padrão
            doc.setFontSize(16);
            doc.setTextColor(0, 100, 0); // Verde Escuro
            doc.text(title, 14, 20);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 26);

            let yPos = 35; // Posição inicial

            // Lógica específica por tipo de relatório
            if (type === 'presenca_reuniao') {
                const data = content as ReportDataPresencaReuniao;
                
                doc.setFontSize(12); doc.setTextColor(0);
                doc.text(`Tema: ${data.reuniao_detalhes.tema}`, 14, yPos);
                yPos += 10;

                const rows = [
                    ...data.membros_presentes.map(m => [m.nome, 'Membro', 'Presente']),
                    ...data.visitantes_presentes.map(v => [v.nome, 'Visitante', 'Presente']),
                    ...data.membros_ausentes.map(m => [m.nome, 'Membro', 'Ausente'])
                ];

                autoTable(doc, {
                    startY: yPos,
                    head: [['Nome', 'Tipo', 'Status']],
                    body: rows,
                    theme: 'grid',
                    headStyles: { fillColor: [16, 185, 129] } // Emerald 500
                });
            } 
            else if (type === 'presenca_membro') {
                const data = content as ReportDataPresencaMembro;
                
                doc.text(`Membro: ${data.membro_data.nome}`, 14, yPos);
                doc.text(`Telefone: ${formatPhoneNumberDisplay(data.membro_data.telefone)}`, 14, yPos + 6);
                yPos += 15;

                const rows = data.historico_presenca.map(h => [
                    formatDateForDisplay(h.data_reuniao),
                    h.tema,
                    h.presente ? 'Presente' : 'Ausente'
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['Data', 'Reunião', 'Status']],
                    body: rows,
                    theme: 'striped',
                    headStyles: { fillColor: [79, 70, 229] } // Indigo
                });
            }
            else if (type === 'faltosos') {
                const data = content as ReportDataFaltososPeriodo;
                const rows = data.faltosos.map(f => [
                    f.nome, 
                    formatPhoneNumberDisplay(f.telefone), 
                    f.total_presencas,
                    f.total_reunioes_no_periodo,
                    (f.total_reunioes_no_periodo - f.total_presencas)
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['Nome', 'Tel', 'Presenças', 'Total Reuniões', 'Faltas']],
                    body: rows,
                    headStyles: { fillColor: [220, 38, 38] } // Red
                });
            }
            else if (type === 'visitantes_periodo') {
                const data = content as ReportDataVisitantesPeriodo;
                const rows = data.visitantes.map(v => [
                    v.nome,
                    formatPhoneNumberDisplay(v.telefone),
                    formatDateForDisplay(v.data_primeira_visita)
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['Nome', 'Telefone', '1ª Visita']],
                    body: rows,
                    headStyles: { fillColor: [37, 99, 235] } // Blue
                });
            }
            else if (type === 'aniversariantes_mes') {
                const data = content as ReportDataAniversariantes;
                
                // Membros
                doc.text("Membros", 14, yPos);
                autoTable(doc, {
                    startY: yPos + 2,
                    head: [['Nome', 'Data Nasc.', 'Telefone']],
                    body: data.membros.map(m => [m.nome, formatDateForDisplay(m.data_nascimento), formatPhoneNumberDisplay(m.telefone)]),
                    headStyles: { fillColor: [16, 185, 129] }
                });

                // Visitantes
                const finalY = (doc as any).lastAutoTable.finalY + 10;
                doc.text("Visitantes", 14, finalY);
                autoTable(doc, {
                    startY: finalY + 2,
                    head: [['Nome', 'Data Nasc.', 'Telefone']],
                    body: data.visitantes.map(v => [v.nome, formatDateForDisplay(v.data_nascimento), formatPhoneNumberDisplay(v.telefone)]),
                    headStyles: { fillColor: [37, 99, 235] }
                });
            }
            // ... Adicionar lógica para outros tipos se necessário (alocacao, chaves)

            doc.save(reportDisplayData.filename || 'relatorio.pdf');
            addToast("PDF baixado com sucesso!", 'success');

        } catch (e: any) {
            console.error(e);
            addToast("Erro ao gerar PDF: " + e.message, 'error');
        } finally {
            setExportingPdf(false);
        }
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
            
            {/* HERO HEADER */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 pt-8 pb-32 px-4 sm:px-8 shadow-lg">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <Link href="/dashboard" className="bg-white/20 p-3 rounded-2xl text-white hover:bg-white/30 transition-all active:scale-90 backdrop-blur-md border border-white/10">
                            <FaArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3"><FaChartBar /> Relatórios</h1>
                            <p className="text-emerald-100 text-sm font-medium opacity-80 uppercase tracking-widest">Análise de Dados</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-8 -mt-20 space-y-8">
                
                {/* CARD DE CONFIGURAÇÃO (FILTROS) */}
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 sm:p-10">
                        <h2 className="text-lg font-black text-gray-800 mb-8 flex items-center gap-2 border-b border-gray-50 pb-4">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><FaFilter size={16}/></div>
                            Configurar Filtros
                        </h2>
                        
                        <form onSubmit={handleGenerateReport} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* Célula */}
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
                                    icon={<FaFileAlt />}
                                    value={selectedReportType}
                                    onChange={(val) => setSelectedReportType(val as any)}
                                    options={getReportTypeOptions()}
                                />

                                {/* Campos Dinâmicos (Surgem conforme o tipo) */}
                                {selectedReportType === 'presenca_reuniao' && (
                                    <div className="col-span-1 md:col-span-2 animate-in fade-in zoom-in-95">
                                        <CustomSelectSheet label="Selecione a Reunião" icon={<FaCalendarAlt />} value={selectedReuniaoId} onChange={setSelectedReuniaoId} searchable options={reunioesOptions.map(r => ({ id: r.id, nome: `${formatDateForDisplay(r.data_reuniao)} - ${r.tema}` }))} />
                                    </div>
                                )}
                                {selectedReportType === 'presenca_membro' && (
                                    <div className="col-span-1 md:col-span-2 animate-in fade-in zoom-in-95">
                                        <CustomSelectSheet label="Selecione o Membro" icon={<FaUser />} value={selectedMembroId} onChange={setSelectedMembroId} searchable options={membrosOptions} />
                                    </div>
                                )}
                                {['faltosos', 'visitantes_periodo'].includes(selectedReportType || '') && (
                                    <>
                                        <div className="animate-in fade-in zoom-in-95">
                                            <DateInput label="Data Inicial" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} />
                                        </div>
                                        <div className="animate-in fade-in zoom-in-95">
                                            <DateInput label="Data Final" value={endDate} onChange={(e: any) => setEndDate(e.target.value)} />
                                        </div>
                                    </>
                                )}
                                {selectedReportType === 'aniversariantes_mes' && (
                                    <div className="col-span-1 md:col-span-2 animate-in fade-in zoom-in-95">
                                        <CustomSelectSheet label="Mês do Aniversário" icon={<FaBirthdayCake />} value={selectedBirthdayMonth} onChange={setSelectedBirthdayMonth} options={monthOptions} />
                                    </div>
                                )}
                            </div>

                            <button type="submit" disabled={loadingReport || !selectedReportType} className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-tighter cursor-pointer mt-4">
                                {loadingReport ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                                Gerar Relatório
                            </button>
                        </form>
                    </div>
                </div>

                {/* CARD DE RESULTADOS (Renderizado Condicionalmente) */}
                {(reportDisplayData || loadingReport) && (
                    <div ref={resultRef} className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom duration-500">
                         {/* Header do Card de Resultados */}
                        <div className="bg-indigo-50 px-8 py-6 border-b border-indigo-100 flex items-center justify-between">
                            <h2 className="text-lg font-black text-indigo-900 flex items-center gap-2">
                                <FaChartBar className="text-indigo-500"/> Resultados
                            </h2>
                            {reportDisplayData && (
                                <span className="bg-white text-indigo-600 text-[10px] font-black uppercase px-3 py-1 rounded-lg border border-indigo-100 shadow-sm">
                                    Pronto
                                </span>
                            )}
                        </div>

                        <div className="p-8 sm:p-10">
                            {loadingReport ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <LoadingSpinner />
                                    <p className="mt-6 font-bold text-sm uppercase tracking-widest animate-pulse">Processando dados...</p>
                                </div>
                            ) : reportDisplayData ? (
                                <div className="space-y-8">
                                    
                                    {/* Título do Relatório Gerado */}
                                    <div className="text-center">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Relatório Gerado</p>
                                        <h3 className="text-xl font-black text-gray-800">{reportDisplayData.title}</h3>
                                    </div>

                                    {/* Área de Conteúdo (Tabelas) */}
                                    <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-inner bg-gray-50/50">
                                        <div className="min-w-full p-2">
                                            {reportDisplayData.type === 'presenca_reuniao' && <ReportPresencaReuniaoDisplay data={reportDisplayData.content as ReportDataPresencaReuniao} />}
                                            {reportDisplayData.type === 'presenca_membro' && <ReportPresencaMembroDisplay data={reportDisplayData.content as ReportDataPresencaMembro} />}
                                            {reportDisplayData.type === 'faltosos' && <ReportFaltososPeriodoDisplay data={reportDisplayData.content as ReportDataFaltososPeriodo} />}
                                            {reportDisplayData.type === 'visitantes_periodo' && <ReportVisitantesPeriodoDisplay data={reportDisplayData.content as ReportDataVisitantesPeriodo} />}
                                            {reportDisplayData.type === 'aniversariantes_mes' && <ReportAniversariantesDisplay data={reportDisplayData.content as ReportDataAniversariantes} />}
                                            {reportDisplayData.type === 'alocacao_lideres' && <ReportAlocacaoLideresDisplay data={reportDisplayData.content as ReportDataAlocacaoLideres} />}
                                            {reportDisplayData.type === 'chaves_ativacao' && <ReportChavesAtivacaoDisplay data={reportDisplayData.content as ReportDataChavesAtivacao} />}
                                        </div>
                                    </div>

                                    {/* Botões de Exportação */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                                        <button onClick={handleExportPdf} disabled={exportingPdf} className="flex items-center justify-center gap-3 bg-red-50 text-red-600 border border-red-100 py-4 rounded-2xl font-black hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm">
                                            {exportingPdf ? <FaSpinner className="animate-spin" /> : <FaFilePdf size={18}/>} 
                                            <span className="text-sm">BAIXAR PDF</span>
                                        </button>
                                        <button onClick={handleExportCsv} disabled={exportingCsv} className="flex items-center justify-center gap-3 bg-emerald-50 text-emerald-600 border border-emerald-100 py-4 rounded-2xl font-black hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm">
                                            {exportingCsv ? <FaSpinner className="animate-spin" /> : <FaFileCsv size={18}/>} 
                                            <span className="text-sm">BAIXAR CSV</span>
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* Dica */}
                {!reportDisplayData && !loadingReport && (
                    <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 flex gap-4 items-start">
                        <div className="bg-blue-100 p-2 rounded-xl text-blue-600 shrink-0">
                            <FaInfoCircle size={20} />
                        </div>
                        <div className="text-xs text-blue-800 leading-relaxed">
                            <p className="font-black uppercase mb-1">Sobre Exportações</p>
                            Utilize o formato <strong>CSV</strong> caso precise abrir os dados no Excel ou Google Sheets para cálculos avançados. O formato <strong>PDF</strong> é ideal para compartilhamento rápido via WhatsApp.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}