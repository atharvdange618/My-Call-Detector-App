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

    private var listenerCount = 0

    private val callLogUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.mycalldetectorapp.CALL_LOG_UPDATE") {
                val number = intent.getStringExtra("number")
                val type = intent.getIntExtra("type", 0)
                val duration = intent.getLongExtra("duration", 0L)
                val timestamp = intent.getLongExtra("timestamp", 0L)

                val params = Arguments.createMap().apply {
                    putString("number", number)
                    putInt("type", type)
                    putDouble("duration", duration.toDouble())
                    putDouble("timestamp", timestamp.toDouble())
                }

                try {
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("CallLogUpdated", params)
                } catch (e: Exception) {
                    Log.e(TAG, "Error emitting CallLogUpdated event to JS: ${e.message}", e)
                }
            }
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