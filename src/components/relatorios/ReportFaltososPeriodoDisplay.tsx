// src/components/relatorios/ReportFaltososPeriodoDisplay.tsx
'use client'; // <-- Este é um Client Component

import React from 'react';
// CORREÇÃO: Importar ReportDataFaltososPeriodo de '@/lib/types'
import { ReportDataFaltososPeriodo } from '@/lib/types'; // <--- CORREÇÃO AQUI
import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters'; // Importa as funções de formatação (módulo neutro)


export const ReportFaltososPeriodoDisplay = ({ data }: { data: ReportDataFaltososPeriodo }) => {
    // CORREÇÃO: Desestruturar 'faltosos' e 'periodo' para acessar start_date e end_date corretamente.
    const { faltosos, periodo } = data; // <--- CORREÇÃO AQUI

    const safeFaltosos = faltosos || [];

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold mt-4 text-indigo-700">Membros Faltosos</h3>
            {/* CORREÇÃO: Usar as datas do objeto 'periodo' */}
            <p className="text-gray-600">Período: {formatDateForDisplay(periodo.start_date)} a {formatDateForDisplay(periodo.end_date)}</p>
            {safeFaltosos.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
                    {/* Cabeçalho da tabela */}
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Presenças</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Reuniões no Período</th>
                            {/* Adicionado Célula */}
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Célula</th> {/* <--- CORREÇÃO AQUI: Adicionar cabeçalho para célula */}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {safeFaltosos.map((f) => ( // Removido ': any' pois o tipo já está correto agora
                            <tr key={f.id} className="even:bg-gray-50">
                                <td className="py-2 px-4 whitespace-nowrap">{f.nome}</td>
                                <td className="py-2 px-4 whitespace-nowrap">{formatPhoneNumberDisplay(f.telefone)}</td>
                                <td className="py-2 px-4 whitespace-nowrap">{f.total_presencas}</td>
                                <td className="py-2 px-4 whitespace-nowrap">{f.total_reunioes_no_periodo}</td>
                                {/* Adicionado célula */}
                                <td className="py-2 px-4 whitespace-nowrap">{f.celula_nome || 'N/A'}</td> {/* <--- CORREÇÃO AQUI: Exibir nome da célula */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (<p className="text-gray-500">Nenhum membro faltoso encontrado neste período.</p>)}
        </div>
    );
};