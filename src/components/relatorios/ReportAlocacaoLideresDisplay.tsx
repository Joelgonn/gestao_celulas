// src/components/relatorios/ReportAlocacaoLideresDisplay.tsx
'use client'; // <-- Este é um Client Component

import React from 'react';
import { ReportDataAlocacaoLideres } from '@/lib/reports_data'; // Importa o tipo de dados (Server Action)
import { formatDateForDisplay } from '@/utils/formatters'; // Importa funções de formatação (módulo neutro)


export const ReportAlocacaoLideresDisplay = ({ data }: { data: ReportDataAlocacaoLideres }) => {
    const { lideres_alocados, lideres_nao_alocados, celulas_sem_lider_atribuido, total_perfis_lider, total_celulas } = data;

    const safeLideresAlocados = lideres_alocados || [];
    const safeLideresNaoAlocados = lideres_nao_alocados || [];
    const safeCelulasSemLider = celulas_sem_lider_atribuido || [];

    return (
        <div className="space-y-6">
            <p className="text-gray-700">Total de Perfis de Líder/Admin: <span className="font-semibold">{total_perfis_lider}</span></p>
            <p className="text-gray-700">Total de Células Registradas: <span className="font-semibold">{total_celulas}</span></p>

            {safeLideresAlocados.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-blue-700">Líderes Alocados em Células ({safeLideresAlocados.length})</h4>
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Célula Associada</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Último Login</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {safeLideresAlocados.map((lider) => (
                                <tr key={lider.id} className="even:bg-gray-50">
                                    <td className="py-2 px-4 whitespace-nowrap">{lider.email}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{lider.role}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{lider.celula_nome || 'N/A'}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{formatDateForDisplay(lider.ultimo_login)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {safeLideresNaoAlocados.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-orange-700">Líderes sem Célula Alocada no Perfil ({safeLideresNaoAlocados.length})</h4>
                    <p className="text-sm text-gray-600 mb-2">Esses usuários têm a função 'líder' mas não estão vinculados a nenhuma célula no perfil.</p>
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Data Criação</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Último Login</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {safeLideresNaoAlocados.map((lider) => (
                                <tr key={lider.id} className="even:bg-gray-50">
                                    <td className="py-2 px-4 whitespace-nowrap">{lider.email}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{lider.role}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{formatDateForDisplay(lider.data_criacao_perfil)}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{formatDateForDisplay(lider.ultimo_login)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {safeCelulasSemLider.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-red-700">Células sem Líder Atribuído em Perfis ({safeCelulasSemLider.length})</h4>
                    <p className="text-sm text-gray-600 mb-2">Essas células existem, mas nenhum perfil de usuário com a função 'líder' está associado a elas.</p>
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Nome da Célula</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">Líder Principal (no registro da célula)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {safeCelulasSemLider.map((celula) => (
                                <tr key={celula.id} className="even:bg-gray-50">
                                    <td className="py-2 px-4 whitespace-nowrap">{celula.nome}</td>
                                    <td className="py-2 px-4 whitespace-nowrap">{celula.lider_principal_cadastrado_na_celula || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {safeLideresAlocados.length === 0 && safeLideresNaoAlocados.length === 0 && safeCelulasSemLider.length === 0 && (
                <p className="text-gray-500">Nenhum dado de alocação de líderes encontrado.</p>
            )}
        </div>
    );
};