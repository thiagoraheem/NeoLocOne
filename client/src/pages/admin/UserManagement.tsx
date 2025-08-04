import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Edit2, Trash2, UserCheck, UserX, Shield, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { UserWithRoles, Role } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const userFormSchema = insertUserSchema.extend({
  isActive: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function UserManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading: usersLoading } = useQuery<UserWithRoles[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/admin/roles'],
    select: (data) => data.map(role => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
    })),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: UserFormData) => {
      const { isActive, ...userData } = data;
      return apiRequest('/api/admin/users', 'POST', { ...userData, isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "User created",
        description: "The new user has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserFormData> }) => 
      apiRequest(`/api/admin/users/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/users/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      role: "viewer",
      isActive: true,
      moduleAccess: [],
    },
  });

  const onSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const toggleUserStatus = (user: UserWithRoles) => {
    updateUserMutation.mutate({
      id: user.id,
      data: { isActive: !user.isActive }
    });
  };

  const handleDeleteUser = (user: UserWithRoles) => {
    if (confirm(`Are you sure you want to delete user "${user.fullName}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  if (usersLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-users">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'administrator': return 'bg-red-100 text-red-600 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'operator': return 'bg-green-100 text-green-600 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-purple-100 text-purple-600 border-purple-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="user-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="page-title">User Management</h2>
          <p className="text-muted-foreground">
            Manage system users and their roles
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" data-testid="dialog-create-user">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system and assign their role.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} data-testid="input-user-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="user@company.com" type="email" {...field} data-testid="input-user-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter password" type="password" {...field} data-testid="input-user-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-user-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles?.map((role) => (
                            <SelectItem key={role.id} value={role.name} data-testid={`option-role-${role.name}`}>
                              {role.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <FormDescription>
                          Enable or disable this user account
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-user-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create-user"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending}
                    data-testid="button-submit-user"
                  >
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {users?.map((user) => (
          <Card key={user.id} data-testid={`card-user-${user.email.split('@')[0]}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {getInitials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-user-name-${user.email.split('@')[0]}`}>
                      {user.fullName}
                    </CardTitle>
                    <CardDescription data-testid={`text-user-email-${user.email.split('@')[0]}`}>
                      {user.email}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    className={getRoleColor(user.role)}
                    data-testid={`badge-user-role-${user.email.split('@')[0]}`}
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {user.role}
                  </Badge>
                  <Badge 
                    variant={user.isActive ? "default" : "secondary"}
                    data-testid={`badge-user-status-${user.email.split('@')[0]}`}
                  >
                    {user.isActive ? (
                      <>
                        <UserCheck className="w-3 h-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <UserX className="w-3 h-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Created: {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                  </div>
                  {user.lastLogin && (
                    <div className="flex items-center">
                      Last login: {format(new Date(user.lastLogin), 'MMM dd, yyyy HH:mm')}
                    </div>
                  )}
                  <div>
                    Roles: {user.roles?.length || 0}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleUserStatus(user)}
                    disabled={updateUserMutation.isPending}
                    data-testid={`button-toggle-status-${user.email.split('@')[0]}`}
                  >
                    {user.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUser(user)}
                    data-testid={`button-edit-user-${user.email.split('@')[0]}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteUser(user)}
                    disabled={deleteUserMutation.isPending}
                    data-testid={`button-delete-user-${user.email.split('@')[0]}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users?.length === 0 && (
        <Card className="p-12 text-center" data-testid="empty-users-state">
          <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No users found</h3>
          <p className="text-muted-foreground mb-4">
            Add users to your system to get started.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-user">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </Card>
      )}

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="sm:max-w-[600px]" data-testid="dialog-user-details">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Avatar>
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {getInitials(selectedUser.fullName)}
                  </AvatarFallback>
                </Avatar>
                {selectedUser.fullName}
              </DialogTitle>
              <DialogDescription>
                {selectedUser.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Role</p>
                  <Badge className={getRoleColor(selectedUser.role)}>
                    {selectedUser.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={selectedUser.isActive ? "default" : "secondary"}>
                    {selectedUser.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedUser.createdAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                {selectedUser.lastLogin && (
                  <div>
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedUser.lastLogin), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                )}
              </div>
              
              {selectedUser.roles && selectedUser.roles.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Assigned Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.roles.map((role) => (
                      <Badge key={role.id} variant="outline">
                        {role.displayName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium mb-2">Module Access</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.moduleAccess.map((module) => (
                    <Badge key={module} variant="secondary">
                      {module}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}