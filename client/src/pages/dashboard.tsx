import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import type { ModuleWithHealth } from "@shared/schema";
import { 
  Grid3X3, 
  Users, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  BarChart3, 
  Database, 
  Settings, 
  Zap, 
  Globe,
  Search,
  Filter,
  Heart,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Pause
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = {
  Grid3X3, Users, ShoppingCart, Package, TrendingUp, 
  BarChart3, Database, Settings, Zap, Globe
};

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalModules: number;
  activeModules: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [favoriteModules, setFavoriteModules] = useState<string[]>([]);

  const { data: modules, isLoading: modulesLoading } = useQuery<ModuleWithHealth[]>({
    queryKey: ['/api/modules'],
  });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const filteredModules = modules?.filter(module => {
    const matchesSearch = module.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || module.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const categories = [
    { value: "all", label: "All Modules", count: modules?.length || 0 },
    { value: "core", label: "Core System", count: modules?.filter(m => m.category === "core").length || 0 },
    { value: "business", label: "Business", count: modules?.filter(m => m.category === "business").length || 0 },
    { value: "analytics", label: "Analytics", count: modules?.filter(m => m.category === "analytics").length || 0 },
    { value: "integration", label: "Integration", count: modules?.filter(m => m.category === "integration").length || 0 },
  ];

  const getHealthStatusIcon = (status?: string | null) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'unhealthy': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'disabled': return <Pause className="w-4 h-4 text-gray-600" />;
      default: return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'business': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'analytics': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'integration': return 'bg-teal-100 text-teal-600 border-teal-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const openModule = (module: ModuleWithHealth) => {
    window.open(module.url, '_blank', 'noopener,noreferrer');
  };

  const toggleFavorite = (moduleId: string) => {
    setFavoriteModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  if (modulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.fullName}
          </h1>
          <p className="text-muted-foreground">
            Manage your business operations from your centralized dashboard
          </p>
        </div>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Modules</CardTitle>
              <Grid3X3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeModules}</div>
              <p className="text-xs text-muted-foreground">
                of {stats.totalModules} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Healthy</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Role</CardTitle>
              <Badge variant="outline" className="text-xs">
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredModules.length}</div>
              <p className="text-xs text-muted-foreground">
                accessible modules
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {categories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
              className="whitespace-nowrap"
            >
              {category.label}
              <Badge variant="secondary" className="ml-2 text-xs">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Favorite Modules */}
      {favoriteModules.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Favorite Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modules?.filter(module => favoriteModules.includes(module.id)).map((module) => {
              const IconComponent = iconMap[module.icon as keyof typeof iconMap] || Grid3X3;
              return (
                <Card key={module.id} className="cursor-pointer hover:shadow-lg transition-shadow border-red-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-50">
                          <IconComponent className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-medium">{module.displayName}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {getHealthStatusIcon(module.healthStatus)}
                            <Badge variant="outline" className={cn("text-xs", getCategoryColor(module.category))}>
                              {module.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(module.id);
                        }}
                      >
                        <Heart className="h-4 w-4 text-red-500 fill-current" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {module.description}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => openModule(module)}
                        className="flex-1"
                      >
                        Open
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All Modules Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Modules</h2>
        {filteredModules.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-400">
              <Grid3X3 className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">No modules found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredModules.map((module) => {
              const IconComponent = iconMap[module.icon as keyof typeof iconMap] || Grid3X3;
              const isFavorite = favoriteModules.includes(module.id);
              
              return (
                <Card key={module.id} className="cursor-pointer hover:shadow-lg transition-shadow group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-medium">{module.displayName}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {getHealthStatusIcon(module.healthStatus)}
                            <Badge variant="outline" className={cn("text-xs", getCategoryColor(module.category))}>
                              {module.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(module.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Heart className={cn("h-4 w-4", isFavorite ? "text-red-500 fill-current" : "text-gray-400")} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {module.description}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => openModule(module)}
                        className="flex-1"
                      >
                        Open
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}