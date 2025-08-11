import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import AdminLayout from "@/pages/admin/AdminLayout";
import RoleManagement from "@/pages/admin/RoleManagement";
import UserManagement from "@/pages/admin/UserManagement";
import EnhancedUserManagement from "@/pages/admin/EnhancedUserManagement";
import ModuleManagement from "@/pages/admin/ModuleManagement";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neoloc-background" data-testid="loading-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin mx-auto mb-4 text-neoloc-primary rounded-full border-2 border-neoloc-primary border-t-transparent" />
          <h2 className="text-xl font-semibold text-neoloc-text mb-2">Loading...</h2>
          <p className="text-gray-600">Initializing NeoLoc One</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin" component={AdminLayout} />
      <Route path="/admin/roles">
        <ProtectedRoute requireAdmin>
          <AppLayout>
            <RoleManagement />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute requireAdmin>
          <AppLayout>
            <UserManagement />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/enhanced-users">
        <ProtectedRoute requireAdmin>
          <AppLayout>
            <EnhancedUserManagement />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/modules">
        <ProtectedRoute requireAdmin>
          <AppLayout>
            <ModuleManagement />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
