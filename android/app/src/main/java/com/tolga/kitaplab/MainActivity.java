package com.tolga.kitaplab;

import android.os.Bundle;
import android.util.Log;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d("KitapLabAds", "MainActivity onCreate - Reklam sistemi baslatiliyor...");
        registerPlugin(PushNotificationsPlugin.class);
        
        super.onCreate(savedInstanceState);

        // Google Mobile Ads SDK baslatma
        MobileAds.initialize(this, new OnInitializationCompleteListener() {
            @Override
            public void onInitializationComplete(InitializationStatus initializationStatus) {
                Log.d("KitapLabAds", "AdMob SDK Initialization Tamamlandi: " + initializationStatus.toString());
            }
        });

        KitapLabNotificationHelper.ensureChannel(this);
    }
}
