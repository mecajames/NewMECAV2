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
  color: string; // For UI display
}

/**
 * Minimum required password strength score
 */
export const MIN_PASSWORD_STRENGTH = 80;

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
      color: 'red',
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

  // Determine strength level and color
  let strength: PasswordStrength;
  let label: string;
  let color: string;

  if (score < 40) {
    strength = PasswordStrength.WEAK;
    label = 'Weak';
    color = 'red';
  } else if (score < 60) {
    strength = PasswordStrength.FAIR;
    label = 'Fair';
    color = 'orange';
  } else if (score < 80) {
    strength = PasswordStrength.GOOD;
    label = 'Good';
    color = 'yellow';
  } else if (score < 90) {
    strength = PasswordStrength.STRONG;
    label = 'Strong';
    color = 'green';
  } else {
    strength = PasswordStrength.VERY_STRONG;
    label = 'Very Strong';
    color = 'emerald';
  }

  return {
    score,
    strength,
    label,
    feedback: feedback.length > 0 ? feedback : ['Great password!'],
    color,
  };
}

/**
 * Generates a secure random password that meets minimum strength requirements.
 * Excludes confusing characters: 0, O, l, 1, I
 */
export function generatePassword(length: number = 14): string {
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
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    password = shuffleString(password);
    attempts++;
  } while (calculatePasswordStrength(password).score < MIN_PASSWORD_STRENGTH && attempts < maxAttempts);

  return password;
}

/**
 * Shuffles a string using Fisher-Yates algorithm
 */
function shuffleString(str: string): string {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

/**
 * Validates password meets minimum requirements
 */
export function validatePassword(password: string): {
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

  if (strength.score < MIN_PASSWORD_STRENGTH) {
    errors.push(`Password strength must be at least ${MIN_PASSWORD_STRENGTH}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Get the Tailwind CSS classes for strength indicator
 */
export function getStrengthColorClasses(score: number): {
  bar: string;
  text: string;
  bg: string;
} {
  if (score < 40) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-500',
      bg: 'bg-red-500/10',
    };
  } else if (score < 60) {
    return {
      bar: 'bg-orange-500',
      text: 'text-orange-500',
      bg: 'bg-orange-500/10',
    };
  } else if (score < 80) {
    return {
      bar: 'bg-yellow-500',
      text: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    };
  } else if (score < 90) {
    return {
      bar: 'bg-green-500',
      text: 'text-green-500',
      bg: 'bg-green-500/10',
    };
  } else {
    return {
      bar: 'bg-emerald-500',
      text: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    };
  }
}
