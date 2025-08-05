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

// Extended types for joined data
export type UserWithRoles = User & {
  roles: (Role & { permissions: Permission[] })[];
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
