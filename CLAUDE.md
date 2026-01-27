# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neibo Backend is a Node.js/Express 5 REST API for a walking tour application. It uses TypeScript with ESM modules (native Node.js execution, no bundler), PostgreSQL with Drizzle ORM, and integrates with Google's Gemini AI for tour generation.

## Commands

```bash
# Development
npm run dev              # Start dev server with watch mode (node --watch)
npm run start            # Start production server

# Testing
npm run test             # Run tests (sets APP_STAGE=test)
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Database (Drizzle)
npm run db:generate      # Generate migrations from schema changes
npm run db:push          # Push schema directly to database (dev)
npm run db:migrate       # Run migrations
npm run db:studio        # Open Drizzle Studio GUI
npm run db:seed          # Seed the database
npm run db:reset         # Reset database (scripts/reset-db.ts)
```

## Architecture

### Request Flow
1. `src/index.ts` - Entry point, starts Express server
2. `src/server.ts` - Express app configuration, middleware stack, route mounting
3. Routes (`src/routes/`) - Define endpoints and apply validation middleware
4. Controllers (`src/controllers/`) - Business logic and database operations

### Key Patterns

**Environment Configuration**: `env.ts` at project root validates all environment variables using Zod schema. Uses `custom-env` to load `.env`, `.env.test`, `.env.staging` based on `APP_STAGE`.

**Database**: Drizzle ORM with PostgreSQL. Schema in `src/db/schema.ts` defines tables, relations, and exports Zod schemas (via `drizzle-zod`) plus TypeScript types.

**Validation Middleware**: `src/middleware/validation.ts` provides `validateBody`, `validateParams`, `validateQuery` functions that wrap Zod schemas for Express request validation.

**Authentication**: JWT-based auth with access tokens and refresh tokens. `src/middleware/auth.ts` exports `authenticateToken` middleware. `src/utils/jwt.ts` handles token creation/verification using `jose`.

**Error Handling**: Custom error handler in `src/middleware/errorHandler.ts` handles named errors (ValidationError, UnauthorizedError, NotFoundError) and PostgreSQL-specific error codes (23505 unique violation, etc.).

### Database Schema (src/db/schema.ts)
Core entities: `users`, `walks`, `spots`, `tags`, `walkTags`, `walkReviews`, `walkComments`, `walkSubscriptions`, `userWalkProgress`, `refreshTokens`

### API Routes
- `/api/auth` - Registration, login, token refresh
- `/api/walks` - Walk CRUD operations
- `/api/users` - User profile operations
- `/api/ai` - AI-powered tour generation (Gemini)

### Testing
Tests use Vitest with a global setup (`tests/setup/globalSetup.ts`) that drops and recreates the test database schema before each run. Tests run sequentially (single thread) to avoid database conflicts.
