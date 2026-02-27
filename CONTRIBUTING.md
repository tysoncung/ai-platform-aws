# Contributing to AI Platform AWS

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

1. **Prerequisites:** Node.js 22+, pnpm 9+, Docker
2. **Clone and install:**
   ```bash
   git clone https://github.com/tysoncung/ai-platform-aws.git
   cd ai-platform-aws
   pnpm install
   ```
3. **Start local services:**
   ```bash
   docker-compose up -d redis mongodb
   cp .env.example .env
   pnpm dev
   ```

## Project Structure

- `packages/gateway` — Fastify AI Gateway service
- `packages/sdk` — TypeScript client SDK
- `packages/rag` — RAG pipeline utilities
- `infra` — AWS CDK deployment

## Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run checks: `pnpm typecheck && pnpm build`
5. Commit with a clear message
6. Open a Pull Request

## Code Style

- TypeScript strict mode
- Use explicit types (avoid `any`)
- Follow existing patterns in the codebase

## Adding a New Provider

1. Create `packages/gateway/src/providers/your-provider.ts`
2. Implement the `AIProvider` interface
3. Register it in `registry.ts`
4. Add model configs to `config.ts`
5. Update documentation

## Reporting Issues

Use GitHub Issues. Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
