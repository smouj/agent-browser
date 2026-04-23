# Contributing to AgentBrowser

First, thank you for considering contributing to AgentBrowser! This project relies on community support to grow and improve.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/agent-browser.git
   cd agent-browser
   ```
3. **Install** dependencies:
   ```bash
   bun install
   ```
4. **Set up** the database:
   ```bash
   cp .env.example .env
   bun run db:push
   ```
5. **Install** Playwright browsers:
   ```bash
   npx playwright install chromium
   ```
6. **Start** the development server:
   ```bash
   bun run dev
   ```

## Development Guidelines

### Code Style
- Use **TypeScript** for all new files
- Follow the existing patterns in `src/lib/browser/`
- Use `@/` path aliases for imports
- Run `bun run lint` before committing

### Commit Messages
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Keep commits atomic and self-explanatory

### Pull Request Process
1. Create a feature branch from `main`
2. Make your changes with clear, descriptive commit messages
3. Test your changes thoroughly
4. Open a PR with a clear description of what changed and why
5. Respond to review feedback promptly

### Adding New Browser Actions
1. Add the action handler in `src/lib/browser/actions.ts`
2. Update the type definitions in `src/lib/browser/types.ts`
3. Add UI support in `src/app/page.tsx` if applicable
4. Update the API documentation in `README.md`

### Reporting Bugs
- Use GitHub Issues with a clear description
- Include steps to reproduce
- Share relevant logs or screenshots
- Specify your OS, Node.js version, and browser type

## Project Structure
```
src/
  lib/browser/     # Core engine, sessions, vision, actions
  app/api/browser/ # REST API routes
  app/page.tsx     # Dashboard UI
mini-services/     # WebSocket and other services
prisma/            # Database schema
```

## License
By contributing, you agree that your contributions will be licensed under the MIT License.
