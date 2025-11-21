// src/app/(app)/reunioes/editar/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
// Importa funções de data.ts
import {
    getReuniao,
    atualizarReuniao,
    listarMembros,
    verificarDuplicidadeReuniao,
    uploadMaterialReuniao,
} from '@/lib/data';
// Importa interfaces de types.ts <--- CORREÇÃO AQUI
import {
    Membro,
    ReuniaoFormData,
    ReuniaoParaEdicao,
} from '@/lib/types';

import { formatDateForInput, formatDateForDisplay } from '@/utils/formatters';

import useToast from '@/hooks/useToast';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/LoadingSpinner'; // Usando o LoadingSpinner principal
// --- NOVO: Ícones para a página (para o layout moderno) ---
import {
    FaCalendarAlt, // Para data
    FaBookOpen,    // Para tema
    FaUser,        // Para ministradores
    FaChild,       // Para responsável kids
    FaFilePdf,     // Para material
    FaArrowLeft,   // Para voltar
    FaSave,        // Para salvar
    FaUpload       // Para upload
} from 'react-icons/fa';
// --- FIM NOVO: Ícones ---


export default function EditReuniaoPage() {
    const params = useParams();
    const reuniaoId = params.id as string;

    const [formData, setFormData] = useState<ReuniaoFormData>({
        data_reuniao: '',
        tema: '',
        ministrador_principal: null,
        ministrador_secundario: null,
        responsavel_kids: null,
        caminho_pdf: null,
    });
    const [membros, setMembros] = useState<Membro[]>([]);
    const { toasts, addToast, removeToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [membrosData, reuniaoDataFromLib] = await Promise.all([
                    listarMembros(),
                    getReuniao(reuniaoId),
                ]);

                setMembros(membrosData);

                if (!reuniaoDataFromLib) {
                    addToast('A reunião solicitada não existe ou você não tem permissão para acessá-la', 'error');
                    setTimeout(() => router.replace('/reunioes'), 2000);
                    return;
                }

                setFormData({
                    data_reuniao: formatDateForInput(reuniaoDataFromLib.data_reuniao),
                    tema: reuniaoDataFromLib.tema || '',
                    ministrador_principal: reuniaoDataFromLib.ministrador_principal || null,
                    ministrador_secundario: reuniaoDataFromLib.ministrador_secundario || null,
                    responsavel_kids: reuniaoDataFromLib.responsavel_kids || null,
                    caminho_pdf: reuniaoDataFromLib.caminho_pdf || null,
                    celula_id: reuniaoDataFromLib.celula_id, // Incluir celula_id aqui
                });

                addToast('Informações da reunião carregadas com sucesso', 'success', 3000);

            } catch (e: any) {
                console.error("Erro ao buscar dados para edição da reunião:", e);
                addToast(e.message || 'Erro desconhecido ao carregar dados da reunião', 'error');
                setTimeout(() => router.replace('/reunioes'), 2000);
            } finally {
                setLoading(false);
            }
        };

        if (reuniaoId) {
            fetchData();
        }
    }, [reuniaoId, router, addToast]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // CORREÇÃO: Garante que strings vazias de campos opcionais são convertidas para null.
        setFormData({ ...formData, [name]: value === '' ? null : value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        if (!formData.tema.trim()) {
            addToast('O campo "Tema / Palavra" é obrigatório', 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.ministrador_principal) {
            addToast('O campo "Ministrador Principal" é obrigatório', 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.data_reuniao) {
            addToast('O campo "Data da Reunião" é obrigatório', 'error');
            setSubmitting(false);
            return;
        }

        try {
            const isDuplicate = await verificarDuplicidadeReuniao(formData.data_reuniao, formData.tema, reuniaoId);
            if (isDuplicate) {
                // CORREÇÃO: Usar concatenação de string simples para evitar o erro de parsing
                addToast(`Já existe outra reunião com o tema '${formData.tema}' na data ${formatDateForDisplay(formData.data_reuniao)}`, 'warning');
                setSubmitting(false);
                return;
            }
        } catch (e: any) {
            console.error("Erro ao verificar duplicidade:", e);
            addToast(e.message || 'Erro ao verificar duplicidade da reunião', 'error');
            setSubmitting(false);
            return;
        }

        try {
            await atualizarReuniao(reuniaoId, formData);

            addToast('Reunião atualizada com sucesso', 'success', 3000);

            setTimeout(() => {
                router.push('/reunioes');
            }, 2000);

        } catch (e: any) {
            console.error("Erro ao atualizar reunião:", e);
            addToast(e.message || 'Erro desconhecido ao atualizar reunião', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            addToast('Por favor, selecione um arquivo para upload', 'error');
            return;
        }
        if (!reuniaoId) {
            addToast('ID da reunião não disponível para upload', 'error');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if (progress <= 90) setUploadProgress(progress); else clearInterval(interval);
            }, 200);

            const publicUrl = await uploadMaterialReuniao(reuniaoId, selectedFile);
            clearInterval(interval);
            setUploadProgress(100);

            setFormData(prev => ({ ...prev, caminho_pdf: publicUrl }));
            setSelectedFile(null);

            addToast('Material da reunião enviado e vinculado com sucesso', 'success', 4000);

        } catch (e: any) {
            console.error("Erro ao fazer upload do material:", e);
            addToast(e.message || 'Erro desconhecido ao fazer upload do material', 'error');
            setUploadProgress(0);
        } finally {
            setUploading(false);
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

            {/* Conteúdo Principal */}
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                    {/* Header com Gradiente */}
                    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Editar Reunião
                                </h1>
                                <p className="text-teal-100 mt-2">Atualize as informações e o material da reunião</p>
                            </div>
                            <Link href="/reunioes" className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30">
                                <FaArrowLeft className="w-4 h-4 mr-2" /> {/* Ícone de voltar */}
                                Voltar
                            </Link>
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="p-6 sm:p-8">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600 font-medium">Carregando dados da reunião e membros...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="data_reuniao" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaCalendarAlt className="w-4 h-4 text-teal-500" /> {/* Ícone de calendário */}
                                            Data da Reunião *
                                        </label>
                                        <input type="date" id="data_reuniao" name="data_reuniao" value={formData.data_reuniao} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"/>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="tema" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaBookOpen className="w-4 h-4 text-teal-500" /> {/* Ícone de livro aberto */}
                                            Tema / Palavra *
                                        </label>
                                        <input type="text" id="tema" name="tema" value={formData.tema} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200" placeholder="Digite o tema ou palavra da reunião"/>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="ministrador_principal" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaUser className="w-4 h-4 text-teal-500" /> {/* Ícone de usuário */}
                                            Ministrador Principal *
                                        </label>
                                        <select id="ministrador_principal" name="ministrador_principal" value={formData.ministrador_principal || ''} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 bg-white">
                                            <option value="">-- Selecione um Membro --</option>
                                            {membros.map((membro) => (<option key={membro.id} value={membro.id}>{membro.nome}</option>))}
                                        </select>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="ministrador_secundario" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaUser className="w-4 h-4 text-teal-500" /> {/* Ícone de usuário */}
                                            Ministrador Secundário
                                        </label>
                                        <select id="ministrador_secundario" name="ministrador_secundario" value={formData.ministrador_secundario || ''} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 bg-white">
                                            <option value="">-- Selecione um Membro --</option>
                                            {membros.map((membro) => (<option key={membro.id} value={membro.id}>{membro.nome}</option>))}
                                        </select>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="responsavel_kids" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaChild className="w-4 h-4 text-teal-500" /> {/* Ícone de criança */}
                                            Responsável Kids
                                        </label>
                                        <select id="responsavel_kids" name="responsavel_kids" value={formData.responsavel_kids || ''} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 bg-white">
                                            <option value="">-- Selecione um Membro --</option>
                                            {membros.map((membro) => (<option key={membro.id} value={membro.id}>{membro.nome}</option>))}
                                        </select>
                                    </div>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                                        <FaFilePdf className="w-5 h-5" /> {/* Ícone de PDF */}
                                        Material da Reunião
                                    </h3>
                                    {formData.caminho_pdf && (<div className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-200 mb-4"><div className="flex items-center space-x-3"><FaFilePdf className="w-8 h-8 text-red-500" /><div><p className="text-sm font-medium text-gray-900">Material atual disponível</p><p className="text-sm text-gray-500">Clique para visualizar ou baixar</p></div></div><a href={formData.caminho_pdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>Abrir</a></div>)}
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="material_file" className="block text-sm font-semibold text-gray-700 mb-2">Upload novo material (PDF/PPT)</label>
                                            <input type="file" id="material_file" accept=".pdf,.ppt,.pptx" onChange={handleFileChange} disabled={uploading} className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                            {selectedFile && (<p className="mt-2 text-sm text-gray-600">Arquivo selecionado: {selectedFile.name}</p>)}
                                        </div>
                                        {uploading && (<div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div>)}
                                        <button type="button" onClick={handleFileUpload} disabled={uploading || !selectedFile} className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2">
                                            {uploading ? (<><svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg><span>Enviando {uploadProgress}%...</span></>) : (<><FaUpload className="w-5 h-5" /><span>Enviar Material</span></>)} {/* Ícone de upload */}
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" disabled={submitting || uploading} className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-teal-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center gap-2">
                                    {submitting ? (<><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>Atualizando...</>) : (<><FaSave className="w-5 h-5" />Atualizar Reunião</>)} {/* Ícone de salvar */}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}