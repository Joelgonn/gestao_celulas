// src/app/(app)/visitantes/novo/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    adicionarVisitante, 
    listarCelulasParaAdmin, 
    CelulaOption,
    Visitante // Manter Visitante para tipagem interna se necessário
} from '@/lib/data';
import { normalizePhoneNumber } from '@/utils/formatters';

// --- REFATORAÇÃO: TOASTS (CORRETO AGORA) ---
import useToast from '@/hooks/useToast'; // Importa o hook useToast global
import Toast from '@/components/ui/Toast';   // Importa o componente Toast global
import LoadingSpinner from '@/components/ui/LoadingSpinner'; // Para o loading inicial
// --- FIM REFATORAÇÃO TOASTS ---

import { 
    FaUserPlus, 
    FaPhone, 
    FaCalendar, 
    FaMapMarkerAlt, 
    FaComments,
    FaArrowLeft,
    FaSave,
    FaTimes
} from 'react-icons/fa';

// --- CORREÇÃO: Interface NovoVisitanteFormData atualizada e correta ---
interface NovoVisitanteFormData { 
    nome: string;
    telefone: string | null;
    data_primeira_visita: string;
    data_nascimento: string | null; // Adicionado: data de nascimento
    endereco: string | null;
    data_ultimo_contato: string | null; 
    observacoes: string | null;
    celula_id: string; // Adicionado: celula_id é obrigatório para adicionar um visitante
}
// --- FIM CORREÇÃO ---

export default function NovoVisitantePage() {
    const [formData, setFormData] = useState<NovoVisitanteFormData>({
        nome: '',
        telefone: null,
        data_primeira_visita: new Date().toISOString().split('T')[0],
        data_nascimento: null,
        endereco: null,
        data_ultimo_contato: null, 
        observacoes: null,
        celula_id: '',
    });
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]);

    const router = useRouter();
    // --- REFATORAÇÃO: TOASTS (USANDO O HOOK GLOBAL) ---
    const { toasts, addToast, removeToast } = useToast(); // AQUI ESTAVA O ERRO useToastStore()
    // --- FIM REFATORAÇÃO TOASTS ---

    useEffect(() => {
        const fetchDependencies = async () => {
            setLoading(true);
            try {
                const cells = await listarCelulasParaAdmin();
                setCelulasOptions(cells);

                if (cells.length === 1) {
                    setFormData(prev => ({ ...prev, celula_id: cells[0].id }));
                }

                addToast('Listas de células carregadas.', 'success', 3000);
            } catch (e: any) {
                console.error("Erro ao carregar dependências para novo visitante:", e);
                addToast(e.message || 'Erro ao carregar dados iniciais', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchDependencies();
    }, [addToast]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name === 'telefone') {
            setFormData(prev => ({ ...prev, [name]: normalizePhoneNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
        }
        
        if (!touched[name]) {
            setTouched({ ...touched, [name]: true });
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name } = e.target;
        if (!touched[name]) {
            setTouched({ ...touched, [name]: true });
        }
    };

    const getFieldError = (fieldName: keyof NovoVisitanteFormData): string | null => {
        if (!touched[fieldName]) return null;
        
        const value = formData[fieldName];
        
        switch (fieldName) {
            case 'nome':
                return !value || !value.trim() ? 'Nome é obrigatório' : null;
            case 'telefone':
                if (value && (value.length < 10 || value.length > 11)) {
                    return 'Telefone deve ter 10 ou 11 dígitos';
                }
                return null;
            case 'data_primeira_visita':
                return !value ? 'Data da primeira visita é obrigatória' : null;
            case 'celula_id':
                return !value ? 'Célula é obrigatória' : null;
            default:
                return null;
        }
    };
    
    const hasErrors = (): boolean => {
        return !formData.nome.trim() || 
               !!(formData.telefone && (formData.telefone.length < 10 || formData.telefone.length > 11)) ||
               !formData.data_primeira_visita ||
               !formData.celula_id;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const allTouched = Object.keys(formData).reduce((acc, key) => {
            acc[key as keyof NovoVisitanteFormData] = true;
            return acc;
        }, {} as Record<string, boolean>);
        setTouched(allTouched);

        if (hasErrors()) {
            addToast('Por favor, corrija os erros no formulário', 'error');
            return;
        }

        setSubmitting(true);

        try {
            await adicionarVisitante({
                nome: formData.nome.trim(),
                telefone: formData.telefone || null,
                data_primeira_visita: formData.data_primeira_visita,
                data_nascimento: formData.data_nascimento || null,
                endereco: formData.endereco || null,
                data_ultimo_contato: formData.data_ultimo_contato || null, 
                observacoes: formData.observacoes || null,
                celula_id: formData.celula_id,
            });
            
            addToast('Visitante adicionado com sucesso!', 'success', 3000);
            
            setTimeout(() => {
                router.push('/visitantes');
            }, 1500);
            
        } catch (e: any) {
            console.error("Erro ao adicionar visitante:", e);
            if (e.code === '23505') { 
                addToast('Já existe um visitante com este nome na sua célula', 'error');
            } else {
                addToast(`Falha ao adicionar: ${e.message || 'Erro desconhecido'}`, 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const InputField = ({ 
        label, 
        name, 
        type = 'text', 
        required = false, 
        icon: Icon,
        placeholder,
        maxLength,
        rows
    }: {
        label: string;
        name: keyof NovoVisitanteFormData;
        type?: string;
        required?: boolean;
        icon?: any;
        placeholder?: string;
        maxLength?: number;
        rows?: number;
    }) => {
        const error = getFieldError(name);
        const isTextarea = type === 'textarea';
        
        return (
            <div className="space-y-2">
                <label htmlFor={name} className="block text-sm font-medium text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                
                <div className="relative">
                    {Icon && (
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <Icon className="w-4 h-4" />
                        </div>
                    )}
                    
                    {isTextarea ? (
                        <textarea
                            id={name}
                            name={name}
                            value={(formData[name] as string) || ''}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            rows={rows}
                            placeholder={placeholder}
                            className={`w-full pl-${Icon ? '10' : '3'} pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                                error 
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400'
                            }`}
                        />
                    ) : (
                        <input
                            type={type}
                            id={name}
                            name={name}
                            value={(formData[name] as string) || ''}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required={required}
                            placeholder={placeholder}
                            maxLength={maxLength}
                            className={`w-full pl-${Icon ? '10' : '3'} pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                                error 
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400'
                            }`}
                        />
                    )}
                </div>
                
                {error && (
                    <p className="text-red-600 text-sm flex items-center space-x-1">
                        <FaTimes className="w-3 h-3" />
                        <span>{error}</span>
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4 sm:px-6 lg:px-8">
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

            {/* Conteúdo Principal */}
            <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-2xl shadow-xl p-6 mb-8 text-white">
                    <div className="flex items-center space-x-4">
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                            <FaUserPlus className="text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Adicionar Novo Visitante</h1>
                            <p className="text-emerald-100 mt-2">Cadastre um novo visitante na célula</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            <InputField
                                label="Nome Completo"
                                name="nome"
                                required={true}
                                icon={FaUserPlus}
                                placeholder="Digite o nome completo do visitante"
                            />

                            <InputField
                                label="Telefone"
                                name="telefone"
                                icon={FaPhone}
                                placeholder="(XX) XXXXX-XXXX"
                                maxLength={11}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField
                                    label="Data da 1ª Visita"
                                    name="data_primeira_visita"
                                    type="date"
                                    required={true}
                                    icon={FaCalendar}
                                />

                                <InputField
                                    label="Data de Nascimento"
                                    name="data_nascimento"
                                    type="date"
                                    icon={FaCalendar}
                                />
                            </div>

                            {/* Campo de seleção de Célula (apenas para admins) */}
                            {celulasOptions.length > 1 && (
                                <div className="space-y-2">
                                    <label htmlFor="celula_id" className="block text-sm font-medium text-gray-700">
                                        Célula <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <FaMapMarkerAlt className="w-4 h-4" />
                                        </div>
                                        <select
                                            id="celula_id"
                                            name="celula_id"
                                            required
                                            value={formData.celula_id}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                                                getFieldError('celula_id') 
                                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                                                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400'
                                            }`}
                                        >
                                            <option value="">-- Selecione a Célula --</option>
                                            {celulasOptions.map(celula => (
                                                <option key={celula.id} value={celula.id}>{celula.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {getFieldError('celula_id') && (
                                        <p className="text-red-600 text-sm flex items-center space-x-1">
                                            <FaTimes className="w-3 h-3" />
                                            <span>{getFieldError('celula_id')}</span>
                                        </p>
                                    )}
                                </div>
                            )}

                            <InputField
                                label="Endereço"
                                name="endereco"
                                icon={FaMapMarkerAlt}
                                placeholder="Digite o endereço completo"
                            />

                            <InputField
                                label="Data Último Contato"
                                name="data_ultimo_contato"
                                type="date"
                                icon={FaCalendar}
                            />

                            <InputField
                                label="Observações"
                                name="observacoes"
                                type="textarea"
                                icon={FaComments}
                                placeholder="Adicione observações sobre o visitante..."
                                rows={4}
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
                            <div className="text-sm text-gray-500">
                                Campos marcados com <span className="text-red-500">*</span> são obrigatórios
                            </div>
                            
                            <div className="flex space-x-3 w-full sm:w-auto">
                                <Link 
                                    href="/visitantes" 
                                    className="flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-medium w-full sm:w-auto"
                                >
                                    <FaArrowLeft className="w-4 h-4" />
                                    <span>Voltar</span>
                                </Link>
                                
                                <button 
                                    type="submit" 
                                    disabled={submitting || loading || hasErrors()}
                                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-xl hover:from-emerald-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl w-full sm:w-auto"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Adicionando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaSave className="w-4 h-4" />
                                            <span>Adicionar Visitante</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <FaComments className="text-blue-600 w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-blue-800">Dicas para cadastro</h3>
                            <ul className="text-sm text-blue-600 mt-1 space-y-1">
                                <li>• Preencha o nome completo para facilitar a identificação</li>
                                <li>• O telefone deve incluir DDD (10 ou 11 dígitos)</li>
                                <li>• Registre observações importantes sobre o visitante</li>
                                <li>• Mantenha a data do último contato atualizada</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}