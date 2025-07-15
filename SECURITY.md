# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

The Omni MCP Platform team takes security bugs seriously. We appreciate your efforts to responsibly
disclose your findings, and will make every effort to acknowledge your contributions.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@your-domain.com**

You should receive a response within 48 hours. If for some reason you do not, please follow up via
email to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 5 business days
- **Progress Updates**: We will keep you informed of our progress throughout the investigation
- **Resolution**: We will notify you when the vulnerability has been fixed
- **Disclosure**: We will coordinate with you on the timing of public disclosure

### Security Update Process

1. **Investigation**: We investigate and validate the reported vulnerability
2. **Fix Development**: We develop and test a fix
3. **Security Advisory**: We prepare a security advisory
4. **Coordinated Disclosure**: We coordinate the release of the fix and advisory
5. **Public Disclosure**: We publicly disclose the vulnerability details after the fix is available

### Scope

This security policy applies to:

- All code in the main repository
- All MCP servers and packages
- The gateway and core infrastructure
- Dependencies and third-party integrations

### Out of Scope

The following are generally considered out of scope:

- Vulnerabilities in dependencies (please report to the respective maintainers)
- Social engineering attacks
- Physical attacks
- Denial of service attacks that require excessive resources
- Issues in third-party services we integrate with

### Recognition

We believe in recognizing security researchers who help us keep our users safe. With your
permission, we will:

- Acknowledge your contribution in our security advisory
- Include your name in our hall of fame (if you wish)
- Provide a reference letter for your responsible disclosure (upon request)

## Security Best Practices for Contributors

When contributing to Omni MCP Platform:

### Code Security

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Validate all user inputs using Zod schemas
- Sanitize data before logging or displaying
- Use TypeScript strict mode and avoid `any` types

### Dependencies

- Keep dependencies up to date
- Review dependency security advisories
- Use `pnpm audit` to check for known vulnerabilities
- Prefer well-maintained packages with good security records

### Network Security

- Use HTTPS for all external communications
- Validate SSL certificates
- Implement proper authentication and authorization
- Rate limit API endpoints appropriately

### Data Protection

- Encrypt sensitive data at rest and in transit
- Implement proper access controls
- Log security-relevant events
- Follow data minimization principles

## Vulnerability Disclosure Policy

We follow responsible disclosure practices:

1. **Private Disclosure**: Security vulnerabilities are first reported privately
2. **Investigation Period**: We investigate and develop fixes before public disclosure
3. **Coordinated Release**: We coordinate with reporters on disclosure timing
4. **Public Advisory**: We publish security advisories after fixes are available
5. **CVE Assignment**: We work with CVE coordinators for serious vulnerabilities

## Contact

For security-related questions or concerns:

- **Security Issues**: security@your-domain.com
- **General Security Questions**: Use GitHub Discussions with the "Security" tag
- **Security Documentation**: Check the `docs/` directory for security guides

---

Thank you for helping keep Omni MCP Platform and our users safe!
