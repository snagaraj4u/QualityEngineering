# Quality Engineering Platform

Multi-framework AI-powered Quality Engineering Platform built as a monorepo.

## Project Structure

```
.
├── apps/
│   ├── web/          # React web application
│   └── cli/          # Command-line interface
├── packages/
│   ├── core/         # Core business logic
│   └── database/     # Database abstraction layer
├── backend/          # Backend services
└── docs/             # Documentation
```

## Workspace Setup

This is a monorepo using npm workspaces. All packages are managed from the root.

## Getting Started

1. Install dependencies: `npm install`
2. Build packages: `npm run build`
3. Run development servers: `npm run dev`

## Development

- **Web App**: `cd apps/web && npm run dev`
- **CLI**: `cd apps/cli && npm run dev`
- **Backend**: `cd backend && npm run dev`

## Architecture

- **Multi-framework**: React for web, Node.js for CLI and backend
- **Type-safe**: Full TypeScript support across all packages
- **Modular**: Shared packages for core logic and database abstraction
- **AI-powered**: Integration with AI models for quality engineering tasks

## License

MIT
