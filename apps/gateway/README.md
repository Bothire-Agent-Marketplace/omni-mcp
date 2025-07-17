# MCP Gateway

## Local Development Testing

### API Key Requirement

The gateway **always requires an API key** for security. This ensures consistent authentication patterns between development and production.

**Development API Key:**
For local testing, use the well-known development API key:
```
dev-api-key-12345
```

**Example Usage:**
```bash
# Test with development API key
curl -X POST http://localhost:37373/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-api-key-12345" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "prompts/list", "params": {}}'

# Alternative: Use Authorization header
curl -X POST http://localhost:37373/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-api-key-12345" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
```

### Organization Context

Organization context is automatically extracted from:
1. **API keys** (linked to organizations in database)
2. **Clerk JWT tokens** (containing org_id)
3. **Session tokens** (existing gateway sessions)

If no organization context is found, requests will fail with authentication errors.

## Production Configuration

### Required Environment Variables

```bash
# Production API key (required)
MCP_API_KEY=your-secure-production-api-key

# JWT secret for session management
JWT_SECRET=your-jwt-secret

# Other optional configuration
GATEWAY_PORT=37373
GATEWAY_HOST=0.0.0.0
ALLOWED_ORIGINS=https://your-domain.com
```

### Security Features

- **Always requires API key** - No bypass logic
- **Production validation** - Prevents development keys in production
- **Organization context** - Automatic extraction from authenticated requests
- **Rate limiting** - Enabled in production
- **Security headers** - Enabled in production
- **CORS protection** - Configurable origins

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| API Key | `dev-api-key-12345` (fallback) | Environment variable required |
| Rate Limiting | Disabled | Enabled |
| Security Headers | Disabled | Enabled |
| CORS | Permissive | Strict |
| Logging | Debug level | Info level |

## Security Benefits

✅ **No bypass logic** - Same authentication everywhere  
✅ **No NODE_ENV spoofing** - Security doesn't depend on environment variables  
✅ **Simple codebase** - Single authentication path  
✅ **Better habits** - Developers learn proper auth patterns  
✅ **Consistent testing** - Local tests mirror production behavior 