// src/components/relatorios/ReportFaltososPeriodoDisplay.tsx
'use client'; // <-- Este é um Client Component

import React from 'react';
import { ReportDataFaltososPeriodo } from '@/lib/reports_data'; // Importa o tipo de dados (Server Action)
import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters'; // Importa as funções de formatação (módulo neutro)


export const ReportFaltososPeriodoDisplay = ({ data }: { data: ReportDataFaltososPeriodo }) => {
    const { faltosos, start_date, end_date } = data;

    const safeFaltosos = faltosos || [];

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold mt-4 text-indigo-700">Membros Faltosos</h3>
            <p className="text-gray-600">Período: {formatDateForDisplay(start_date)} a {formatDateForDisplay(end_date)}</p>
            {safeFaltosos.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
                    <thead className="bg-gray-50"><tr><th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Nome</th><th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th><th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Presenças</th><th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Reuniões no Período</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                        {safeFaltosos.map((f: any) => (
                            <tr key={f.id} className="even:bg-gray-50"><td className="py-2 px-4 whitespace-nowrap">{f.nome}</td><td className="py-2 px-4 whitespace-nowrap">{formatPhoneNumberDisplay(f.telefone)}</td><td className="py-2 px-4 whitespace-nowrap">{f.total_presencas}</td><td className="py-2 px-4 whitespace-nowrap">{f.total_reunioes_no_periodo}</td></tr>
                        ))}
                    </tbody>
                </table>
            ) : (<p className="text-gray-500">Nenhum membro faltoso encontrado neste período.</p>)}
        </div>
    );
};