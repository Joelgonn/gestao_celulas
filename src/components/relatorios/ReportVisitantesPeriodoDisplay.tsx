// src/components/relatorios/ReportVisitantesPeriodoDisplay.tsx
'use client'; // <-- Este é um Client Component

import React from 'react';
import { ReportDataVisitantesPeriodo } from '@/lib/reports_data'; // Importa o tipo de dados (Server Action)
import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters'; // Importa as funções de formatação (módulo neutro)


export const ReportVisitantesPeriodoDisplay = ({ data }: { data: ReportDataVisitantesPeriodo }) => {
    const { visitantes, start_date, end_date } = data;

    const safeVisitantes = visitantes || [];

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold mt-4 text-indigo-700">Visitantes por Período</h3>
            <p className="text-gray-600">Período: {formatDateForDisplay(start_date)} a {formatDateForDisplay(end_date)}</p>
            {safeVisitantes.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
                    <thead className="bg-gray-50"><tr><th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Nome</th><th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th><th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">1ª Visita</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                        {safeVisitantes.map((v: any) => (
                            <tr key={v.id} className="even:bg-gray-50"><td className="py-2 px-4 whitespace-nowrap">{v.nome}</td><td className="py-2 px-4 whitespace-nowrap">{formatPhoneNumberDisplay(v.telefone)}</td><td className="py-2 px-4 whitespace-nowrap">{formatDateForDisplay(v.data_primeira_visita)}</td></tr>
                        ))}
                    </tbody>
                </table>
            ) : (<p className="text-gray-500">Nenhum visitante encontrado neste período.</p>)}
        </div>
    );
};