export type LevelNumber = 0 | 10 | 20 | 30 | 40 | 50 | 60;
export type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
export type LevelWithSilent = Level | 'silent';

export const levels: {
  values: Record<LevelWithSilent, LevelNumber>;
  labels: Record<LevelNumber, LevelWithSilent>;
} = {
  values: {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
    silent: 0,
  },
  labels: {
    0: 'silent',
    10: 'trace',
    20: 'debug',
    30: 'info',
    40: 'warn',
    50: 'error',
    60: 'fatal',
  },
};
