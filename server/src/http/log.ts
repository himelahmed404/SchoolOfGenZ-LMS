import type { NextFunction, Request, Response } from 'express';

type Line = Record<string, unknown>;

const write = (level: 'info' | 'warn' | 'error', line: Line) => {
  // Tests stay quiet; everywhere else each line is one JSON object, which Vercel's log view can search.
  if (process.env.NODE_ENV === 'test') return;
  (level === 'error' ? console.error : console.log)(JSON.stringify({ level, at: new Date().toISOString(), ...line }));
};

/** Never pass a password, a token, a code or a whole request body to these. */
export const log = {
  info: (line: Line) => write('info', line),
  warn: (line: Line) => write('warn', line),
  error: (line: Line) => write('error', line),
};

/** One line per request, once it has been answered. The query string is left out: it can carry a token. */
export const pathOf = (req: Request) => req.originalUrl.split('?')[0];

export function requestLog(req: Request, res: Response, next: NextFunction) {
  const started = performance.now();
  res.on('finish', () => {
    log.info({ msg: 'request', id: req.id, method: req.method, path: pathOf(req), status: res.statusCode, ms: Math.round(performance.now() - started) });
  });
  next();
}
