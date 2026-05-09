/**
 * @file gst.service.js
 * @description India GST computation engine.
 *
 * Responsibilities:
 *  1. GSTIN validation (format + checksum per GSTN specification)
 *  2. State-code extraction from GSTIN (first 2 digits → state)
 *  3. Intra-state vs Inter-state determination → CGST+SGST vs IGST routing
 *  4. Tax amount calculation per line item
 *  5. Default HSN/SAC rate lookups
 */

'use strict';

// ── Indian State Code ↔ Name Map (all 37 states/UTs) ─────────────────────────
const STATE_CODE_MAP = {
  '01': 'Jammu & Kashmir',    '02': 'Himachal Pradesh',   '03': 'Punjab',
  '04': 'Chandigarh',         '05': 'Uttarakhand',         '06': 'Haryana',
  '07': 'Delhi',              '08': 'Rajasthan',           '09': 'Uttar Pradesh',
  '10': 'Bihar',              '11': 'Sikkim',              '12': 'Arunachal Pradesh',
  '13': 'Nagaland',           '14': 'Manipur',             '15': 'Mizoram',
  '16': 'Tripura',            '17': 'Meghalaya',           '18': 'Assam',
  '19': 'West Bengal',        '20': 'Jharkhand',           '21': 'Odisha',
  '22': 'Chhattisgarh',       '23': 'Madhya Pradesh',      '24': 'Gujarat',
  '25': 'Daman & Diu',        '26': 'Dadra & Nagar Haveli','27': 'Maharashtra',
  '28': 'Andhra Pradesh',     '29': 'Karnataka',           '30': 'Goa',
  '31': 'Lakshadweep',        '32': 'Kerala',              '33': 'Tamil Nadu',
  '34': 'Puducherry',         '35': 'Andaman & Nicobar',   '36': 'Telangana',
  '37': 'Andhra Pradesh (New)', '38': 'Ladakh',
};

// GSTIN checksum character set
const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Validates a GSTIN string against the official Indian format and checksum.
 * Format: [2-digit state][10-digit PAN][1-digit entity][Z][1-digit checksum]
 * Example: 27AAPFU0939F1ZV
 *
 * @param {string} gstin
 * @returns {{ valid: boolean, error?: string, stateCode?: string, stateName?: string }}
 */
const validateGstin = (gstin) => {
  if (!gstin) return { valid: false, error: 'GSTIN is required' };

  const cleaned = gstin.trim().toUpperCase();

  // Format check
  const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!GSTIN_REGEX.test(cleaned)) {
    return {
      valid: false,
      error: 'Invalid GSTIN format. Expected: 2 digits + 10-char PAN + entity + Z + checksum',
    };
  }

  // State code validation
  const stateCode = cleaned.substring(0, 2);
  if (!STATE_CODE_MAP[stateCode]) {
    return { valid: false, error: `Unknown state code: ${stateCode}` };
  }

  // Checksum validation (mod-36 algorithm)
  let factor = 2;
  let sum = 0;
  const gstnLength = cleaned.length;

  for (let i = gstnLength - 2; i >= 0; i--) {
    let digit = GSTIN_CHARS.indexOf(cleaned[i]) * factor;
    factor = factor === 2 ? 3 : 2;
    sum += Math.floor(digit / 36) + (digit % 36);
  }
  const remainder = sum % 36;
  const expectedChecksum = GSTIN_CHARS[(36 - remainder) % 36];

  if (cleaned[gstnLength - 1] !== expectedChecksum) {
    return { valid: false, error: `Invalid GSTIN checksum. Expected last character: ${expectedChecksum}` };
  }

  return {
    valid: true,
    stateCode,
    stateName: STATE_CODE_MAP[stateCode],
    pan: cleaned.substring(2, 12),
  };
};

/**
 * Determines if a supply is inter-state (IGST) or intra-state (CGST+SGST).
 * Rules:
 *  - If supplier state code === buyer state code → INTRA-STATE → CGST + SGST
 *  - Otherwise → INTER-STATE → IGST
 *  - If buyer has no GSTIN (B2C), use place-of-supply logic
 *
 * @param {string} supplierStateCode - 2-digit code of the supplying org
 * @param {string} buyerStateCode    - 2-digit code of the buyer/customer
 * @returns {'INTRA' | 'INTER'}
 */
const getSupplyType = (supplierStateCode, buyerStateCode) => {
  if (!supplierStateCode || !buyerStateCode) return 'INTRA'; // Default to intra if unknown
  return supplierStateCode === buyerStateCode ? 'INTRA' : 'INTER';
};

/**
 * Calculate GST amounts for a single line item.
 *
 * @param {number} taxableAmount  - Base amount before tax
 * @param {number} gstRatePercent - Total GST % (e.g. 18 for 18%)
 * @param {'INTRA'|'INTER'} supplyType
 * @returns {{ cgst: number, sgst: number, igst: number, totalTax: number, totalWithTax: number }}
 */
const calculateGst = (taxableAmount, gstRatePercent, supplyType = 'INTRA') => {
  const rate = Number(gstRatePercent) || 0;
  const base = Number(taxableAmount) || 0;

  if (supplyType === 'INTER') {
    const igst = parseFloat(((base * rate) / 100).toFixed(2));
    return { cgst: 0, sgst: 0, igst, totalTax: igst, totalWithTax: parseFloat((base + igst).toFixed(2)) };
  } else {
    const halfRate = rate / 2;
    const cgst = parseFloat(((base * halfRate) / 100).toFixed(2));
    const sgst = parseFloat(((base * halfRate) / 100).toFixed(2));
    const totalTax = parseFloat((cgst + sgst).toFixed(2));
    return { cgst, sgst, igst: 0, totalTax, totalWithTax: parseFloat((base + totalTax).toFixed(2)) };
  }
};

/**
 * Default common GST rates seeded for new organizations.
 * Business type determines which codes are more relevant.
 */
const DEFAULT_GST_RATES = {
  TRADING: [
    { code: '0401', description: 'Milk and cream', gstRate: 0,  codeType: 'HSN' },
    { code: '1001', description: 'Wheat and Meslin', gstRate: 0, codeType: 'HSN' },
    { code: '3004', description: 'Medicines / Pharma', gstRate: 12, codeType: 'HSN' },
    { code: '6109', description: 'T-shirts, Garments', gstRate: 5,  codeType: 'HSN' },
    { code: '8471', description: 'Computers / Laptops', gstRate: 18, codeType: 'HSN' },
    { code: '8517', description: 'Mobile Phones', gstRate: 18, codeType: 'HSN' },
    { code: '9403', description: 'Furniture', gstRate: 18, codeType: 'HSN' },
    { code: '2710', description: 'Petroleum / Fuel Products', gstRate: 28, codeType: 'HSN' },
  ],
  MANUFACTURING: [
    { code: '7208', description: 'Flat-rolled Steel products', gstRate: 18, codeType: 'HSN' },
    { code: '3915', description: 'Waste & scrap of plastics', gstRate: 5,  codeType: 'HSN' },
    { code: '4403', description: 'Wood in the rough', gstRate: 18, codeType: 'HSN' },
    { code: '2601', description: 'Iron ores and concentrates', gstRate: 5,  codeType: 'HSN' },
    { code: '7601', description: 'Unwrought Aluminium', gstRate: 18, codeType: 'HSN' },
    { code: '8483', description: 'Transmission shafts / gears', gstRate: 18, codeType: 'HSN' },
    { code: '8501', description: 'Electric motors', gstRate: 18, codeType: 'HSN' },
  ],
  SERVICE: [
    { code: '998211', description: 'Legal services', gstRate: 18, codeType: 'SAC' },
    { code: '998314', description: 'IT software services', gstRate: 18, codeType: 'SAC' },
    { code: '998316', description: 'IT support services', gstRate: 18, codeType: 'SAC' },
    { code: '996111', description: 'Financial / accounting services', gstRate: 18, codeType: 'SAC' },
    { code: '997212', description: 'Real estate services', gstRate: 18, codeType: 'SAC' },
    { code: '999299', description: 'Consulting / management services', gstRate: 18, codeType: 'SAC' },
    { code: '998361', description: 'Educational support services', gstRate: 0,  codeType: 'SAC' },
    { code: '999311', description: 'Healthcare services', gstRate: 0,  codeType: 'SAC' },
  ],
};

/**
 * Get default GST rates to seed for a given business type.
 * Includes common rates that apply to all business types.
 *
 * @param {'MANUFACTURING'|'TRADING'|'SERVICE'} businessType
 * @returns {Array<Object>}
 */
const getDefaultRatesForBusinessType = (businessType) => {
  const typeRates = DEFAULT_GST_RATES[businessType] || DEFAULT_GST_RATES.TRADING;
  // Common rates applicable to all business types
  const common = [
    { code: '996211', description: 'Transport / freight services', gstRate: 5,  codeType: 'SAC' },
    { code: '997111', description: 'Office rent', gstRate: 18, codeType: 'SAC' },
  ];
  return [...typeRates, ...common].map(r => ({
    ...r,
    cgstRate: r.gstRate / 2,
    sgstRate: r.gstRate / 2,
    igstRate: r.gstRate,
  }));
};

// Export the state map as well for frontend dropdowns
const getAllStates = () => Object.entries(STATE_CODE_MAP).map(([code, name]) => ({ code, name }));

module.exports = {
  validateGstin,
  getSupplyType,
  calculateGst,
  getDefaultRatesForBusinessType,
  getAllStates,
  STATE_CODE_MAP,
};
