package com.mycalldetectorapp

import android.content.Context
import android.database.Cursor
import android.provider.CallLog
import android.util.Log

/**
 * Data class to represent a single call entry from the call log.
 * @param number The phone number associated with the call.
 * @param type The type of call (e.g., incoming, outgoing, missed).
 * @param duration The duration of the call in seconds.
 * @param timestamp The timestamp of the call in milliseconds since epoch.
 */
data class CallEntry(
    val number: String,
    val type: Int,
    val duration: Long,
    val timestamp: Long
)

/**
 * Helper object for interacting with the Android Call Log.
 */
object CallLogHelper {

    /**
     * Retrieves the last (most recent) call entry from the device's call log.
     * Requires READ_CALL_LOG permission.
     * @param context The application context.
     * @return The most recent CallEntry object, or null if no calls are found or an error occurs.
     */
    fun getLastCall(context: Context): CallEntry? {
        val projection = arrayOf(
            CallLog.Calls.NUMBER,
            CallLog.Calls.TYPE,
            CallLog.Calls.DATE,
            CallLog.Calls.DURATION
        )

        // Query the Call Log content provider.
        // Order by date descending. The 'LIMIT 1' has been removed from the orderBy string
        // to avoid the IllegalArgumentException on systems that don't support it there.
        // Take the first result from the cursor, which will be the latest call.
        val cursor: Cursor? = context.contentResolver.query(
            CallLog.Calls.CONTENT_URI, // The URI for the call log.
            projection,                // The columns to return.
            null,                      // No WHERE clause (return all calls).
            null,                      // No WHERE clause arguments.
            "${CallLog.Calls.DATE} DESC" // Order by date descending.
        )

        cursor?.use {
            if (it.moveToFirst()) {
                return CallEntry(
                    number = it.getString(it.getColumnIndexOrThrow(CallLog.Calls.NUMBER)),
                    type = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.TYPE)),
                    timestamp = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls.DATE)),
                    duration = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls.DURATION))
                )
            }
        }
        return null
    }

    /**
     * Converts a call type integer (from CallLog.Calls) into a human-readable string label.
     * @param type The integer representing the call type.
     * @return A string label for the call type.
     */
    fun getCallTypeLabel(type: Int): String = when (type) {
        CallLog.Calls.INCOMING_TYPE -> "INCOMING"
        CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
        CallLog.Calls.MISSED_TYPE -> "MISSED"
        CallLog.Calls.REJECTED_TYPE -> "REJECTED"
        CallLog.Calls.BLOCKED_TYPE -> "BLOCKED"
        CallLog.Calls.VOICEMAIL_TYPE -> "VOICEMAIL"
        else -> "UNKNOWN"
    }
}
