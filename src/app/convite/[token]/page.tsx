import { Metadata } from 'next';
import { validarConvitePublico } from '@/lib/data';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import { FaCalendarCheck, FaMapMarkerAlt, FaMoneyBillWave, FaExclamationTriangle } from 'react-icons/fa';

interface ConvitePageProps {
  params: {
    token: string;
  };
}

// NOVO: Função para gerar metadados dinâmicos (para a pré-visualização do link)
export async function generateMetadata({ params }: ConvitePageProps): Promise<Metadata> {
  const { token } = params;
  const validacao = await validarConvitePublico(token);

  // Caso o link seja inválido, retorna metadados genéricos de erro
  if (!validacao.valido || !validacao.dados) {
    return {
      title: 'Convite Inválido',
      description: 'Este link de inscrição não é mais válido ou expirou.',
    };
  }

  const { evento } = validacao.dados;

  // Se o link for válido, retorna metadados personalizados com o nome do evento
  return {
    title: `Inscrição: ${evento.nome_evento}`,
    description: `Você foi convidado(a) para se inscrever no ${evento.nome_evento}. Clique para preencher seus dados!`,
    openGraph: {
      title: `Inscrição: ${evento.nome_evento}`,
      description: 'Inscrição rápida e simplificada via convite.',
      // IMPORTANTE: Substitua pela URL de uma imagem padrão para seus eventos
      // Ex: A logo da sua igreja ou uma arte do evento.
      images: ['https://exemplo.com/imagem-padrao-evento.jpg'], 
    },
  };
}


// Componente para a tela de Erro/Inválido (sem alterações)
const InvalidScreen = ({ motivo }: { motivo: string }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-lg text-center space-y-4 border-t-4 border-red-500">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <FaExclamationTriangle className="text-red-500 text-3xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Link Inválido ou Expirado</h1>
            <p className="text-gray-600">{motivo}</p>
            <p className="text-sm text-gray-400 mt-4">Peça um novo link para o seu líder.</p>
        </div>
    </div>
);


// Componente da Página (com a tipagem dos params corrigida)
export default async function ConvitePage({ params }: ConvitePageProps) {
    const { token } = params; // Correção: Acesso direto ao token

    const validacao = await validarConvitePublico(token);

    if (!validacao.valido || !validacao.dados) {
        return <InvalidScreen motivo={validacao.motivo || 'Erro desconhecido.'} />;
    }

    const { evento, celula, lider, nome_candidato_sugerido } = validacao.dados;

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">
                
                {/* Cabeçalho do Evento (sem alterações) */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-8 text-white text-center">
                        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">{evento.nome_evento}</h1>
                        <p className="text-purple-200 text-lg">Inscrição Online</p>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                        <div className="px-4">
                            <FaCalendarCheck className="mx-auto text-purple-500 text-xl mb-2" />
                            <p className="text-sm text-gray-500 uppercase font-bold tracking-wide">Data</p>
                            <p className="font-semibold text-gray-800">
                                {new Date(evento.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
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
                            <p className="font-semibold text-gray-800">R$ {evento.valor_total.toFixed(2).replace('.', ',')}</p>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-center text-sm text-gray-600">
                        Você foi convidado pela célula <strong>{celula?.nome}</strong> (Líder: {lider?.nome_completo})
                    </div>
                </div>

                {/* Wrapper do Cliente (Formulário + Sucesso) */}
                <PublicPageWrapper 
                    token={token} 
                    eventoTipo={evento.tipo}
                    initialName={nome_candidato_sugerido} 
                />
                
                <div className="text-center text-gray-400 text-xs">
                    &copy; 2025 Apascentar Células. Todos os direitos reservados.
                </div>
            </div>
        </div>
    );
}

// Garante que a página sempre seja renderizada dinamicamente no servidor
export const dynamic = 'force-dynamic';