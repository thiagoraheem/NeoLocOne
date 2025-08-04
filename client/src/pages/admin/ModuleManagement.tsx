import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { ModuleWithHealth } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Settings, 
  Globe, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Eye,
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
  Grid3X3
} from "lucide-react";
import { format } from "date-fns";

const moduleFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  description: z.string().optional(),
  url: z.string().url("Must be a valid URL"),
  port: z.number().min(1).max(65535).optional(),
  icon: z.string().default("Grid3X3"),
  category: z.enum(['core', 'business', 'analytics', 'integration']).default('business'),
  isActive: z.boolean().default(true),
});

type ModuleFormData = z.infer<typeof moduleFormSchema>;

const iconOptions = [
  { value: "Grid3X3", label: "Grid" },
  { value: "Users", label: "Users" },
  { value: "ShoppingCart", label: "Shopping Cart" },
  { value: "Package", label: "Package" },
  { value: "TrendingUp", label: "Trending Up" },
  { value: "BarChart3", label: "Bar Chart" },
  { value: "Database", label: "Database" },
  { value: "Settings", label: "Settings" },
  { value: "Zap", label: "Lightning" },
  { value: "Globe", label: "Globe" },
];

export default function ModuleManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleWithHealth | null>(null);
  const [isTestingModule, setIsTestingModule] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: modules, isLoading: modulesLoading } = useQuery<ModuleWithHealth[]>({
    queryKey: ['/api/admin/modules'],
  });

  const createModuleMutation = useMutation({
    mutationFn: (data: ModuleFormData) => apiRequest('POST', '/api/admin/modules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/modules'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Module created",
        description: "The new module has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create module",
        variant: "destructive",
      });
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ModuleFormData> }) => 
      apiRequest('PUT', `/api/admin/modules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/modules'] });
      toast({
        title: "Module updated",
        description: "The module has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update module",
        variant: "destructive",
      });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/modules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/modules'] });
      toast({
        title: "Module deleted",
        description: "The module has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete module",
        variant: "destructive",
      });
    },
  });

  const testModuleMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/admin/modules/${id}/test`),
    onSuccess: (data: any, id: string) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/modules'] });
      setIsTestingModule(null);
      toast({
        title: "Module tested",
        description: `Health check completed: ${data.status}`,
      });
    },
    onError: (error: any) => {
      setIsTestingModule(null);
      toast({
        title: "Test failed",
        description: error.message || "Failed to test module connectivity",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      url: "",
      port: undefined,
      icon: "Grid3X3",
      category: "business",
      isActive: true,
    },
  });

  const onSubmit = (data: ModuleFormData) => {
    createModuleMutation.mutate(data);
  };

  const toggleModuleStatus = (module: ModuleWithHealth) => {
    updateModuleMutation.mutate({
      id: module.id,
      data: { isActive: !module.isActive }
    });
  };

  const testModuleHealth = (moduleId: string) => {
    setIsTestingModule(moduleId);
    testModuleMutation.mutate(moduleId);
  };

  const handleDeleteModule = (module: ModuleWithHealth) => {
    if (confirm(`Are you sure you want to delete module "${module.displayName}"? This action cannot be undone.`)) {
      deleteModuleMutation.mutate(module.id);
    }
  };

  const getHealthStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'unhealthy': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'disabled': return <Pause className="w-4 h-4 text-gray-600" />;
      default: return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getHealthStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-600 border-green-200';
      case 'unhealthy': return 'bg-red-100 text-red-600 border-red-200';
      case 'disabled': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-600 border-yellow-200';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'core': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'business': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'analytics': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'integration': return 'bg-teal-100 text-teal-600 border-teal-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  if (modulesLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-modules">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="module-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="page-title">Module Management</h2>
          <p className="text-muted-foreground">
            Configure and manage system modules and their health status
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-module">
              <Plus className="mr-2 h-4 w-4" />
              Add Module
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]" data-testid="dialog-create-module">
            <DialogHeader>
              <DialogTitle>Add New Module</DialogTitle>
              <DialogDescription>
                Configure a new module for the system dashboard.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., inventory_system" {...field} data-testid="input-module-name" />
                        </FormControl>
                        <FormDescription>
                          Unique identifier (lowercase, no spaces)
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
                          <Input placeholder="e.g., Inventory System" {...field} data-testid="input-module-display-name" />
                        </FormControl>
                        <FormDescription>
                          User-friendly name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the module's purpose"
                          {...field}
                          data-testid="input-module-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Module URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://module.example.com" {...field} data-testid="input-module-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="3000" 
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            data-testid="input-module-port"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-module-icon">
                              <SelectValue placeholder="Select an icon" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {iconOptions.map((icon) => (
                              <SelectItem key={icon.value} value={icon.value}>
                                {icon.label}
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
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-module-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="core">Core System</SelectItem>
                            <SelectItem value="business">Business Logic</SelectItem>
                            <SelectItem value="analytics">Analytics & Reports</SelectItem>
                            <SelectItem value="integration">Integration</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <FormDescription>
                          Enable this module for users
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-module-active"
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
                    data-testid="button-cancel-create-module"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createModuleMutation.isPending}
                    data-testid="button-submit-module"
                  >
                    {createModuleMutation.isPending ? "Creating..." : "Create Module"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules?.map((module) => (
          <Card key={module.id} className="relative" data-testid={`card-module-${module.name}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5" />
                  {module.displayName}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge className={getCategoryColor(module.category)}>
                    {module.category}
                  </Badge>
                  <Badge className={getHealthStatusColor(module.healthStatus)}>
                    {getHealthStatusIcon(module.healthStatus)}
                    {module.healthStatus || 'unknown'}
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-sm">
                {module.description || "No description provided"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Globe className="w-4 h-4 mr-2" />
                  <span className="truncate">{module.url}</span>
                  {module.port && (
                    <Badge variant="outline" className="ml-2">
                      :{module.port}
                    </Badge>
                  )}
                </div>
                
                {module.lastHealthCheck && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2" />
                    Last check: {format(new Date(module.lastHealthCheck), 'MMM dd, HH:mm')}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleModuleStatus(module)}
                      disabled={updateModuleMutation.isPending}
                      data-testid={`button-toggle-${module.name}`}
                    >
                      {module.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {module.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testModuleHealth(module.id)}
                      disabled={isTestingModule === module.id}
                      data-testid={`button-test-${module.name}`}
                    >
                      <RefreshCw className={`h-4 w-4 ${isTestingModule === module.id ? 'animate-spin' : ''}`} />
                      Test
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(module.url, '_blank')}
                      data-testid={`button-open-${module.name}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedModule(module)}
                      data-testid={`button-edit-${module.name}`}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {modules?.length === 0 && (
        <Card className="p-12 text-center" data-testid="empty-modules-state">
          <Grid3X3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No modules configured</h3>
          <p className="text-muted-foreground mb-4">
            Add your first module to get started with the modular dashboard.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-module">
            <Plus className="mr-2 h-4 w-4" />
            Add Module
          </Button>
        </Card>
      )}

      {/* Module Details Dialog */}
      {selectedModule && (
        <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
          <DialogContent className="sm:max-w-[600px]" data-testid="dialog-module-details">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5" />
                {selectedModule.displayName}
                <Badge className={getHealthStatusColor(selectedModule.healthStatus)}>
                  {getHealthStatusIcon(selectedModule.healthStatus)}
                  {selectedModule.healthStatus || 'unknown'}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {selectedModule.description || "No description provided"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Internal Name</p>
                  <p className="text-sm text-muted-foreground font-mono">{selectedModule.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Category</p>
                  <Badge className={getCategoryColor(selectedModule.category)}>
                    {selectedModule.category}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">URL</p>
                  <p className="text-sm text-muted-foreground break-all">{selectedModule.url}</p>
                </div>
                {selectedModule.port && (
                  <div>
                    <p className="text-sm font-medium">Port</p>
                    <Badge variant="outline">{selectedModule.port}</Badge>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={selectedModule.isActive ? "default" : "secondary"}>
                    {selectedModule.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {selectedModule.lastHealthCheck && (
                  <div>
                    <p className="text-sm font-medium">Last Health Check</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedModule.lastHealthCheck), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setSelectedModule(null);
                    handleDeleteModule(selectedModule);
                  }}
                  data-testid="button-delete-module"
                >
                  Delete Module
                </Button>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedModule.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Module
                  </Button>
                  <Button
                    onClick={() => testModuleHealth(selectedModule.id)}
                    disabled={isTestingModule === selectedModule.id}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isTestingModule === selectedModule.id ? 'animate-spin' : ''}`} />
                    Test Health
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}