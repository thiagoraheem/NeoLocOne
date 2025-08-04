import { User } from "@shared/schema";

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresAt: string;
}

export const AUTH_STORAGE_KEY = "neoloc-auth";

export const getStoredAuth = (): AuthState => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      return { user: null, token: null, isAuthenticated: false };
    }

    const parsed = JSON.parse(stored);
    const expiresAt = new Date(parsed.expiresAt);
    
    if (expiresAt <= new Date()) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return { user: null, token: null, isAuthenticated: false };
    }

    return {
      user: parsed.user,
      token: parsed.token,
      isAuthenticated: true,
    };
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return { user: null, token: null, isAuthenticated: false };
  }
};

export const setStoredAuth = (loginResponse: LoginResponse): void => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loginResponse));
};

export const clearStoredAuth = (): void => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const getAuthHeaders = (token: string): Record<string, string> => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const hasModuleAccess = (user: User, moduleName: string): boolean => {
  return user.role === 'administrator' || user.moduleAccess.includes(moduleName);
};

export const isAdmin = (user: User): boolean => {
  return user.role === 'administrator';
};

export const getUserInitials = (fullName: string): string => {
  return fullName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

export const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    administrator: 'Administrator',
    manager: 'Manager',
    operator: 'Operator',
    viewer: 'Viewer',
  };
  return roleMap[role] || role;
};

export const getRoleBadgeColor = (role: string): string => {
  const colorMap: Record<string, string> = {
    administrator: 'bg-neoloc-primary/10 text-neoloc-primary',
    manager: 'bg-neoloc-secondary/10 text-neoloc-secondary',
    operator: 'bg-neoloc-accent/10 text-neoloc-accent',
    viewer: 'bg-gray-100 text-gray-600',
  };
  return colorMap[role] || 'bg-gray-100 text-gray-600';
};
