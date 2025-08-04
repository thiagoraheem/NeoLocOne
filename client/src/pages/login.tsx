import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginRequest } from '@shared/schema';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@neoloc.com',
      password: '',
    },
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, setLocation]);

  const onSubmit = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      await login(data);
      setLocation('/dashboard');
    } catch (error) {
      // Error is handled by useAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-primary" data-testid="login-screen">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="bg-neoloc-primary w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-cube text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl font-semibold text-neoloc-text mb-2" data-testid="app-title">
              NeoLoc One
            </h1>
            <p className="text-gray-600" data-testid="app-subtitle">
              Enterprise Resource Planning Hub
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-neoloc-text mb-2">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@neoloc.com"
                {...form.register('email')}
                className="w-full"
                data-testid="input-email"
              />
              {form.formState.errors.email && (
                <p className="text-red-600 text-xs mt-1" data-testid="error-email">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-neoloc-text mb-2">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...form.register('password')}
                  className="w-full pr-12"
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-neoloc-text"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {form.formState.errors.password && (
                <p className="text-red-600 text-xs mt-1" data-testid="error-password">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" data-testid="checkbox-remember" />
                <Label htmlFor="remember" className="text-sm text-gray-600">
                  Remember me
                </Label>
              </div>
              <Button 
                variant="link" 
                className="text-sm text-neoloc-primary hover:underline p-0"
                data-testid="link-forgot-password"
              >
                Forgot password?
              </Button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full enterprise-button-primary"
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need access?{' '}
              <Button 
                variant="link" 
                className="text-neoloc-primary hover:underline p-0"
                data-testid="link-contact-admin"
              >
                Contact Administrator
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
