package org.pramana.study

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/** Keeps a live voice conversation running while the app is minimized or the screen is off.
 * Android requires a visible notification (and shows the microphone indicator) for as long
 * as the microphone is in use; the service stops as soon as the conversation ends. */
class PramanaLiveService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26) {
      val channel = NotificationChannel(CHANNEL, "Live conversation", NotificationManager.IMPORTANCE_LOW)
      channel.description = "Shown while Rishi is listening in a live conversation."
      channel.setShowBadge(false)
      manager.createNotificationChannel(channel)
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val open = launch?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, CHANNEL) else Notification.Builder(this)
    val notification = builder
      .setContentTitle("Pramana · live conversation")
      .setContentText("Rishi is listening. Tap to return to the app.")
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setOngoing(true)
      .apply { if (open != null) setContentIntent(open) }
      .build()
    if (Build.VERSION.SDK_INT >= 29) startForeground(ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
    else startForeground(ID, notification)
    return START_NOT_STICKY
  }
  companion object {
    const val CHANNEL = "pramana_live"
    const val ID = 4207
  }
}
