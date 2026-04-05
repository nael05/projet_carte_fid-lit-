/**
 * Password Validator - Synchronisé avec Frontend
 * Utilisé pour valider les mots de passe avec les mêmes règles partout
 */

export function validatePassword(password) {
  const errors = [];

  // Vérification 1: Longueur minimale
  if (!password || password.length < 6) {
    errors.push('Minimum 6 caractères requis');
  }

  // Vérification 2: Au moins une majuscule
  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins une majuscule requise');
  }

  // Vérification 3: Au moins un chiffre ou caractère spécial
  if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Au moins un chiffre ou caractère spécial requis');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valide la complexité du nouveau mot de passe vs ancien
 * @param {string} newPassword - Nouveau mot de passe
 * @param {string} hashedOldPassword - Ancien mot de passe hashé (bcrypt)
 * @param {string} plainOldPassword - Ancien mot de passe en clair (optionnel, pour comparaison)
 * @returns {object} { isValid: boolean, error: string|null }
 */
export async function validatePasswordChange(
  newPassword,
  hashedOldPassword,
  plainOldPassword = null
) {
  const bcrypt = await import('bcryptjs');

  // Valider la complexité du nouveau mot de passe
  const complexityCheck = validatePassword(newPassword);
  if (!complexityCheck.isValid) {
    return {
      isValid: false,
      error: 'Exigences du mot de passe non respectées: ' + complexityCheck.errors.join(', '),
    };
  }

  // Vérifier que le nouveau mot de passe n'est pas identique à l'ancien
  if (plainOldPassword) {
    const isSamePassword = await bcrypt.default.compare(plainOldPassword, hashedOldPassword);
    if (isSamePassword) {
      return {
        isValid: false,
        error: 'Le nouveau mot de passe doit être différent de l\'ancien',
      };
    }
  }

  return { isValid: true, error: null };
}
