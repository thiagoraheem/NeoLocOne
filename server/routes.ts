import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertUserSchema } from "@shared/schema";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "neoloc-one-secret-key";
const JWT_EXPIRES_IN = "24h";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware
  const authenticateToken = async (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const session = await storage.getSessionByToken(token);
      
      if (!session) {
        return res.status(401).json({ message: 'Invalid or expired session' });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'User not found or inactive' });
      }

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      return res.status(403).json({ message: 'Invalid token' });
    }
  };

  // Permission-based middleware
  const requirePermission = (resource: string, action: string) => {
    return async (req: any, res: any, next: any) => {
      try {
        const hasPermission = await storage.userHasPermission(req.user.id, resource, action);
        if (!hasPermission) {
          return res.status(403).json({ 
            message: `Access denied: ${action} permission required for ${resource}` 
          });
        }
        next();
      } catch (error) {
        return res.status(500).json({ message: 'Permission check failed' });
      }
    };
  };

  // Admin-only middleware (for backwards compatibility)
  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'administrator') {
      return res.status(403).json({ message: 'Administrator access required' });
    }
    next();
  };

  // Role-based middleware
  const requireRole = (roleName: string) => {
    return async (req: any, res: any, next: any) => {
      try {
        const hasRole = await storage.userHasRole(req.user.id, roleName);
        if (!hasRole && req.user.role !== 'administrator') {
          return res.status(403).json({ 
            message: `Access denied: ${roleName} role required` 
          });
        }
        next();
      } catch (error) {
        return res.status(500).json({ message: 'Role check failed' });
      }
    };
  };

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await storage.updateUser(user.id, { lastLogin: new Date() });

      // Create JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Create session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      await storage.createSession({
        userId: user.id,
        token,
        expiresAt,
      });

      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        user: userWithoutPassword,
        token,
        expiresAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteSession(req.token);
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Module validation endpoint for external modules
  app.post("/api/auth/validate", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(401).json({ valid: false, message: "No token provided" });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const session = await storage.getSessionByToken(token);
      
      if (!session) {
        return res.status(401).json({ valid: false, message: "Invalid session" });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ valid: false, message: "User not found or inactive" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ valid: true, user: userWithoutPassword });
    } catch (error) {
      res.status(401).json({ valid: false, message: "Invalid token" });
    }
  });

  // Module routes
  app.get("/api/modules", authenticateToken, async (req: any, res) => {
    try {
      const modules = await storage.getModulesForUser(req.user.id);
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/modules/:id", authenticateToken, async (req: any, res) => {
    try {
      const module = await storage.getModule(req.params.id);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      if (req.user.role !== 'administrator' && !req.user.moduleAccess.includes(module.name)) {
        return res.status(403).json({ message: "Access denied to this module" });
      }
      
      res.json(module);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/users", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const updates = req.body;
      
      // Remove password from updates if provided (should use separate endpoint)
      const { password, ...safeUpdates } = updates;
      
      const user = await storage.updateUser(req.params.id, safeUpdates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      // Prevent admin from deleting themselves
      if (req.params.id === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // RBAC Routes - Roles Management
  app.get("/api/admin/roles", authenticateToken, requirePermission('system.roles', 'read'), async (req: any, res) => {
    try {
      const roles = await storage.getAllRolesWithPermissions();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/roles", authenticateToken, requirePermission('system.roles', 'write'), async (req: any, res) => {
    try {
      const { insertRoleSchema } = await import("@shared/schema");
      const roleData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(roleData);
      res.status(201).json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // RBAC Routes - Permissions Management
  app.get("/api/admin/permissions", authenticateToken, requirePermission('system.roles', 'read'), async (req: any, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Enhanced Admin Module Management
  app.get("/api/admin/modules", authenticateToken, requirePermission('system.modules', 'read'), async (req: any, res) => {
    try {
      const modules = await storage.getAllModules();
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/modules", authenticateToken, requirePermission('system.modules', 'write'), async (req: any, res) => {
    try {
      const { insertModuleSchema } = await import("@shared/schema");
      const moduleData = insertModuleSchema.parse(req.body);
      const module = await storage.createModule(moduleData);
      res.status(201).json(module);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/modules/:id", authenticateToken, requirePermission('system.modules', 'write'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const module = await storage.updateModule(id, updates);
      
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      res.json(module);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/modules/:id", authenticateToken, requirePermission('system.modules', 'delete'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteModule(id);
      
      if (!success) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      res.json({ message: "Module deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/modules", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const modules = await storage.getAllModules();
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard stats endpoint
  app.get("/api/dashboard/stats", authenticateToken, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      const modules = await storage.getAllModules();
      
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        totalModules: modules.length,
        activeModules: modules.filter(m => m.isActive).length,
        usersByRole: {
          administrator: users.filter(u => u.role === 'administrator').length,
          manager: users.filter(u => u.role === 'manager').length,
          operator: users.filter(u => u.role === 'operator').length,
          viewer: users.filter(u => u.role === 'viewer').length,
        }
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Clean up expired sessions periodically
  setInterval(async () => {
    await storage.deleteExpiredSessions();
  }, 60 * 60 * 1000); // Every hour

  const httpServer = createServer(app);
  return httpServer;
}
