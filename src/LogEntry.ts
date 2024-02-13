import { LevelNumber, LevelWithSilent } from './levels';

export interface LogEntry {
  id: number;
  time: number;
  level: LevelNumber;
  levelLabel: LevelWithSilent;
  uuids: string[];
  message: string;
  meta?: Record<string, any>;
  error?: Error;
}
