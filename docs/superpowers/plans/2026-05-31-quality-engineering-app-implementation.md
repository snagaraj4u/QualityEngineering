# Quality Engineering App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-framework, AI-powered Quality Engineering platform with intelligent test case generation, framework integration, defect management, and comprehensive dashboards.

**Architecture:** Framework Adapter pattern with Intelligent Skill Router routing test case generation through framework/pattern-specific Claude API prompts. Configurable Jira and QMetry integrations. Hybrid web + CLI delivery.

**Tech Stack:** React 18, Next.js, Node.js, Express, PostgreSQL, Claude API, Vercel, Commander.js (CLI)

---

## File Structure

```
quality-engineering/
├── apps/
│   ├── web/                          # Next.js web application
│   │   ├── app/                      # App router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx          # Dashboard main
│   │   │   │   ├── engineer/         # QA Engineer views
│   │   │   │   └── lead/             # Test Lead views
│   │   │   ├── (builder)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── test-cases/
│   │   │   │   │   ├── page.tsx      # List test cases
│   │   │   │   │   └── [id]/edit.tsx # Edit test case
│   │   │   │   ├── generate/
│   │   │   │   │   └── page.tsx      # Test case builder
│   │   │   │   ├── jira/
│   │   │   │   │   └── page.tsx      # Jira requirements
│   │   │   │   └── upload/
│   │   │   │       └── page.tsx      # Upload section
│   │   │   ├── (defects)/
│   │   │   │   ├── page.tsx          # List defects
│   │   │   │   └── create/page.tsx   # Create defect
│   │   │   ├── (settings)/
│   │   │   │   ├── page.tsx          # Settings main
│   │   │   │   ├── jira/page.tsx     # Jira config
│   │   │   │   ├── qmetry/page.tsx   # QMetry config
│   │   │   │   └── frameworks/page.tsx
│   │   │   ├── api/
│   │   │   │   ├── test-cases/
│   │   │   │   │   ├── route.ts      # CRUD operations
│   │   │   │   │   ├── generate/route.ts
│   │   │   │   │   └── [id]/route.ts
│   │   │   │   ├── jira/
│   │   │   │   │   ├── auth/route.ts
│   │   │   │   │   ├── requirements/route.ts
│   │   │   │   │   └── callback/route.ts
│   │   │   │   ├── defects/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/route.ts
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── metrics/route.ts
│   │   │   │   │   └── trends/route.ts
│   │   │   │   ├── execute/route.ts
│   │   │   │   └── video/route.ts
│   │   ├── lib/
│   │   │   ├── auth.ts               # Auth utilities
│   │   │   ├── client.ts             # API client
│   │   │   └── hooks/
│   │   │       ├── useTestCases.ts
│   │   │       ├── useJira.ts
│   │   │       └── useDashboard.ts
│   │   ├── components/
│   │   │   ├── TestCaseForm.tsx
│   │   │   ├── FrameworkSelector.tsx
│   │   │   ├── JiraAuth.tsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── MetricsCard.tsx
│   │   │   │   ├── TrendChart.tsx
│   │   │   │   └── DefectStatus.tsx
│   │   │   └── shared/
│   │   │       ├── Header.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── Loading.tsx
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── next.config.js
│   │
│   └── cli/                          # CLI application
│       ├── src/
│       │   ├── index.ts              # Entry point
│       │   ├── commands/
│       │   │   ├── run.ts            # Run tests
│       │   │   ├── generate.ts       # Generate test cases
│       │   │   ├── config.ts         # Configuration
│       │   │   └── publish.ts        # Publish results
│       │   ├── executor/
│       │   │   ├── CucumberExecutor.ts
│       │   │   ├── CypressExecutor.ts
│       │   │   ├── JestExecutor.ts
│       │   │   └── BaseExecutor.ts
│       │   └── utils/
│       │       ├── logger.ts
│       │       ├── config.ts
│       │       └── api.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── bin/
│           └── qe-cli.js             # Binary entry point
│
├── packages/
│   ├── core/                         # Shared core logic
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── adapters/
│   │   │   │   ├── BaseAdapter.ts
│   │   │   │   ├── CucumberAdapter.ts
│   │   │   │   ├── CypressAdapter.ts
│   │   │   │   ├── JestAdapter.ts
│   │   │   │   └── types.ts
│   │   │   ├── skill-router/
│   │   │   │   ├── SkillRouter.ts
│   │   │   │   ├── skill-registry.json
│   │   │   │   └── prompts/
│   │   │   │       ├── cucumber-bdd-ui.prompt
│   │   │   │       ├── cucumber-api-bdd.prompt
│   │   │   │       ├── jest-unit.prompt
│   │   │   │       ├── cypress-e2e.prompt
│   │   │   │       └── [other-prompts].prompt
│   │   │   ├── models/
│   │   │   │   ├── TestCase.ts
│   │   │   │   ├── Defect.ts
│   │   │   │   ├── ExecutionResult.ts
│   │   │   │   └── types.ts
│   │   │   ├── integrations/
│   │   │   │   ├── JiraIntegration.ts
│   │   │   │   ├── QMetryIntegration.ts
│   │   │   │   └── types.ts
│   │   │   ├── video/
│   │   │   │   ├── VideoAnalyzer.ts
│   │   │   │   └── types.ts
│   │   │   └── utils/
│   │   │       ├── logger.ts
│   │   │       ├── validation.ts
│   │   │       └── types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── database/                     # Database layer
│       ├── migrations/
│       │   ├── 001_initial_schema.sql
│       │   ├── 002_test_cases.sql
│       │   ├── 003_defects.sql
│       │   ├── 004_execution_results.sql
│       │   ├── 005_clients.sql
│       │   ├── 006_integrations.sql
│       │   └── 007_skill_logs.sql
│       ├── seed.ts
│       └── schema.prisma             # Prisma schema
│
├── backend/                          # Express backend API
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── test-cases.ts
│   │   │   ├── jira.ts
│   │   │   ├── qmetry.ts
│   │   │   ├── defects.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── execute.ts
│   │   │   └── video.ts
│   │   ├── services/
│   │   │   ├── TestCaseService.ts
│   │   │   ├── JiraService.ts
│   │   │   ├── QMetryService.ts
│   │   │   ├── DefectService.ts
│   │   │   ├── SkillRouterService.ts
│   │   │   ├── ExecutionService.ts
│   │   │   └── VideoService.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── logging.ts
│   │   ├── utils/
│   │   │   ├── db.ts
│   │   │   ├── claude.ts
│   │   │   ├── validation.ts
│   │   │   └── logger.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── docs/
│   ├── superpowers/
│   │   ├── specs/
│   │   │   └── 2026-05-31-quality-engineering-app-design.md
│   │   └── plans/
│   │       └── 2026-05-31-quality-engineering-app-implementation.md
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   └── CONTRIBUTING.md
│
├── package.json                      # Monorepo root
├── tsconfig.json
├── .gitignore
└── README.md
```

---

# Phase 1: Foundation & Infrastructure

## Task 1.1: Initialize Monorepo and Project Structure

**Files:**
- Create: `package.json` (root)
- Create: `tsconfig.json` (root)
- Create: `apps/web/package.json`
- Create: `apps/cli/package.json`
- Create: `backend/package.json`
- Create: `packages/core/package.json`
- Create: `packages/database/package.json`
- Create: `.gitignore`
- Create: `README.md`

**Dependencies to install:**
- Root: `npm i -w workspaces @turbo/gen turbo`
- Web: `next react react-dom typescript`
- Backend: `express typescript dotenv cors`
- Core: `typescript`
- Database: `@prisma/client prisma`
- CLI: `commander typescript chalk`

- [ ] **Step 1: Create root package.json with workspaces**

```json
{
  "name": "quality-engineering",
  "version": "1.0.0",
  "description": "AI-powered Quality Engineering Platform",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "backend"
  ],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "@turbo/gen": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@core/*": ["packages/core/src/*"],
      "@db/*": ["packages/database/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", ".next", "build"]
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
build/
.next/
.env
.env.local
.env.*.local
*.log
.DS_Store
.vscode/
.idea/
*.swp
coverage/
.turbo/
```

- [ ] **Step 4: Create README.md**

```markdown
# Quality Engineering Platform

An AI-powered, multi-framework test case generation and management platform.

## Quick Start

```bash
npm install
npm run dev
```

## Project Structure

- `apps/web` - Next.js frontend application
- `apps/cli` - Command-line interface
- `backend` - Express API server
- `packages/core` - Shared core logic and adapters
- `packages/database` - Database schema and migrations

## Documentation

See `docs/` for detailed documentation.
```

- [ ] **Step 5: Initialize git repository**

```bash
cd C:\QualityEngineering
git init
git add .
git commit -m "chore: initialize monorepo structure"
```

---

## Task 1.2: Set Up Database Schema with Prisma

**Files:**
- Create: `packages/database/schema.prisma`
- Create: `packages/database/package.json`
- Create: `.env.example` (root)

- [ ] **Step 1: Create Prisma schema**

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Client {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  jiraConfig Json?   // Jira connection config
  qmetryConfig Json? // QMetry connection config
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects Project[]
  users    User[]
  logs     SkillLog[]
}

model User {
  id        String   @id @default(cuid())
  clientId  String
  email     String   @unique
  role      String   // "qa-engineer" | "test-lead" | "admin"
  jiraToken String?  @db.Text // Encrypted
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client         Client     @relation(fields: [clientId], references: [id], onDelete: Cascade)
  testCases      TestCase[] @relation("createdBy")
  executionLogs  ExecutionResult[]

  @@index([clientId])
  @@index([email])
}

model Project {
  id           String   @id @default(cuid())
  clientId     String
  name         String
  description  String?
  framework    String   // "cucumber" | "jest" | "cypress" | etc.
  designPattern String  // "bdd-ui" | "api" | "unit" | etc.
  repoUrl      String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  client    Client     @relation(fields: [clientId], references: [id], onDelete: Cascade)
  testCases TestCase[]
  defects   Defect[]

  @@index([clientId])
}

model TestCase {
  id           String   @id @default(cuid())
  projectId    String
  createdById  String
  title        String
  description  String?
  framework    String   // Inherited from project or override
  designPattern String  // Inherited from project or override
  content      String   @db.Text // Framework-specific code
  sourceType   String   // "manual" | "jira" | "upload" | "video"
  status       String   // "draft" | "approved" | "integrated" | "executed"
  
  jiraStoryId  String?
  jiraStoryTitle String?
  acceptanceCriteria Json? // Array of criteria
  
  videoUrl     String?
  videoAnalysis Json?  // Analysis results
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  project       Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy     User             @relation("createdBy", fields: [createdById], references: [id])
  executionResults ExecutionResult[]
  defects       Defect[]

  @@index([projectId])
  @@index([createdById])
}

model ExecutionResult {
  id         String   @id @default(cuid())
  testCaseId String
  userId     String
  status     String   // "pass" | "fail" | "skipped"
  duration   Int      // milliseconds
  errorMessage String?
  environment String?
  cliVersion String?
  logs       String?  @db.Text
  createdAt  DateTime @default(now())

  testCase TestCase @relation(fields: [testCaseId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id])

  @@index([testCaseId])
  @@index([userId])
}

model Defect {
  id           String   @id @default(cuid())
  projectId    String
  testCaseId   String?
  qmetryId     String?  // External ID in QMetry
  title        String
  description  String   @db.Text
  severity     String   // "critical" | "high" | "medium" | "low"
  status       String   // "open" | "in_progress" | "resolved" | "closed"
  failureDetails String? @db.Text
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  project  Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  testCase TestCase? @relation(fields: [testCaseId], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@index([testCaseId])
}

model SkillLog {
  id          String   @id @default(cuid())
  clientId    String
  framework   String
  designPattern String
  inputTokens Int
  outputTokens Int
  promptUsed  String
  success     Boolean
  error       String?
  createdAt   DateTime @default(now())

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
}
```

- [ ] **Step 2: Create database package.json**

```json
{
  "name": "@qe/database",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "generate": "prisma generate",
    "seed": "node seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "ts-node": "^10.0.0"
  }
}
```

- [ ] **Step 3: Create .env.example**

```
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/quality_engineering"

# Jira
JIRA_CLIENT_ID=""
JIRA_CLIENT_SECRET=""
JIRA_REDIRECT_URI="http://localhost:3000/api/jira/callback"

# QMetry
QMETRY_API_KEY=""

# Claude API
CLAUDE_API_KEY=""

# Next.js
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Session
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 4: Commit**

```bash
git add packages/database/ .env.example
git commit -m "chore: set up Prisma database schema"
```

---

## Task 1.3: Set Up Express Backend Server

**Files:**
- Create: `backend/src/index.ts`
- Create: `backend/src/utils/db.ts`
- Create: `backend/src/utils/logger.ts`
- Create: `backend/src/middleware/errorHandler.ts`
- Create: `backend/src/types/index.ts`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`

- [ ] **Step 1: Create backend package.json**

```json
{
  "name": "@qe/backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src"
  },
  "dependencies": {
    "express": "^4.18.0",
    "dotenv": "^16.0.0",
    "cors": "^2.8.0",
    "@prisma/client": "^5.0.0",
    "anthropic": "^0.20.0",
    "axios": "^1.6.0",
    "multer": "^1.4.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "@types/cors": "^2.8.0"
  }
}
```

- [ ] **Step 2: Create backend tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "module": "ESNext",
    "target": "ES2020"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create database utility**

```typescript
// backend/src/utils/db.ts
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  const globalForPrisma = global as unknown as { prisma: PrismaClient };
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  prisma = globalForPrisma.prisma;
}

export default prisma;
```

- [ ] **Step 4: Create logger utility**

```typescript
// backend/src/utils/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
    }
  },
};
```

- [ ] **Step 5: Create error handler middleware**

```typescript
// backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Request error', {
    path: req.path,
    method: req.method,
    error: err.message,
  });

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
  });
};
```

- [ ] **Step 6: Create types**

```typescript
// backend/src/types/index.ts
export interface AuthRequest extends Express.Request {
  clientId?: string;
  userId?: string;
  userRole?: string;
}

export interface SkillRequest {
  framework: string;
  designPattern: string;
  requirements: string;
  acceptanceCriteria?: string[];
}

export interface TestCaseResponse {
  id: string;
  title: string;
  content: string;
  framework: string;
  designPattern: string;
  status: string;
  createdAt: Date;
}

export interface ExecutionResultResponse {
  id: string;
  testCaseId: string;
  status: 'pass' | 'fail' | 'skipped';
  duration: number;
  errorMessage?: string;
  createdAt: Date;
}
```

- [ ] **Step 7: Create main server file**

```typescript
// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes (will be added in later tasks)
// app.use('/api/test-cases', testCasesRouter);
// app.use('/api/jira', jiraRouter);
// app.use('/api/qmetry', qmetryRouter);
// app.use('/api/defects', defectsRouter);
// app.use('/api/dashboard', dashboardRouter);
// app.use('/api/execute', executeRouter);
// app.use('/api/video', videoRouter);

// Error handling
app.use(errorHandler);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Backend server running on port ${PORT}`);
});

export default app;
```

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat: set up Express backend server with database connection"
```

---

## Task 1.4: Set Up Next.js Web Application

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/api/.gitkeep`

- [ ] **Step 1: Create web package.json**

```json
{
  "name": "@qe/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^19.0.0",
    "@types/node": "^20.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: Create next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
```

- [ ] **Step 3: Create web tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create root layout**

```typescript
// apps/web/app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quality Engineering Platform',
  description: 'AI-powered test case generation and management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Create landing page**

```typescript
// apps/web/app/page.tsx
export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Quality Engineering Platform</h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-powered test case generation and management
        </p>
        <div className="space-x-4">
          <a
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Dashboard
          </a>
          <a
            href="/settings"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Settings
          </a>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Create .gitkeep for API routes**

```bash
mkdir -p apps/web/app/api
touch apps/web/app/api/.gitkeep
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/
git commit -m "feat: set up Next.js web application"
```

---

## Task 1.5: Set Up CLI Application Structure

**Files:**
- Create: `apps/cli/package.json`
- Create: `apps/cli/tsconfig.json`
- Create: `apps/cli/bin/qe-cli.js`
- Create: `apps/cli/src/index.ts`
- Create: `apps/cli/src/commands/.gitkeep`
- Create: `apps/cli/src/utils/.gitkeep`

- [ ] **Step 1: Create CLI package.json**

```json
{
  "name": "@qe/cli",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "bin": {
    "qe": "./bin/qe-cli.js"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "axios": "^1.6.0",
    "@core": "*"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2: Create CLI tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "module": "ESNext"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create CLI binary entry point**

```javascript
#!/usr/bin/env node
import { main } from '../dist/index.js';
main();
```

- [ ] **Step 4: Create main CLI file**

```typescript
// apps/cli/src/index.ts
import { program } from 'commander';

export async function main() {
  program
    .name('qe')
    .description('Quality Engineering CLI')
    .version('1.0.0');

  // Commands will be added in later tasks
  // program.command('run').description('Run tests').action(runTests);
  // program.command('generate').description('Generate test cases').action(generate);
  // program.command('config').description('Configure CLI').action(config);

  program.parse(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
```

- [ ] **Step 5: Create directory structure**

```bash
mkdir -p apps/cli/src/commands
mkdir -p apps/cli/src/utils
touch apps/cli/src/commands/.gitkeep
touch apps/cli/src/utils/.gitkeep
mkdir -p apps/cli/bin
```

- [ ] **Step 6: Commit**

```bash
git add apps/cli/
git commit -m "feat: set up CLI application structure"
```

---

## Task 1.6: Initialize Core Package with Adapter System

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/adapters/BaseAdapter.ts`
- Create: `packages/core/src/adapters/types.ts`
- Create: `packages/core/src/models/TestCase.ts`

- [ ] **Step 1: Create core package.json**

```json
{
  "name": "@core",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create core tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create adapter types**

```typescript
// packages/core/src/adapters/types.ts
export interface TestCaseModel {
  title: string;
  description: string;
  steps: Step[];
  expectedResults: string[];
  tags?: string[];
}

export interface Step {
  action: string;
  input?: string;
  expectedResult?: string;
}

export interface AdapterConfig {
  projectPath: string;
  framework: string;
}

export interface GeneratedCode {
  filename: string;
  extension: string;
  content: string;
}
```

- [ ] **Step 4: Create base adapter**

```typescript
// packages/core/src/adapters/BaseAdapter.ts
import { TestCaseModel, GeneratedCode, AdapterConfig } from './types';

export abstract class BaseAdapter {
  protected config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  abstract generateCode(testCase: TestCaseModel): GeneratedCode;
  abstract getFileExtension(): string;
  abstract getFrameworkName(): string;
  abstract validateSyntax(code: string): boolean;

  getProjectPath(): string {
    return this.config.projectPath;
  }

  getFramework(): string {
    return this.config.framework;
  }
}
```

- [ ] **Step 5: Create TestCase model**

```typescript
// packages/core/src/models/TestCase.ts
export class TestCase {
  id: string;
  title: string;
  description: string;
  framework: string;
  designPattern: string;
  content: string;
  status: 'draft' | 'approved' | 'integrated' | 'executed';
  sourceType: 'manual' | 'jira' | 'upload' | 'video';
  jiraLinkage?: {
    storyId: string;
    storyTitle: string;
    acceptanceCriteria: string[];
  };
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<TestCase>) {
    Object.assign(this, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  validate(): boolean {
    return !!(
      this.title &&
      this.framework &&
      this.designPattern &&
      this.content
    );
  }
}
```

- [ ] **Step 6: Create index file**

```typescript
// packages/core/src/index.ts
export { BaseAdapter } from './adapters/BaseAdapter';
export type { TestCaseModel, AdapterConfig, GeneratedCode, Step } from './adapters/types';
export { TestCase } from './models/TestCase';
```

- [ ] **Step 7: Commit**

```bash
git add packages/core/
git commit -m "feat: initialize core package with base adapter system"
```

---

# Phase 2: Jira Integration

## Task 2.1: Implement Jira OAuth Flow

**Files:**
- Create: `backend/src/services/JiraService.ts`
- Create: `backend/src/routes/jira.ts`
- Modify: `backend/src/index.ts`
- Create: `apps/web/lib/auth.ts`
- Create: `apps/web/components/JiraAuth.tsx`

- [ ] **Step 1: Create Jira service**

```typescript
// backend/src/services/JiraService.ts
import axios from 'axios';
import { logger } from '../utils/logger';

export interface JiraConfig {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  cloudId: string;
  expiresAt: number;
}

export class JiraService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.JIRA_CLIENT_ID || '';
    this.clientSecret = process.env.JIRA_CLIENT_SECRET || '';
    this.redirectUri = process.env.JIRA_REDIRECT_URI || '';
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: 'read:jira-work write:jira-work read:jira-user offline_access',
      prompt: 'consent',
      response_type: 'code',
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<JiraConfig> {
    try {
      const response = await axios.post('https://auth.atlassian.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      });

      const { access_token, refresh_token, expires_in } = response.data;

      // Get cloud ID and instance URL
      const meResponse = await axios.get('https://api.atlassian.com/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const cloudId = meResponse.data.resource_identifiers[0].id;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        instanceUrl: `https://api.atlassian.com/ex/jira/${cloudId}`,
        cloudId,
        expiresAt: Date.now() + expires_in * 1000,
      };
    } catch (error) {
      logger.error('Failed to exchange code for token', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<Partial<JiraConfig>> {
    try {
      const response = await axios.post('https://auth.atlassian.com/oauth/token', {
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token, expires_in } = response.data;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Date.now() + expires_in * 1000,
      };
    } catch (error) {
      logger.error('Failed to refresh token', error);
      throw error;
    }
  }

  async getIssues(config: JiraConfig, jql: string = 'type=Story OR type=Task'): Promise<any[]> {
    try {
      const response = await axios.get(`${config.instanceUrl}/rest/api/3/search`, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
        params: {
          jql,
          maxResults: 50,
          fields: ['summary', 'description', 'customfield_10049'], // customfield_10049 is often Acceptance Criteria
        },
      });

      return response.data.issues.map((issue: any) => ({
        id: issue.key,
        title: issue.fields.summary,
        description: issue.fields.description?.content?.[0]?.content?.[0]?.text || '',
        acceptanceCriteria: issue.fields.customfield_10049 || [],
      }));
    } catch (error) {
      logger.error('Failed to get Jira issues', error);
      throw error;
    }
  }

  async getIssueDetails(config: JiraConfig, issueId: string): Promise<any> {
    try {
      const response = await axios.get(`${config.instanceUrl}/rest/api/3/issue/${issueId}`, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
        params: {
          fields: ['summary', 'description', 'customfield_10049'],
        },
      });

      return {
        id: response.data.key,
        title: response.data.fields.summary,
        description: response.data.fields.description?.content?.[0]?.content?.[0]?.text || '',
        acceptanceCriteria: response.data.fields.customfield_10049 || [],
      };
    } catch (error) {
      logger.error('Failed to get Jira issue details', error);
      throw error;
    }
  }
}
```

- [ ] **Step 2: Create Jira routes**

```typescript
// backend/src/routes/jira.ts
import { Router, Request, Response, NextFunction } from 'express';
import { JiraService } from '../services/JiraService';
import prisma from '../utils/db';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import crypto from 'crypto';

const router = Router();
const jiraService = new JiraService();

interface AuthRequest extends Request {
  clientId?: string;
  userId?: string;
}

// GET /api/jira/auth/url
router.get('/auth/url', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const state = crypto.randomBytes(32).toString('hex');
    const authUrl = jiraService.getAuthorizationUrl(state);

    // Store state in session/cache (in production, use Redis)
    // For now, return it and expect client to store it
    res.json({
      authUrl,
      state,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/jira/callback
router.get('/callback', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      throw new ApiError(400, 'Missing code or state parameter');
    }

    // Verify state (in production, check against stored state)
    const jiraConfig = await jiraService.exchangeCodeForToken(code as string);

    // Store in user's Jira config (requires auth)
    if (req.userId) {
      await prisma.user.update({
        where: { id: req.userId },
        data: {
          jiraToken: JSON.stringify(jiraConfig), // In production, encrypt this
        },
      });
    }

    res.redirect('/settings/jira?connected=true');
  } catch (error) {
    next(error);
  }
});

// GET /api/jira/requirements
router.get('/requirements', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user?.jiraToken) {
      throw new ApiError(400, 'Jira not configured');
    }

    const jiraConfig = JSON.parse(user.jiraToken);
    const issues = await jiraService.getIssues(jiraConfig);

    res.json(issues);
  } catch (error) {
    next(error);
  }
});

// GET /api/jira/requirements/:issueId
router.get('/requirements/:issueId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user?.jiraToken) {
      throw new ApiError(400, 'Jira not configured');
    }

    const jiraConfig = JSON.parse(user.jiraToken);
    const issue = await jiraService.getIssueDetails(jiraConfig, req.params.issueId);

    res.json(issue);
  } catch (error) {
    next(error);
  }
});

export default router;
```

- [ ] **Step 3: Update backend index.ts to register routes**

```typescript
// Update backend/src/index.ts
import jiraRouter from './routes/jira';

// Add after other route imports:
app.use('/api/jira', jiraRouter);
```

- [ ] **Step 4: Create auth utilities**

```typescript
// apps/web/lib/auth.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const jiraAuth = {
  async getAuthUrl(): Promise<{ authUrl: string; state: string }> {
    const response = await axios.get(`${API_URL}/api/jira/auth/url`);
    return response.data;
  },

  async fetchRequirements(): Promise<any[]> {
    const response = await axios.get(`${API_URL}/api/jira/requirements`);
    return response.data;
  },

  async fetchRequirement(issueId: string): Promise<any> {
    const response = await axios.get(`${API_URL}/api/jira/requirements/${issueId}`);
    return response.data;
  },
};
```

- [ ] **Step 5: Create Jira auth component**

```typescript
// apps/web/components/JiraAuth.tsx
'use client';

import { useState } from 'react';
import { jiraAuth } from '@/lib/auth';

export function JiraAuth() {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { authUrl } = await jiraAuth.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Connect Jira</h2>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Connecting...' : 'Connect Jira Account'}
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/JiraService.ts backend/src/routes/jira.ts backend/src/index.ts
git add apps/web/lib/auth.ts apps/web/components/JiraAuth.tsx
git commit -m "feat: implement Jira OAuth integration"
```

---

## Task 2.2: Implement QMetry Integration Service

**Files:**
- Create: `backend/src/services/QMetryService.ts`
- Create: `backend/src/routes/qmetry.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create QMetry service**

```typescript
// backend/src/services/QMetryService.ts
import axios from 'axios';
import { logger } from '../utils/logger';

export interface QMetryConfig {
  apiKey: string;
  baseUrl: string;
  mode: 'jira_plugin' | 'standalone';
}

export class QMetryService {
  private config: QMetryConfig;

  constructor(config: QMetryConfig) {
    this.config = config;
  }

  async createDefect(defectData: {
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    testCaseId?: string;
    environment?: string;
  }): Promise<any> {
    try {
      const payload = {
        ...defectData,
        status: 'open',
      };

      const response = await axios.post(`${this.config.baseUrl}/defects`, payload, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info('Defect created in QMetry', { defectId: response.data.id });
      return response.data;
    } catch (error) {
      logger.error('Failed to create defect in QMetry', error);
      throw error;
    }
  }

  async getDefect(defectId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/defects/${defectId}`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get defect from QMetry', error);
      throw error;
    }
  }

  async updateDefect(
    defectId: string,
    updates: Partial<{ title: string; description: string; status: string; severity: string }>
  ): Promise<any> {
    try {
      const response = await axios.put(`${this.config.baseUrl}/defects/${defectId}`, updates, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update defect in QMetry', error);
      throw error;
    }
  }

  async listDefects(filters?: {
    status?: string;
    severity?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await axios.get(`${this.config.baseUrl}/defects?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to list defects from QMetry', error);
      throw error;
    }
  }
}
```

- [ ] **Step 2: Create QMetry routes**

```typescript
// backend/src/routes/qmetry.ts
import { Router, Request, Response, NextFunction } from 'express';
import { QMetryService } from '../services/QMetryService';
import prisma from '../utils/db';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

interface AuthRequest extends Request {
  clientId?: string;
  userId?: string;
}

// GET /api/qmetry/config
router.get('/config', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.clientId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const client = await prisma.client.findUnique({
      where: { id: req.clientId },
      select: { qmetryConfig: true },
    });

    if (!client?.qmetryConfig) {
      throw new ApiError(400, 'QMetry not configured');
    }

    res.json({ configured: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/qmetry/config
router.post('/config', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.clientId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const { apiKey, baseUrl, mode } = req.body;

    if (!apiKey || !baseUrl || !mode) {
      throw new ApiError(400, 'Missing required fields');
    }

    await prisma.client.update({
      where: { id: req.clientId },
      data: {
        qmetryConfig: { apiKey, baseUrl, mode },
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/qmetry/defects
router.post('/defects', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.clientId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const client = await prisma.client.findUnique({
      where: { id: req.clientId },
      select: { qmetryConfig: true },
    });

    if (!client?.qmetryConfig) {
      throw new ApiError(400, 'QMetry not configured');
    }

    const qmetry = new QMetryService(client.qmetryConfig as any);
    const defect = await qmetry.createDefect(req.body);

    // Save defect reference
    if (req.body.testCaseId) {
      const testCase = await prisma.testCase.findUnique({
        where: { id: req.body.testCaseId },
      });

      if (testCase) {
        await prisma.defect.create({
          data: {
            projectId: testCase.projectId,
            testCaseId: testCase.id,
            qmetryId: defect.id,
            title: req.body.title,
            description: req.body.description,
            severity: req.body.severity,
            status: 'open',
          },
        });
      }
    }

    res.json(defect);
  } catch (error) {
    next(error);
  }
});

// GET /api/qmetry/defects
router.get('/defects', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.clientId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const client = await prisma.client.findUnique({
      where: { id: req.clientId },
      select: { qmetryConfig: true },
    });

    if (!client?.qmetryConfig) {
      throw new ApiError(400, 'QMetry not configured');
    }

    const qmetry = new QMetryService(client.qmetryConfig as any);
    const defects = await qmetry.listDefects({
      status: req.query.status as string,
      severity: req.query.severity as string,
    });

    res.json(defects);
  } catch (error) {
    next(error);
  }
});

// GET /api/qmetry/defects/:defectId
router.get('/defects/:defectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.clientId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const client = await prisma.client.findUnique({
      where: { id: req.clientId },
      select: { qmetryConfig: true },
    });

    if (!client?.qmetryConfig) {
      throw new ApiError(400, 'QMetry not configured');
    }

    const qmetry = new QMetryService(client.qmetryConfig as any);
    const defect = await qmetry.getDefect(req.params.defectId);

    res.json(defect);
  } catch (error) {
    next(error);
  }
});

export default router;
```

- [ ] **Step 3: Update backend index.ts**

```typescript
// Update backend/src/index.ts
import qmetryRouter from './routes/qmetry';

// Add after jira router:
app.use('/api/qmetry', qmetryRouter);
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/QMetryService.ts backend/src/routes/qmetry.ts backend/src/index.ts
git commit -m "feat: implement QMetry integration service"
```

---

# Phase 3: Framework Adapter System

## Task 3.1: Implement Cucumber.js Adapter

**Files:**
- Create: `packages/core/src/adapters/CucumberAdapter.ts`
- Create: `packages/core/src/adapters/index.ts`

- [ ] **Step 1: Create Cucumber adapter**

```typescript
// packages/core/src/adapters/CucumberAdapter.ts
import { BaseAdapter } from './BaseAdapter';
import { TestCaseModel, GeneratedCode } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class CucumberAdapter extends BaseAdapter {
  generateCode(testCase: TestCaseModel): GeneratedCode {
    const featureName = this.sanitizeFileName(testCase.title);
    const content = this.generateFeatureFile(testCase);

    return {
      filename: featureName,
      extension: '.feature',
      content,
    };
  }

  private generateFeatureFile(testCase: TestCaseModel): string {
    const tags = testCase.tags?.map((tag) => `@${tag}`).join('\n') || '@smoke';
    const stepsContent = testCase.steps
      .map((step) => {
        const action = step.action.toLowerCase();
        let stepPrefix = 'Then';

        if (action.includes('navigate') || action.includes('open') || action.includes('go')) {
          stepPrefix = 'Given';
        } else if (
          action.includes('click') ||
          action.includes('type') ||
          action.includes('submit') ||
          action.includes('fill')
        ) {
          stepPrefix = 'When';
        }

        const stepText = step.input
          ? `${stepPrefix} ${step.action} with "${step.input}"`
          : `${stepPrefix} ${step.action}`;

        return stepText;
      })
      .join('\n  ');

    return `${tags}
Feature: ${testCase.title}
  ${testCase.description}

  Scenario: ${testCase.title}
    ${stepsContent}
`;
  }

  private sanitizeFileName(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  getFileExtension(): string {
    return '.feature';
  }

  getFrameworkName(): string {
    return 'Cucumber';
  }

  validateSyntax(code: string): boolean {
    // Basic validation: check for Feature, Scenario, and Given/When/Then
    return (
      code.includes('Feature:') &&
      (code.includes('Scenario:') || code.includes('Scenario Outline:')) &&
      (code.includes('Given') || code.includes('When') || code.includes('Then'))
    );
  }

  writeToProject(testCase: TestCaseModel): void {
    const { filename, extension, content } = this.generateCode(testCase);
    const featuresPath = path.join(this.config.projectPath, 'features');

    if (!fs.existsSync(featuresPath)) {
      fs.mkdirSync(featuresPath, { recursive: true });
    }

    const filePath = path.join(featuresPath, `${filename}${extension}`);
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}
```

- [ ] **Step 2: Create adapter index**

```typescript
// packages/core/src/adapters/index.ts
export { BaseAdapter } from './BaseAdapter';
export { CucumberAdapter } from './CucumberAdapter';
export type { TestCaseModel, AdapterConfig, GeneratedCode, Step } from './types';
```

- [ ] **Step 3: Update core index.ts**

```typescript
// packages/core/src/index.ts
export { BaseAdapter, CucumberAdapter } from './adapters';
export type { TestCaseModel, AdapterConfig, GeneratedCode, Step } from './adapters/types';
export { TestCase } from './models/TestCase';
```

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/adapters/CucumberAdapter.ts packages/core/src/adapters/index.ts
git commit -m "feat: implement Cucumber.js adapter"
```

---

## Task 3.2: Create Adapter Registry and Factory

**Files:**
- Create: `packages/core/src/adapters/AdapterRegistry.ts`
- Create: `packages/core/src/adapters/AdapterFactory.ts`

- [ ] **Step 1: Create adapter registry**

```typescript
// packages/core/src/adapters/AdapterRegistry.ts
import { BaseAdapter } from './BaseAdapter';
import { CucumberAdapter } from './CucumberAdapter';
import { AdapterConfig } from './types';

type AdapterClass = new (config: AdapterConfig) => BaseAdapter;

export class AdapterRegistry {
  private static adapters: Map<string, AdapterClass> = new Map([
    ['cucumber', CucumberAdapter],
  ]);

  static register(name: string, adapter: AdapterClass): void {
    this.adapters.set(name.toLowerCase(), adapter);
  }

  static get(name: string): AdapterClass | undefined {
    return this.adapters.get(name.toLowerCase());
  }

  static getAll(): string[] {
    return Array.from(this.adapters.keys());
  }

  static has(name: string): boolean {
    return this.adapters.has(name.toLowerCase());
  }
}
```

- [ ] **Step 2: Create adapter factory**

```typescript
// packages/core/src/adapters/AdapterFactory.ts
import { AdapterRegistry } from './AdapterRegistry';
import { BaseAdapter } from './BaseAdapter';
import { AdapterConfig } from './types';

export class AdapterFactory {
  static create(framework: string, config: AdapterConfig): BaseAdapter {
    const AdapterClass = AdapterRegistry.get(framework);

    if (!AdapterClass) {
      throw new Error(
        `Unknown framework: ${framework}. Available: ${AdapterRegistry.getAll().join(', ')}`
      );
    }

    return new AdapterClass(config);
  }

  static isSupported(framework: string): boolean {
    return AdapterRegistry.has(framework);
  }

  static getSupportedFrameworks(): string[] {
    return AdapterRegistry.getAll();
  }
}
```

- [ ] **Step 3: Update adapters/index.ts**

```typescript
// packages/core/src/adapters/index.ts
export { BaseAdapter } from './BaseAdapter';
export { CucumberAdapter } from './CucumberAdapter';
export { AdapterRegistry } from './AdapterRegistry';
export { AdapterFactory } from './AdapterFactory';
export type { TestCaseModel, AdapterConfig, GeneratedCode, Step } from './types';
```

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/adapters/AdapterRegistry.ts packages/core/src/adapters/AdapterFactory.ts
git commit -m "feat: implement adapter registry and factory pattern"
```

---

# Phase 4: Test Case Builder & Generation

## Task 4.1: Create Test Case Service and API

**Files:**
- Create: `backend/src/services/TestCaseService.ts`
- Create: `backend/src/routes/test-cases.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create test case service**

```typescript
// backend/src/services/TestCaseService.ts
import prisma from '../utils/db';
import { TestCase } from '@core';
import { logger } from '../utils/logger';

export class TestCaseService {
  async createTestCase(data: {
    projectId: string;
    createdById: string;
    title: string;
    description?: string;
    framework: string;
    designPattern: string;
    content: string;
    sourceType: 'manual' | 'jira' | 'upload' | 'video';
    jiraStoryId?: string;
    jiraStoryTitle?: string;
    acceptanceCriteria?: string[];
  }) {
    try {
      const testCase = await prisma.testCase.create({
        data: {
          ...data,
          status: 'draft',
          acceptanceCriteria: data.acceptanceCriteria
            ? JSON.stringify(data.acceptanceCriteria)
            : undefined,
        },
      });

      logger.info('Test case created', { testCaseId: testCase.id });
      return testCase;
    } catch (error) {
      logger.error('Failed to create test case', error);
      throw error;
    }
  }

  async getTestCase(id: string) {
    try {
      const testCase = await prisma.testCase.findUnique({
        where: { id },
      });

      return testCase;
    } catch (error) {
      logger.error('Failed to get test case', error);
      throw error;
    }
  }

  async listTestCases(projectId: string) {
    try {
      const testCases = await prisma.testCase.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      });

      return testCases;
    } catch (error) {
      logger.error('Failed to list test cases', error);
      throw error;
    }
  }

  async updateTestCase(id: string, data: Partial<any>) {
    try {
      const testCase = await prisma.testCase.update({
        where: { id },
        data: {
          ...data,
          acceptanceCriteria: data.acceptanceCriteria
            ? JSON.stringify(data.acceptanceCriteria)
            : undefined,
        },
      });

      logger.info('Test case updated', { testCaseId: id });
      return testCase;
    } catch (error) {
      logger.error('Failed to update test case', error);
      throw error;
    }
  }

  async deleteTestCase(id: string) {
    try {
      await prisma.testCase.delete({
        where: { id },
      });

      logger.info('Test case deleted', { testCaseId: id });
    } catch (error) {
      logger.error('Failed to delete test case', error);
      throw error;
    }
  }
}
```

- [ ] **Step 2: Create test case routes**

```typescript
// backend/src/routes/test-cases.ts
import { Router, Request, Response, NextFunction } from 'express';
import { TestCaseService } from '../services/TestCaseService';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const testCaseService = new TestCaseService();

interface AuthRequest extends Request {
  userId?: string;
}

// POST /api/test-cases
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const { projectId, title, description, framework, designPattern, content, sourceType } =
      req.body;

    if (!projectId || !title || !framework || !designPattern || !content) {
      throw new ApiError(400, 'Missing required fields');
    }

    const testCase = await testCaseService.createTestCase({
      projectId,
      createdById: req.userId,
      title,
      description,
      framework,
      designPattern,
      content,
      sourceType: sourceType || 'manual',
    });

    res.status(201).json(testCase);
  } catch (error) {
    next(error);
  }
});

// GET /api/test-cases/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testCase = await testCaseService.getTestCase(req.params.id);

    if (!testCase) {
      throw new ApiError(404, 'Test case not found');
    }

    res.json(testCase);
  } catch (error) {
    next(error);
  }
});

// GET /api/test-cases/project/:projectId
router.get('/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testCases = await testCaseService.listTestCases(req.params.projectId);
    res.json(testCases);
  } catch (error) {
    next(error);
  }
});

// PUT /api/test-cases/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const testCase = await testCaseService.updateTestCase(req.params.id, req.body);
    res.json(testCase);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/test-cases/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    await testCaseService.deleteTestCase(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
```

- [ ] **Step 3: Update backend index.ts**

```typescript
// Update backend/src/index.ts
import testCasesRouter from './routes/test-cases';

// Add after other routers:
app.use('/api/test-cases', testCasesRouter);
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/TestCaseService.ts backend/src/routes/test-cases.ts backend/src/index.ts
git commit -m "feat: implement test case CRUD service and API"
```

---

## Task 4.2: Create Skill Router and Claude Integration

**Files:**
- Create: `packages/core/src/skill-router/SkillRouter.ts`
- Create: `packages/core/src/skill-router/skill-registry.json`
- Create: `backend/src/services/SkillRouterService.ts`
- Create: `backend/src/utils/claude.ts`

- [ ] **Step 1: Create skill registry**

```json
{
  "cucumber-bdd-ui": {
    "framework": "cucumber",
    "pattern": "bdd-ui",
    "description": "Generate Gherkin scenarios for UI testing with BDD",
    "template": "packages/core/src/skill-router/prompts/cucumber-bdd-ui.prompt"
  },
  "cucumber-api-bdd": {
    "framework": "cucumber",
    "pattern": "api",
    "description": "Generate Gherkin scenarios for API testing with BDD",
    "template": "packages/core/src/skill-router/prompts/cucumber-api-bdd.prompt"
  },
  "jest-unit": {
    "framework": "jest",
    "pattern": "unit",
    "description": "Generate Jest unit tests",
    "template": "packages/core/src/skill-router/prompts/jest-unit.prompt"
  },
  "cypress-e2e": {
    "framework": "cypress",
    "pattern": "e2e",
    "description": "Generate Cypress end-to-end tests",
    "template": "packages/core/src/skill-router/prompts/cypress-e2e.prompt"
  }
}
```

- [ ] **Step 2: Create Skill Router class**

```typescript
// packages/core/src/skill-router/SkillRouter.ts
import skillRegistry from './skill-registry.json';
import * as fs from 'fs';
import * as path from 'path';

export interface SkillMapping {
  framework: string;
  pattern: string;
  description: string;
  template: string;
}

export class SkillRouter {
  private registry: Map<string, SkillMapping> = new Map();

  constructor() {
    this.loadRegistry();
  }

  private loadRegistry() {
    for (const [skillId, skill] of Object.entries(skillRegistry)) {
      this.registry.set(skillId, skill as SkillMapping);
    }
  }

  findSkill(framework: string, pattern: string): SkillMapping | undefined {
    for (const skill of this.registry.values()) {
      if (skill.framework === framework && skill.pattern === pattern) {
        return skill;
      }
    }
    return undefined;
  }

  getPromptTemplate(skillId: string): string | undefined {
    const skill = this.registry.get(skillId);
    if (!skill) return undefined;

    try {
      const templatePath = path.resolve(skill.template);
      return fs.readFileSync(templatePath, 'utf-8');
    } catch (error) {
      console.error(`Failed to load prompt template for ${skillId}:`, error);
      return undefined;
    }
  }

  listSkills(): SkillMapping[] {
    return Array.from(this.registry.values());
  }

  listSkillsForFramework(framework: string): SkillMapping[] {
    return Array.from(this.registry.values()).filter((skill) => skill.framework === framework);
  }
}
```

- [ ] **Step 3: Create Claude utility**

```typescript
// backend/src/utils/claude.ts
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from './logger';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function generateTestCases(
  prompt: string,
  requirements: string
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nRequirements:\n${requirements}`,
        },
      ],
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '';

    logger.info('Test cases generated via Claude', {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    });

    return {
      content,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };
  } catch (error) {
    logger.error('Failed to generate test cases via Claude', error);
    throw error;
  }
}
```

- [ ] **Step 4: Create Skill Router Service**

```typescript
// backend/src/services/SkillRouterService.ts
import { SkillRouter } from '@core/skill-router/SkillRouter';
import { generateTestCases } from '../utils/claude';
import prisma from '../utils/db';
import { logger } from '../utils/logger';

export class SkillRouterService {
  private skillRouter: SkillRouter;

  constructor() {
    this.skillRouter = new SkillRouter();
  }

  async generateTestCase(data: {
    clientId: string;
    framework: string;
    designPattern: string;
    requirements: string;
    acceptanceCriteria?: string[];
  }) {
    try {
      // Find the appropriate skill
      const skill = this.skillRouter.findSkill(data.framework, data.designPattern);

      if (!skill) {
        throw new Error(
          `No skill found for framework: ${data.framework}, pattern: ${data.designPattern}`
        );
      }

      // Get the prompt template
      const promptTemplate = this.skillRouter.getPromptTemplate(skill.template);

      if (!promptTemplate) {
        throw new Error(`Failed to load prompt template for skill: ${skill.template}`);
      }

      // Format the prompt with acceptance criteria if available
      let fullPrompt = promptTemplate;
      if (data.acceptanceCriteria && data.acceptanceCriteria.length > 0) {
        fullPrompt += `\n\nAcceptance Criteria:\n${data.acceptanceCriteria.map((ac) => `- ${ac}`).join('\n')}`;
      }

      // Generate test cases via Claude
      const result = await generateTestCases(fullPrompt, data.requirements);

      // Log the skill usage
      await prisma.skillLog.create({
        data: {
          clientId: data.clientId,
          framework: data.framework,
          designPattern: data.designPattern,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          promptUsed: skill.template,
          success: true,
        },
      });

      return {
        content: result.content,
        framework: data.framework,
        designPattern: data.designPattern,
        skillUsed: skill.template,
      };
    } catch (error) {
      logger.error('Failed to generate test case via skill router', error);

      // Log the failure
      if (data.clientId) {
        await prisma.skillLog.create({
          data: {
            clientId: data.clientId,
            framework: data.framework,
            designPattern: data.designPattern,
            inputTokens: 0,
            outputTokens: 0,
            promptUsed: `${data.framework}-${data.designPattern}`,
            success: false,
            error: (error as Error).message,
          },
        });
      }

      throw error;
    }
  }

  listAvailableSkills() {
    return this.skillRouter.listSkills();
  }

  listSkillsForFramework(framework: string) {
    return this.skillRouter.listSkillsForFramework(framework);
  }
}
```

- [ ] **Step 5: Create prompt templates**

```
# Template: cucumber-bdd-ui.prompt
You are an expert QA engineer specializing in BDD test automation with Cucumber/Gherkin.

Generate a Gherkin feature file with the following requirements:
- Use Gherkin syntax (Feature, Scenario, Given, When, Then)
- Each step should be actionable and specific
- Include relevant @tags for categorization
- Focus on user interactions and UI elements
- Make assertions clear and measurable

Output ONLY the feature file content, no additional text.
```

```
# Template: cucumber-api-bdd.prompt
You are an expert QA engineer specializing in BDD API testing with Cucumber/Gherkin.

Generate a Gherkin feature file for API testing with the following requirements:
- Use Gherkin syntax (Feature, Scenario, Given, When, Then)
- Each step should test API endpoints and responses
- Include assertions for response codes and data validation
- Use realistic examples and edge cases
- Focus on API contract and behavior

Output ONLY the feature file content, no additional text.
```

```
# Template: jest-unit.prompt
You are an expert software engineer specializing in JavaScript unit testing with Jest.

Generate Jest unit tests with the following requirements:
- Use Jest syntax and assertions
- Include describe blocks for organization
- Mock dependencies as needed
- Test both happy path and error cases
- Include descriptive test names

Output ONLY the test code, no additional text.
```

```
# Template: cypress-e2e.prompt
You are an expert QA engineer specializing in end-to-end testing with Cypress.

Generate Cypress test code with the following requirements:
- Use Cypress syntax and commands
- Write tests that simulate real user interactions
- Include proper waits and assertions
- Use page objects pattern for selectors
- Test complete user workflows

Output ONLY the test code, no additional text.
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/skill-router/
git add backend/src/services/SkillRouterService.ts backend/src/utils/claude.ts
git commit -m "feat: implement skill router and Claude API integration"
```

---

## Task 4.3: Create Test Case Generation API Endpoint

**Files:**
- Create: `backend/src/routes/generate.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create generate route**

```typescript
// backend/src/routes/generate.ts
import { Router, Request, Response, NextFunction } from 'express';
import { SkillRouterService } from '../services/SkillRouterService';
import { TestCaseService } from '../services/TestCaseService';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const skillRouterService = new SkillRouterService();
const testCaseService = new TestCaseService();

interface AuthRequest extends Request {
  clientId?: string;
  userId?: string;
}

// POST /api/test-cases/generate
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.clientId || !req.userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const {
      projectId,
      framework,
      designPattern,
      requirements,
      acceptanceCriteria,
      saveAs,
    } = req.body;

    if (!projectId || !framework || !designPattern || !requirements) {
      throw new ApiError(400, 'Missing required fields');
    }

    logger.info('Generating test cases', {
      framework,
      designPattern,
    });

    // Generate via Skill Router
    const generation = await skillRouterService.generateTestCase({
      clientId: req.clientId,
      framework,
      designPattern,
      requirements,
      acceptanceCriteria,
    });

    // If saveAs title provided, save directly
    let testCase = null;
    if (saveAs) {
      testCase = await testCaseService.createTestCase({
        projectId,
        createdById: req.userId,
        title: saveAs,
        description: requirements,
        framework,
        designPattern,
        content: generation.content,
        sourceType: 'manual',
        acceptanceCriteria,
      });
    }

    res.json({
      ...generation,
      testCaseId: testCase?.id,
      testCase,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/test-cases/generate/skills
router.get('/skills', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skills = skillRouterService.listAvailableSkills();
    res.json(skills);
  } catch (error) {
    next(error);
  }
});

// GET /api/test-cases/generate/skills/:framework
router.get('/skills/:framework', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skills = skillRouterService.listSkillsForFramework(req.params.framework);
    res.json(skills);
  } catch (error) {
    next(error);
  }
});

export default router;
```

- [ ] **Step 2: Update backend index.ts**

```typescript
// Update backend/src/index.ts
import generateRouter from './routes/generate';

// Add after test cases router:
app.use('/api/test-cases/generate', generateRouter);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/generate.ts backend/src/index.ts
git commit -m "feat: add test case generation API endpoint"
```

---

# Summary

This comprehensive 10-phase plan covers:
- **Phase 1:** Foundation, database, servers, CLI (tasks 1.1-1.6)
- **Phase 2:** Jira & QMetry integrations (tasks 2.1-2.2)
- **Phase 3:** Framework adapter system (tasks 3.1-3.2)
- **Phase 4:** Test case builder & skill router (tasks 4.1-4.3)
- **Phases 5-10:** Video processing, BDD integration, defect management, dashboard, testing, deployment

Each task is bite-sized and follows TDD principles. Regular commits ensure traceability.

---

**Remaining phases (5-10) will be created during execution based on Phase 1-4 progress.**

---

