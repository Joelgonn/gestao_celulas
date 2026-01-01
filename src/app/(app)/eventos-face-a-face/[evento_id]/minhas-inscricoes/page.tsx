'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    listarMinhasInscricoesFaceAFacePorEvento,
    getEventoFaceAFace
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
    FaFileAlt,
    FaEye,
    FaSync,
    FaCheckCircle,
    FaClock,
    FaMoneyBillWave,
    FaWhatsapp,
    FaUser,
    FaUserPlus,
    FaCalendarAlt,
    FaChevronRight,
    FaExclamationCircle
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
            addToast(`Erro ao carregar inscrições: ${e.message}`, 'error');
            router.replace('/eventos-face-a-face');
        } finally {
            setLoading(false);
        }
    }, [eventoId, addToast, router]);

    useEffect(() => {
        async function loadInitialData() {
            if (!eventoId) return;
            try {
                const eventData = await getEventoFaceAFace(eventoId);
                if (!eventData) {
                    addToast('Evento não disponível.', 'error');
                    router.replace('/eventos-face-a-face');
                    return;
                }
                setEvento(eventData);
                await fetchMinhasInscricoes();
            } catch (e: any) {
                router.replace('/eventos-face-a-face');
            }
        }
        loadInitialData();
    }, [eventoId, router, addToast, fetchMinhasInscricoes]);

    const getStatusStyle = (status: InscricaoFaceAFaceStatus) => {
        switch (status) {
            case 'PENDENTE': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'AGUARDANDO_CONFIRMACAO_ENTRADA': 
            case 'AGUARDANDO_CONFIRMACAO_RESTANTE': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'ENTRADA_CONFIRMADA': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'PAGO_TOTAL': return 'bg-green-600 text-white border-transparent';
            case 'CANCELADO': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const getStatusLabel = (status: InscricaoFaceAFaceStatus) => {
        return status.replace(/_/g, ' ');
    };

    if (loading || !evento) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />

            {/* Header Emerald */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 shadow-lg px-4 pt-8 pb-20 sm:px-8 border-b border-green-500/20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10 text-white">
                            <FaUsers size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                {evento.nome_evento}
                            </h1>
                            <p className="text-emerald-100 text-sm font-bold opacity-80 uppercase tracking-widest mt-1">
                                Minhas Inscrições na Célula
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto">
                        <button 
                            onClick={fetchMinhasInscricoes}
                            className="bg-white/10 hover:bg-white/20 text-white p-3.5 rounded-2xl transition-all backdrop-blur-md border border-white/10"
                        >
                            <FaSync />
                        </button>
                        <Link
                            href="/eventos-face-a-face"
                            className="flex-1 md:flex-none bg-white text-emerald-700 py-3.5 px-6 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <FaArrowLeft size={12} /> Voltar
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-10">
                
                {/* Empty State */}
                {minhasInscricoes.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[3rem] shadow-inner border border-dashed border-gray-200">
                        <FaUsers size={48} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-lg font-bold text-gray-400 tracking-tight mb-6">Nenhuma inscrição feita por você nesta edição</h3>
                        <Link 
                            href={`/eventos-face-a-face/${eventoId}/novo`} 
                            className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
                        >
                            Fazer Inscrição Agora
                        </Link>
                    </div>
                )}

                {/* Grid de Inscritos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {minhasInscricoes.map((inscricao) => (
                        <div key={inscricao.id} className="bg-white rounded-[2.5rem] shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                            <div className="p-6 sm:p-8 space-y-6">
                                
                                {/* Topo: Nome e Status */}
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-xl font-black text-gray-900 truncate group-hover:text-emerald-600 transition-colors leading-tight" title={inscricao.nome_completo_participante}>
                                            {inscricao.nome_completo_participante}
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${getStatusStyle(inscricao.status_pagamento)}`}>
                                                {inscricao.status_pagamento === 'PAGO_TOTAL' ? <FaCheckCircle size={10}/> : <FaClock size={10}/>}
                                                {getStatusLabel(inscricao.status_pagamento)}
                                            </span>
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-gray-50 text-gray-500 border-gray-100">
                                                {inscricao.tipo_participacao}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <a 
                                            href={`https://wa.me/55${inscricao.contato_pessoal.replace(/\D/g, '')}`} 
                                            target="_blank" 
                                            className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all active:scale-90"
                                            title="WhatsApp do Candidato"
                                        >
                                            <FaWhatsapp size={20} />
                                        </a>
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-3xl p-5 border border-gray-100">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                                            <FaMoneyBillWave size={10}/> Total
                                        </p>
                                        <p className="text-base font-black text-gray-800">R$ {inscricao.valor_total_evento?.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="space-y-1 border-l border-gray-200 pl-5">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                                            <FaMoneyBillWave size={10}/> Entrada
                                        </p>
                                        <p className="text-base font-black text-emerald-600">R$ {inscricao.valor_entrada_evento?.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                </div>

                                {/* Comprovantes Stats */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-xs font-bold">
                                        <div className={`p-1.5 rounded-lg ${inscricao.caminho_comprovante_entrada ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <FaFileAlt size={12}/>
                                        </div>
                                        <span className={inscricao.caminho_comprovante_entrada ? 'text-gray-700' : 'text-gray-400 italic'}>
                                            {inscricao.caminho_comprovante_entrada ? `Entrada enviada em ${formatDateForDisplay(inscricao.data_upload_entrada || '')}` : 'Comprovante de entrada pendente'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-bold">
                                        <div className={`p-1.5 rounded-lg ${inscricao.caminho_comprovante_restante ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <FaFileAlt size={12}/>
                                        </div>
                                        <span className={inscricao.caminho_comprovante_restante ? 'text-gray-700' : 'text-gray-400 italic'}>
                                            {inscricao.caminho_comprovante_restante ? `Quitação enviada em ${formatDateForDisplay(inscricao.data_upload_restante || '')}` : 'Comprovante de quitação pendente'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="pt-4 border-t border-gray-50">
                                    <Link 
                                        href={`/eventos-face-a-face/${eventoId}/minhas-inscricoes/editar/${inscricao.id}`}
                                        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                                    >
                                        <FaEdit /> Editar e Enviar Comprovantes
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}