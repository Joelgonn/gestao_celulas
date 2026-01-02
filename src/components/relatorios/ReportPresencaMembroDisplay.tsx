// src/components/relatorios/ReportPresencaMembroDisplay.tsx
'use client';

import React from 'react';
import { ReportDataPresencaMembro } from '@/lib/types';
import { formatDateForDisplay, formatPhoneNumberDisplay, normalizePhoneNumber } from '@/utils/formatters';
import { 
  FaUser, 
  FaPhone, 
  FaCalendarAlt, 
  FaBirthdayCake, 
  FaCheckCircle, 
  FaTimesCircle,
  FaChartLine,
  FaHistory,
  FaWhatsapp,
  FaIdCard
} from 'react-icons/fa';

// --- COMPONENTES AUXILIARES ---

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

  const trendIcons = { up: '↗', down: '↘', neutral: '→' };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-black text-gray-800">{value}</p>
            {trend && (
              <span className={`text-xs font-bold ${
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-600' : 'text-gray-400'
              }`}>
                {trendIcons[trend]}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-gray-400 text-[10px] font-medium mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

export const ReportPresencaMembroDisplay = ({ data }: { data: ReportDataPresencaMembro }) => {
    const { membro_data, historico_presenca } = data;

    if (!membro_data) {
      return (
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <FaTimesCircle className="text-red-200 text-4xl mx-auto mb-2" />
            <p className="text-gray-400 font-bold">Dados não encontrados.</p>
          </div>
        </div>
      );
    }

    const safeHistoricoPresenca = historico_presenca || [];
    
    // Cálculos
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
            
            {/* 1. PERFIL DO MEMBRO (Hero Card) */}
            <div className="bg-white rounded-[2.5rem] shadow-lg p-8 border border-gray-100 relative overflow-hidden">
                {/* Background Decorativo */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-full -mr-12 -mt-12 opacity-50 blur-2xl"></div>
                
                <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center shadow-lg shadow-indigo-200 transform rotate-3">
                            <FaUser className="text-white text-3xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 leading-none mb-2">{membro_data.nome}</h1>
                            <div className="inline-flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                                <FaIdCard className="text-indigo-400 text-xs" />
                                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">
                                    Membro desde {formatDateForDisplay(membro_data.data_ingresso)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        {/* Contato com WhatsApp */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm"><FaPhone /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Contato</p>
                                    <p className="text-sm font-bold text-gray-800">{formatPhoneNumberDisplay(membro_data.telefone) || 'S/ Número'}</p>
                                </div>
                            </div>
                            {membro_data.telefone && (
                                <a 
                                    href={`https://wa.me/55${normalizePhoneNumber(membro_data.telefone)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 rounded-xl border border-green-200 active:scale-90 transition-all shadow-sm hover:bg-green-100"
                                    title="WhatsApp"
                                >
                                    <FaWhatsapp size={20} />
                                </a>
                            )}
                        </div>
                        
                        {/* Aniversário */}
                        {membro_data.data_nascimento && (
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm"><FaBirthdayCake /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Aniversário</p>
                                    <p className="text-sm font-bold text-gray-800">{formatDateForDisplay(membro_data.data_nascimento)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. KPIs (Cards de Estatísticas) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Reuniões"
                    value={totalReunioes}
                    icon={<FaHistory className="text-white text-lg" />}
                    color="indigo"
                />
                <StatsCard
                    title="Presenças"
                    value={totalPresente}
                    icon={<FaCheckCircle className="text-white text-lg" />}
                    color="green"
                />
                <StatsCard
                    title="Frequência"
                    value={`${taxaPresenca.toFixed(0)}%`}
                    icon={<FaChartLine className="text-white text-lg" />}
                    color="blue"
                    trend={taxaPresenca >= 80 ? 'up' : taxaPresenca >= 50 ? 'neutral' : 'down'}
                />
                <StatsCard
                    title="Faltas"
                    value={totalReunioes - totalPresente}
                    icon={<FaTimesCircle className="text-white text-lg" />}
                    color="red"
                />
            </div>

            {/* 3. ALERTA DE AUSÊNCIA (Só aparece se necessário) */}
            {ausenciasConsecutivas > 0 && (
                <div className="bg-red-50 rounded-2xl p-4 border border-red-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FaTimesCircle className="text-red-500 text-xl" />
                        <div>
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Alerta</p>
                            <p className="text-sm font-bold text-red-800">Ausente há {ausenciasConsecutivas} reuniões consecutivas</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. HISTÓRICO DETALHADO (Tabela Responsiva Clean) */}
            <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100">
                <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <FaHistory /> Histórico Completo
                    </h3>
                    <span className="bg-white px-3 py-1 rounded-lg text-xs font-black border border-gray-200 shadow-sm text-gray-600">
                        {safeHistoricoPresenca.length}
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    {safeHistoricoPresenca.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-50">
                            <thead className="bg-white">
                                <tr>
                                    <th className="py-4 px-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                                    <th className="py-4 px-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tema</th>
                                    <th className="py-4 px-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {safeHistoricoPresenca.map((hist, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-6 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <FaCalendarAlt className="text-gray-300 text-xs group-hover:text-indigo-400 transition-colors" />
                                                <span className="text-sm font-bold text-gray-700">{formatDateForDisplay(hist.data_reuniao)}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-sm font-medium text-gray-600 truncate max-w-[150px] block">{hist.tema}</span>
                                        </td>
                                        <td className="py-4 px-6 whitespace-nowrap text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${
                                                hist.presente 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                    : 'bg-red-50 text-red-700 border-red-100'
                                            }`}>
                                                {hist.presente ? (
                                                    <> <FaCheckCircle /> Presente </>
                                                ) : (
                                                    <> <FaTimesCircle /> Ausente </>
                                                )}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-400 font-bold text-sm">Nenhum histórico registrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};