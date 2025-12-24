// src/app/(app)/reunioes/novo/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import {     
    FaPlus,
    FaArrowLeft,
    FaCalendarAlt,
    FaBookOpen,
    FaUser,
    FaChild,
    FaFilePdf,
    FaCheckCircle,
    FaSave
} from 'react-icons/fa';

import {
    adicionarReuniao,
    listarMembros,
    verificarDuplicidadeReuniao,
    uploadMaterialReuniao,
} from '@/lib/data';

import {
    Membro,
    ReuniaoFormData
} from '@/lib/types';

import { formatDateForInput, formatDateForDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';

export default function NovaReuniaoPage() {
    // Estado inicial
    const [formData, setFormData] = useState<ReuniaoFormData>({
        data_reuniao: formatDateForInput(new Date().toISOString()),
        tema: '',
        ministrador_principal: null,
        ministrador_secundario: null,
        responsavel_kids: null,
        caminho_pdf: null,
    });
    
    const [membros, setMembros] = useState<Membro[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null); 
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    // Carregamento de dados
    useEffect(() => {
        const fetchMembrosForSelect = async () => {
            try {
                const data = await listarMembros();
                setMembros(data);
            } catch (e: any) {
                console.error("Erro ao carregar membros:", e);
                addToast(e.message || 'Erro ao carregar lista de membros', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchMembrosForSelect();
    }, [addToast]);

    // Otimização: useCallback para evitar recriação da função durante a digitação
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Validações rápidas
        if (!formData.tema.trim()) {
            addToast('O tema é obrigatório', 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.ministrador_principal) {
            addToast('O ministrador principal é obrigatório', 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.data_reuniao) {
            addToast('A data é obrigatória', 'error');
            setSubmitting(false);
            return;
        }

        try {
            // Verifica duplicidade
            const isDuplicate = await verificarDuplicidadeReuniao(formData.data_reuniao, formData.tema);
            if (isDuplicate) {
                addToast(`Já existe reunião: '${formData.tema}' em ${formatDateForDisplay(formData.data_reuniao)}`, 'error');
                setSubmitting(false);
                return;
            }

            // Salva reunião
            const novaReuniaoId = await adicionarReuniao({
                data_reuniao: formData.data_reuniao,
                tema: formData.tema,
                ministrador_principal: formData.ministrador_principal,
                ministrador_secundario: formData.ministrador_secundario,
                responsavel_kids: formData.responsavel_kids,
            });

            // Upload de arquivo (se houver)
            if (selectedFile) {
                setUploading(true);
                setUploadProgress(0);

                // Simulação visual de progresso para melhor UX
                const interval = setInterval(() => {
                    setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
                }, 200);

                await uploadMaterialReuniao(novaReuniaoId, selectedFile);
                
                clearInterval(interval);
                setUploadProgress(100);
                addToast('Reunião e material salvos!', 'success', 3000);
            } else {
                addToast('Reunião salva com sucesso!', 'success', 3000);
            }

            // Delay para leitura do toast e redirecionamento
            setTimeout(() => {
                router.push('/reunioes');
            }, 1500);

        } catch (e: any) {
            console.error("Erro no processo:", e);
            addToast(e.message || 'Erro ao salvar reunião', 'error');
            setUploadProgress(0);
        } finally {
            setSubmitting(false);
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />

            <div className="max-w-4xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    
                    {/* Header Responsivo */}
                    <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-6 sm:px-6 sm:py-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                                    <FaPlus className="w-6 h-6 sm:w-8 sm:h-8" />
                                    Nova Reunião
                                </h1>
                                <p className="text-emerald-100 mt-1 text-sm sm:text-base">
                                    Registre os detalhes da célula
                                </p>
                            </div>
                            
                            <Link
                                href="/reunioes"
                                className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"
                            >
                                <FaArrowLeft className="w-3 h-3 mr-2" />
                                Voltar
                            </Link>
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="p-4 sm:p-8">
                        {loading ? (
                            <div className="text-center py-16">
                                <LoadingSpinner />
                                <p className="mt-4 text-gray-500 font-medium animate-pulse">Carregando dados...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                                
                                {/* Bloco: Dados Principais */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    {/* Data */}
                                    <div className="space-y-1">
                                        <label htmlFor="data_reuniao" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <FaCalendarAlt className="text-emerald-500" /> Data *
                                        </label>
                                        <input
                                            type="date"
                                            id="data_reuniao"
                                            name="data_reuniao"
                                            value={formData.data_reuniao}
                                            onChange={handleChange}
                                            required
                                            // 'text-base' previne zoom no iOS ao focar
                                            className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow outline-none"
                                        />
                                    </div>

                                    {/* Tema */}
                                    <div className="space-y-1">
                                        <label htmlFor="tema" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <FaBookOpen className="text-emerald-500" /> Tema / Palavra *
                                        </label>
                                        <input
                                            type="text"
                                            id="tema"
                                            name="tema"
                                            value={formData.tema}
                                            onChange={handleChange}
                                            required
                                            placeholder="Ex: O Poder da Fé"
                                            className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow outline-none placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>

                                {/* Bloco: Liderança */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-2">Liderança & Apoio</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                                        {/* Principal */}
                                        <div className="space-y-1">
                                            <label htmlFor="ministrador_principal" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                <FaUser className="text-emerald-500" /> Ministrador Principal *
                                            </label>
                                            <select
                                                id="ministrador_principal"
                                                name="ministrador_principal"
                                                value={formData.ministrador_principal || ''}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 text-base bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow outline-none"
                                            >
                                                <option value="">Selecione...</option>
                                                {membros.map(m => (
                                                    <option key={m.id} value={m.id}>{m.nome}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Secundário */}
                                        <div className="space-y-1">
                                            <label htmlFor="ministrador_secundario" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                <FaUser className="text-gray-400" /> Min. Secundário
                                            </label>
                                            <select
                                                id="ministrador_secundario"
                                                name="ministrador_secundario"
                                                value={formData.ministrador_secundario || ''}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 text-base bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow outline-none"
                                            >
                                                <option value="">Nenhum</option>
                                                {membros.map(m => (
                                                    <option key={m.id} value={m.id}>{m.nome}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Kids */}
                                        <div className="space-y-1">
                                            <label htmlFor="responsavel_kids" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                <FaChild className="text-blue-400" /> Resp. Kids
                                            </label>
                                            <select
                                                id="responsavel_kids"
                                                name="responsavel_kids"
                                                value={formData.responsavel_kids || ''}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 text-base bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow outline-none"
                                            >
                                                <option value="">Nenhum</option>
                                                {membros.map(m => (
                                                    <option key={m.id} value={m.id}>{m.nome}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Bloco: Upload */}
                                <div className="bg-blue-50/80 rounded-xl p-4 sm:p-6 border border-blue-100">
                                    <div className="flex items-start sm:items-center gap-2 mb-3">
                                        <FaFilePdf className="w-5 h-5 text-blue-600 mt-0.5 sm:mt-0" />
                                        <h3 className="text-sm sm:text-base font-bold text-blue-800">
                                            Material da Reunião (Opcional)
                                        </h3>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <label 
                                            htmlFor="material_file" 
                                            className={`
                                                flex flex-col items-center justify-center w-full h-24 sm:h-32 
                                                border-2 border-dashed rounded-lg cursor-pointer transition-colors
                                                ${selectedFile ? 'border-green-400 bg-green-50' : 'border-blue-300 bg-white hover:bg-blue-50'}
                                            `}
                                        >
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                {selectedFile ? (
                                                    <>
                                                        <FaCheckCircle className="w-8 h-8 text-green-500 mb-2" />
                                                        <p className="text-sm text-green-700 font-medium px-2 text-center truncate w-full max-w-[250px]">
                                                            {selectedFile.name}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-sm text-gray-500 font-medium">Toque para selecionar PDF/PPT</p>
                                                        <p className="text-xs text-gray-400 mt-1">Máx. 10MB</p>
                                                    </>
                                                )}
                                            </div>
                                            <input 
                                                id="material_file" 
                                                type="file" 
                                                accept=".pdf,.ppt,.pptx"
                                                className="hidden" 
                                                onChange={handleFileChange}
                                                disabled={uploading || submitting}
                                            />
                                        </label>

                                        {uploading && (
                                            <div className="space-y-1 pt-2">
                                                <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                                                    <div
                                                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                                        style={{ width: `${uploadProgress}%` }}
                                                    ></div>
                                                </div>
                                                <p className="text-xs text-center text-blue-700 font-medium">
                                                    Enviando arquivo... {uploadProgress}%
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Botão de Ação */}
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={submitting || uploading}
                                        className="
                                            w-full bg-gradient-to-r from-emerald-600 to-green-600 
                                            text-white text-lg font-bold py-4 px-6 rounded-xl shadow-md 
                                            active:scale-[0.98] transition-all duration-200 
                                            disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100
                                            flex items-center justify-center gap-3
                                        "
                                    >
                                        {submitting ? (
                                            <>
                                                {/* Spinner CSS puro para garantir cor branca sem conflito de tipos */}
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                <span className="animate-pulse">
                                                    {selectedFile ? 'Enviando...' : 'Salvando...'}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <FaSave className="w-5 h-5" />
                                                Registrar Reunião
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}