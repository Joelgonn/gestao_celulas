'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client'; 
import { 
    atualizarInscricaoFaceAFaceAdmin 
} from '@/lib/data';
import { InscricaoFaceAFaceStatus } from '@/lib/types';
import { formatPhoneNumberDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

import {
    FaMoneyBillWave,
    FaCheckCircle,
    FaEye,
    FaEdit,
    FaSync,
    FaArrowLeft,
    FaExclamationCircle,
    FaSpinner // Adicionado aqui para corrigir o erro de build
} from 'react-icons/fa';

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

    // Estado para o Modal de Confirmação
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        item: PendenciaFinanceira | null;
    }>({
        isOpen: false,
        item: null
    });

    const { addToast, ToastContainer } = useToast();

    const fetchPendencias = useCallback(async () => {
        setLoading(true);
        try {
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
                .order('updated_at', { ascending: true });

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

    const handleApprove = async () => {
        const item = confirmModal.item;
        if (!item) return;
        
        setConfirmModal({ isOpen: false, item: null });
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
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />

            <ConfirmationModal 
                isOpen={confirmModal.isOpen}
                variant="info"
                title="Confirmar Pagamento"
                message={`Deseja validar o comprovante e confirmar o pagamento de ${confirmModal.item?.nome_completo_participante}?`}
                confirmText="Confirmar Agora"
                onClose={() => setConfirmModal({ isOpen: false, item: null })}
                onConfirm={handleApprove}
                loading={processingId !== null}
            />

            <div className="bg-gradient-to-r from-emerald-800 to-teal-700 shadow-xl px-4 pt-8 pb-16 sm:px-8">
                <div className="max-w-5xl mx-auto flex justify-between items-center text-white">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 tracking-tight">
                            <FaMoneyBillWave className="text-yellow-400" /> Central de Aprovações
                        </h1>
                        <p className="text-emerald-100 text-sm mt-1 opacity-90">
                            {pendencias.length === 0 
                                ? "Tudo em dia! Nenhuma pendência financeira." 
                                : `Você tem ${pendencias.length} pagamentos aguardando análise.`}
                        </p>
                    </div>
                    <Link href="/dashboard" className="bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl backdrop-blur-md border border-white/10">
                        <FaArrowLeft /> Voltar
                    </Link>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10">
                {pendencias.length === 0 && (
                    <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-gray-100">
                        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl transform -rotate-3">
                            <FaCheckCircle />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Tudo Limpo!</h2>
                        <p className="text-gray-500 mt-2">Não há comprovantes pendentes no momento.</p>
                        <button onClick={fetchPendencias} className="mt-8 text-emerald-600 font-bold hover:text-emerald-700 flex items-center justify-center gap-2 mx-auto transition-colors">
                            <FaSync /> Atualizar Lista
                        </button>
                    </div>
                )}

                <div className="space-y-4">
                    {pendencias.map((item) => {
                        const isEntrada = item.status_pagamento === 'AGUARDANDO_CONFIRMACAO_ENTRADA';
                        const comprovanteUrl = isEntrada ? item.caminho_comprovante_entrada : item.caminho_comprovante_restante;
                        const valorReferencia = isEntrada ? item.valor_entrada : (item.valor_total - item.valor_entrada);
                        const labelTipo = isEntrada ? "Entrada (Sinal)" : "Restante (Quitação)";

                        return (
                            <div key={item.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-xl transition-all duration-300">
                                
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest border border-indigo-100">
                                                {item.evento_nome}
                                            </span>
                                            <h3 className="text-xl font-bold text-gray-900 mt-2">{item.nome_completo_participante}</h3>
                                            <p className="text-sm font-medium text-gray-400">{formatPhoneNumberDisplay(item.contato_pessoal)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                                        <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600">
                                            <FaExclamationCircle size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-tighter">Tipo de Pagamento</p>
                                            <p className="text-sm text-gray-700 font-medium">
                                                <span className="text-gray-900 font-bold">{labelTipo}</span>
                                                <span className="mx-3 text-gray-300">|</span>
                                                <span className="text-emerald-600 font-bold">R$ {valorReferencia.toFixed(2).replace('.', ',')}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center gap-3 md:min-w-[220px]">
                                    {comprovanteUrl ? (
                                        <a 
                                            href={comprovanteUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl hover:bg-blue-100 font-bold text-sm transition-all active:scale-95"
                                        >
                                            <FaEye /> Visualizar Anexo
                                        </a>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-400 border border-gray-100 rounded-xl text-sm font-medium italic">
                                            Sem anexo disponível
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => setConfirmModal({ isOpen: true, item })}
                                        disabled={processingId === item.id}
                                        className="flex items-center justify-center gap-2 px-4 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {processingId === item.id ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Confirmar Recebimento</>}
                                    </button>

                                    <Link 
                                        href={`/admin/eventos-face-a-face/${item.evento_id}/inscricoes/editar/${item.id}`}
                                        className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors py-1"
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