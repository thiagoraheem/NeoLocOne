import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Users, 
  Shield, 
  Grid3X3, 
  Bell,
  BarChart3,
  ArrowLeft,
  User,
  Lock,
  Database
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const adminNavItems = [
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    description: "Manage user accounts and access",
  },
  {
    title: "Roles & Permissions",
    href: "/admin/roles",
    icon: Shield,
    description: "Configure roles and permissions",
  },
  {
    title: "Modules",
    href: "/admin/modules",
    icon: Grid3X3,
    description: "Manage system modules",
  },
  {
    title: "System Settings",
    href: "/admin/settings",
    icon: Settings,
    description: "Global system configuration",
  },
  {
    title: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
    description: "Notification settings and history",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    description: "System usage and reports",
  },
];

export default function AdminLayout() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user || user.role !== 'administrator') {
    return (
      <div className="container mx-auto p-6" data-testid="access-denied">
        <Card className="p-12 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this area. Administrator privileges are required.
          </p>
          <Link href="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // If we're on a specific admin page, show that page
  if (location !== '/admin' && location.startsWith('/admin/')) {
    return (
      <div className="min-h-screen bg-background" data-testid="admin-page-container">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/admin">
                  <Button variant="ghost" size="sm" data-testid="button-back-to-admin">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
                <Separator orientation="vertical" className="h-6" />
                <Badge variant="secondary" className="bg-red-100 text-red-600">
                  <Shield className="w-3 h-3 mr-1" />
                  Administrator
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user.fullName}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto p-6">
          {/* Page content will be rendered here by the routing system */}
        </div>
      </div>
    );
  }

  // Main admin dashboard
  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="admin-title">
            <Settings className="h-8 w-8" />
            Administration Panel
          </h1>
          <p className="text-muted-foreground">
            Manage users, roles, and system configuration
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-red-100 text-red-600">
            <Shield className="w-3 h-3 mr-1" />
            Administrator
          </Badge>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{user.fullName}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="transition-all hover:shadow-md hover:scale-105 cursor-pointer" data-testid={`card-admin-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card data-testid="system-overview">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Overview
          </h3>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">12</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">4</div>
              <div className="text-sm text-muted-foreground">Active Roles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">9</div>
              <div className="text-sm text-muted-foreground">Modules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">24</div>
              <div className="text-sm text-muted-foreground">Permissions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Link href="/">
          <Button variant="outline" data-testid="button-back-to-dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Main Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}