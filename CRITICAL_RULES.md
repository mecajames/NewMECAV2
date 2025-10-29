# CRITICAL WORKFLOW RULES

## Rule 1: MANDATORY AGENT HANDOFF BEFORE CONVERSATION COMPACTION

**NEVER, UNDER ANY CIRCUMSTANCES, PERFORM A CONVERSATION COMPACTION WITHOUT FIRST CREATING AN AGENT HANDOFF DOCUMENT.**

### Requirements:

1. **Before any conversation compaction**, you MUST:
   - Create a comprehensive AGENT_HANDOFF.md document (or update if exists)
   - Document ALL current context, decisions, and work in progress
   - Include file paths, line numbers, and specific implementation details
   - List all pending tasks and their status
   - Explain what was being worked on and why
   - Include any user preferences or special instructions

2. **The handoff document MUST include**:
   - Current state of the project
   - Recent changes made
   - Active work streams
   - Known issues or blockers
   - Next steps
   - Any important context that would be lost in compaction

3. **File location**: `AGENT_HANDOFF.md` in project root

4. **Update frequency**: Update the handoff document whenever significant progress is made, not just before compaction

### Why This Rule Exists:

Conversation compaction causes complete loss of context. Without a handoff document, the next session starts blind, losing:
- Work in progress
- User preferences and decisions
- Implementation details
- Reasoning behind architectural choices
- Current blockers and solutions being explored

### Violation Consequences:

Breaking this rule results in:
- Lost work context
- Frustration and wasted time
- Having to re-explain everything
- Potential loss of important decisions and rationale

## Enforcement:

This rule is **NON-NEGOTIABLE**. If you detect you're approaching token limits:

1. STOP current work
2. Create/update AGENT_HANDOFF.md
3. Verify handoff is complete
4. ONLY THEN proceed with compaction

---

**Last Updated**: 2025-10-25
**Priority**: CRITICAL
