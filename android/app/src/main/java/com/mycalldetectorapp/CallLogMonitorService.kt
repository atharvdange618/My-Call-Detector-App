package com.mycalldetectorapp

import android.app.*
import android.content.Context
import android.content.Intent
import android.database.ContentObserver
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.CallLog
import android.util.Log
import androidx.core.app.NotificationCompat
import android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE

class CallLogMonitorService : Service() {

    private lateinit var callLogObserver: ContentObserver
    private val TAG = "CallLogMonitorService"

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service onCreate called.")
        createNotificationChannel()

        try {
            val notification = NotificationCompat.Builder(this, "CallLogChannel")
                .setSmallIcon(R.mipmap.ic_launcher_round)
                .setContentTitle("Monitoring Call Logs")
                .setContentText("Watching call history for changes...")
                .setOngoing(true)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(101, notification, FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
            } else {
                startForeground(101, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting foreground service: ${e.message}", e)
        }

        callLogObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) {
                // CallLogModule reads the new rows and tracks which ones JS has seen.
                Log.d(TAG, "Call log changed.")
                val intent = Intent("com.mycalldetectorapp.CALL_LOG_UPDATE")
                intent.setPackage(applicationContext.packageName)
                sendBroadcast(intent)
            }
        }
        try {
            contentResolver.registerContentObserver(CallLog.Calls.CONTENT_URI, true, callLogObserver)
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException: READ_CALL_LOG permission denied. Cannot observe call log.", e)
        }
    }

    override fun onDestroy() {
        contentResolver.unregisterContentObserver(callLogObserver)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    return START_STICKY
}

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                "CallLogChannel",
                "Call Log Monitoring Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }
}