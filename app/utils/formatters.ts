/**
 * String Formatting Utilities
 * Shared formatting functions used across multiple components
 */

/**
 * Parse product name into formatted parts
 * Handles both " - " and " -" delimiters
 * Returns object with parts for component rendering
 * @param name - Product name to format
 * @returns Object with firstPart, rest, and delimiter, or null if no delimiter
 */
export const parseProductName = (name?: string): { firstPart: string; rest: string; delimiter: string } | null => {
  if (!name) return null;

  const delimiter = name.includes(' - ') ? ' - ' : (name.includes(' -') ? ' -' : null);

  if (delimiter) {
    const parts = name.split(delimiter);
    const firstPart = parts[0].trim();
    const rest = parts.slice(1).join(delimiter).trim();
    
    return { firstPart, rest, delimiter };
  }

  return null;
};

/**
 * Format product name (for plain text or when JSX is not available)
 * @param name - Product name to format
 * @returns String
 */
export const formatProductName = (name?: string): string => {
  if (!name) return '';
  return name;
};

/**
 * Validate email address format
 * @param email - Email to validate
 * @returns True if email format is valid
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate product ID format (alphanumeric, hyphens, underscores)
 * @param id - Product ID to validate
 * @returns True if product ID format is valid
 */
export const validateProductId = (id: string): boolean => {
  const productIdRegex = /^[a-zA-Z0-9\-_]+$/;
  return productIdRegex.test(id);
};

/**
 * Sanitize error messages for safe display
 * Removes sensitive information from error messages
 * @param err - Error object or message
 * @returns Safe error message for user display
 */
export const sanitizeErrorMessage = (err: any): string => {
  const message = err?.message || String(err) || 'An error occurred';

  // Redact sensitive patterns
  if (message.toLowerCase().includes('email')) {
    return 'Failed to process email request';
  }
  if (message.toLowerCase().includes('password') || message.toLowerCase().includes('token')) {
    return 'Authentication error occurred';
  }
  if (message.toLowerCase().includes('database') || message.toLowerCase().includes('query')) {
    return 'Data operation failed';
  }

  return message;
};
