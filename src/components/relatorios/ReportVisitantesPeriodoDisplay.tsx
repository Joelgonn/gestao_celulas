// src/components/relatorios/ReportVisitantesPeriodoDisplay.tsx
'use client';

import React from 'react';
import { ReportDataVisitantesPeriodo } from '@/lib/types';
import { formatDateForDisplay, normalizePhoneNumber, formatPhoneNumberDisplay } from '@/utils/formatters';
import { 
    FaUserPlus, 
    FaCalendarAlt, 
    FaWhatsapp, 
    FaMapMarkerAlt,
    FaInfoCircle
} from 'react-icons/fa';

// --- COMPONENTES AUXILIARES ---

const PeriodHeader = ({ start, end, total }: { start: string, end: string, total: number }) => (
    <div className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-xl">
                <FaUserPlus />
            </div>
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Período Analisado</p>
                <div className="flex items-center gap-2 text-gray-800 font-bold">
                    <FaCalendarAlt className="text-gray-400 text-xs" />
                    <span>{formatDateForDisplay(start)}</span>
                    <span className="text-gray-300">até</span>
                    <span>{formatDateForDisplay(end)}</span>
                </div>
            </div>
        </div>
        <div className="flex flex-col items-end">
            <span className="text-3xl font-black text-indigo-600">{total}</span>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Novos Visitantes</span>
        </div>
    </div>
);

const VisitorCard = ({ visitor }: { visitor: any }) => {
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4 overflow-hidden">
                {/* Ícone Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 text-lg">
                    <FaUserPlus />
                </div>

                <div className="min-w-0">
                    <h4 className="font-bold text-gray-800 text-sm truncate">{visitor.nome}</h4>
                    
                    <div className="flex flex-col gap-1 mt-1">
                        {/* Data da Visita */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <FaCalendarAlt className="text-indigo-300" />
                            <span>1ª Visita: <span className="font-semibold text-gray-700">{formatDateForDisplay(visitor.data_primeira_visita)}</span></span>
                        </div>

                        {/* Célula (se houver essa info no backend) */}
                        {visitor.celula_nome && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider border border-gray-200 w-fit">
                                <FaMapMarkerAlt size={8} /> {visitor.celula_nome}
                            </span>
                        )}
                        
                        {/* Exibe telefone formatado se não tiver WhatsApp, apenas para visualização */}
                        {visitor.telefone && (
                            <span className="text-[10px] text-gray-400 md:hidden">
                                {formatPhoneNumberDisplay(visitor.telefone)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Ação (WhatsApp) */}
            <div className="pl-3 border-l border-gray-50 ml-2">
                {visitor.telefone ? (
                    <a 
                        href={`https://wa.me/55${normalizePhoneNumber(visitor.telefone)}?text=Olá ${visitor.nome}, ficamos muito felizes com sua visita na célula!`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 flex items-center justify-center bg-green-50 text-green-600 rounded-2xl border border-green-200 active:scale-90 transition-all shadow-sm hover:bg-green-100"
                        title="Dar boas vindas"
                    >
                        <FaWhatsapp size={24} />
                    </a>
                ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-gray-100 text-gray-300 rounded-2xl cursor-not-allowed">
                        <FaWhatsapp size={24} opacity={0.5} />
                    </div>
                )}
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

export const ReportVisitantesPeriodoDisplay = ({ data }: { data: ReportDataVisitantesPeriodo }) => {
    const { visitantes, periodo } = data;
    const safeVisitantes = visitantes || [];

    return (
        <div className="space-y-8 font-sans">
            
            {/* Header com Resumo */}
            <PeriodHeader 
                start={periodo.start_date} 
                end={periodo.end_date} 
                total={safeVisitantes.length} 
            />

            {/* Lista de Visitantes */}
            <div>
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 px-2">
                    <FaUserPlus className="text-indigo-500" /> Lista de Visitantes
                </h3>

                {safeVisitantes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {safeVisitantes.map((v: any) => (
                            <VisitorCard key={v.id} visitor={v} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <div className="inline-block p-4 bg-white rounded-full text-gray-300 mb-3 shadow-sm">
                            <FaUserPlus size={32} />
                        </div>
                        <p className="text-gray-500 text-sm font-bold">Nenhum visitante registrado neste período.</p>
                    </div>
                )}
            </div>

            {/* Rodapé Informativo */}
            {safeVisitantes.length > 0 && (
                <div className="bg-blue-50 rounded-2xl p-4 flex gap-3 items-start border border-blue-100">
                    <FaInfoCircle className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                        <strong>Dica de Consolidação:</strong> Clique no ícone do WhatsApp para enviar uma mensagem de boas-vindas personalizada para cada visitante. O contato rápido aumenta a chance de retenção!
                    </p>
                </div>
            )}
        </div>
    );
};