package com.mycalldetectorapp

import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import android.content.pm.PackageManager

class CallLogModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val TAG = "CallLogModule"

    private val KEY_LAST_DELIVERED_ID = "lastDeliveredId"
    private val REPLAY_WINDOW_MS = 24 * 60 * 60 * 1000L

    private var listenerCount = 0
    private val prefs = reactContext.getSharedPreferences("call_log_cursor", Context.MODE_PRIVATE)

    private val callLogUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.mycalldetectorapp.CALL_LOG_UPDATE") {
                deliverPendingCalls()
            }
        }
    }

    // The saved ID only moves past a call once it has been emitted to JS, so calls that
    // land while nothing is listening get replayed when JS subscribes. Synchronized because
    // addListener and the receiver run on different threads.
    @Synchronized
    private fun deliverPendingCalls() {
        try {
            if (!prefs.contains(KEY_LAST_DELIVERED_ID)) {
                // First run: start from the newest call instead of replaying the whole log.
                val newestId = CallLogHelper.getLastCall(reactContext)?.id ?: 0L
                prefs.edit().putLong(KEY_LAST_DELIVERED_ID, newestId).apply()
                return
            }

            val lastDeliveredId = prefs.getLong(KEY_LAST_DELIVERED_ID, 0L)
            val notBefore = System.currentTimeMillis() - REPLAY_WINDOW_MS
            for (call in CallLogHelper.getCallsAfter(reactContext, lastDeliveredId, notBefore)) {
                // Private numbers have nothing to message, so skip them but still move past them.
                if (call.number.isNotBlank()) {
                    val params = Arguments.createMap().apply {
                        putString("number", call.number)
                        putInt("type", call.type)
                        putDouble("duration", call.duration.toDouble())
                        putDouble("timestamp", call.timestamp.toDouble())
                    }
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("CallLogUpdated", params)
                    Log.d(TAG, "Delivered ${CallLogHelper.getCallTypeLabel(call.type)} call id: ${call.id}")
                }
                prefs.edit().putLong(KEY_LAST_DELIVERED_ID, call.id).apply()
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException: READ_CALL_LOG permission denied. Cannot read call log.", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error delivering calls to JS: ${e.message}", e)
        }
    }

    override fun getName(): String = "CallLogModule"

    @ReactMethod
    fun addListener(eventName: String) {
        if (listenerCount == 0) {
            val filter = IntentFilter("com.mycalldetectorapp.CALL_LOG_UPDATE")
            try {
                ContextCompat.registerReceiver(
                    reactContext,
                    callLogUpdateReceiver,
                    filter,
                    ContextCompat.RECEIVER_NOT_EXPORTED
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error registering BroadcastReceiver in addListener: ${e.message}", e)
            }
        }
        listenerCount++
        deliverPendingCalls()
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        listenerCount -= count.toInt()
        if (listenerCount <= 0) {
            try {
                reactContext.unregisterReceiver(callLogUpdateReceiver)
                listenerCount = 0
            } catch (e: Exception) {
                Log.e(TAG, "Error unregistering BroadcastReceiver in removeListeners: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun startMonitoring() {
        val intent = Intent(reactContext, CallLogMonitorService::class.java)
        ContextCompat.startForegroundService(reactContext, intent)
    }

    @ReactMethod
    fun stopMonitoring() {
        val intent = Intent(reactContext, CallLogMonitorService::class.java)
        reactContext.stopService(intent)
    }
}