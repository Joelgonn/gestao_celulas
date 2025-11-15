// src/components/relatorios/ReportPresencaReuniaoDisplay.tsx
'use client'; 

import React from 'react';
import { ReportDataPresencaReuniao } from '@/lib/reports_data';
import { formatDateForDisplay, formatPhoneNumberDisplay } from '@/utils/formatters';
import { 
  FaUsers, 
  FaUserCheck, 
  FaUserTimes, 
  FaUserPlus, 
  FaCalendarAlt,
  FaChild,
  FaChalkboardTeacher,
  FaPhone
} from 'react-icons/fa';

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'green' | 'red' | 'blue' | 'purple' | 'yellow';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    green: 'from-green-500 to-emerald-500',
    red: 'from-red-500 to-orange-500',
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-indigo-500',
    yellow: 'from-yellow-500 to-amber-500'
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 dark:bg-gray-800 dark:border-gray-700"> {/* Classes Dark Mode */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1 dark:text-gray-300">{title}</p> {/* Classes Dark Mode */}
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p> {/* Classes Dark Mode */}
        </div>
        <div className={`w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export const ReportPresencaReuniaoDisplay = ({ data }: { data: ReportDataPresencaReuniao }) => {
    const { reuniao_detalhes, membros_presentes, membros_ausentes, visitantes_presentes } = data;
    
    const safeMembrosPresentes = membros_presentes || [];
    const safeMembrosAusentes = membros_ausentes || [];
    const safeVisitantesPresentes = visitantes_presentes || [];

    const totalMembros = safeMembrosPresentes.length + safeMembrosAusentes.length;
    const taxaPresenca = totalMembros > 0 ? (safeMembrosPresentes.length / totalMembros) * 100 : 0;

    return (
        <div className="space-y-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen dark:from-gray-900 dark:to-gray-800"> {/* Classes Dark Mode */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 dark:bg-gray-800 dark:border-gray-700"> {/* Classes Dark Mode */}
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <FaCalendarAlt className="text-white text-xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Relatório de Presença</h1> {/* Classes Dark Mode */}
                        <p className="text-gray-600 dark:text-gray-300">Detalhes da reunião e lista de participantes</p> {/* Classes Dark Mode */}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-xl dark:bg-indigo-900 dark:text-indigo-200"> {/* Classes Dark Mode */}
                            <FaCalendarAlt className="text-indigo-600 text-lg" />
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Data da Reunião</p> {/* Classes Dark Mode */}
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{formatDateForDisplay(reuniao_detalhes.data_reuniao)}</p> {/* Classes Dark Mode */}
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-xl dark:bg-indigo-900 dark:text-indigo-200"> {/* Classes Dark Mode */}
                            <FaChalkboardTeacher className="text-indigo-600 text-lg" />
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Tema</p> {/* Classes Dark Mode */}
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{reuniao_detalhes.tema}</p> {/* Classes Dark Mode */}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {reuniao_detalhes.ministrador_principal_nome && (
                            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl dark:bg-blue-900 dark:text-blue-200"> {/* Classes Dark Mode */}
                                <FaUsers className="text-blue-600 text-lg" />
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">Ministrador Principal</p> {/* Classes Dark Mode */}
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{reuniao_detalhes.ministrador_principal_nome}</p> {/* Classes Dark Mode */}
                                </div>
                            </div>
                        )}
                        
                        {reuniao_detalhes.ministrador_secundario_nome && (
                            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl dark:bg-blue-900 dark:text-blue-200"> {/* Classes Dark Mode */}
                                <FaUsers className="text-blue-600 text-lg" />
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">Ministrador Secundário</p> {/* Classes Dark Mode */}
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{reuniao_detalhes.ministrador_secundario_nome}</p> {/* Classes Dark Mode */}
                                </div>
                            </div>
                        )}

                        {reuniao_detalhes.responsavel_kids_nome && (
                            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-xl dark:bg-purple-900 dark:text-purple-200"> {/* Classes Dark Mode */}
                                <FaChild className="text-purple-600 text-lg" />
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">Responsável Kids</p> {/* Classes Dark Mode */}
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{reuniao_detalhes.responsavel_kids_nome}</p> {/* Classes Dark Mode */}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Membros Presentes"
                    value={safeMembrosPresentes.length}
                    icon={<FaUserCheck className="text-white text-xl" />}
                    color="green"
                />
                
                <StatsCard
                    title="Membros Ausentes"
                    value={safeMembrosAusentes.length}
                    icon={<FaUserTimes className="text-white text-xl" />}
                    color="red"
                />
                
                <StatsCard
                    title="Visitantes"
                    value={safeVisitantesPresentes.length}
                    icon={<FaUserPlus className="text-white text-xl" />}
                    color="blue"
                />
                
                <StatsCard
                    title="Crianças"
                    value={reuniao_detalhes.num_criancas ?? 0}
                    icon={<FaChild className="text-white text-xl" />}
                    color="purple"
                />
            </div>

            {/* Taxa de Presença */}
            {totalMembros > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 dark:bg-gray-800 dark:border-gray-700"> {/* Classes Dark Mode */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Taxa de Presença dos Membros</h3> {/* Classes Dark Mode */}
                        <span className="text-2xl font-bold text-indigo-600">{taxaPresenca.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700"> {/* Classes Dark Mode */}
                        <div 
                            className={`h-4 rounded-full transition-all duration-1000 ease-out ${
                                taxaPresenca >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 
                                taxaPresenca >= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' : 
                                'bg-gradient-to-r from-red-500 to-orange-500'
                            }`}
                            style={{ width: `${taxaPresenca}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 dark:text-gray-300"> {/* Classes Dark Mode */}
                        {safeMembrosPresentes.length} de {totalMembros} membros presentes
                    </p>
                </div>
            )}

            {/* Lista de Membros Presentes */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:bg-gray-800 dark:border-gray-700"> {/* Classes Dark Mode */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
                    <div className="flex items-center space-x-3">
                        <FaUserCheck className="text-white text-xl" />
                        <h3 className="text-xl font-semibold text-white">Membros Presentes</h3>
                        <span className="bg-white bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {safeMembrosPresentes.length}
                        </span>
                    </div>
                </div>
                
                <div className="p-6">
                    {safeMembrosPresentes.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 dark:text-gray-300">
                                            Nome
                                        </th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider dark:text-gray-300">
                                            <div className="flex items-center space-x-2">
                                                <FaPhone className="text-gray-500 text-sm" />
                                                <span>Telefone</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                    {safeMembrosPresentes.map((m, index) => (
                                        <tr key={m.id} className="even:bg-gray-50 dark:even:bg-gray-900 dark:odd:bg-gray-800">
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                                                        <span className="text-green-600 text-sm font-semibold">{index + 1}</span>
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-gray-200">{m.nome}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatPhoneNumberDisplay(m.telefone)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700"> {/* Classes Dark Mode */}
                                <FaUserTimes className="text-gray-400 text-2xl" />
                            </div>
                            <p className="text-gray-500 text-lg dark:text-gray-300">Nenhum membro presente nesta reunião</p> {/* Classes Dark Mode */}
                        </div>
                    )}
                </div>
            </div>

            {/* Lista de Membros Ausentes */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:bg-gray-800 dark:border-gray-700"> {/* Classes Dark Mode */}
                <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6">
                    <div className="flex items-center space-x-3">
                        <FaUserTimes className="text-white text-xl" />
                        <h3 className="text-xl font-semibold text-white">Membros Ausentes</h3>
                        <span className="bg-white bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {safeMembrosAusentes.length}
                        </span>
                    </div>
                </div>
                
                <div className="p-6">
                    {safeMembrosAusentes.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 dark:text-gray-300">
                                            Nome
                                        </th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider dark:text-gray-300">
                                            <div className="flex items-center space-x-2">
                                                <FaPhone className="text-gray-500 text-sm" />
                                                <span>Telefone</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                    {safeMembrosAusentes.map((m, index) => (
                                        <tr key={m.id} className="even:bg-gray-50 dark:even:bg-gray-900 dark:odd:bg-gray-800">
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-gradient-to-r from-red-100 to-orange-100 rounded-full flex items-center justify-center">
                                                        <span className="text-red-600 text-sm font-semibold">{index + 1}</span>
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-gray-200">{m.nome}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatPhoneNumberDisplay(m.telefone)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700"> {/* Classes Dark Mode */}
                                <FaUserCheck className="text-gray-400 text-2xl" />
                            </div>
                            <p className="text-gray-500 text-lg dark:text-gray-300">Todos os membros estiveram presentes!</p> {/* Classes Dark Mode */}
                        </div>
                    )}
                </div>
            </div>

            {/* Lista de Visitantes Presentes */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:bg-gray-800 dark:border-gray-700"> {/* Classes Dark Mode */}
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6">
                    <div className="flex items-center space-x-3">
                        <FaUserPlus className="text-white text-xl" />
                        <h3 className="text-xl font-semibold text-white">Visitantes Presentes</h3>
                        <span className="bg-white bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {safeVisitantesPresentes.length}
                        </span>
                    </div>
                </div>
                
                <div className="p-6">
                    {safeVisitantesPresentes.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 dark:text-gray-300">
                                            Nome
                                        </th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider dark:text-gray-300">
                                            <div className="flex items-center space-x-2">
                                                <FaPhone className="text-gray-500 text-sm" />
                                                <span>Telefone</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                    {safeVisitantesPresentes.map((v, index) => (
                                        <tr key={v.id} className="even:bg-gray-50 dark:even:bg-gray-900 dark:odd:bg-gray-800">
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
                                                        <span className="text-blue-600 text-sm font-semibold">{index + 1}</span>
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-gray-200">{v.nome}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatPhoneNumberDisplay(v.telefone)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700"> {/* Classes Dark Mode */}
                                <FaUserPlus className="text-gray-400 text-2xl" />
                            </div>
                            <p className="text-gray-500 text-lg dark:text-gray-300">Nenhum visitante presente nesta reunião</p> {/* Classes Dark Mode */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};