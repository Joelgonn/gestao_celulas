// src/components/MainLayout.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image'; 
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner'; 
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
  FaBookOpen,
  FaUserCog,
  FaCalendarCheck // <-- Ícone para Eventos Face a Face
} from 'react-icons/fa';

import useToast from '@/hooks/useToast'; 

// Importar a nova função de verificação de eventos ativos (ainda não implementada em data.ts, mas será)
import { listarEventosFaceAFaceAtivos } from '@/lib/data'; // <-- NOVO IMPORT AQUI

// --- Componente NavItem (Inalterado) ---
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
    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg' 
    : 'text-orange-100 hover:bg-orange-700 hover:text-white hover:shadow-md';
  
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`flex items-center space-x-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 transform hover:translate-x-1 ${activeClass} cursor-pointer`}
    >
      <div className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-orange-200'}`}>
        {icon}
      </div>
      <span className="flex-1 truncate">{children}</span>
      {isActive && (
        <div className="w-2 h-2 bg-white rounded-full"></div>
      )}
    </Link>
  );
};

// --- FUNÇÃO DE LOGOUT BLINDADA ---
type AddToastFunction = (message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;

const useLogout = (addToast: AddToastFunction) => {
  const performLogout = useCallback(async (callback?: () => void) => {
    if (callback) callback();

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Erro silencioso ao deslogar do Supabase (ignorando):', error);
      addToast('Sessão expirada. Redirecionando...', 'warning');
    } finally {
      if (typeof window !== 'undefined') {
        for (const key in localStorage) {
          if (key.startsWith('sb:') || key.includes('supabase')) {
            localStorage.removeItem(key);
          }
        }
        for (const key in sessionStorage) {
            if (key.startsWith('sb:') || key.includes('supabase')) {
                sessionStorage.removeItem(key);
            }
        }
        
        window.location.href = '/logout'; 
      }
    }
  }, [addToast]);

  return performLogout;
};

// --- Componente LogoutButton (APENAS PARA A SIDEBAR) ---
const LogoutButtonSidebar: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const { addToast } = useToast(); 
  const logout = useLogout(addToast); 
  
  return (
    <button
      onClick={() => logout(onLogout)}
      className="w-full text-left py-3 px-4 rounded-xl text-sm font-medium text-red-100 hover:bg-red-700 hover:text-white transition-all duration-200 flex items-center space-x-3 group cursor-pointer"
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
  const { addToast, ToastContainer } = useToast(); 
  const logout = useLogout(addToast); 
  
  const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  // NOVO ESTADO: Para controlar a visibilidade do item para líderes
  const [hasActiveFaceAFaceEvents, setHasActiveFaceAFaceEvents] = useState(false); // <-- NOVO ESTADO AQUI
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function fetchUserAndEvents() { // Renomeado para englobar a nova lógica
      setLoadingRole(true);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && !error) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!profileError && profile) {
            const role = profile.role as 'admin' | 'líder';
            setUserRole(role);
            setUserProfile(profile);

            // Se o usuário for um líder, verifica se há eventos Face a Face ativos
            if (role === 'líder') {
              try {
                const activeEvents = await listarEventosFaceAFaceAtivos(); // <-- CHAMA A NOVA FUNÇÃO
                setHasActiveFaceAFaceEvents(activeEvents && activeEvents.length > 0);
              } catch (eventError) {
                console.error("Erro ao verificar eventos Face a Face ativos para líder:", eventError);
                setHasActiveFaceAFaceEvents(false);
              }
            } else {
                setHasActiveFaceAFaceEvents(false); // Admin não usa essa flag, ou se for outro role
            }

          } else {
            setUserRole(null);
            setHasActiveFaceAFaceEvents(false);
          }
        } else {
          setUserRole(null);
          setHasActiveFaceAFaceEvents(false);
        }
      } catch (error) {
        console.error("Erro ao buscar role ou eventos:", error);
      } finally {
        setLoadingRole(false);
      }
    }
    fetchUserAndEvents();
  }, [addToast]); 

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  useEffect(() => {
    const handleClickOutsideDropdown = (event: MouseEvent) => {
      if (userDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && userButtonRef.current && !userButtonRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutsideDropdown); 
    }
    return () => document.removeEventListener('mousedown', handleClickOutsideDropdown);
  }, [userDropdownOpen]);

  const navItems = [
    { href: '/dashboard', icon: <FaHome className="text-lg" />, label: 'Dashboard', forAdmin: true, forLider: true },
    { href: '/admin/users', icon: <FaUserCog className="text-lg" />, label: 'Gerenciar Usuários', forAdmin: true, forLider: false },
    { href: '/admin/celulas', icon: <FaHome className="text-lg" />, label: 'Gerenciar Células', forAdmin: true, forLider: false },
    { href: '/admin/palavra-semana', icon: <FaBookOpen className="text-lg" />, label: 'Palavra da Semana', forAdmin: true, forLider: false },
    // Item de Eventos Face a Face: Visível para Admin OU para Líderes SE houver eventos ativos
    { 
        href: '/admin/eventos-face-a-face', // Rota para o Admin gerenciar
        icon: <FaCalendarCheck className="text-lg" />, 
        label: 'Eventos Face a Face (Admin)', // Texto para o Admin
        forAdmin: true, 
        forLider: false,
        // Opcional: Se quiser que o líder tenha uma rota separada para INSCRIÇÕES, adicione aqui:
        // { href: '/eventos-face-a-face', icon: <FaCalendarCheck className="text-lg" />, label: 'Inscrições Face a Face', forAdmin: false, forLider: true, conditional: hasActiveFaceAFaceEvents },
    }, 
    // NOVO ITEM: Rota para LÍDERES, visível apenas se houver eventos ativos E for líder
    {
        href: '/eventos-face-a-face', // Rota para o líder fazer inscrições
        icon: <FaCalendarCheck className="text-lg" />,
        label: 'Inscrições Face a Face',
        forAdmin: false, // Admin usa a rota de admin
        forLider: true,
        conditional: hasActiveFaceAFaceEvents // <-- Condição principal aqui
    },
    { href: '/membros', icon: <FaUsers className="text-lg" />, label: 'Membros', forAdmin: true, forLider: true },
    { href: '/visitantes', icon: <FaUserFriends className="text-lg" />, label: 'Visitantes', forAdmin: true, forLider: true },
    { href: '/reunioes', icon: <FaCalendarAlt className="text-lg" />, label: 'Reuniões', forAdmin: true, forLider: true },
    { href: '/relatorios', icon: <FaChartBar className="text-lg" />, label: 'Relatórios', forAdmin: true, forLider: true },
  ];

  if (loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <LoadingSpinner />
      </div>
    );
  }

  const filteredNavItems = navItems.filter(item => {
    if (userRole === 'admin') {
      return item.forAdmin;
    }
    if (userRole === 'líder') {
      // Se for um item para líder com condição, verifica a condição
      if (item.forLider && item.hasOwnProperty('conditional')) {
        return item.conditional;
      }
      return item.forLider;
    }
    return false;
  });

  const currentPageTitle = filteredNavItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <ToastContainer />
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div 
            ref={sidebarRef}
            className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-orange-700 to-orange-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar Header Mobile */}
            <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-orange-700 to-orange-900 border-b border-orange-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1">
                  <Image 
                    src="/logo.png" 
                    alt="Logo" 
                    width={32} 
                    height={32} 
                    className="object-contain" 
                  />
                </div>
                <h1 className="text-white text-lg font-bold truncate">Apascentar Células</h1>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-white/80 hover:text-white transition-colors duration-200 p-2 rounded-md cursor-pointer"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* User Info Mobile */}
            <div className="px-4 py-4 border-b border-orange-700 md:hidden">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
                  <FaUser className="text-white text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {userProfile?.nome_completo || 'Usuário'}
                  </p>
                  <p className="text-orange-200 text-xs truncate">
                    {userRole === 'admin' ? 'Administrador' : 'Líder'}
                  </p>
                </div>
              </div>
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
              
              {/* Opções de Perfil/Logout no Mobile Sidebar */}
              <div className="px-4 py-2 mt-4 border-t border-orange-700">
                <NavItem
                  href="/profile"
                  icon={<FaUser className="text-lg" />}
                  isActive={pathname === '/profile'}
                  onClick={() => setSidebarOpen(false)}
                >
                  Meu Perfil
                </NavItem>
                <LogoutButtonSidebar onLogout={() => setSidebarOpen(false)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-gradient-to-b from-orange-600 to-orange-900 shadow-2xl">
          <div className="flex items-center justify-center h-16 flex-shrink-0 px-4 bg-gradient-to-r from-orange-700 to-orange-900 border-b border-orange-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1">
                <Image 
                  src="/logo.png" 
                  alt="Logo" 
                  width={32} 
                  height={32} 
                  className="object-contain" 
                />
              </div>
              <h1 className="text-white text-lg font-bold">Apascentar Células</h1>
            </div>
          </div>
          
          <div className="px-4 py-4 border-b border-orange-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
                <FaUser className="text-white text-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {userProfile?.nome_completo || 'Usuário'}
                </p>
                <p className="text-orange-200 text-xs truncate">
                  {userRole === 'admin' ? 'Administrador' : 'Líder'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto">
            <nav className="flex-1 px-4 py-4 space-y-2">
              {filteredNavItems.map((item) => {
                // Adicionalmente, ajusta o label para admins em rotas de líder (se desejar)
                const label = (userRole === 'admin' && item.href === '/eventos-face-a-face')
                    ? 'Eventos Face a Face (Admin)'
                    : item.label;

                return (
                  <NavItem key={item.href} href={item.href} icon={item.icon} isActive={pathname.startsWith(item.href)}>
                    {label}
                  </NavItem>
                );
              })}
            </nav>
            
            <div className="px-4 py-2 mt-auto border-t border-orange-700">
              <NavItem
                href="/profile"
                icon={<FaUser className="text-lg" />}
                isActive={pathname === '/profile'}
              >
                Meu Perfil
              </NavItem>
              <LogoutButtonSidebar />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 bg-gray-50">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm z-20 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
              aria-label="Abrir menu"
            >
              <FaBars size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 truncate">{currentPageTitle}</h1>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              ref={userButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setUserDropdownOpen(!userDropdownOpen);
              }}
              className="flex items-center space-x-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
              aria-haspopup="true"
              aria-expanded={userDropdownOpen}
            >
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center border border-orange-200">
                <FaUser size={14} />
              </div>
              <FaChevronDown className={`text-gray-400 text-xs transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''} hidden sm:block`} />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                <Link
                  href="/profile"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors cursor-pointer"
                >
                  <FaUser className="mr-3 text-gray-400" /> Meu Perfil
                </Link>
                <button
                  onClick={() => logout(() => setUserDropdownOpen(false))}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <FaSignOutAlt className="mr-3" /> Sair
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;