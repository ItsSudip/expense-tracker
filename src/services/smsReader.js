/**
 * JS bridge to the custom native SmsReader plugin (android/.../SmsReaderPlugin.java).
 *
 * Backfill-only: reads the SMS inbox since a timestamp. On web (or if the native
 * plugin is unavailable) every method degrades gracefully so the app still runs.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

const SmsReader = registerPlugin('SmsReader');

export const isSmsAvailable = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/** @returns {Promise<'granted'|'denied'>} */
export async function checkSmsPermission() {
  if (!isSmsAvailable()) return 'denied';
  try {
    const { sms } = await SmsReader.checkPermissions();
    return sms;
  } catch {
    return 'denied';
  }
}

/** Prompts the user for READ_SMS. @returns {Promise<'granted'|'denied'>} */
export async function requestSmsPermission() {
  if (!isSmsAvailable()) return 'denied';
  try {
    const { sms } = await SmsReader.requestPermissions();
    return sms;
  } catch {
    return 'denied';
  }
}

/**
 * Read inbox messages newer than sinceTimestamp (epoch millis).
 * @param {{ sinceTimestamp?: number, limit?: number }} [opts]
 * @returns {Promise<Array<{ id: string, sender: string, body: string, date: number }>>}
 */
export async function readInbox({ sinceTimestamp = 0, limit = 500 } = {}) {
  if (!isSmsAvailable()) return [];
  const { messages } = await SmsReader.readInbox({ sinceTimestamp, limit });
  return messages || [];
}
