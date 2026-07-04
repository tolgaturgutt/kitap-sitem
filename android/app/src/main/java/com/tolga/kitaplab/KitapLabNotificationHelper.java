package com.tolga.kitaplab;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

final class KitapLabNotificationHelper {
    static final String CHANNEL_ID = "kitaplab_push_v3";

    private KitapLabNotificationHelper() {}

    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "KitapLab Bildirimleri",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("KitapLab mobil bildirimleri");
        channel.enableVibration(true);

        Uri defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build();
        channel.setSound(defaultSound, audioAttributes);

        manager.createNotificationChannel(channel);
    }

    static void showNotification(Context context, RemoteMessage remoteMessage) {
        ensureChannel(context);

        Map<String, String> data = remoteMessage.getData();
        RemoteMessage.Notification remoteNotification = remoteMessage.getNotification();

        String title = firstNonEmpty(
            data.get("title"),
            remoteNotification != null ? remoteNotification.getTitle() : null,
            "KitapLab"
        );
        String body = firstNonEmpty(
            data.get("body"),
            remoteNotification != null ? remoteNotification.getBody() : null,
            "Yeni bildirimin var."
        );

        String messageId = firstNonEmpty(
            data.get("notification_id"),
            remoteMessage.getMessageId(),
            String.valueOf(System.currentTimeMillis())
        );
        int notificationId = messageId.hashCode() & 0x7fffffff;

        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("google.message_id", messageId);
        for (Map.Entry<String, String> entry : data.entrySet()) {
            intent.putExtra(entry.getKey(), entry.getValue());
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Uri defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_kitaplab_push_v3)
            .setColor(ContextCompat.getColor(context, R.color.notification_icon_color))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_SOCIAL)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            builder.setSound(defaultSound);
            builder.setVibrate(new long[] { 0, 250, 150, 250 });
        }

        try {
            NotificationManagerCompat.from(context).notify(notificationId, builder.build());
        } catch (SecurityException ignored) {
            // Android 13+ bildirim izni kapaliysa sessizce atla.
        }
    }

    private static String firstNonEmpty(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) return value;
        }
        return "";
    }
}
