// src/app/(app)/reunioes/presenca/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    getReuniao,
    listarTodosMembrosComPresenca,
    registrarPresencaMembro,
    listarTodosVisitantesComPresenca,
    registrarPresencaVisitante,
    getNumCriancasReuniao,
    setNumCriancasReuniao,
    ReuniaoParaEdicao, // Para a estrutura da reunião que contém os IDs de função
    MembroComPresenca,
    VisitanteComPresenca
} from '@/lib/data';
import { formatDateForDisplay } from '@/utils/formatters';

// IMPORTS DOS COMPONENTES E HOOKS
import Toast from '@/components/ui/Toast'; 
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function GerenciarPresencaPage() {
    const params = useParams();
    const reuniaoId = params.id as string;
    
    const [reuniao, setReuniao] = useState<ReuniaoParaEdicao | null>(null);
    const [membrosPresenca, setMembrosPresenca] = useState<MembroComPresenca[]>([]);
    const [visitantesPresenca, setVisitantesPresenca] = useState<VisitanteComPresenca[]>([]);
    const [numCriancas, setNumCriancas] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    // IDs das funções (não usados diretamente nos inputs, mas úteis para lógica)
    const [ministradorPrincipalId, setMinistradorPrincipalId] = useState<string | null>(null);
    const [ministradorSecundarioId, setMinistradorSecundarioId] = useState<string | null>(null);
    const [responsavelKidsId, setResponsavelKidsId] = useState<string | null>(null);

    const { toasts, addToast, removeToast } = useToast();

    // Contadores para feedback visual
    const membrosPresentes = membrosPresenca.filter(m => m.presente).length;
    const visitantesPresentes = visitantesPresenca.filter(v => v.presente).length;

    useEffect(() => {
        const fetchPresencaData = async () => {
            setLoading(true);
            try {
                const [fetchedReuniao, membrosRawData, visitantesData, criancasCount] = await Promise.all([
                    getReuniao(reuniaoId),
                    listarTodosMembrosComPresenca(reuniaoId),
                    listarTodosVisitantesComPresenca(reuniaoId),
                    getNumCriancasReuniao(reuniaoId),
                ]);

                if (!fetchedReuniao) {
                    addToast('Reunião não encontrada!', 'error');
                    setTimeout(() => router.replace('/reunioes'), 2000);
                    return;
                }
                
                // --- EXTRAÇÃO DOS IDs DE FUNÇÃO ---
                const mpId = fetchedReuniao.ministrador_principal || null;
                const msId = fetchedReuniao.ministrador_secundario || null;
                const rkId = fetchedReuniao.responsavel_kids || null;

                setReuniao(fetchedReuniao);
                setMinistradorPrincipalId(mpId);
                setMinistradorSecundarioId(msId);
                setResponsavelKidsId(rkId);
                setVisitantesPresenca(visitantesData);
                setNumCriancas(criancasCount);

                // --- LÓGICA DE PRÉ-MARCAÇÃO ---
                const idsComFuncao = [mpId, msId, rkId].filter((id): id is string => id !== null);

                const membrosComPreMarcacao = membrosRawData.map(m => {
                    const isDesignado = idsComFuncao.includes(m.id);
                    
                    // Se o membro tiver uma função NA FICHA DA REUNIÃO,
                    // e ele AINDA NÃO tiver presença registrada (m.presente é false/nulo),
                    // marcamos como presente. Se já tiver registro, mantemos o registro do DB.
                    if (isDesignado && !m.presenca_registrada) {
                        return { ...m, presente: true };
                    }
                    
                    return m;
                });

                setMembrosPresenca(membrosComPreMarcacao);
                // --- FIM LÓGICA DE PRÉ-MARCAÇÃO ---

                addToast('Dados carregados com sucesso!', 'success');

            } catch (e: any) {
                console.error("Erro ao buscar dados de presença:", e);
                addToast(`Erro ao carregar dados: ${e.message || 'Tente novamente.'}`, 'error');
                setTimeout(() => router.replace('/reunioes'), 3000);
            } finally {
                setLoading(false);
            }
        };

        if (reuniaoId) {
            fetchPresencaData();
        }
    }, [reuniaoId, router, addToast]);

    const handleMembroChange = (membroId: string, presente: boolean) => {
        setMembrosPresenca(prev => prev.map(m =>
            m.id === membroId ? { ...m, presente: presente } : m
        ));
    };

    const handleVisitanteChange = (visitanteId: string, presente: boolean) => {
        setVisitantesPresenca(prev => prev.map(v =>
            v.visitante_id === visitanteId ? { ...v, presente: presente } : v
        ));
    };

    const handleNumCriancasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        setNumCriancas(isNaN(value) ? 0 : Math.max(0, value));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Salvar presenças de membros
            await Promise.all(membrosPresenca.map(async (membro) => {
                // Não precisamos da lógica isSpecialRole aqui, pois o estado já foi atualizado
                // pelo usuário ou pré-marcado na inicialização.
                return registrarPresencaMembro(reuniaoId, membro.id, membro.presente);
            }));

            // Salvar presenças de visitantes
            await Promise.all(visitantesPresenca.map(visitante =>
                registrarPresencaVisitante(reuniaoId, visitante.visitante_id, visitante.presente)
            ));

            // Salvar número de crianças
            await setNumCriancasReuniao(reuniaoId, numCriancas);

            addToast('Presenças salvas com sucesso! Redirecionando...', 'success');
            
            setTimeout(() => {
                router.push('/reunioes');
            }, 1500);

        } catch (e: any) {
            console.error("Erro ao salvar presenças:", e);
            addToast(`Falha ao salvar presenças: ${e.message || "Erro desconhecido"}`, 'error');
        } finally {
            setSubmitting(false);
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
                        <LoadingSpinner />
                    </div>
                </div>
            </div>
        );
    }

    if (!reuniao) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                        <div className="text-red-500 mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Reunião não encontrada</h2>
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
                        duration={toast.duration}
                    />
                ))}
            </div>

            <div className="max-w-6xl mx-auto px-4">
                {/* Header com Gradiente */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Gerenciar Presença</h1>
                            <div className="flex items-center space-x-6 text-green-100">
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    <span>{formatDateForDisplay(reuniao.data_reuniao)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>{reuniao.tema}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold">{membrosPresentes + visitantesPresentes}</div>
                            <div className="text-green-100">Total de Pessoas</div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Seção de Membros */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                                    <svg className="w-6 h-6 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                    </svg>
                                    Membros
                                </h2>
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {membrosPresentes}/{membrosPresenca.length}
                                </span>
                            </div>
                            <div className="max-h-80 overflow-y-auto space-y-3">
                                {membrosPresenca.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        Nenhum membro encontrado
                                    </div>
                                ) : (
                                    membrosPresenca.map((membro) => {
                                        const isSpecialRole = [ministradorPrincipalId, ministradorSecundarioId, responsavelKidsId].includes(membro.id);
                                        return (
                                            <div key={membro.id} className={`flex items-center p-3 rounded-lg border transition-all duration-200 ${membro.presente ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                                <input
                                                    type="checkbox"
                                                    id={`membro-${membro.id}`}
                                                    checked={membro.presente}
                                                    onChange={(e) => handleMembroChange(membro.id, e.target.checked)}
                                                    disabled={isSpecialRole} // MANTÉM DESABILITADO SE FOR FUNÇÃO
                                                    className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                                                />
                                                <label htmlFor={`membro-${membro.id}`} className={`ml-3 flex-1 text-sm font-medium ${isSpecialRole ? 'text-green-800 font-bold' : 'text-gray-700'}`}>
                                                    {membro.nome}
                                                    {isSpecialRole && (
                                                        <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                                            Função
                                                        </span>
                                                    )}
                                                </label>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Seção de Visitantes (sem mudanças) */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                                    <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                    Visitantes
                                </h2>
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {visitantesPresentes}/{visitantesPresenca.length}
                                </span>
                            </div>
                            <div className="max-h-80 overflow-y-auto space-y-3">
                                {visitantesPresenca.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                        Nenhum visitante encontrado
                                    </div>
                                ) : (
                                    visitantesPresenca.map((visitante) => (
                                        <div key={visitante.visitante_id} className={`flex items-center p-3 rounded-lg border transition-all duration-200 ${visitante.presente ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                            <input
                                                type="checkbox"
                                                id={`visitante-${visitante.visitante_id}`}
                                                checked={visitante.presente}
                                                onChange={(e) => handleVisitanteChange(visitante.visitante_id, e.target.checked)}
                                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                            />
                                            <label htmlFor={`visitante-${visitante.visitante_id}`} className="ml-3 flex-1 text-sm font-medium text-gray-700">
                                                {visitante.nome}
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Seção de Crianças */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <svg className="w-6 h-6 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                            </svg>
                            Crianças Presentes
                        </h2>
                        <div className="flex items-center space-x-4">
                            <div className="flex-1 max-w-xs">
                                <label htmlFor="num_criancas" className="block text-sm font-medium text-gray-700 mb-2">
                                    Número de Crianças
                                </label>
                                <input
                                    type="number"
                                    id="num_criancas"
                                    value={numCriancas}
                                    onChange={handleNumCriancasChange}
                                    min="0"
                                    max="100"
                                    className="w-full border border-gray-300 rounded-lg p-3 text-center text-lg font-semibold focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                />
                            </div>
                            <div className="flex-1">
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <div className="text-sm text-purple-800">
                                        <span className="font-semibold">Observação:</span> Este campo conta o número total de crianças presentes, incluindo bebês e crianças na sala kids.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex space-x-4">
                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-lg"
                        >
                            {submitting ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                    Salvando Presenças...
                                </div>
                            ) : (
                                <div className="flex items-center justify-center">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Salvar Todas as Presenças
                                </div>
                            )}
                        </button>
                        
                        <Link 
                            href="/reunioes" 
                            className="flex items-center justify-center px-8 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 shadow-lg"
                        >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            Voltar
                        </Link>
                    </div>
                </form>

                {/* Resumo Rápido */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{membrosPresentes}</div>
                        <div className="text-sm text-gray-600">Membros Presentes</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{visitantesPresentes}</div>
                        <div className="text-sm text-gray-600">Visitantes Presentes</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">{numCriancas}</div>
                        <div className="text-sm text-gray-600">Crianças Presentes</div>
                    </div>
                </div>
            </div>

            {/* Adicionar estilos de animação */}
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