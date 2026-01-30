import * as crypto from 'crypto';

/**
 * Password strength levels
 */
export enum PasswordStrength {
  WEAK = 'weak',
  FAIR = 'fair',
  GOOD = 'good',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

export interface PasswordStrengthResult {
  score: number; // 0-100
  strength: PasswordStrength;
  label: string;
  feedback: string[];
}

/**
 * Calculates password strength score (0-100)
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  const feedback: string[] = [];

  if (!password) {
    return {
      score: 0,
      strength: PasswordStrength.WEAK,
      label: 'Very Weak',
      feedback: ['Password is required'],
    };
  }

  // Length scoring (up to 30 points)
  if (password.length >= 8) score += 10;
  if (password.length >= 10) score += 5;
  if (password.length >= 12) score += 5;
  if (password.length >= 14) score += 5;
  if (password.length >= 16) score += 5;

  if (password.length < 8) {
    feedback.push('Use at least 8 characters');
  }

  // Character variety scoring (up to 40 points)
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

  if (hasLowercase) score += 10;
  else feedback.push('Add lowercase letters');

  if (hasUppercase) score += 10;
  else feedback.push('Add uppercase letters');

  if (hasNumbers) score += 10;
  else feedback.push('Add numbers');

  if (hasSymbols) score += 10;
  else feedback.push('Add symbols (!@#$%^&*)');

  // Complexity bonus (up to 30 points)
  // Count unique characters
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= 6) score += 5;
  if (uniqueChars >= 8) score += 5;
  if (uniqueChars >= 10) score += 5;
  if (uniqueChars >= 12) score += 5;

  // No repeated characters bonus
  const hasNoRepeats = !/(.)\1{2,}/.test(password);
  if (hasNoRepeats) score += 5;
  else feedback.push('Avoid repeated characters');

  // No common patterns penalty
  const commonPatterns = [
    /^123/, /321$/, /abc/i, /qwerty/i, /password/i,
    /^111/, /^222/, /^333/, /^444/, /^555/, /^666/, /^777/, /^888/, /^999/,
  ];
  const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
  if (hasCommonPattern) {
    score -= 20;
    feedback.push('Avoid common patterns');
  }

  // Mixed case throughout bonus
  const mixedCasePattern = /[a-z].*[A-Z]|[A-Z].*[a-z]/;
  if (mixedCasePattern.test(password)) score += 5;

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine strength level
  let strength: PasswordStrength;
  let label: string;

  if (score < 40) {
    strength = PasswordStrength.WEAK;
    label = 'Weak';
  } else if (score < 60) {
    strength = PasswordStrength.FAIR;
    label = 'Fair';
  } else if (score < 80) {
    strength = PasswordStrength.GOOD;
    label = 'Good';
  } else if (score < 90) {
    strength = PasswordStrength.STRONG;
    label = 'Strong';
  } else {
    strength = PasswordStrength.VERY_STRONG;
    label = 'Very Strong';
  }

  return {
    score,
    strength,
    label,
    feedback: feedback.length > 0 ? feedback : ['Great password!'],
  };
}

/**
 * Generates a secure random password that meets minimum strength requirements.
 * Excludes confusing characters: 0, O, l, 1, I
 */
export function generateSecurePassword(length: number = 14, minStrength: number = 80): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes O, I
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Excludes l
  const numbers = '23456789'; // Excludes 0, 1
  const symbols = '!@#$%^&*';

  const allChars = uppercase + lowercase + numbers + symbols;

  let password: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    // Ensure at least one of each type
    password = '';
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += symbols[crypto.randomInt(symbols.length)];
    password += symbols[crypto.randomInt(symbols.length)];

    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(allChars.length)];
    }

    // Shuffle the password to avoid predictable positions
    password = shuffleString(password);
    attempts++;
  } while (calculatePasswordStrength(password).score < minStrength && attempts < maxAttempts);

  return password;
}

/**
 * Shuffles a string using Fisher-Yates algorithm
 */
function shuffleString(str: string): string {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

/**
 * Validates password meets minimum requirements
 */
export function validatePassword(password: string, minStrength: number = 80): {
  valid: boolean;
  errors: string[];
  strength: PasswordStrengthResult;
} {
  const errors: string[] = [];
  const strength = calculatePasswordStrength(password);

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 72) {
    errors.push('Password must be at most 72 characters long');
  }

  if (strength.score < minStrength) {
    errors.push(`Password strength must be at least ${minStrength}. Current: ${strength.score}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Minimum required password strength score
 */
export const MIN_PASSWORD_STRENGTH = 80;
