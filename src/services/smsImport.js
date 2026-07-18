/**
 * Orchestrates the "import at end of day" flow:
 *   scan inbox since last import → parse → classify → dedup → return drafts.
 *
 * Dedup and the last-import watermark are persisted in localStorage so
 * re-running never re-imports the same message and only scans what's new.
 */
import { readInbox, requestSmsPermission, checkSmsPermission, isSmsAvailable } from './smsReader';
import { parse } from './smsParser';

const IMPORTED_IDS_KEY = 'sms_imported_ids';

function loadImportedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(IMPORTED_IDS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveImportedIds(set) {
  // Cap the stored set so it can't grow without bound.
  const arr = [...set].slice(-2000);
  localStorage.setItem(IMPORTED_IDS_KEY, JSON.stringify(arr));
}

/** Mark a set of smsIds as imported (called after the user saves drafts). */
export function markImported(smsIds) {
  const ids = loadImportedIds();
  smsIds.forEach((id) => ids.add(id));
  saveImportedIds(ids);
}

export { isSmsAvailable };

/**
 * Ensure READ_SMS is granted, prompting if needed.
 * @returns {Promise<boolean>} whether permission is granted
 */
export async function ensurePermission() {
  if (!isSmsAvailable()) return false;
  let status = await checkSmsPermission();
  if (status !== 'granted') status = await requestSmsPermission();
  return status === 'granted';
}

/**
 * Scan for new transaction SMS and return parsed drafts.
 *
 * Always scans a lookback window and hides anything already imported (tracked
 * by smsId). No forward-only watermark — so opening the app after several days,
 * or re-opening the modal, reliably surfaces everything not yet saved.
 *
 * @param {{ lookbackDays?: number, includeImported?: boolean }} [opts]
 *   lookbackDays: how far back to scan (default 30).
 *   includeImported: if true, also show already-imported messages (debug/rescan).
 * @returns {Promise<{ drafts: Array, scanned: number }>}
 */
export async function scanForDrafts({ lookbackDays = 30, includeImported = false } = {}) {
  const importedIds = includeImported ? new Set() : loadImportedIds();
  const since = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

  const messages = await readInbox({ sinceTimestamp: since, limit: 1000 });

  const drafts = [];
  for (const msg of messages) {
    const draft = parse({ sender: msg.sender, body: msg.body, date: msg.date });
    if (!draft) continue; // not a genuine expense
    if (importedIds.has(draft.smsId)) continue; // already imported

    drafts.push({
      ...draft,
      // Prefer the SMS's own timestamp for the date if the body had none.
      date: draft.date || new Date(msg.date).toISOString().slice(0, 10),
      smsDate: msg.date,
    });
  }

  // Newest first for review.
  drafts.sort((a, b) => b.smsDate - a.smsDate);

  return { drafts, scanned: messages.length };
}
