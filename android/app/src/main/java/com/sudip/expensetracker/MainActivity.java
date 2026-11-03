package com.sudip.expensetracker;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

// Implements the plugin's marker interface so @capgo/capacitor-social-login
// permits custom Google scopes (Sheets/Drive). Without this, login() rejects
// with "You CANNOT use scopes without modifying the main activity".
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register our custom SMS inbox reader plugin before the bridge loads.
        registerPlugin(SmsReaderPlugin.class);
        super.onCreate(savedInstanceState);
    }

    // The Google authorization flow returns via onActivityResult; forward it to
    // the plugin's Google handler when the request code is in its range.
    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN &&
            requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
            if (pluginHandle == null) {
                return;
            }
            SocialLoginPlugin plugin = (SocialLoginPlugin) pluginHandle.getInstance();
            plugin.handleGoogleLoginIntent(requestCode, data);
        }
    }

    // Marker method required by ModifiedMainActivityForSocialLoginPlugin. No-op.
    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
}
