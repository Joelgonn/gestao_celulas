// src/components/relatorios/ReportVisitantesPeriodoDisplay.tsx
'use client'; // <-- Este é um Client Component

import React from 'react';
// CORREÇÃO: Importar ReportDataVisitantesPeriodo de '@/lib/types'
import { ReportDataVisitantesPeriodo } from '@/lib/types'; // <--- CORREÇÃO AQUI
import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters'; // Importa as funções de formatação (módulo neutro)


export const ReportVisitantesPeriodoDisplay = ({ data }: { data: ReportDataVisitantesPeriodo }) => {
    // CORREÇÃO: Desestruturar 'visitantes' e 'periodo' para acessar start_date e end_date corretamente.
    const { visitantes, periodo } = data; // <--- CORREÇÃO AQUI

    const safeVisitantes = visitantes || [];

    return (
        <div className="space-y-4">
            {/* Adicionado dark:text-indigo-300 para o modo escuro */}
            <h3 className="text-xl font-semibold mt-4 text-indigo-700 dark:text-indigo-300">Visitantes por Período</h3>
            {/* CORREÇÃO: Usar as datas do objeto 'periodo' */}
            <p className="text-gray-600 dark:text-gray-400">Período: {formatDateForDisplay(periodo.start_date)} a {formatDateForDisplay(periodo.end_date)}</p>
            {safeVisitantes.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg dark:bg-gray-800 dark:divide-gray-700"> {/* Classes Dark Mode na tabela */}
                    <thead className="bg-gray-50 dark:bg-gray-700"> {/* Classes Dark Mode no cabeçalho */}
                        <tr>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Nome</th> {/* Classes Dark Mode nos headers */}
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Telefone</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">1ª Visita</th>
                            {/* Adicionado Célula */}
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Célula</th> {/* <--- CORREÇÃO AQUI: Adicionar cabeçalho para célula */}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {safeVisitantes.map((v) => ( // Removido ': any' pois o tipo já está correto agora
                            <tr key={v.id} className="even:bg-gray-50 dark:even:bg-gray-900 dark:odd:bg-gray-800"> {/* Fundo zebrado no dark mode */}
                                <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{v.nome}</td> {/* Texto legível no dark mode */}
                                <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatPhoneNumberDisplay(v.telefone)}</td>
                                <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatDateForDisplay(v.data_primeira_visita)}</td>
                                {/* Adicionado célula */}
                                <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{v.celula_nome || 'N/A'}</td> {/* <--- CORREÇÃO AQUI: Exibir nome da célula */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (<p className="text-gray-500 dark:text-gray-400">Nenhum visitante encontrado neste período.</p>)}
        </div>
    );
};