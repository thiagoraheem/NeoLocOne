import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, Shield, Clock, User, Activity, Settings, Eye, AlertTriangle, CheckCircle, XCircle, Phone, Mail, MapPin, Calendar, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { insertUserSchema, insertUserProfileSchema, insertUserSecuritySettingsSchema } from "@shared/schema";
import { z } from "zod";
import type { UserWithProfile, UserActivityLog, UserProfile, UserSecuritySettings, Role } from "@shared/schema";

const userFormSchema = insertUserSchema.extend({
  isActive: z.boolean().default(true),
});

const profileFormSchema = insertUserProfileSchema.omit({ userId: true });
const securityFormSchema = insertUserSecuritySettingsSchema.omit({ userId: true }).partial();

type UserFormData = z.infer<typeof userFormSchema>;
type ProfileFormData = z.infer<typeof profileFormSchema>;
type SecurityFormData = z.infer<typeof securityFormSchema>;

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'administrator': return 'destructive';
    case 'manager': return 'default';
    case 'operator': return 'secondary';
    case 'viewer': return 'outline';
    default: return 'outline';
  }
};

const getActivitySeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'text-red-600 dark:text-red-400';
    case 'error': return 'text-red-500 dark:text-red-400';
    case 'warning': return 'text-yellow-600 dark:text-yellow-400';
    case 'info': return 'text-blue-600 dark:text-blue-400';
    default: return 'text-gray-600 dark:text-gray-400';
  }
};

const getActivityIcon = (action: string) => {
  if (action.includes('login')) return <CheckCircle className="w-4 h-4" />;
  if (action.includes('logout')) return <XCircle className="w-4 h-4" />;
  if (action.includes('password')) return <Shield className="w-4 h-4" />;
  if (action.includes('module')) return <Activity className="w-4 h-4" />;
  return <Clock className="w-4 h-4" />;
};

interface UserDetailDialogProps {
  user: UserWithProfile;
  onClose: () => void;
}

function UserDetailDialog({ user, onClose }: UserDetailDialogProps) {
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

  const securityForm = useForm<SecurityFormData>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      twoFactorEnabled: user.securitySettings?.twoFactorEnabled || false,
      forcePasswordChange: user.securitySettings?.forcePasswordChange || false,
      accountLocked: user.securitySettings?.accountLocked || false,
      lockReason: user.securitySettings?.lockReason || "",
    },
  });

  const { data: activityLogs } = useQuery<UserActivityLog[]>({
    queryKey: ['/api/users', user.id, 'activity'],
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => 
      apiRequest(`/api/users/${user.id}/profile`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Perfil atualizado",
        description: "O perfil do usuário foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar perfil",
        variant: "destructive",
      });
    },
  });

  const updateSecurityMutation = useMutation({
    mutationFn: (data: SecurityFormData) => 
      apiRequest(`/api/users/${user.id}/security`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Configurações de segurança atualizadas",
        description: "As configurações de segurança foram atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar configurações",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onSecuritySubmit = (data: SecurityFormData) => {
    updateSecurityMutation.mutate(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profile?.avatar || undefined} />
              <AvatarFallback>
                {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{user.fullName}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant={getRoleBadgeVariant(user.role)}>
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
              <User className="w-4 h-4" />
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
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-6">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
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
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
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

                  <FormField
                    control={profileForm.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idioma</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-language">
                              <SelectValue placeholder="Selecione o idioma" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                            <SelectItem value="en-US">English (US)</SelectItem>
                            <SelectItem value="es-ES">Español</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tema</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-theme">
                              <SelectValue placeholder="Selecione o tema" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">Claro</SelectItem>
                            <SelectItem value="dark">Escuro</SelectItem>
                            <SelectItem value="system">Sistema</SelectItem>
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
                  >
                    {updateProfileMutation.isPending ? "Salvando..." : "Salvar Perfil"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 mt-6">
            <Form {...securityForm}>
              <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={securityForm.control}
                    name="twoFactorEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Autenticação de Dois Fatores</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Adicione uma camada extra de segurança à conta
                          </div>
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
                          <div className="text-sm text-muted-foreground">
                            Obrigar o usuário a alterar a senha no próximo login
                          </div>
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
                          <div className="text-sm text-muted-foreground">
                            Impedir o acesso do usuário ao sistema
                          </div>
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
                              value={field.value || ""} 
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

                {user.securitySettings && (
                  <div className="space-y-3">
                    <Separator />
                    <h4 className="text-sm font-medium">Informações de Segurança</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label>Tentativas de Login Falhadas</Label>
                        <p className="text-muted-foreground">
                          {user.securitySettings.failedLoginAttempts || 0}
                        </p>
                      </div>
                      <div>
                        <Label>Última Mudança de Senha</Label>
                        <p className="text-muted-foreground">
                          {user.securitySettings.lastPasswordChangeAt 
                            ? formatDistanceToNow(new Date(user.securitySettings.lastPasswordChangeAt), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })
                            : "Nunca"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateSecurityMutation.isPending}
                    data-testid="button-save-security"
                  >
                    {updateSecurityMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Log de Atividades</h4>
                <Badge variant="outline">{activityLogs?.length || 0} registros</Badge>
              </div>
              
              <ScrollArea className="h-96 w-full border rounded-md p-4">
                {activityLogs && activityLogs.length > 0 ? (
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className={`mt-0.5 ${getActivitySeverityColor(log.severity)}`}>
                          {getActivityIcon(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{log.action}</p>
                            <Badge variant="outline" className="text-xs">
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
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4 mt-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Roles e Permissões</h4>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Role Principal</p>
                    <Badge variant={getRoleBadgeVariant(user.role)} className="mt-1">
                      {user.role}
                    </Badge>
                  </div>
                </div>

                {user.roles && user.roles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Roles Adicionais</Label>
                    {user.roles.map((role) => (
                      <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{role.displayName}</p>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </div>
                        <Badge variant="secondary">{role.permissions.length} permissões</Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Acesso a Módulos</Label>
                  <div className="flex flex-wrap gap-2">
                    {user.moduleAccess && user.moduleAccess.length > 0 ? (
                      user.moduleAccess.map((module) => (
                        <Badge key={module} variant="outline" className="text-xs">
                          {module}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum módulo específico</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function EnhancedUserManagement() {
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<UserWithProfile[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ['/api/admin/roles'],
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
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: UserFormData) => apiRequest('/api/admin/users', 'POST', data),
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

  const handleDeleteUser = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário "${name}"?`)) {
      deleteUserMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gestão Avançada de Usuários</h2>
        </div>
        <div className="text-center py-8">
          <p>Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão Avançada de Usuários</h2>
          <p className="text-muted-foreground">
            Gerencie usuários, perfis, configurações de segurança e atividades
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <Form {...createUserForm}>
              <form onSubmit={createUserForm.handleSubmit(onCreateSubmit)} className="space-y-4">
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Conta Ativa</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Permitir que o usuário acesse o sistema
                        </div>
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

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit-user">
                    {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
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
                  <TableHead>Segurança</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profile?.avatar || undefined} />
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
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.isActive ? "default" : "destructive"}>
                          {user.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                        {user.securitySettings?.accountLocked && (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            Bloqueado
                          </Badge>
                        )}
                        {user.securitySettings?.twoFactorEnabled && (
                          <Shield className="w-4 h-4 text-green-600" />
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
                      <div className="flex items-center gap-2">
                        {user.securitySettings?.failedLoginAttempts && user.securitySettings.failedLoginAttempts > 0 && (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs">{user.securitySettings.failedLoginAttempts}</span>
                          </div>
                        )}
                        {user.securitySettings?.forcePasswordChange && (
                          <Badge variant="outline" className="text-xs">
                            Alterar senha
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                          data-testid={`button-view-${user.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.fullName)}
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

      {selectedUser && (
        <UserDetailDialog
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}