// src/app/(app)/eventos-face-a-face/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    listarEventosFaceAFaceAtivos, // <-- Importa a função para líderes
} from '@/lib/data';
import {
    EventoFaceAFace, // <-- Usamos a interface completa, não a Option, para pegar todos os dados relevantes
    EventoFaceAFaceTipo,
} from '@/lib/types';
import { formatDateForDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaPlus,
    FaCalendarCheck,
    FaUsers,
    FaMoneyBillWave,
    FaMapMarkerAlt,
    FaInfoCircle,
    FaUserPlus, // Novo ícone para "Inscrever Membro"
    FaSync,
    FaCalendarAlt,
    FaClipboardList // <-- NOVO: Ícone para "Minhas Inscrições"
} from 'react-icons/fa';

export default function EventosFaceAFacePage() {
    // Não precisamos de useParams() aqui, pois esta página lista TODOS os eventos ativos, não um específico.
    // const params = useParams();
    // const eventoId = params.evento_id as string; // Esta linha causaria erro aqui.

    const [eventos, setEventos] = useState<EventoFaceAFace[]>([]);
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const fetchActiveEvents = useCallback(async () => {
        setLoading(true);
        try {
            // REMOVIDO: if (!eventoId) return; // Esta linha causava o erro, pois eventoId não existe nesta rota.

            const data = await listarEventosFaceAFaceAtivos();
            setEventos(data);
        } catch (e: any) {
            console.error("Erro ao carregar eventos ativos:", e);
            addToast(`Erro ao carregar eventos: ${e.message}`, 'error');
            router.replace('/dashboard'); // Redireciona para dashboard em caso de erro grave/não autorizado
        } finally {
            setLoading(false);
        }
    }, [addToast, router]);

    // Carregar eventos na montagem do componente
    useEffect(() => {
        fetchActiveEvents();
    }, [fetchActiveEvents]);

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
        <div className="min-h-screen bg-gray-50 pb-12">
            <ToastContainer />

            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg px-4 pt-6 pb-12 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                            <FaCalendarCheck /> Inscrições Face a Face
                        </h1>
                        <p className="text-teal-100 text-sm mt-1">Eventos disponíveis para inscrição</p>
                    </div>
                    
                    {/* Botão de atualizar para líderes */}
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
                
                {/* Empty State */}
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

                {/* Cards de Eventos para Líder */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    {eventos.map((evento) => (
                        <div key={evento.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col justify-between">
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
                                            <p className="text-xs text-gray-500 italic mt-1">{evento.informacoes_adicionais.substring(0, 100)}{evento.informacoes_adicionais.length > 100 ? '...' : ''}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="border-t border-gray-100 pt-4 mt-auto flex flex-col sm:flex-row gap-2">
                                <Link 
                                    href={`/eventos-face-a-face/${evento.id}/novo`}
                                    className="flex-1 bg-teal-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-teal-700 transition-colors shadow-md active:scale-95"
                                >
                                    <FaUserPlus size={18} /> Inscrever Membro
                                </Link>
                                <Link // <-- NOVO LINK AQUI!
                                    href={`/eventos-face-a-face/${evento.id}/minhas-inscricoes`}
                                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-blue-700 transition-colors shadow-md active:scale-95"
                                >
                                    <FaClipboardList size={18} /> Minhas Inscrições
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}