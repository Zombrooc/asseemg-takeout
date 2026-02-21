# Better-T-Stack Project Rules

This is a pickup project created with Better-T-Stack CLI.

## Project Structure

This is a monorepo with the following structure:

- **`apps/web/`** - Frontend application (React with TanStack Router)

- **`apps/server/`** - Backend server (Express)

- **`apps/native/`** - React Native mobile app (with NativeWind)

- **`packages/api/`** - Shared API logic and types
- **`packages/db/`** - Database schema and utilities
- **`packages/env/`** - Shared environment variables and validation
- **`packages/config/`** - Shared TypeScript configuration

## Available Scripts

- `pnpm run dev` - Start all apps in development mode
- `pnpm run dev:web` - Start only the web app
- `pnpm run dev:server` - Start only the server
- `pnpm run dev:native` - Start only the native app
- `pnpm run build` - Build all apps
- `pnpm run lint` - Lint all packages
- `pnpm run typecheck` - Type check all packages

## Database Commands

All database operations should be run from the server workspace:

- `pnpm run db:push` - Push schema changes to database
- `pnpm run db:studio` - Open database studio
- `pnpm run db:generate` - Generate Prisma files
- `pnpm run db:migrate` - Run database migrations

Database schema is located in `packages/db/prisma/schema.prisma`

## API Structure

- tRPC routers are in `packages/api/src/routers/`
- Client-side tRPC utils are in `apps/web/src/utils/trpc.ts`

## Project Configuration

This project includes a `bts.jsonc` configuration file that stores your Better-T-Stack settings:

- Contains your selected stack configuration (database, ORM, backend, frontend, etc.)
- Used by the CLI to understand your project structure
- Safe to delete if not needed

## Key Points

- This is a Turborepo monorepo using pnpm workspaces
- Each app has its own `package.json` and dependencies
- Run commands from the root to execute across all workspaces
- Run workspace-specific commands with `pnpm run command-name`
- Turborepo handles build caching and parallel execution
