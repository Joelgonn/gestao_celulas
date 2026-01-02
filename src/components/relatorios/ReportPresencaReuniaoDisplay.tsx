// src/components/relatorios/ReportPresencaReuniaoDisplay.tsx
'use client';

import React from 'react';
import { ReportDataPresencaReuniao } from '@/lib/types';
import { formatDateForDisplay, normalizePhoneNumber, formatPhoneNumberDisplay } from '@/utils/formatters';
import { 
  FaUserCheck, 
  FaUserTimes, 
  FaUserPlus, 
  FaCalendarAlt, 
  FaChild,
  FaChalkboardTeacher,
  FaWhatsapp,
  FaUsers,
  FaMapMarkerAlt
} from 'react-icons/fa';

// --- COMPONENTES AUXILIARES ---

// 1. Card de Estatística (Topo)
const StatsCard = ({ title, value, icon: Icon, colorClass, bgClass }: any) => (
    <div className={`p-4 rounded-2xl border flex items-center justify-between ${bgClass} border-opacity-60 shadow-sm`}>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{title}</p>
            <p className="text-3xl font-black">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colorClass} bg-white bg-opacity-60`}>
            <Icon />
        </div>
    </div>
);

// 2. Card de Participante (Substitui a linha da tabela)
const ParticipantCard = ({ name, phone, type, index }: { name: string, phone?: string | null, type: 'present' | 'absent' | 'visitor', index: number }) => {
    
    // Definição de cores baseada no status
    let borderClass, bgIcon, textIcon, statusText;
    if (type === 'present') {
        borderClass = 'border-emerald-100 hover:border-emerald-300';
        bgIcon = 'bg-emerald-100';
        textIcon = 'text-emerald-600';
        statusText = 'Presente';
    } else if (type === 'visitor') {
        borderClass = 'border-blue-100 hover:border-blue-300';
        bgIcon = 'bg-blue-100';
        textIcon = 'text-blue-600';
        statusText = 'Visitante';
    } else {
        borderClass = 'border-red-100 hover:border-red-300';
        bgIcon = 'bg-red-100';
        textIcon = 'text-red-500';
        statusText = 'Ausente';
    }

    return (
        <div className={`bg-white border ${borderClass} rounded-2xl p-4 shadow-sm transition-all flex items-center justify-between`}>
            <div className="flex items-center gap-4 overflow-hidden">
                {/* Contador / Ícone */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${bgIcon} ${textIcon}`}>
                    {index + 1}
                </div>
                
                <div className="min-w-0">
                    <p className={`text-sm font-bold text-gray-800 truncate ${type === 'absent' ? 'line-through text-gray-400' : ''}`}>
                        {name}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wide ${textIcon}`}>
                            {statusText}
                        </span>
                        {phone && (
                            <span className="text-[10px] text-gray-400 font-medium">
                                • {formatPhoneNumberDisplay(phone)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Botão WhatsApp */}
            <div className="pl-2">
                {phone ? (
                    <a 
                        href={`https://wa.me/55${normalizePhoneNumber(phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 rounded-xl border border-green-200 active:scale-90 transition-all shadow-sm"
                        title="Chamar no WhatsApp"
                    >
                        <FaWhatsapp size={20} />
                    </a>
                ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-300 rounded-xl">
                        <FaWhatsapp size={20} opacity={0.5} />
                    </div>
                )}
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

export const ReportPresencaReuniaoDisplay = ({ data }: { data: ReportDataPresencaReuniao }) => {
    const { reuniao_detalhes, membros_presentes, membros_ausentes, visitantes_presentes } = data;
    
    const safeMembrosPresentes = membros_presentes || [];
    const safeMembrosAusentes = membros_ausentes || [];
    const safeVisitantesPresentes = visitantes_presentes || [];

    const totalMembros = safeMembrosPresentes.length + safeMembrosAusentes.length;
    const taxaPresenca = totalMembros > 0 ? (safeMembrosPresentes.length / totalMembros) * 100 : 0;

    return (
        <div className="space-y-8 font-sans">
            
            {/* 1. DETALHES DA REUNIÃO (Hero Card) */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                {/* Background Decorativo */}
                <FaCalendarAlt className="absolute -right-6 -top-6 text-white opacity-10 w-40 h-40 rotate-12" />
                
                <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Relatório de Reunião</p>
                            <h2 className="text-2xl font-black leading-tight">{reuniao_detalhes.tema}</h2>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold border border-white/10">
                            {formatDateForDisplay(reuniao_detalhes.data_reuniao)}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                        <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-indigo-200 uppercase font-bold mb-1">Ministrador</p>
                            <p className="font-semibold truncate">{reuniao_detalhes.ministrador_principal_nome}</p>
                        </div>
                        {reuniao_detalhes.celula_nome && (
                            <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                <p className="text-[10px] text-indigo-200 uppercase font-bold mb-1">Célula</p>
                                <p className="font-semibold truncate">{reuniao_detalhes.celula_nome}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. CARDS DE ESTATÍSTICAS (Grid) */}
            <div className="grid grid-cols-2 gap-4">
                <StatsCard 
                    title="Presentes" 
                    value={safeMembrosPresentes.length} 
                    icon={FaUserCheck} 
                    bgClass="bg-emerald-50 border-emerald-100 text-emerald-900" 
                    colorClass="text-emerald-600" 
                />
                <StatsCard 
                    title="Visitantes" 
                    value={safeVisitantesPresentes.length} 
                    icon={FaUserPlus} 
                    bgClass="bg-blue-50 border-blue-100 text-blue-900" 
                    colorClass="text-blue-600" 
                />
                <StatsCard 
                    title="Ausentes" 
                    value={safeMembrosAusentes.length} 
                    icon={FaUserTimes} 
                    bgClass="bg-red-50 border-red-100 text-red-900" 
                    colorClass="text-red-600" 
                />
                <StatsCard 
                    title="Crianças" 
                    value={reuniao_detalhes.num_criancas ?? 0} 
                    icon={FaChild} 
                    bgClass="bg-purple-50 border-purple-100 text-purple-900" 
                    colorClass="text-purple-600" 
                />
            </div>

            {/* 3. LISTAS DE PARTICIPANTES (Cards Individuais) */}
            <div className="space-y-8">
                
                {/* Membros Presentes */}
                <div>
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 px-2">
                        <FaUserCheck className="text-emerald-500"/> Membros Presentes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {safeMembrosPresentes.length > 0 ? (
                            safeMembrosPresentes.map((m, idx) => (
                                <ParticipantCard key={m.id} index={idx} name={m.nome} phone={m.telefone} type="present" />
                            ))
                        ) : (
                            <p className="col-span-full text-center text-gray-400 text-xs italic py-4">Nenhum membro presente.</p>
                        )}
                    </div>
                </div>

                {/* Visitantes */}
                {safeVisitantesPresentes.length > 0 && (
                    <div>
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 px-2">
                            <FaUserPlus className="text-blue-500"/> Visitantes
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {safeVisitantesPresentes.map((v, idx) => (
                                <ParticipantCard key={v.id} index={idx} name={v.nome} phone={v.telefone} type="visitor" />
                            ))}
                        </div>
                    </div>
                )}

                {/* Membros Ausentes */}
                {safeMembrosAusentes.length > 0 && (
                    <div>
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 px-2">
                            <FaUserTimes className="text-red-500"/> Membros Ausentes
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {safeMembrosAusentes.map((m, idx) => (
                                <ParticipantCard key={m.id} index={idx} name={m.nome} phone={m.telefone} type="absent" />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Rodapé Taxa de Presença */}
            {totalMembros > 0 && (
                <div className="mt-8 bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Taxa de Frequência</p>
                    <div className="flex items-center justify-center gap-3">
                        <div className="relative w-16 h-16">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="3" />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={taxaPresenca >= 80 ? "#10b981" : taxaPresenca >= 50 ? "#f59e0b" : "#ef4444"} strokeWidth="3" strokeDasharray={`${taxaPresenca}, 100`} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-gray-700">
                                {Math.round(taxaPresenca)}%
                            </div>
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-gray-800">{safeMembrosPresentes.length} de {totalMembros}</p>
                            <p className="text-[10px] text-gray-500">Membros compareceram</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};