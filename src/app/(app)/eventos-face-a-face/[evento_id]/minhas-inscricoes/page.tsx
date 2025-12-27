// src/app/(app)/eventos-face-a-face/[evento_id]/minhas-inscricoes/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    listarMinhasInscricoesFaceAFacePorEvento,
    getEventoFaceAFace // Para obter o nome do evento
} from '@/lib/data';
import {
    InscricaoFaceAFace,
    InscricaoFaceAFaceStatus,
    EventoFaceAFace
} from '@/lib/types';
import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaArrowLeft,
    FaUsers,
    FaEdit,
    FaFileAlt, // Comprovante
    FaEye,     // Visualizar
    FaUpload,  // Upload
    FaSync,
    FaCheckCircle,
    FaTimesCircle,
    FaClock,
    FaMoneyBillWave,
    FaWhatsapp,
    FaUser,
    FaPhone,
    FaChurch,
    FaInfoCircle,
    FaUserPlus,
    FaCalendarAlt
} from 'react-icons/fa';

export default function LiderMinhasInscricoesPage() {
    const params = useParams();
    const eventoId = params.evento_id as string;

    const [evento, setEvento] = useState<EventoFaceAFace | null>(null);
    const [minhasInscricoes, setMinhasInscricoes] = useState<InscricaoFaceAFace[]>([]);
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const fetchMinhasInscricoes = useCallback(async () => {
        setLoading(true);
        try {
            if (!eventoId) return;

            const fetchedInscricoes = await listarMinhasInscricoesFaceAFacePorEvento(eventoId);
            setMinhasInscricoes(fetchedInscricoes);
        } catch (e: any) {
            console.error("Erro ao carregar minhas inscrições:", e);
            addToast(`Erro ao carregar suas inscrições: ${e.message}`, 'error');
            // Opcional: Redirecionar se não tiver permissão ou evento inválido
            router.replace('/eventos-face-a-face');
        } finally {
            setLoading(false);
        }
    }, [eventoId, addToast, router]);

    // Carregar nome do evento e minhas inscrições
    useEffect(() => {
        async function loadInitialData() {
            setLoading(true);
            try {
                const eventData = await getEventoFaceAFace(eventoId);
                if (!eventData) {
                    addToast('Evento não encontrado ou não disponível para inscrição.', 'error');
                    router.replace('/eventos-face-a-face');
                    return;
                }
                setEvento(eventData);
                await fetchMinhasInscricoes();

            } catch (e: any) {
                console.error("Erro ao carregar dados iniciais da página de minhas inscrições:", e);
                addToast(`Erro ao carregar dados da página: ${e.message}`, 'error');
                router.replace('/eventos-face-a-face');
            } finally {
                // setLoading(false); // Removido para evitar loop com fetchMinhasInscricoes
            }
        }

        if (eventoId) {
            loadInitialData();
        }
    }, [eventoId, router, addToast, fetchMinhasInscricoes]);


    const getStatusBadge = (status: InscricaoFaceAFaceStatus) => {
        switch (status) {
            case 'PENDENTE': return 'bg-yellow-100 text-yellow-800';
            case 'AGUARDANDO_CONFIRMACAO_ENTRADA': return 'bg-orange-100 text-orange-800';
            case 'ENTRADA_CONFIRMADA': return 'bg-blue-100 text-blue-800';
            case 'AGUARDANDO_CONFIRMACAO_RESTANTE': return 'bg-purple-100 text-purple-800';
            case 'PAGO_TOTAL': return 'bg-green-100 text-green-800';
            case 'CANCELADO': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: InscricaoFaceAFaceStatus) => {
        const options = [
            { id: 'PENDENTE', nome: 'Pendente' },
            { id: 'AGUARDANDO_CONFIRMACAO_ENTRADA', nome: 'Aguardando Conf. Entrada' },
            { id: 'ENTRADA_CONFIRMADA', nome: 'Entrada Confirmada' },
            { id: 'AGUARDANDO_CONFIRMACAO_RESTANTE', nome: 'Aguardando Conf. Restante' },
            { id: 'PAGO_TOTAL', nome: 'Pago Total' },
            { id: 'CANCELADO', nome: 'Cancelado' },
        ];
        const option = options.find(o => o.id === status);
        return option ? option.nome : status;
    };

    const isUploadEntradaEnabled = (status: InscricaoFaceAFaceStatus) => {
        return status === 'PENDENTE' || status === 'AGUARDANDO_CONFIRMACAO_ENTRADA';
    };

    const isUploadRestanteEnabled = (status: InscricaoFaceAFaceStatus) => {
        return status === 'ENTRADA_CONFIRMADA' || status === 'AGUARDANDO_CONFIRMACAO_RESTANTE';
    };

    if (loading || !evento) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <ToastContainer />

            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg px-4 pt-6 pb-12 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                            <FaUsers /> Minhas Inscrições para: {evento.nome_evento}
                        </h1>
                        <p className="text-green-100 text-sm mt-1">Gerencie suas inscrições e envie comprovantes.</p>
                    </div>
                    
                    <Link
                        href="/eventos-face-a-face"
                        className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"
                    >
                        <FaArrowLeft className="w-3 h-3 mr-2" />
                        Voltar para Eventos
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                
                {/* Botão de Atualizar (para líderes) */}
                <div className="flex justify-end mb-6">
                    <button
                        onClick={fetchMinhasInscricoes}
                        className="bg-gray-100 text-gray-700 py-2.5 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex items-center justify-center gap-2 active:scale-95"
                        disabled={loading}
                    >
                        <FaSync /> Atualizar Lista
                    </button>
                </div>

                {/* Empty State */}
                {minhasInscricoes.length === 0 && (
                    <div className="text-center p-12 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                        <FaUsers className="text-4xl text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-700">Nenhuma inscrição encontrada</h3>
                        <p className="text-gray-500 text-sm mb-6">Você ainda não realizou nenhuma inscrição para este evento.</p>
                        <Link 
                            href={`/eventos-face-a-face/${eventoId}/novo`} 
                            className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 inline-flex items-center gap-2 shadow-md"
                        >
                            <FaUserPlus /> Fazer Nova Inscrição
                        </Link>
                    </div>
                )}

                {/* Cards de Minhas Inscrições */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    {minhasInscricoes.map((inscricao) => (
                        <div key={inscricao.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-gray-900 text-xl leading-tight">{inscricao.nome_completo_participante}</h3>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusBadge(inscricao.status_pagamento)}`}>
                                        {getStatusText(inscricao.status_pagamento)}
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600 mb-4">
                                    <p className="flex items-center gap-2"><FaUser className="text-green-500" /> 
                                        {inscricao.tipo_participacao}
                                    </p>
                                    <p className="flex items-center gap-2"><FaPhone className="text-green-500" /> 
                                        Contato: {formatPhoneNumberDisplay(inscricao.contato_pessoal)}
                                        <a 
                                            href={`https://wa.me/55${inscricao.contato_pessoal.replace(/\D/g, '')}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-green-500 hover:text-green-600 ml-1"
                                            title="Enviar WhatsApp"
                                        >
                                            <FaWhatsapp size={16} />
                                        </a>
                                    </p>
                                    <p className="flex items-center gap-2"><FaChurch className="text-green-500" /> 
                                        Célula: {inscricao.celula_participante_nome || inscricao.celula_inscricao_nome || 'N/A'}
                                    </p>
                                    <p className="flex items-center gap-2"><FaMoneyBillWave className="text-green-500" /> 
                                        Valor Total: <span className="font-semibold text-gray-800">R$ {inscricao.valor_total_evento?.toFixed(2).replace('.', ',') || '0,00'}</span>
                                    </p>
                                    <p className="flex items-center gap-2"><FaMoneyBillWave className="text-green-500" /> 
                                        Valor Entrada: <span className="font-semibold text-gray-800">R$ {inscricao.valor_entrada_evento?.toFixed(2).replace('.', ',') || '0,00'}</span>
                                    </p>
                                    {inscricao.caminho_comprovante_entrada && (
                                        <p className="flex items-center gap-2 text-xs italic text-gray-500">
                                            <FaFileAlt /> Comprovante Entrada enviado ({inscricao.data_upload_entrada ? formatDateForDisplay(inscricao.data_upload_entrada) : 'N/A'})
                                        </p>
                                    )}
                                    {inscricao.caminho_comprovante_restante && (
                                        <p className="flex items-center gap-2 text-xs italic text-gray-500">
                                            <FaFileAlt /> Comprovante Restante enviado ({inscricao.data_upload_restante ? formatDateForDisplay(inscricao.data_upload_restante) : 'N/A'})
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="border-t border-gray-100 pt-4 mt-auto flex flex-col gap-2">
                                <Link 
                                    href={`/eventos-face-a-face/${eventoId}/minhas-inscricoes/editar/${inscricao.id}`}
                                    className="w-full bg-green-50 text-green-600 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-medium text-sm hover:bg-green-100 transition-colors"
                                >
                                    <FaEdit size={16} /> Editar Inscrição / Enviar Comprovante
                                </Link>
                                {/* Botões para upload direto, se necessário, ou dentro da página de edição */}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}