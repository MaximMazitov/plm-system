import type { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, Package, Users, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: Home },
    { name: t('nav.models'), href: '/models-hierarchy', icon: Package },
    { name: t('nav.manageModels'), href: '/models', icon: List },
    ...(user?.role === 'buyer' ? [{ name: t('nav.users'), href: '/users', icon: Users }] : []),
  ];

  const getRoleLabel = (role: string | undefined) => {
    if (!role) return '';
    return t(`roles.${role}`, role);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Kari Logo */}
              <div className="flex-shrink-0 flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Kari Logo"
                  className="h-8"
                />
                <span className="text-xl font-semibold text-gray-900">
                  PLM System
                </span>
              </div>

              {/* Navigation links */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-primary-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User menu */}
            <div className="flex items-center gap-4">
              {/* Language Switcher */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => changeLanguage('ru')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    i18n.language === 'ru'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  RU
                </button>
                <button
                  onClick={() => changeLanguage('en')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    i18n.language === 'en'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  EN
                </button>
              </div>

              <div className="text-sm text-right">
                <p className="font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-gray-500 text-xs capitalize">{getRoleLabel(user?.role)}</p>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('auth.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
