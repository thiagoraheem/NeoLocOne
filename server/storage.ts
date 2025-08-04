import { type User, type InsertUser, type Module, type InsertModule, type Session, type InsertSession } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Module operations
  getModule(id: string): Promise<Module | undefined>;
  getModuleByName(name: string): Promise<Module | undefined>;
  getAllModules(): Promise<Module[]>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: string, updates: Partial<Module>): Promise<Module | undefined>;
  deleteModule(id: string): Promise<boolean>;
  
  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<boolean>;
  deleteExpiredSessions(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private modules: Map<string, Module>;
  private sessions: Map<string, Session>;

  constructor() {
    this.users = new Map();
    this.modules = new Map();
    this.sessions = new Map();
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Create default admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const adminUser: User = {
      id: randomUUID(),
      email: "admin@neoloc.com",
      password: hashedPassword,
      fullName: "John Doe",
      role: "administrator",
      isActive: true,
      moduleAccess: ["inventario", "compras", "estoque", "almoxarifado", "comercial", "financeiro", "expedicao", "manutencao", "bi"],
      createdAt: new Date(),
      lastLogin: null,
    };
    this.users.set(adminUser.id, adminUser);

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

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
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
}

export const storage = new MemStorage();
