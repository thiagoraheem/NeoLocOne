import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neoloc-background" data-testid="loading-screen">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-neoloc-primary" />
            <h2 className="text-xl font-semibold text-neoloc-text mb-2">Loading...</h2>
            <p className="text-gray-600">Initializing NeoLoc One</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will be handled by router
  }

  if (requireAdmin && user?.role !== 'administrator') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neoloc-background" data-testid="access-denied">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-neoloc-text mb-2">Access Denied</h2>
            <p className="text-gray-600">Administrator privileges required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
