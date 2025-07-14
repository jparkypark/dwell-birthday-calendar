# Dwell Birthday Calendar

A lightweight Slack application that displays member birthdays for Dwell Church through an interactive home tab and slash command.

## Overview

This application provides a simple way for church members to view upcoming birthdays within their Slack workspace. Built specifically for small church communities (~20 members), it prioritizes simplicity and minimal operational overhead.

## Features

- **Home Tab View**: Interactive birthday calendar visible when users open the app
- **Slash Command**: Quick access via `/birthdays` command 
- **Admin Interface**: Simple web-based management for updating birthday data
- **Automated Updates**: Daily refresh of birthday displays

## Technology Stack

- **Runtime**: Cloudflare Workers (serverless)
- **Storage**: Cloudflare KV (key-value store)
- **Integration**: Slack Web API & Events API
- **Language**: TypeScript

## Architecture

The application uses a serverless architecture with three main components:

1. **Slack Integration Layer** - Handles Slack events, commands, and OAuth
2. **Data Storage Layer** - Manages birthday data and caching in Cloudflare KV
3. **Admin Interface** - Web-based panel for birthday data management

## Development Status

This project is currently in the planning and initial setup phase. See `PLANNING.md` for detailed architecture and implementation plans.

## Setup & Deployment

_Coming soon - development setup and deployment instructions will be added as the project progresses._

## License

Private project for Dwell Church internal use.