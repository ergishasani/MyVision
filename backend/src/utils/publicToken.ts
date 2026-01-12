import { randomBytes } from 'crypto';

// Generate a secure public token for document viewing
// This allows clients to view documents without authentication

export const generatePublicToken = (): string => {
  return randomBytes(32).toString('hex');
};

// Validate token format (basic check)
export const isValidPublicToken = (token: string): boolean => {
  return /^[a-f0-9]{64}$/.test(token);
};
