const ERROR_MESSAGES = {
  // Authentication
  invalid: 'Invalid email or password. Please check your credentials and try again.',
  incorrect: 'Invalid email or password. Please check your credentials and try again.',
  wrong: 'Invalid email or password. Please check your credentials and try again.',
  
  // Account existence  
  exists: 'An account with this email already exists. Please use a different email or log in instead.',
  already: 'An account with this email already exists. Please use a different email or log in instead.',
  
  // Account not found
  'not found': 'No account found with this email address.',
  
  // Password validation
  weak: 'Password is too weak. Please use at least 8 characters with a mix of letters and numbers.',
  short: 'Password is too weak. Please use at least 8 characters with a mix of letters and numbers.',
  
  // Email validation
  'email invalid': 'Please enter a valid email address.',
  
  // Network
  network: 'Network error. Please check your connection and try again.',
  fetch: 'Network error. Please check your connection and try again.',
  
  // Rate limiting
  'rate limit': 'Too many attempts. Please wait a moment and try again.',
  'too many': 'Too many attempts. Please wait a moment and try again.',
} as const;

export const getErrorMessage = (error: any): string => {
  if (!error?.message) {
    return 'An unexpected error occurred. Please try again.';
  }
  
  const message = error.message.toLowerCase();
  
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(key)) {
      return value;
    }
  }
  
  return error.message;
};
