// src/app/(app)/reunioes/presenca/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    getReuniao,
    listarTodosMembrosComPresenca,
    registrarPresencaMembro,
    listarTodosVisitantesComPresenca,
    registrarPresencaVisitante,
    getNumCriancasReuniao,
    setNumCriancasReuniao,
} from '@/lib/data';

import { ReuniaoParaEdicao, MembroComPresenca, VisitanteComPresenca } from '@/lib/types';
import { formatDateForDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import { 
    FaArrowLeft, 
    FaUsers, 
    FaUserCheck, 
    FaChild, 
    FaCheckCircle, 
    FaRegCircle, 
    FaSave, 
    FaSpinner,
    FaInfoCircle,
    FaUserPlus
} from 'react-icons/fa';

// --- COMPONENTE DE CHECKBOX ROW ---
const CheckboxRow = ({ label, subLabel, checked, onChange, disabled, isSpecial }: any) => (
    <div 
        onClick={() => !disabled && onChange(!checked)}
        className={`
            group flex items-center justify-between p-4 mb-3 rounded-2xl border-2 transition-all cursor-pointer select-none
            ${checked 
                ? 'bg-emerald-50 border-emerald-500 shadow-sm' 
                : 'bg-white border-gray-100 hover:border-emerald-200'
            }
            ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}
        `}
    >
        <div className="flex items-center gap-4">
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors
                ${checked ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-400'}
            `}>
                {checked ? <FaCheckCircle /> : <FaRegCircle />}
            </div>
            <div>
                <p className={`text-sm font-bold ${checked ? 'text-emerald-900' : 'text-gray-700'}`}>
                    {label}
                </p>
                {subLabel && (
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mt-0.5">
                        {subLabel}
                    </p>
                )}
            </div>
        </div>
        {checked && <div className="text-emerald-500 text-xs font-black uppercase tracking-widest">Presente</div>}
    </div>
);

// --- COMPONENTE DE STAT CARD ---
const StatCard = ({ label, value, icon: Icon, colorClass, bgClass }: any) => (
    <div className={`p-4 rounded-2xl border flex items-center justify-between ${bgClass} border-opacity-50`}>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{label}</p>
            <p className="text-2xl font-black">{value}</p>
        </div>
        <div className={`p-3 rounded-xl bg-white/50 ${colorClass}`}>
            <Icon size={20} />
        </div>
    </div>
);

export default function GerenciarPresencaPage() {
    const params = useParams();
    const reuniaoId = params.id as string;
    
    const [reuniao, setReuniao] = useState<ReuniaoParaEdicao | null>(null);
    const [membrosPresenca, setMembrosPresenca] = useState<MembroComPresenca[]>([]);
    const [visitantesPresenca, setVisitantesPresenca] = useState<VisitanteComPresenca[]>([]);
    const [numCriancas, setNumCriancas] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [specialRoles, setSpecialRoles] = useState<string[]>([]);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    // Contadores
    const membrosPresentes = membrosPresenca.filter(m => m.presente).length;
    const visitantesPresentes = visitantesPresenca.filter(v => v.presente).length;
    const totalPresentes = membrosPresentes + visitantesPresentes + numCriancas;

    useEffect(() => {
        const fetchPresencaData = async () => {
            setLoading(true);
            try {
                const [fetchedReuniao, membrosRawData, visitantesData, criancasCount] = await Promise.all([
                    getReuniao(reuniaoId),
                    listarTodosMembrosComPresenca(reuniaoId),
                    listarTodosVisitantesComPresenca(reuniaoId),
                    getNumCriancasReuniao(reuniaoId),
                ]);

                if (!fetchedReuniao) {
                    addToast('Reunião não encontrada!', 'error');
                    setTimeout(() => router.replace('/reunioes'), 2000);
                    return;
                }
                
                const mpId = fetchedReuniao.ministrador_principal || null;
                const msId = fetchedReuniao.ministrador_secundario || null;
                const rkId = fetchedReuniao.responsavel_kids || null;
                
                const roles = [mpId, msId, rkId].filter((id): id is string => id !== null);
                setSpecialRoles(roles);

                setReuniao(fetchedReuniao);
                setVisitantesPresenca(visitantesData);
                setNumCriancas(criancasCount);

                const membrosComPreMarcacao = membrosRawData.map(m => {
                    const isDesignado = roles.includes(m.id);
                    if (isDesignado && !m.presenca_registrada) {
                        return { ...m, presente: true };
                    }
                    return m;
                });

                setMembrosPresenca(membrosComPreMarcacao);
            } catch (e: any) {
                console.error("Erro ao buscar dados:", e);
                addToast(`Erro ao carregar dados: ${e.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };

        if (reuniaoId) fetchPresencaData();
    }, [reuniaoId, router, addToast]);

    const handleMembroChange = useCallback((membroId: string, presente: boolean) => {
        setMembrosPresenca(prev => prev.map(m => m.id === membroId ? { ...m, presente: presente } : m));
    }, []);

    const handleVisitanteChange = useCallback((visitanteId: string, presente: boolean) => {
        setVisitantesPresenca(prev => prev.map(v => v.visitante_id === visitanteId ? { ...v, presente: presente } : v));
    }, []);

    const handleNumCriancasChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        setNumCriancas(isNaN(value) ? 0 : Math.max(0, value));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await Promise.all([
                ...membrosPresenca.map(m => registrarPresencaMembro(reuniaoId, m.id, m.presente)),
                ...visitantesPresenca.map(v => registrarPresencaVisitante(reuniaoId, v.visitante_id, v.presente)),
                setNumCriancasReuniao(reuniaoId, numCriancas)
            ]);

            addToast('Lista de presença salva com sucesso!', 'success');
            setTimeout(() => router.push('/reunioes'), 1000);
        } catch (e: any) {
            addToast(`Falha ao salvar: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;
    if (!reuniao) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />

            {/* Hero Header */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 pt-8 pb-32 px-4 sm:px-8 shadow-lg">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <Link href="/reunioes" className="bg-white/20 p-3 rounded-2xl text-white hover:bg-white/30 transition-all active:scale-90 backdrop-blur-md border border-white/10">
                            <FaArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3"><FaUsers /> Chamada</h1>
                            <p className="text-emerald-100 text-sm font-medium opacity-80 uppercase tracking-widest">
                                {formatDateForDisplay(reuniao.data_reuniao)} • {reuniao.tema}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Container Principal */}
            <div className="max-w-4xl mx-auto px-4 sm:px-8 -mt-20">
                <form onSubmit={handleSubmit}>
                    
                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-in slide-in-from-bottom duration-500">
                        <div className="col-span-2 md:col-span-1 bg-emerald-600 text-white p-5 rounded-3xl shadow-lg shadow-emerald-200 border border-emerald-500">
                            <p className="text-[10px] uppercase tracking-widest font-bold opacity-80 mb-1">Total Geral</p>
                            <p className="text-4xl font-black">{totalPresentes}</p>
                        </div>
                        <StatCard label="Membros" value={membrosPresentes} icon={FaUserCheck} bgClass="bg-white text-gray-800" colorClass="text-emerald-600" />
                        <StatCard label="Visitantes" value={visitantesPresentes} icon={FaUserPlus} bgClass="bg-white text-gray-800" colorClass="text-blue-600" />
                        <StatCard label="Kids" value={numCriancas} icon={FaChild} bgClass="bg-white text-gray-800" colorClass="text-purple-600" />
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-8 sm:p-10 space-y-10">

                            {/* Seção Membros */}
                            <section>
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4 mb-6">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><FaUsers size={16}/></div> 
                                    Membros da Célula
                                </h2>
                                <div>
                                    {membrosPresenca.map((membro) => {
                                        const isSpecialRole = specialRoles.includes(membro.id);
                                        return (
                                            <CheckboxRow 
                                                key={membro.id}
                                                label={membro.nome}
                                                subLabel={isSpecialRole ? "Liderança / Apoio" : null}
                                                checked={membro.presente}
                                                onChange={(val: boolean) => handleMembroChange(membro.id, val)}
                                                disabled={isSpecialRole}
                                            />
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Seção Visitantes */}
                            {visitantesPresenca.length > 0 && (
                                <section>
                                    <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4 mb-6">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><FaUserPlus size={16}/></div> 
                                        Visitantes
                                    </h2>
                                    <div>
                                        {visitantesPresenca.map((v) => (
                                            <CheckboxRow 
                                                key={v.visitante_id}
                                                label={v.nome}
                                                checked={v.presente}
                                                onChange={(val: boolean) => handleVisitanteChange(v.visitante_id, val)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Seção Kids */}
                            <section className="bg-purple-50 rounded-3xl p-6 border border-purple-100">
                                <h2 className="text-lg font-black text-purple-900 flex items-center gap-2 mb-4">
                                    <FaChild className="text-purple-600"/> Quantidade de Crianças
                                </h2>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2">
                                        Total (Incluindo bebês)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={numCriancas}
                                        onChange={handleNumCriancasChange}
                                        className="w-full px-5 py-4 text-xl font-black text-gray-700 bg-white border-2 border-purple-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all"
                                    />
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-purple-700 bg-white/50 p-3 rounded-xl text-xs font-bold">
                                    <FaInfoCircle size={14} /> Inclua crianças no culto kids e bebês de colo.
                                </div>
                            </section>

                            {/* Actions */}
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-8 border-t border-gray-50">
                                <Link href="/reunioes" className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all text-center">Cancelar</Link>
                                <button 
                                    type="submit" 
                                    disabled={submitting} 
                                    className="px-10 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer uppercase tracking-tighter"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />} Salvar Presença
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}