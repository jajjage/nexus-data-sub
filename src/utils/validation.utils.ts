/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  console.log(emailRegex.test(email));
  return emailRegex.test(email);
};

export const validatePassword = (
  password: string
): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }

  if (!/(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number',
    };
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one special character',
    };
  }

  return { isValid: true };
};

export const validateName = (
  name: string
): { isValid: boolean; message?: string } => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: 'Name is required' };
  }

  if (name.trim().length < 2) {
    return {
      isValid: false,
      message: 'Name must be at least 2 characters long',
    };
  }

  if (name.trim().length > 50) {
    return {
      isValid: false,
      message: 'Name must be less than 50 characters long',
    };
  }

  // Allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s\-']+$/.test(name.trim())) {
    return {
      isValid: false,
      message:
        'Name can only contain letters, spaces, hyphens, and apostrophes',
    };
  }

  return { isValid: true };
};

export const validateRole = (
  role: string
): { isValid: boolean; message?: string } => {
  const validRoles = ['admin', 'reporter', 'viewer'];

  if (!validRoles.includes(role)) {
    return {
      isValid: false,
      message: 'Invalid role. Must be one of: admin, reporter, viewer',
    };
  }

  return { isValid: true };
};
