// src/components/AuthForm.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  FaEnvelope, 
  FaMagic, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaInfoCircle, 
  FaTimes,
  FaShieldAlt,
  FaKey,
  FaLock
} from 'react-icons/fa';

// Sistema de Toast integrado
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-xl shadow-lg border-l-4 transform transition-all duration-300 ease-in-out ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-500 text-green-800' 
              : toast.type === 'error'
              ? 'bg-red-50 border-red-500 text-red-800'
              : toast.type === 'warning'
              ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
              : 'bg-blue-50 border-blue-500 text-blue-800'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 mt-0.5 ${
              toast.type === 'success' 
                ? 'text-green-500' 
                : toast.type === 'error'
                ? 'text-red-500'
                : toast.type === 'warning'
                ? 'text-yellow-500'
                : 'text-blue-500'
            }`}>
              {toast.type === 'success' && <FaCheckCircle className="text-lg" />}
              {toast.type === 'error' && <FaExclamationTriangle className="text-lg" />}
              {toast.type === 'warning' && <FaExclamationTriangle className="text-lg" />}
              {toast.type === 'info' && <FaInfoCircle className="text-lg" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className={`flex-shrink-0 ml-2 hover:bg-opacity-20 hover:bg-black rounded-full p-1 transition-colors ${
                toast.type === 'success' 
                  ? 'text-green-500 hover:text-green-700' 
                  : toast.type === 'error'
                  ? 'text-red-500 hover:text-red-700'
                  : toast.type === 'warning'
                  ? 'text-yellow-500 hover:text-yellow-700'
                  : 'text-blue-500 hover:text-blue-700'
              }`}
            >
              <FaTimes className="text-sm" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return { addToast, removeToast, ToastContainer };
};

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [authMethod, setAuthMethod] = useState<'magic_link' | 'password'>('magic_link');

  const router = useRouter();
  const { addToast, ToastContainer } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Validação de email
      if (!email.trim().includes('@')) {
        addToast('Por favor, insira um email válido.', 'error');
        setLoading(false);
        return;
      }

      if (authMethod === 'magic_link') {
        // --- LOGIN COM LINK MÁGICO ---
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) throw error;
        
        // Sucesso (Mostra tela de "Link Enviado")
        setStep('success');
        addToast('Link de acesso enviado para seu email!', 'success');

      } else {
        // --- LOGIN COM SENHA ---
        if (!password) {
            addToast('Por favor, digite sua senha.', 'warning');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });

        if (error) throw error;

        // Sucesso (Redireciona direto)
        addToast('Login realizado com sucesso!', 'success');
        router.push('/dashboard');
      }
      
    } catch (error: any) {
      console.error('Erro no login:', error);
      let msg = error.message;
      if (msg === 'Invalid login credentials') msg = 'Email ou senha incorretos.';
      addToast(`Erro: ${msg}`, 'error');
    } finally {
      if (authMethod === 'password') setLoading(false); // Só para senha, pois magic link muda de tela
    }
  };

  const handleResetForm = () => {
    setEmail('');
    setPassword('');
    setStep('form');
  };

  // TELA DE SUCESSO (APENAS PARA LINK MÁGICO)
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheckCircle className="text-white text-3xl" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Link Enviado com Sucesso!
            </h2>
            
            <p className="text-gray-600 mb-2">
              Enviamos um link mágico para:
            </p>
            <p className="text-indigo-600 font-semibold mb-6 break-all">
              {email}
            </p>
            
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <FaInfoCircle className="text-blue-500 text-lg mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-blue-800 text-sm font-medium">
                    Verifique sua caixa de entrada
                  </p>
                  <p className="text-blue-600 text-xs mt-1">
                    Clique no link que enviamos para acessar sua conta. O link expira em 24 horas.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleResetForm}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Enviar Novo Link
              </button>
            </div>
          </div>
        </div>
        <ToastContainer />
      </div>
    );
  }

  // TELA DE LOGIN (FORMULÁRIO)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaShieldAlt className="text-2xl" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Apascentar Células</h1>
            <p className="text-indigo-100 opacity-90">Acesso Seguro para Líderes</p>
          </div>

          {/* Abas de Seleção */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setAuthMethod('magic_link')}
              className={`flex-1 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                authMethod === 'magic_link'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaMagic className={authMethod === 'magic_link' ? 'text-indigo-600' : 'text-gray-400'} />
              <span>Link Mágico</span>
            </button>
            <button
              onClick={() => setAuthMethod('password')}
              className={`flex-1 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                authMethod === 'password'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaKey className={authMethod === 'password' ? 'text-purple-600' : 'text-gray-400'} />
              <span>Senha</span>
            </button>
          </div>

          {/* Formulário */}
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r ${authMethod === 'magic_link' ? 'from-indigo-100 to-blue-100' : 'from-purple-100 to-pink-100'}`}>
                {authMethod === 'magic_link' ? (
                   <FaMagic className="text-indigo-600 text-lg" />
                ) : (
                   <FaLock className="text-purple-600 text-lg" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                    {authMethod === 'magic_link' ? 'Acesso sem Senha' : 'Acesso com Senha'}
                </h2>
                <p className="text-gray-600 text-sm">
                    {authMethod === 'magic_link' ? 'Receba um link de acesso no email' : 'Utilize sua senha cadastrada'}
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <FaEnvelope className="text-gray-500" />
                    <span>Email</span>
                  </div>
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-all duration-200 placeholder-gray-400"
                  required
                  disabled={loading}
                />
              </div>

              {/* Campo de Senha (Condicional) */}
              {authMethod === 'password' && (
                <div className="animate-fade-in-down">
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    <div className="flex items-center space-x-2">
                        <FaLock className="text-gray-500" />
                        <span>Senha</span>
                    </div>
                    </label>
                    <input
                    id="password"
                    type="password"
                    placeholder="Sua senha segura"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 placeholder-gray-400"
                    required
                    disabled={loading}
                    />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full text-white py-4 px-6 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none bg-gradient-to-r ${
                    authMethod === 'magic_link' 
                        ? 'from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-indigo-400 disabled:to-blue-400' 
                        : 'from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-400 disabled:to-pink-400'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      {authMethod === 'magic_link' ? <FaMagic className="text-lg" /> : <FaCheckCircle className="text-lg" />}
                      <span>{authMethod === 'magic_link' ? 'Receber Link Mágico' : 'Entrar no Sistema'}</span>
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Informações adicionais */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-start space-x-3">
                <FaInfoCircle className={`${authMethod === 'magic_link' ? 'text-indigo-500' : 'text-purple-500'} text-lg mt-0.5 flex-shrink-0`} />
                <div className="text-left">
                  <p className="text-gray-700 text-sm font-medium">
                    {authMethod === 'magic_link' ? 'Como funciona?' : 'Esqueceu a senha?'}
                  </p>
                  <p className="text-gray-600 text-xs mt-1">
                    {authMethod === 'magic_link' 
                        ? 'Enviamos um link seguro para seu email. Não precisa decorar senhas.' 
                        : 'Use a opção "Link Mágico" para entrar e redefinir sua senha no perfil.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Apascentar Células &copy; 2025
          </p>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}