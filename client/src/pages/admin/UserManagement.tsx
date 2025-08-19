import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, insertUserProfileSchema } from "@shared/schema";
import { z } from "zod";
import { 
  Plus, Edit2, Trash2, UserCheck, UserX, Shield, Calendar, Search, Filter, 
  Eye, Settings, Activity, Phone, Mail, Building, MapPin, Clock, 
  AlertTriangle, CheckCircle, XCircle, Lock, Unlock
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { UserWithProfile, UserActivityLog, Role, Module } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const userFormSchema = insertUserSchema.extend({
  isActive: z.boolean().default(true),
  selectedModules: z.array(z.string()).default([]),
});

const profileFormSchema = insertUserProfileSchema.omit({ userId: true });

const securitySettingsSchema = z.object({
  twoFactorEnabled: z.boolean().default(false),
  forcePasswordChange: z.boolean().default(false),
  accountLocked: z.boolean().default(false),
  lockReason: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;
type ProfileFormData = z.infer<typeof profileFormSchema>;
type SecuritySettingsData = z.infer<typeof securitySettingsSchema>;

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'administrator': return 'default' as const;
    case 'manager': return 'secondary' as const;
    case 'operator': return 'outline' as const;
    case 'viewer': return 'destructive' as const;
    default: return 'outline' as const;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'administrator': return 'bg-[#2B5797] text-white';
    case 'manager': return 'bg-[#4CAF50] text-white';
    case 'operator': return 'bg-[#FF9800] text-white';
    case 'viewer': return 'bg-gray-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const getActivityIcon = (action: string) => {
  if (action.includes('login')) return <CheckCircle className="w-4 h-4 text-green-600" />;
  if (action.includes('logout')) return <XCircle className="w-4 h-4 text-gray-600" />;
  if (action.includes('password')) return <Shield className="w-4 h-4 text-blue-600" />;
  if (action.includes('module')) return <Activity className="w-4 h-4 text-purple-600" />;
  return <Clock className="w-4 h-4 text-gray-600" />;
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'text-red-600';
    case 'error': return 'text-red-500';
    case 'warning': return 'text-amber-600';
    case 'info': return 'text-blue-600';
    default: return 'text-gray-600';
  }
};

// Componente de diálogo para visualizar/editar usuário
interface UserDetailDialogProps {
  user: UserWithProfile;
  onClose: () => void;
  onUpdate: () => void;
}

function UserDetailDialog({ user, onClose, onUpdate }: UserDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      avatar: user.profile?.avatar || "",
      phoneNumber: user.profile?.phoneNumber || "",
      department: user.profile?.department || "",
      position: user.profile?.position || "",
      timezone: user.profile?.timezone || "America/Sao_Paulo",
      language: user.profile?.language || "pt-BR",
      theme: user.profile?.theme || "system",
    },
  });

  const securityForm = useForm<SecuritySettingsData>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      twoFactorEnabled: user.securitySettings?.twoFactorEnabled || false,
      forcePasswordChange: user.securitySettings?.forcePasswordChange || false,
      accountLocked: user.securitySettings?.accountLocked || false,
      lockReason: user.securitySettings?.lockReason || "",
    },
  });

  const { data: userActivity } = useQuery<UserActivityLog[]>({
    queryKey: ['/api/users', user.id, 'activity'],
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => 
      apiRequest(`/api/users/${user.id}/profile`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      onUpdate();
      toast({
        title: "Perfil atualizado",
        description: "As informações do perfil foram atualizadas com sucesso.",
      });
    },
  });

  const updateSecurityMutation = useMutation({
    mutationFn: (data: SecuritySettingsData) => 
      apiRequest(`/api/users/${user.id}/security`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      onUpdate();
      toast({
        title: "Configurações atualizadas",
        description: "As configurações de segurança foram atualizadas com sucesso.",
      });
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profile?.avatar} />
              <AvatarFallback>
                {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{user.fullName}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge className={getRoleColor(user.role)}>
              {user.role}
            </Badge>
            {!user.isActive && (
              <Badge variant="outline" className="border-red-500 text-red-600">
                Inativo
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Atividade
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Permissões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-6">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Telefone
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Departamento
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-department" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-position" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuso Horário</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-timezone">
                              <SelectValue placeholder="Selecione o fuso horário" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="America/Sao_Paulo">América/São Paulo</SelectItem>
                            <SelectItem value="America/New_York">América/Nova York</SelectItem>
                            <SelectItem value="Europe/London">Europa/Londres</SelectItem>
                            <SelectItem value="Asia/Tokyo">Ásia/Tóquio</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                    className="bg-[#2B5797] hover:bg-[#234875]"
                  >
                    {updateProfileMutation.isPending ? "Salvando..." : "Salvar Perfil"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 mt-6">
            <Form {...securityForm}>
              <form onSubmit={securityForm.handleSubmit((data) => updateSecurityMutation.mutate(data))} className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={securityForm.control}
                    name="twoFactorEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Autenticação de Dois Fatores</FormLabel>
                          <FormDescription>
                            Adicione uma camada extra de segurança à conta
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-2fa"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityForm.control}
                    name="forcePasswordChange"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Forçar Mudança de Senha</FormLabel>
                          <FormDescription>
                            Obrigar o usuário a alterar a senha no próximo login
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-force-password"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityForm.control}
                    name="accountLocked"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Conta Bloqueada</FormLabel>
                          <FormDescription>
                            Impedir o acesso do usuário ao sistema
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-account-locked"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {securityForm.watch("accountLocked") && (
                    <FormField
                      control={securityForm.control}
                      name="lockReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivo do Bloqueio</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Descreva o motivo do bloqueio da conta..."
                              data-testid="textarea-lock-reason"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateSecurityMutation.isPending}
                    data-testid="button-save-security"
                    className="bg-[#2B5797] hover:bg-[#234875]"
                  >
                    {updateSecurityMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-6">
            <ScrollArea className="h-96 w-full border rounded-md p-4">
              {userActivity && userActivity.length > 0 ? (
                <div className="space-y-3">
                  {userActivity.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="mt-0.5">
                        {getActivityIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{log.action}</p>
                          <Badge variant="outline" className={`text-xs ${getSeverityColor(log.severity)}`}>
                            {log.severity}
                          </Badge>
                        </div>
                        {log.module && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Módulo: {log.module}
                          </p>
                        )}
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.details}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma atividade registrada</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Shield className="w-5 h-5 text-[#2B5797]" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Role Principal</p>
                  <Badge className={getRoleColor(user.role)} size="sm">
                    {user.role}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Acesso a Módulos</p>
                <div className="flex flex-wrap gap-2">
                  {user.moduleAccess && user.moduleAccess.length > 0 ? (
                    user.moduleAccess.map((module, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {module}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhum módulo específico</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading: usersLoading } = useQuery<UserWithProfile[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/admin/roles'],
  });

  const { data: modules } = useQuery<Module[]>({
    queryKey: ['/api/admin/modules'],
  });

  const createUserForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      role: "viewer",
      isActive: true,
      moduleAccess: [],
      selectedModules: [],
    },
  });

  const editUserForm = useForm<Partial<UserFormData>>({
    resolver: zodResolver(userFormSchema.partial()),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: UserFormData) => {
      const { selectedModules, ...userData } = data;
      return apiRequest('/api/admin/users', 'POST', { 
        ...userData, 
        moduleAccess: selectedModules 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsCreateDialogOpen(false);
      createUserForm.reset();
      toast({
        title: "Usuário criado",
        description: "O novo usuário foi criado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar usuário",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserFormData> }) => 
      apiRequest(`/api/admin/users/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Usuário atualizado",
        description: "O usuário foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar usuário",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/users/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir usuário",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const onEditSubmit = (data: Partial<UserFormData>) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, data });
    }
  };

  const handleEditUser = (user: UserWithProfile) => {
    setSelectedUser(user);
    editUserForm.reset({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      moduleAccess: user.moduleAccess,
      selectedModules: user.moduleAccess,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: UserWithProfile) => {
    if (confirm(`Tem certeza que deseja excluir o usuário "${user.fullName}"? Esta ação não pode ser desfeita.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleViewUser = (user: UserWithProfile) => {
    setSelectedUser(user);
  };

  // Filtrar usuários baseado nos critérios
  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    const matchesStatus = selectedStatus === "all" || 
                         (selectedStatus === "active" && user.isActive) ||
                         (selectedStatus === "inactive" && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

  if (usersLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-users">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2B5797]"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="user-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#2B5797]" data-testid="page-title">
            Gerenciamento de Usuários
          </h2>
          <p className="text-muted-foreground">
            Gerencie usuários do sistema, perfis e configurações de segurança
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user" className="bg-[#2B5797] hover:bg-[#234875]">
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]" data-testid="dialog-create-user">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Adicione um novo usuário ao sistema e configure suas permissões.
              </DialogDescription>
            </DialogHeader>
            <Form {...createUserForm}>
              <form onSubmit={createUserForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createUserForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-fullname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createUserForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createUserForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createUserForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Selecione um role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="administrator">Administrador</SelectItem>
                            <SelectItem value="manager">Gerente</SelectItem>
                            <SelectItem value="operator">Operador</SelectItem>
                            <SelectItem value="viewer">Visualizador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createUserForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Conta Ativa</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createUserForm.control}
                  name="selectedModules"
                  render={() => (
                    <FormItem>
                      <FormLabel>Acesso a Módulos</FormLabel>
                      <FormDescription>
                        Selecione os módulos que o usuário pode acessar
                      </FormDescription>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {modules?.map((module) => (
                          <FormField
                            key={module.id}
                            control={createUserForm.control}
                            name="selectedModules"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(module.id)}
                                    onCheckedChange={(checked) => {
                                      const updatedModules = checked
                                        ? [...(field.value || []), module.id]
                                        : field.value?.filter((id) => id !== module.id) || [];
                                      field.onChange(updatedModules);
                                    }}
                                    data-testid={`checkbox-module-${module.id}`}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm font-normal">
                                    {module.name}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending}
                    data-testid="button-submit-user"
                    className="bg-[#2B5797] hover:bg-[#234875]"
                  >
                    {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros avançados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger data-testid="select-filter-role">
                  <SelectValue placeholder="Todos os roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os roles</SelectItem>
                  <SelectItem value="administrator">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Estatísticas</label>
              <div className="text-sm text-muted-foreground">
                {filteredUsers.length} de {users?.length || 0} usuários
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Usuários do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead>Módulos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profile?.avatar} />
                          <AvatarFallback>
                            {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.profile?.department && (
                            <p className="text-xs text-muted-foreground">{user.profile.department}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                        {user.securitySettings?.accountLocked && (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            <Lock className="w-3 h-3 mr-1" />
                            Bloqueado
                          </Badge>
                        )}
                        {user.securitySettings?.twoFactorEnabled && (
                          <Shield className="w-4 h-4 text-[#4CAF50]" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin 
                        ? formatDistanceToNow(new Date(user.lastLogin), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })
                        : "Nunca"
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.moduleAccess && user.moduleAccess.length > 0 ? (
                          user.moduleAccess.slice(0, 2).map((moduleId, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {modules?.find(m => m.id === moduleId)?.name || moduleId}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Nenhum</span>
                        )}
                        {user.moduleAccess && user.moduleAccess.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.moduleAccess.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                          data-testid={`button-view-${user.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          data-testid={`button-edit-${user.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de visualização de usuário */}
      {selectedUser && !isEditDialogOpen && (
        <UserDetailDialog
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] })}
        />
      )}

      {/* Diálogo de edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações e permissões do usuário.
            </DialogDescription>
          </DialogHeader>
          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editUserForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-edit-fullname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" value={field.value || ""} data-testid="input-edit-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editUserForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-role">
                            <SelectValue placeholder="Selecione um role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="administrator">Administrador</SelectItem>
                          <SelectItem value="manager">Gerente</SelectItem>
                          <SelectItem value="operator">Operador</SelectItem>
                          <SelectItem value="viewer">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editUserForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Conta Ativa</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                  data-testid="button-update-user"
                  className="bg-[#2B5797] hover:bg-[#234875]"
                >
                  {updateUserMutation.isPending ? "Atualizando..." : "Atualizar Usuário"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}