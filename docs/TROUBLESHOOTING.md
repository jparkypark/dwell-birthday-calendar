# Troubleshooting Guide - Dwell Birthday Calendar

## Quick Reference

### Emergency Contacts
- **Technical Admin**: [Your technical contact]
- **Church Leadership**: [Your church contact]
- **Support Email**: [Your support email]

### Critical Commands
```bash
# Check service health
curl https://your-domain.com/health

# View logs
wrangler tail --env production

# Emergency rollback
wrangler rollback --env production
```

## Common Issues

### 1. Slack Integration Problems

#### Slash Command Not Working

**Symptoms:**
- `/birthdays` command doesn't respond
- Error message: "Command not found"
- Slow response or timeout

**Causes & Solutions:**

**Missing App Installation:**
```bash
# Check if app is installed
wrangler kv:key get "installations" --env production

# If empty, reinstall app via OAuth
```

**Incorrect Webhook URL:**
1. Go to Slack app settings
2. Check "Slash Commands" section
3. Verify URL: `https://your-domain.com/slack/commands`

**Signature Verification Failing:**
```bash
# Update signing secret
wrangler secret put SLACK_SIGNING_SECRET

# Check logs for verification errors
wrangler tail --grep "signature" --env production
```

#### Home Tab Not Loading

**Symptoms:**
- Blank home tab
- "Failed to load" message
- Outdated information

**Solutions:**

**Clear Cache:**
1. Access admin panel: `/admin`
2. Update any data (even trivial change)
3. Save to force cache refresh

**Check Event Subscriptions:**
1. Slack app settings → "Event Subscriptions"
2. Verify URL: `https://your-domain.com/slack/events`
3. Test endpoint manually

**Verify Permissions:**
1. Check "OAuth & Permissions"
2. Ensure bot token scopes include:
   - `app_mentions:read`
   - `chat:write`
   - `commands`

### 2. Admin Panel Issues

#### Cannot Access Admin Panel

**Symptoms:**
- 401 Unauthorized error
- Login prompt loops
- "Authentication failed" message

**Solutions:**

**Check Admin Password:**
```bash
# Update admin password
wrangler secret put ADMIN_PASSWORD

# Use strong password (8+ characters)
```

**Browser Issues:**
1. Clear browser cache and cookies
2. Try incognito/private browsing
3. Use different browser

**Network Problems:**
1. Check if accessing over HTTPS
2. Verify domain is resolving
3. Try from different network

#### JSON Validation Errors

**Symptoms:**
- "Invalid JSON" message
- "Validation failed" error
- Data not saving

**Solutions:**

**Common JSON Errors:**
```json
// ❌ Wrong - trailing comma
{
  "birthdays": [
    {"name": "John", "month": 1, "day": 15},
  ]
}

// ✅ Correct
{
  "birthdays": [
    {"name": "John", "month": 1, "day": 15}
  ]
}
```

**Validation Rules:**
- Names: Required, 1-100 characters
- Month: 1-12 (integer)
- Day: 1-31 (valid for month)
- Slack ID: Optional, format "U123456789"

**Use Built-in Tools:**
1. Click "Validate JSON" before saving
2. Use "Format JSON" for proper indentation
3. Check error messages for specific issues

### 3. Performance Issues

#### Slow Response Times

**Symptoms:**
- App takes > 3 seconds to load
- Slack shows "Loading..." for extended time
- Timeouts in logs

**Solutions:**

**Check Cache Status:**
1. Access admin panel
2. Look at "Cache Status" section
3. Note "Last Updated" time

**Monitor Scheduled Tasks:**
```bash
# Check cron trigger logs
wrangler tail --grep "scheduled" --env production

# Verify cron is running
wrangler cron trigger list --env production
```

**Optimize Data:**
1. Remove unused entries
2. Keep names concise
3. Limit to active members only

#### High Error Rates

**Symptoms:**
- Multiple failed requests
- Error messages in Slack
- Inconsistent behavior

**Solutions:**

**Check Error Logs:**
```bash
# View recent errors
wrangler tail --grep "ERROR" --env production

# Check specific error patterns
wrangler tail --grep "AppError" --env production
```

**Common Error Patterns:**
- `ValidationError`: Data format issues
- `AppError`: Application logic problems
- `ScheduledTaskError`: Cron job failures

### 4. Data Issues

#### Missing or Incorrect Birthdays

**Symptoms:**
- Person not showing in list
- Wrong birthday date
- Duplicate entries

**Solutions:**

**Check Data Format:**
1. Access admin panel
2. Review JSON structure
3. Verify all required fields

**Common Data Problems:**
```json
// ❌ Missing required fields
{"name": "John"}

// ❌ Invalid date
{"name": "John", "month": 13, "day": 32}

// ❌ Duplicate names (case-insensitive)
[
  {"name": "John Doe", "month": 1, "day": 15},
  {"name": "john doe", "month": 2, "day": 20}
]
```

**Fix Data Issues:**
1. Edit JSON in admin panel
2. Validate before saving
3. Clear cache after changes

#### Cache Not Updating

**Symptoms:**
- Old data still showing
- Changes not reflected
- Stale information

**Solutions:**

**Manual Cache Refresh:**
1. Make any change in admin panel
2. Save changes (this clears cache)
3. Wait 1-2 minutes for propagation

**Check Scheduled Tasks:**
```bash
# View cron job status
wrangler cron trigger get --env production

# Check for failed cache refresh
wrangler tail --grep "cache" --env production
```

### 5. Deployment Issues

#### Deployment Failures

**Symptoms:**
- `wrangler deploy` fails
- Build errors
- TypeScript compilation errors

**Solutions:**

**Check Build Process:**
```bash
# Run build locally
npm run build

# Check for TypeScript errors
npm run type-check

# Run linting
npm run lint
```

**Common Build Issues:**
- Missing dependencies: `npm install`
- TypeScript errors: Fix type issues
- Environment variables: Check all secrets set

**Deployment Troubleshooting:**
```bash
# Check wrangler status
wrangler auth whoami

# Verify configuration
wrangler whoami

# Force re-authentication
wrangler auth login
```

#### Environment Variable Issues

**Symptoms:**
- "Environment validation failed" error
- Missing configuration errors
- Authentication failures

**Solutions:**

**Check Required Variables:**
```bash
# List all secrets
wrangler secret list --env production

# Required secrets:
# - SLACK_SIGNING_SECRET
# - SLACK_CLIENT_ID
# - SLACK_CLIENT_SECRET
# - ADMIN_PASSWORD
```

**Update Missing Variables:**
```bash
# Set each required variable
wrangler secret put SLACK_SIGNING_SECRET --env production
wrangler secret put ADMIN_PASSWORD --env production
```

### 6. Scheduled Task Issues

#### Cron Jobs Not Running

**Symptoms:**
- Cache not refreshing automatically
- No scheduled task logs
- Performance degradation

**Solutions:**

**Check Cron Configuration:**
```bash
# List cron triggers
wrangler cron trigger list --env production

# View cron job logs
wrangler tail --grep "scheduled" --env production
```

**Verify Cron Settings:**
1. Check `wrangler.toml` for cron configuration
2. Ensure cron syntax is correct
3. Verify environment-specific settings

**Manual Trigger:**
```bash
# Test cron job manually
curl -X POST "https://your-domain.com/__scheduled?cron=0+8+*+*+*"
```

## Diagnostic Tools

### Health Check

```bash
# Basic health check
curl https://your-domain.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "url": "https://your-domain.com/health"
}
```

### Log Analysis

```bash
# View all logs
wrangler tail --env production

# Filter by error level
wrangler tail --grep "ERROR" --env production

# Filter by component
wrangler tail --grep "admin" --env production
wrangler tail --grep "slack" --env production
wrangler tail --grep "cache" --env production
```

### Data Inspection

```bash
# Check birthday data
wrangler kv:key get "birthdays:data" --env production

# Check installation data
wrangler kv:key get "installations" --env production

# Check cache data
wrangler kv:key get "cache:home_view" --env production
```

### Performance Testing

```bash
# Test response times
curl -w "@curl-format.txt" -o /dev/null https://your-domain.com/health

# Test Slack endpoints
curl -X POST https://your-domain.com/slack/commands \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "command=/birthdays"
```

## Recovery Procedures

### Emergency Recovery

**If the service is completely down:**

1. **Check service status:**
   ```bash
   wrangler tail --env production
   curl https://your-domain.com/health
   ```

2. **Rollback to previous version:**
   ```bash
   wrangler rollback --env production
   ```

3. **Restore from backup:**
   ```bash
   wrangler kv:key put "birthdays:data" --path backup.json --env production
   ```

### Data Recovery

**If data is corrupted:**

1. **Stop making changes** to prevent further damage
2. **Restore from backup:**
   ```bash
   wrangler kv:key put "birthdays:data" --path latest-backup.json --env production
   ```
3. **Clear cache:**
   ```bash
   wrangler kv:key delete "cache:home_view" --env production
   ```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Response Time**: Should be < 500ms
2. **Error Rate**: Should be < 1%
3. **Cache Hit Ratio**: Should be > 80%
4. **Scheduled Task Success**: Should be > 99%

### Log Patterns to Watch

```bash
# Error patterns
grep "ERROR" logs.txt
grep "AppError" logs.txt
grep "ValidationError" logs.txt

# Performance patterns
grep "slow" logs.txt
grep "timeout" logs.txt
grep "cache miss" logs.txt
```

## Prevention Tips

### Regular Maintenance

1. **Weekly log review** for errors
2. **Monthly data backup** verification
3. **Quarterly dependency updates**
4. **Annual security review**

### Best Practices

1. **Test in development** before production changes
2. **Monitor logs** after deployments
3. **Keep backups** of all data
4. **Document changes** for future reference

### Monitoring Setup

```bash
# Set up log monitoring
wrangler tail --env production > logs/$(date +%Y%m%d).log &

# Create alert script
#!/bin/bash
if curl -f https://your-domain.com/health > /dev/null 2>&1; then
  echo "Service healthy"
else
  echo "SERVICE DOWN!" | mail -s "Birthday Calendar Alert" admin@church.com
fi
```

## Getting Help

### Before Contacting Support

1. **Check this guide** for common solutions
2. **Review error logs** for specific error messages
3. **Test in isolation** to reproduce the issue
4. **Document the problem** with steps to reproduce

### Information to Provide

When contacting support, include:

1. **Error messages** (exact text)
2. **Steps to reproduce** the issue
3. **When it started** happening
4. **What changed** recently
5. **Log excerpts** showing the problem
6. **Environment details** (production/development)

### Support Channels

1. **Documentation**: Check all guides first
2. **Logs**: Review application logs
3. **Technical Admin**: For deployment issues
4. **Church Leadership**: For usage questions

---

*This troubleshooting guide covers common issues with the Dwell Birthday Calendar. For normal usage, see the [User Guide](USER_GUIDE.md) and [Admin Guide](ADMIN_GUIDE.md).*