package com.sudip.expensetracker;

import android.Manifest;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Minimal SMS inbox reader for the expense tracker's "import at end of day"
 * flow. Backfill only — no live BroadcastReceiver — so it needs just READ_SMS.
 *
 * readInbox({ sinceTimestamp?: number, limit?: number }) returns messages from
 * the SMS inbox newer than sinceTimestamp (epoch millis), newest first. Parsing
 * and classification happen in JS (smsParser.js); this only surfaces raw rows.
 */
@CapacitorPlugin(
    name = "SmsReader",
    permissions = {
        @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS })
    }
)
public class SmsReaderPlugin extends Plugin {

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("sms", hasSmsPermission() ? "granted" : "denied");
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (hasSmsPermission()) {
            JSObject result = new JSObject();
            result.put("sms", "granted");
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("sms", call, "smsPermissionCallback");
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("sms", hasSmsPermission() ? "granted" : "denied");
        call.resolve(result);
    }

    @PluginMethod
    public void readInbox(PluginCall call) {
        if (!hasSmsPermission()) {
            call.reject("READ_SMS permission not granted");
            return;
        }

        long since = call.getLong("sinceTimestamp", 0L);
        int limit = call.getInt("limit", 500);

        JSArray messages = new JSArray();
        Cursor cursor = null;
        try {
            Uri inbox = Uri.parse("content://sms/inbox");
            String selection = since > 0 ? "date > ?" : null;
            String[] args = since > 0 ? new String[] { String.valueOf(since) } : null;

            cursor = getContext().getContentResolver().query(
                inbox,
                new String[] { "_id", "address", "body", "date" },
                selection,
                args,
                "date DESC"
            );

            if (cursor != null) {
                int idIdx = cursor.getColumnIndex("_id");
                int addrIdx = cursor.getColumnIndex("address");
                int bodyIdx = cursor.getColumnIndex("body");
                int dateIdx = cursor.getColumnIndex("date");
                int count = 0;
                while (cursor.moveToNext() && count < limit) {
                    JSObject msg = new JSObject();
                    msg.put("id", cursor.getString(idIdx));
                    msg.put("sender", cursor.getString(addrIdx));
                    msg.put("body", cursor.getString(bodyIdx));
                    msg.put("date", cursor.getLong(dateIdx));
                    messages.put(msg);
                    count++;
                }
            }

            JSObject ret = new JSObject();
            ret.put("messages", messages);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read SMS inbox: " + e.getMessage());
        } finally {
            if (cursor != null) cursor.close();
        }
    }

    private boolean hasSmsPermission() {
        return getContext().checkSelfPermission(Manifest.permission.READ_SMS)
            == PackageManager.PERMISSION_GRANTED;
    }
}
