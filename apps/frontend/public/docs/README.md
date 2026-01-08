# MECA Car Audio - Documentation Index

Welcome to the MECA Car Audio platform documentation. This directory contains all technical documentation organized by category.

## 📚 Documentation Categories

### 🚀 Getting Started
Essential documentation for new developers and contributors.

- **[ONBOARDING.md](./getting-started/ONBOARDING.md)** - Complete developer onboarding guide with architecture overview
- **[README.md](./getting-started/README.md)** - Main project README with overview and quick start
- **[QUICK-COMMANDS.md](./getting-started/QUICK-COMMANDS.md)** - Quick reference for common commands

### 🚢 Deployment
Documentation for deploying, backing up, and managing the application in production.

- **[DEPLOYMENT-GUIDE.md](./deployment/DEPLOYMENT-GUIDE.md)** - Complete deployment instructions
- **[README-DEPLOYMENT.md](./deployment/README-DEPLOYMENT.md)** - Deployment README and overview
- **[DOCKER.md](./deployment/DOCKER.md)** - Docker setup and container management
- **[BACKUP-RESTORE-GUIDE.md](./deployment/BACKUP-RESTORE-GUIDE.md)** - Database backup and restore procedures
- **[EXPORT_IMPORT_GUIDE.md](./deployment/EXPORT_IMPORT_GUIDE.md)** - Data export and import procedures

### ⚙️ Backend
Backend-specific documentation and setup guides.

- **[MIKRO_ORM_SETUP.md](./backend/MIKRO_ORM_SETUP.md)** - MikroORM configuration and entity setup

### 🎨 Frontend
Frontend-specific documentation, setup guides, and security information.

- **[README.md](./frontend/README.md)** - Frontend project overview
- **[SETUP_GUIDE.md](./frontend/SETUP_GUIDE.md)** - Frontend setup and configuration
- **[QUICK_START.md](./frontend/QUICK_START.md)** - Quick start guide for frontend development
- **[SUPABASE_SETUP.md](./frontend/SUPABASE_SETUP.md)** - Supabase integration and setup
- **[SECURITY_FIXES.md](./frontend/SECURITY_FIXES.md)** - Security patches and fixes

### ✨ Features
Documentation for specific features and integrations.

- **[RECAPTCHA_SETUP.md](./features/RECAPTCHA_SETUP.md)** - Google reCAPTCHA v3 setup guide
- **[RECAPTCHA_IMPLEMENTATION_SUMMARY.md](./features/RECAPTCHA_IMPLEMENTATION_SUMMARY.md)** - reCAPTCHA implementation summary
- **[RECAPTCHA_CHECKLIST.md](./features/RECAPTCHA_CHECKLIST.md)** - reCAPTCHA testing and deployment checklist
- **[RECAPTCHA_ARCHITECTURE.md](./features/RECAPTCHA_ARCHITECTURE.md)** - reCAPTCHA architecture and diagrams

### 📜 Scripts
Documentation for utility scripts and automation.

- **[README.md](./scripts/README.md)** - Scripts documentation and usage

## 🗂️ Directory Structure

```
docs/
├── README.md                    # This file
├── getting-started/             # New developer onboarding
│   ├── ONBOARDING.md
│   ├── README.md
│   └── QUICK-COMMANDS.md
├── deployment/                  # Production deployment
│   ├── DEPLOYMENT-GUIDE.md
│   ├── README-DEPLOYMENT.md
│   ├── DOCKER.md
│   ├── BACKUP-RESTORE-GUIDE.md
│   └── EXPORT_IMPORT_GUIDE.md
├── backend/                     # Backend documentation
│   └── MIKRO_ORM_SETUP.md
├── frontend/                    # Frontend documentation
│   ├── README.md
│   ├── SETUP_GUIDE.md
│   ├── QUICK_START.md
│   ├── SUPABASE_SETUP.md
│   └── SECURITY_FIXES.md
├── features/                    # Feature-specific docs
│   ├── RECAPTCHA_SETUP.md
│   ├── RECAPTCHA_IMPLEMENTATION_SUMMARY.md
│   ├── RECAPTCHA_CHECKLIST.md
│   └── RECAPTCHA_ARCHITECTURE.md
└── scripts/                     # Scripts documentation
    └── README.md
```

## 🎯 Quick Links

**New to the project?** Start here:
1. [Getting Started README](./getting-started/README.md)
2. [Developer Onboarding Guide](./getting-started/ONBOARDING.md)
3. [Quick Commands Reference](./getting-started/QUICK-COMMANDS.md)

**Setting up the development environment?**
- [Frontend Setup Guide](./frontend/SETUP_GUIDE.md)
- [Backend MikroORM Setup](./backend/MIKRO_ORM_SETUP.md)

**Deploying to production?**
- [Deployment Guide](./deployment/DEPLOYMENT-GUIDE.md)
- [Docker Documentation](./deployment/DOCKER.md)

**Working on specific features?**
- [reCAPTCHA Setup](./features/RECAPTCHA_SETUP.md)

## 📝 Contributing to Documentation

When adding new documentation:

1. **Choose the appropriate directory:**
   - Getting started guides → `getting-started/`
   - Deployment/operations docs → `deployment/`
   - Backend technical docs → `backend/`
   - Frontend technical docs → `frontend/`
   - Feature-specific docs → `features/`
   - Script documentation → `scripts/`

2. **Update this index** (README.md) with a link to your new document

3. **Follow the existing format:**
   - Use clear, descriptive titles
   - Include table of contents for longer docs
   - Add code examples where appropriate
   - Include troubleshooting sections

4. **Keep documentation up-to-date:**
   - Update docs when code changes
   - Remove outdated information
   - Add version/date information when relevant

## 🔍 Search Tips

Most code editors allow you to search across all files. Use these patterns to find specific documentation:

- Architecture patterns: Search in `getting-started/ONBOARDING.md`
- Deployment steps: Search in `deployment/DEPLOYMENT-GUIDE.md`
- Feature setup: Search in `features/` directory
- Quick commands: Check `getting-started/QUICK-COMMANDS.md`

## 📧 Questions?

If you can't find what you're looking for:

1. Check the [main README](./getting-started/README.md)
2. Review the [ONBOARDING guide](./getting-started/ONBOARDING.md)
3. Search across all docs in your editor
4. Ask the team in the project chat

---

**Last Updated:** November 13, 2025
**Documentation Version:** 1.0
