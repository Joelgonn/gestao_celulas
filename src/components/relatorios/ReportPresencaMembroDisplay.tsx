// src/components/relatorios/ReportPresencaMembroDisplay.tsx
'use client';

import React from 'react';
import { ReportDataPresencaMembro } from '@/lib/reports_data';
import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters';
import { 
  FaUser, 
  FaPhone, 
  FaCalendarAlt, 
  FaBirthdayCake, 
  FaCheckCircle, 
  FaTimesCircle,
  FaChartLine,
  FaHistory
} from 'react-icons/fa';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'indigo' | 'green' | 'blue' | 'purple' | 'red';
  trend?: 'up' | 'down' | 'neutral';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon, color, trend }) => {
  const colorClasses = {
    indigo: 'from-indigo-500 to-purple-500',
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    red: 'from-red-500 to-orange-500'
  };

  const trendIcons = {
    up: '↗',
    down: '↘',
    neutral: '→'
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            {trend && (
              <span className={`text-sm font-medium ${
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {trendIcons[trend]}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export const ReportPresencaMembroDisplay = ({ data }: { data: ReportDataPresencaMembro }) => {
    const { membro_data, historico_presenca } = data;

    // Assegura que o membro_data e historico_presenca são válidos
    if (!membro_data) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaTimesCircle className="text-red-600 text-2xl" />
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">Dados não encontrados</h2>
            <p className="text-gray-600">Os dados do membro não foram encontrados.</p>
          </div>
        </div>
      );
    }

    const safeHistoricoPresenca = historico_presenca || [];
    
    // Calcula estatísticas
    const totalReunioes = safeHistoricoPresenca.length;
    const totalPresente = safeHistoricoPresenca.filter(hist => hist.presente).length;
    const taxaPresenca = totalReunioes > 0 ? (totalPresente / totalReunioes) * 100 : 0;
    const ultimaPresenca = safeHistoricoPresenca.find(hist => hist.presente);
    const ausenciasConsecutivas = calcularAusenciasConsecutivas(safeHistoricoPresenca);

    function calcularAusenciasConsecutivas(historico: any[]) {
      let maxConsecutivas = 0;
      let currentConsecutivas = 0;
      
      // Ordena por data mais recente primeiro
      const historicoOrdenado = [...historico].sort((a, b) => 
        new Date(b.data_reuniao).getTime() - new Date(a.data_reuniao).getTime()
      );
      
      for (const hist of historicoOrdenado) {
        if (!hist.presente) {
          currentConsecutivas++;
          maxConsecutivas = Math.max(maxConsecutivas, currentConsecutivas);
        } else {
          currentConsecutivas = 0;
        }
      }
      
      return maxConsecutivas;
    }

    return (
        <div className="space-y-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            {/* Header com informações do membro */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
                            <FaUser className="text-white text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">{membro_data.nome}</h1>
                            <p className="text-gray-600">Relatório de Presença Individual</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        <div className="bg-indigo-50 px-4 py-2 rounded-xl">
                            <p className="text-indigo-700 text-sm font-medium">Membro desde</p>
                            <p className="text-indigo-900 font-semibold">{formatDateForDisplay(membro_data.data_ingresso)}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-xl">
                            <FaPhone className="text-blue-600 text-lg" />
                            <div>
                                <p className="text-sm text-gray-600">Telefone</p>
                                <p className="font-semibold text-gray-800">{formatPhoneNumberDisplay(membro_data.telefone)}</p>
                            </div>
                        </div>
                        
                        {membro_data.data_nascimento && (
                            <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-xl">
                                <FaBirthdayCake className="text-purple-600 text-lg" />
                                <div>
                                    <p className="text-sm text-gray-600">Data de Nascimento</p>
                                    <p className="font-semibold text-gray-800">{formatDateForDisplay(membro_data.data_nascimento)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {ultimaPresenca && (
                            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-xl">
                                <FaCalendarAlt className="text-green-600 text-lg" />
                                <div>
                                    <p className="text-sm text-gray-600">Última Presença</p>
                                    <p className="font-semibold text-gray-800">
                                        {formatDateForDisplay(ultimaPresenca.data_reuniao)}
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {ausenciasConsecutivas > 0 && (
                            <div className="flex items-center space-x-3 p-4 bg-orange-50 rounded-xl">
                                <FaTimesCircle className="text-orange-600 text-lg" />
                                <div>
                                    <p className="text-sm text-gray-600">Ausências Consecutivas</p>
                                    <p className="font-semibold text-gray-800">{ausenciasConsecutivas}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total de Reuniões"
                    value={totalReunioes}
                    icon={<FaHistory className="text-white text-xl" />}
                    color="indigo"
                />
                
                <StatsCard
                    title="Presenças"
                    value={totalPresente}
                    subtitle={`de ${totalReunioes} reuniões`}
                    icon={<FaCheckCircle className="text-white text-xl" />}
                    color="green"
                />
                
                <StatsCard
                    title="Taxa de Presença"
                    value={`${taxaPresenca.toFixed(1)}%`}
                    icon={<FaChartLine className="text-white text-xl" />}
                    color="blue"
                    trend={taxaPresenca >= 80 ? 'up' : taxaPresenca >= 50 ? 'neutral' : 'down'}
                />
                
                <StatsCard
                    title="Faltas"
                    value={totalReunioes - totalPresente}
                    icon={<FaTimesCircle className="text-white text-xl" />}
                    color="red"
                />
            </div>

            {/* Barra de Taxa de Presença */}
            {totalReunioes > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <FaChartLine className="text-indigo-600" />
                            <span>Taxa de Presença Geral</span>
                        </h3>
                        <span className={`text-2xl font-bold ${
                            taxaPresenca >= 80 ? 'text-green-600' : 
                            taxaPresenca >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                            {taxaPresenca.toFixed(1)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                        <div 
                            className={`h-4 rounded-full transition-all duration-1000 ease-out ${
                                taxaPresenca >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 
                                taxaPresenca >= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' : 
                                'bg-gradient-to-r from-red-500 to-orange-500'
                            }`}
                            style={{ width: `${taxaPresenca}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-600">
                        {totalPresente} presenças em {totalReunioes} reuniões realizadas
                    </p>
                </div>
            )}

            {/* Histórico de Presença */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
                    <div className="flex items-center space-x-3">
                        <FaHistory className="text-white text-xl" />
                        <h3 className="text-xl font-semibold text-white">Histórico de Presença</h3>
                        <span className="bg-white bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {safeHistoricoPresenca.length} registros
                        </span>
                    </div>
                </div>
                
                <div className="p-6">
                    {safeHistoricoPresenca.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                            Data da Reunião
                                        </th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                            Tema
                                        </th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {safeHistoricoPresenca.map((hist, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100">
                                                <div className="flex items-center space-x-3">
                                                    <FaCalendarAlt className="text-gray-400 text-sm" />
                                                    <span className="font-medium text-gray-900">
                                                        {formatDateForDisplay(hist.data_reuniao)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 border-r border-gray-100">
                                                <span className="text-gray-700">{hist.tema}</span>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                                                    hist.presente 
                                                        ? 'bg-green-100 text-green-800 border border-green-200' 
                                                        : 'bg-red-100 text-red-800 border border-red-200'
                                                }`}>
                                                    {hist.presente ? (
                                                        <>
                                                            <FaCheckCircle className="text-green-600 text-sm" />
                                                            <span>Presente</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FaTimesCircle className="text-red-600 text-sm" />
                                                            <span>Ausente</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaHistory className="text-gray-400 text-2xl" />
                            </div>
                            <p className="text-gray-500 text-lg">Nenhum histórico de presença encontrado</p>
                            <p className="text-gray-400 text-sm mt-2">
                                O membro ainda não possui registros de presença em reuniões
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};