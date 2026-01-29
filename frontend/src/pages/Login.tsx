import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button, Input, Card } from '../components/ui';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(6, 'Пароль должен быть минимум 6 символов'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      const response = await authApi.login(data.email, data.password);

      if (response.success && response.data) {
        setAuth(response.data.user, response.data.token);
        toast.success('Вход выполнен успешно!');
        navigate('/dashboard');
      } else {
        toast.error(response.error || 'Ошибка входа');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(
        error.response?.data?.error || 'Неверный email или пароль'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-md">
        {/* Kari Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Kari Logo"
            className="h-16 mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-gray-900">
            PLM Система
          </h1>
          <p className="text-gray-600 mt-2">
            Управление разработкой одежды
          </p>
        </div>

        <Card>
          <h2 className="text-xl font-semibold mb-6 text-center">
            Вход в систему
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="your@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              id="password"
              type="password"
              label="Пароль"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              Войти
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Демо аккаунты:</p>
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
          © 2026 Kari Kids. Все права защищены.
        </p>
      </div>
    </div>
  );
};
