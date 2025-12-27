'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    listarEventosFaceAFaceAtivos,
    gerarLinkConvite // <-- Nova função importada
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
    FaLink, // <-- Ícone para o link
    FaWhatsapp, // <-- Ícone do WhatsApp
    FaCopy, // <-- Ícone de copiar
    FaTimes // <-- Ícone de fechar modal
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
            console.error("Erro ao carregar eventos ativos:", e);
            addToast(`Erro ao carregar eventos: ${e.message}`, 'error');
            router.replace('/dashboard');
        } finally {
            setLoading(false);
        }
    }, [addToast, router]);

    useEffect(() => {
        fetchActiveEvents();
    }, [fetchActiveEvents]);

    // Fechar modal ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setShowInviteModal(false);
                setInviteLink(null); // Limpa o link ao fechar
            }
        };
        if (showInviteModal) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showInviteModal]);

    const handleGenerateLink = async (eventoId: string, nomeEvento: string) => {
        setGeneratingLink(true);
        setSelectedEventName(nomeEvento);
        setShowInviteModal(true); // Abre o modal imediatamente
        setInviteLink(null); // Reseta link anterior

        try {
            const result = await gerarLinkConvite(eventoId);
            if (result.success && result.url) {
                setInviteLink(result.url);
            } else {
                addToast(result.message || 'Erro ao gerar link.', 'error');
                setShowInviteModal(false);
            }
        } catch (e: any) {
            console.error("Erro ao gerar link:", e);
            addToast("Erro ao conectar com o servidor.", 'error');
            setShowInviteModal(false);
        } finally {
            setGeneratingLink(false);
        }
    };

    const copyToClipboard = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            addToast('Link copiado para a área de transferência!', 'success');
        }
    };

    const shareOnWhatsApp = () => {
        if (inviteLink) {
            const message = `Olá! Segue o link para sua inscrição no ${selectedEventName}: ${inviteLink}`;
            const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        }
    };

    const getTypeBadge = (type: EventoFaceAFaceTipo) => {
        return type === 'Mulheres'
            ? 'bg-pink-100 text-pink-800'
            : 'bg-blue-100 text-blue-800';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12 relative">
            <ToastContainer />

            {/* MODAL DE CONVITE */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div 
                        ref={modalRef}
                        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                    >
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <FaLink /> Link de Inscrição (24h)
                                </h3>
                                <p className="text-purple-100 text-sm mt-1">Para: {selectedEventName}</p>
                            </div>
                            <button 
                                onClick={() => setShowInviteModal(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            {generatingLink ? (
                                <div className="text-center py-8">
                                    <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-gray-600">Gerando seu link exclusivo...</p>
                                </div>
                            ) : inviteLink ? (
                                <div className="space-y-6">
                                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                                        <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-2">Seu Link (Válido por 24h)</p>
                                        <p className="text-gray-800 font-mono text-sm break-all select-all">{inviteLink}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={copyToClipboard}
                                            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                        >
                                            <FaCopy /> Copiar
                                        </button>
                                        <button 
                                            onClick={shareOnWhatsApp}
                                            className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-colors"
                                        >
                                            <FaWhatsapp size={20} /> WhatsApp
                                        </button>
                                    </div>
                                    
                                    <p className="text-xs text-center text-gray-500">
                                        Este link está vinculado à sua célula. Quando o participante se inscrever, ele aparecerá automaticamente na sua lista.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-red-500 text-center">Erro ao gerar link. Tente novamente.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg px-4 pt-6 pb-12 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                            <FaCalendarCheck /> Inscrições Face a Face
                        </h1>
                        <p className="text-teal-100 text-sm mt-1">Eventos disponíveis para inscrição</p>
                    </div>
                    
                    <button
                        onClick={fetchActiveEvents}
                        className="bg-white text-teal-700 py-2.5 px-6 rounded-xl hover:bg-teal-50 transition-colors font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 w-full md:w-auto"
                        disabled={loading}
                    >
                        <FaSync /> Atualizar Lista
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                
                {eventos.length === 0 && (
                    <div className="text-center p-12 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                        <FaCalendarCheck className="text-4xl text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-700">Nenhum evento ativo encontrado</h3>
                        <p className="text-gray-500 text-sm mb-6">Entre em contato com a administração caso acredite que deveria haver eventos disponíveis.</p>
                        <button 
                            onClick={fetchActiveEvents} 
                            className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 inline-flex items-center gap-2 shadow-md"
                        >
                            <FaSync /> Tentar Novamente
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    {eventos.map((evento) => (
                        <div key={evento.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col justify-between h-full">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-gray-900 text-xl leading-tight">{evento.nome_evento}</h3>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getTypeBadge(evento.tipo)}`}>
                                        {evento.tipo}
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600 mb-4">
                                    <p className="flex items-center gap-2"><FaCalendarAlt className="text-teal-500" /> 
                                        {formatDateForDisplay(evento.data_inicio)} a {formatDateForDisplay(evento.data_fim)}
                                    </p>
                                    <p className="flex items-center gap-2"><FaMapMarkerAlt className="text-teal-500" /> {evento.local_evento}</p>
                                    <p className="flex items-center gap-2"><FaMoneyBillWave className="text-teal-500" /> 
                                        Valor Total: <span className="font-semibold text-gray-800">R$ {evento.valor_total.toFixed(2).replace('.', ',')}</span>
                                    </p>
                                    <p className="flex items-center gap-2"><FaMoneyBillWave className="text-teal-500" /> 
                                        Valor de Entrada: <span className="font-semibold text-gray-800">R$ {evento.valor_entrada.toFixed(2).replace('.', ',')}</span>
                                    </p>
                                    <p className="flex items-center gap-2"><FaCalendarAlt className="text-teal-500" /> 
                                        Limite para Entrada: {formatDateForDisplay(evento.data_limite_entrada)}
                                    </p>
                                    {evento.informacoes_adicionais && (
                                        <div className="flex items-center gap-2"><FaInfoCircle className="text-teal-500" /> 
                                            <p className="text-xs text-gray-500 italic mt-1 line-clamp-2">{evento.informacoes_adicionais}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Botões de Ação */}
                            <div className="space-y-2 mt-auto border-t border-gray-100 pt-4">
                                {/* Botão Novo: Gerar Link */}
                                <button 
                                    onClick={() => handleGenerateLink(evento.id, evento.nome_evento)}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md active:scale-95"
                                >
                                    <FaLink /> Gerar Link de Inscrição
                                </button>

                                <div className="flex gap-2">
                                    <Link 
                                        href={`/eventos-face-a-face/${evento.id}/novo`}
                                        className="flex-1 bg-teal-50 text-teal-700 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-teal-100 transition-colors text-sm"
                                    >
                                        <FaUserPlus /> Manual
                                    </Link>
                                    <Link 
                                        href={`/eventos-face-a-face/${evento.id}/minhas-inscricoes`}
                                        className="flex-1 bg-blue-50 text-blue-700 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-blue-100 transition-colors text-sm"
                                    >
                                        <FaClipboardList /> Listar
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