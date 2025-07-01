# Production Deployment Guide

This guide covers securing your MCP gateway application and deploying it to Vercel with proper environment separation.

## 🔒 Security Features Implemented

### 1. **API Key Authentication**

- Required in production mode
- Supports multiple authentication methods:
  - `Authorization: Bearer <api-key>` header
  - `x-api-key: <api-key>` header
  - Query parameter (development only)

### 2. **Rate Limiting**

- Configurable requests per minute
- IP-based or API key-based limiting
- Automatic retry-after headers
- Logging of rate limit violations

### 3. **Input Validation**

- JSON-RPC 2.0 validation
- MCP protocol compliance checks
- Request size limits
- Content type validation

### 4. **Security Headers**

- HSTS (HTTP Strict Transport Security)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection
- Content Security Policy
- Referrer Policy

### 5. **CORS Configuration**

- Configurable allowed origins
- Credential support control
- Method and header restrictions

### 6. **Logging & Monitoring**

- Structured security logs
- Request/response tracking
- Authentication attempt logging
- Performance metrics

## 🏗️ Environment Separation

### Development Environment

```bash
NODE_ENV=development
REQUIRE_API_KEY=false
ENABLE_RATE_LIMITING=false
MAX_REQUEST_SIZE=10mb
API_RATE_LIMIT=1000
LOG_LEVEL=debug
```

### Production Environment

```bash
NODE_ENV=production
REQUIRE_API_KEY=true
ENABLE_RATE_LIMITING=true
MAX_REQUEST_SIZE=1mb
API_RATE_LIMIT=100
LOG_LEVEL=info
```

## 🚀 Vercel Deployment Steps

### 1. Prerequisites

1. **Install Vercel CLI**

   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Generate Production Secrets**

   ```bash
   # Generate a secure JWT secret (32+ characters)
   openssl rand -base64 32

   # Generate a secure MCP API key
   echo "mcp_$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
   ```

3. **Prepare Database**
   - Set up production PostgreSQL (recommend: Vercel Postgres, PlanetScale, or Supabase)
   - Note the DATABASE_URL connection string
   - Ensure SSL is enabled

### 2. Configure Environment Variables

Set these in Vercel Dashboard or via CLI:

```bash
# Required Security Variables
vercel env add JWT_SECRET production
# Enter: your-generated-jwt-secret

vercel env add MCP_API_KEY production
# Enter: mcp_your-generated-api-key

vercel env add LINEAR_API_KEY production
# Enter: your-linear-api-key

vercel env add DATABASE_URL production
# Enter: postgresql://user:pass@host:port/db?sslmode=require

# MCP Server URLs (deploy these first)
vercel env add LINEAR_SERVER_URL production
# Enter: https://your-linear-mcp.vercel.app

vercel env add QUERYQUILL_SERVER_URL production
# Enter: https://your-queryquill-mcp.vercel.app

# Security Configuration
vercel env add ALLOWED_ORIGINS production
# Enter: https://your-frontend.vercel.app,https://your-admin.com

vercel env add API_RATE_LIMIT production
# Enter: 100

vercel env add SESSION_TIMEOUT production
# Enter: 3600000

vercel env add MAX_CONCURRENT_SESSIONS production
# Enter: 500
```

### 3. Deploy to Vercel

```bash
# Build and test locally first
pnpm build
pnpm start

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 4. Verify Deployment

```bash
# Test health endpoint (no auth required)
curl https://your-deployment.vercel.app/health

# Test MCP endpoint (requires API key)
curl -H "x-api-key: your-api-key" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
     https://your-deployment.vercel.app/mcp
```

## 🔧 Configuration Options

### Security Configuration

| Variable               | Development | Production | Description                   |
| ---------------------- | ----------- | ---------- | ----------------------------- |
| `REQUIRE_API_KEY`      | `false`     | `true`     | Enable API key authentication |
| `ENABLE_RATE_LIMITING` | `false`     | `true`     | Enable request rate limiting  |
| `API_RATE_LIMIT`       | `1000`      | `100`      | Requests per minute limit     |
| `MAX_REQUEST_SIZE`     | `10mb`      | `1mb`      | Maximum request body size     |
| `CORS_CREDENTIALS`     | `true`      | `false`    | Allow credentials in CORS     |

### Server Configuration

| Variable                | Required | Description                     |
| ----------------------- | -------- | ------------------------------- |
| `LINEAR_SERVER_URL`     | Yes      | URL of Linear MCP server        |
| `QUERYQUILL_SERVER_URL` | Yes      | URL of Query-Quill MCP server   |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string    |
| `ALLOWED_ORIGINS`       | Yes      | Comma-separated allowed origins |

## 🛡️ Security Best Practices

### 1. **Secret Management**

- Use strong, randomly generated secrets
- Never commit secrets to git
- Rotate API keys regularly
- Use environment variables in Vercel

### 2. **Database Security**

- Always use SSL connections
- Use strong passwords
- Limit connection pool size
- Monitor database access logs

### 3. **Network Security**

- Restrict ALLOWED_ORIGINS to specific domains
- Use HTTPS everywhere
- Monitor for unusual traffic patterns
- Set appropriate rate limits

### 4. **API Security**

- Validate all inputs
- Log authentication attempts
- Monitor for brute force attacks
- Use proper error messages (don't leak info)

### 5. **Deployment Security**

- Use production environment variables
- Enable security headers
- Monitor deployment logs
- Set up alerts for errors

## 📊 Monitoring & Maintenance

### 1. **Vercel Analytics**

- Monitor function execution time
- Track error rates
- Monitor bandwidth usage
- Set up alerts for failures

### 2. **Application Logs**

- Security events (auth failures, rate limits)
- Performance metrics
- Error tracking
- Request patterns

### 3. **Database Monitoring**

- Connection pool usage
- Query performance
- Storage usage
- Security events

## 🚨 Troubleshooting

### Common Issues

1. **503 Service Unavailable**

   - Check environment variables are set
   - Verify database connectivity
   - Check function timeout limits

2. **401 Unauthorized**

   - Verify API key is correct
   - Check `REQUIRE_API_KEY` setting
   - Ensure proper header format

3. **429 Too Many Requests**

   - Check rate limit settings
   - Verify API key-based limiting
   - Monitor traffic patterns

4. **CORS Errors**
   - Verify `ALLOWED_ORIGINS` setting
   - Check request headers
   - Ensure OPTIONS handling

### Debug Commands

```bash
# Check environment variables
vercel env ls

# View function logs
vercel logs --follow

# Test specific endpoints
curl -v -H "x-api-key: $API_KEY" https://your-app.vercel.app/health
```

## 📝 Post-Deployment Checklist

- [ ] Health endpoint returns 200
- [ ] MCP endpoints require authentication
- [ ] Rate limiting is working
- [ ] Security headers are present
- [ ] CORS is properly configured
- [ ] Database connections are SSL
- [ ] Logs are being generated
- [ ] Error monitoring is set up
- [ ] Performance is acceptable
- [ ] All secrets are secure

## 🔄 Updates & Maintenance

### Regular Tasks

- Monitor security logs
- Update dependencies
- Rotate API keys quarterly
- Review access patterns
- Update rate limits as needed
- Monitor performance metrics

### Security Updates

- Keep dependencies updated
- Monitor security advisories
- Review and update CORS settings
- Audit API key usage
- Check for unusual patterns
