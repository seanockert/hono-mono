const ERROR_MESSAGES = {
  // Authentication
  invalid: 'Invalid email or password. Check your credentials and try again.',
  incorrect: 'Invalid email or password. Check your credentials and try again.',
  wrong: 'Invalid email or password. Check your credentials and try again.',
  
  // Account existence  
  exists: 'An account with this email already exists. Use a different email or log in instead.',
  already: 'An account with this email already exists. Use a different email or log in instead.',
  
  // Account not found
  'not found': 'No account found with this email address.',
  
  // Password validation
  weak: 'Password must use numbers and letters',
  short: 'Password must be at least 8 or more characters',
  
  // Email validation
  'email invalid': 'Enter a valid email address.',
  
  // Network
  network: 'Network error. Check your connection and try again.',
  fetch: 'Network error. Check your connection and try again.',
  
  // Rate limiting
  'rate limit': 'Too many attempts. Wait a moment and try again.',
  'too many': 'Too many attempts. Wait a moment and try again.',

  unexpected: 'An unexpected error occurred. Try again.',
} as const;

export const getErrorMessage = (error: any): string => {
  if (!error?.message) {
    return ERROR_MESSAGES.unexpected;
  }
  
  const message = error.message.toLowerCase();
  
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(key)) {
      return value;
    }
  }
  
  return error.message;
};
