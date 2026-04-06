// Validation des entrées
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 255;
};

export const validatePhone = (phone) => {
  // Accepte formats: +33123456789, 0123456789, +33 1 23 45 67 89, etc.
  const regex = /^\+?[0-9\s\-().]{7,20}$/;
  return regex.test(phone?.trim());
};

export const validateName = (name, minLength = 2, maxLength = 100) => {
  const trimmed = name?.trim();
  return trimmed && trimmed.length >= minLength && trimmed.length <= maxLength;
};

export const validatePassword = (password, minLength = 6) => {
  return password && password.length >= minLength && password.length <= 255;
};

export const sanitizeString = (str) => {
  return str?.trim().substring(0, 1000) || '';
};

export const validateJoinWalletInput = (data) => {
  const errors = [];

  if (!validateName(data.nom, 2, 50)) {
    errors.push('Nom: 2-50 caractères requis');
  }

  if (!validateName(data.prenom, 2, 50)) {
    errors.push('Prénom: 2-50 caractères requis');
  }

  if (!validatePhone(data.telephone)) {
    errors.push('Numéro de téléphone invalide');
  }

  if (!data.type_wallet || !['apple', 'google'].includes(data.type_wallet)) {
    errors.push('Type de wallet invalide (apple ou google)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      nom: sanitizeString(data.nom),
      prenom: sanitizeString(data.prenom),
      telephone: sanitizeString(data.telephone),
      type_wallet: data.type_wallet?.toLowerCase(),
    },
  };
};

export const validateLoginInput = (data) => {
  const errors = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Email invalide');
  }

  if (!validatePassword(data.mot_de_passe, 6)) {
    errors.push('Mot de passe requis');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      email: sanitizeString(data.email),
      mot_de_passe: data.mot_de_passe,
    },
  };
};

export default {
  validateEmail,
  validatePhone,
  validateName,
  validatePassword,
  sanitizeString,
  validateJoinWalletInput,
  validateLoginInput,
};
