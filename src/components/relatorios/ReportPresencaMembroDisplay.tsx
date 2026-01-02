// src/components/relatorios/ReportPresencaMembroDisplay.tsx
'use client';

import React from 'react';
import { ReportDataPresencaMembro } from '@/lib/types';
import { formatDateForDisplay, formatPhoneNumberDisplay, normalizePhoneNumber } from '@/utils/formatters'; // Adicionado normalizePhoneNumber
import { 
  FaUser, 
  FaPhone, 
  FaCalendarAlt, 
  FaBirthdayCake, 
  FaCheckCircle, 
  FaTimesCircle,
  FaChartLine,
  FaHistory,
  FaWhatsapp // Adicionado ícone do WhatsApp
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
    
    function calcularAusenciasConsecutivas(historico: typeof safeHistoricoPresenca) {
      let count = 0;
      const sorted = [...historico].sort((a, b) => new Date(b.data_reuniao).getTime() - new Date(a.data_reuniao).getTime());
      
      for (const h of sorted) {
        if (!h.presente) count++;
        else break;
      }
      return count;
    }

    const ausenciasConsecutivas = calcularAusenciasConsecutivas(safeHistoricoPresenca);

    return (
        <div className="space-y-8 font-sans">
            {/* Header com informações do membro */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 relative z-10">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <FaUser className="text-white text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800">{membro_data.nome}</h1>
                            <p className="text-gray-500 text-sm font-medium">Relatório de Presença Individual</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Membro desde</p>
                            <p className="text-indigo-900 font-bold">{formatDateForDisplay(membro_data.data_ingresso)}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <div className="space-y-3">
                        
                        {/* CARD DE TELEFONE COM WHATSAPP (ATUALIZADO) */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center space-x-3">
                                <FaPhone className="text-gray-400" />
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Telefone</p>
                                    <p className="text-sm font-bold text-gray-800">{formatPhoneNumberDisplay(membro_data.telefone) || 'Não informado'}</p>
                                </div>
                            </div>
                            
                            {membro_data.telefone && (
                                <a 
                                    href={`https://wa.me/55${normalizePhoneNumber(membro_data.telefone)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 rounded-xl border border-green-200 active:scale-90 transition-all shadow-sm hover:bg-green-100"
                                    title="Chamar no WhatsApp"
                                >
                                    <FaWhatsapp size={20} />
                                </a>
                            )}
                        </div>
                        
                        {membro_data.data_nascimento && (
                            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <FaBirthdayCake className="text-gray-400" />
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Data de Nascimento</p>
                                    <p className="font-bold text-gray-800">{formatDateForDisplay(membro_data.data_nascimento)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {ultimaPresenca && (
                            <div className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <FaCalendarAlt className="text-emerald-500" />
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Última Presença</p>
                                    <p className="font-bold text-emerald-900">
                                        {formatDateForDisplay(ultimaPresenca.data_reuniao)}
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {ausenciasConsecutivas > 0 && (
                            <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-xl border border-red-100">
                                <FaTimesCircle className="text-red-500" />
                                <div>
                                    <p className="text-[10px] font-bold text-red-600 uppercase">Ausências Consecutivas</p>
                                    <p className="font-bold text-red-900">{ausenciasConsecutivas}</p>
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
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-gray-800 flex items-center space-x-2">
                            <FaChartLine className="text-indigo-500" />
                            <span>Taxa de Presença Geral</span>
                        </h3>
                        <span className={`text-2xl font-black ${
                            taxaPresenca >= 80 ? 'text-emerald-600' : 
                            taxaPresenca >= 50 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                            {taxaPresenca.toFixed(1)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
                        <div 
                            className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                                taxaPresenca >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 
                                taxaPresenca >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 
                                'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                            style={{ width: `${taxaPresenca}%` }}
                        ></div>
                    </div>
                    <p className="text-xs font-medium text-gray-400 text-right uppercase tracking-wide">
                        {totalPresente} presenças em {totalReunioes} encontros
                    </p>
                </div>
            )}

            {/* Histórico de Presença */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <div className="bg-gray-50 p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-gray-600"><FaHistory /></div>
                            <h3 className="text-lg font-black text-gray-800">Histórico Completo</h3>
                        </div>
                        <span className="bg-white px-3 py-1 rounded-lg text-xs font-black border border-gray-200 shadow-sm">
                            {safeHistoricoPresenca.length}
                        </span>
                    </div>
                </div>
                
                <div className="p-0">
                    {safeHistoricoPresenca.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="py-4 px-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Data
                                        </th>
                                        <th className="py-4 px-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Tema
                                        </th>
                                        <th className="py-4 px-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {safeHistoricoPresenca.map((hist, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center space-x-3">
                                                    <FaCalendarAlt className="text-gray-300 text-xs" />
                                                    <span className="text-sm font-bold text-gray-700">
                                                        {formatDateForDisplay(hist.data_reuniao)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm font-medium text-gray-600 truncate max-w-[200px] block" title={hist.tema}>{hist.tema}</span>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide border ${
                                                    hist.presente 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                        : 'bg-red-50 text-red-700 border-red-100'
                                                }`}>
                                                    {hist.presente ? (
                                                        <>
                                                            <FaCheckCircle className="text-emerald-500" />
                                                            <span>Presente</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FaTimesCircle className="text-red-500" />
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
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                <FaHistory className="text-gray-300 text-2xl" />
                            </div>
                            <p className="text-gray-500 font-bold">Nenhum histórico encontrado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};