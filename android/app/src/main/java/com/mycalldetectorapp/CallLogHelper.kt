package com.mycalldetectorapp

import android.content.Context
import android.database.Cursor
import android.provider.CallLog
import android.util.Log

/**
 * Data class to represent a single call entry from the call log.
 * @param id The call log row ID. The provider assigns these in insertion order.
 * @param number The phone number associated with the call. Empty for private numbers.
 * @param type The type of call (e.g., incoming, outgoing, missed).
 * @param duration The duration of the call in seconds.
 * @param timestamp The timestamp of the call in milliseconds.
 */
data class CallEntry(
    val id: Long,
    val number: String,
    val type: Int,
    val duration: Long,
    val timestamp: Long
)

/**
 * Helper object for interacting with the Android Call Log.
 */
object CallLogHelper {

    private val projection = arrayOf(
        CallLog.Calls._ID,
        CallLog.Calls.NUMBER,
        CallLog.Calls.TYPE,
        CallLog.Calls.DATE,
        CallLog.Calls.DURATION
    )

    private fun Cursor.toCallEntry() = CallEntry(
        id = getLong(getColumnIndexOrThrow(CallLog.Calls._ID)),
        number = getString(getColumnIndexOrThrow(CallLog.Calls.NUMBER)) ?: "",
        type = getInt(getColumnIndexOrThrow(CallLog.Calls.TYPE)),
        timestamp = getLong(getColumnIndexOrThrow(CallLog.Calls.DATE)),
        duration = getLong(getColumnIndexOrThrow(CallLog.Calls.DURATION))
    )

    /**
     * Retrieves the most recently inserted call entry from the device's call log.
     * Requires READ_CALL_LOG permission.
     * @param context The application context.
     * @return The newest CallEntry object, or null if no calls are found.
     */
    fun getLastCall(context: Context): CallEntry? {
        context.contentResolver.query(
            CallLog.Calls.CONTENT_URI,
            projection,
            null,
            null,
            "${CallLog.Calls._ID} DESC"
        )?.use {
            if (it.moveToFirst()) return it.toCallEntry()
        }
        return null
    }

    /**
     * Retrieves calls inserted after the given row ID that started at or after notBefore,
     * oldest first. Requires READ_CALL_LOG permission.
     * @param context The application context.
     * @param afterId Only rows with a larger _ID are returned.
     * @param notBefore Only calls whose DATE is at or after this time (ms) are returned.
     */
    fun getCallsAfter(context: Context, afterId: Long, notBefore: Long): List<CallEntry> {
        val calls = mutableListOf<CallEntry>()
        context.contentResolver.query(
            CallLog.Calls.CONTENT_URI,
            projection,
            "${CallLog.Calls._ID} > ? AND ${CallLog.Calls.DATE} >= ?",
            arrayOf(afterId.toString(), notBefore.toString()),
            "${CallLog.Calls._ID} ASC"
        )?.use {
            while (it.moveToNext()) calls.add(it.toCallEntry())
        }
        return calls
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
        else -> {
  Log.w("CallLogHelper", "Unknown call type: $type")
  "UNKNOWN"
}
    }
}
