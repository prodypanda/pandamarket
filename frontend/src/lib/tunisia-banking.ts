/**
 * Tunisian Banking & RIB Validation Utilities
 *
 * Structure of the 20-digit Tunisian Relevé d'Identité Bancaire (RIB):
 * Format: BB GGG CCCCCCCCCCCCC KK
 * - BB (2 digits): Code Banque (Bank code)
 * - GGG (3 digits): Code Guichet (Branch code)
 * - CCCCCCCCCCCCC (13 digits): Numéro de Compte (Account number)
 * - KK (2 digits): Clé RIB (Checksum / Check digits)
 *
 * Modulo 97 Verification Algorithm:
 * Clé RIB = 97 - ((BigInt(base18 + '00')) % 97n)
 */

export interface BankInfo {
  code: string;
  name: string;
  nameFr: string;
  nameAr: string;
  bic: string;
  acronym: string;
}

/**
 * Comprehensive bank lookup directory mapping 2-digit codes to financial institutions in Tunisia.
 */
export const TUNISIAN_BANKS: Record<string, BankInfo> = {
  '01': {
    code: '01',
    name: 'Arab Tunisian Bank',
    nameFr: 'Arab Tunisian Bank (ATB)',
    nameAr: 'البنك العربي لتونس',
    bic: 'ATBKTNTT',
    acronym: 'ATB',
  },
  '02': {
    code: '02',
    name: 'Banque Franco-Tunisienne',
    nameFr: 'Banque Franco-Tunisienne (BFT)',
    nameAr: 'البنك الفرنسي التونسي',
    bic: 'BFTNTNTT',
    acronym: 'BFT',
  },
  '03': {
    code: '03',
    name: 'Banque Nationale Agricole',
    nameFr: 'Banque Nationale Agricole (BNA)',
    nameAr: 'البنك الوطني الفلاحي',
    bic: 'BNANTNTT',
    acronym: 'BNA',
  },
  '04': {
    code: '04',
    name: 'Attijari Bank',
    nameFr: 'Attijari Bank Tunisie',
    nameAr: 'التجاري بنك',
    bic: 'BSTUTNTT',
    acronym: 'ATTIJARI',
  },
  '05': {
    code: '05',
    name: 'Banque de Tunisie',
    nameFr: 'Banque de Tunisie (BT)',
    nameAr: 'بنك تونس',
    bic: 'BTBKTNTT',
    acronym: 'BT',
  },
  '07': {
    code: '07',
    name: 'Amen Bank',
    nameFr: 'Amen Bank',
    nameAr: 'بنك الأمان',
    bic: 'CFCTTNTT',
    acronym: 'AMEN',
  },
  '08': {
    code: '08',
    name: 'Banque Internationale Arabe de Tunisie',
    nameFr: 'Banque Internationale Arabe de Tunisie (BIAT)',
    nameAr: 'بنك تونس العربي الدولي',
    bic: 'BIATTNTT',
    acronym: 'BIAT',
  },
  '10': {
    code: '10',
    name: 'Société Tunisienne de Banque',
    nameFr: 'Société Tunisienne de Banque (STB)',
    nameAr: 'الشركة التونسية للبنك',
    bic: 'STBKTNTT',
    acronym: 'STB',
  },
  '11': {
    code: '11',
    name: "Union Bancaire pour le Commerce et l'Industrie",
    nameFr: "Union Bancaire pour le Commerce et l'Industrie (UBCI)",
    nameAr: 'الاتحاد البنكي للتجارة والصناعة',
    bic: 'UBCITNTT',
    acronym: 'UBCI',
  },
  '12': {
    code: '12',
    name: 'Union Internationale de Banques',
    nameFr: 'Union Internationale de Banques (UIB)',
    nameAr: 'الاتحاد الدولي للبنوك',
    bic: 'UIBKTNTT',
    acronym: 'UIB',
  },
  '14': {
    code: '14',
    name: "Banque de l'Habitat",
    nameFr: "Banque de l'Habitat (BH Bank)",
    nameAr: 'بنك الإسكان',
    bic: 'BHBKTNTT',
    acronym: 'BH',
  },
  '16': {
    code: '16',
    name: 'Banque Tuniso-Koweitienne',
    nameFr: 'Banque Tuniso-Koweitienne (BTK)',
    nameAr: 'البنك التونسي الكويتي',
    bic: 'BTKOTNTT',
    acronym: 'BTK',
  },
  '17': {
    code: '17',
    name: 'Banque de Tunisie et des Emirats',
    nameFr: 'Banque de Tunisie et des Emirats (BTE)',
    nameAr: 'بنك تونس والإمارات',
    bic: 'BTEMTNTT',
    acronym: 'BTE',
  },
  '20': {
    code: '20',
    name: 'Banque Tunisienne de Solidarité',
    nameFr: 'Banque Tunisienne de Solidarité (BTS)',
    nameAr: 'البنك التونسي للتضامن',
    bic: 'BTSSTNTT',
    acronym: 'BTS',
  },
  '21': {
    code: '21',
    name: 'Banque de Financement des PME',
    nameFr: 'Banque de Financement des PME (BFPME)',
    nameAr: 'بنك تمويل المؤسسات الصغرى والمتوسطة',
    bic: 'BFPMTNTT',
    acronym: 'BFPME',
  },
  '23': {
    code: '23',
    name: 'Qatar National Bank Tunisie',
    nameFr: 'Qatar National Bank Tunisie (QNB)',
    nameAr: 'بنك قطر الوطني تونس',
    bic: 'QNBASTNT',
    acronym: 'QNB',
  },
  '24': {
    code: '24',
    name: 'Banque Tuniso-Libyenne',
    nameFr: 'Banque Tuniso-Libyenne (BTL)',
    nameAr: 'المصرف التونسي الليبي',
    bic: 'BTLBTNTT',
    acronym: 'BTL',
  },
  '25': {
    code: '25',
    name: 'Banque Zitouna',
    nameFr: 'Banque Zitouna',
    nameAr: 'بنك الزيتونة',
    bic: 'ZITOTNTT',
    acronym: 'ZITOUNA',
  },
  '26': {
    code: '26',
    name: 'Bank ABC Tunisie',
    nameFr: 'Bank ABC Tunisie (Arab Banking Corporation)',
    nameAr: 'بنك المؤسسة العربية المصرفية',
    bic: 'ABCOTNTT',
    acronym: 'ABC',
  },
  '28': {
    code: '28',
    name: 'Wifak International Bank',
    nameFr: 'Wifak International Bank',
    nameAr: 'مصرف الوفاق الدولي',
    bic: 'WIFAKTNT',
    acronym: 'WIFAK',
  },
  '29': {
    code: '29',
    name: 'Banque Al Baraka',
    nameFr: 'Banque Al Baraka d’Algérie et Tunisie',
    nameAr: 'بنك البركة',
    bic: 'BARKTNTT',
    acronym: 'AL_BARAKA',
  },
  '32': {
    code: '32',
    name: 'Tunis International Bank',
    nameFr: 'Tunis International Bank (TIB)',
    nameAr: 'بنك تونس الدولي',
    bic: 'TIBNTNTT',
    acronym: 'TIB',
  },
  '47': {
    code: '47',
    name: 'La Poste Tunisienne',
    nameFr: 'La Poste Tunisienne (CCP)',
    nameAr: 'البريد التونسي',
    bic: 'LPTNTNTT',
    acronym: 'POSTE',
  },
};

export interface RibValidationResult {
  isValid: boolean;
  bankCode?: string;
  branchCode?: string;
  accountNumber?: string;
  ribKey?: string;
  bankName?: string;
  bank?: BankInfo;
  formattedRib?: string;
  error?: string;
}

/**
 * Computes the 2-digit Tunisian Clé RIB from the first 18 digits (Code Banque + Code Guichet + Numéro de Compte).
 * Formula: 97 - ((BigInt(clean18 + '00')) % 97n)
 *
 * @param base18 - The first 18 digits of the RIB
 * @returns 2-digit checksum key padded with leading zero, or empty string if invalid input length
 */
export function computeTunisianRibKey(base18: string): string {
  const clean18 = (base18 || '').replace(/\D/g, '');
  if (clean18.length !== 18) {
    return '';
  }
  const remainder = Number(BigInt(clean18 + '00') % BigInt(97));
  const key = 97 - remainder;
  return key.toString().padStart(2, '0');
}

/**
 * Validates a 20-digit Tunisian RIB against structure, registered bank directory, and Modulo 97 checksum.
 *
 * @param rawRib - Raw RIB string (with or without spaces/dashes)
 * @returns Validation result containing validity flag, extracted components, bank metadata, and error explanation
 */
export function validateTunisianRib(rawRib: string): RibValidationResult {
  if (!rawRib || typeof rawRib !== 'string') {
    return {
      isValid: false,
      error: 'Le RIB doit contenir exactement 20 chiffres.',
    };
  }

  const digits = rawRib.replace(/\D/g, '');

  if (digits.length === 0) {
    return {
      isValid: false,
      error: 'Le RIB est requis.',
    };
  }

  if (digits.length !== 20) {
    return {
      isValid: false,
      error: `Le RIB doit contenir exactement 20 chiffres (actuellement ${digits.length}).`,
    };
  }

  if (/[^\d\s\-_./]/.test(rawRib)) {
    return {
      isValid: false,
      error: 'Le RIB ne doit contenir que des chiffres.',
    };
  }

  const bankCode = digits.slice(0, 2);
  const branchCode = digits.slice(2, 5);
  const accountNumber = digits.slice(5, 18);
  const ribKey = digits.slice(18, 20);
  const base18 = digits.slice(0, 18);

  const bank = TUNISIAN_BANKS[bankCode];
  if (!bank) {
    return {
      isValid: false,
      bankCode,
      branchCode,
      accountNumber,
      ribKey,
      error: `Code banque inconnu (${bankCode}). Veuillez vérifier les 2 premiers chiffres.`,
    };
  }

  const expectedKey = computeTunisianRibKey(base18);
  const isValid = ribKey === expectedKey;

  return {
    isValid,
    bankCode,
    branchCode,
    accountNumber,
    ribKey,
    bankName: bank.nameFr,
    bank,
    formattedRib: `${bankCode} ${branchCode} ${accountNumber} ${ribKey}`,
    error: isValid
      ? undefined
      : `Clé RIB invalide (attendu: ${expectedKey}, fourni: ${ribKey}). Veuillez vérifier votre numéro de compte.`,
  };
}

/**
 * Formats a raw or partial RIB into the standard Tunisian grouped layout:
 * "BB GGG CCCCCCCCCCCCC KK"
 *
 * @param raw - Partial or full RIB string
 * @returns Nicely grouped digits separated by single spaces
 */
export function formatTunisianRib(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 20);
  if (!digits) return '';

  const parts: string[] = [];
  // BB (2 digits)
  if (digits.length <= 2) {
    return digits;
  }
  parts.push(digits.slice(0, 2));

  // GGG (3 digits)
  if (digits.length <= 5) {
    parts.push(digits.slice(2));
    return parts.join(' ');
  }
  parts.push(digits.slice(2, 5));

  // CCCCCCCCCCCCC (13 digits)
  if (digits.length <= 18) {
    parts.push(digits.slice(5));
    return parts.join(' ');
  }
  parts.push(digits.slice(5, 18));

  // KK (2 digits)
  parts.push(digits.slice(18, 20));
  return parts.join(' ');
}

/**
 * Strips all non-digit characters and limits length to 20.
 */
export function cleanTunisianRib(raw: string): string {
  return (raw || '').replace(/\D/g, '').slice(0, 20);
}

/**
 * Identifies the bank associated with a bank code or RIB prefix.
 *
 * @param codeOrRib - 2-digit code or partial/full RIB
 * @returns BankInfo if recognized, or undefined
 */
export function getTunisianBank(codeOrRib: string): BankInfo | undefined {
  const digits = (codeOrRib || '').replace(/\D/g, '');
  if (digits.length < 2) return undefined;
  const bankCode = digits.slice(0, 2);
  return TUNISIAN_BANKS[bankCode];
}
