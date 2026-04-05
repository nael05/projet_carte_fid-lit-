/**
 * Validate password strength and requirements
 * @param {string} password - Password to validate
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
export function validatePassword(password) {
  const errors = [];
  
  if (!password) {
    errors.push('Le mot de passe est requis');
    return { isValid: false, errors };
  }
  
  if (password.length < 6) {
    errors.push('Minimum 6 caractères');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins une majuscule requise');
  }
  
  if (!/[0-9]/.test(password) && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Au moins un chiffre ou caractère spécial requis');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get password strength level
 * @param {string} password - Password to evaluate
 * @returns {string} - 'faible' | 'moyen' | 'fort'
 */
export function getPasswordStrength(password) {
  if (!password) return 'faible';
  
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
  
  if (strength <= 1) return 'faible';
  if (strength <= 3) return 'moyen';
  return 'fort';
}
