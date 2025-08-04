import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UserMenu } from '@/components/ui/user-menu';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Users, 
  Puzzle, 
  Shield, 
  Save, 
  Plus, 
  Edit, 
  Trash2,
  Eye,
  EyeOff 
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertUserSchema, type InsertUser, type User, type Module } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getRoleDisplayName, getRoleBadgeColor, isAdmin } from '@/lib/auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('users');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/login');
    } else if (user && !isAdmin(user)) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, user, setLocation]);

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: isAuthenticated && isAdmin(user!),
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery<Module[]>({
    queryKey: ['/api/admin/modules'],
    enabled: isAuthenticated && isAdmin(user!),
  });

  const createUserMutation = useMutation({
    mutationFn: (userData: InsertUser) => adminApi.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      form.reset();
      toast({
        title: "User created",
        description: "New user has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating user",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting user",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      role: 'viewer',
      moduleAccess: [],
    },
  });

  const onSubmit = (data: InsertUser) => {
    createUserMutation.mutate(data);
  };

  const navigateToDashboard = () => {
    setLocation('/dashboard');
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  if (!isAuthenticated || !user || !isAdmin(user)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neoloc-background" data-testid="admin-screen">
      {/* Top Navigation */}
      <nav className="bg-neoloc-card shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={navigateToDashboard}
                className="text-gray-400 hover:text-neoloc-text p-2"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="bg-neoloc-primary w-10 h-10 rounded-lg flex items-center justify-center">
                <Shield className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-neoloc-text" data-testid="admin-title">
                  Administration Panel
                </h1>
                <p className="text-xs text-gray-500" data-testid="admin-subtitle">
                  System Configuration
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button 
                className="enterprise-button-primary"
                data-testid="button-save-changes"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center space-x-2" data-testid="tab-users">
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center space-x-2" data-testid="tab-modules">
              <Puzzle className="w-4 h-4" />
              <span>Module Configuration</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2" data-testid="tab-security">
              <Shield className="w-4 h-4" />
              <span>Security Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-8" data-testid="users-content">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* User List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle data-testid="users-list-title">System Users</CardTitle>
                      <Badge variant="outline" data-testid="users-count">
                        {users.length} users
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {usersLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full" data-testid="users-table">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Modules</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {users.map((u: User) => (
                              <tr key={u.id} data-testid={`user-row-${u.id}`}>
                                <td className="py-4 px-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-neoloc-primary rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs font-medium">
                                        {u.fullName.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-neoloc-text" data-testid={`user-name-${u.id}`}>
                                        {u.fullName}
                                      </p>
                                      <p className="text-sm text-gray-500" data-testid={`user-email-${u.id}`}>
                                        {u.email}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <Badge className={getRoleBadgeColor(u.role)} data-testid={`user-role-${u.id}`}>
                                    {getRoleDisplayName(u.role)}
                                  </Badge>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="text-sm text-gray-600" data-testid={`user-modules-${u.id}`}>
                                    {u.role === 'administrator' ? 'All (9)' : `${u.moduleAccess.length} modules`}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <Badge 
                                    variant={u.isActive ? "default" : "secondary"}
                                    className={u.isActive ? "bg-neoloc-secondary text-white" : ""}
                                    data-testid={`user-status-${u.id}`}
                                  >
                                    {u.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-gray-400 hover:text-neoloc-primary"
                                      data-testid={`button-edit-${u.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    {u.id !== user.id && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleDeleteUser(u.id, u.fullName)}
                                        className="text-gray-400 hover:text-red-500"
                                        data-testid={`button-delete-${u.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* User Form */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle data-testid="add-user-title">Add New User</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="add-user-form">
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          placeholder="Enter full name"
                          {...form.register('fullName')}
                          data-testid="input-fullname"
                        />
                        {form.formState.errors.fullName && (
                          <p className="text-red-600 text-xs mt-1">
                            {form.formState.errors.fullName.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="user@neoloc.com"
                          {...form.register('email')}
                          data-testid="input-user-email"
                        />
                        {form.formState.errors.email && (
                          <p className="text-red-600 text-xs mt-1">
                            {form.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter password"
                            {...form.register('password')}
                            data-testid="input-user-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="toggle-user-password"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {form.formState.errors.password && (
                          <p className="text-red-600 text-xs mt-1">
                            {form.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select 
                          onValueChange={(value) => form.setValue('role', value)}
                          defaultValue="viewer"
                        >
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Select role..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrator">Administrator</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="operator">Operator</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Module Access</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                          {modules.map((module: Module) => (
                            <div key={module.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`module-${module.id}`}
                                onCheckedChange={(checked) => {
                                  const currentAccess = form.getValues('moduleAccess') || [];
                                  if (checked) {
                                    form.setValue('moduleAccess', [...currentAccess, module.name]);
                                  } else {
                                    form.setValue('moduleAccess', currentAccess.filter(m => m !== module.name));
                                  }
                                }}
                                data-testid={`checkbox-${module.name}`}
                              />
                              <Label htmlFor={`module-${module.id}`} className="text-sm">
                                {module.displayName}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={createUserMutation.isPending}
                        className="w-full enterprise-button-primary"
                        data-testid="button-create-user"
                      >
                        {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Module Configuration Tab */}
          <TabsContent value="modules" className="space-y-8" data-testid="modules-content">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle data-testid="modules-config-title">Module Configuration</CardTitle>
                  <Button className="enterprise-button-primary" data-testid="button-add-module">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Module
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {modulesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="modules-config-grid">
                    {modules.map((module: Module) => (
                      <Card key={module.id} className="border border-gray-200" data-testid={`module-config-${module.name}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${module.color}`}>
                                <i className={`${module.icon}`}></i>
                              </div>
                              <div>
                                <h4 className="font-medium text-neoloc-text" data-testid={`module-title-${module.name}`}>
                                  {module.displayName}
                                </h4>
                                <p className="text-xs text-gray-500" data-testid={`module-endpoint-${module.name}`}>
                                  {module.endpoint}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" data-testid={`button-edit-module-${module.name}`}>
                                <Edit className="h-4 w-4 text-gray-400 hover:text-neoloc-primary" />
                              </Button>
                              <div className={`w-3 h-3 rounded-full ${module.isActive ? 'bg-neoloc-secondary' : 'bg-gray-400'}`}></div>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Status:</span>
                              <span className={`font-medium ${module.isActive ? 'text-neoloc-secondary' : 'text-gray-400'}`}>
                                {module.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Port:</span>
                              <span className="text-neoloc-text" data-testid={`module-port-${module.name}`}>
                                {module.port}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Health:</span>
                              <span className="text-neoloc-secondary">✓ OK</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings Tab */}
          <TabsContent value="security" className="space-y-8" data-testid="security-content">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle data-testid="auth-settings-title">Authentication Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neoloc-text">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-600">Require 2FA for all users</p>
                    </div>
                    <div className="bg-neoloc-secondary w-12 h-6 rounded-full relative cursor-pointer" data-testid="toggle-2fa">
                      <div className="bg-white w-5 h-5 rounded-full absolute right-0.5 top-0.5 transition-transform"></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neoloc-text">Session Timeout</p>
                      <p className="text-sm text-gray-600">Auto-logout after inactivity</p>
                    </div>
                    <Select defaultValue="30">
                      <SelectTrigger className="w-32" data-testid="select-session-timeout">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle data-testid="api-security-title">API Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="jwt-secret">JWT Secret Key</Label>
                    <Input
                      id="jwt-secret"
                      type="password"
                      value="••••••••••••••••••"
                      readOnly
                      className="text-sm"
                      data-testid="input-jwt-secret"
                    />
                  </div>

                  <div>
                    <Label htmlFor="token-expiration">Token Expiration</Label>
                    <Select defaultValue="24">
                      <SelectTrigger data-testid="select-token-expiration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="168">7 days</SelectItem>
                        <SelectItem value="720">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
