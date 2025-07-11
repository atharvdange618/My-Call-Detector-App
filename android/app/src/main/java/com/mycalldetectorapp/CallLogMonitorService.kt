package com.mycalldetectorapp

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.*

class CallLogMonitorService : Service() {

    private var lastTimestamp: Long = 0L
    private val timer = Timer()
    private val TAG = "CallLogMonitorService"

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service onCreate called.")
        createNotificationChannel()

        val notification = NotificationCompat.Builder(this, "CallLogChannel")
            .setSmallIcon(R.mipmap.ic_launcher_round)
            .setContentTitle("Monitoring Call Logs")
            .setContentText("Watching call history for changes...")
            .setOngoing(true)
            .build()

        startForeground(101, notification)
        Log.d(TAG, "Foreground service started.")

        try {
            lastTimestamp = CallLogHelper.getLastCall(this)?.timestamp ?: 0L
            Log.d(TAG, "Initial lastTimestamp: $lastTimestamp")
        } catch (e: IllegalArgumentException) {
            Log.e(TAG, "IllegalArgumentException when getting last call in onCreate: ${e.message}", e)
            throw RuntimeException("Failed to initialize CallLogMonitorService due to call log error", e)
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected exception when getting last call in onCreate: ${e.message}", e)
            throw RuntimeException("Failed to initialize CallLogMonitorService due to unexpected error", e)
        }

        timer.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                Log.d(TAG, "TimerTask run() started.")
                try {
                    val latestCall = CallLogHelper.getLastCall(this@CallLogMonitorService)
                    Log.d(TAG, "CallLogHelper.getLastCall() completed in TimerTask. Latest call: $latestCall")

                    latestCall?.let {
                        if (it.timestamp > lastTimestamp) {
                            Log.d(TAG, "New call detected! Old timestamp: $lastTimestamp, New timestamp: ${it.timestamp}")
                            lastTimestamp = it.timestamp
                            val typeLabelForLog = CallLogHelper.getCallTypeLabel(it.type)
                            Log.d(TAG, "Call details: Type=$typeLabelForLog, Number=${it.number}, Duration=${it.duration}s")

                            val intent = Intent("com.mycalldetectorapp.CALL_LOG_UPDATE")
                            intent.setPackage(applicationContext.packageName)
                            intent.putExtra("number", it.number)
                            intent.putExtra("type", it.type)
                            intent.putExtra("duration", it.duration)
                            intent.putExtra("timestamp", it.timestamp)
                            Log.d(TAG, "Sending broadcast: CALL_LOG_UPDATE")
                            sendBroadcast(intent)
                            Log.d(TAG, "Broadcast sent.")
                        } else {
                            Log.d(TAG, "No new call detected. Current lastTimestamp: $lastTimestamp")
                        }
                    } ?: run {
                        Log.d(TAG, "No calls found in the log yet.")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Exception in TimerTask: ${e.message}", e)
                }
            }
        }, 0, 5000) // Poll every 5 seconds
        Log.d(TAG, "TimerTask scheduled.")
    }

    override fun onDestroy() {
        super.onDestroy()
        timer.cancel()
        Log.d(TAG, "Service onDestroy called. Timer cancelled.")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                "CallLogChannel",
                "Call Log Monitoring Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
            Log.d(TAG, "Notification channel created.")
        }
    }
}