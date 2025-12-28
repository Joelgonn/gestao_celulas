'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
// CORREÇÃO AQUI: Importar 'supabase' diretamente, que é o cliente do navegador
import { supabase } from '@/utils/supabase/client'; 
import { 
    atualizarInscricaoFaceAFaceAdmin 
} from '@/lib/data';
import { InscricaoFaceAFaceStatus } from '@/lib/types';
import { formatPhoneNumberDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaMoneyBillWave,
    FaCheckCircle,
    FaEye,
    FaEdit,
    FaSync,
    FaArrowLeft,
    FaExclamationCircle
} from 'react-icons/fa';

// Tipo local simplificado
type PendenciaFinanceira = {
    id: string;
    nome_completo_participante: string;
    contato_pessoal: string;
    status_pagamento: InscricaoFaceAFaceStatus;
    caminho_comprovante_entrada: string | null;
    caminho_comprovante_restante: string | null;
    evento_id: string;
    evento_nome: string;
    valor_total: number;
    valor_entrada: number;
};

export default function CentralAprovacoesPage() {
    const [pendencias, setPendencias] = useState<PendenciaFinanceira[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const { addToast, ToastContainer } = useToast();

    // 1. Busca as pendências
    const fetchPendencias = useCallback(async () => {
        setLoading(true);
        try {
            // Usamos o cliente 'supabase' importado diretamente
            const { data, error } = await supabase
                .from('inscricoes_face_a_face')
                .select(`
                    id, 
                    nome_completo_participante, 
                    contato_pessoal, 
                    status_pagamento, 
                    caminho_comprovante_entrada, 
                    caminho_comprovante_restante,
                    evento_id,
                    eventos_face_a_face (nome_evento, valor_total, valor_entrada)
                `)
                .in('status_pagamento', ['AGUARDANDO_CONFIRMACAO_ENTRADA', 'AGUARDANDO_CONFIRMACAO_RESTANTE'])
                .order('updated_at', { ascending: true }); // FIFO (Primeiro que entra, primeiro que sai)

            if (error) throw error;

            const formattedData: PendenciaFinanceira[] = (data || []).map((item: any) => ({
                id: item.id,
                nome_completo_participante: item.nome_completo_participante,
                contato_pessoal: item.contato_pessoal,
                status_pagamento: item.status_pagamento,
                caminho_comprovante_entrada: item.caminho_comprovante_entrada,
                caminho_comprovante_restante: item.caminho_comprovante_restante,
                evento_id: item.evento_id,
                evento_nome: item.eventos_face_a_face?.nome_evento || 'Evento Desconhecido',
                valor_total: item.eventos_face_a_face?.valor_total || 0,
                valor_entrada: item.eventos_face_a_face?.valor_entrada || 0,
            }));

            setPendencias(formattedData);
        } catch (e: any) {
            console.error("Erro ao buscar pendências:", e);
            addToast("Erro ao carregar lista.", "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchPendencias();
    }, [fetchPendencias]);

    // 2. Ação de Aprovar Rápido
    const handleApprove = async (item: PendenciaFinanceira) => {
        if (!confirm(`Confirmar pagamento de ${item.nome_completo_participante}?`)) return;
        
        setProcessingId(item.id);
        try {
            const updateData: any = {};
            
            if (item.status_pagamento === 'AGUARDANDO_CONFIRMACAO_ENTRADA') {
                updateData.status_pagamento = 'ENTRADA_CONFIRMADA';
                updateData.admin_confirmou_entrada = true;
            } else if (item.status_pagamento === 'AGUARDANDO_CONFIRMACAO_RESTANTE') {
                updateData.status_pagamento = 'PAGO_TOTAL';
                updateData.admin_confirmou_restante = true;
            }

            await atualizarInscricaoFaceAFaceAdmin(item.id, updateData);
            
            addToast("Pagamento confirmado com sucesso!", "success");
            setPendencias(prev => prev.filter(p => p.id !== item.id));
            
        } catch (e: any) {
            addToast(`Erro ao aprovar: ${e.message}`, "error");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <ToastContainer />

            {/* Header Financeiro */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-700 shadow-xl px-4 pt-8 pb-16 sm:px-8">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                            <FaMoneyBillWave className="text-yellow-400" /> Central de Aprovações
                        </h1>
                        <p className="text-emerald-100 text-sm mt-1">
                            {pendencias.length === 0 
                                ? "Tudo em dia! Nenhuma pendência financeira." 
                                : `Você tem ${pendencias.length} pagamentos aguardando confirmação.`}
                        </p>
                    </div>
                    <Link href="/admin/dashboard" className="text-white/80 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                        <FaArrowLeft /> Voltar
                    </Link>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10">
                
                {/* Empty State */}
                {pendencias.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                            <FaCheckCircle />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Tudo Limpo!</h2>
                        <p className="text-gray-500 mt-2">Não há comprovantes pendentes de análise no momento.</p>
                        <button onClick={fetchPendencias} className="mt-6 text-emerald-600 font-bold hover:underline flex items-center justify-center gap-2 mx-auto">
                            <FaSync /> Atualizar Lista
                        </button>
                    </div>
                )}

                {/* Lista de Cards */}
                <div className="space-y-4">
                    {pendencias.map((item) => {
                        const isEntrada = item.status_pagamento === 'AGUARDANDO_CONFIRMACAO_ENTRADA';
                        const comprovanteUrl = isEntrada ? item.caminho_comprovante_entrada : item.caminho_comprovante_restante;
                        const valorReferencia = isEntrada ? item.valor_entrada : (item.valor_total - item.valor_entrada);
                        const labelTipo = isEntrada ? "Entrada (Sinal)" : "Restante (Quitação)";

                        return (
                            <div key={item.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-5 flex flex-col md:flex-row gap-6 hover:border-emerald-300 transition-colors">
                                
                                {/* Info */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                                                {item.evento_nome}
                                            </span>
                                            <h3 className="text-lg font-bold text-gray-900 mt-1">{item.nome_completo_participante}</h3>
                                            <p className="text-sm text-gray-500">{formatPhoneNumberDisplay(item.contato_pessoal)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 mt-3 bg-yellow-50 border border-yellow-100 p-3 rounded-lg w-fit">
                                        <div className="bg-yellow-100 p-2 rounded-full text-yellow-700">
                                            <FaExclamationCircle />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-yellow-800 uppercase">Aguardando Aprovação</p>
                                            <p className="text-sm text-gray-800">
                                                Tipo: <strong>{labelTipo}</strong>
                                                <span className="mx-2 text-gray-300">|</span>
                                                Valor Ref.: <strong>R$ {valorReferencia.toFixed(2).replace('.', ',')}</strong>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="flex md:flex-col justify-end gap-3 md:min-w-[200px]">
                                    {comprovanteUrl ? (
                                        <a 
                                            href={comprovanteUrl} 
                                            target="_blank" 
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
                                        >
                                            <FaEye /> Ver Comprovante
                                        </a>
                                    ) : (
                                        <span className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-400 rounded-lg text-sm cursor-not-allowed">
                                            Sem Comprovante
                                        </span>
                                    )}

                                    <button 
                                        onClick={() => handleApprove(item)}
                                        disabled={processingId === item.id}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-md transition-colors disabled:opacity-70"
                                    >
                                        {processingId === item.id ? <LoadingSpinner size="sm" color="white" /> : <><FaCheckCircle /> Confirmar Pagamento</>}
                                    </button>

                                    <Link 
                                        href={`/admin/eventos-face-a-face/${item.evento_id}/inscricoes/editar/${item.id}`}
                                        className="hidden md:flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-emerald-600 hover:underline mt-1"
                                    >
                                        <FaEdit /> Editar Detalhes
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}