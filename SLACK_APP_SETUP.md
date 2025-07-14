# Slack App Configuration Guide

## Phase 1 Step 3: Setting up the Slack App

This guide covers how to create and configure the Slack app at api.slack.com for the Dwell Birthday Calendar.

## Prerequisites

- Deployed Worker at: `https://dev-birthday.angiesplantdiary.com/` (development)
- Future production URL: `https://birthday.angiesplantdiary.com/` (production)

## Step 1: Create the Slack App

1. Go to [api.slack.com](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter app details:
   - **App Name**: `Dwell Birthday Calendar`
   - **Development Slack Workspace**: Select your church's Slack workspace
5. Click **"Create App"**

## Step 2: Configure OAuth & Permissions

1. In the left sidebar, go to **"OAuth & Permissions"**
2. Scroll down to **"Scopes"**
3. Add the following **Bot Token Scopes**:
   - `app_mentions:read` - View messages that directly mention your app
   - `channels:read` - View basic information about public channels  
   - `chat:write` - Send messages as the app
   - `commands` - Add shortcuts and/or slash commands that people can use
   - `users:read` - View people in the workspace

4. Scroll up to **"Redirect URLs"**
5. Add redirect URL: `https://dev-birthday.angiesplantdiary.com/oauth/redirect`
6. Click **"Save URLs"**

## Step 3: Configure Event Subscriptions

1. In the left sidebar, go to **"Event Subscriptions"**
2. Toggle **"Enable Events"** to ON
3. Set **Request URL**: `https://dev-birthday.angiesplantdiary.com/slack/events`
4. Under **"Subscribe to bot events"**, add:
   - `app_home_opened` - User clicked into your App Home

5. Click **"Save Changes"**

## Step 4: Configure Slash Commands

1. In the left sidebar, go to **"Slash Commands"**
2. Click **"Create New Command"**
3. Enter command details:
   - **Command**: `/birthdays`
   - **Request URL**: `https://dev-birthday.angiesplantdiary.com/slack/commands`
   - **Short Description**: `View upcoming birthdays`
   - **Usage Hint**: (leave empty)
4. Click **"Save"**

## Step 5: Configure App Home

1. In the left sidebar, go to **"App Home"**
2. Under **"Show Tabs"**:
   - Enable **"Home Tab"**
   - Enable **"Messages Tab"**
3. Under **"Home Tab"**:
   - Check **"Allow users to send Slash commands and messages from the messages tab"**

## Step 6: Get App Credentials

1. Go to **"Basic Information"** in the left sidebar
2. Copy the following values (you'll need these for environment variables):
   - **App ID**: (for reference)
   - **Client ID**: Save as `SLACK_CLIENT_ID`
   - **Client Secret**: Save as `SLACK_CLIENT_SECRET` 
   - **Signing Secret**: Save as `SLACK_SIGNING_SECRET`

## Step 7: Set Environment Variables

Set these secrets in your Cloudflare Worker:

```bash
# Set environment secrets
wrangler secret put SLACK_CLIENT_ID --env development
wrangler secret put SLACK_CLIENT_SECRET --env development  
wrangler secret put SLACK_SIGNING_SECRET --env development
wrangler secret put ADMIN_PASSWORD --env development
```

When prompted, enter the corresponding values from Step 6.

## Step 8: Install the App

1. Go to **"Install App"** in the left sidebar
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. You should be redirected to: `https://dev-birthday.angiesplantdiary.com/oauth/redirect`
5. Verify you see the "Installation Complete" message

## Step 9: Test the Integration

1. **Test URL Verification**: 
   - When you first configure the Event Subscriptions URL, Slack will send a verification challenge
   - The Worker should automatically respond with the challenge

2. **Test App Home**:
   - In Slack, find your app in the sidebar or Apps section
   - Click on it to open the App Home tab
   - Check Worker logs for `app_home_opened` events

3. **Test Slash Command**:
   - In any Slack channel, type `/birthdays`
   - You should see a response (placeholder for now)

## Current Endpoints

- **Health Check**: `https://dev-birthday.angiesplantdiary.com/health`
- **OAuth Redirect**: `https://dev-birthday.angiesplantdiary.com/oauth/redirect`
- **Slack Events**: `https://dev-birthday.angiesplantdiary.com/slack/events`
- **Slack Commands**: `https://dev-birthday.angiesplantdiary.com/slack/commands`

## Production Setup

When ready for production:

1. Update all URLs to use `https://birthday.angiesplantdiary.com/`
2. Set production environment secrets:
   ```bash
   wrangler secret put SLACK_CLIENT_ID --env production
   wrangler secret put SLACK_CLIENT_SECRET --env production
   wrangler secret put SLACK_SIGNING_SECRET --env production
   wrangler secret put ADMIN_PASSWORD --env production
   ```
3. Deploy to production: `wrangler deploy --env production`
4. Update Slack app configuration with production URLs

## Troubleshooting

- **URL Verification Fails**: Check Worker logs and ensure SLACK_SIGNING_SECRET is set correctly
- **Events Not Received**: Verify Event Subscriptions URL and bot permissions
- **OAuth Fails**: Check redirect URL matches exactly and CLIENT_ID/SECRET are correct

## Next Steps

After completing this setup, you're ready for **Phase 2: Core Features** which will implement:
- Birthday data storage and management
- Home tab view generation
- Slash command functionality