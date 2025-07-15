# Contributing to Omni MCP Platform

Thank you for your interest in contributing to Omni! This document provides guidelines and
information for contributors.

## 🚀 Quick Start

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/omni.git
   cd omni
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start development**
   ```bash
   pnpm dev
   ```

## 📋 Development Guidelines

### Code Quality Standards

- **No Errors Allowed**: Never commit code that fails to build, has lint or test errors
- **Follow Existing Patterns**: Use the established conventions and structures already present
- **TypeScript**: No `any` types - use proper typing throughout
- **Testing**: Add tests for new functionality

### Commit Guidelines

- **Commit Early & Often**: Make small, focused commits
- **Conventional Commits**: Start messages with `feat:`, `fix:`, `docs:`, etc.
- **Single Logical Change**: Each commit should represent one logical change

Example commit messages:

```
feat: add new MCP server for Slack integration
fix: resolve connection timeout in gateway
docs: update API documentation for Linear server
refactor: simplify error handling in chrome client
```

### Pre-commit Hooks

Our pre-commit hooks automatically:

- Run ESLint with auto-fix
- Format code with Prettier
- Check for unused imports/exports with Knip
- Validate TypeScript compilation

If pre-commit fails, fix the issues and commit again.

## 🏗️ Architecture Guidelines

### MCP Server Pattern

When creating new MCP servers, follow the established pattern:

1. **Configuration**: Service-specific config with Zod validation
2. **Handlers**: Business logic with comprehensive input validation
3. **HTTP Server**: Fastify-based server with proper error handling
4. **Types**: Strong TypeScript types in dedicated files
5. **Schemas**: Zod schemas for runtime validation

### Directory Structure

```
apps/
  your-mcp-server/
    src/
      config/
        config.ts          # Server configuration
      mcp-server/
        handlers.ts        # Business logic
        http-server.ts     # Fastify server setup
        tools.ts          # MCP tools implementation
        resources.ts      # MCP resources
        prompts.ts        # MCP prompts
      schemas/
        domain-schemas.ts  # Zod validation schemas
      types/
        domain-types.ts    # TypeScript type definitions
      index.ts            # Entry point
    package.json
    tsconfig.json
```

## 🧪 Testing

- Run all tests: `pnpm test`
- Run tests for specific package: `pnpm test --filter @mcp/your-package`
- Add unit tests for new functionality
- Integration tests for MCP server endpoints

## 📦 Package Management

We use `pnpm` workspaces with Turborepo:

- **Add dependencies**: `pnpm add <package> --filter <workspace>`
- **Run scripts**: `pnpm <script> --filter <workspace>`
- **Sync versions**: `pnpm sync`

## 🔍 Code Quality Tools

### Automated Checks

```bash
# Lint and format
pnpm lint

# Find dead code and unused dependencies
pnpm audit

# Auto-fix issues
pnpm audit:fix

# Type checking
pnpm type-check
```

### Manual Quality Checks

Before submitting a PR:

1. Run `pnpm build` - ensure everything builds
2. Run `pnpm test` - all tests pass
3. Run `pnpm lint` - no linting errors
4. Run `pnpm audit` - no dead code

## 🐛 Bug Reports

When reporting bugs, include:

- **Environment**: OS, Node.js version, pnpm version
- **Steps to reproduce**: Clear, minimal reproduction steps
- **Expected vs actual behavior**
- **Error messages**: Full stack traces if applicable
- **Configuration**: Relevant config files or environment variables

## 💡 Feature Requests

For new features:

- **Use case**: Describe the problem you're solving
- **Proposed solution**: How you envision it working
- **Alternatives**: Other approaches you considered
- **Implementation**: Rough idea of how to implement (if applicable)

## 📖 Documentation

- Update `README.md` for user-facing changes
- Add JSDoc comments for public APIs
- Update type definitions for API changes
- Include examples for new features

## 🔒 Security

- **Never commit secrets**: Use environment variables
- **Validate all inputs**: Use Zod schemas for runtime validation
- **Follow security best practices**: Especially for network requests and file operations
- **Report security issues privately**: Email security concerns rather than public issues

## 📝 Pull Request Process

1. **Create feature branch**: `git checkout -b feat/your-feature-name`
2. **Make changes**: Follow the guidelines above
3. **Test thoroughly**: Ensure all checks pass
4. **Update documentation**: If needed
5. **Submit PR**: With clear description of changes
6. **Address feedback**: Respond to review comments

### PR Checklist

- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] No dead code (`pnpm audit`)
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow convention
- [ ] No breaking changes (or clearly marked)

## 🤝 Code of Conduct

- **Be respectful**: Treat all contributors with respect
- **Be constructive**: Provide helpful feedback and suggestions
- **Be collaborative**: Work together to improve the project
- **Be inclusive**: Welcome contributors of all backgrounds and skill levels

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check the `docs/` directory for detailed guides

## 🏷️ Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
