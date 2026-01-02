// src/components/relatorios/ReportAlocacaoLideresDisplay.tsx
'use client';

import React from 'react';
import { ReportDataAlocacaoLideres } from '@/lib/types';
import { formatDateForDisplay } from '@/utils/formatters';
import { 
    FaUserCheck, 
    FaUserTimes, 
    FaExclamationTriangle, 
    FaSitemap, 
    FaCalendarAlt, 
    FaEnvelope,
    FaIdBadge,
    FaSignInAlt
} from 'react-icons/fa';

// --- COMPONENTES AUXILIARES ---

const StatBadge = ({ label, value, colorClass, bgClass }: any) => (
    <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${bgClass} border-opacity-60 flex-1`}>
        <span className="text-2xl font-black mb-1">{value}</span>
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

export const ReportAlocacaoLideresDisplay = ({ data }: { data: ReportDataAlocacaoLideres }) => {
    const { lideres_alocados, lideres_nao_alocados, celulas_sem_lider_atribuido, total_perfis_lider, total_celulas } = data;

    const safeLideresAlocados = lideres_alocados || [];
    const safeLideresNaoAlocados = lideres_nao_alocados || [];
    const safeCelulasSemLider = celulas_sem_lider_atribuido || [];

    return (
        <div className="space-y-8 font-sans">
            
            {/* 1. RESUMO GERAL */}
            <div className="flex gap-4">
                <StatBadge 
                    label="Perfis de Líder" 
                    value={total_perfis_lider} 
                    bgClass="bg-indigo-50 border-indigo-100 text-indigo-900" 
                    colorClass="text-indigo-400" 
                />
                <StatBadge 
                    label="Total Células" 
                    value={total_celulas} 
                    bgClass="bg-emerald-50 border-emerald-100 text-emerald-900" 
                    colorClass="text-emerald-500" 
                />
            </div>

            {/* 2. LÍDERES ALOCADOS (Sucesso) */}
            <div>
                <SectionHeader 
                    title="Líderes Alocados" 
                    count={safeLideresAlocados.length} 
                    icon={FaUserCheck} 
                    bgClass="bg-blue-50" 
                    colorClass="text-blue-700" 
                />
                
                <div className="space-y-3">
                    {safeLideresAlocados.length === 0 ? (
                        <p className="text-center text-gray-400 text-xs italic py-4">Nenhum líder alocado.</p>
                    ) : (
                        safeLideresAlocados.map((lider) => (
                            <div key={lider.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 text-blue-500"><FaEnvelope /></div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 break-all">{lider.email}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                                                    {lider.role}
                                                </span>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <FaSignInAlt size={10} /> {lider.ultimo_login ? formatDateForDisplay(lider.ultimo_login) : 'Nunca'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pl-8 sm:pl-0">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                                            <FaSitemap size={10} />
                                            {lider.celula_nome || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 3. LÍDERES NÃO ALOCADOS (Atenção) */}
            <div>
                <SectionHeader 
                    title="Líderes sem Célula" 
                    count={safeLideresNaoAlocados.length} 
                    icon={FaUserTimes} 
                    bgClass="bg-orange-50" 
                    colorClass="text-orange-700" 
                />
                
                <div className="space-y-3">
                    {safeLideresNaoAlocados.length === 0 ? (
                        <p className="text-center text-gray-400 text-xs italic py-4">Todos os líderes estão alocados!</p>
                    ) : (
                        safeLideresNaoAlocados.map((lider) => (
                            <div key={lider.id} className="bg-white border-l-4 border-l-orange-400 border-y border-r border-gray-100 rounded-r-2xl p-5">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-gray-800">
                                        <FaEnvelope className="text-orange-300" />
                                        <span className="text-sm font-bold break-all">{lider.email}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-3 ml-6">
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <FaIdBadge className="text-gray-300" />
                                            <span className="font-medium">{lider.role}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <FaCalendarAlt className="text-gray-300" />
                                            <span>Criado em: {formatDateForDisplay(lider.data_criacao_perfil)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 4. CÉLULAS SEM LÍDER (Erro/Crítico) */}
            <div>
                <SectionHeader 
                    title="Células Órfãs (Sem Líder)" 
                    count={safeCelulasSemLider.length} 
                    icon={FaExclamationTriangle} 
                    bgClass="bg-red-50" 
                    colorClass="text-red-700" 
                />

                <div className="space-y-3">
                    {safeCelulasSemLider.length === 0 ? (
                        <p className="text-center text-gray-400 text-xs italic py-4">Todas as células possuem líderes vinculados!</p>
                    ) : (
                        safeCelulasSemLider.map((celula) => (
                            <div key={celula.id} className="bg-white border border-red-100 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                                <div>
                                    <p className="text-sm font-black text-gray-800 flex items-center gap-2">
                                        <FaSitemap className="text-red-400" />
                                        {celula.nome}
                                    </p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-1 ml-6">
                                        Nome Cadastrado: <span className="font-bold text-gray-600">{celula.lider_principal_cadastrado_na_celula || 'N/A'}</span>
                                    </p>
                                </div>
                                <FaExclamationTriangle className="text-red-200 text-xl" />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Informativo */}
            <div className="text-center pt-4 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Relatório de Auditoria de Acessos</p>
            </div>
        </div>
    );
};