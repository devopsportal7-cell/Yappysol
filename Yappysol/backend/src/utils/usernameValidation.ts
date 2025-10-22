export interface UsernameValidationResult {
  valid: boolean;
  message?: string;
  username?: string;
}

export const validateUsername = (username: string): UsernameValidationResult => {
  // Must be a string
  if (typeof username !== 'string') {
    return { valid: false, message: 'Username must be a string' };
  }
  
  // Trim whitespace
  const trimmed = username.trim();
  
  // Length check (3-20 characters)
  if (trimmed.length < 3 || trimmed.length > 20) {
    return { valid: false, message: 'Username must be 3-20 characters' };
  }
  
  // Character check (alphanumeric, hyphens, underscores only)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, message: 'Username can only contain letters, numbers, hyphens, and underscores' };
  }
  
  // Cannot start or end with hyphen/underscore
  if (trimmed.match(/^[-_]|[-_]$/)) {
    return { valid: false, message: 'Username cannot start or end with hyphen or underscore' };
  }
  
  // Reserved words check
  const reservedWords = ['admin', 'yappy', 'yappysol', 'support', 'system', 'api', 'root', 'null', 'undefined'];
  if (reservedWords.includes(trimmed.toLowerCase())) {
    return { valid: false, message: 'This username is reserved' };
  }
  
  return { valid: true, username: trimmed };
};
