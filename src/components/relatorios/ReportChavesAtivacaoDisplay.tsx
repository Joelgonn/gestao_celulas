// src/components/relatorios/ReportChavesAtivacaoDisplay.tsx
'use client';

import React from 'react';
import { ReportDataChavesAtivacao } from '@/lib/types';
import { formatDateForDisplay } from '@/utils/formatters';
import { 
    FaKey, 
    FaCheckCircle, 
    FaUserCheck, 
    FaMapMarkerAlt, 
    FaCalendarAlt, 
    FaEnvelope,
    FaTicketAlt
} from 'react-icons/fa';

// --- COMPONENTES AUXILIARES ---

const StatBadge = ({ label, value, colorClass, bgClass }: any) => (
    <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border ${bgClass} border-opacity-60 text-center`}>
        <span className="text-3xl font-black mb-1">{value}</span>
        <span className={`text-[10px] font-black uppercase tracking-widest ${colorClass}`}>{label}</span>
    </div>
);

const SectionHeader = ({ title, count, icon: Icon, colorClass, bgClass }: any) => (
    <div className={`p-4 rounded-2xl flex items-center justify-between mb-4 ${bgClass}`}>
        <h4 className={`font-black flex items-center gap-2 ${colorClass}`}>
            <Icon /> {title}
        </h4>
        <span className="bg-white/60 px-3 py-1 rounded-lg text-xs font-black shadow-sm">
            {count}
        </span>
    </div>
);

const KeyCard = ({ item, status }: { item: any, status: 'active' | 'used' }) => {
    const isActive = status === 'active';
    
    const borderClass = isActive ? 'border-emerald-100 hover:border-emerald-300' : 'border-blue-100 hover:border-blue-300';
    const bgClass = isActive ? 'bg-white' : 'bg-gray-50';
    const iconColor = isActive ? 'text-emerald-500 bg-emerald-50' : 'text-blue-500 bg-blue-50';
    const keyColor = isActive ? 'text-emerald-800' : 'text-gray-600 decoration-gray-400';

    return (
        <div className={`p-5 rounded-2xl border ${borderClass} ${bgClass} shadow-sm transition-all`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                        {isActive ? <FaKey /> : <FaCheckCircle />}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Código da Chave</p>
                        <p className={`text-lg font-mono font-bold tracking-wide break-all ${keyColor}`}>
                            {item.chave}
                        </p>
                        
                        <div className="mt-3 flex flex-wrap gap-2">
                            {item.celula_nome && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wide">
                                    <FaMapMarkerAlt /> {item.celula_nome}
                                </span>
                            )}
                            
                            {!isActive && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide">
                                    <FaUserCheck /> Usada
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {!isActive && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <FaEnvelope className="text-gray-400" />
                        <span className="font-semibold">{item.usada_por_email || 'Email não registrado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FaCalendarAlt className="text-gray-400" />
                        <span>Resgatada em: {formatDateForDisplay(item.data_uso)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

export const ReportChavesAtivacaoDisplay = ({ data }: { data: ReportDataChavesAtivacao }) => {
    const { chaves_ativas, chaves_usadas, total_chaves } = data;

    const safeChavesAtivas = chaves_ativas || [];
    const safeChavesUsadas = chaves_usadas || [];

    return (
        <div className="space-y-8 font-sans">
            
            {/* 1. RESUMO GERAL */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl p-1 shadow-lg">
                <div className="bg-gray-900 rounded-[22px] p-6 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total de Chaves</p>
                        <h3 className="text-3xl font-black text-white flex items-center gap-3">
                            <FaTicketAlt className="text-emerald-400" /> {total_chaves}
                        </h3>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
                        <FaKey size={20} />
                    </div>
                </div>
            </div>

            {/* 2. CHAVES ATIVAS (DISPONÍVEIS) */}
            <div>
                <SectionHeader 
                    title="Chaves Disponíveis" 
                    count={safeChavesAtivas.length} 
                    icon={FaKey} 
                    bgClass="bg-emerald-50" 
                    colorClass="text-emerald-700" 
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {safeChavesAtivas.length === 0 ? (
                        <div className="col-span-full py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-400 text-sm italic">Nenhuma chave ativa no momento.</p>
                        </div>
                    ) : (
                        safeChavesAtivas.map((chave) => (
                            <KeyCard key={chave.chave} item={chave} status="active" />
                        ))
                    )}
                </div>
            </div>

            {/* 3. CHAVES USADAS (HISTÓRICO) */}
            <div>
                <SectionHeader 
                    title="Chaves Utilizadas" 
                    count={safeChavesUsadas.length} 
                    icon={FaUserCheck} 
                    bgClass="bg-blue-50" 
                    colorClass="text-blue-700" 
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {safeChavesUsadas.length === 0 ? (
                        <div className="col-span-full py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-400 text-sm italic">Nenhuma chave foi utilizada ainda.</p>
                        </div>
                    ) : (
                        safeChavesUsadas.map((chave) => (
                            <KeyCard key={chave.chave} item={chave} status="used" />
                        ))
                    )}
                </div>
            </div>

            {/* Rodapé */}
            <div className="text-center pt-6 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                    Gerenciamento de Acessos e Licenças
                </p>
            </div>
        </div>
    );
};