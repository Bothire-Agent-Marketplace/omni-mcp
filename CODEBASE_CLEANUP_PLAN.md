# Codebase Cleanup & Maintainability Plan

## 🎯 **Objectives**

This branch focuses on improving code quality, developer experience, and long-term maintainability
of the Omni MCP project.

## 📋 **Cleanup Tasks**

### **1. Component Architecture** `[Priority: High]`

**Issue:** Large, monolithic components hurt maintainability

**Current Issues:**

- `mcp-testing-view.tsx` (1018 lines) - Too large and complex
- Mixed concerns in single components
- Repeated UI patterns

**Actions:**

- [x] Break down large components into focused, single-purpose pieces
- [x] Create reusable compound components for common patterns
- [x] Implement proper separation of concerns
- [x] Extract custom hooks for complex logic

**✅ COMPLETED - Phase 1:**

**Major Refactoring Completed:**

- **Refactored `mcp-testing-view.tsx`**: Broke down 1019-line monolithic component into 10 focused
  sub-components
- **Created focused components**: `TestingHeader`, `QuickStartPresets`,
  `OrganizationContextSelector`, `TestingTabs`, `ToolTestingTab`, `PromptTestingTab`,
  `ResourceTestingTab`, `HealthTestingTab`, `TestResultsDisplay`, `TestHistoryDisplay`
- **Proper separation of concerns**: Each component has a single responsibility
- **Maintained existing functionality**: All business logic preserved via the existing
  `useMcpTesting` hook
- **Improved maintainability**: Components are now under 150 lines each
- **Better reusability**: Each component can be used independently

### **2. Type Safety** `[Priority: Medium]`

**Issue:** Inconsistent TypeScript usage and type safety

**Actions:**

- [ ] Eliminate remaining `any` types
- [ ] Add proper interface definitions for API responses
- [ ] Implement stricter TypeScript configuration
- [ ] Add discriminated unions for better type narrowing

### **3. Error Handling** `[Priority: Medium]`

**Issue:** Inconsistent error handling patterns across services

**Current State:**

- Some services use try/catch, others don't
- Inconsistent error message formatting
- No centralized error boundary strategy

**Actions:**

- [ ] Standardize error handling patterns
- [ ] Implement centralized error boundary components
- [ ] Create consistent error message formatting
- [ ] Add proper error logging and monitoring

### **4. API Layer** `[Priority: Medium]`

**Issue:** Inconsistent API patterns and response handling

**Actions:**

- [ ] Standardize API request/response patterns
- [ ] Implement consistent data fetching hooks
- [ ] Add proper loading and error states
- [ ] Optimize caching strategies

### **5. Testing Strategy** `[Priority: Medium]`

**Issue:** Limited test coverage for core functionality

**Actions:**

- [ ] Set up testing infrastructure (Jest, React Testing Library)
- [ ] Add unit tests for utility functions
- [ ] Add component tests for key UI components
- [ ] Add integration tests for critical user flows

### **6. Developer Experience** `[Priority: Low]`

**Issue:** Could improve tooling and development workflow

**Actions:**

- [ ] Enhance development scripts and tooling
- [ ] Improve documentation and code comments
- [ ] Add better TypeScript path mappings
- [ ] Optimize build and development server performance

### **7. Performance Optimization** `[Priority: Low]`

**Issue:** Potential performance improvements

**Actions:**

- [ ] Implement proper code splitting
- [ ] Optimize bundle size and loading
- [ ] Add performance monitoring
- [ ] Implement proper memoization where needed

### **8. Shared Types Audit & Consolidation** `[Priority: High]`

**Issue:** Type definitions are duplicated across apps leading to inconsistencies and maintenance
overhead

**Current Duplications Identified:**

- **Session Types**: Different Session interfaces in gateway, database schema, and apps
- **Organization Types**: OrganizationContext scattered across multiple packages
- **API Response Patterns**: Inconsistent success/error response structures
- **Configuration Types**: Duplicated Environment and server config patterns
- **Database Entity Types**: Repeated metadata patterns and base entity interfaces

**Best Candidates for Shared Types:**

#### **Core Domain Types**

- [ ] **Session Management**

  ```typescript
  // Consolidate Session types from:
  // - packages/schemas/src/gateway/types.ts (runtime Session)
  // - packages/database/prisma/schema.prisma (database Session)
  // - apps/gateway/src/gateway/session-manager.ts (SessionJwtPayload)
  ```

- [ ] **Organization Context**
  ```typescript
  // Standardize across:
  // - packages/server-core/src/config.ts (OrganizationContext)
  // - apps/gateway/src/services/organization-context.ts (OrganizationContext)
  // - apps/mcp-admin/src/types/* (Organization interfaces)
  ```

#### **API & Response Patterns**

- [ ] **Standardized API Responses**

  ```typescript
  // Consolidate patterns from:
  // - packages/schemas/src/gateway/types.ts (HTTPResponse)
  // - packages/schemas/src/mcp/types.ts (McpResponse)
  // - apps/mcp-admin API routes (success/error patterns)
  ```

- [ ] **Error Handling Types**
  ```typescript
  // Unify error structures from:
  // - MCP protocol errors (MCPErrorResponse)
  // - HTTP API errors (various patterns)
  // - Database operation errors
  ```

#### **Configuration & Environment**

- [ ] **Base Configuration Types**

  ```typescript
  // Consolidate from:
  // - packages/server-core/src/config.ts (BaseMcpServerConfig)
  // - apps/*/src/config/config.ts (server-specific configs)
  // - packages/utils/src/validation.ts (Environment)
  ```

- [ ] **Database Entity Patterns**
  ```typescript
  // Standardize metadata patterns:
  // - Json metadata fields across all entities
  // - Audit trail patterns (createdAt, updatedAt, deletedAt)
  // - UUID primary key patterns
  ```

#### **Testing & Development Types**

- [ ] **Testing Response Types**
  ```typescript
  // Consolidate testing patterns:
  // - apps/mcp-admin testing service types
  // - packages/dev-tools response patterns
  // - Common test fixture structures
  ```

**Implementation Plan:**

1. **Phase 3.1: Core Session & Organization Types**
   - Create shared session management types
   - Standardize organization context interfaces
   - Migrate gateway and database consumers

2. **Phase 3.2: API Response Standardization**
   - Define standard success/error response patterns
   - Create shared HTTP and MCP response types
   - Migrate all API routes to use shared patterns

3. **Phase 3.3: Configuration & Environment Types**
   - Consolidate Environment type definition
   - Create base configuration interfaces
   - Standardize server configuration patterns

4. **Phase 3.4: Database Entity Patterns**
   - Create base entity interfaces with common fields
   - Standardize metadata JSON patterns
   - Create shared audit trail types

**Success Metrics:**

- [ ] Zero duplicate Session type definitions
- [ ] Single source of truth for Organization context
- [ ] Standardized API responses across all endpoints
- [ ] Consolidated Environment type usage
- [ ] 90%+ type reuse for common patterns

## 🏗️ **Implementation Strategy**

### **Phase 1: Component Refactoring**

1. Break down large components
2. Create reusable UI patterns
3. Implement proper separation of concerns

### **Phase 2: Shared Types & Schema Consolidation**

1. Audit and implement shared types in @/schemas
2. Standardize API response patterns across all apps
3. Consolidate configuration base types

## 🧪 **Testing Strategy**

- **Unit Tests:** Focus on utilities and business logic
- **Component Tests:** Test UI components in isolation
- **Integration Tests:** Test critical user workflows
- **E2E Tests:** Test complete user journeys

## 📊 **Success Metrics**

- [ ] Zero unused dependencies
- [ ] All components under 500 lines
- [ ] 80%+ TypeScript strict mode compliance
- [ ] Zero duplicate Session type definitions
- [ ] Single source of truth for Organization context
- [ ] Standardized API responses across all endpoints
- [ ] 90%+ type reuse for common patterns
- [ ] Consolidated Environment type usage
- [ ] Improved developer onboarding time

## 🔄 **Continuous Improvement**

- Regular knip audits for dependency management
- Automated testing in CI/CD pipeline
- Code review guidelines for maintainability
- Performance monitoring and alerts

---

**Branch:** `feature/codebase-cleanup-maintainability` **Started:** January 2025 **Target:**
Improved maintainability, developer experience, and code quality
