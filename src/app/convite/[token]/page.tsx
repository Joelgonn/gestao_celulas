// src/app/convite/[token]/page.tsx

import type { Metadata } from 'next';
import { validarConvitePublico } from '@/lib/data';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import { FaCalendarCheck, FaMapMarkerAlt, FaMoneyBillWave, FaExclamationTriangle } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const metadata: Metadata = {
  title: 'Convite para Inscrição',
  description: 'Você recebeu um convite para se inscrever em nosso evento.',
  openGraph: {
    title: 'Convite para Inscrição',
    description: 'Clique no link para visualizar o convite e realizar sua inscrição.',
  },
};

// Next.js 15/16: params é uma Promise
interface ConvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

const InvalidScreen = ({ motivo }: { motivo: string }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-lg text-center space-y-4 border-t-4 border-red-500">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <FaExclamationTriangle className="text-red-500 text-3xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Link Inválido ou Expirado</h1>
            <p className="text-gray-600">{motivo}</p>
            <p className="text-sm text-gray-500 mt-4">Por favor, peça um novo link para o seu líder.</p>
        </div>
    </div>
);

export default async function ConvitePage({ params }: ConvitePageProps) {
    // CORREÇÃO CRÍTICA PARA NEXT.JS 15/16: Aguardar params
    const { token } = await params;

    const validacao = await validarConvitePublico(token);

    if (!validacao.valido || !validacao.dados) {
        return <InvalidScreen motivo={validacao.motivo || 'Ocorreu um erro desconhecido.'} />;
    }

    const { evento, celula, lider, nome_candidato_sugerido } = validacao.dados;

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">
                
                <header className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-8 text-white text-center">
                        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">{evento.nome_evento}</h1>
                        <p className="text-purple-200 text-lg">Formulário de Inscrição Online</p>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                        <div className="px-4">
                            <FaCalendarCheck className="mx-auto text-purple-500 text-xl mb-2" />
                            <p className="text-sm text-gray-500 uppercase font-bold tracking-wide">Data</p>
                            <p className="font-semibold text-gray-800">
                                {format(parseISO(evento.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                        </div>
                        <div className="px-4 pt-4 sm:pt-0">
                            <FaMapMarkerAlt className="mx-auto text-purple-500 text-xl mb-2" />
                            <p className="text-sm text-gray-500 uppercase font-bold tracking-wide">Local</p>
                            <p className="font-semibold text-gray-800">{evento.local_evento}</p>
                        </div>
                        <div className="px-4 pt-4 sm:pt-0">
                            <FaMoneyBillWave className="mx-auto text-purple-500 text-xl mb-2" />
                            <p className="text-sm text-gray-500 uppercase font-bold tracking-wide">Valor Total</p>
                            <p className="font-semibold text-gray-800">
                                R$ {Number(evento.valor_total).toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                    </div>

                    <footer className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-center text-sm text-gray-600">
                        Convite gerado pela célula <strong>{celula?.nome || 'Não informada'}</strong> (Líder: {lider?.nome_completo || 'Não informado'})
                    </footer>
                </header>

                <main>
                    <PublicPageWrapper 
                        token={token} 
                        eventoTipo={evento.tipo}
                        initialName={nome_candidato_sugerido} 
                    />
                </main>
                
                <footer className="text-center text-gray-400 text-xs">
                    &copy; {new Date().getFullYear()} Apascentar Células. Todos os direitos reservados.
                </footer>
            </div>
        </div>
    );
}

// Garante que a página não faça cache, resolvendo o problema de link antigo.
export const dynamic = 'force-dynamic';