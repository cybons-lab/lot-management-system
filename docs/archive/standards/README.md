# Standards Documentation

This directory contains detailed development standards that have been extracted from CLAUDE.md for better maintainability.

## Files

| File | Description |
|------|-------------|
| `error-handling.md` | Error handling patterns for backend and frontend |
| `security.md` | Security standards (auth, encryption, CORS) |
| `state-management.md` | React Query and Jotai patterns |

## Quick Reference

### Error Handling
- Backend: Use domain exceptions, Problem+JSON format
- Frontend: Use React Query error states, toast for mutations

### Security
- JWT tokens: Access 1h, Refresh 7d
- Passwords: bcrypt, 12+ rounds
- CORS: Explicit origins only

### State Management
- Server state: TanStack Query (with cache invalidation)
- Client state: Jotai atoms

## See Also
- `CLAUDE.md` - Main project guide
- `docs/DOCUMENT_GUIDELINES.adoc` - Documentation standards
