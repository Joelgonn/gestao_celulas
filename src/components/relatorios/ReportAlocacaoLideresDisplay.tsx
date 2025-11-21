// src/components/relatorios/ReportAlocacaoLideresDisplay.tsx
'use client';

import React from 'react';
// CORREÇÃO: Importar ReportDataAlocacaoLideres de '@/lib/types'
import { ReportDataAlocacaoLideres } from '@/lib/types'; // <--- CORREÇÃO AQUI
import { formatDateForDisplay } from '@/utils/formatters';


export const ReportAlocacaoLideresDisplay = ({ data }: { data: ReportDataAlocacaoLideres }) => {
    // CORREÇÃO: As propriedades agora existem na interface importada, então a desestruturação é segura.
    const { lideres_alocados, lideres_nao_alocados, celulas_sem_lider_atribuido, total_perfis_lider, total_celulas } = data;

    const safeLideresAlocados = lideres_alocados || [];
    const safeLideresNaoAlocados = lideres_nao_alocados || [];
    const safeCelulasSemLider = celulas_sem_lider_atribuido || [];

    return (
        <div className="space-y-6">
            <p className="text-gray-700 dark:text-gray-300">Total de Perfis de Líder/Admin: <span className="font-semibold">{total_perfis_lider}</span></p>
            <p className="text-gray-700 dark:text-gray-300">Total de Células Registradas: <span className="font-semibold">{total_celulas}</span></p>

            {safeLideresAlocados.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Líderes Alocados em Células ({safeLideresAlocados.length})</h4>
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg dark:bg-gray-800 dark:divide-gray-700">
                        <thead>
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Email</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Role</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Célula Associada</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Último Login</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {safeLideresAlocados.map((lider) => (
                                <tr key={lider.id} className="even:bg-gray-50 dark:even:bg-gray-900 dark:odd:bg-gray-800">
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{lider.email}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{lider.role}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{lider.celula_nome || 'N/A'}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatDateForDisplay(lider.ultimo_login)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {safeLideresNaoAlocados.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-orange-700 dark:text-orange-300">Líderes sem Célula Alocada no Perfil ({safeLideresNaoAlocados.length})</h4>
                    <p className="text-sm text-gray-600 mb-2 dark:text-gray-400">Esses usuários têm a função 'líder' mas não estão vinculados a nenhuma célula no perfil.</p>
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg dark:bg-gray-800 dark:divide-gray-700">
                        <thead>
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Email</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Role</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Data Criação</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Último Login</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {safeLideresNaoAlocados.map((lider) => (
                                <tr key={lider.id} className="even:bg-gray-50 dark:even:bg-gray-900 dark:odd:bg-gray-800">
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{lider.email}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{lider.role}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatDateForDisplay(lider.data_criacao_perfil)}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatDateForDisplay(lider.ultimo_login)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {safeCelulasSemLider.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-red-700 dark:text-red-300">Células sem Líder Atribuído em Perfis ({safeCelulasSemLider.length})</h4>
                    <p className="text-sm text-gray-600 mb-2 dark:text-gray-400">Essas células existem, mas nenhum perfil de usuário com a função 'líder' está associado a elas.</p>
                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg dark:bg-gray-800 dark:divide-gray-700">
                        <thead>
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Nome da Célula</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">Líder Principal (no registro da célula)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {safeCelulasSemLider.map((celula) => (
                                <tr key={celula.id} className="even:bg-gray-50 dark:even:bg-gray-900 dark:odd:bg-gray-800">
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{celula.nome}</td>
                                    <td className="py-2 px-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{celula.lider_principal_cadastrado_na_celula || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {safeLideresAlocados.length === 0 && safeLideresNaoAlocados.length === 0 && safeCelulasSemLider.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400">Nenhum dado de alocação de líderes encontrado.</p>
            )}
        </div>
    );
};