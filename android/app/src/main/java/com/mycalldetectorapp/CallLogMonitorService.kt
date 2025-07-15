package com.mycalldetectorapp

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL
import java.util.*

class CallLogMonitorService : Service() {

    private var lastTimestamp: Long = 0L
    private val timer = Timer()
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
                startForeground(101, notification, FOREGROUND_SERVICE_TYPE_PHONE_CALL)
            } else {
                startForeground(101, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting foreground service: ${e.message}", e)
        }

       try {
            lastTimestamp = CallLogHelper.getLastCall(this)?.timestamp ?: 0L
        } catch (e: IllegalArgumentException) {
            Log.e(TAG, "IllegalArgumentException when getting last call in onCreate: ${e.message}", e)
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException: READ_CALL_LOG permission denied. Cannot access call log.", e)
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected exception when getting last call in onCreate: ${e.message}", e)
        }

        timer.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                try {
                    val latestCall = CallLogHelper.getLastCall(this@CallLogMonitorService)
                    latestCall?.let {
                        if (it.timestamp > lastTimestamp) {
                            lastTimestamp = it.timestamp
                            val typeLabelForLog = CallLogHelper.getCallTypeLabel(it.type)

                            val intent = Intent("com.mycalldetectorapp.CALL_LOG_UPDATE")
                            intent.setPackage(applicationContext.packageName)
                            intent.putExtra("number", it.number)
                            intent.putExtra("type", it.type)
                            intent.putExtra("duration", it.duration)
                            intent.putExtra("timestamp", it.timestamp)
                            sendBroadcast(intent)
                        } else {
                            Log.d(TAG, "No new call detected. Current lastTimestamp: $lastTimestamp")
                        }
                    } ?: run {
                        Log.d(TAG, "No calls found in the log yet.")
                    }
                } catch (e: SecurityException) {
                    Log.e(TAG, "SecurityException in TimerTask: READ_CALL_LOG permission denied. Cannot access call log.", e)
                } catch (e: Exception) {
                    Log.e(TAG, "Exception in TimerTask: ${e.message}", e)
                }
            }
        }, 0, 5000) // Poll every 5 seconds
    }

    override fun onDestroy() {
        super.onDestroy()
        timer.cancel()
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