package com.mycalldetectorapp

import android.app.*
import android.content.Context
import android.content.Intent
import android.database.ContentObserver
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.provider.CallLog
import android.util.Log
import androidx.core.app.NotificationCompat
import android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE

class CallLogMonitorService : Service() {

    private var lastTimestamp: Long = 0L
    private lateinit var observerThread: HandlerThread
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

       try {
            lastTimestamp = CallLogHelper.getLastCall(this)?.timestamp ?: 0L
        } catch (e: IllegalArgumentException) {
            Log.e(TAG, "IllegalArgumentException when getting last call in onCreate: ${e.message}", e)
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException: READ_CALL_LOG permission denied. Cannot access call log.", e)
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected exception when getting last call in onCreate: ${e.message}", e)
        }

        // Callbacks run one at a time on this thread, so the timestamp check in
        // checkForNewCall can't race when the provider fires several changes per call.
        observerThread = HandlerThread("CallLogObserver").apply { start() }
        callLogObserver = object : ContentObserver(Handler(observerThread.looper)) {
            override fun onChange(selfChange: Boolean) {
                checkForNewCall()
            }
        }
        try {
            contentResolver.registerContentObserver(CallLog.Calls.CONTENT_URI, true, callLogObserver)
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException: READ_CALL_LOG permission denied. Cannot observe call log.", e)
        }
    }

    private fun checkForNewCall() {
        try {
            val latestCall = CallLogHelper.getLastCall(this)
            latestCall?.let {
                if (it.timestamp > lastTimestamp) {
                    lastTimestamp = it.timestamp
                    val typeLabelForLog = CallLogHelper.getCallTypeLabel(it.type)
                    Log.d(TAG, "New $typeLabelForLog call detected. timestamp: ${it.timestamp}")

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
            Log.e(TAG, "SecurityException in checkForNewCall: READ_CALL_LOG permission denied. Cannot access call log.", e)
        } catch (e: Exception) {
            Log.e(TAG, "Exception in checkForNewCall: ${e.message}", e)
        }
    }

    override fun onDestroy() {
        contentResolver.unregisterContentObserver(callLogObserver)
        observerThread.quitSafely()
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