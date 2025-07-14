# Dwell Birthday Calendar - System Design & Architecture

## Executive Summary

A lightweight Slack application that displays the birthdays of Dwell Church members through a home tab and slash command. The system prioritizes simplicity, minimal cost, and easy administration for a 20-member church community.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Slack Users   │────▶│  Slack Platform  │────▶│ Cloudflare Workers  │
│                 │     │                  │     │                     │
│ • View Home Tab │     │ • Routes         │     │ /slack/events      │
│ • /birthdays    │     │   requests      │     │ /slack/commands    │
└─────────────────┘     └──────────────────┘     │ /oauth/redirect    │
                                                  └──────────┬──────────┘
┌─────────────────┐                                          │
│  Web Browser    │                                          │
│                 │──────────────────────────────────────────┤
│ • Admin Access  │            Direct HTTPS                  │
└─────────────────┘                                          │
                                                             ▼
                                                  ┌─────────────────────┐
                                                  │   Cloudflare KV     │
                                                  │                     │
                                                  │ • Birthday JSON     │
                                                  │ • Cached Views      │
                                                  │ • App Metadata      │
                                                  └─────────────────────┘
```

### Component Architecture

#### 1. Slack Integration Layer

**Purpose**: Handle all Slack-specific interactions and API calls

**Components**:
- **Event API Handler** (`/slack/events`)
  - Processes `app_home_opened` events
  - Handles URL verification challenges
  - Updates home tab views

- **Slash Command Handler** (`/slack/commands`)
  - Processes `/birthdays` command
  - Returns formatted birthday list
  - Ephemeral response (only visible to user)

- **OAuth Handler** (`/oauth/redirect`)
  - Manages app installation flow
  - Stores workspace credentials
  - Provides installation confirmation

**Security**:
- Request signature verification using HMAC-SHA256
- Timestamp validation (5-minute window)
- Token storage in KV with encryption

#### 2. Data Storage Layer

**Technology**: Cloudflare KV (Key-Value Store)

**Data Models**:

```typescript
// Birthday Data Structure
{
  "birthdays": [
    {
      "name": "John Smith",
      "month": 3,
      "day": 15,
      "slackUserId": "U1234567" // Optional
    }
  ]
}

// Installation Data Structure
{
  "T1234567": { // Team ID
    "teamId": "T1234567",
    "accessToken": "xoxb-...",
    "botToken": "xoxb-...",
    "installedAt": 1704067200000
  }
}

// Cache Structure
{
  "blocks": [...], // Slack Block Kit format
  "lastUpdated": 1704067200000
}
```

**KV Keys**:
- `birthdays:data` - Main birthday storage
- `installations` - Workspace installation data
- `cache:home_view` - Pre-rendered home tab view

#### 3. Admin Interface Layer

**Purpose**: Simple web-based administration without Slack complexity

**Features**:
- JSON editor with syntax validation
- Basic authentication (username/password)
- Force cache refresh capability
- Mobile-responsive design

**Security**:
- HTTP Basic Authentication
- HTTPS-only access
- No user data exposed in logs

#### 4. Processing Layer

**Cloudflare Worker Functions**:

1. **Request Router**
   - Uses lightweight routing library (itty-router)
   - Maps URLs to handlers
   - Handles 404s gracefully

2. **Birthday Calculator**
   - Determines upcoming birthdays
   - Handles year boundary edge cases
   - Sorts by chronological order

3. **View Generator**
   - Creates Slack Block Kit formatted views
   - Implements caching strategy
   - Formats dates consistently

4. **Scheduler**
   - Daily cron job (midnight UTC)
   - Refreshes cached views
   - Cleans up stale data

### Data Flow Diagrams

#### Home Tab View Flow

```
User Opens App Home
        │
        ▼
Slack sends app_home_opened event
        │
        ▼
Worker receives POST /slack/events
        │
        ▼
Verify Slack signature
        │
        ▼
Check cache (< 1 hour old?)
        │
        ├─── Yes ──▶ Return cached view
        │
        └─── No ───▶ Generate new view
                            │
                            ▼
                    Query birthday data
                            │
                            ▼
                    Calculate upcoming (30 days)
                            │
                            ▼
                    Format as Slack blocks
                            │
                            ▼
                    Update cache & publish view
```

#### Admin Update Flow

```
Admin accesses /admin
        │
        ▼
Basic auth challenge
        │
        ▼
Display current JSON
        │
        ▼
Admin edits & submits
        │
        ▼
Validate JSON structure
        │
        ├─── Invalid ──▶ Show error
        │
        └─── Valid ────▶ Update KV store
                              │
                              ▼
                        Clear cache
                              │
                              ▼
                        Confirm success
```

### Technical Decisions & Rationale

#### Why Cloudflare Workers?

1. **Cost Efficiency**
   - Free tier: 100k requests/day
   - No cold starts like Lambda
   - Integrated KV storage

2. **Performance**
   - Global edge network
   - Sub-10ms response times
   - Meets Slack's 3-second timeout

3. **Simplicity**
   - Single deployment unit
   - No infrastructure management
   - Built-in cron scheduler

#### Why Separate Admin Panel?

1. **Reduced Complexity**
   - No Slack modal/interaction endpoints
   - Simple HTML form vs Block Kit
   - Direct JSON editing

2. **Better UX for Admins**
   - Bulk editing capability
   - No Slack API rate limits
   - Works on any device

3. **Security Isolation**
   - Admin access separate from Slack
   - No Slack permission management
   - Simple password protection

#### Why KV over Database?

1. **Data Characteristics**
   - Small dataset (~20 records)
   - Read-heavy workload
   - Simple key-value access

2. **Operational Simplicity**
   - No schema migrations
   - No connection pooling
   - Automatic replication

### Scaling Considerations

#### Current Limits (20 users)

- **Requests**: ~200/day (well under 100k limit)
- **KV Operations**: ~250/day (under 1k limit)
- **Storage**: <1KB (under 25GB limit)
- **Worker CPU**: <10ms per request

#### Growth Scenarios

**100 Users**:
- Still within free tier
- Consider pagination for home view
- No architectural changes needed

**500 Users**:
- May need paid Worker plan
- Implement view pagination
- Consider regional caching

**1000+ Users**:
- Migrate to database (D1)
- Implement user preferences
- Add search functionality

### Security Architecture

#### Authentication & Authorization

1. **Slack Requests**
   - HMAC-SHA256 signature verification
   - Timestamp validation
   - Team ID verification

2. **Admin Access**
   - HTTP Basic Auth over HTTPS
   - Environment variable for password
   - No default credentials

3. **Data Protection**
   - No PII beyond names/dates
   - No birth years stored
   - Encrypted at rest in KV

#### Threat Model

1. **Replay Attacks**
   - Mitigated by timestamp validation
   - 5-minute request window

2. **Data Exposure**
   - Birthday data is semi-public
   - No sensitive information stored
   - Admin password in env vars

3. **Denial of Service**
   - Cloudflare DDoS protection
   - Rate limiting at edge
   - Cached responses reduce load

### Monitoring & Operations

#### Logging Strategy

1. **Application Logs**
   - Error tracking for failed requests
   - Admin action audit trail
   - Scheduler execution logs

2. **Metrics**
   - Request count by endpoint
   - Cache hit/miss ratio
   - Error rate monitoring

#### Operational Procedures

1. **Deployment**
   ```bash
   # Test locally
   wrangler dev
   
   # Deploy to production
   wrangler publish
   
   # Monitor logs
   wrangler tail
   ```

2. **Backup & Recovery**
   - Manual JSON export via admin panel
   - KV data persisted by Cloudflare
   - Installation data regenerable

3. **Incident Response**
   - Worker rollback capability
   - KV data versioning
   - Admin panel for quick fixes

## Implementation Plan

### Phase 1: Foundation

#### Step 1: Environment Setup
- [x] Create Cloudflare account
- [x] Set up Wrangler CLI
- [x] Create KV namespace
- [x] Initialize TypeScript project
- [x] Configure development environment

#### Step 2: Core Worker Structure
- [x] Implement request router
- [x] Create Slack signature verification
- [x] Set up TypeScript types/interfaces
- [x] Implement error handling framework
- [x] Add logging utilities

#### Step 3: Basic Slack Integration
- [x] Create Slack app in api.slack.com
- [x] Implement OAuth flow
- [x] Handle URL verification
- [x] Test basic event reception
- [x] Deploy to staging environment

### Phase 2: Core Features

#### Step 1: Data Layer
- [x] Implement KV storage operations
- [x] Create birthday data validators
- [x] Build date calculation utilities
- [x] Test edge cases (year boundaries)
- [x] Add data migration utilities

#### Step 2: Slash Command
- [x] Implement `/birthdays` handler
- [x] Format birthday list output
- [x] Add error responses
- [x] Test in Slack workspace
- [x] Optimize response time

#### Step 3: Home Tab
- [x] Implement home tab view generator
- [x] Create Block Kit layouts
- [x] Add caching mechanism
- [x] Handle app_home_opened events
- [x] Test view updates

### Phase 3: Admin & Polish

#### Step 1: Admin Interface
- [ ] Create HTML admin panel
- [ ] Implement Basic Auth
- [ ] Add JSON editor with validation
- [ ] Build update endpoints
- [ ] Style for mobile responsiveness

#### Step 2: Scheduler & Caching
- [ ] Configure cron trigger
- [ ] Implement cache refresh logic
- [ ] Add cache invalidation
- [ ] Test scheduled operations
- [ ] Monitor performance

#### Step 3: Testing & Documentation
- [ ] Basic unit tests for core business logic
- [ ] Performance monitoring with basic logging for cache hit rates and reponse times
- [ ] End-to-end testing
- [ ] Load testing with 20+ birthdays
- [ ] Write admin documentation
- [ ] Create user guide
- [ ] Prepare deployment checklist

### Phase 4: Production Launch

#### Pre-Launch Checklist
- [ ] Security review
- [ ] Set all environment secrets
- [ ] Configure production KV
- [ ] Update Slack app settings
- [ ] Test OAuth flow

#### Launch Day
- [ ] Deploy to production
- [ ] Install in church Slack
- [ ] Add initial birthday data
- [ ] Train administrators
- [ ] Monitor initial usage

#### Post-Launch
- [ ] Monitor error logs
- [ ] Gather user feedback
- [ ] Fix any urgent issues
- [ ] Document lessons learned
- [ ] Plan future enhancements

## Risk Mitigation

### Technical Risks
1. **Slack API Changes**
   - Mitigation: Version lock dependencies
   - Monitor Slack changelog

2. **Cloudflare Outages**
   - Mitigation: Multi-region deployment
   - Graceful degradation

### Operational Risks
1. **Admin Turnover**
   - Mitigation: Document procedures
   - Train multiple admins

2. **Data Loss**
   - Mitigation: Regular backups
   - Simple recovery process
