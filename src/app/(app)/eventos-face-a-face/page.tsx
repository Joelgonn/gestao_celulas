'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    listarEventosFaceAFaceAtivos,
    gerarLinkConvite
} from '@/lib/data';
import {
    EventoFaceAFace,
    EventoFaceAFaceTipo,
} from '@/lib/types';
import { formatDateForDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaCalendarCheck,
    FaMoneyBillWave,
    FaMapMarkerAlt,
    FaInfoCircle,
    FaUserPlus,
    FaSync,
    FaCalendarAlt,
    FaClipboardList,
    FaLink,
    FaWhatsapp,
    FaCopy,
    FaTimes,
    FaArrowLeft,
    FaClock // Adicionado para corrigir o erro de build
} from 'react-icons/fa';

export default function EventosFaceAFacePage() {
    const [eventos, setEventos] = useState<EventoFaceAFace[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para o Modal de Convite
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [generatingLink, setGeneratingLink] = useState(false);
    const [selectedEventName, setSelectedEventName] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const fetchActiveEvents = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listarEventosFaceAFaceAtivos();
            setEventos(data);
        } catch (e: any) {
            addToast(`Erro ao carregar eventos: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => { fetchActiveEvents(); }, [fetchActiveEvents]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setShowInviteModal(false);
                setInviteLink(null);
            }
        };
        if (showInviteModal) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showInviteModal]);

    const handleGenerateLink = async (eventoId: string, nomeEvento: string) => {
        setGeneratingLink(true);
        setSelectedEventName(nomeEvento);
        setShowInviteModal(true);
        setInviteLink(null);

        try {
            const result = await gerarLinkConvite(eventoId);
            if (result.success && result.url) {
                setInviteLink(result.url);
            } else {
                addToast(result.message || 'Erro ao gerar link.', 'error');
                setShowInviteModal(false);
            }
        } catch (e) {
            addToast("Erro ao conectar com o servidor.", 'error');
            setShowInviteModal(false);
        } finally {
            setGeneratingLink(false);
        }
    };

    const copyToClipboard = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            addToast('Link copiado!', 'success');
        }
    };

    const shareOnWhatsApp = () => {
        if (inviteLink) {
            const message = `Olá! Segue o link para sua inscrição no ${selectedEventName}: ${inviteLink}`;
            const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans relative">
            <ToastContainer />

            {/* MODAL DE CONVITE PROFISSIONAL */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
                    <div 
                        ref={modalRef}
                        className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                    >
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-8 text-white relative">
                            <button 
                                onClick={() => setShowInviteModal(false)}
                                className="absolute right-6 top-6 p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all cursor-pointer"
                            >
                                <FaTimes size={16} />
                            </button>
                            <div className="p-3 bg-white/20 w-fit rounded-2xl mb-4">
                                <FaLink size={24} />
                            </div>
                            <h3 className="text-2xl font-black tracking-tight">Link de Inscrição</h3>
                            <p className="text-purple-100 text-sm font-bold mt-1 uppercase tracking-widest">{selectedEventName}</p>
                        </div>

                        <div className="p-8">
                            {generatingLink ? (
                                <div className="text-center py-10 space-y-4">
                                    <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
                                    <p className="text-gray-500 font-bold animate-pulse uppercase text-xs tracking-widest">Gerando link exclusivo...</p>
                                </div>
                            ) : inviteLink ? (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] p-5 text-center transition-all hover:border-purple-200">
                                        <p className="text-[10px] text-purple-600 font-black uppercase tracking-widest mb-3">Válido por 24 horas</p>
                                        <p className="text-gray-800 font-mono text-sm break-all font-bold select-all">{inviteLink}</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <button 
                                            onClick={shareOnWhatsApp}
                                            className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white py-4 rounded-2xl font-black shadow-lg shadow-green-100 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                        >
                                            <FaWhatsapp size={20} /> ENVIAR VIA WHATSAPP
                                        </button>
                                        <button 
                                            onClick={copyToClipboard}
                                            className="w-full flex items-center justify-center gap-3 bg-gray-100 text-gray-700 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95 cursor-pointer"
                                        >
                                            <FaCopy /> COPIAR LINK
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* Header Teal */}
            <div className="bg-gradient-to-br from-teal-600 to-emerald-700 shadow-lg px-4 pt-8 pb-20 sm:px-8 border-b border-teal-500/20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10 text-white">
                            <FaCalendarCheck size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Inscrições Abertas</h1>
                            <p className="text-teal-50 text-sm font-bold opacity-80 uppercase tracking-widest">Face a Face</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={fetchActiveEvents}
                            className="bg-white/10 hover:bg-white/20 text-white p-3.5 rounded-2xl transition-all backdrop-blur-md border border-white/10 cursor-pointer"
                        >
                            <FaSync className={loading ? 'animate-spin' : ''} />
                        </button>
                        <Link href="/dashboard" className="flex-1 md:flex-none bg-white text-teal-700 py-3.5 px-8 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <FaArrowLeft size={12} /> Dashboard
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {eventos.map((evento) => (
                        <div key={evento.id} className="bg-white rounded-[2.5rem] shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col group">
                            <div className="p-8 space-y-6 flex-1">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="min-w-0 flex-1">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                                            evento.tipo === 'Mulheres' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                        }`}>
                                            {evento.tipo}
                                        </span>
                                        <h3 className="text-2xl font-black text-gray-900 mt-3 group-hover:text-teal-600 transition-colors leading-tight">
                                            {evento.nome_evento}
                                        </h3>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xl font-black text-gray-800">R$ {evento.valor_total.toFixed(2).replace('.', ',')}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Investimento</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-3xl p-5 border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl shadow-sm text-teal-600"><FaCalendarAlt size={14}/></div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-gray-400 uppercase truncate">Datas do Evento</p>
                                            <p className="text-xs font-bold text-gray-700">{formatDateForDisplay(evento.data_inicio)} a {formatDateForDisplay(evento.data_fim)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl shadow-sm text-orange-600"><FaMapMarkerAlt size={14}/></div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-gray-400 uppercase truncate">Local</p>
                                            <p className="text-xs font-bold text-gray-700 truncate" title={evento.local_evento}>{evento.local_evento}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-xs font-bold text-gray-400 px-2">
                                    <FaClock className="text-amber-500" />
                                    <span>Limite para entrada: <span className="text-gray-600">{formatDateForDisplay(evento.data_limite_entrada)}</span></span>
                                </div>

                                {evento.informacoes_adicionais && (
                                    <div className="bg-teal-50/50 p-4 rounded-2xl flex gap-3 border border-teal-100/50">
                                        <FaInfoCircle className="text-teal-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-teal-800 italic leading-relaxed line-clamp-3">{evento.informacoes_adicionais}</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-8 pt-0 mt-auto flex flex-col gap-3">
                                <button 
                                    onClick={() => handleGenerateLink(evento.id, evento.nome_evento)}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-5 rounded-2xl font-black text-base shadow-lg shadow-purple-100 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
                                >
                                    <FaLink /> GERAR LINK DE CONVITE
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <Link 
                                        href={`/eventos-face-a-face/${evento.id}/novo`}
                                        className="bg-gray-100 text-gray-600 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs hover:bg-gray-200 transition-all"
                                    >
                                        <FaUserPlus /> MANUAL
                                    </Link>
                                    <Link 
                                        href={`/eventos-face-a-face/${evento.id}/minhas-inscricoes`}
                                        className="bg-teal-50 text-teal-700 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs hover:bg-teal-100 transition-all border border-teal-100"
                                    >
                                        <FaClipboardList /> MINHA LISTA
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