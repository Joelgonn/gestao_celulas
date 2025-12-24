// src/app/(app)/reunioes/presenca/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from '@/lib/data';

import { ReuniaoParaEdicao, MembroComPresenca, VisitanteComPresenca } from '@/lib/types';
import { formatDateForDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner'; // Ajuste o caminho se necessário conforme seu projeto

export default function GerenciarPresencaPage() {
    const params = useParams();
    const reuniaoId = params.id as string;
    
    const [reuniao, setReuniao] = useState<ReuniaoParaEdicao | null>(null);
    const [membrosPresenca, setMembrosPresenca] = useState<MembroComPresenca[]>([]);
    const [visitantesPresenca, setVisitantesPresenca] = useState<VisitanteComPresenca[]>([]);
    const [numCriancas, setNumCriancas] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // IDs de função para controle visual
    const [specialRoles, setSpecialRoles] = useState<string[]>([]);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    // Contadores em tempo real
    const membrosPresentes = membrosPresenca.filter(m => m.presente).length;
    const visitantesPresentes = visitantesPresenca.filter(v => v.presente).length;
    const totalPresentes = membrosPresentes + visitantesPresentes + numCriancas;

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
                
                // Extração dos IDs de função
                const mpId = fetchedReuniao.ministrador_principal || null;
                const msId = fetchedReuniao.ministrador_secundario || null;
                const rkId = fetchedReuniao.responsavel_kids || null;
                
                // Array de IDs especiais para desabilitar/destacar na UI
                const roles = [mpId, msId, rkId].filter((id): id is string => id !== null);
                setSpecialRoles(roles);

                setReuniao(fetchedReuniao);
                setVisitantesPresenca(visitantesData);
                setNumCriancas(criancasCount);

                // Lógica de Pré-Marcação (Mantida a original)
                const membrosComPreMarcacao = membrosRawData.map(m => {
                    const isDesignado = roles.includes(m.id);
                    if (isDesignado && !m.presenca_registrada) {
                        return { ...m, presente: true };
                    }
                    return m;
                });

                setMembrosPresenca(membrosComPreMarcacao);

            } catch (e: any) {
                console.error("Erro ao buscar dados:", e);
                addToast(`Erro ao carregar dados: ${e.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };

        if (reuniaoId) {
            fetchPresencaData();
        }
    }, [reuniaoId, router, addToast]);

    // Otimização com useCallback
    const handleMembroChange = useCallback((membroId: string, presente: boolean) => {
        setMembrosPresenca(prev => prev.map(m =>
            m.id === membroId ? { ...m, presente: presente } : m
        ));
    }, []);

    const handleVisitanteChange = useCallback((visitanteId: string, presente: boolean) => {
        setVisitantesPresenca(prev => prev.map(v =>
            v.visitante_id === visitanteId ? { ...v, presente: presente } : v
        ));
    }, []);

    const handleNumCriancasChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        setNumCriancas(isNaN(value) ? 0 : Math.max(0, value));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await Promise.all([
                ...membrosPresenca.map(m => registrarPresencaMembro(reuniaoId, m.id, m.presente)),
                ...visitantesPresenca.map(v => registrarPresencaVisitante(reuniaoId, v.visitante_id, v.presente)),
                setNumCriancasReuniao(reuniaoId, numCriancas)
            ]);

            addToast('Lista de presença salva com sucesso!', 'success');
            setTimeout(() => router.push('/reunioes'), 1000);

        } catch (e: any) {
            console.error("Erro ao salvar:", e);
            addToast(`Falha ao salvar: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <LoadingSpinner />
                <p className="mt-4 text-gray-500 font-medium animate-pulse">Carregando lista...</p>
            </div>
        );
    }

    if (!reuniao) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-20"> {/* pb-20 para dar espaço ao botão flutuante/final */}
            <ToastContainer />

            {/* Header Compacto Mobile */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-6 sm:px-6 sm:py-8 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col gap-2">
                        <Link href="/reunioes" className="text-white/80 text-sm flex items-center gap-1 w-fit hover:text-white transition-colors">
                            ← Voltar
                        </Link>
                        <h1 className="text-2xl font-bold text-white leading-tight">
                            {reuniao.tema}
                        </h1>
                        <div className="flex items-center gap-3 text-emerald-100 text-sm">
                            <span className="flex items-center gap-1">
                                📅 {formatDateForDisplay(reuniao.data_reuniao)}
                            </span>
                        </div>
                    </div>
                    
                    {/* Card de Total Flutuante no Header */}
                    <div className="mt-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-emerald-100 text-xs uppercase tracking-wider font-semibold">Total Presentes</p>
                            <p className="text-3xl font-bold text-white">{totalPresentes}</p>
                        </div>
                        <div className="flex gap-2 text-center text-xs text-white/90">
                            <div className="bg-white/10 px-3 py-1.5 rounded-lg">
                                <span className="block font-bold text-lg">{membrosPresentes}</span>
                                Membros
                            </div>
                            <div className="bg-white/10 px-3 py-1.5 rounded-lg">
                                <span className="block font-bold text-lg">{visitantesPresentes}</span>
                                Visit.
                            </div>
                            <div className="bg-white/10 px-3 py-1.5 rounded-lg">
                                <span className="block font-bold text-lg">{numCriancas}</span>
                                Kids
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-3 sm:px-6 -mt-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Lista de Membros */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                👥 Membros
                            </h2>
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full">
                                {membrosPresentes} / {membrosPresenca.length}
                            </span>
                        </div>
                        
                        {/* Removemos max-h para permitir scroll da página inteira no mobile */}
                        <div className="divide-y divide-gray-100">
                            {membrosPresenca.map((membro) => {
                                const isSpecialRole = specialRoles.includes(membro.id);
                                return (
                                    <label 
                                        key={membro.id} 
                                        className={`
                                            relative flex items-center p-4 cursor-pointer transition-colors touch-manipulation
                                            ${membro.presente ? 'bg-emerald-50/50' : 'bg-white hover:bg-gray-50'}
                                        `}
                                    >
                                        <div className="flex items-center h-6">
                                            <input
                                                type="checkbox"
                                                checked={membro.presente}
                                                disabled={isSpecialRole}
                                                onChange={(e) => handleMembroChange(membro.id, e.target.checked)}
                                                className={`
                                                    w-6 h-6 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 transition-all
                                                    ${isSpecialRole ? 'opacity-50 cursor-not-allowed' : ''}
                                                `}
                                            />
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <div className={`text-base font-medium ${membro.presente ? 'text-emerald-900' : 'text-gray-700'}`}>
                                                {membro.nome}
                                            </div>
                                            {isSpecialRole && (
                                                <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                                                    Liderança / Apoio (Já incluso)
                                                </div>
                                            )}
                                        </div>
                                        {membro.presente && (
                                            <div className="absolute right-4 text-emerald-600 animate-in fade-in zoom-in duration-200">
                                                ✓
                                            </div>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Lista de Visitantes */}
                    {visitantesPresenca.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center sticky top-0 z-10">
                                <h2 className="font-bold text-blue-900 flex items-center gap-2">
                                    👋 Visitantes
                                </h2>
                                <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                                    {visitantesPresentes} / {visitantesPresenca.length}
                                </span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {visitantesPresenca.map((v) => (
                                    <label 
                                        key={v.visitante_id}
                                        className={`
                                            relative flex items-center p-4 cursor-pointer transition-colors touch-manipulation
                                            ${v.presente ? 'bg-blue-50/30' : 'bg-white hover:bg-gray-50'}
                                        `}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={v.presente}
                                            onChange={(e) => handleVisitanteChange(v.visitante_id, e.target.checked)}
                                            className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className={`ml-3 text-base font-medium flex-1 ${v.presente ? 'text-blue-900' : 'text-gray-700'}`}>
                                            {v.nome}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Card de Crianças */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h2 className="font-bold text-gray-800 text-lg">Crianças</h2>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label htmlFor="num_criancas" className="block text-sm text-gray-500 mb-1">
                                    Quantidade total
                                </label>
                                <input
                                    type="number"
                                    id="num_criancas"
                                    value={numCriancas}
                                    onChange={handleNumCriancasChange}
                                    min="0"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-full text-base border-gray-300 rounded-lg p-3 text-lg font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg flex-1">
                                Inclua bebês e crianças na sala kids.
                            </div>
                        </div>
                    </div>

                    {/* Botões de Ação Fixos/Grandes */}
                    <div className="pt-4 flex flex-col gap-3">
                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white text-lg font-bold py-4 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-transform disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Confirmar Presença
                                </>
                            )}
                        </button>
                        
                        <Link 
                            href="/reunioes" 
                            className="w-full text-center py-4 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </Link>
                    </div>
                </form>
            </main>
        </div>
    );
}