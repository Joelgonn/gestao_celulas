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
            <p className="text-gray-700">Total de Chaves de Ativação Registradas: <span className="font-semibold">{total_chaves}</span></p>

            {safeChavesAtivas.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-green-700">Chaves Ativas ({safeChavesAtivas.length})</h4>
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Chave</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Célula Associada</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {safeChavesAtivas.map((chave) => (
                                <tr key={chave.chave} className="even:bg-gray-50">
                                    <td className="py-2 px-4 whitespace-nowrap font-mono text-sm">{chave.chave}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{chave.celula_nome || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {safeChavesAtivas.length === 0 && (
                <p className="text-gray-500">Nenhuma chave de ativação ativa encontrada.</p>
            )}

            {safeChavesUsadas.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-blue-700">Chaves Usadas ({safeChavesUsadas.length})</h4>
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Chave</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Célula Original</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Usada Por (Email)</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Data de Uso</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {safeChavesUsadas.map((chave) => (
                                <tr key={chave.chave} className="even:bg-gray-50">
                                    <td className="py-2 px-4 whitespace-nowrap font-mono text-sm">{chave.chave}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{chave.celula_nome || 'N/A'}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{chave.usada_por_email || 'N/A'}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{formatDateForDisplay(chave.data_uso)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {safeChavesUsadas.length === 0 && (
                <p className="text-gray-500">Nenhuma chave de ativação usada encontrada.</p>
            )}

            {safeChavesAtivas.length === 0 && safeChavesUsadas.length === 0 && (
                <p className="text-gray-500">Nenhuma chave de ativação encontrada.</p>
            )}
        </div>
    );
};