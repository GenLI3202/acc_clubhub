# CLAUDE.md

---

# General Rules

- Before doing broad codebase searches, ask the user for the specific file path or location if the search isn't immediately productive. Do not spend more than 2 tool calls searching for a file without asking.

---

# Project Setup

- This project primarily uses Python and TypeScript. When scaffolding new projects, prefer manual file creation over interactive CLI tools (e.g., `npm create vite`) as they often stall in non-interactive environments.

---

# Bug Fixes

- When fixing bugs, always verify the fix works locally before considering it complete. If the fix cannot be verified locally (e.g., production-only issue), explicitly state that and suggest creating a tracking issue.

---

# Code Changes

- When making multi-file changes, verify that new files are placed in the correct directories and won't be picked up by content globs or build tools unintentionally. Double-check database table names and migration scripts before running them.

---

# Coding Style

> Rules for AI coding assistants. Follow strictly.

## Naming

| Element        | Style                   | Example                 |
| -------------- | ----------------------- | ----------------------- |
| Classes        | `PascalCase`          | `CustomerService`     |
| Functions/Vars | `snake_case`          | `get_account_by_id`   |
| Constants      | `UPPER_SNAKE`         | `MAX_RETRY_COUNT`     |
| Files          | `snake_case`          | `transfer_service.py` |
| Private        | `_leading_underscore` | `_validate_balance`   |

## Formatting

- **88 chars** max line length
- **4 spaces** indent (no tabs)
- **Double quotes** `"` for strings
- **Trailing commas** in multi-line structures

## Imports Order

1. Standard library → 2. Third-party → 3. Local application

## Type Hints

- **Required** on all function signatures (params + return)
- Use `Optional[X]` for nullable, `list[X]` over `List[X]`

## Other

- Docstrings: `"""` with brief summary, Args/Returns/Raises
- Exceptions: `{Problem}Error` in `src/domain/exceptions.py`
- Tests: `test_{function}_{scenario}`

---

# Git Rules

- ✅ **Allowed**: `status`, `diff`, `log`, `add`, `commit`, `stash`, `switch`, `branch`, `revert`
- ❌ **Blocked**: `push`, `merge`, `rebase`, `reset --hard`, `clean -fd`, `branch -D`
- 🌿 **Branching**: Create `phase-N/<topic>` branch before each phase (e.g., `phase-1/read-only-api`)
- 📝 **Commits**: `<type>(scope): <50ch max>` — one logical change per commit
  - Types: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore`
  - **Commit after each file/logical unit** — don't batch entire phases
- ⏸️ **End of phase**: List commits made, await human review before merge/push
