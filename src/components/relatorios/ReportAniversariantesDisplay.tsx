// src/components/relatorios/ReportAniversariantesDisplay.tsx
'use client';

import React from 'react';
import { ReportDataAniversariantes } from '@/lib/types';
import { formatDateForDisplay, normalizePhoneNumber } from '@/utils/formatters';
import { 
    FaBirthdayCake, 
    FaWhatsapp, 
    FaUser, 
    FaUserPlus, 
    FaMapMarkerAlt,
    FaCalendarAlt,
    FaGift
} from 'react-icons/fa';

// --- COMPONENTES AUXILIARES ---

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

const BirthdayCard = ({ person, type }: { person: any, type: 'member' | 'visitor' }) => {
    const isMember = type === 'member';
    
    // Cores baseadas no tipo
    const borderClass = isMember ? 'border-emerald-100' : 'border-blue-100';
    const bgIconClass = isMember ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600';
    const dateClass = isMember ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50';
    const Icon = isMember ? FaUser : FaUserPlus;

    // Extrair dia e mês para destaque
    const dateObj = new Date(person.data_nascimento);
    const day = dateObj.getUTCDate(); // Usar UTC para evitar problemas de fuso
    
    return (
        <div className={`bg-white border ${borderClass} p-4 rounded-2xl shadow-sm flex items-center justify-between transition-all hover:shadow-md`}>
            <div className="flex items-center gap-4 overflow-hidden">
                {/* Ícone ou Dia do Aniversário */}
                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 ${dateClass} font-black border border-white shadow-sm`}>
                    <span className="text-lg leading-none">{day}</span>
                    <FaBirthdayCake className="text-[10px] opacity-50" />
                </div>

                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{person.nome}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                            <FaMapMarkerAlt size={8} /> {person.celula_nome || 'Sem Célula'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                            {formatDateForDisplay(person.data_nascimento)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Ações */}
            <div className="pl-2">
                {person.telefone ? (
                    <a 
                        href={`https://wa.me/55${normalizePhoneNumber(person.telefone)}?text=Parabéns pelo seu dia! 🎉`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 rounded-xl border border-green-200 active:scale-90 transition-all shadow-sm"
                        title="Enviar Parabéns no WhatsApp"
                    >
                        <FaWhatsapp size={20} />
                    </a>
                ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-300 rounded-xl">
                        <FaWhatsapp size={20} />
                    </div>
                )}
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

export const ReportAniversariantesDisplay = ({ data }: { data: ReportDataAniversariantes }) => {
    const { mes, ano_referencia, membros, visitantes } = data;

    // Formatar nome do mês
    const mesNome = new Date(ano_referencia, mes - 1).toLocaleString('pt-BR', { month: 'long' });
    const mesFormatado = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);

    const safeMembros = membros || [];
    const safeVisitantes = visitantes || [];
    const totalAniversariantes = safeMembros.length + safeVisitantes.length;

    return (
        <div className="space-y-8 font-sans">
            
            {/* Cabeçalho do Mês */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <FaGift className="absolute -right-6 -bottom-6 text-white opacity-20 w-32 h-32 rotate-12" />
                <div className="relative z-10">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Aniversariantes de</p>
                    <h2 className="text-3xl font-black">{mesFormatado}</h2>
                    <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl text-sm font-bold">
                        <FaBirthdayCake /> {totalAniversariantes} Pessoas celebrando
                    </div>
                </div>
            </div>

            {/* Lista de Membros */}
            <div>
                <SectionHeader 
                    title="Membros" 
                    count={safeMembros.length} 
                    icon={FaUser} 
                    bgClass="bg-emerald-50" 
                    colorClass="text-emerald-700" 
                />
                
                <div className="space-y-3">
                    {safeMembros.length === 0 ? (
                        <p className="text-center text-gray-400 text-xs italic py-4">Nenhum membro aniversariante.</p>
                    ) : (
                        safeMembros.map((m) => (
                            <BirthdayCard key={m.id} person={m} type="member" />
                        ))
                    )}
                </div>
            </div>

            {/* Lista de Visitantes */}
            <div>
                <SectionHeader 
                    title="Visitantes" 
                    count={safeVisitantes.length} 
                    icon={FaUserPlus} 
                    bgClass="bg-blue-50" 
                    colorClass="text-blue-700" 
                />
                
                <div className="space-y-3">
                    {safeVisitantes.length === 0 ? (
                        <p className="text-center text-gray-400 text-xs italic py-4">Nenhum visitante aniversariante.</p>
                    ) : (
                        safeVisitantes.map((v) => (
                            <BirthdayCard key={v.id} person={v} type="visitor" />
                        ))
                    )}
                </div>
            </div>

            {safeMembros.length === 0 && safeVisitantes.length === 0 && (
                <div className="text-center py-12 opacity-50">
                    <FaCalendarAlt className="mx-auto text-4xl text-gray-300 mb-2" />
                    <p className="text-gray-500 font-bold">Sem aniversários registrados em {mesFormatado}.</p>
                </div>
            )}
        </div>
    );
};