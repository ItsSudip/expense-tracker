/**
 * SMS transaction parser.
 *
 * Turns a raw bank/UPI/card SMS into a structured expense draft, entirely on
 * device with regex. Designed and tested against the user's real message
 * formats (SBI, HDFC, ICICI, PNB, IDFC, UPI, FASTag, ATM).
 *
 * Pipeline: classify() decides whether a message is a genuine spend worth
 * drafting; parse() extracts the fields. Messages that classify as spend but
 * parse with low confidence are candidates for the on-device LLM fallback
 * (Phase 4b) — parse() reports a `confidence` and `needsLlm` flag for that.
 *
 * Nothing here touches the network; it is safe to run on every message.
 */

// ---------------------------------------------------------------------------
// Shared patterns
// ---------------------------------------------------------------------------

// Amount: "Rs.450.00", "Rs 1,021", "INR 3,560.13". Captures the numeric part.
const AMOUNT_RE = /(?:INR|Rs)\.?\s?([\d,]+(?:\.\d{1,2})?)/i;

// Direction keywords.
const DEBIT_RE = /\b(debited|deducted|spent|withdrawn|debit|paid|purchase)\b/i;
const CREDIT_RE = /\b(credited|credit|received|deposited)\b/i;

// Messages that contain an amount but are NOT a real-time spend. These are
// excluded so promos/reminders/statements never become expense drafts.
const NON_TXN_RE = new RegExp(
  [
    'OTP', 'one\\s?time\\s?password', 'verification code', 'login attempt',
    'enjoy', 'voucher', '% ?off', 'discount', 'cashback offer', 'reward point',
    'convert(ed)? .*EMI', 'flexipay', 'processing fee', 'personal loan',
    'pre-?approved', 'eligible for', 'apply now', 'claim',
    'total amount due', 'minimum amount due', 'min\\.? amount due',
    'due for payment', 'bill dated', 'is due on', 'statement',
    'avail the', 'expiring soon', 'T&C', 'TnC',
    // Future-tense / informational — not a completed spend.
    'will be debited', 'will be charged', 'reissuance fee', 'fee will change',
    'repayment schedule', 'welcome to', 'thank you for booking',
    'auto debit request', 'e-?mandate', 'scheduled',
  ].join('|'),
  'i',
);

// Credit-card BILL PAYMENTS (money leaving to pay a card) — real money movement
// but not an expense to categorize; treated as excluded by default.
const CARD_PAYMENT_RE =
  /(payment|online payment) of .*(credited to your card|towards your credit card|received towards)/i;

// ---------------------------------------------------------------------------
// Date parsing — banks use many formats; normalize to YYYY-MM-DD.
// ---------------------------------------------------------------------------

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function normalizeYear(y) {
  const n = parseInt(y, 10);
  if (y.length === 2) return 2000 + n;
  return n;
}

/**
 * Extract the first plausible transaction date and return YYYY-MM-DD, or null.
 * Handles: 16/07/26, 16-7-2026, 15-Jul-26, 26May26, 2026-06-20, 25 JUN'26.
 */
function extractDate(body) {
  // 2026-06-20 (ISO, sometimes followed by :time)
  let m = body.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;

  // 15-Jul-26 / 15-Jul-2026 / 15 Jul 26 / 25 JUN'26
  m = body.match(/\b(\d{1,2})[-\s']?([A-Za-z]{3})[-\s']?(\d{2,4})\b/);
  if (m && MONTHS[m[2].toLowerCase()]) {
    return `${normalizeYear(m[3])}-${MONTHS[m[2].toLowerCase()]}-${pad(m[1])}`;
  }

  // 26May26 (no separators)
  m = body.match(/\b(\d{1,2})([A-Za-z]{3})(\d{2,4})\b/);
  if (m && MONTHS[m[2].toLowerCase()]) {
    return `${normalizeYear(m[3])}-${MONTHS[m[2].toLowerCase()]}-${pad(m[1])}`;
  }

  // 16/07/26 or 16-07-2026 (numeric DD/MM/YY)
  m = body.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (m) return `${normalizeYear(m[3])}-${pad(m[2])}-${pad(m[1])}`;

  return null;
}

// ---------------------------------------------------------------------------
// Merchant extraction — bank-specific "at/to/on <MERCHANT>" phrasing.
// ---------------------------------------------------------------------------

function cleanMerchant(s) {
  if (!s) return null;
  return s
    .replace(/[._]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.\-]+|[\s.\-]+$/g, '')
    .trim() || null;
}

function extractMerchant(body) {
  let m;
  // UPI/transfer (check FIRST so a "-Transferred to X. Avl" isn't swallowed by
  // the card "on X Avl" rule below): "Transferred to Mr. X. Avl" /
  // "transfer from MR X Ref". Starts at the name after the keyword.
  m = body.match(/transfer(?:red)?\s+(?:from|to)\s+((?:Mr\.?|Mrs\.?|Ms\.?)?\s*[A-Za-z][A-Za-z .]{2,40}?)(?:\s+Ref|\.?\s+Avl|\.|-|$)/i);
  if (m) return cleanMerchant(m[1]);

  // ICICI card: "on AMAZON PAY INDI. Avl Limit". Merchant must start with a
  // letter (not a digit) so a date like "on 16/07/26 ..." is not captured.
  m = body.match(/\bon\s+([A-Za-z][A-Za-z0-9 &'./_-]{2,40}?)\.?\s+Avl/i);
  if (m) return cleanMerchant(m[1]);

  // HDFC card: "At .PVR INOX LIMITED_ On 2026-06-20:18:43:34" — merchant may
  // carry leading/trailing . or _, and the date after "On" uses colons.
  m = body.match(/\bAt\s+[.\s]*([A-Za-z0-9][A-Za-z0-9 &'._-]{2,40}?)\s+On\s+\d/i);
  if (m) return cleanMerchant(m[1]);

  // "requested Rs.. frm u" (UPI collect) — merchant is the requester at start.
  m = body.match(/^([A-Z][A-Za-z0-9 &'.-]{3,40}?)\s+has requested/i);
  if (m) return cleanMerchant(m[1]);

  // FASTag: "Toll Charges at <PLAZA> on"
  m = body.match(/(?:Charges|toll)\s+at\s+([A-Za-z0-9][A-Za-z0-9 &'./-]{2,40}?)\s+on\b/i);
  if (m) return cleanMerchant(m[1]);

  // ATM withdrawal
  if (/\bATM\b/i.test(body) && /withdrawn/i.test(body)) return 'ATM Withdrawal';

  // Bank transfer with no named payee (NEFT/IMPS/RTGS). Not enough to name the
  // merchant, but a meaningful label so it need not go to the LLM.
  if (/\b(NEFT|IMPS|RTGS)\b/i.test(body)) {
    const t = body.match(/\b(NEFT|IMPS|RTGS)\b/i)[1].toUpperCase();
    return `${t} Transfer`;
  }

  return null;
}

// Account tail e.g. "A/c XX7351", "Card XX8006", "ending 2580", "A/cX3234".
function extractAccount(body) {
  const m = body.match(/(?:a\/c|card|ending(?:\s+with)?)\s*[Xx*]*\s*(\d{3,6})/i);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Category suggestion — map known merchants/contexts to the app's default
// categories. Best-effort; the user confirms/overrides before saving.
// ---------------------------------------------------------------------------

const CATEGORY_RULES = [
  [/amazon|flipkart|myntra|ajio|souled|bata|shopping|store|mall/i, 'Shopping'],
  [/pvr|inox|bookmyshow|netflix|spotify|hotstar|movie|cinema/i, 'Entertainment'],
  [/uber|ola|rapido|irctc|petrol|fuel|toll|fastag|parking|metro|railway/i, 'Transportation'],
  [/swiggy|zomato|restaurant|cafe|food|dominos|pizza|hotel/i, 'Food & Dining'],
  [/jio|airtel|vodafone|electricity|water|gas|broadband|recharge|bill/i, 'Bills & Utilities'],
  [/pharmacy|hospital|medical|clinic|apollo|health/i, 'Healthcare'],
  [/atm withdrawal/i, 'Other'],
];

function suggestCategory(merchant, body) {
  const hay = `${merchant || ''} ${body}`;
  for (const [re, cat] of CATEGORY_RULES) {
    if (re.test(hay)) return cat;
  }
  return null; // let the user pick
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Decide whether a message is a genuine spend we should draft as an expense.
 * Returns { isExpense: boolean, reason: string }.
 */
export function classify(body) {
  if (!body) return { isExpense: false, reason: 'empty' };
  if (NON_TXN_RE.test(body)) return { isExpense: false, reason: 'promo/reminder/otp' };
  if (CARD_PAYMENT_RE.test(body)) return { isExpense: false, reason: 'card-bill-payment' };
  if (!AMOUNT_RE.test(body)) return { isExpense: false, reason: 'no-amount' };

  const isDebit = DEBIT_RE.test(body);
  const isCredit = CREDIT_RE.test(body);
  // We track expenses (debits). Credits are money in — surfaced as income later,
  // but for the expense flow we only draft debits.
  if (!isDebit && isCredit) return { isExpense: false, reason: 'credit-not-expense' };
  if (!isDebit) return { isExpense: false, reason: 'no-debit-keyword' };

  return { isExpense: true, reason: 'debit' };
}

/**
 * Parse a single SMS into an expense draft.
 *
 * @param {{sender?: string, body: string, date?: number}} sms
 * @returns {null | {
 *   amount: number, type: 'debit'|'credit', date: string|null,
 *   merchant: string|null, account: string|null, category: string|null,
 *   description: string, sender: string|null, confidence: number,
 *   needsLlm: boolean, raw: string, smsId: string
 * }}
 */
export function parse(sms) {
  const body = (sms && sms.body) || '';
  const cls = classify(body);
  if (!cls.isExpense) return null;

  const amountMatch = body.match(AMOUNT_RE);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
  if (amount == null || Number.isNaN(amount)) return null;

  const date = extractDate(body);
  const merchant = extractMerchant(body);
  const account = extractAccount(body);
  const category = suggestCategory(merchant, body);

  // Confidence: amount is required; merchant and date each add certainty.
  let confidence = 0.5;
  if (merchant) confidence += 0.3;
  if (date) confidence += 0.2;

  return {
    amount,
    type: 'debit',
    date,
    merchant,
    account,
    category,
    description: merchant ? `${merchant}${account ? ` (…${account})` : ''}` : (body.slice(0, 60)),
    sender: (sms && sms.sender) || null,
    confidence: Math.min(1, confidence),
    // Route to the LLM fallback when we got an amount but couldn't find the
    // merchant (the field most useful for categorizing).
    needsLlm: !merchant,
    raw: body,
    smsId: smsHash(sms),
  };
}

/**
 * Stable dedup key for a message so the same SMS is never imported twice.
 * Uses sender+body (+ date bucket) so re-scanning the inbox is idempotent.
 */
export function smsHash(sms) {
  const s = `${(sms && sms.sender) || ''}|${(sms && sms.body) || ''}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return `sms_${(h >>> 0).toString(16)}`;
}

// Exposed for testing/tuning.
export const _internals = { extractDate, extractMerchant, extractAccount, suggestCategory };
