package com.mycalldetectorapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (Intent.ACTION_BOOT_COMPLETED == intent.action || Intent.ACTION_LOCKED_BOOT_COMPLETED == intent.action) {
            val serviceIntent = Intent(context, CallLogMonitorService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }
    }
}
