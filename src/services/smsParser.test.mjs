/**
 * Lightweight assertion tests for the SMS parser. Run with:
 *   node src/services/smsParser.test.mjs
 *
 * Cases are representative, redacted samples of the real bank/UPI/card formats
 * the parser targets (SBI, HDFC, ICICI, PNB, UPI, FASTag, ATM). No network,
 * no framework — just node.
 */
import { parse, classify } from './smsParser.js';

let pass = 0;
let fail = 0;

function eq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; }
  else { fail++; console.error(`  ✗ ${label}\n      expected ${JSON.stringify(expected)}\n      got      ${JSON.stringify(actual)}`); }
}

// --- Genuine spends: must parse with the right amount / merchant / category ---
const spends = [
  {
    body: 'INR 3,560.13 spent using ICICI Bank Card XX8006 on 15-Jul-26 on AMAZON PAY INDI. Avl Limit: INR 5,87,759.30.',
    amount: 3560.13, date: '2026-07-15', merchant: 'AMAZON PAY INDI', category: 'Shopping',
  },
  {
    body: 'Spent Rs.475 On HDFC Bank Card 2580 At .PVR INOX LIMITED_ On 2026-06-20:18:43:34.Not You?',
    amount: 475, date: '2026-06-20', merchant: 'PVR INOX LIMITED', category: 'Entertainment',
  },
  {
    body: 'Madam/Dear Sir, SBI FASTag Acc ending with 7F820 debited Rs.115 Toll Charges at Sonapetya on 27-Jun-2026 09:18:48 AM Bal Rs.1290',
    amount: 115, date: '2026-06-27', merchant: 'Sonapetya', category: 'Transportation',
  },
  {
    body: 'Your A/C XXXXX933234 Debited INR 19,178.00 on 16/07/26 -Transferred to Mr. SOMEONE. Avl Balance INR 47,728.47-SBI',
    amount: 19178, date: '2026-07-16', merchant: 'Mr SOMEONE', category: null,
  },
  {
    body: 'Dear SBI Customer, Rs.15000 withdrawn at SBI ATM S5NM00 from A/cX3234 on 01Jun26 Transaction Number 3036.',
    amount: 15000, date: '2026-06-01', merchant: 'ATM Withdrawal', category: 'Other',
  },
];

console.log('Genuine spends:');
for (const c of spends) {
  const r = parse({ sender: 'TEST', body: c.body });
  if (!r) { fail++; console.error(`  ✗ expected a parse, got null for: ${c.body.slice(0, 50)}`); continue; }
  eq(r.amount, c.amount, `amount for "${c.body.slice(0, 40)}"`);
  eq(r.date, c.date, `date for "${c.body.slice(0, 40)}"`);
  eq(r.merchant, c.merchant, `merchant for "${c.body.slice(0, 40)}"`);
  eq(r.category, c.category, `category for "${c.body.slice(0, 40)}"`);
}

// --- Non-expenses: must be rejected by the classifier ---
const nonExpenses = [
  'Get Rs.750 Flipkart e-Voucher by doing 3 Trxns. of Min. Rs.7,500 each with your SBI Credit Card.',
  'Your transaction of Rs 3,560.13 using ICICI Bank Credit Card XX8006 has been converted into EMI on 17-07-26.',
  'DEAR HDFCBANK CARDMEMBER, PAYMENT OF Rs. 1021.00 RECEIVED TOWARDS YOUR CREDIT CARD ENDING WITH 2580.',
  'Pay Total Amount Due of Rs 7,899.36 or Minimum Amount Due of Rs 400.00 by 30-May-26 towards ICICI Bank Credit Card.',
  '5384 is the OTP to verify your account. The OTP expires in 60 minutes.',
  'Dear SBI User, your A/c XNNNN-credited by Rs.30000 on 26May26 transfer from SOMEONE.',
  'Dear Customer, Outstanding Amount of Rs 1849.13 will be debited from your account per your Auto Debit request.',
];

console.log('Non-expenses (must be rejected):');
for (const body of nonExpenses) {
  eq(classify(body).isExpense, false, `reject "${body.slice(0, 45)}"`);
}

console.log(`\n${fail === 0 ? '✓ ALL PASS' : '✗ FAILURES'}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
