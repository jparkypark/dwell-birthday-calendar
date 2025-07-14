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

// Home View specific types
export interface SlackHomeView {
  type: 'home';
  blocks: SlackHomeViewBlock[];
}

export interface SlackHomeViewBlock {
  type: 'section' | 'divider' | 'context' | 'actions' | 'header';
  text?: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  };
  elements?: Array<{
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }> | SlackHomeViewAction[];
  accessory?: SlackHomeViewAction;
}

export interface SlackHomeViewAction {
  type: 'button' | 'static_select' | 'multi_static_select';
  action_id: string;
  text: {
    type: 'plain_text';
    text: string;
    emoji?: boolean;
  };
  style?: 'primary' | 'danger';
  value?: string;
  options?: Array<{
    text: {
      type: 'plain_text';
      text: string;
    };
    value: string;
  }>;
}

// Interactive payload types
export interface SlackInteractivePayload {
  type: 'block_actions' | 'view_submission' | 'view_closed';
  user: {
    id: string;
    name: string;
    username?: string;
  };
  team: {
    id: string;
    domain: string;
  };
  actions?: SlackInteractiveAction[];
  view?: {
    id: string;
    type: string;
    private_metadata?: string;
    state?: {
      values: Record<string, Record<string, unknown>>;
    };
  };
  response_url?: string;
  trigger_id?: string;
}

export interface SlackInteractiveAction {
  action_id: string;
  type: 'button' | 'static_select' | 'multi_static_select';
  value?: string;
  selected_option?: {
    value: string;
    text: {
      type: string;
      text: string;
    };
  };
  selected_options?: Array<{
    value: string;
    text: {
      type: string;
      text: string;
    };
  }>;
}

// Web API response types
export interface SlackWebApiResponse {
  ok: boolean;
  error?: string;
  response_metadata?: {
    next_cursor?: string;
    warnings?: string[];
  };
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