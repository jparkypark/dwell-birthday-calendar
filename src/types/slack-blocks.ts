/**
 * Slack Block Kit and UI component types
 */

export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

export interface SlackView {
  blocks: SlackBlock[];
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