import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginRequest } from '@shared/schema';
import { authApi } from '@/lib/api';
import { 
  getStoredAuth, 
  setStoredAuth, 
  clearStoredAuth, 
  AuthState, 
  LoginResponse 
} from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(() => getStoredAuth());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const initializeAuth = async () => {
      const stored = getStoredAuth();
      
      if (stored.isAuthenticated && stored.token) {
        try {
          // Verify token is still valid
          const user = await authApi.me();
          setAuthState({
            user,
            token: stored.token,
            isAuthenticated: true,
          });
        } catch (error) {
          // Token is invalid, clear auth
          clearStoredAuth();
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const response: LoginResponse = await authApi.login(credentials.email, credentials.password);
      
      setStoredAuth(response);
      setAuthState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
      });

      toast({
        title: "Login successful",
        description: `Welcome back, ${response.user.fullName}!`,
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (authState.token) {
        await authApi.logout();
      }
    } catch (error) {
      // Ignore logout errors, clear local state anyway
      console.warn('Logout API call failed:', error);
    } finally {
      clearStoredAuth();
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
      });
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    }
  };

  const refreshUser = async () => {
    if (!authState.isAuthenticated || !authState.token) return;
    
    try {
      const user = await authApi.me();
      setAuthState(prev => ({
        ...prev,
        user,
      }));
    } catch (error) {
      // If refresh fails, user might be logged out
      await logout();
    }
  };

  const value: AuthContextType = {
    user: authState.user,
    token: authState.token,
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
