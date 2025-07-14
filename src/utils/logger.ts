export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  requestId?: string;
}

export class Logger {
  private requestId?: string;
  private minLevel: LogLevel = LogLevel.INFO;

  constructor(requestId?: string) {
    this.requestId = requestId;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      ...(data && { data }),
      ...(this.requestId && { requestId: this.requestId }),
    };

    console.log(JSON.stringify(entry));
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }
}

export function createLogger(request?: Request): Logger {
  const requestId = request?.headers.get('x-request-id') || 
    (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null) ||
    Math.random().toString(36).substring(7);
  
  return new Logger(requestId);
}