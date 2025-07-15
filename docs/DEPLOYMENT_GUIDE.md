# Deployment Guide - Dwell Birthday Calendar

## Overview

This guide covers the complete deployment process for the Dwell Birthday Calendar, from initial setup to production deployment and ongoing maintenance.

## Prerequisites

### Required Accounts

1. **Cloudflare Account**: For Workers and KV storage
2. **Slack Account**: With admin privileges to create apps
3. **Domain**: For custom routing (optional but recommended)

### Required Tools

- **Node.js**: Version 18 or higher
- **npm**: Package manager
- **Wrangler CLI**: Cloudflare Workers deployment tool
- **Git**: Version control

### Installation

```bash
# Install Node.js dependencies
npm install

# Install Wrangler CLI globally
npm install -g wrangler

# Verify installation
wrangler --version
```

## Initial Setup

### 1. Cloudflare Configuration

#### Create KV Namespace

```bash
# Create KV namespace for birthday data
wrangler kv:namespace create "BIRTHDAY_KV"

# Create KV namespace for development
wrangler kv:namespace create "BIRTHDAY_KV" --preview
```

#### Update wrangler.toml

Update the KV namespace IDs in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "BIRTHDAY_KV"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

### 2. Slack App Configuration

#### Create Slack App

1. Go to [api.slack.com](https://api.slack.com)
2. Click "Create New App"
3. Choose "From scratch"
4. Enter app name: "Dwell Birthday Calendar"
5. Select your workspace

#### Configure App Settings

**OAuth & Permissions**:
- Add redirect URL: `https://your-domain.com/oauth/redirect`
- Add bot token scopes:
  - `app_mentions:read`
  - `chat:write`
  - `commands`
  - `im:history`
  - `im:read`
  - `im:write`

**Slash Commands**:
- Create command: `/birthdays`
- Request URL: `https://your-domain.com/slack/commands`
- Description: "Show upcoming birthdays"

**Event Subscriptions**:
- Enable events: Yes
- Request URL: `https://your-domain.com/slack/events`
- Subscribe to workspace events:
  - `app_home_opened`

**App Home**:
- Enable Home Tab: Yes
- Enable Messages Tab: No

### 3. Environment Variables

Set required environment variables:

```bash
# Slack configuration
wrangler secret put SLACK_SIGNING_SECRET
wrangler secret put SLACK_CLIENT_ID
wrangler secret put SLACK_CLIENT_SECRET

# Admin configuration
wrangler secret put ADMIN_PASSWORD
```

### 4. Domain Setup (Optional)

#### Custom Domain

If using a custom domain:

```bash
# Add custom domain
wrangler route add "birthday.yourdomain.com/*" your-zone-id
```

Update `wrangler.toml`:

```toml
[env.production]
routes = [
  { pattern = "birthday.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

## Development Deployment

### Local Development

```bash
# Start local development server
npm run dev

# Test with ngrok for Slack webhook testing
ngrok http 8787
```

### Development Environment

```bash
# Deploy to development environment
wrangler deploy --env development

# Test deployment
curl https://your-dev-domain.com/health
```

### Development Testing

1. **Update Slack app URLs** to point to development environment
2. **Test slash command**: `/birthdays`
3. **Test home tab**: Open app home in Slack
4. **Test admin panel**: Access `/admin` with credentials
5. **Test OAuth flow**: Reinstall app if needed

## Production Deployment

### Pre-Deployment Checklist

- [ ] All tests passing: `npm test`
- [ ] TypeScript compilation: `npm run build`
- [ ] Linting passed: `npm run lint`
- [ ] Environment variables set
- [ ] KV namespaces created
- [ ] Slack app configured
- [ ] Domain configured (if applicable)

### Deployment Steps

```bash
# Build the project
npm run build

# Deploy to production
wrangler deploy --env production

# Verify deployment
curl https://your-production-domain.com/health
```

### Post-Deployment Verification

1. **Health Check**: Verify `/health` endpoint responds
2. **Slack Integration**: Test slash command and home tab
3. **Admin Panel**: Test admin interface at `/admin`
4. **OAuth Flow**: Test app installation
5. **Scheduled Tasks**: Verify cron triggers are active

## Environment Configuration

### Development Environment

```toml
[env.development]
name = "dwell-birthday-calendar-dev"
routes = [
  { pattern = "dev-birthday.yourdomain.com/*", zone_name = "yourdomain.com" }
]

[[env.development.kv_namespaces]]
binding = "BIRTHDAY_KV"
id = "dev-kv-namespace-id"
preview_id = "dev-preview-kv-namespace-id"

[env.development.triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes for testing
```

### Production Environment

```toml
[env.production]
name = "dwell-birthday-calendar-prod"
routes = [
  { pattern = "birthday.yourdomain.com/*", zone_name = "yourdomain.com" }
]

[[env.production.kv_namespaces]]
binding = "BIRTHDAY_KV"
id = "prod-kv-namespace-id"

[env.production.triggers]
crons = [
  "0 8 * * *",     # Daily cache refresh
  "0 9-17 * * 1-5", # Hourly cache warming
  "0 0 1 * *"      # Monthly maintenance
]
```

## Security Configuration

### Environment Variables

Ensure all secrets are properly set:

```bash
# Check current secrets
wrangler secret list

# Update secrets if needed
wrangler secret put SLACK_SIGNING_SECRET
wrangler secret put ADMIN_PASSWORD
```

### Security Best Practices

1. **Strong admin password**: Minimum 12 characters
2. **HTTPS only**: All traffic encrypted
3. **Regular secret rotation**: Update every 90 days
4. **Access logging**: Monitor admin access
5. **Webhook verification**: Slack signature validation

## Monitoring and Logging

### Log Monitoring

```bash
# View real-time logs
wrangler tail --env production

# View formatted logs
wrangler tail --format=pretty --env production

# Filter logs by service
wrangler tail --grep "ERROR" --env production
```

### Performance Monitoring

Monitor key metrics:
- **Response times**: Average < 500ms
- **Error rates**: < 1% error rate
- **Cache hit ratios**: > 80% hit rate
- **Scheduled task success**: > 99% success rate

### Alerting

Set up alerts for:
- **High error rates**: > 5% error rate
- **Slow responses**: > 2 second response time
- **Failed deployments**: Any deployment failures
- **Scheduled task failures**: Cron job failures

## Backup and Recovery

### Data Backup

```bash
# Export birthday data
wrangler kv:key get "birthdays:data" --env production > backup-$(date +%Y%m%d).json

# Export installation data
wrangler kv:key get "installations" --env production > installations-backup-$(date +%Y%m%d).json
```

### Recovery Process

```bash
# Restore birthday data
wrangler kv:key put "birthdays:data" --path backup-20240115.json --env production

# Restore installation data
wrangler kv:key put "installations" --path installations-backup-20240115.json --env production
```

### Automated Backups

Consider setting up automated backups:

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
wrangler kv:key get "birthdays:data" --env production > "backups/birthday-data-$DATE.json"
wrangler kv:key get "installations" --env production > "backups/installations-$DATE.json"
```

## Maintenance

### Regular Tasks

#### Daily
- [ ] Check error logs
- [ ] Monitor performance metrics
- [ ] Verify scheduled tasks ran

#### Weekly
- [ ] Review cache performance
- [ ] Check Slack app health
- [ ] Verify admin panel functionality

#### Monthly
- [ ] Backup data manually
- [ ] Review access logs
- [ ] Update dependencies if needed
- [ ] Test disaster recovery

### Updates and Patches

#### Code Updates

```bash
# Update dependencies
npm update

# Run tests
npm test

# Deploy update
wrangler deploy --env production
```

#### Configuration Updates

```bash
# Update environment variables
wrangler secret put VARIABLE_NAME

# Update wrangler.toml
# Edit file and redeploy
wrangler deploy --env production
```

## Troubleshooting Deployment

### Common Issues

#### "Wrangler not found"
```bash
# Install wrangler globally
npm install -g wrangler

# Or use npx
npx wrangler deploy
```

#### "KV namespace not found"
```bash
# Create KV namespace
wrangler kv:namespace create "BIRTHDAY_KV"

# Update wrangler.toml with correct ID
```

#### "Slack verification failed"
```bash
# Check signing secret
wrangler secret put SLACK_SIGNING_SECRET

# Verify webhook URL in Slack app settings
```

#### "Domain not resolving"
```bash
# Check DNS settings
nslookup your-domain.com

# Verify route configuration
wrangler route list
```

### Debugging Steps

1. **Check logs**: `wrangler tail --env production`
2. **Test endpoints**: Use curl or Postman
3. **Verify environment**: Check all secrets are set
4. **Test locally**: Use `npm run dev`
5. **Check Slack logs**: Review Slack app event logs

## Scaling Considerations

### Performance Optimization

For larger deployments:

1. **Increase cache TTL**: Reduce API calls
2. **Batch operations**: Process multiple requests together
3. **Optimize data structure**: Minimize JSON size
4. **Add pagination**: For large birthday lists

### Resource Limits

Monitor against Cloudflare limits:
- **CPU time**: 10ms per request (free tier)
- **Memory**: 128MB per request
- **KV operations**: 1000 per day (free tier)
- **Requests**: 100,000 per day (free tier)

## Disaster Recovery

### Recovery Plan

1. **Assess damage**: Determine what needs recovery
2. **Restore from backup**: Use latest backup data
3. **Redeploy application**: Deploy known good version
4. **Test functionality**: Verify all features work
5. **Monitor closely**: Watch for recurring issues

### Recovery Testing

Regularly test recovery procedures:

```bash
# Test backup restoration
wrangler kv:key put "birthdays:data" --path test-backup.json --env development

# Test deployment rollback
wrangler rollback --env production
```

## Support and Maintenance

### Getting Help

1. **Check logs first**: `wrangler tail`
2. **Review documentation**: This guide and others
3. **Test in development**: Reproduce issues safely
4. **Contact support**: If issues persist

### Maintenance Schedule

- **Daily**: Log monitoring
- **Weekly**: Health checks
- **Monthly**: Full backup and testing
- **Quarterly**: Security review and updates

---

*This guide covers deployment and operations for the Dwell Birthday Calendar. For usage instructions, see the [User Guide](USER_GUIDE.md) and [Admin Guide](ADMIN_GUIDE.md).*