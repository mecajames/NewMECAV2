# MECA Car Audio - Documentation Index

Welcome to the MECA Car Audio platform documentation. This directory contains all technical documentation organized by category.

> **Looking for a top-level admin walkthrough?** Start with the [Admin Dashboard Overview](./Admin-Dashboard-Overview.html) — it covers every section of the admin dashboard with links to the deeper guides.

## 📚 Documentation Categories

### 🛠️ Admin Guides
End-to-end documentation for site owners and operators.

- **[Admin Dashboard Overview](./Admin-Dashboard-Overview.html)** — every admin section explained, with links to detailed guides
- **[Achievement System](./Admin-Achievements-Guide.html)** — badge catalog, earning rules, manual awards
- **[Judge & Event Director Management](./Admin-Judge-EventDirector-Guide.html)** — application → approval → certification lifecycle
- **[Secondary Memberships](./Admin-Secondary-Memberships-Guide.html)** — family / team sub-account model
- **[User Membership Workflows](./Admin-User-Membership-Workflows.html)** — purchase / renewal / upgrade / refund flows
- **[Points Configuration](./Points-Configuration-Guide.html)** — point values per place, class, format
- **[Master / Secondary System Flow](./Master-Secondary-System-Flow.html)** — visual flowchart
- **[MECA ID System](./MECA-ID-System.html)** — assignment logic and flowchart

### 🧪 QA & Testing
- **[QA Checklist (legacy reference)](./MECA-QA-Checklist.html)** — earlier checklist content; live owner-driven checklist now lives at `/admin/qa-checklist`
- **[QA Testing: Secondary Memberships](./QA-Testing-Secondary-Memberships.html)**

### 👤 User Guides
- **[Family & Team Memberships](./User-Guide-Family-Team-Memberships.html)** — how members manage sub-accounts

### 🧩 System & Architecture
- **[Judge & Event Director System (architecture)](./MECA-Judge-EventDirector-System.html)**
- **[Judge & Event Director System Specification](./MECA-Judge-EventDirector-System-Prompt.html)** — full development specification
- **[Business Logic (Overview)](./BUSINESS_LOGIC_OVERVIEW.html)** — high-level cross-module dependencies
- **[Business Logic (Detailed)](./BUSINESS_LOGIC_DETAILED.html)** — full architectural reference

### 📋 Results & Operations
- **[Results Entry System](./Results-Entry-System.html)** — manual, Excel, and TermLab import
- **[Results Entry Business Logic](./Results-Entry-Business-Logic.html)** — MECA ID and membership reconciliation rules

### 🚢 Deployment
Production deployment, backup, and environment management.

- **[DEPLOYMENT-GUIDE.md](./deployment/DEPLOYMENT-GUIDE.md)** — complete deployment instructions
- **[README-DEPLOYMENT.md](./deployment/README-DEPLOYMENT.md)** — deployment overview
- **[DOCKER.md](./deployment/DOCKER.md)** — Docker setup and container management
- **[BACKUP-RESTORE-GUIDE.md](./deployment/BACKUP-RESTORE-GUIDE.md)** — database backup and restore procedures
- **[EXPORT_IMPORT_GUIDE.md](./deployment/EXPORT_IMPORT_GUIDE.md)** — data export and import procedures

### ⚙️ Backend
- **[MIKRO_ORM_SETUP.md](./backend/MIKRO_ORM_SETUP.md)** — MikroORM configuration and entity setup

### 🎨 Frontend
- **[README.md](./frontend/README.md)** — frontend project overview
- **[SETUP_GUIDE.md](./frontend/SETUP_GUIDE.md)** — frontend setup and configuration
- **[QUICK_START.md](./frontend/QUICK_START.md)** — quick start guide for frontend development
- **[SUPABASE_SETUP.md](./frontend/SUPABASE_SETUP.md)** — Supabase integration and setup
- **[SECURITY_FIXES.md](./frontend/SECURITY_FIXES.md)** — security patches and fixes

### ✨ Features
- **[RECAPTCHA_SETUP.md](./features/RECAPTCHA_SETUP.md)** — Google reCAPTCHA v3 setup guide
- **[RECAPTCHA_IMPLEMENTATION_SUMMARY.md](./features/RECAPTCHA_IMPLEMENTATION_SUMMARY.md)** — implementation summary
- **[RECAPTCHA_CHECKLIST.md](./features/RECAPTCHA_CHECKLIST.md)** — testing and deployment checklist
- **[RECAPTCHA_ARCHITECTURE.md](./features/RECAPTCHA_ARCHITECTURE.md)** — architecture and diagrams

### 📜 Scripts
- **[scripts/README.md](./scripts/README.md)** — utility scripts documentation
- **[scripts/md_to_themed_html.py](./scripts/md_to_themed_html.py)** — markdown→themed-HTML converter used to regenerate doc pages

## 🗂️ Directory Structure

```
docs/
├── index.html                   # Public docs landing page
├── README.html / README.md      # This index
├── *.html                       # Themed admin & system guides
├── deployment/                  # Production deployment docs (markdown)
├── backend/                     # Backend technical docs (markdown)
├── frontend/                    # Frontend technical docs (markdown)
├── features/                    # Feature-specific docs (markdown)
└── scripts/                     # Documentation utility scripts
```

## 🎯 Quick Links

**Owner / operator looking for admin docs?**
- [Admin Dashboard Overview](./Admin-Dashboard-Overview.html)
- [Judge & Event Director Management](./Admin-Judge-EventDirector-Guide.html)
- [Achievement System](./Admin-Achievements-Guide.html)

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

1. **Choose the appropriate location:**
   - Admin / system guides intended to be browsed in HTML → top-level `docs/` as `.html`
   - Feature, deployment, or technical reference docs → existing subdirectories as `.md`
2. **Update this index** with a link to your new document
3. **For new admin / system guides written as markdown**, run the converter to produce a themed HTML version:

   ```bash
   python docs/scripts/md_to_themed_html.py docs/Your-Doc.md docs/Your-Doc.html "Your Doc Title"
   ```

4. **Follow the existing format:**
   - Use clear, descriptive titles
   - Include a table of contents for longer docs
   - Add code examples where appropriate
   - Include troubleshooting sections
5. **Keep documentation up-to-date when code changes** — remove outdated information and add version/date stamps when relevant.

## 📧 Questions?

If you can't find what you're looking for:

1. Browse the public docs landing at [`index.html`](./index.html)
2. Start with the [Admin Dashboard Overview](./Admin-Dashboard-Overview.html)
3. Search across all docs in your editor
4. Ask the team in the project chat

---

**Last Updated:** May 2, 2026
**Documentation Version:** 2.0
