// src/app/(app)/reunioes/novo/page.tsx
'use client';

import { useState, useEffect } from 'react';
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
// Importa funções de data.ts
import {
    adicionarReuniao,
    listarMembros,
    verificarDuplicidadeReuniao,
    uploadMaterialReuniao,
} from '@/lib/data';
// Importa interfaces de types.ts
import {
    Membro,
    ReuniaoFormData
} from '@/lib/types';

import { formatDateForInput, formatDateForDisplay } from '@/utils/formatters';

// --- REFATORAÇÃO: TOASTS ---
// Removendo a implementação local de Toast e usando o hook global.
import useToast from '@/hooks/useToast';
// REMOVA 'import Toast from '@/components/ui/Toast';' se não for mais usado diretamente
// (o ToastContainer do hook já importa e usa o componente Toast internamente)
// import Toast from '@/components/ui/Toast';
// --- FIM REFATORAÇÃO TOASTS ---


export default function NovaReuniaoPage() {
    const [formData, setFormData] = useState<ReuniaoFormData>({
        data_reuniao: formatDateForInput(new Date().toISOString()),
        tema: '',
        ministrador_principal: null,
        ministrador_secundario: null,
        responsavel_kids: null,
        caminho_pdf: null,
    });
    const [membros, setMembros] = useState<Membro[]>([]);
    // --- REFATORAÇÃO: TOASTS ---
    // MUDANÇA AQUI: Substituir o estado local de toasts pelo hook global e desestruturar ToastContainer
    const { addToast, removeToast, ToastContainer } = useToast();
    // --- FIM REFATORAÇÃO TOASTS ---

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    // CORREÇÃO AQUI: Inicializar selectedFile com 'null' diretamente
    const [selectedFile, setSelectedFile] = useState<File | null>(null); 
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const router = useRouter();

    // --- REFATORAÇÃO: TOASTS ---
    // As funções addToast e removeToast locais foram removidas, agora usamos as do hook.
    // --- FIM REFATORAÇÃO TOASTS ---

    useEffect(() => {
        const fetchMembrosForSelect = async () => {
            try {
                const data = await listarMembros();
                setMembros(data);

                addToast('Lista de membros carregada com sucesso', 'success', 3000); // Usando o addToast do hook
            } catch (e: any) {
                console.error("Erro ao carregar membros para selects:", e);
                addToast(e.message || 'Erro desconhecido ao carregar lista de membros', 'error'); // Usando o addToast do hook
            } finally {
                setLoading(false);
            }
        };
        fetchMembrosForSelect();
    }, [addToast]); // Adicionar addToast às dependências do useEffect

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value === '' ? null : value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Validações
        if (!formData.tema.trim()) {
            addToast('O campo "Tema / Palavra" é obrigatório', 'error'); // Usando o addToast do hook
            setSubmitting(false);
            return;
        }
        if (!formData.ministrador_principal) {
            addToast('O campo "Ministrador Principal" é obrigatório', 'error'); // Usando o addToast do hook
            setSubmitting(false);
            return;
        }
        if (!formData.data_reuniao) {
            addToast('O campo "Data da Reunião" é obrigativo', 'error'); // Usando o addToast do hook
            setSubmitting(false);
            return;
        }

        // Validação de duplicidade
        try {
            const isDuplicate = await verificarDuplicidadeReuniao(formData.data_reuniao, formData.tema);
            if (isDuplicate) {
                addToast(`Já existe uma reunião com o tema '${formData.tema}' na data ${formatDateForDisplay(formData.data_reuniao)}`, 'error'); // Usando o addToast do hook
                setSubmitting(false);
                return;
            }
        } catch (e: any) {
            console.error("Erro ao verificar duplicidade:", e);
            addToast(e.message || 'Erro ao verificar duplicidade da reunião', 'error'); // Usando o addToast do hook
            setSubmitting(false);
            return;
        }

        try {
            // Adiciona a reunião e obtém o ID da reunião recém-criada (que é uma string)
            const novaReuniaoId = await adicionarReuniao({
                data_reuniao: formData.data_reuniao,
                tema: formData.tema,
                ministrador_principal: formData.ministrador_principal,
                ministrador_secundario: formData.ministrador_secundario,
                responsavel_kids: formData.responsavel_kids,
            });

            if (selectedFile) {
                setUploading(true);
                setUploadProgress(0);

                let progress = 0;
                const interval = setInterval(() => {
                    progress += 10;
                    if (progress <= 90) {
                        setUploadProgress(progress);
                    } else {
                        clearInterval(interval);
                    }
                }, 200);

                // --- CORREÇÃO APLICADA AQUI ---
                // novaReuniaoId já é a string do ID.
                const publicUrl = await uploadMaterialReuniao(novaReuniaoId, selectedFile);
                clearInterval(interval);
                setUploadProgress(100);

                addToast('Reunião registrada e material enviado com sucesso', 'success', 4000); // Usando o addToast do hook
            } else {
                addToast('Reunião registrada com sucesso', 'success', 4000); // Usando o addToast do hook
            }

            setTimeout(() => {
                router.push('/reunioes');
            }, 2000);

        } catch (e: any) {
            console.error("Erro ao registrar reunião ou fazer upload:", e);
            addToast(e.message || 'Erro desconhecido ao registrar reunião', 'error'); // Usando o addToast do hook
            setUploadProgress(0);
        } finally {
            setSubmitting(false);
            setUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            {/* Renderiza o ToastContainer do hook global */}
            <ToastContainer />

            {/* Conteúdo Principal */}
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                    {/* Header com Gradiente */}
                    <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <FaPlus className="w-8 h-8" /> {/* Ícone para "Nova Reunião" */}
                                    Nova Reunião
                                </h1>
                                <p className="text-emerald-100 mt-2">Registre uma nova reunião da célula</p>
                            </div>
                            <Link
                                href="/reunioes"
                                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30"
                            >
                                <FaArrowLeft className="w-4 h-4 mr-2" /> {/* Ícone de voltar */}
                                Voltar
                            </Link>
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="p-6 sm:p-8">
                        {loading ? (
                            <div className="text-center py-12">
                                <LoadingSpinner /> {/* Usando o LoadingSpinner global */}
                                <p className="mt-4 text-gray-600 font-medium">Carregando lista de membros...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Informações Básicas */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Data da Reunião */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="data_reuniao" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaCalendarAlt className="w-4 h-4 text-emerald-500" /> {/* Ícone de calendário */}
                                            Data da Reunião *
                                        </label>
                                        <input
                                            type="date"
                                            id="data_reuniao"
                                            name="data_reuniao"
                                            value={formData.data_reuniao}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                                        />
                                    </div>

                                    {/* Tema */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="tema" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaBookOpen className="w-4 h-4 text-emerald-500" /> {/* Ícone de livro aberto */}
                                            Tema / Palavra *
                                        </label>
                                        <input
                                            type="text"
                                            id="tema"
                                            name="tema"
                                            value={formData.tema}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                                            placeholder="Digite o tema ou palavra da reunião"
                                        />
                                    </div>
                                </div>

                                {/* Ministradores */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Ministrador Principal */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="ministrador_principal" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaUser className="w-4 h-4 text-emerald-500" /> {/* Ícone de usuário */}
                                            Ministrador Principal *
                                        </label>
                                        <select
                                            id="ministrador_principal"
                                            name="ministrador_principal"
                                            value={formData.ministrador_principal || ''}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white"
                                        >
                                            <option value="">-- Selecione um Membro --</option>
                                            {membros.map((membro) => (
                                                <option key={membro.id} value={membro.id}>{membro.nome}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Ministrador Secundário */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="ministrador_secundario" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaUser className="w-4 h-4 text-emerald-500" /> {/* Ícone de usuário */}
                                            Ministrador Secundário
                                        </label>
                                        <select
                                            id="ministrador_secundario"
                                            name="ministrador_secundario"
                                            value={formData.ministrador_secundario || ''}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white"
                                        >
                                            <option value="">-- Selecione um Membro --</option>
                                            {membros.map((membro) => (
                                                <option key={membro.id} value={membro.id}>{membro.nome}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Responsável Kids */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="responsavel_kids" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaChild className="w-4 h-4 text-emerald-500" /> {/* Ícone de criança */}
                                            Responsável Kids
                                        </label>
                                        <select
                                            id="responsavel_kids"
                                            name="responsavel_kids"
                                            value={formData.responsavel_kids || ''}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white"
                                        >
                                            <option value="">-- Selecione um Membro --</option>
                                            {membros.map((membro) => (
                                                <option key={membro.id} value={membro.id}>{membro.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Seção de Upload de Material */}
                                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                                        <FaFilePdf className="w-5 h-5" /> {/* Ícone de PDF */}
                                        Material da Reunião (Opcional)
                                    </h3>
                                    <p className="text-sm text-blue-700 mb-4">
                                        Você pode enviar o material da reunião (PDF/PPT) agora ou posteriormente.
                                        O arquivo será vinculado automaticamente à reunião após o registro.
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="material_file" className="block text-sm font-semibold text-gray-700 mb-2">
                                                Selecione o arquivo (PDF/PPT)
                                            </label>
                                            <input
                                                type="file"
                                                id="material_file"
                                                accept=".pdf,.ppt,.pptx"
                                                onChange={handleFileChange}
                                                disabled={uploading || submitting}
                                                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                            {selectedFile && (
                                                <div className="mt-2 p-3 bg-white rounded-lg border border-green-200">
                                                    <div className="flex items-center space-x-3">
                                                        <FaCheckCircle className="w-6 h-6 text-green-500" /> {/* Ícone de check */}
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">Arquivo selecionado:</p>
                                                            <p className="text-sm text-gray-600">{selectedFile.name}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {uploading && (
                                            <div className="space-y-2">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${uploadProgress}%` }}
                                                    ></div>
                                                </div>
                                                <p className="text-sm text-center text-gray-600">
                                                    Enviando material... {uploadProgress}%
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Botão Submit */}
                                <button
                                    type="submit"
                                    disabled={submitting || uploading}
                                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            {selectedFile ? 'Registrando e enviando...' : 'Registrando...'}
                                        </>
                                    ) : (
                                        <>
                                            <FaSave className="w-5 h-5" /> {/* Ícone de salvar */}
                                            Registrar Reunião
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}