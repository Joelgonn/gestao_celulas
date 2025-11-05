// src/components/relatorios/ReportAniversariantesDisplay.tsx
'use client'; // <-- Este é um Client Component

import React from 'react';
import { ReportDataAniversariantes } from '@/lib/reports_data'; // Importa o tipo de dados (Server Action)
import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters'; // Importa as funções de formatação (módulo neutro)


export const ReportAniversariantesDisplay = ({ data }: { data: ReportDataAniversariantes }) => {
    const { mes, ano_referencia, membros, visitantes } = data;

    const mesNome = new Date(ano_referencia, mes - 1).toLocaleString('pt-BR', { month: 'long' });

    const safeMembros = membros || [];
    const safeVisitantes = visitantes || [];

    return (
        <div className="space-y-6">
            {/* REMOVIDO: O título principal é renderizado pela página pai (page.tsx) */}
            {/* <h3 className="text-xl font-semibold text-indigo-700">Aniversariantes de {mesNome} de {ano_referencia}</h3> */}
            
            {safeMembros.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-green-700">Membros ({safeMembros.length})</h4>
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Data Nasc.</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Célula</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {safeMembros.map((m) => (
                                <tr key={m.id} className="even:bg-gray-50">
                                    <td className="py-2 px-4 whitespace-nowrap">{m.nome}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{formatDateForDisplay(m.data_nascimento)}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{formatPhoneNumberDisplay(m.telefone)}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{m.celula_nome || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {safeMembros.length === 0 && (
                <p className="text-gray-500">Nenhum membro aniversariante neste mês.</p>
            )}

            {safeVisitantes.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-purple-700">Visitantes ({safeVisitantes.length})</h4>
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Data Nasc.</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Célula</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {safeVisitantes.map((v) => (
                                <tr key={v.id} className="even:bg-gray-50">
                                    <td className="py-2 px-4 whitespace-nowrap">{v.nome}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{formatDateForDisplay(v.data_nascimento)}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{formatPhoneNumberDisplay(v.telefone)}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{v.celula_nome || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {safeVisitantes.length === 0 && (
                <p className="text-gray-500">Nenhum visitante aniversariante neste mês.</p>
            )}

            {safeMembros.length === 0 && safeVisitantes.length === 0 && (
                <p className="text-gray-500">Nenhum aniversariante encontrado neste mês.</p>
            )}
        </div>
    );
};