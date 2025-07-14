/**
 * Slack API and OAuth-related types
 */

import { SlackHomeViewBlock } from './slack-blocks';

export interface SlackInstallation {
  teamId: string;
  accessToken: string;
  botToken: string;
  installedAt: number;
}

export interface SlackOAuthResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  app_id: string;
  team: {
    id: string;
    name: string;
  };
  enterprise?: {
    id: string;
    name: string;
  };
  authed_user: {
    id: string;
    scope: string;
    access_token: string;
    token_type: string;
  };
}

// Web API response types
export interface SlackWebApiResponse {
  ok: boolean;
  error?: string;
  response_metadata?: {
    next_cursor?: string;
    warnings?: string[];
  };
  retry_after?: number;
  [key: string]: unknown;
}

export interface SlackPublishViewResponse extends SlackWebApiResponse {
  view?: {
    id: string;
    type: string;
    blocks: SlackHomeViewBlock[];
    private_metadata?: string;
  };
}

export interface SlackAuthTestResponse extends SlackWebApiResponse {
  url?: string;
  team?: string;
  user?: string;
  team_id?: string;
  user_id?: string;
  bot_id?: string;
}