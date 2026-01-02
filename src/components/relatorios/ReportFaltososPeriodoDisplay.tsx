// src/components/relatorios/ReportFaltososPeriodoDisplay.tsx
'use client';

import React from 'react';
import { ReportDataFaltososPeriodo } from '@/lib/types';
import { formatDateForDisplay, normalizePhoneNumber } from '@/utils/formatters';
import { 
    FaUserTimes, 
    FaCalendarAlt, 
    FaMapMarkerAlt, 
    FaWhatsapp, 
    FaExclamationCircle,
    FaChartPie
} from 'react-icons/fa';

// --- COMPONENTES AUXILIARES ---

const PeriodHeader = ({ start, end, total }: { start: string, end: string, total: number }) => (
    <div className="bg-white border border-red-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-xl">
                <FaUserTimes />
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
            <span className="text-3xl font-black text-red-600">{total}</span>
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Membros Faltosos</span>
        </div>
    </div>
);

const AbsenteeCard = ({ member }: { member: any }) => {
    // Cálculo de frequência (mesmo que seja baixa/zero)
    const totalReunioes = member.total_reunioes_no_periodo;
    const presencas = member.total_presencas;
    const faltas = totalReunioes - presencas;
    
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            {/* Barra lateral de alerta */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-400"></div>

            <div className="flex items-start justify-between gap-4 pl-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-gray-800 text-lg truncate">{member.nome}</h4>
                        {member.celula_nome && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider border border-gray-200 truncate max-w-[120px]">
                                <FaMapMarkerAlt size={8} /> {member.celula_nome}
                            </span>
                        )}
                    </div>

                    {/* Estatísticas de Falta */}
                    <div className="flex flex-wrap gap-3 mt-3">
                        <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                            <FaExclamationCircle className="text-red-500 text-xs" />
                            <div className="flex flex-col leading-none">
                                <span className="text-[10px] font-bold text-red-400 uppercase">Faltas</span>
                                <span className="text-sm font-black text-red-700">{faltas}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                            <FaChartPie className="text-gray-400 text-xs" />
                            <div className="flex flex-col leading-none">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Comparecimento</span>
                                <span className="text-sm font-bold text-gray-600">{presencas} <span className="text-gray-400 text-xs font-normal">de {totalReunioes}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ação (WhatsApp) */}
                <div className="flex flex-col items-center justify-center gap-1 pl-2 border-l border-gray-50">
                    {member.telefone ? (
                        <a 
                            href={`https://wa.me/55${normalizePhoneNumber(member.telefone)}?text=Olá ${member.nome}, sentimos sua falta nas últimas reuniões da célula! Está tudo bem?`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 flex items-center justify-center bg-green-50 text-green-600 rounded-2xl border border-green-200 active:scale-90 transition-all shadow-sm hover:bg-green-100"
                            title="Enviar mensagem"
                        >
                            <FaWhatsapp size={24} />
                        </a>
                    ) : (
                        <div className="w-12 h-12 flex items-center justify-center bg-gray-100 text-gray-300 rounded-2xl cursor-not-allowed">
                            <FaWhatsapp size={24} />
                        </div>
                    )}
                    <span className="text-[9px] font-bold text-gray-300 uppercase">Contato</span>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

export const ReportFaltososPeriodoDisplay = ({ data }: { data: ReportDataFaltososPeriodo }) => {
    const { faltosos, periodo } = data;
    const safeFaltosos = faltosos || [];

    return (
        <div className="space-y-8 font-sans">
            
            {/* Header com Resumo */}
            <PeriodHeader 
                start={periodo.start_date} 
                end={periodo.end_date} 
                total={safeFaltosos.length} 
            />

            {/* Lista de Faltosos */}
            <div>
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 px-2">
                    <FaUserTimes /> Lista de Ausentes
                </h3>

                {safeFaltosos.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {safeFaltosos.map((f) => (
                            <AbsenteeCard key={f.id} member={f} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-emerald-50 rounded-3xl border border-emerald-100">
                        <div className="inline-block p-4 bg-white rounded-full text-emerald-500 mb-3 shadow-sm">
                            <FaChartPie size={32} />
                        </div>
                        <h4 className="text-lg font-black text-emerald-800">Parabéns!</h4>
                        <p className="text-emerald-600 text-sm font-medium mt-1">Nenhum membro faltoso encontrado neste período.</p>
                    </div>
                )}
            </div>

            {/* Rodapé Informativo */}
            {safeFaltosos.length > 0 && (
                <div className="text-center pt-4 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                        Considerando membros com baixa frequência no período selecionado.
                    </p>
                </div>
            )}
        </div>
    );
};