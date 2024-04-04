import { CustomEvent } from './CustomEvent';
import type { LogEntry } from './LogEntry';

export interface LogEventData {
  log: LogEntry;
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
