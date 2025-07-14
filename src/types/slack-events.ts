/**
 * Slack event-related types
 */

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

export interface SlackVerificationRequest {
  type: 'url_verification';
  token: string;
  challenge: string;
  [key: string]: unknown;
}

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