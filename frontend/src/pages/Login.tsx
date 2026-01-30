import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Button, Input, Card } from '../components/ui';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const { t, i18n } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      const response = await authApi.login(data.email, data.password);

      if (response.success && response.data) {
        setAuth(response.data.user, response.data.token);
        toast.success(t('common.success'));
        navigate('/dashboard');
      } else {
        toast.error(response.error || t('auth.loginError'));
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(
        error.response?.data?.error || t('auth.invalidCredentials')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-md">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
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
        </div>

        {/* Kari Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Kari Logo"
            className="h-16 mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-gray-900">
            PLM System
          </h1>
          <p className="text-gray-600 mt-2">
            {t('auth.enterCredentials')}
          </p>
        </div>

        <Card>
          <h2 className="text-xl font-semibold mb-6 text-center">
            {t('auth.login')}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="email"
              type="email"
              label={t('auth.email')}
              placeholder="your@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              id="password"
              type="password"
              label={t('auth.password')}
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              {isLoading ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Demo accounts:</p>
            <p className="mt-2">
              <span className="font-medium">Buyer:</span> buyer@example.com /
              password123
            </p>
            <p>
              <span className="font-medium">Designer:</span>{' '}
              designer@example.com / password123
            </p>
          </div>
        </Card>

        <p className="text-center mt-6 text-sm text-gray-600">
          © 2026 Kari Kids. All rights reserved.
        </p>
      </div>
    </div>
  );
};
