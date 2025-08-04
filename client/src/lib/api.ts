import { getStoredAuth } from './auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const auth = getStoredAuth();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (auth.token && auth.isAuthenticated) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || 'API request failed',
      response.status,
      errorData
    );
  }

  return response;
};

export const apiGet = async (endpoint: string): Promise<any> => {
  const response = await apiCall(endpoint, { method: 'GET' });
  return response.json();
};

export const apiPost = async (endpoint: string, data?: any): Promise<any> => {
  const response = await apiCall(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.json();
};

export const apiPut = async (endpoint: string, data?: any): Promise<any> => {
  const response = await apiCall(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.json();
};

export const apiDelete = async (endpoint: string): Promise<any> => {
  const response = await apiCall(endpoint, { method: 'DELETE' });
  return response.json();
};

// Specific API functions
export const authApi = {
  login: (email: string, password: string) =>
    apiPost('/auth/login', { email, password }),
  
  logout: () => apiPost('/auth/logout'),
  
  me: () => apiGet('/auth/me'),
  
  validate: (token: string) => apiPost('/auth/validate', { token }),
};

export const modulesApi = {
  getAll: () => apiGet('/modules'),
  
  getById: (id: string) => apiGet(`/modules/${id}`),
};

export const adminApi = {
  getUsers: () => apiGet('/admin/users'),
  
  createUser: (userData: any) => apiPost('/admin/users', userData),
  
  updateUser: (id: string, userData: any) => apiPut(`/admin/users/${id}`, userData),
  
  deleteUser: (id: string) => apiDelete(`/admin/users/${id}`),
  
  getModules: () => apiGet('/admin/modules'),
};

export const dashboardApi = {
  getStats: () => apiGet('/dashboard/stats'),
};
