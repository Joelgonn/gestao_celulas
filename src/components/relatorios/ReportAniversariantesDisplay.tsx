// src/components/relatorios/ReportAniversariantesDisplay.tsx
'use client';

import React from 'react';
import { ReportDataAniversariantes } from '@/lib/reports_data';
import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters';

export const ReportAniversariantesDisplay = ({ data }: { data: ReportDataAniversariantes }) => {
    const { mes, ano_referencia, membros, visitantes } = data;

    // `mes` é um número (1-12), `ano_referencia` é um número
    // `new Date(ano_referencia, mes - 1)` é a forma correta de criar uma data para o mês
    const mesNome = new Date(ano_referencia, mes - 1).toLocaleString('pt-BR', { month: 'long' });

    const safeMembros = membros || [];
    const safeVisitantes = visitantes || [];

    return (
        <div className="space-y-6">
            <h4 className="text-lg font-semibold text-green-700 dark:text-green-300">Membros ({safeMembros.length})</h4>
            {safeMembros.length > 0 ? (
                <div className="space-y-2">
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg dark:bg-gray-800 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Nome</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Data Nasc.</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Telefone</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Célula</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {safeMembros.map((m) => (
                                <tr key={m.id} className="even:bg-gray-50 dark:even:bg-gray-900 dark:odd:bg-gray-800">
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{m.nome}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatDateForDisplay(m.data_nascimento)}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatPhoneNumberDisplay(m.telefone)}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{m.celula_nome || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-500 dark:text-gray-400">Nenhum membro aniversariante neste mês.</p>
            )}

            <h4 className="text-lg font-semibold text-purple-700 dark:text-purple-300">Visitantes ({safeVisitantes.length})</h4>
            {safeVisitantes.length > 0 ? (
                <div className="space-y-2">
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg dark:bg-gray-800 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Nome</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Data Nasc.</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Telefone</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Célula</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {safeVisitantes.map((v) => (
                                <tr key={v.id} className="even:bg-gray-50 dark:even:bg-gray-900 dark:odd:bg-gray-800">
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{v.nome}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatDateForDisplay(v.data_nascimento)}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatPhoneNumberDisplay(v.telefone)}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{v.celula_nome || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-500 dark:text-gray-400">Nenhum visitante aniversariante neste mês.</p>
            )}

            {safeMembros.length === 0 && safeVisitantes.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400">Nenhum aniversariante encontrado neste mês.</p>
            )}
        </div>
    );
};