import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("viewer"), // administrator, manager, operator, viewer
  isActive: boolean("is_active").notNull().default(true),
  moduleAccess: text("module_access").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  lastLogin: timestamp("last_login"),
});

export const modules = pgTable("modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("Grid3X3"),
  port: integer("port"),
  endpoint: text("endpoint"),
  url: text("url").notNull(),
  category: text("category").notNull().default("business"),
  isActive: boolean("is_active").notNull().default(true),
  color: text("color"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  lastHealthCheck: timestamp("last_health_check"),
  healthStatus: text("health_status").default("unknown"),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// SSO tokens for module authentication
export const ssoTokens = pgTable("sso_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  moduleId: varchar("module_id").notNull().references(() => modules.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  usedAt: timestamp("used_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// User activity logs for audit trail
export const userActivityLogs = pgTable("user_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // login, logout, module_access, password_change, etc.
  module: text("module"), // module accessed if applicable
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: text("details"), // JSON string with additional details
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  severity: text("severity").notNull().default("info"), // info, warning, error, critical
});

// User security settings
export const userSecuritySettings = pgTable("user_security_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"), // encrypted TOTP secret
  recoveryCodesHash: text("recovery_codes_hash"), // encrypted backup codes
  passwordExpiresAt: timestamp("password_expires_at"),
  forcePasswordChange: boolean("force_password_change").notNull().default(false),
  accountLocked: boolean("account_locked").notNull().default(false),
  lockReason: text("lock_reason"),
  lockedAt: timestamp("locked_at"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lastFailedLoginAt: timestamp("last_failed_login_at"),
  lastPasswordChangeAt: timestamp("last_password_change_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// System-wide security policies
export const securityPolicies = pgTable("security_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  config: text("config").notNull(), // JSON configuration
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// User preferences and profile settings
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  avatar: text("avatar"), // URL or base64 encoded image
  phoneNumber: text("phone_number"),
  department: text("department"),
  position: text("position"),
  manager: varchar("manager").references(() => users.id),
  timezone: text("timezone").default("America/Sao_Paulo"),
  language: text("language").default("pt-BR"),
  theme: text("theme").default("system"), // light, dark, system
  notifications: text("notifications").default("{}"), // JSON preferences
  dashboardLayout: text("dashboard_layout").default("{}"), // JSON layout config
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// RBAC Tables
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  isSystem: boolean("is_system").notNull().default(false), // System roles cannot be deleted
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  resource: text("resource").notNull(), // module name or system resource
  action: text("action").notNull(), // read, write, delete, admin
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  fullName: true,
  role: true,
  moduleAccess: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const insertModuleSchema = createInsertSchema(modules).pick({
  name: true,
  displayName: true,
  description: true,
  icon: true,
  port: true,
  endpoint: true,
  color: true,
}).extend({
  url: z.string().url("Must be a valid URL"),
  category: z.enum(['core', 'business', 'analytics', 'integration']).default('business'),
}).omit({
  endpoint: true,
  color: true,
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  userId: true,
  token: true,
  expiresAt: true,
});

// Schema validations
export const insertRoleSchema = createInsertSchema(roles).pick({
  name: true,
  displayName: true,
  description: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).pick({
  name: true,
  displayName: true,
  description: true,
  resource: true,
  action: true,
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).pick({
  roleId: true,
  permissionId: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).pick({
  userId: true,
  roleId: true,
  assignedBy: true,
});

export const insertSsoTokenSchema = createInsertSchema(ssoTokens).pick({
  userId: true,
  moduleId: true,
  token: true,
  expiresAt: true,
  ipAddress: true,
  userAgent: true,
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs).pick({
  userId: true,
  action: true,
  module: true,
  ipAddress: true,
  userAgent: true,
  details: true,
  severity: true,
});

export const insertUserSecuritySettingsSchema = createInsertSchema(userSecuritySettings).pick({
  userId: true,
  twoFactorEnabled: true,
  twoFactorSecret: true,
  recoveryCodesHash: true,
  passwordExpiresAt: true,
  forcePasswordChange: true,
  accountLocked: true,
  lockReason: true,
  lockedAt: true,
  failedLoginAttempts: true,
  lastFailedLoginAt: true,
  lastPasswordChangeAt: true,
});

export const insertSecurityPolicySchema = createInsertSchema(securityPolicies).pick({
  name: true,
  description: true,
  isEnabled: true,
  config: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).pick({
  userId: true,
  avatar: true,
  phoneNumber: true,
  department: true,
  position: true,
  manager: true,
  timezone: true,
  language: true,
  theme: true,
  notifications: true,
  dashboardLayout: true,
});

// Password policy validation schema
export const passwordPolicySchema = z.object({
  minLength: z.number().min(6).max(128).default(8),
  requireUppercase: z.boolean().default(true),
  requireLowercase: z.boolean().default(true),
  requireNumbers: z.boolean().default(true),
  requireSpecialChars: z.boolean().default(true),
  maxAge: z.number().min(0).default(90), // days
  preventReuse: z.number().min(0).max(24).default(5), // last N passwords
  maxFailedAttempts: z.number().min(1).max(10).default(5),
  lockoutDuration: z.number().min(1).max(1440).default(30), // minutes
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modules.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertSsoToken = z.infer<typeof insertSsoTokenSchema>;
export type SsoToken = typeof ssoTokens.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type InsertUserSecuritySettings = z.infer<typeof insertUserSecuritySettingsSchema>;
export type UserSecuritySettings = typeof userSecuritySettings.$inferSelect;
export type InsertSecurityPolicy = z.infer<typeof insertSecurityPolicySchema>;
export type SecurityPolicy = typeof securityPolicies.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type PasswordPolicy = z.infer<typeof passwordPolicySchema>;

// Extended types for joined data
export type UserWithRoles = User & {
  roles: (Role & { permissions: Permission[] })[];
};

export type UserWithProfile = User & {
  profile?: UserProfile;
  securitySettings?: UserSecuritySettings;
  roles: (Role & { permissions: Permission[] })[];
  recentActivity?: UserActivityLog[];
};

export type RoleWithPermissions = Role & {
  permissions: Permission[];
};

export type ModuleWithAccess = Module & {
  hasAccess: boolean;
  requiredPermissions: Permission[];
};

// Enhanced module types for the management system
export interface ModuleWithHealth extends Module {
  category: 'core' | 'business' | 'analytics' | 'integration';
  url: string; // Ensure url property exists
}

export interface ModuleFavorite {
  id: string;
  userId: string;
  moduleId: string;
  position: number;
  createdAt: Date;
}
