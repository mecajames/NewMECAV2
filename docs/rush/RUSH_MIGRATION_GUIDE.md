# Rush.js Migration Guide for NewMECAV2

This document describes the migration from npm workspaces to Rush.js monorepo management, modeled after the request-desk project structure.

## Table of Contents

- [Overview](#overview)
- [Why Rush.js?](#why-rushjs)
- [Project Structure](#project-structure)
- [Migration Steps](#migration-steps)
- [Daily Development Commands](#daily-development-commands)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)

---

## Overview

Rush.js is a scalable monorepo manager from Microsoft that provides:

- **Deterministic installs** via PNPM with a single lock file
- **Incremental builds** with built-in caching
- **Parallel execution** respecting dependency order
- **Consistent tooling** across all projects

### Current Structure (Rush.js)

```
NewMECAV2/
├── apps/
│   ├── backend/           # @newmeca/backend (NestJS API)
│   └── frontend/          # @newmeca/frontend (React + Vite)
├── packages/
│   └── shared/            # @newmeca/shared (TypeScript types)
├── common/
│   ├── config/
│   │   └── rush/
│   │       ├── command-line.json    # Custom Rush commands
│   │       ├── common-versions.json # Enforced dependency versions
│   │       └── repo-state.json      # Rush state tracking
│   └── temp/                        # Rush temp files (gitignored)
├── docs/                            # Documentation
├── scripts/                         # Database migration scripts
├── rush.json                        # Rush configuration
└── newmeca.code-workspace           # VSCode multi-root workspace
```

> **Note:** This structure keeps the original `packages/` folder (vs `libraries/` in request-desk)
> and `frontend` naming (vs `web` in request-desk) for compatibility with existing code.

---

## Why Rush.js?

| Feature | npm Workspaces | Rush.js |
|---------|---------------|---------|
| Lock file | Multiple possible | Single unified |
| Build caching | None | Built-in incremental |
| Parallel builds | Manual with concurrently | Automatic with dependency awareness |
| Version enforcement | Manual | Automatic via common-versions.json |
| Install speed | Moderate | Fast (PNPM + caching) |
| CI optimization | Manual | Built-in change detection |

---

## Project Structure

### Apps Directory (`/apps`)

Production applications that are deployed:

| Project | Package Name | Description |
|---------|-------------|-------------|
| `apps/backend` | `@newmeca/backend` | NestJS API server |
| `apps/frontend` | `@newmeca/frontend` | React + Vite frontend |

### Packages Directory (`/packages`)

Shared code consumed by apps:

| Project | Package Name | Description |
|---------|-------------|-------------|
| `packages/shared` | `@newmeca/shared` | Shared TypeScript types |

> **Future expansion:** You can add more packages like `@newmeca/ui`, `@newmeca/schema`, etc.

### Common Directory (`/common`)

Rush configuration files (auto-generated):

```
common/
├── config/
│   └── rush/
│       ├── command-line.json    # Custom Rush commands (build, dev, test, typecheck, lint)
│       ├── common-versions.json # Enforced dependency versions
│       └── repo-state.json      # Rush state tracking
└── temp/                        # Rush temp files (gitignored)
```

---

## Setup (Already Complete)

The Rush.js migration has been completed. This section documents what was configured for reference.

### Rush Configuration (`rush.json`)

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/rush/v5/rush.schema.json",
  "rushVersion": "5.119.0",
  "pnpmVersion": "8.15.5",
  "pnpmOptions": {
    "pnpmStore": "global",
    "useWorkspaces": true
  },
  "nodeSupportedVersionRange": ">=18.0.0",
  "ensureConsistentVersions": false,
  "projectFolderMinDepth": 2,
  "projectFolderMaxDepth": 2,
  "projects": [
    {
      "packageName": "@newmeca/shared",
      "projectFolder": "packages/shared",
      "shouldPublish": false,
      "reviewCategory": "libraries"
    },
    {
      "packageName": "@newmeca/backend",
      "projectFolder": "apps/backend",
      "shouldPublish": false,
      "reviewCategory": "apps"
    },
    {
      "packageName": "@newmeca/frontend",
      "projectFolder": "apps/frontend",
      "shouldPublish": false,
      "reviewCategory": "apps"
    }
  ]
}
```

### Package Names

All packages use the `@newmeca` scope:

| Package | Location |
|---------|----------|
| `@newmeca/backend` | `apps/backend/package.json` |
| `@newmeca/frontend` | `apps/frontend/package.json` |
| `@newmeca/shared` | `packages/shared/package.json` |

### VSCode Workspace (`newmeca.code-workspace`)

```json
{
  "folders": [
    { "name": "root", "path": "." },
    { "name": "@newmeca/backend", "path": "apps/backend" },
    { "name": "@newmeca/frontend", "path": "apps/frontend" },
    { "name": "@newmeca/shared", "path": "packages/shared" }
  ],
  "settings": {
    "typescript.tsdk": "@newmeca/backend/node_modules/typescript/lib"
  }
}
```

### Adding Internal Dependencies

When one package depends on another, use the `workspace:*` protocol:

```json
// apps/backend/package.json or apps/frontend/package.json
{
  "dependencies": {
    "@newmeca/shared": "workspace:*"
  }
}
```

Then run `rush update` to link them.

---

## Daily Development Commands

### Rush Commands (Run from Any Directory)

| Command | Description |
|---------|-------------|
| `rush update` | Install/update all dependencies |
| `rush build` | Build all projects (respects dependency order) |
| `rush rebuild` | Clean build all projects |
| `rush build -t @newmeca/frontend` | Build only frontend and its dependencies |
| `rush build -f @newmeca/frontend` | Build only frontend (skip dependencies) |
| `rush check` | Check for missing dependencies |
| `rush purge` | Remove all node_modules and temp files |

### Rushx Commands (Run from Project Directory)

| Command | Description |
|---------|-------------|
| `rushx dev` | Start development server |
| `rushx build` | Build current project |
| `rushx test` | Run tests |
| `rushx lint` | Run linter |
| `rushx typecheck` | Type-check project |

### Examples

```bash
# Start FULL dev environment (Supabase + Backend + Frontend)
cd apps/backend
rushx dev

# Start without Supabase (if already running)
cd apps/backend
rushx dev:no-supabase

# Start with debug mode enabled
cd apps/backend
rushx dev:debug

# Start only backend
cd apps/backend
rushx dev:backend

# Start only frontend
cd apps/frontend
rushx dev

# Build everything before deploying
rush build

# Build only frontend and its dependencies
rush build -t @newmeca/frontend

# Add a new dependency to backend
cd apps/backend
rush add -p express --dev
```

### Dev Scripts Reference (from apps/backend)

| Script | Description |
|--------|-------------|
| `rushx dev` | Start everything: Supabase + Backend + Frontend |
| `rushx dev:no-supabase` | Start Backend + Frontend (Supabase already running) |
| `rushx dev:debug` | Start everything with Node.js debugger enabled |
| `rushx dev:backend` | Start only the NestJS backend |
| `rushx dev:frontend` | Start only the Vite frontend |

---

## Common Workflows

### Adding a New Dependency

```bash
# Navigate to the project
cd apps/backend

# Add a runtime dependency
rush add -p lodash

# Add a dev dependency
rush add -p @types/lodash --dev

# After adding, always run
rush update
```

### Creating a New Package

1. Create the folder structure:
```bash
mkdir -p packages/new-lib/src
```

2. Create `packages/new-lib/package.json`:
```json
{
  "name": "@newmeca/new-lib",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

3. Create `packages/new-lib/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true
  },
  "include": ["src"]
}
```

4. Create `packages/new-lib/src/index.ts`:
```typescript
// Export your types and utilities here
export {};
```

5. Add to `rush.json` projects array:
```json
{
  "packageName": "@newmeca/new-lib",
  "projectFolder": "packages/new-lib",
  "shouldPublish": false,
  "reviewCategory": "libraries"
}
```

6. Update the VSCode workspace file (`newmeca.code-workspace`):
```json
{
  "name": "@newmeca/new-lib",
  "path": "packages/new-lib"
}
```

7. Run `rush update` to install dependencies

### Updating All Dependencies

```bash
# Check for outdated packages
rush check

# Update the lockfile
rush update

# If you need to upgrade a specific package across all projects
# Edit common/config/rush/common-versions.json
```

### Running Commands Across All Projects

```bash
# Type-check all projects
rush typecheck

# Lint all projects
rush lint

# Run tests in all projects
rush test
```

---

## Custom Commands

Add custom commands in `common/config/rush/command-line.json`:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/rush/v5/command-line.schema.json",
  "commands": [
    {
      "commandKind": "bulk",
      "name": "build",
      "summary": "Build all projects",
      "enableParallelism": true,
      "ignoreDependencyOrder": false
    },
    {
      "commandKind": "bulk",
      "name": "dev",
      "summary": "Start development servers",
      "enableParallelism": true,
      "watchForChanges": true
    },
    {
      "commandKind": "bulk",
      "name": "typecheck",
      "summary": "Type-check all projects",
      "enableParallelism": true,
      "ignoreDependencyOrder": true
    },
    {
      "commandKind": "bulk",
      "name": "lint",
      "summary": "Lint all projects",
      "enableParallelism": true,
      "ignoreDependencyOrder": true
    },
    {
      "commandKind": "bulk",
      "name": "test",
      "summary": "Run tests",
      "enableParallelism": true,
      "ignoreDependencyOrder": true
    }
  ]
}
```

---

## Troubleshooting

### "Cannot find module" Errors

```bash
# Clean and reinstall
rush purge
rush update
rush build
```

### Lock File Conflicts

```bash
# Regenerate lock file
rush update --full
```

### Build Cache Issues

```bash
# Force rebuild without cache
rush rebuild
```

### TypeScript Path Resolution Issues

Ensure `tsconfig.json` has proper paths:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@newmeca/shared": ["../../packages/shared/src"],
      "@newmeca/shared/*": ["../../packages/shared/src/*"]
    }
  }
}
```

### Dependency Version Conflicts

Add preferred versions to `common/config/rush/common-versions.json`:

```json
{
  "preferredVersions": {
    "typescript": "5.7.2",
    "react": "18.3.1",
    "@types/react": "18.3.x"
  }
}
```

---

## Best Practices

1. **Always use `rush add`** instead of `npm install` or `pnpm add`
2. **Run `rush update`** after pulling changes that modify package.json
3. **Use `workspace:*`** for internal dependencies
4. **Keep libraries focused** - one responsibility per library
5. **Use the VSCode workspace** for better multi-project navigation
6. **Commit `pnpm-lock.yaml`** - it ensures reproducible builds
7. **Use `rush build -t <project>`** for faster targeted builds

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    RUSH.JS QUICK REFERENCE                  │
├─────────────────────────────────────────────────────────────┤
│ INSTALL/UPDATE                                              │
│   rush update          Install all dependencies             │
│   rush add -p <pkg>    Add dependency to current project    │
│   rush purge           Clean all node_modules               │
├─────────────────────────────────────────────────────────────┤
│ BUILD                                                       │
│   rush build           Build all projects                   │
│   rush rebuild         Clean + build all                    │
│   rush build -t <pkg>  Build project + dependencies         │
│   rush build -f <pkg>  Build project only                   │
├─────────────────────────────────────────────────────────────┤
│ DEVELOPMENT (from project folder)                           │
│   rushx dev            Start dev server                     │
│   rushx build          Build current project                │
│   rushx test           Run tests                            │
├─────────────────────────────────────────────────────────────┤
│ UTILITIES                                                   │
│   rush check           Verify dependencies                  │
│   rush list            List all projects                    │
│   rush change          Record changelog entry               │
└─────────────────────────────────────────────────────────────┘
```

---

## Additional Resources

- [Rush.js Official Documentation](https://rushjs.io/)
- [Rush.js GitHub Repository](https://github.com/microsoft/rushstack)
- [PNPM Documentation](https://pnpm.io/)
- [Monorepo Best Practices](https://monorepo.tools/)
