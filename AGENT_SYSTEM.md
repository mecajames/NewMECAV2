# Agent System Documentation

## Overview

This project uses a specialized agent system for development. Instead of a single AI handling everything, you can invoke specialized expert agents for different tasks.

## The Agent Team

### Project Management
- **/pm** - Project Manager (orchestrates all other agents)

### Development Experts
- **/backend-dev** - Backend Development Expert (NestJS, APIs, MikroORM)
- **/frontend-dev** - Frontend Development Expert (React, TypeScript, UI)
- **/db-expert** - Supabase Database Expert (schema, migrations, queries)

### Review Specialists
- **/code-review** - Code Reviewer (quality, patterns, best practices)
- **/simplify** - Code Simplifier (complexity reduction, refactoring)
- **/security** - Security Reviewer (vulnerabilities, auth, permissions)
- **/tech-lead** - Tech Lead (architecture, technical decisions)
- **/ux** - UX Reviewer (user experience, accessibility, usability)

## How to Use

### Quick Start

**For General Tasks**: Use the Project Manager to orchestrate
```
/pm I need to add a new membership renewal feature
```

The PM will:
1. Break down the task
2. Delegate to appropriate agents
3. Coordinate their work
4. Integrate the results

**For Specific Tasks**: Call the specialist directly
```
/backend-dev Create a new notifications module
/frontend-dev Build a dashboard component for admins
/db-expert Add a new table for user preferences
/code-review Review the profiles module
/security Audit the authentication system
/ux Review the event registration flow
```

### The Project Manager Workflow

The PM is your main entry point for complex work:

**Example 1: New Feature**
```
You: /pm Add a photo gallery feature for competitions

PM will:
1. Consult /tech-lead on architecture approach
2. Have /db-expert design schema
3. Assign /backend-dev to create APIs
4. Assign /frontend-dev to build UI
5. Request /security review for uploads
6. Request /ux review for user flow
7. Request /code-review for quality check
8. Integrate everything and report back
```

**Example 2: Fix and Improve**
```
You: /pm The event registration page is slow and confusing

PM will:
1. Have /ux analyze the user experience
2. Have /code-review check for issues
3. Have /simplify identify complexity
4. Have /tech-lead recommend optimizations
5. Assign /frontend-dev to implement fixes
6. Coordinate testing and deployment
```

## Agent Responsibilities

### Development Agents

**Backend Dev** handles:
- NestJS modules (entities, services, controllers)
- API endpoints (REST)
- Database operations (MikroORM)
- Business logic implementation
- Integration with external services

**Frontend Dev** handles:
- React components
- API client layer (NO direct Supabase)
- Custom hooks
- Page layouts
- State management
- UI implementation

**DB Expert** handles:
- Schema design
- Migration files
- Query optimization
- Indexes and constraints
- RLS policies
- Data integrity

### Review Agents

**Code Reviewer** checks:
- Code quality and patterns
- TypeScript usage
- Error handling
- Best practices
- Architecture adherence

**Simplifier** finds:
- Complex functions
- Code duplication
- Refactoring opportunities
- Readability issues
- Unnecessary abstractions

**Security** audits:
- Authentication/authorization
- Input validation
- SQL injection risks
- XSS vulnerabilities
- Secret management
- OWASP Top 10

**Tech Lead** decides:
- Architecture approach
- Technology choices
- Technical standards
- Performance strategy
- Risk management

**UX** reviews:
- User flows
- Interface design
- Accessibility (WCAG)
- Mobile experience
- Error handling UX

## Coordination Patterns

### Pattern 1: Feature Development
```
/pm → /tech-lead (architecture)
    → /db-expert (schema)
    → /backend-dev (API)
    → /frontend-dev (UI)
    → /security (review)
    → /code-review (quality)
    → /ux (experience)
```

### Pattern 2: Code Quality Sweep
```
/pm → /code-review (find issues)
    → /simplify (find complexity)
    → /security (find vulnerabilities)
    → /backend-dev OR /frontend-dev (fix)
    → /code-review (verify fixes)
```

### Pattern 3: Architecture Decision
```
/pm → /tech-lead (evaluate options)
    → /security (security implications)
    → /db-expert (data implications)
    → /ux (user implications)
    → Decision + Documentation
```

### Pattern 4: Bug Fix
```
/pm → /code-review (identify root cause)
    → /backend-dev OR /frontend-dev (fix)
    → /security (check for security issues)
    → /code-review (verify fix)
```

## Best Practices

### 1. Use PM for Complex Work
Let the PM orchestrate when:
- Multiple steps required
- Multiple experts needed
- Coordination is complex
- You want a complete solution

### 2. Call Specialists Directly for Simple Tasks
Skip PM when:
- Single, clear task
- You know which expert you need
- Quick review needed

### 3. Review After Implementation
Always review new code:
```
After implementing feature:
/code-review Review the [module] module
/security Check [feature] for vulnerabilities
/ux Review [page/flow] user experience
```

### 4. Architecture First
For new features:
```
Before coding:
/tech-lead How should we implement [feature]?

Then:
/pm Implement [feature] using the approach from tech lead
```

### 5. Iterative Improvement
Regular quality checks:
```
Weekly/Sprint:
/simplify Analyze [module] for complexity
/code-review Review recent changes
/security Audit for new vulnerabilities
```

## Agent Communication

Agents can work together:

**Backend ↔ Frontend**: Ensure API contracts match
```
/backend-dev creates API
/frontend-dev consumes API
Both verify contracts align
```

**DB ↔ Backend**: Schema and entity alignment
```
/db-expert designs schema
/backend-dev creates entities
Both ensure they match
```

**Security → Dev**: Fix vulnerabilities
```
/security finds vulnerability
/backend-dev or /frontend-dev fixes
/security verifies fix
```

**UX → Frontend**: Implement improvements
```
/ux identifies UX issues
/frontend-dev implements fixes
/ux verifies improvements
```

## Examples

### Example 1: Complete Feature
```
You: /pm I need member profiles to show their competition history

PM Response:
Breaking down task:
1. /db-expert - Add competition_history table
2. /backend-dev - Create API endpoints
3. /frontend-dev - Add profile section component
4. /ux - Review profile page flow
5. /code-review - Review implementation

[Executes each step with coordination]
[Provides integrated solution]
```

### Example 2: Security Audit
```
You: /security Audit the authentication system

Security Agent Response:
[Comprehensive security review]
- Critical: Issue X in auth guard
- High: Issue Y in token validation
- Medium: Issue Z in password handling
[Detailed report with fixes]
```

### Example 3: Code Quality
```
You: /simplify Analyze the events service for complexity

Simplifier Response:
Found 5 complex functions:
1. processEvent() - 150 lines, complexity 8/10
   [Shows refactoring with examples]
2. validateRegistration() - nested 4 levels
   [Shows simplified version]
[Prioritized list with before/after]
```

### Example 4: Architecture Decision
```
You: /tech-lead Should we use REST or GraphQL for our new API?

Tech Lead Response:
[Evaluates both options]
Recommendation: REST
Reasoning:
- Team familiarity
- Current architecture
- Simpler for this use case
[Detailed analysis with decision record]
```

## Tips

1. **Be Specific**: Give agents context about what you need
   - Good: "/backend-dev Create a notifications module with email and in-app alerts"
   - Better: "/backend-dev Create notifications module. Requirements: email, in-app, mark as read, pagination"

2. **Use PM for Delegation**: Let PM figure out the task breakdown
   - Instead of calling 5 agents yourself, ask PM to handle it

3. **Chain Reviews**: After implementing, review in sequence
   ```
   /code-review → /security → /ux
   ```

4. **Document Decisions**: Tech lead creates ADRs for important choices

5. **Regular Quality Checks**: Don't wait for problems
   ```
   Monthly: /code-review, /security, /simplify on full codebase
   ```

## Agent Files Location

All agent definitions are in:
```
.claude/commands/
├── pm.md              # Project Manager
├── backend-dev.md     # Backend Expert
├── frontend-dev.md    # Frontend Expert
├── db-expert.md       # Database Expert
├── code-review.md     # Code Reviewer
├── simplify.md        # Code Simplifier
├── security.md        # Security Reviewer
├── tech-lead.md       # Tech Lead
└── ux.md              # UX Reviewer
```

You can edit these files to customize agent behavior.

## Getting Started

Try it now:

```bash
# Get project overview and recommendations
/pm Give me a status update and recommend next steps

# Or start a specific task
/pm Add email notifications for new event registrations

# Or call a specialist
/code-review Review the current backend code
/ux Review the homepage user experience
/security Audit for common vulnerabilities
```

## Notes

- Agents are stateless (each call is fresh)
- PM maintains context across agent calls within a session
- Agent prompts are in markdown files (easy to customize)
- All agents have access to project files and git
- Agents follow ONBOARDING.md architecture rules

## Summary

**Use /pm for**: Complex tasks, feature development, coordination
**Use specialists for**: Specific expert tasks, reviews, focused work
**Result**: Efficient, expert-driven development with quality checks built in
