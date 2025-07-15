# Manual Deployment Guide

## Overview

The Dwell Birthday Calendar uses a safe manual deployment process for production to prevent accidental deployments during church activities.

## Deployment Workflows

### Automatic Development Deployment
- **Trigger**: Every push to `main` branch
- **Environment**: Development 
- **URL**: https://dev-birthday.angiesplantdiary.com
- **Purpose**: Test changes before production

### Manual Production Deployment
- **Trigger**: Manual only via GitHub Actions
- **Environment**: Production
- **URL**: https://birthday.angiesplantdiary.com
- **Purpose**: Live church Slack app

## How to Deploy to Production

### Option 1: GitHub Actions (Recommended)

1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Select **"Deploy to Cloudflare Workers"** workflow
4. Click **"Run workflow"** button
5. Select **"production"** from the environment dropdown
6. Click **"Run workflow"** to start deployment

### Option 2: Local Deployment

```bash
# Ensure you have the latest code
git pull origin main

# Run all checks locally
npm run lint
npm run type-check
npm run test
npm run build

# Deploy to production
wrangler deploy --env production
```

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All CI checks are passing ✅
- [ ] Changes have been tested in development environment
- [ ] No church events or critical communications scheduled
- [ ] Admin access and credentials are ready if issues occur

## Rollback Process

If issues occur after deployment:

### Quick Rollback via GitHub
1. Go to **Actions** tab
2. Find the last successful production deployment
3. Click **"Re-run jobs"** to redeploy the previous version

### Local Rollback
```bash
# Check recent deployments
wrangler deployments list --env production

# Rollback to specific deployment
wrangler rollback [deployment-id] --env production
```

## Monitoring After Deployment

1. **Test the Slack app immediately**:
   - Open app home tab
   - Run `/birthdays` command
   - Check admin panel at `/admin`

2. **Monitor logs**:
   ```bash
   wrangler tail --env production
   ```

3. **Check health endpoint**:
   ```bash
   curl https://birthday.angiesplantdiary.com/health
   ```

## Development Testing Workflow

1. Push changes to `main` branch
2. Wait for automatic development deployment
3. Test thoroughly in development environment
4. When satisfied, manually deploy to production

## Emergency Procedures

### App is Down
1. Check Cloudflare Workers dashboard
2. Check recent deployments for issues
3. Rollback to last known good deployment
4. If needed, redeploy from clean state

### Admin Panel Inaccessible
1. Verify admin password is set correctly
2. Check environment variables in Cloudflare
3. Test with development environment first

### Slack Integration Broken
1. Check Slack app configuration
2. Verify webhook URLs point to correct environment
3. Check signing secret and tokens

## Best Practices

1. **Always test in development first**
2. **Deploy during low-activity periods**
3. **Monitor the app for 10-15 minutes after deployment**
4. **Keep admin credentials accessible**
5. **Document any issues for future reference**

## Support

If deployment fails or issues occur:
1. Check the logs first: `wrangler tail --env production`
2. Refer to [Troubleshooting Guide](TROUBLESHOOTING.md)
3. Test the same steps in development environment
4. Rollback if critical issues persist

---

*This guide ensures safe, controlled deployments for the church's birthday calendar application.*