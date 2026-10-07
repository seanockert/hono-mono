const ALREADY_EXISTS =
  'An account with this email already exists. Use a different email or log in instead.';

/** Keyed by Better Auth error code. */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password. Check your credentials and try again.',
  INVALID_EMAIL: 'Enter a valid email address.',
  INVALID_PASSWORD: 'Invalid password.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters.',
  PASSWORD_TOO_LONG: 'Password is too long.',
  USER_ALREADY_EXISTS: ALREADY_EXISTS,
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: ALREADY_EXISTS,
  USER_NOT_FOUND: 'No account found with this email address.',
  INVALID_TOKEN: 'That reset link is not valid, or it has expired. Ask for a new link.',
};

/** For a request that throws. The client gives HTTP errors as `result.error`. */
export const NETWORK_ERROR = 'Network error. Check your connection and try again.';

export const getErrorMessage = (error: { code?: string; message?: string; status?: number }) =>
  (error.code && MESSAGES[error.code]) ||
  (error.status === 429 ? 'Too many attempts. Wait a moment and try again.' : '') ||
  error.message ||
  'An unexpected error occurred. Try again.';
