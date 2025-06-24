import type { LogEntry } from './LogEntry.ts';

export interface LogEventData {
  log: LogEntry;
  logs: LogEntry[];
  info: {
    depth: number;
  };
}

export interface ChangeEventData {
  logs: LogEntry[];
  info: {
    depth: number;
  };
}

export class LogEvent extends CustomEvent<LogEventData> {
  constructor(data: LogEventData) {
    super('log', {
      detail: data,
    });
  }
}

export class ChangeEvent extends CustomEvent<ChangeEventData> {
  constructor(data: ChangeEventData) {
    super('change', { detail: data });
  }
}
