// src/app/(app)/reunioes/resumo/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getReuniaoDetalhesParaResumo, ReuniaoDetalhesParaResumo } from '@/lib/data';
import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters';

// IMPORTS DOS COMPONENTES E HOOKS AGORA SEPARADOS (CORREÇÃO APLICADA AQUI)
import Toast from '@/components/ui/Toast'; // Importa o componente Toast
import useToast from '@/hooks/useToast';   // Importa o hook useToast
import LoadingSpinner from '@/components/LoadingSpinner'; // Importe seu LoadingSpinner correto

export default function ReuniaoResumoPage() {
    const params = useParams();
    const reuniaoId = params.id as string;

    const [resumo, setResumo] = useState<ReuniaoDetalhesParaResumo | null>(null);
    const [loading, setLoading] = useState(true);
    const [exportingPdf, setExportingPdf] = useState(false);

    const router = useRouter();
    const { toasts, addToast, removeToast } = useToast(); // Use o hook importado

    const fetchResumo = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getReuniaoDetalhesParaResumo(reuniaoId);
            if (!data) {
                addToast("Resumo da reunião não encontrado ou acesso negado.", 'error');
                // Adicione um retorno ou redirecionamento aqui, se desejar
                // router.replace('/reunioes');
                return;
            }
            setResumo(data);
            addToast('Resumo carregado com sucesso!', 'success');
        } catch (e: any) {
            console.error("Erro ao carregar resumo da reunião:", e);
            addToast(e.message || "Falha ao carregar o resumo da reunião.", 'error');
        } finally {
            setLoading(false);
        }
    }, [reuniaoId, addToast]); // 'addToast' é agora estável vindo do hook global

    useEffect(() => {
        if (reuniaoId) {
            fetchResumo();
        }
    }, [reuniaoId, fetchResumo]); // 'fetchResumo' é estável por causa do useCallback

    const handleExportPdf = async () => {
        if (!resumo) {
            addToast("Nenhum dado de resumo para exportar para PDF.", 'error');
            return;
        }

        setExportingPdf(true);

        try {
            const reportData = {
                type: "presenca_reuniao",
                title: `Relatório de Presença - Reunião em ${formatDateForDisplay(resumo.data_reuniao)} (${resumo.celula_nome || 'N/A'})`,
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
                filename: `relatorio_presenca_${resumo.celula_nome?.replace(/\s/g, '_') || 'celula'}_${resumo.data_reuniao.replace(/-/g, '')}.pdf`,
            };

            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData),
            });

            if (!response.ok) {
                const errorJson = await response.json();
                throw new Error(errorJson.error || `Erro ${response.status}: Falha na API de PDF.`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = reportData.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            addToast('PDF gerado e download iniciado com sucesso!', 'success');

        } catch (err: any) {
            console.error("Erro ao exportar PDF:", err);
            addToast(`Erro ao exportar PDF: ${err.message || "Erro desconhecido."}`, 'error');
        } finally {
            setExportingPdf(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                            <div className="space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                        {/* Garanta que seu LoadingSpinner está sendo importado e usado corretamente */}
                        <LoadingSpinner />
                    </div>
                </div>
            </div>
        );
    }

    if (!resumo) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
                <div className="max-w-4xl mx-auto px-4">
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

                    <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                        <div className="text-red-500 mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Resumo não disponível</h2>
                        <Link
                            href="/reunioes"
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg"
                        >
                            Voltar para Lista de Reuniões
                        </Link>
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

            <div className="max-w-4xl mx-auto px-4">
                {/* Header com Gradiente */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Resumo da Reunião</h1>
                            <div className="flex items-center space-x-6 text-green-100">
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    <span>{formatDateForDisplay(resumo.data_reuniao)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>{resumo.tema}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold">{resumo.membros_presentes.length + resumo.visitantes_presentes.length}</div>
                            <div className="text-green-100">Total de Pessoas</div>
                        </div>
                    </div>
                </div>

                {/* Informações da Reunião */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Informações da Reunião
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="font-semibold text-gray-600">Célula:</span>
                                <span className="text-gray-800">{resumo.celula_nome || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold text-gray-600">Ministrador Principal:</span>
                                <span className="text-gray-800">{resumo.ministrador_principal_nome || 'N/A'}</span>
                            </div>
                            {resumo.ministrador_secundario_nome && (
                                <div className="flex justify-between">
                                    <span className="font-semibold text-gray-600">Ministrador Secundário:</span>
                                    <span className="text-gray-800">{resumo.ministrador_secundario_nome}</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            {resumo.responsavel_kids_nome && (
                                <div className="flex justify-between">
                                    <span className="font-semibold text-gray-600">Responsável Kids:</span>
                                    <span className="text-gray-800">{resumo.responsavel_kids_nome}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="font-semibold text-gray-600">Crianças Presentes:</span>
                                <span className="text-gray-800 font-bold">{resumo.num_criancas}</span>
                            </div>
                            {resumo.caminho_pdf && (
                                <div className="flex justify-between">
                                    <span className="font-semibold text-gray-600">Material:</span>
                                    <a
                                        href={resumo.caminho_pdf}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                        Ver Material
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Botão de Exportar PDF */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <button
                        onClick={handleExportPdf}
                        disabled={exportingPdf}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center"
                    >
                        {exportingPdf ? (
                            <div className="flex items-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                Gerando PDF...
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Exportar Resumo para PDF
                            </div>
                        )}
                    </button>
                </div>

                {/* Grid de Resumos */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Membros Presentes */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-green-700 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                Membros Presentes
                            </h3>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                                {resumo.membros_presentes.length}
                            </span>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {resumo.membros_presentes.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">Nenhum membro presente</p>
                            ) : (
                                resumo.membros_presentes.map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-100">
                                        <span className="text-sm font-medium text-gray-800">{m.nome}</span>
                                        <span className="text-xs text-gray-600">{formatPhoneNumberDisplay(m.telefone)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Membros Ausentes */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-red-700 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                Membros Ausentes
                            </h3>
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                                {resumo.membros_ausentes.length}
                            </span>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {resumo.membros_ausentes.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">Nenhum membro ausente</p>
                            ) : (
                                resumo.membros_ausentes.map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-100">
                                        <span className="text-sm font-medium text-gray-800">{m.nome}</span>
                                        <span className="text-xs text-gray-600">{formatPhoneNumberDisplay(m.telefone)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Visitantes Presentes */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-purple-700 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                Visitantes Presentes
                            </h3>
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
                                {resumo.visitantes_presentes.length}
                            </span>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {resumo.visitantes_presentes.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">Nenhum visitante presente</p>
                            ) : (
                                resumo.visitantes_presentes.map(v => (
                                    <div key={v.id} className="flex items-center justify-between p-2 rounded-lg bg-purple-50 border border-purple-100">
                                        <span className="text-sm font-medium text-gray-800">{v.nome}</span>
                                        <span className="text-xs text-gray-600">{formatPhoneNumberDisplay(v.telefone)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Botão Voltar */}
                <div className="text-center">
                    <Link
                        href="/reunioes"
                        className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 shadow-lg"
                    >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Voltar para Lista de Reuniões
                    </Link>
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