# Overview

NeoLoc One is a web-based enterprise application that serves as a modular platform for managing various business operations. The system uses a microservices-like architecture where individual modules (external applications) are integrated into a unified dashboard. The application provides role-based access control, user management, and secure authentication to control access to different modules based on user permissions.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Progress

## RBAC System Implementation - Complete ✓
- **Date**: August 4, 2025
- **Status**: User confirmed working successfully
- **Components Implemented**:
  - Complete backend RBAC system with role-based permissions
  - Authorization middleware for API protection
  - Administrative interface for user and role management
  - Database schema with Users, Roles, Permissions, and Sessions tables
  - Frontend pages: AdminLayout, RoleManagement, UserManagement
- **User Feedback**: "Sim, está funcionando a gestão de usuários e permissões"

## Module Management System - Complete ✓
- **Date**: August 5, 2025
- **Status**: Complete module management implementation
- **Components Implemented**:
  - Complete administrative interface for module management
  - Full CRUD operations (Create, Read, Update, Delete)
  - Health check system with connectivity testing
  - Module activation/deactivation controls
  - Responsive dashboard with module cards
  - Edit modal with all configurable fields (URL, port, description, category, etc.)
- **User Request Fulfilled**: "Na tela de gestão de módulos, não tem a opção para alterar os dados, preciso desses campos para corrigir endereços, portas, etc"

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack React Query for server state management and React Context for authentication state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation schemas
- **Theme**: Custom NeoLoc branding with CSS variables and dark mode support

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Session Management**: Database-stored sessions with token-based authentication
- **Development**: Hot module replacement with Vite middleware integration

## Database Design
- **Users Table**: Stores user credentials, roles (administrator, manager, operator, viewer), module access permissions, and account status
- **Modules Table**: Contains configuration for external applications including endpoints, ports, display information, and activation status
- **Sessions Table**: Manages user authentication sessions with JWT tokens and expiration tracking

## Authentication & Authorization
- **Multi-tier Role System**: Four hierarchical roles with administrators having full access, followed by managers, operators, and viewers
- **Module-based Permissions**: Fine-grained access control where users can be granted access to specific modules
- **JWT Token Management**: Secure token generation with configurable expiration and automatic session cleanup
- **Protected Routes**: Client-side route protection with role-based access control

## Module Integration System
- **External Module Management**: Modules are configured as separate applications running on different ports/endpoints
- **Dynamic Module Loading**: Modules are loaded based on user permissions and can be activated/deactivated administratively
- **Cross-origin Integration**: Modules are opened in new tabs/windows with authentication tokens passed for SSO

## Development & Deployment
- **Development Stack**: Vite dev server with Express API proxy, hot reloading, and TypeScript compilation
- **Build Process**: Vite builds the frontend, esbuild bundles the backend for production deployment
- **Database Migrations**: Drizzle Kit handles schema migrations and database structure changes
- **Environment Configuration**: Environment-based configuration for database connections and JWT secrets

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection for serverless environments
- **drizzle-orm**: Type-safe database ORM with PostgreSQL support
- **drizzle-kit**: Database migration and schema management tools

## Frontend UI & Styling
- **@radix-ui/***: Comprehensive set of unstyled UI primitives for accessible components
- **tailwindcss**: Utility-first CSS framework for responsive design
- **@tanstack/react-query**: Server state management and caching library
- **wouter**: Lightweight routing library for React applications

## Authentication & Security
- **jsonwebtoken**: JWT token generation and verification
- **bcrypt**: Password hashing and verification
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## Development & Build Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking and compilation
- **@vitejs/plugin-react**: React integration for Vite
- **esbuild**: Fast JavaScript bundler for production builds

## Form Handling & Validation
- **react-hook-form**: Performant form library with minimal re-renders
- **@hookform/resolvers**: Validation library integrations for React Hook Form
- **zod**: TypeScript-first schema validation library
- **drizzle-zod**: Integration between Drizzle ORM and Zod schemas

## Utility Libraries
- **date-fns**: Modern date utility library
- **class-variance-authority**: Utility for creating variant-based component APIs
- **clsx**: Utility for constructing className strings conditionally