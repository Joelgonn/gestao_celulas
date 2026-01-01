// src/app/convite/[token]/page.tsx

import type { Metadata } from 'next';
import { validarConvitePublico } from '@/lib/data';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import { FaCalendarCheck, FaMapMarkerAlt, FaMoneyBillWave, FaExclamationTriangle, FaInfoCircle, FaClock } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const metadata: Metadata = {
  title: 'Convite para Inscrição | Apascentar',
  description: 'Você recebeu um convite especial para participar do nosso evento Face a Face.',
  openGraph: {
    title: 'Convite para Inscrição | Apascentar',
    description: 'Clique para visualizar os detalhes e realizar sua inscrição online.',
  },
};

interface ConvitePageProps {
  params: Promise<{ token: string; }>;
}

// --- TELA DE LINK INVÁLIDO REFINADA ---
const InvalidScreen = ({ motivo }: { motivo: string }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
        <div className="bg-white max-w-md w-full p-10 rounded-[2.5rem] shadow-2xl text-center space-y-6 border-t-8 border-red-500">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto transform -rotate-3">
                <FaExclamationTriangle className="text-red-500 text-4xl" />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Ops! Link Indisponível</h1>
                <p className="text-gray-500 text-sm leading-relaxed">{motivo}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl text-xs text-gray-400 font-medium leading-relaxed">
                Por favor, entre em contato com a pessoa que lhe enviou este link e solicite um novo convite.
            </div>
        </div>
    </div>
);

export default async function ConvitePage({ params }: ConvitePageProps) {
    const { token } = await params;
    const validacao = await validarConvitePublico(token);

    if (!validacao.valido || !validacao.dados) {
        return <InvalidScreen motivo={validacao.motivo || 'Este link de convite não é mais válido ou já expirou.'} />;
    }

    const { evento, celula, lider, nome_candidato_sugerido } = validacao.dados;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-purple-100">
            <div className="max-w-3xl mx-auto space-y-8">
                
                {/* Header Card: O Impacto Inicial */}
                <header className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
                    <div className="bg-gradient-to-br from-purple-700 to-indigo-900 p-8 sm:p-12 text-white text-center relative overflow-hidden">
                        {/* Marca d'água decorativa */}
                        <FaCalendarCheck className="absolute -bottom-4 -right-4 size-32 opacity-10 transform rotate-12" />
                        
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-white/20 px-4 py-1.5 rounded-full backdrop-blur-md">
                            Inscrição Oficial
                        </span>
                        <h1 className="text-3xl sm:text-5xl font-black mt-6 tracking-tight">{evento.nome_evento}</h1>
                        <p className="text-purple-200 text-lg font-medium mt-2 opacity-90">Prepare-se para uma experiência inesquecível</p>
                    </div>
                    
                    {/* Grid de Informações Rápidas */}
                    <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center bg-white relative">
                        <div className="space-y-1">
                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <FaCalendarCheck size={18} />
                            </div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Data do Encontro</p>
                            <p className="font-bold text-gray-800">
                                {format(parseISO(evento.data_inicio), "dd 'de' MMMM", { locale: ptBR })}
                            </p>
                        </div>
                        
                        <div className="space-y-1 border-y sm:border-y-0 sm:border-x border-gray-100 py-4 sm:py-0">
                            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <FaMapMarkerAlt size={18} />
                            </div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Local</p>
                            <p className="font-bold text-gray-800 leading-tight">{evento.local_evento}</p>
                        </div>

                        <div className="space-y-1">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <FaMoneyBillWave size={18} />
                            </div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Investimento</p>
                            <p className="font-bold text-gray-800">
                                R$ {Number(evento.valor_total).toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50/80 px-8 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-center items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-tighter">
                        <span>Convite gerado pela célula: <span className="text-purple-600">{celula?.nome}</span></span>
                        <span className="hidden sm:block text-gray-300">|</span>
                        <span>Líder: <span className="text-gray-700">{lider?.nome_completo}</span></span>
                    </div>
                </header>

                {/* O Wrapper que contém o formulário real */}
                <main className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    <PublicPageWrapper 
                        token={token} 
                        eventoTipo={evento.tipo}
                        initialName={nome_candidato_sugerido} 
                    />
                </main>
                
                <footer className="text-center py-8 space-y-2">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        &copy; {new Date().getFullYear()} Apascentar Células
                    </p>
                    <div className="flex justify-center gap-4 text-gray-300">
                        <FaInfoCircle size={14} />
                        <FaClock size={14} />
                    </div>
                </footer>
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';