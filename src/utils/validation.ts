import { AppError } from '../middleware/error-handler';

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

export class Validator {
  private errors: string[] = [];

  required(value: unknown, fieldName: string): this {
    if (value === undefined || value === null || value === '') {
      this.errors.push(`${fieldName} is required`);
    }
    return this;
  }

  string(value: unknown, fieldName: string): this {
    if (value !== undefined && typeof value !== 'string') {
      this.errors.push(`${fieldName} must be a string`);
    }
    return this;
  }

  number(value: unknown, fieldName: string): this {
    if (value !== undefined && typeof value !== 'number') {
      this.errors.push(`${fieldName} must be a number`);
    }
    return this;
  }

  boolean(value: unknown, fieldName: string): this {
    if (value !== undefined && typeof value !== 'boolean') {
      this.errors.push(`${fieldName} must be a boolean`);
    }
    return this;
  }

  oneOf(value: unknown, allowedValues: unknown[], fieldName: string): this {
    if (value !== undefined && !allowedValues.includes(value)) {
      this.errors.push(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
    }
    return this;
  }

  minLength(value: string, minLength: number, fieldName: string): this {
    if (value && value.length < minLength) {
      this.errors.push(`${fieldName} must be at least ${minLength} characters long`);
    }
    return this;
  }

  maxLength(value: string, maxLength: number, fieldName: string): this {
    if (value && value.length > maxLength) {
      this.errors.push(`${fieldName} must be at most ${maxLength} characters long`);
    }
    return this;
  }

  result<T>(data: T): ValidationResult<T> {
    return {
      isValid: this.errors.length === 0,
      data: this.errors.length === 0 ? data : undefined,
      errors: this.errors.length > 0 ? this.errors : undefined,
    };
  }

  throwIfInvalid(): void {
    if (this.errors.length > 0) {
      throw new AppError(`Validation failed: ${this.errors.join(', ')}`, 400);
    }
  }
}

export function createValidator(): Validator {
  return new Validator();
}

// Environment variable validation
export function validateEnvironmentVariables(env: unknown): void {
  const validator = createValidator();
  const envObj = env as Record<string, unknown>;
  
  validator
    .required(envObj.SLACK_SIGNING_SECRET, 'SLACK_SIGNING_SECRET')
    .string(envObj.SLACK_SIGNING_SECRET, 'SLACK_SIGNING_SECRET')
    .minLength(envObj.SLACK_SIGNING_SECRET as string, 10, 'SLACK_SIGNING_SECRET')
    .required(envObj.SLACK_CLIENT_ID, 'SLACK_CLIENT_ID')
    .string(envObj.SLACK_CLIENT_ID, 'SLACK_CLIENT_ID')
    .required(envObj.SLACK_CLIENT_SECRET, 'SLACK_CLIENT_SECRET')
    .string(envObj.SLACK_CLIENT_SECRET, 'SLACK_CLIENT_SECRET')
    .required(envObj.ADMIN_PASSWORD, 'ADMIN_PASSWORD')
    .string(envObj.ADMIN_PASSWORD, 'ADMIN_PASSWORD')
    .minLength(envObj.ADMIN_PASSWORD as string, 8, 'ADMIN_PASSWORD');

  validator.throwIfInvalid();
}

// Slack event validation
export function validateSlackEvent(payload: Record<string, unknown>): void {
  const validator = createValidator();
  const event = payload.event as Record<string, unknown>;
  
  validator
    .required(payload.token, 'token')
    .string(payload.token, 'token')
    .required(payload.team_id, 'team_id')
    .string(payload.team_id, 'team_id')
    .required(payload.api_app_id, 'api_app_id')
    .string(payload.api_app_id, 'api_app_id')
    .required(payload.event, 'event')
    .required(event.type, 'event.type')
    .string(event.type, 'event.type')
    .required(event.user, 'event.user')
    .string(event.user, 'event.user')
    .required(payload.type, 'type')
    .string(payload.type, 'type')
    .required(payload.event_id, 'event_id')
    .string(payload.event_id, 'event_id')
    .required(payload.event_time, 'event_time')
    .number(payload.event_time, 'event_time');

  validator.throwIfInvalid();
}

// Slack command validation
export function validateSlackCommand(payload: Record<string, unknown>): void {
  const validator = createValidator();
  
  validator
    .required(payload.token, 'token')
    .string(payload.token, 'token')
    .required(payload.team_id, 'team_id')
    .string(payload.team_id, 'team_id')
    .required(payload.channel_id, 'channel_id')
    .string(payload.channel_id, 'channel_id')
    .required(payload.user_id, 'user_id')
    .string(payload.user_id, 'user_id')
    .required(payload.command, 'command')
    .string(payload.command, 'command')
    .required(payload.response_url, 'response_url')
    .string(payload.response_url, 'response_url');

  validator.throwIfInvalid();
}

// URL verification validation
export function validateUrlVerification(payload: Record<string, unknown>): void {
  const validator = createValidator();
  
  validator
    .required(payload.type, 'type')
    .oneOf(payload.type, ['url_verification'], 'type')
    .required(payload.token, 'token')
    .string(payload.token, 'token')
    .required(payload.challenge, 'challenge')
    .string(payload.challenge, 'challenge');

  validator.throwIfInvalid();
}