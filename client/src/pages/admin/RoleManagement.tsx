import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Settings, Users, Shield, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { RoleWithPermissions, Permission } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const roleFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  description: z.string().optional(),
});

type RoleFormData = z.infer<typeof roleFormSchema>;

export default function RoleManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roles, isLoading: rolesLoading } = useQuery<RoleWithPermissions[]>({
    queryKey: ['/api/admin/roles'],
  });

  const { data: permissions, isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ['/api/admin/permissions'],
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: RoleFormData) => apiRequest('POST', '/api/admin/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Role created",
        description: "The new role has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
    },
  });

  const onSubmit = (data: RoleFormData) => {
    createRoleMutation.mutate(data);
  };

  if (rolesLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-roles">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const groupedPermissions = permissions?.reduce((acc, permission) => {
    const resource = permission.resource;
    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="role-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="page-title">Role Management</h2>
          <p className="text-muted-foreground">
            Manage system roles and their permissions
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-role">
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" data-testid="dialog-create-role">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Add a new role to the system with custom permissions.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., project_manager" {...field} data-testid="input-role-name" />
                      </FormControl>
                      <FormDescription>
                        Internal role name (lowercase, no spaces)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Project Manager" {...field} data-testid="input-role-display-name" />
                      </FormControl>
                      <FormDescription>
                        Human-readable role name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of this role"
                          {...field}
                          data-testid="input-role-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createRoleMutation.isPending}
                    data-testid="button-submit-role"
                  >
                    {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles?.map((role) => (
          <Card key={role.id} className="relative" data-testid={`card-role-${role.name}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{role.displayName}</CardTitle>
                <div className="flex items-center space-x-2">
                  {role.isSystem && (
                    <Badge variant="secondary" data-testid={`badge-system-${role.name}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      System
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRole(role)}
                    data-testid={`button-edit-role-${role.name}`}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription className="text-sm">
                {role.description || "No description provided"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  Role: {role.name}
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Permissions ({role.permissions.length})</p>
                  <div className="grid grid-cols-2 gap-1">
                    {role.permissions.slice(0, 6).map((permission) => (
                      <Badge
                        key={permission.id}
                        variant="outline"
                        className="text-xs truncate"
                        data-testid={`badge-permission-${permission.name}`}
                      >
                        {permission.displayName}
                      </Badge>
                    ))}
                    {role.permissions.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{role.permissions.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roles?.length === 0 && (
        <Card className="p-12 text-center" data-testid="empty-roles-state">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No roles found</h3>
          <p className="text-muted-foreground mb-4">
            Create your first role to get started with role-based access control.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-role">
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        </Card>
      )}

      {/* Role Details Dialog */}
      {selectedRole && (
        <Dialog open={!!selectedRole} onOpenChange={() => setSelectedRole(null)}>
          <DialogContent className="sm:max-w-[700px]" data-testid="dialog-role-details">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedRole.displayName}
                {selectedRole.isSystem && (
                  <Badge variant="secondary">
                    <Shield className="w-3 h-3 mr-1" />
                    System Role
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedRole.description || "No description provided"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">Permissions by Resource</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => {
                    const rolePermissionIds = selectedRole.permissions.map(p => p.id);
                    const resourceRolePermissions = resourcePermissions.filter(p => 
                      rolePermissionIds.includes(p.id)
                    );
                    
                    if (resourceRolePermissions.length === 0) return null;
                    
                    return (
                      <div key={resource} className="border rounded-lg p-3">
                        <h5 className="font-medium text-sm mb-2 capitalize">{resource}</h5>
                        <div className="flex flex-wrap gap-1">
                          {resourceRolePermissions.map((permission) => (
                            <Badge
                              key={permission.id}
                              variant="secondary"
                              className="text-xs"
                              data-testid={`permission-badge-${permission.name}`}
                            >
                              {permission.action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}