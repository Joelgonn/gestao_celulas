// src/app/(app)/membros/novo/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Importa funções de data.ts
import {
    adicionarMembro,
    listarCelulasParaAdmin,
} from '@/lib/data';
// Importa interfaces de types.ts
import {
    Membro,        // Para referenciar o tipo 'status'
    CelulaOption   // Para as opções de célula
} from '@/lib/types'; // <--- CORREÇÃO AQUI: Importar Membro e CelulaOption de types.ts

import { normalizePhoneNumber } from '@/utils/formatters';

// --- REFATORAÇÃO: TOASTS ---
import useToast from '@/hooks/useToast';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/LoadingSpinner'; // Usando o LoadingSpinner principal
// --- FIM REFATORAÇÃO TOASTS ---

// --- NOVO: Ícones para a página (para o layout moderno) ---
import { 
    FaUserPlus, 
    FaPhone, 
    FaCalendarAlt, // Mudado de FaCalendar para FaCalendarAlt para consistência
    FaMapMarkerAlt, 
    FaComments, // Para observações, se houver
    FaArrowLeft,
    FaSave,
    FaUserTag // Para o status, se for usar ícone
} from 'react-icons/fa';
// --- FIM NOVO: Ícones ---

// CORREÇÃO: Definir FormData diretamente baseada na interface Membro de types.ts
// Omitimos 'id' e 'created_at' e 'celula_nome' porque não são fornecidos ao criar.
interface MembroNewFormData extends Omit<Membro, 'id' | 'created_at' | 'celula_nome'> {}


export default function NewMembroPage() {
    const [formData, setFormData] = useState<MembroNewFormData>({ // <--- Usar a nova interface
        nome: '',
        telefone: null,
        data_ingresso: new Date().toISOString().split('T')[0], // Data padrão atual
        data_nascimento: null,
        endereco: null,
        status: 'Ativo',
        celula_id: '',
    });
    
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]);
    const [loading, setLoading] = useState(true); // Inicializa como true para mostrar o spinner no primeiro carregamento
    const [submitting, setSubmitting] = useState(false);
    
    const { toasts, addToast, removeToast } = useToast();

    const router = useRouter();

    useEffect(() => {
        const fetchDependencies = async () => {
            setLoading(true); // Inicia o loading
            try {
                const cells = await listarCelulasParaAdmin();
                setCelulasOptions(cells);

                if (cells.length === 1) {
                    setFormData(prev => ({ ...prev, celula_id: cells[0].id }));
                }

                addToast('Listas de células carregadas.', 'success', 3000); // Ajuste a mensagem se precisar de mais detalhes
            } catch (e: any) {
                console.error("Erro ao carregar dependências para novo membro:", e);
                addToast(e.message || 'Erro ao carregar dados iniciais', 'error');
            } finally {
                setLoading(false); // Finaliza o loading
            }
        };
        fetchDependencies();
    }, [addToast]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // CORREÇÃO: Garante que strings vazias de campos opcionais são convertidas para null.
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'telefone' ? normalizePhoneNumber(value) : (value === '' ? null : value) 
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Validações
        if (!formData.nome.trim()) {
            addToast('O campo "Nome Completo" é obrigatório.', 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.data_ingresso.trim()) {
            addToast('O campo "Data de Ingresso" é obrigatório.', 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.celula_id) { // Validação de célula para admins ou se houver mais de uma opção
            addToast('O campo "Célula" é obrigatório.', 'error');
            setSubmitting(false);
            return;
        }

        // Normaliza o telefone novamente antes de enviar para a ação do servidor
        const normalizedPhone = normalizePhoneNumber(formData.telefone);

        const newMembroDataForAction: Omit<Membro, 'id' | 'created_at' | 'celula_nome'> = {
            nome: formData.nome.trim(), // Garantir trim
            telefone: normalizedPhone || null, // Garante que seja null se vazio
            data_ingresso: formData.data_ingresso,
            data_nascimento: formData.data_nascimento,
            endereco: formData.endereco,
            status: formData.status,
            celula_id: formData.celula_id,
        };

        try {
            await adicionarMembro(newMembroDataForAction);

            addToast('Membro adicionado com sucesso!', 'success', 3000);
            setTimeout(() => {
                router.push('/membros');
            }, 2000);

        } catch (error: any) {
            console.error("Erro ao adicionar membro:", error);
            addToast(`Falha ao adicionar membro: ${error.message || "Erro desconhecido"}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            {/* Container de Toasts global */}
            <div className="fixed top-4 right-4 z-50 w-80 space-y-2">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                        duration={toast.duration}
                    />
                ))}
            </div>

            <div className="max-w-2xl mx-auto">
                {loading ? (
                    // CORREÇÃO AQUI: Envolver o LoadingSpinner em um fragmento ou div para o comentário
                    <>
                        <LoadingSpinner /> {/* Renderiza o LoadingSpinner quando `loading` é true */}
                    </>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                        {/* Header com Gradiente - Inspirado nas páginas de edição */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                        <FaUserPlus className="w-8 h-8" />
                                        Novo Membro
                                    </h1>
                                    <p className="text-indigo-100 mt-2">Preencha os detalhes para adicionar um novo membro à célula.</p>
                                </div>
                                <Link 
                                    href="/membros"
                                    className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30"
                                >
                                    <FaArrowLeft className="w-4 h-4 mr-2" />
                                    Voltar
                                </Link>
                            </div>
                        </div>

                        {/* Formulário */}
                        <div className="p-6 sm:p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Campo Nome Completo */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="nome" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaUserPlus className="w-4 h-4 text-indigo-500" />
                                        Nome Completo *
                                    </label>
                                    <input
                                        id="nome"
                                        name="nome"
                                        type="text"
                                        required
                                        value={formData.nome}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                        placeholder="Nome completo do novo membro"
                                    />
                                </div>

                                {/* Campo Telefone */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="telefone" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaPhone className="w-4 h-4 text-indigo-500" />
                                        Telefone
                                    </label>
                                    <input
                                        id="telefone"
                                        name="telefone"
                                        type="tel"
                                        value={formData.telefone || ''}
                                        onChange={handleChange}
                                        placeholder="(XX) XXXXX-XXXX"
                                        maxLength={11}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                    />
                                </div>

                                {/* Campo Endereço */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="endereco" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaMapMarkerAlt className="w-4 h-4 text-indigo-500" />
                                        Endereço
                                    </label>
                                    <input
                                        id="endereco"
                                        name="endereco"
                                        type="text"
                                        value={formData.endereco || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                        placeholder="Endereço completo do novo membro"
                                    />
                                </div>

                                {/* Datas: Ingresso e Nascimento */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="data_ingresso" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaCalendarAlt className="w-4 h-4 text-indigo-500" />
                                            Data de Ingresso *
                                        </label>
                                        <input
                                            id="data_ingresso"
                                            name="data_ingresso"
                                            type="date"
                                            required
                                            value={formData.data_ingresso}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                        />
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="data_nascimento" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaCalendarAlt className="w-4 h-4 text-indigo-500" />
                                            Data de Nascimento
                                        </label>
                                        <input
                                            id="data_nascimento"
                                            name="data_nascimento"
                                            type="date"
                                            value={formData.data_nascimento || ''}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {/* Campo Status */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaUserTag className="w-4 h-4 text-indigo-500" />
                                        Status *
                                    </label>
                                    <select
                                        id="status"
                                        name="status"
                                        required
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                                    >
                                        <option value="Ativo">Ativo</option>
                                        <option value="Inativo">Inativo</option>
                                        <option value="Em transição">Em transição</option>
                                    </select>
                                </div>

                                {/* Seleção de Célula (apenas para admins, ou se houver mais de uma opção) */}
                                {celulasOptions.length > 0 && ( // CORREÇÃO: se for 0, não mostra o seletor. Se for 1, mostra e preenche.
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="celula_id" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaComments className="w-4 h-4 text-indigo-500" /> {/* Ícone genérico, pode ser mudado */}
                                            Célula *
                                        </label>
                                        <select
                                            id="celula_id"
                                            name="celula_id"
                                            required
                                            value={formData.celula_id}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                                            disabled={celulasOptions.length === 1} // Desabilita se houver apenas uma opção
                                        >
                                            {celulasOptions.length > 1 && <option value="">-- Selecione a Célula --</option>} {/* Opção padrão apenas se houver mais de 1 */}
                                            {celulasOptions.map(celula => (
                                                <option key={celula.id} value={celula.id}>{celula.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {/* Se houver apenas uma célula (Líder), o input de celula_id está oculto e preenchido automaticamente */}
                                {/* REMOVIDO: Este input hidden não é mais necessário se o select está desabilitado e preenchido */}
                                {/* {celulasOptions.length === 1 && (
                                    <input type="hidden" name="celula_id" value={formData.celula_id} />
                                )} */}


                                {/* Botões de Ação */}
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
                                    <Link 
                                        href="/membros" 
                                        className="flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-medium w-full sm:w-auto"
                                    >
                                        <FaArrowLeft className="w-4 h-4" />
                                        <span>Cancelar</span>
                                    </Link>
                                    
                                    <button 
                                        type="submit" 
                                        disabled={submitting}
                                        className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl w-full sm:w-auto"
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Adicionando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaSave className="w-4 h-4" />
                                                <span>Adicionar Membro</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}