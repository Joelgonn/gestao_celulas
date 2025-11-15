// src/components/relatorios/ReportChavesAtivacaoDisplay.tsx
'use client'; // <-- Este é um Client Component

import React from 'react';
import { ReportDataChavesAtivacao } from '@/lib/reports_data'; // Importa o tipo de dados (Server Action)
import { formatDateForDisplay } from '@/utils/formatters'; // Importa funções de formatação (módulo neutro)


export const ReportChavesAtivacaoDisplay = ({ data }: { data: ReportDataChavesAtivacao }) => {
    const { chaves_ativas, chaves_usadas, total_chaves } = data;

    const safeChavesAtivas = chaves_ativas || [];
    const safeChavesUsadas = chaves_usadas || [];

    return (
        <div className="space-y-6">
            <p className="text-gray-700 dark:text-gray-300">Total de Chaves de Ativação Registradas: <span className="font-semibold">{total_chaves}</span></p>

            {safeChavesAtivas.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-green-700 dark:text-green-300">Chaves Ativas ({safeChavesAtivas.length})</h4>
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg dark:bg-gray-800 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Chave</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Célula Associada</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {safeChavesAtivas.map((chave) => (
                                <tr key={chave.chave} className="even:bg-gray-50 dark:even:bg-gray-900 dark:odd:bg-gray-800">
                                    <td className="py-2 px-4 whitespace-nowrap font-mono text-sm text-gray-800 dark:text-gray-200">{chave.chave}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{chave.celula_nome || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {safeChavesAtivas.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400">Nenhuma chave de ativação ativa encontrada.</p>
            )}

            {safeChavesUsadas.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Chaves Usadas ({safeChavesUsadas.length})</h4>
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg dark:bg-gray-800 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Chave</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Célula Original</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Usada Por (Email)</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Data de Uso</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {safeChavesUsadas.map((chave) => (
                                <tr key={chave.chave} className="even:bg-gray-50 dark:even:bg-gray-900 dark:odd:bg-gray-800">
                                    <td className="py-2 px-4 whitespace-nowrap font-mono text-sm text-gray-800 dark:text-gray-200">{chave.chave}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{chave.celula_nome || 'N/A'}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{chave.usada_por_email || 'N/A'}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatDateForDisplay(chave.data_uso)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {safeChavesUsadas.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400">Nenhuma chave de ativação usada encontrada.</p>
            )}

            {safeChavesAtivas.length === 0 && safeChavesUsadas.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400">Nenhuma chave de ativação encontrada.</p>
            )}
        </div>
    );
};