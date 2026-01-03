'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client'; 
import { atualizarInscricaoFaceAFaceAdmin } from '@/lib/data';
import { InscricaoFaceAFaceStatus } from '@/lib/types';
import { formatPhoneNumberDisplay, normalizePhoneNumber } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import jsPDF from 'jspdf'; 

import {
    FaMoneyBillWave,
    FaCheckCircle,
    FaEye,
    FaEdit,
    FaSync,
    FaArrowLeft,
    FaExclamationCircle,
    FaSpinner,
    FaWhatsapp,
    FaFileInvoiceDollar
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

    // --- FUNÇÃO AUXILIAR PARA CARREGAR A IMAGEM ---
    const getImageData = async (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } else {
                    reject('Canvas context failed');
                }
            };
            img.onerror = (error) => reject(error);
        });
    };

    // --- FUNÇÃO PARA GERAR O RECIBO PDF PERSONALIZADO ---
    const handleGenerateReceipt = async (item: PendenciaFinanceira) => {
        try {
            const doc = new jsPDF();
            
            // Dados
            const isEntrada = item.status_pagamento === 'AGUARDANDO_CONFIRMACAO_ENTRADA';
            const valorPagamento = isEntrada ? item.valor_entrada : (item.valor_total - item.valor_entrada);
            const tipoPagamento = isEntrada ? "SINAL / ENTRADA" : "QUITAÇÃO / RESTANTE";
            const dataAtual = new Date().toLocaleDateString('pt-BR');
            const valorFormatado = valorPagamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // --- CABEÇALHO DA IGREJA ---
            
            // Tenta carregar o logo
            try {
                const logoData = await getImageData('/logo.png'); // Caminho na pasta public
                doc.addImage(logoData, 'PNG', 15, 10, 25, 25); // x, y, w, h
            } catch (err) {
                console.warn("Logo não encontrado, gerando sem logo.");
            }

            // Nome da Igreja (Laranja)
            doc.setTextColor(249, 115, 22); // Cor Laranja (RGB)
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("IGREJA BATISTA APASCENTAR", 50, 20);

            // Endereço (Laranja e Maior) -> MUDANÇA AQUI
            doc.setTextColor(249, 115, 22); // Laranja
            doc.setFontSize(12); // Fonte Maior (era 10)
            doc.setFont("helvetica", "normal");
            doc.text("Rua Estados Unidos, 2111", 50, 27);
            doc.text("Maringá - PR, Brasil", 50, 33); // Ajustei levemente a posição Y

            // Linha Divisória Laranja
            doc.setDrawColor(249, 115, 22);
            doc.setLineWidth(1);
            doc.line(15, 42, 195, 42); // Ajustei levemente a posição Y

            // --- TÍTULO DO RECIBO ---
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text("RECIBO DE PAGAMENTO", 105, 65, { align: "center" });

            // --- CORPO DO RECIBO ---
            let yPos = 85;
            const leftMargin = 20;

            // Caixa de Valor
            doc.setFillColor(255, 247, 237); // Fundo laranja bem claro
            doc.roundedRect(140, 75, 55, 15, 2, 2, 'F');
            doc.setTextColor(249, 115, 22); // Texto Laranja
            doc.setFontSize(16);
            doc.text(`${valorFormatado}`, 167.5, 85, { align: "center" });

            // Texto descritivo
            yPos += 15;
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            
            const textoRecibo = `Recebemos de ${item.nome_completo_participante.toUpperCase()}, a importância de ${valorFormatado}, referente ao pagamento de ${tipoPagamento} para participação no evento ${item.evento_nome.toUpperCase()}.`;
            
            const splitText = doc.splitTextToSize(textoRecibo, 170);
            doc.text(splitText, leftMargin, yPos);
            yPos += (splitText.length * 7) + 15;

            // Detalhes
            doc.setFont("helvetica", "bold");
            doc.text("Data do Recebimento:", leftMargin, yPos);
            doc.setFont("helvetica", "normal");
            doc.text(dataAtual, leftMargin + 50, yPos);
            yPos += 10;

            doc.setFont("helvetica", "bold");
            doc.text("Status:", leftMargin, yPos);
            doc.setTextColor(0, 128, 0); // Verde para "Confirmado"
            doc.text("PAGAMENTO CONFIRMADO", leftMargin + 50, yPos);
            
            // --- ASSINATURA ---
            yPos += 50;
            doc.setDrawColor(150);
            doc.setLineWidth(0.5);
            doc.line(60, yPos, 150, yPos); // Linha de assinatura
            
            yPos += 7;
            doc.setTextColor(100);
            doc.setFontSize(10);
            doc.text("Departamento Financeiro", 105, yPos, { align: "center" });
            doc.text("Igreja Batista Apascentar", 105, yPos + 5, { align: "center" });

            // --- RODAPÉ ---
            doc.setFontSize(8);
            doc.setTextColor(180);
            doc.text("Recibo gerado eletronicamente pelo Sistema de Gestão de Células.", 105, 280, { align: "center" });

            // Salvar e Avisar
            const nomeArquivo = `Recibo_${item.nome_completo_participante.replace(/\s+/g, '_')}.pdf`;
            doc.save(nomeArquivo);
            addToast("Recibo gerado com sucesso!", "success");

        } catch (e) {
            console.error(e);
            addToast("Erro ao gerar recibo.", "error");
        }
    };

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
                                            
                                            {/* CONTATO + WHATSAPP */}
                                            {item.contato_pessoal && (
                                                <a 
                                                    href={`https://wa.me/55${normalizePhoneNumber(item.contato_pessoal)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 mt-1 text-sm font-medium text-gray-500 hover:text-green-600 transition-colors group"
                                                    title="Abrir WhatsApp Web"
                                                >
                                                    <FaWhatsapp className="text-green-500 group-hover:scale-110 transition-transform" />
                                                    {formatPhoneNumberDisplay(item.contato_pessoal)}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* INFO FINANCEIRA */}
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

                                {/* AÇÕES */}
                                <div className="flex flex-col justify-center gap-2 md:min-w-[220px]">
                                    
                                    {/* BOTÃO GERAR RECIBO (NOVO) */}
                                    <button 
                                        onClick={() => handleGenerateReceipt(item)}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl hover:bg-purple-100 font-bold text-sm transition-all active:scale-95 mb-1"
                                        title="Baixar PDF para enviar no WhatsApp"
                                    >
                                        <FaFileInvoiceDollar /> Gerar Recibo
                                    </button>

                                    {comprovanteUrl ? (
                                        <a 
                                            href={comprovanteUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl hover:bg-blue-100 font-bold text-sm transition-all active:scale-95"
                                        >
                                            <FaEye /> Ver Comprovante
                                        </a>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-400 border border-gray-100 rounded-xl text-sm font-medium italic">
                                            Sem anexo
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
                                        className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors py-1 mt-1"
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