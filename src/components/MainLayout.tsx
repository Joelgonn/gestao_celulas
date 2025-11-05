// src/components/MainLayout.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react'; // Adicionei useCallback aqui
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import LoadingSpinner from './LoadingSpinner';
import {
  FaHome,
  FaUsers,
  FaUserFriends,
  FaCalendarAlt,
  FaChartBar,
  FaUser,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChevronDown,
  FaChurch,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes as FaClose,
  FaBookOpen // NOVO: Ícone para Palavra da Semana
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

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

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
              <FaClose className="text-sm" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return { addToast, removeToast, ToastContainer };
};

// --- Componente NavItem ---
interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive: boolean;
  isHidden?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, children, isActive, isHidden, onClick }) => {
  if (isHidden) return null;
  
  const activeClass = isActive 
    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
    : 'text-indigo-100 hover:bg-indigo-700 hover:text-white hover:shadow-md';
  
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`flex items-center space-x-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 transform hover:translate-x-1 ${activeClass}`}
    >
      <div className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-indigo-300'}`}>
        {icon}
      </div>
      <span className="flex-1">{children}</span>
      {isActive && (
        <div className="w-2 h-2 bg-white rounded-full"></div>
      )}
    </Link>
  );
};

// --- Componente LogoutButton ---
const LogoutButton: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/login');
      onLogout?.();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };
  
  return (
    <button
      onClick={handleLogout}
      className="w-full text-left py-3 px-4 rounded-xl text-sm font-medium text-red-100 hover:bg-red-700 hover:text-white transition-all duration-200 flex items-center space-x-3 group"
    >
      <FaSignOutAlt className="text-lg group-hover:scale-110 transition-transform duration-200" />
      <span>Sair</span>
    </button>
  );
};

// --- Componente MainLayout ---
interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { addToast, ToastContainer } = useToast();

  useEffect(() => {
    async function fetchUserRole() {
      setLoadingRole(true);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && !error) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (profileError || !profile) {
            console.error("Erro ao buscar perfil:", profileError);
            setUserRole(null);
            addToast('Erro ao carregar perfil do usuário', 'error');
          } else {
            setUserRole(profile.role as 'admin' | 'líder');
            setUserProfile(profile);
          }
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error("Erro ao buscar role:", error);
        addToast('Erro ao carregar informações do usuário', 'error');
      } finally {
        setLoadingRole(false);
      }
    }
    fetchUserRole();
  }, [addToast]);

  // Fechar sidebar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownOpen) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userDropdownOpen]);

  // Definição dos itens da navegação
  const navItems = [
    {
      href: '/dashboard',
      icon: <FaHome className="text-lg" />,
      label: 'Dashboard',
      forAdmin: true,
      forLider: true,
    },
    {
      href: '/admin/celulas', 
      icon: <FaChurch className="text-lg" />,
      label: 'Gerenciar Células',
      forAdmin: true,
      forLider: false,
    },
    // NOVO: Item de navegação para Palavra da Semana (apenas Admin)
    {
        href: '/admin/palavra-semana',
        icon: <FaBookOpen className="text-lg" />,
        label: 'Palavra da Semana',
        forAdmin: true,
        forLider: false,
    },
    {
      href: '/membros',
      icon: <FaUsers className="text-lg" />,
      label: 'Membros',
      forAdmin: true,
      forLider: true,
    },
    {
      href: '/visitantes',
      icon: <FaUserFriends className="text-lg" />,
      label: 'Visitantes',
      forAdmin: true,
      forLider: true,
    },
    {
      href: '/reunioes',
      icon: <FaCalendarAlt className="text-lg" />,
      label: 'Reuniões',
      forAdmin: true,
      forLider: true,
    },
    { 
      href: '/relatorios',
      icon: <FaChartBar className="text-lg" />,
      label: 'Relatórios',
      forAdmin: true,
      forLider: true,
    },
  ];

  // Renderiza o spinner se a role do usuário ainda estiver carregando
  if (loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <LoadingSpinner />
      </div>
    );
  }

  const filteredNavItems = navItems.filter(item => {
    if (userRole === 'admin') return item.forAdmin;
    if (userRole === 'líder') return item.forLider;
    return false;
  });

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden">
          <div 
            ref={sidebarRef}
            className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-indigo-800 to-purple-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-indigo-900 to-purple-800 border-b border-indigo-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <FaChurch className="text-indigo-600 text-lg" />
                </div>
                <h1 className="text-white text-xl font-bold">Sistema Células</h1>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-indigo-200 hover:text-white transition-colors duration-200"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>
            
            {/* Navigation */}
            <div className="flex-1 flex flex-col overflow-y-auto py-4">
              <nav className="flex-1 px-4 space-y-2">
                {filteredNavItems.map((item) => {
                  const label = userRole === 'admin' && ['/membros', '/visitantes', '/reunioes', '/relatorios'].includes(item.href)
                    ? `${item.label} (Auditoria)`
                    : item.label;

                  return (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      isActive={pathname.startsWith(item.href)}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {label}
                    </NavItem>
                  );
                })}
              </nav>
              
              {/* Logout Button */}
              <div className="px-4 py-4 border-t border-indigo-700 mt-auto">
                <LogoutButton onLogout={() => setSidebarOpen(false)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-gradient-to-b from-indigo-800 to-purple-900 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 flex-shrink-0 px-4 bg-gradient-to-r from-indigo-900 to-purple-800 border-b border-indigo-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <FaChurch className="text-indigo-600 text-lg" />
              </div>
              <h1 className="text-white text-xl font-bold">Sistema Células</h1>
            </div>
          </div>
          
          {/* User Info */}
          <div className="px-4 py-4 border-b border-indigo-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                <FaUser className="text-white text-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {userProfile?.nome_completo || 'Usuário'}
                </p>
                <p className="text-indigo-200 text-xs truncate">
                  {userRole === 'admin' ? 'Administrador' : 'Líder'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <nav className="flex-1 px-4 py-4 space-y-2">
              {filteredNavItems.map((item) => {
                const label = userRole === 'admin' && ['/membros', '/visitantes', '/reunioes', '/relatorios'].includes(item.href)
                  ? `${item.label} (Auditoria)`
                  : item.label;

                return (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    isActive={pathname.startsWith(item.href)}
                  >
                    {label}
                  </NavItem>
                );
              })}
            </nav>
            
            {/* Profile Link */}
            <div className="px-4 py-2">
              <NavItem
                href="/profile"
                icon={<FaUser className="text-lg" />}
                isActive={pathname === '/profile'}
              >
                Meu Perfil
              </NavItem>
            </div>

            {/* Logout Button */}
            <div className="flex-shrink-0 px-4 py-4 border-t border-indigo-700 mt-auto">
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-30">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200"
            >
              <FaBars className="text-lg" />
            </button>

            {/* Page Title */}
            <div className="flex-1 md:flex-none">
              <h1 className="text-xl font-semibold text-gray-800 text-center md:text-left">
                {filteredNavItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard'}
              </h1>
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUserDropdownOpen(!userDropdownOpen);
                }}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                  <FaUser className="text-white text-xs" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700">
                    {userProfile?.nome_completo || 'Usuário'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {userRole === 'admin' ? 'Administrador' : 'Líder'}
                  </p>
                </div>
                <FaChevronDown className={`text-gray-400 text-xs transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-40">
                  <Link
                    href="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <FaUser className="text-gray-400" />
                    <span>Meu Perfil</span>
                  </Link>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      supabase.auth.signOut().then(() => router.replace('/login'));
                    }}
                    className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    <FaSignOutAlt className="text-red-400" />
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100">
          {children}
        </main>
      </div>

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default MainLayout;