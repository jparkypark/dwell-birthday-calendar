export interface SlackEvent {
  token: string;
  team_id: string;
  api_app_id: string;
  event: {
    type: string;
    user: string;
    channel?: string;
    tab?: string;
    view?: Record<string, unknown>;
    [key: string]: unknown;
  };
  type: string;
  event_id: string;
  event_time: number;
  authed_users: string[];
  [key: string]: unknown;
}

export interface SlackCommand {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
  [key: string]: unknown;
}

export interface SlackInstallation {
  teamId: string;
  accessToken: string;
  botToken: string;
  installedAt: number;
}

export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

export interface SlackView {
  blocks: SlackBlock[];
}

export interface SlackVerificationRequest {
  type: 'url_verification';
  token: string;
  challenge: string;
  [key: string]: unknown;
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