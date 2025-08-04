import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModuleCard } from '@/components/ui/module-card';
import { UserMenu } from '@/components/ui/user-menu';
import { Settings, TrendingUp, DollarSign, Package, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { modulesApi, dashboardApi } from '@/lib/api';
import { Module } from '@shared/schema';
import { hasModuleAccess, isAdmin } from '@/lib/auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, setLocation]);

  const { data: modules = [], isLoading: modulesLoading } = useQuery<Module[]>({
    queryKey: ['/api/modules'],
    enabled: isAuthenticated,
  });

  interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    totalModules: number;
    activeModules: number;
    usersByRole: {
      administrator: number;
      manager: number;
      operator: number;
      viewer: number;
    };
  }

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    enabled: isAuthenticated,
  });

  const handleModuleClick = (module: Module) => {
    if (!user || !hasModuleAccess(user, module.name)) {
      return;
    }
    
    // In a real implementation, this might validate with the module first
    window.open(`http://${module.endpoint}?token=${localStorage.getItem('neoloc-auth')}`, '_blank');
  };

  const navigateToAdmin = () => {
    setLocation('/admin');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neoloc-background" data-testid="dashboard-screen">
      {/* Top Navigation */}
      <nav className="bg-neoloc-card shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-neoloc-primary w-10 h-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-cube text-white"></i>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-neoloc-text" data-testid="nav-title">
                  NeoLoc One
                </h1>
                <p className="text-xs text-gray-500" data-testid="nav-subtitle">
                  Enterprise Hub
                </p>
              </div>
            </div>

            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-neoloc-text mb-2" data-testid="welcome-message">
            Welcome back, {user.fullName.split(' ')[0]}
          </h2>
          <p className="text-gray-600" data-testid="welcome-subtitle">
            Manage your rental operations from this centralized hub
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsLoading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="stat-card">
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="stat-card hover-lift" data-testid="stat-users">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Users</p>
                      <p className="text-2xl font-semibold text-neoloc-text mt-1" data-testid="stat-users-value">
                        {stats?.totalUsers || 0}
                      </p>
                    </div>
                    <div className="bg-neoloc-secondary/10 w-12 h-12 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-neoloc-secondary text-xl" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-neoloc-secondary font-medium">
                      {stats?.activeUsers || 0} active
                    </span>
                    <span className="text-gray-500 ml-1">system users</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="stat-card hover-lift" data-testid="stat-modules">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Active Modules</p>
                      <p className="text-2xl font-semibold text-neoloc-text mt-1" data-testid="stat-modules-value">
                        {stats?.activeModules || 0}
                      </p>
                    </div>
                    <div className="bg-neoloc-primary/10 w-12 h-12 rounded-lg flex items-center justify-center">
                      <Package className="text-neoloc-primary text-xl" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-neoloc-primary font-medium">
                      {stats?.totalModules || 0} total
                    </span>
                    <span className="text-gray-500 ml-1">available</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="stat-card hover-lift" data-testid="stat-admins">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Administrators</p>
                      <p className="text-2xl font-semibold text-neoloc-text mt-1" data-testid="stat-admins-value">
                        {stats?.usersByRole?.administrator || 0}
                      </p>
                    </div>
                    <div className="bg-neoloc-accent/10 w-12 h-12 rounded-lg flex items-center justify-center">
                      <Settings className="text-neoloc-accent text-xl" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-neoloc-accent font-medium">
                      {((stats?.usersByRole?.administrator || 0) / (stats?.totalUsers || 1) * 100).toFixed(0)}%
                    </span>
                    <span className="text-gray-500 ml-1">of users</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="stat-card hover-lift" data-testid="stat-access">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Your Access</p>
                      <p className="text-2xl font-semibold text-neoloc-text mt-1" data-testid="stat-access-value">
                        {user.role === 'administrator' ? 'All' : user.moduleAccess.length}
                      </p>
                    </div>
                    <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center">
                      <DollarSign className="text-green-600 text-xl" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-green-600 font-medium">
                      {user.role === 'administrator' ? '100%' : `${(user.moduleAccess.length / 9 * 100).toFixed(0)}%`}
                    </span>
                    <span className="text-gray-500 ml-1">module access</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Module Access Cards */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-neoloc-text" data-testid="modules-title">
              Available Modules
            </h3>
            {isAdmin(user) && (
              <Button 
                onClick={navigateToAdmin}
                variant="outline"
                className="text-neoloc-primary hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                data-testid="button-module-settings"
              >
                <Settings className="w-4 h-4" />
                <span>Module Settings</span>
              </Button>
            )}
          </div>

          {modulesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="module-card">
                  <CardContent className="pt-6">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="modules-grid">
              {modules
                .filter((module: Module) => hasModuleAccess(user, module.name))
                .map((module: Module) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    onClick={handleModuleClick}
                  />
                ))}
            </div>
          )}

          {modules.length === 0 && !modulesLoading && (
            <Card className="p-8 text-center" data-testid="no-modules">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No modules available</h3>
              <p className="text-gray-600">Contact your administrator to get access to modules.</p>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-neoloc-text mb-4" data-testid="activity-title">
              Recent Activity
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors" data-testid="activity-item-1">
                <div className="bg-neoloc-primary/10 w-10 h-10 rounded-full flex items-center justify-center">
                  <i className="fas fa-user text-neoloc-primary"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neoloc-text">
                    User {user.fullName} logged in
                  </p>
                  <p className="text-xs text-gray-500">Just now</p>
                </div>
                <span className="text-xs text-neoloc-secondary bg-neoloc-secondary/10 px-2 py-1 rounded-full">
                  Authentication
                </span>
              </div>

              <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors" data-testid="activity-item-2">
                <div className="bg-neoloc-secondary/10 w-10 h-10 rounded-full flex items-center justify-center">
                  <i className="fas fa-shield-alt text-neoloc-secondary"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neoloc-text">
                    System security check completed
                  </p>
                  <p className="text-xs text-gray-500">5 minutes ago</p>
                </div>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  Security
                </span>
              </div>

              <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors" data-testid="activity-item-3">
                <div className="bg-neoloc-accent/10 w-10 h-10 rounded-full flex items-center justify-center">
                  <i className="fas fa-database text-neoloc-accent"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neoloc-text">
                    Database backup completed successfully
                  </p>
                  <p className="text-xs text-gray-500">1 hour ago</p>
                </div>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  System
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
