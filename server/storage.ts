import { 
  type User, type InsertUser, type Module, type InsertModule, type Session, type InsertSession,
  type Role, type InsertRole, type Permission, type InsertPermission, 
  type RolePermission, type InsertRolePermission, type UserRole, type InsertUserRole,
  type UserWithRoles, type RoleWithPermissions
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import type { ModuleWithHealth } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithRoles(id: string): Promise<UserWithRoles | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getAllUsersWithRoles(): Promise<UserWithRoles[]>;
  
  // Module operations
  getModule(id: string): Promise<Module | undefined>;
  getModuleByName(name: string): Promise<Module | undefined>;
  getAllModules(): Promise<Module[]>;
  getModulesForUser(userId: string): Promise<Module[]>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: string, updates: Partial<Module>): Promise<Module | undefined>;
  deleteModule(id: string): Promise<boolean>;
  
  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<boolean>;
  deleteExpiredSessions(): Promise<void>;
  
  // RBAC operations
  // Roles
  getRole(id: string): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  getRoleWithPermissions(id: string): Promise<RoleWithPermissions | undefined>;
  getAllRoles(): Promise<Role[]>;
  getAllRolesWithPermissions(): Promise<RoleWithPermissions[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, updates: Partial<Role>): Promise<Role | undefined>;
  deleteRole(id: string): Promise<boolean>;
  
  // Permissions
  getPermission(id: string): Promise<Permission | undefined>;
  getPermissionByName(name: string): Promise<Permission | undefined>;
  getAllPermissions(): Promise<Permission[]>;
  getPermissionsByResource(resource: string): Promise<Permission[]>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  updatePermission(id: string, updates: Partial<Permission>): Promise<Permission | undefined>;
  deletePermission(id: string): Promise<boolean>;
  
  // Role-Permission relationships
  assignPermissionToRole(roleId: string, permissionId: string): Promise<RolePermission>;
  removePermissionFromRole(roleId: string, permissionId: string): Promise<boolean>;
  getRolePermissions(roleId: string): Promise<Permission[]>;
  
  // User-Role relationships
  assignRoleToUser(userId: string, roleId: string, assignedBy: string): Promise<UserRole>;
  removeRoleFromUser(userId: string, roleId: string): Promise<boolean>;
  getUserRoles(userId: string): Promise<Role[]>;
  getUserPermissions(userId: string): Promise<Permission[]>;
  
  // Authorization helpers
  userHasPermission(userId: string, resource: string, action: string): Promise<boolean>;
  userHasRole(userId: string, roleName: string): Promise<boolean>;

  // Enhanced module management
  getAllModulesWithHealth(): Promise<ModuleWithHealth[]>;
  updateModuleHealthStatus(id: string, status: 'healthy' | 'unhealthy' | 'unknown' | 'disabled'): Promise<void>;
  getModulesForUserWithFavorites(userId: string): Promise<ModuleWithHealth[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private modules: Map<string, Module>;
  private sessions: Map<string, Session>;
  private roles: Map<string, Role>;
  private permissions: Map<string, Permission>;
  private rolePermissions: Map<string, RolePermission>;
  private userRoles: Map<string, UserRole>;

  constructor() {
    this.users = new Map();
    this.modules = new Map();
    this.sessions = new Map();
    this.roles = new Map();
    this.permissions = new Map();
    this.rolePermissions = new Map();
    this.userRoles = new Map();
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Initialize roles first
    await this.initializeRoles();
    
    // Initialize permissions
    await this.initializePermissions();
    
    // Initialize default admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const adminUser: User = {
      id: randomUUID(),
      email: "admin@neoloc.com",
      password: hashedPassword,
      fullName: "System Administrator",
      role: "administrator",
      isActive: true,
      moduleAccess: ["inventario", "compras", "estoque", "almoxarifado", "comercial", "financeiro", "expedicao", "manutencao", "bi"],
      createdAt: new Date(),
      lastLogin: null,
    };
    this.users.set(adminUser.id, adminUser);
    
    // Assign admin role to default user
    const adminRole = Array.from(this.roles.values()).find(r => r.name === 'administrator');
    if (adminRole) {
      const userRole: UserRole = {
        id: randomUUID(),
        userId: adminUser.id,
        roleId: adminRole.id,
        assignedBy: adminUser.id,
        createdAt: new Date(),
      };
      this.userRoles.set(userRole.id, userRole);
    }

    // Create default modules
    const defaultModules: Module[] = [
      {
        id: randomUUID(),
        name: "inventario",
        displayName: "Inventário",
        description: "Manage equipment inventory, tracking, and availability status",
        icon: "fas fa-boxes",
        port: 3001,
        endpoint: "localhost:3001",
        isActive: true,
        color: "bg-primary/10 text-primary",
      },
      {
        id: randomUUID(),
        name: "compras",
        displayName: "Compras",
        description: "Purchase orders, supplier management, and procurement",
        icon: "fas fa-shopping-cart",
        port: 3002,
        endpoint: "localhost:3002",
        isActive: true,
        color: "bg-secondary/10 text-secondary",
      },
      {
        id: randomUUID(),
        name: "estoque",
        displayName: "Estoque",
        description: "Stock levels, warehouse management, and logistics",
        icon: "fas fa-warehouse",
        port: 3003,
        endpoint: "localhost:3003",
        isActive: true,
        color: "bg-accent/10 text-accent",
      },
      {
        id: randomUUID(),
        name: "almoxarifado",
        displayName: "Almoxarifado",
        description: "Store management, item requests, and distribution",
        icon: "fas fa-clipboard-list",
        port: 3004,
        endpoint: "localhost:3004",
        isActive: true,
        color: "bg-purple-100 text-purple-600",
      },
      {
        id: randomUUID(),
        name: "comercial",
        displayName: "Comercial",
        description: "Sales, customer relations, and contract management",
        icon: "fas fa-handshake",
        port: 3005,
        endpoint: "localhost:3005",
        isActive: true,
        color: "bg-green-100 text-green-600",
      },
      {
        id: randomUUID(),
        name: "financeiro",
        displayName: "Financeiro",
        description: "Financial management, accounting, and reporting",
        icon: "fas fa-chart-pie",
        port: 3006,
        endpoint: "localhost:3006",
        isActive: true,
        color: "bg-blue-100 text-blue-600",
      },
      {
        id: randomUUID(),
        name: "expedicao",
        displayName: "Expedição",
        description: "Shipping, delivery scheduling, and logistics coordination",
        icon: "fas fa-truck",
        port: 3007,
        endpoint: "localhost:3007",
        isActive: true,
        color: "bg-indigo-100 text-indigo-600",
      },
      {
        id: randomUUID(),
        name: "manutencao",
        displayName: "Manutenção",
        description: "Equipment maintenance, service scheduling, and repairs",
        icon: "fas fa-wrench",
        port: 3008,
        endpoint: "localhost:3008",
        isActive: true,
        color: "bg-red-100 text-red-600",
      },
      {
        id: randomUUID(),
        name: "bi",
        displayName: "Business Intelligence",
        description: "Analytics, reports, and business intelligence dashboards",
        icon: "fas fa-chart-bar",
        port: 3009,
        endpoint: "localhost:3009",
        isActive: true,
        color: "bg-yellow-100 text-yellow-600",
      },
    ];

    defaultModules.forEach(module => {
      this.modules.set(module.id, module);
    });
  }

  private async initializeRoles() {
    const systemRoles: Role[] = [
      {
        id: randomUUID(),
        name: "administrator",
        displayName: "Administrator",
        description: "Full system access with all permissions",
        isSystem: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "manager",
        displayName: "Manager",
        description: "Management access with most permissions",
        isSystem: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "operator",
        displayName: "Operator",
        description: "Operational access with limited permissions",
        isSystem: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "viewer",
        displayName: "Viewer",
        description: "Read-only access to assigned modules",
        isSystem: true,
        createdAt: new Date(),
      },
    ];

    systemRoles.forEach(role => {
      this.roles.set(role.id, role);
    });
  }

  private async initializePermissions() {
    const modules = ["inventario", "compras", "estoque", "almoxarifado", "comercial", "financeiro", "expedicao", "manutencao", "bi"];
    const actions = ["read", "write", "delete", "admin"];
    const systemResources = ["users", "roles", "modules", "system"];

    const permissions: Permission[] = [];

    // Module permissions
    modules.forEach(module => {
      actions.forEach(action => {
        permissions.push({
          id: randomUUID(),
          name: `${module}.${action}`,
          displayName: `${module.charAt(0).toUpperCase() + module.slice(1)} ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} access to ${module} module`,
          resource: module,
          action: action,
          createdAt: new Date(),
        });
      });
    });

    // System permissions
    systemResources.forEach(resource => {
      actions.forEach(action => {
        permissions.push({
          id: randomUUID(),
          name: `system.${resource}.${action}`,
          displayName: `System ${resource.charAt(0).toUpperCase() + resource.slice(1)} ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} access to ${resource}`,
          resource: `system.${resource}`,
          action: action,
          createdAt: new Date(),
        });
      });
    });

    permissions.forEach(permission => {
      this.permissions.set(permission.id, permission);
    });

    // Assign all permissions to administrator role
    const adminRole = Array.from(this.roles.values()).find(r => r.name === 'administrator');
    if (adminRole) {
      permissions.forEach(permission => {
        const rolePermission: RolePermission = {
          id: randomUUID(),
          roleId: adminRole.id,
          permissionId: permission.id,
          createdAt: new Date(),
        };
        this.rolePermissions.set(rolePermission.id, rolePermission);
      });
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserWithRoles(id: string): Promise<UserWithRoles | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const userRoles = Array.from(this.userRoles.values())
      .filter(ur => ur.userId === id)
      .map(ur => this.roles.get(ur.roleId))
      .filter(Boolean) as Role[];

    const rolesWithPermissions = await Promise.all(
      userRoles.map(async role => {
        const permissions = await this.getRolePermissions(role.id);
        return { ...role, permissions };
      })
    );

    return { ...user, roles: rolesWithPermissions };
  }

  async getAllUsersWithRoles(): Promise<UserWithRoles[]> {
    const users = Array.from(this.users.values());
    return Promise.all(
      users.map(user => this.getUserWithRoles(user.id) as Promise<UserWithRoles>)
    );
  }

  async getModulesForUser(userId: string): Promise<Module[]> {
    const user = await this.getUserWithRoles(userId);
    if (!user) return [];

    // If user is admin, return all active modules
    if (user.role === 'administrator') {
      return Array.from(this.modules.values()).filter(m => m.isActive);
    }

    // Get modules based on user permissions
    const userPermissions = await this.getUserPermissions(userId);
    const accessibleModules = new Set<string>();

    userPermissions.forEach(permission => {
      if (permission.action === 'read' || permission.action === 'write' || permission.action === 'admin') {
        if (!permission.resource.startsWith('system.')) {
          accessibleModules.add(permission.resource);
        }
      }
    });

    return Array.from(this.modules.values()).filter(m => 
      m.isActive && accessibleModules.has(m.name)
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const id = randomUUID();
    const user: User = {
      id,
      email: insertUser.email,
      password: hashedPassword,
      fullName: insertUser.fullName,
      role: insertUser.role || 'viewer',
      isActive: true,
      moduleAccess: insertUser.moduleAccess || [],
      createdAt: new Date(),
      lastLogin: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Module operations
  async getModule(id: string): Promise<Module | undefined> {
    return this.modules.get(id);
  }

  async getModuleByName(name: string): Promise<Module | undefined> {
    return Array.from(this.modules.values()).find(module => module.name === name);
  }

  async getAllModules(): Promise<Module[]> {
    return Array.from(this.modules.values());
  }

  async createModule(insertModule: InsertModule): Promise<Module> {
    const id = randomUUID();
    const module: Module = {
      ...insertModule,
      id,
      isActive: true,
    };
    this.modules.set(id, module);
    return module;
  }

  async updateModule(id: string, updates: Partial<Module>): Promise<Module | undefined> {
    const module = this.modules.get(id);
    if (!module) return undefined;

    const updatedModule = { ...module, ...updates };
    this.modules.set(id, updatedModule);
    return updatedModule;
  }

  async deleteModule(id: string): Promise<boolean> {
    return this.modules.delete(id);
  }

  // Session operations
  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = {
      ...insertSession,
      id,
      createdAt: new Date(),
    };
    this.sessions.set(session.token, session);
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const session = this.sessions.get(token);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    if (session) {
      this.sessions.delete(token);
    }
    return undefined;
  }

  async deleteSession(token: string): Promise<boolean> {
    return this.sessions.delete(token);
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = new Date();
    const tokensToDelete: string[] = [];
    this.sessions.forEach((session, token) => {
      if (session.expiresAt <= now) {
        tokensToDelete.push(token);
      }
    });
    tokensToDelete.forEach(token => this.sessions.delete(token));
  }

  // RBAC Role operations
  async getRole(id: string): Promise<Role | undefined> {
    return this.roles.get(id);
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    return Array.from(this.roles.values()).find(role => role.name === name);
  }

  async getRoleWithPermissions(id: string): Promise<RoleWithPermissions | undefined> {
    const role = this.roles.get(id);
    if (!role) return undefined;

    const permissions = await this.getRolePermissions(id);
    return { ...role, permissions };
  }

  async getAllRoles(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  async getAllRolesWithPermissions(): Promise<RoleWithPermissions[]> {
    const roles = Array.from(this.roles.values());
    return Promise.all(
      roles.map(async role => {
        const permissions = await this.getRolePermissions(role.id);
        return { ...role, permissions };
      })
    );
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const role: Role = {
      id: randomUUID(),
      ...insertRole,
      isSystem: false,
      createdAt: new Date(),
    };
    this.roles.set(role.id, role);
    return role;
  }

  async updateRole(id: string, updates: Partial<Role>): Promise<Role | undefined> {
    const role = this.roles.get(id);
    if (!role) return undefined;

    const updatedRole = { ...role, ...updates };
    this.roles.set(id, updatedRole);
    return updatedRole;
  }

  async deleteRole(id: string): Promise<boolean> {
    const role = this.roles.get(id);
    if (!role || role.isSystem) return false;

    Array.from(this.rolePermissions.entries()).forEach(([rpId, rp]) => {
      if (rp.roleId === id) {
        this.rolePermissions.delete(rpId);
      }
    });

    Array.from(this.userRoles.entries()).forEach(([urId, ur]) => {
      if (ur.roleId === id) {
        this.userRoles.delete(urId);
      }
    });

    return this.roles.delete(id);
  }

  // RBAC Permission operations
  async getPermission(id: string): Promise<Permission | undefined> {
    return this.permissions.get(id);
  }

  async getPermissionByName(name: string): Promise<Permission | undefined> {
    return Array.from(this.permissions.values()).find(permission => permission.name === name);
  }

  async getAllPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values());
  }

  async getPermissionsByResource(resource: string): Promise<Permission[]> {
    return Array.from(this.permissions.values()).filter(p => p.resource === resource);
  }

  async createPermission(insertPermission: InsertPermission): Promise<Permission> {
    const permission: Permission = {
      id: randomUUID(),
      ...insertPermission,
      createdAt: new Date(),
    };
    this.permissions.set(permission.id, permission);
    return permission;
  }

  async updatePermission(id: string, updates: Partial<Permission>): Promise<Permission | undefined> {
    const permission = this.permissions.get(id);
    if (!permission) return undefined;

    const updatedPermission = { ...permission, ...updates };
    this.permissions.set(id, updatedPermission);
    return updatedPermission;
  }

  async deletePermission(id: string): Promise<boolean> {
    Array.from(this.rolePermissions.entries()).forEach(([rpId, rp]) => {
      if (rp.permissionId === id) {
        this.rolePermissions.delete(rpId);
      }
    });

    return this.permissions.delete(id);
  }

  // Role-Permission relationship operations
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<RolePermission> {
    const existing = Array.from(this.rolePermissions.values())
      .find(rp => rp.roleId === roleId && rp.permissionId === permissionId);
    
    if (existing) return existing;

    const rolePermission: RolePermission = {
      id: randomUUID(),
      roleId,
      permissionId,
      createdAt: new Date(),
    };
    
    this.rolePermissions.set(rolePermission.id, rolePermission);
    return rolePermission;
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<boolean> {
    const entry = Array.from(this.rolePermissions.entries())
      .find(([, rp]) => rp.roleId === roleId && rp.permissionId === permissionId);
    
    if (entry) {
      this.rolePermissions.delete(entry[0]);
      return true;
    }
    return false;
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const rolePermissionIds = Array.from(this.rolePermissions.values())
      .filter(rp => rp.roleId === roleId)
      .map(rp => rp.permissionId);

    return rolePermissionIds
      .map(id => this.permissions.get(id))
      .filter(Boolean) as Permission[];
  }

  // User-Role relationship operations
  async assignRoleToUser(userId: string, roleId: string, assignedBy: string): Promise<UserRole> {
    const existing = Array.from(this.userRoles.values())
      .find(ur => ur.userId === userId && ur.roleId === roleId);
    
    if (existing) return existing;

    const userRole: UserRole = {
      id: randomUUID(),
      userId,
      roleId,
      assignedBy,
      createdAt: new Date(),
    };
    
    this.userRoles.set(userRole.id, userRole);
    return userRole;
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    const entry = Array.from(this.userRoles.entries())
      .find(([, ur]) => ur.userId === userId && ur.roleId === roleId);
    
    if (entry) {
      this.userRoles.delete(entry[0]);
      return true;
    }
    return false;
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const userRoleIds = Array.from(this.userRoles.values())
      .filter(ur => ur.userId === userId)
      .map(ur => ur.roleId);

    return userRoleIds
      .map(id => this.roles.get(id))
      .filter(Boolean) as Role[];
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const userRoles = await this.getUserRoles(userId);
    const allPermissions = new Map<string, Permission>();

    for (const role of userRoles) {
      const rolePermissions = await this.getRolePermissions(role.id);
      rolePermissions.forEach((permission: Permission) => {
        allPermissions.set(permission.id, permission);
      });
    }

    return Array.from(allPermissions.values());
  }

  // Authorization helper methods
  async userHasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.isActive) return false;

    if (user.role === 'administrator') return true;

    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.some(permission => 
      permission.resource === resource && permission.action === action
    );
  }

  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    return userRoles.some(role => role.name === roleName);
  }

  // Enhanced module management implementation
  async getAllModulesWithHealth(): Promise<ModuleWithHealth[]> {
    const modules = Array.from(this.modules.values());
    return modules.map(module => ({
      ...module,
      url: module.endpoint, // Map endpoint to url
      healthStatus: 'healthy' as const,
      lastHealthCheck: new Date(),
      category: 'business' as const,
    }));
  }

  async updateModuleHealthStatus(id: string, status: 'healthy' | 'unhealthy' | 'unknown' | 'disabled'): Promise<void> {
    const module = this.modules.get(id);
    if (module) {
      console.log(`Module ${id} health status updated to: ${status}`);
    }
  }

  async getModulesForUserWithFavorites(userId: string): Promise<ModuleWithHealth[]> {
    const userModules = await this.getModulesForUser(userId);
    return userModules.map(module => ({
      ...module,
      url: module.endpoint, // Map endpoint to url
      healthStatus: 'healthy' as const,
      lastHealthCheck: new Date(),
      category: 'business' as const,
    }));
  }
}

export const storage = new MemStorage();
