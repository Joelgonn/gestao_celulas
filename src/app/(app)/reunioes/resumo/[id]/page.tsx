// src/app/(app)/reunioes/resumo/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getReuniaoDetalhesParaResumo } from '@/lib/data';
import { ReuniaoDetalhesParaResumo } from '@/lib/types';
import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
    FaFilePdf, 
    FaArrowLeft, 
    FaCalendarAlt, 
    FaCheckCircle, 
    FaTimesCircle, 
    FaUserCheck, 
    FaUserTimes,
    FaUserPlus 
} from 'react-icons/fa';

export default function ReuniaoResumoPage() {
    const params = useParams();
    const reuniaoId = params.id as string;

    const [resumo, setResumo] = useState<ReuniaoDetalhesParaResumo | null>(null);
    const [loading, setLoading] = useState(true);
    const [exportingPdf, setExportingPdf] = useState(false);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const fetchResumo = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getReuniaoDetalhesParaResumo(reuniaoId);
            if (!data) {
                addToast("Resumo não encontrado.", 'error');
                router.replace('/reunioes');
                return;
            }
            setResumo(data);
        } catch (e: any) {
            console.error("Erro ao carregar resumo:", e);
            addToast("Falha ao carregar o resumo.", 'error');
        } finally {
            setLoading(false);
        }
    }, [reuniaoId, router, addToast]);

    useEffect(() => {
        if (reuniaoId) {
            fetchResumo();
        }
    }, [reuniaoId, fetchResumo]);

    const handleExportPdf = async () => {
        if (!resumo) return;
        setExportingPdf(true);

        try {
            const reportData = {
                type: "presenca_reuniao",
                title: `Relatório - ${formatDateForDisplay(resumo.data_reuniao)} (${resumo.celula_nome || 'N/A'})`,
                content: {
                    reuniao_detalhes: {
                        data_reuniao: resumo.data_reuniao,
                        tema: resumo.tema,
                        ministrador_principal_nome: resumo.ministrador_principal_nome,
                        ministrador_secundario_nome: resumo.ministrador_secundario_nome,
                        responsavel_kids_nome: resumo.responsavel_kids_nome,
                        num_criancas: resumo.num_criancas,
                        celula_nome: resumo.celula_nome,
                    },
                    membros_presentes: resumo.membros_presentes,
                    membros_ausentes: resumo.membros_ausentes,
                    visitantes_presentes: resumo.visitantes_presentes,
                },
                filename: `relatorio_${resumo.data_reuniao.replace(/-/g, '')}.pdf`,
            };

            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData),
            });

            if (!response.ok) throw new Error("Falha na geração do PDF.");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = reportData.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            addToast('Download iniciado!', 'success');
        } catch (err: any) {
            console.error("Erro PDF:", err);
            addToast("Erro ao exportar PDF.", 'error');
        } finally {
            setExportingPdf(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (!resumo) return null;

    const totalPessoas = resumo.membros_presentes.length + resumo.visitantes_presentes.length + (resumo.num_criancas || 0);

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <ToastContainer />

            {/* Header Responsivo */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg">
                <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
                    <Link href="/reunioes" className="inline-flex items-center text-emerald-100 hover:text-white mb-4 transition-colors">
                        <FaArrowLeft className="mr-2" /> Voltar
                    </Link>
                    
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
                                {resumo.tema}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-emerald-100 text-sm">
                                <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full">
                                    <FaCalendarAlt /> {formatDateForDisplay(resumo.data_reuniao)}
                                </span>
                                <span className="bg-white/10 px-3 py-1 rounded-full">
                                    {resumo.celula_nome || 'Célula'}
                                </span>
                            </div>
                        </div>

                        {/* Card de Total no Header */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-[140px] text-center border border-white/20 self-start w-full md:w-auto">
                            <div className="text-3xl font-bold">{totalPessoas}</div>
                            <div className="text-xs text-emerald-100 uppercase tracking-wide">Total Presente</div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 -mt-4 space-y-6">
                
                {/* Card de Informações e Ações */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-3 text-sm">
                            <h3 className="font-bold text-gray-900 border-b pb-2 mb-3">Liderança</h3>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Ministrador:</span>
                                <span className="font-medium text-gray-800 text-right">{resumo.ministrador_principal_nome}</span>
                            </div>
                            {resumo.ministrador_secundario_nome && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Apoio:</span>
                                    <span className="font-medium text-gray-800 text-right">{resumo.ministrador_secundario_nome}</span>
                                </div>
                            )}
                            {resumo.responsavel_kids_nome && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Kids:</span>
                                    <span className="font-medium text-gray-800 text-right">{resumo.responsavel_kids_nome}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-3 text-sm">
                             <h3 className="font-bold text-gray-900 border-b pb-2 mb-3">Material & Kids</h3>
                             <div className="flex justify-between items-center">
                                <span className="text-gray-500">Crianças:</span>
                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md font-bold text-xs">
                                    {resumo.num_criancas} presentes
                                </span>
                            </div>
                            {resumo.caminho_pdf ? (
                                <a
                                    href={resumo.caminho_pdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center w-full py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors mt-2"
                                >
                                    <FaFilePdf className="mr-2" /> Ver Material Anexado
                                </a>
                            ) : (
                                <p className="text-gray-400 text-xs italic mt-2">Nenhum material anexado.</p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleExportPdf}
                        disabled={exportingPdf}
                        className="w-full flex items-center justify-center bg-gray-900 text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-800 disabled:bg-gray-400 transition-all active:scale-[0.98]"
                    >
                        {exportingPdf ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Gerando PDF...
                            </>
                        ) : (
                            <>
                                <FaFilePdf className="mr-2" /> Baixar Relatório PDF
                            </>
                        )}
                    </button>
                </div>

                {/* Listas de Presença */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Membros Presentes */}
                    <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
                        <div className="bg-emerald-50 px-4 py-3 flex justify-between items-center border-b border-emerald-100">
                            <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                                <FaUserCheck /> Membros Presentes
                            </h3>
                            <span className="bg-white text-emerald-700 text-xs font-bold px-2 py-1 rounded-full border border-emerald-200">
                                {resumo.membros_presentes.length}
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {resumo.membros_presentes.length === 0 ? (
                                <p className="text-gray-400 text-sm p-4 text-center italic">Nenhum registro.</p>
                            ) : (
                                resumo.membros_presentes.map(m => (
                                    <div key={m.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <FaCheckCircle className="text-emerald-400 w-4 h-4" />
                                            <span className="text-sm font-medium text-gray-700">{m.nome}</span>
                                        </div>
                                        {m.telefone && (
                                            <span className="text-xs text-gray-400">{formatPhoneNumberDisplay(m.telefone)}</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Visitantes */}
                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
                        <div className="bg-blue-50 px-4 py-3 flex justify-between items-center border-b border-blue-100">
                            <h3 className="font-bold text-blue-800 flex items-center gap-2">
                                <FaUserPlus /> Visitantes
                            </h3>
                            <span className="bg-white text-blue-700 text-xs font-bold px-2 py-1 rounded-full border border-blue-200">
                                {resumo.visitantes_presentes.length}
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {resumo.visitantes_presentes.length === 0 ? (
                                <p className="text-gray-400 text-sm p-4 text-center italic">Nenhum visitante.</p>
                            ) : (
                                resumo.visitantes_presentes.map(v => (
                                    <div key={v.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <FaCheckCircle className="text-blue-400 w-4 h-4" />
                                            <span className="text-sm font-medium text-gray-700">{v.nome}</span>
                                        </div>
                                        {v.telefone && (
                                            <span className="text-xs text-gray-400">{formatPhoneNumberDisplay(v.telefone)}</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Membros Ausentes - Ocupando largura total em mobile ou desktop se sobrar espaço */}
                    <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden lg:col-span-2">
                        <div className="bg-red-50 px-4 py-3 flex justify-between items-center border-b border-red-100">
                            <h3 className="font-bold text-red-800 flex items-center gap-2">
                                <FaUserTimes /> Membros Ausentes
                            </h3>
                            <span className="bg-white text-red-700 text-xs font-bold px-2 py-1 rounded-full border border-red-200">
                                {resumo.membros_ausentes.length}
                            </span>
                        </div>
                        
                        {/* Grid interno para os ausentes para aproveitar espaço se forem muitos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0 divide-y sm:divide-y-0">
                            {resumo.membros_ausentes.length === 0 ? (
                                <p className="text-gray-400 text-sm p-4 text-center italic col-span-full">Todos presentes! 🎉</p>
                            ) : (
                                resumo.membros_ausentes.map((m, idx) => (
                                    <div key={m.id} className={`p-3 flex justify-between items-center hover:bg-gray-50 border-gray-100 ${idx !== 0 ? 'border-t sm:border-t-0' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <FaTimesCircle className="text-red-300 w-4 h-4" />
                                            <span className="text-sm font-medium text-gray-600">{m.nome}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-center pt-6">
                    <Link href="/reunioes" className="text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors">
                        Voltar para a lista completa
                    </Link>
                </div>
            </main>
        </div>
    );
}