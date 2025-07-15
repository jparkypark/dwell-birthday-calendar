# Dwell Birthday Calendar

A lightweight Slack application that displays member birthdays for Dwell Church through an interactive home tab and slash command.

## Overview

This application provides a simple way for church members to view upcoming birthdays within their Slack workspace. Built specifically for small church communities (~20 members), it prioritizes simplicity and minimal operational overhead.

## Features

### ✅ Core Features (Completed)
- **Home Tab View**: Interactive birthday calendar visible when users open the app
- **Slash Command**: Quick access via `/birthdays` command in any channel
- **Admin Interface**: Simple web-based management for updating birthday data
- **Automated Caching**: Intelligent cache management with scheduled refresh
- **Scheduled Tasks**: Daily cache refresh and maintenance operations
- **Mobile Support**: Responsive design that works on all devices

### 🔧 Technical Features
- **Serverless Architecture**: Runs on Cloudflare Workers
- **Real-time Updates**: Automatic birthday list refresh
- **Performance Monitoring**: Built-in metrics and health checks
- **Error Handling**: Comprehensive error recovery and logging
- **Security**: HTTP Basic Auth for admin, Slack signature verification
- **Testing**: Unit and integration tests for core functionality

## Technology Stack

- **Runtime**: Cloudflare Workers (serverless)
- **Storage**: Cloudflare KV (key-value store)
- **Integration**: Slack Web API & Events API
- **Language**: TypeScript
- **Testing**: Vitest with comprehensive test coverage
- **Deployment**: Wrangler CLI

## Architecture

The application uses a serverless architecture with four main components:

1. **Slack Integration Layer** - Handles Slack events, commands, and OAuth
2. **Data Storage Layer** - Manages birthday data and caching in Cloudflare KV
3. **Admin Interface** - Web-based panel for birthday data management
4. **Scheduler** - Automated cache refresh and maintenance tasks

## Project Status

### ✅ Phase 1: Foundation (Completed)
- [x] Environment setup and core worker structure
- [x] Basic Slack integration with OAuth flow
- [x] Signature verification and security framework

### ✅ Phase 2: Core Features (Completed)
- [x] Data layer with KV storage and validation
- [x] Slash command implementation (`/birthdays`)
- [x] Home tab with interactive birthday display

### ✅ Phase 3: Admin & Polish (Completed)
- [x] Admin interface with JSON editor and authentication
- [x] Scheduled cache refresh and performance monitoring
- [x] Comprehensive testing and documentation

### 🚀 Ready for Production Launch
The application is feature-complete and ready for production deployment.

## Quick Start

### Prerequisites
- Node.js 18+
- Cloudflare account
- Slack workspace with admin access

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd dwell-birthday-calendar

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
```

### Deployment

```bash
# Build the project
npm run build

# Deploy to production
wrangler deploy --env production
```

## Documentation

Complete documentation is available in the `/docs` directory:

- **[User Guide](docs/USER_GUIDE.md)** - How to use the birthday calendar
- **[Admin Guide](docs/ADMIN_GUIDE.md)** - Managing birthday data and settings
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Planning](PLANNING.md)** - Detailed architecture and design decisions

## Usage

### For Church Members

1. **Home Tab**: Click the "Birthday Calendar" app in your Slack sidebar
2. **Slash Command**: Type `/birthdays` in any channel for quick access
3. **Mobile**: Use the Slack mobile app - fully responsive design

### For Administrators

1. **Admin Panel**: Access `/admin` with your credentials
2. **Data Management**: Edit birthday data using the JSON editor
3. **Monitoring**: View cache status and system health

## Configuration

### Environment Variables

```bash
# Required for Slack integration
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret

# Required for admin access
ADMIN_PASSWORD=your_secure_admin_password
```

### Scheduled Tasks

The application includes automated scheduled tasks:
- **Daily (8:00 AM UTC)**: Cache refresh
- **Hourly (Business Hours)**: Cache warming
- **Monthly (1st of month)**: System maintenance

## Performance

### Metrics
- **Response Time**: < 500ms for cached responses
- **Cache Hit Ratio**: > 80% during business hours
- **Error Rate**: < 1% for all operations
- **Uptime**: 99.9% availability target

### Monitoring
- **Health Check**: `/health` endpoint
- **Real-time Logs**: `wrangler tail` command
- **Performance Metrics**: Built-in monitoring dashboard

## Security

### Features
- **Authentication**: HTTP Basic Auth for admin panel
- **Signature Verification**: Slack request validation
- **Input Validation**: Comprehensive data sanitization
- **HTTPS Only**: All traffic encrypted
- **Error Handling**: No sensitive data in error messages

### Best Practices
- Regular password rotation
- Secure environment variable management
- Audit logging for admin actions
- Minimal data storage (no birth years)

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run all tests
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Comprehensive linting rules
- **Testing**: Unit and integration tests
- **Documentation**: Comprehensive inline comments

## Contributing

This is a private project for Dwell Church. For modifications or improvements:

1. Create a feature branch
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass
5. Submit for review

## Support

For technical support:
- **Documentation**: Check the `/docs` directory first
- **Logs**: Use `wrangler tail` to view application logs
- **Testing**: Use development environment for debugging

## License

Private project for Dwell Church internal use.

---

**Last Updated**: Phase 3 Step 3 - Testing & Documentation Complete
**Status**: ✅ Ready for Production Launch