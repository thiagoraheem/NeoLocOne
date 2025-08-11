import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertUserSchema } from "@shared/schema";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "neoloc-one-secret-key";
const JWT_EXPIRES_IN = "24h";
const SSO_TOKEN_EXPIRES_IN = "5m"; // 5 minutes for security

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware - works with both cookies and Authorization header
  const authenticateToken = async (req: any, res: any, next: any) => {
    // Try to get token from Authorization header first, then from cookies
    let token;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

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
        // Log failed login attempt for non-existent user
        if (user && !user.isActive) {
          await storage.logUserActivity({
            userId: user.id,
            action: "login_failed_inactive",
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
            details: "Account is inactive",
            severity: "warning",
          });
        }
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        // Log failed login attempt
        await storage.logUserActivity({
          userId: user.id,
          action: "login_failed",
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null,
          details: "Invalid password",
          severity: "warning",
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login and log successful login
      await storage.updateUser(user.id, { lastLogin: new Date() });
      await storage.logUserActivity({
        userId: user.id,
        action: "login_success",
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        details: "Successful login",
        severity: "info",
      });

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

      // Set token as HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
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
      
      // Log logout activity
      await storage.logUserActivity({
        userId: req.user.id,
        action: "logout",
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        details: "User logged out",
        severity: "info",
      });
      
      // Clear the token cookie
      res.clearCookie('token');
      
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
      const users = await storage.getAllUsersWithProfiles();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUserWithProfile(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
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
      const modules = await storage.getAllModulesWithHealth();
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

  // User Profile Management
  app.get("/api/users/:id/profile", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Users can only access their own profile unless they're an admin
      if (req.user.id !== id && req.user.role !== 'administrator') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const profile = await storage.getUserProfile(id);
      res.json(profile || {});
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id/profile", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Users can only update their own profile unless they're an admin
      if (req.user.id !== id && req.user.role !== 'administrator') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { insertUserProfileSchema } = await import("@shared/schema");
      const profileData = insertUserProfileSchema.parse(req.body);
      
      let profile = await storage.getUserProfile(id);
      if (!profile) {
        profile = await storage.createUserProfile({ ...profileData, userId: id });
      } else {
        profile = await storage.updateUserProfile(id, profileData);
      }
      
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User Security Settings
  app.get("/api/users/:id/security", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Users can only access their own security settings unless they're an admin
      if (req.user.id !== id && req.user.role !== 'administrator') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const settings = await storage.getUserSecuritySettings(id);
      if (settings) {
        // Don't expose sensitive information like 2FA secrets
        const { twoFactorSecret, recoveryCodesHash, ...safeSettings } = settings;
        res.json(safeSettings);
      } else {
        res.json({});
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id/security", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Users can only update their own security settings unless they're an admin
      if (req.user.id !== id && req.user.role !== 'administrator') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { insertUserSecuritySettingsSchema } = await import("@shared/schema");
      const securityData = insertUserSecuritySettingsSchema.parse(req.body);
      
      let settings = await storage.getUserSecuritySettings(id);
      if (!settings) {
        settings = await storage.createUserSecuritySettings({ ...securityData, userId: id });
      } else {
        settings = await storage.updateUserSecuritySettings(id, securityData);
      }
      
      // Don't expose sensitive information
      const { twoFactorSecret, recoveryCodesHash, ...safeSettings } = settings;
      res.json(safeSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Activity Logs
  app.get("/api/users/:id/activity", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;
      
      // Users can only access their own activity logs unless they're an admin
      if (req.user.id !== id && req.user.role !== 'administrator') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const logs = await storage.getUserActivityLogs(id, parseInt(limit as string));
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/activity", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { limit = 100 } = req.query;
      const logs = await storage.getRecentActivityLogs(parseInt(limit as string));
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Security Policies
  app.get("/api/admin/security-policies", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const policies = await storage.getAllSecurityPolicies();
      res.json(policies);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/security-policies", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { insertSecurityPolicySchema } = await import("@shared/schema");
      const policyData = insertSecurityPolicySchema.parse(req.body);
      const policy = await storage.createSecurityPolicy(policyData);
      res.status(201).json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/modules/:id/test", authenticateToken, requirePermission('system.modules', 'write'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const module = await storage.getModule(id);
      
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Simple health check by trying to connect to the module URL
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(module.url, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        const status = response.ok ? 'healthy' : 'unhealthy';
        
        // Update module health status
        await storage.updateModule(id, {
          healthStatus: status,
          lastHealthCheck: new Date(),
        });
        
        res.json({ status, lastCheck: new Date() });
      } catch (error) {
        // Update module as unhealthy
        await storage.updateModule(id, {
          healthStatus: 'unhealthy',
          lastHealthCheck: new Date(),
        });
        
        res.json({ status: 'unhealthy', lastCheck: new Date() });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard stats endpoint
  app.get("/api/dashboard/stats", authenticateToken, async (req: any, res) => {
    try {
      const totalUsers = (await storage.getAllUsers()).length;
      const activeUsers = (await storage.getAllUsers()).filter(u => u.isActive).length;
      const totalModules = (await storage.getAllModules()).length;
      const activeModules = (await storage.getAllModules()).filter(m => m.isActive).length;
      
      res.json({
        totalUsers,
        activeUsers,
        totalModules,
        activeModules,
      });
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

  // SSO Token generation endpoint for module authentication
  app.post('/api/sso/generate-token', authenticateToken, async (req: any, res) => {
    try {
      const { moduleId } = req.body;
      
      if (!moduleId) {
        return res.status(400).json({ message: 'Module ID is required' });
      }

      // Verify user has access to the module
      const module = await storage.getModule(moduleId);
      if (!module) {
        return res.status(404).json({ message: 'Module not found' });
      }

      // Check if user has permission to access this module
      const hasAccess = await storage.userHasPermission(req.user.id, module.name, 'read');
      if (!hasAccess && req.user.role !== 'administrator') {
        return res.status(403).json({ message: 'Access denied to this module' });
      }

      // Generate SSO token with short expiration
      const ssoToken = jwt.sign(
        { 
          userId: req.user.id,
          moduleId: moduleId,
          email: req.user.email,
          fullName: req.user.fullName,
          role: req.user.role,
          type: 'sso'
        },
        JWT_SECRET,
        { expiresIn: SSO_TOKEN_EXPIRES_IN }
      );

      // Store token in database for tracking
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await storage.createSsoToken({
        userId: req.user.id,
        moduleId: moduleId,
        token: ssoToken,
        expiresAt: expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      });

      res.json({ 
        token: ssoToken,
        expiresIn: 300, // 5 minutes in seconds
        moduleUrl: module.url,
        userData: {
          id: req.user.id,
          email: req.user.email,
          fullName: req.user.fullName,
          role: req.user.role
        }
      });
    } catch (error) {
      console.error('SSO token generation error:', error);
      res.status(500).json({ message: 'Failed to generate SSO token' });
    }
  });

  // SSO Token validation endpoint for modules
  app.post('/api/sso/validate-token', async (req: any, res) => {
    try {
      const { token, moduleId } = req.body;
      
      if (!token || !moduleId) {
        return res.status(400).json({ message: 'Token and module ID are required' });
      }

      // Validate token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (decoded.type !== 'sso' || decoded.moduleId !== moduleId) {
        return res.status(401).json({ message: 'Invalid SSO token' });
      }

      // Check if token exists and hasn't been used
      const ssoToken = await storage.validateSsoToken(token, moduleId);
      if (!ssoToken) {
        return res.status(401).json({ message: 'Token expired or already used' });
      }

      // Get user data
      const user = await storage.getUser(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'User not found or inactive' });
      }

      // Mark token as used
      await storage.markSsoTokenAsUsed(token, req.ip, req.headers['user-agent'] || '');

      res.json({
        valid: true,
        userData: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          moduleAccess: user.moduleAccess
        }
      });
    } catch (error) {
      console.error('SSO token validation error:', error);
      res.status(401).json({ message: 'Invalid or expired token' });
    }
  });

  // Get SSO-enabled URL for module access
  app.post('/api/modules/:id/sso-url', authenticateToken, async (req: any, res) => {
    try {
      const moduleId = req.params.id;
      const module = await storage.getModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ message: 'Module not found' });
      }

      // Check access permission
      const hasAccess = await storage.userHasPermission(req.user.id, module.name, 'read');
      if (!hasAccess && req.user.role !== 'administrator') {
        return res.status(403).json({ message: 'Access denied to this module' });
      }

      // Generate SSO token
      const ssoToken = jwt.sign(
        { 
          userId: req.user.id,
          moduleId: moduleId,
          email: req.user.email,
          fullName: req.user.fullName,
          role: req.user.role,
          type: 'sso'
        },
        JWT_SECRET,
        { expiresIn: SSO_TOKEN_EXPIRES_IN }
      );

      // Store token
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await storage.createSsoToken({
        userId: req.user.id,
        moduleId: moduleId,
        token: ssoToken,
        expiresAt: expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      });

      // Create SSO URL with token
      const ssoUrl = `${module.url}?sso_token=${encodeURIComponent(ssoToken)}&user_id=${encodeURIComponent(req.user.id)}`;

      res.json({ 
        ssoUrl: ssoUrl,
        expiresIn: 300
      });
    } catch (error) {
      console.error('SSO URL generation error:', error);
      res.status(500).json({ message: 'Failed to generate SSO URL' });
    }
  });

  // Clean up expired sessions and SSO tokens periodically
  setInterval(async () => {
    await storage.deleteExpiredSessions();
    await storage.deleteExpiredSsoTokens();
  }, 60 * 60 * 1000); // Every hour

  const httpServer = createServer(app);
  return httpServer;
}
