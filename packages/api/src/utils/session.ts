import crypto from 'crypto';

export function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}
