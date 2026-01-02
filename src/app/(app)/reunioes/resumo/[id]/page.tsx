// src/app/(app)/reunioes/resumo/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getReuniaoDetalhesParaResumo } from '@/lib/data';
import { ReuniaoDetalhesParaResumo } from '@/lib/types';
import { formatDateForDisplay, normalizePhoneNumber } from '@/utils/formatters'; // Adicionado normalizePhoneNumber
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
    FaFilePdf, 
    FaArrowLeft, 
    FaCalendarAlt, 
    FaCheckCircle, 
    FaTimesCircle, 
    FaUserCheck, 
    FaUserTimes,
    FaUserPlus,
    FaChild,
    FaDownload,
    FaMapMarkerAlt,
    FaWhatsapp // Adicionado ícone do WhatsApp
} from 'react-icons/fa';

// --- COMPONENTES VISUAIS ---

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

const SectionHeader = ({ icon: Icon, title, count, colorClass, bgClass }: any) => (
    <div className={`px-6 py-4 flex justify-between items-center border-b border-gray-100 ${bgClass}`}>
        <h3 className={`font-black flex items-center gap-2 ${colorClass}`}>
            <Icon /> {title}
        </h3>
        <span className="bg-white text-gray-700 text-xs font-black px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm">
            {count}
        </span>
    </div>
);

// --- COMPONENTE USER ROW ATUALIZADO (COM WHATSAPP) ---
const UserRow = ({ name, phone, status }: { name: string, phone?: string | null, status: 'present' | 'absent' | 'visitor' }) => {
    let icon, colorText, bgHover;
    
    if (status === 'present') {
        icon = <FaCheckCircle className="text-emerald-400" />;
        colorText = 'text-emerald-900';
        bgHover = 'hover:bg-emerald-50';
    } else if (status === 'visitor') {
        icon = <FaCheckCircle className="text-blue-400" />;
        colorText = 'text-blue-900';
        bgHover = 'hover:bg-blue-50';
    } else {
        icon = <FaTimesCircle className="text-red-300" />;
        colorText = 'text-gray-500 line-through decoration-red-300';
        bgHover = 'hover:bg-red-50';
    }

    return (
        <div className={`p-4 flex justify-between items-center transition-colors border-b border-gray-50 last:border-0 ${bgHover}`}>
            <div className="flex items-center gap-3">
                <div className="text-lg">{icon}</div>
                <span className={`text-sm font-bold ${colorText}`}>{name}</span>
            </div>
            {phone && (
                <a 
                    href={`https://wa.me/55${normalizePhoneNumber(phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors active:scale-90 border border-green-100 shadow-sm"
                    title="Chamar no WhatsApp"
                >
                    <FaWhatsapp size={18} />
                </a>
            )}
        </div>
    );
};

// --- PÁGINA PRINCIPAL ---

export default function ReuniaoResumoPage() {
    const params = useParams();
    const reuniaoId = params.id as string;

    const [resumo, setResumo] = useState<ReuniaoDetalhesParaResumo | null>(null);
    const [loading, setLoading] = useState(true);
    const [exportingPdf, setExportingPdf] = useState(false);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const fetchResumo = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getReuniaoDetalhesParaResumo(reuniaoId);
            if (!data) {
                addToast("Resumo não encontrado.", 'error');
                router.replace('/reunioes');
                return;
            }
            setResumo(data);
        } catch (e: any) {
            console.error("Erro ao carregar resumo:", e);
            addToast("Falha ao carregar o resumo.", 'error');
        } finally {
            setLoading(false);
        }
    }, [reuniaoId, router, addToast]);

    useEffect(() => { if (reuniaoId) fetchResumo(); }, [reuniaoId, fetchResumo]);

    const handleExportPdf = async () => {
        if (!resumo) return;
        setExportingPdf(true);
        try {
            const reportData = {
                type: "presenca_reuniao",
                title: `Relatório - ${formatDateForDisplay(resumo.data_reuniao)} (${resumo.celula_nome || 'N/A'})`,
                content: {
                    reuniao_detalhes: {
                        data_reuniao: resumo.data_reuniao,
                        tema: resumo.tema,
                        ministrador_principal_nome: resumo.ministrador_principal_nome,
                        ministrador_secundario_nome: resumo.ministrador_secundario_nome,
                        responsavel_kids_nome: resumo.responsavel_kids_nome,
                        num_criancas: resumo.num_criancas,
                        celula_nome: resumo.celula_nome,
                    },
                    membros_presentes: resumo.membros_presentes,
                    membros_ausentes: resumo.membros_ausentes,
                    visitantes_presentes: resumo.visitantes_presentes,
                },
                filename: `relatorio_${resumo.data_reuniao.replace(/-/g, '')}.pdf`,
            };

            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData),
            });

            if (!response.ok) throw new Error("Falha na geração do PDF.");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = reportData.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            addToast('Download iniciado!', 'success');
        } catch (err: any) {
            console.error("Erro PDF:", err);
            addToast("Erro ao exportar PDF.", 'error');
        } finally {
            setExportingPdf(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><LoadingSpinner /></div>;
    if (!resumo) return null;

    const totalPessoas = resumo.membros_presentes.length + resumo.visitantes_presentes.length + (resumo.num_criancas || 0);

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
                            <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">{resumo.tema}</h1>
                            <div className="flex flex-wrap items-center gap-3 text-emerald-100 text-xs font-bold uppercase tracking-widest">
                                <span className="flex items-center gap-1 bg-black/20 px-3 py-1 rounded-lg border border-white/10">
                                    <FaCalendarAlt /> {formatDateForDisplay(resumo.data_reuniao)}
                                </span>
                                <span className="flex items-center gap-1 bg-black/20 px-3 py-1 rounded-lg border border-white/10">
                                    <FaMapMarkerAlt /> {resumo.celula_nome || 'Célula'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleExportPdf}
                        disabled={exportingPdf}
                        className="bg-white text-emerald-700 hover:bg-emerald-50 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {exportingPdf ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div> : <FaDownload />}
                        Baixar PDF
                    </button>
                </div>
            </div>

            {/* Container Principal */}
            <div className="max-w-4xl mx-auto px-4 sm:px-8 -mt-20">
                
                {/* Stats Dashboard */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-in slide-in-from-bottom duration-500">
                    <div className="col-span-2 lg:col-span-1 bg-emerald-600 text-white p-5 rounded-3xl shadow-lg shadow-emerald-200 border border-emerald-500 flex flex-col justify-center">
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-80 mb-1">Total Geral</p>
                        <p className="text-4xl font-black">{totalPessoas}</p>
                    </div>
                    <StatCard label="Membros" value={resumo.membros_presentes.length} icon={FaUserCheck} bgClass="bg-white text-gray-800" colorClass="text-emerald-600" />
                    <StatCard label="Visitantes" value={resumo.visitantes_presentes.length} icon={FaUserPlus} bgClass="bg-white text-gray-800" colorClass="text-blue-600" />
                    <StatCard label="Kids" value={resumo.num_criancas || 0} icon={FaChild} bgClass="bg-white text-gray-800" colorClass="text-purple-600" />
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-0 sm:p-2 space-y-0">

                        {/* Informações da Liderança */}
                        <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Detalhes da Liderança</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ministrador</p>
                                    <p className="text-sm font-bold text-gray-800">{resumo.ministrador_principal_nome}</p>
                                </div>
                                {resumo.ministrador_secundario_nome && (
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Apoio</p>
                                        <p className="text-sm font-bold text-gray-800">{resumo.ministrador_secundario_nome}</p>
                                    </div>
                                )}
                                {resumo.responsavel_kids_nome && (
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Kids</p>
                                        <p className="text-sm font-bold text-gray-800">{resumo.responsavel_kids_nome}</p>
                                    </div>
                                )}
                                {resumo.caminho_pdf && (
                                    <a href={resumo.caminho_pdf} target="_blank" className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between group hover:bg-blue-100 transition-colors cursor-pointer">
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-400 uppercase">Material</p>
                                            <p className="text-sm font-bold text-blue-700">Visualizar Anexo</p>
                                        </div>
                                        <FaFilePdf className="text-blue-300 group-hover:text-blue-500" size={20}/>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Listas Detalhadas */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                            
                            {/* Coluna 1: Presentes e Visitantes */}
                            <div>
                                <SectionHeader icon={FaUserCheck} title="Membros Presentes" count={resumo.membros_presentes.length} colorClass="text-emerald-700" bgClass="bg-emerald-50/30" />
                                <div className="max-h-[400px] overflow-y-auto">
                                    {resumo.membros_presentes.length === 0 ? <p className="text-gray-400 text-xs font-bold p-6 text-center italic">Nenhum membro presente.</p> : 
                                        resumo.membros_presentes.map(m => <UserRow key={m.id} name={m.nome} phone={m.telefone} status="present" />)
                                    }
                                </div>

                                <SectionHeader icon={FaUserPlus} title="Visitantes" count={resumo.visitantes_presentes.length} colorClass="text-blue-700" bgClass="bg-blue-50/30 border-t border-gray-100" />
                                <div className="max-h-[300px] overflow-y-auto">
                                    {resumo.visitantes_presentes.length === 0 ? <p className="text-gray-400 text-xs font-bold p-6 text-center italic">Nenhum visitante.</p> : 
                                        resumo.visitantes_presentes.map(v => <UserRow key={v.id} name={v.nome} phone={v.telefone} status="visitor" />)
                                    }
                                </div>
                            </div>

                            {/* Coluna 2: Ausentes */}
                            <div className="bg-gray-50/30">
                                <SectionHeader icon={FaUserTimes} title="Membros Ausentes" count={resumo.membros_ausentes.length} colorClass="text-red-700" bgClass="bg-red-50/30" />
                                <div className="max-h-[700px] overflow-y-auto">
                                    {resumo.membros_ausentes.length === 0 ? <p className="text-emerald-500 text-xs font-bold p-6 text-center">Todos presentes! 🎉</p> : 
                                        resumo.membros_ausentes.map(m => <UserRow key={m.id} name={m.nome} status="absent" />)
                                    }
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div className="text-center pt-8 pb-4">
                    <Link href="/reunioes" className="text-xs font-bold text-gray-400 hover:text-emerald-600 transition-colors uppercase tracking-widest">
                        Voltar para Histórico
                    </Link>
                </div>
            </div>
        </div>
    );
}