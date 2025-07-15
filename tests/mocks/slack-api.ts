import { vi } from 'vitest';
import { SlackWebApiResponse } from '../../src/types/slack';

export const mockSlackApiResponse = (
  ok: boolean = true,
  data: any = {},
  error?: string
): SlackWebApiResponse => ({
  ok,
  error,
  ...data
});

export const mockSlackHomeView = {
  type: 'home',
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🎂 Upcoming Birthdays'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Here are the upcoming birthdays in your workspace.'
      }
    }
  ]
};

export const mockSlackEventPayload = {
  type: 'event_callback',
  event: {
    type: 'app_home_opened',
    user: 'U1234567890',
    channel: 'D1234567890',
    tab: 'home',
    event_ts: '1641024000.000000'
  },
  team_id: 'T1234567890',
  api_app_id: 'A1234567890',
  event_id: 'Ev1234567890',
  event_time: 1641024000
};

export const mockSlackCommandPayload = {
  token: 'verification-token',
  team_id: 'T1234567890',
  team_domain: 'test-workspace',
  channel_id: 'C1234567890',
  channel_name: 'general',
  user_id: 'U1234567890',
  user_name: 'testuser',
  command: '/birthdays',
  text: '',
  response_url: 'https://hooks.slack.com/commands/1234567890/1234567890',
  trigger_id: '1234567890.1234567890.1234567890'
};

export const mockSlackOAuthResponse = {
  ok: true,
  access_token: 'xoxb-test-token',
  scope: 'commands,chat:write',
  user_id: 'U1234567890',
  team: {
    id: 'T1234567890',
    name: 'Test Workspace'
  },
  app_id: 'A1234567890',
  authed_user: {
    id: 'U1234567890',
    scope: 'chat:write',
    access_token: 'xoxp-test-user-token',
    token_type: 'user'
  }
};

// Mock Slack API service
export const createMockSlackApiService = () => ({
  publishHomeView: vi.fn().mockResolvedValue(mockSlackApiResponse()),
  testAuth: vi.fn().mockResolvedValue(mockSlackApiResponse(true, { 
    user: 'test-bot',
    team: 'Test Team'
  })),
  makeApiCall: vi.fn().mockResolvedValue(mockSlackApiResponse()),
  makeApiCallWithRetry: vi.fn().mockResolvedValue(mockSlackApiResponse())
});

// Mock fetch responses for Slack API
export const mockSlackApiCall = (
  endpoint: string,
  response: any = mockSlackApiResponse()
) => {
  const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), {
    status: response.ok ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  }));
  
  globalThis.fetch = mockFetch;
  return mockFetch;
};

// Slack signature verification helpers
export const createSlackSignature = (
  body: string,
  timestamp: string,
  secret: string = 'test-secret'
): string => {
  // This is a simplified mock - in real tests you'd want proper HMAC
  return `v0=${Buffer.from(`${timestamp}:${body}:${secret}`).toString('base64')}`;
};

export const mockSlackRequest = (
  body: string,
  timestamp?: string
): Request => {
  const ts = timestamp || String(Math.floor(Date.now() / 1000));
  const signature = createSlackSignature(body, ts);
  
  return new Request('https://test.example.com/slack/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Slack-Request-Timestamp': ts,
      'X-Slack-Signature': signature
    },
    body
  });
};