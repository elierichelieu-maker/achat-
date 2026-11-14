/**
 * Fonctions de validation des formulaires (champs obligatoires, formats email/téléphone, nombres positifs).
 */

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d\s().-]{6,25}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim());
}

/**
 * Valide le formulaire de création ou d'édition d'un produit.
 */
export function validateProductInput(data: {
  sku: string;
  name: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStockAlert: number;
  alcoholDegree: number;
  customAlertThreshold?: number;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.sku || !data.sku.trim()) {
    errors.sku = 'La référence SKU est obligatoire.';
  } else if (data.sku.trim().length < 2) {
    errors.sku = 'La référence SKU doit contenir au moins 2 caractères.';
  }

  if (!data.name || !data.name.trim()) {
    errors.name = 'La désignation du produit est obligatoire.';
  }

  if (typeof data.costPrice !== 'number' || Number.isNaN(data.costPrice) || data.costPrice <= 0) {
    errors.costPrice = "Le prix d'achat doit être un nombre strictement positif.";
  }

  if (typeof data.salePrice !== 'number' || Number.isNaN(data.salePrice) || data.salePrice <= 0) {
    errors.salePrice = 'Le prix de vente doit être un nombre strictement positif.';
  }

  if (typeof data.stock !== 'number' || Number.isNaN(data.stock) || data.stock < 0) {
    errors.stock = 'La quantité en stock ne peut pas être négative.';
  }

  if (typeof data.minStockAlert !== 'number' || Number.isNaN(data.minStockAlert) || data.minStockAlert < 1) {
    errors.minStockAlert = "Le seuil d'alerte minimum doit être d'au moins 1 unité.";
  }

  if (
    data.customAlertThreshold !== undefined &&
    (Number.isNaN(data.customAlertThreshold) || data.customAlertThreshold < 1)
  ) {
    errors.customAlertThreshold = 'Le seuil personnalisé doit être supérieur ou égal à 1.';
  }

  if (
    typeof data.alcoholDegree !== 'number' ||
    Number.isNaN(data.alcoholDegree) ||
    data.alcoholDegree < 0 ||
    data.alcoholDegree > 100
  ) {
    errors.alcoholDegree = "Le degré d'alcool doit être compris entre 0 et 100 %.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valide le formulaire de création d'un client CHR.
 */
export function validateCustomerInput(data: {
  company: string;
  name: string;
  email?: string;
  phone?: string;
  creditLimit: number;
  activeKegsConsigned?: number;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.company || !data.company.trim()) {
    errors.company = "Le nom de l'établissement est obligatoire.";
  }

  if (!data.name || !data.name.trim()) {
    errors.name = 'Le nom du contact principal est obligatoire.';
  }

  if (data.email && data.email.trim() && !isValidEmail(data.email)) {
    errors.email = "Le format de l'adresse email est invalide.";
  }

  if (data.phone && data.phone.trim() && !isValidPhone(data.phone)) {
    errors.phone = 'Le format du numéro de téléphone est invalide.';
  }

  if (typeof data.creditLimit !== 'number' || Number.isNaN(data.creditLimit) || data.creditLimit < 0) {
    errors.creditLimit = 'Le plafond de crédit doit être un nombre positif ou nul.';
  }

  if (
    data.activeKegsConsigned !== undefined &&
    (Number.isNaN(data.activeKegsConsigned) || data.activeKegsConsigned < 0)
  ) {
    errors.activeKegsConsigned = 'Le nombre de fûts consignés ne peut pas être négatif.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valide le formulaire d'ajout ou d'édition d'un utilisateur / commercial.
 */
export function validateSellerInput(data: {
  name: string;
  email: string;
  phone?: string;
  targetMonthlyRevenue: number;
  commissionRate: number;
  password?: string;
}, requirePassword = false): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Le nom complet est obligatoire.';
  }

  if (!data.email || !data.email.trim()) {
    errors.email = "L'adresse email est obligatoire.";
  } else if (!isValidEmail(data.email)) {
    errors.email = "Le format de l'adresse email est invalide.";
  }

  if (data.phone && data.phone.trim() && !isValidPhone(data.phone)) {
    errors.phone = 'Le format du numéro de téléphone est invalide.';
  }

  if (
    typeof data.targetMonthlyRevenue !== 'number' ||
    Number.isNaN(data.targetMonthlyRevenue) ||
    data.targetMonthlyRevenue <= 0
  ) {
    errors.targetMonthlyRevenue = "L'objectif mensuel doit être strictement positif.";
  }

  if (
    typeof data.commissionRate !== 'number' ||
    Number.isNaN(data.commissionRate) ||
    data.commissionRate < 0 ||
    data.commissionRate > 1
  ) {
    errors.commissionRate = 'Le taux de commission doit être compris entre 0 % et 100 %.';
  }

  if (requirePassword && (!data.password || data.password.trim().length < 4)) {
    errors.password = 'Le mot de passe doit contenir au moins 4 caractères.';
  } else if (data.password && data.password.trim().length > 0 && data.password.trim().length < 4) {
    errors.password = 'Le mot de passe doit contenir au moins 4 caractères.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
