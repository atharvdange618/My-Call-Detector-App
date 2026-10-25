package com.mycalldetectorapp

import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.provider.CallLog
import android.provider.ContactsContract
import android.util.Log

/**
 * Data class to represent a single call entry from the call log.
 * @param id The call log row ID. The provider assigns these in insertion order.
 * @param number The phone number associated with the call. Empty for private numbers.
 * @param type The type of call (e.g., incoming, outgoing, missed).
 * @param duration The duration of the call in seconds.
 * @param timestamp The timestamp of the call in milliseconds.
 * @param cachedName The contact name the dialer cached on the row, if it filled one in.
 */
data class CallEntry(
    val id: Long,
    val number: String,
    val type: Int,
    val duration: Long,
    val timestamp: Long,
    val cachedName: String?
)

/**
 * A contact matched to a phone number.
 * @param name The contact's display name.
 * @param photoUri A content:// URI for the contact's thumbnail, or null if it has none.
 */
data class ContactInfo(
    val name: String?,
    val photoUri: String?
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
        CallLog.Calls.DURATION,
        CallLog.Calls.CACHED_NAME
    )

    private fun Cursor.toCallEntry() = CallEntry(
        cachedName = getString(getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME))?.takeIf { it.isNotBlank() },
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
     * Looks up the contact for a phone number. PhoneLookup matches across number formats,
     * so "+91 98..." and "098..." find the same contact. Requires READ_CONTACTS permission.
     * @param context The application context.
     * @param number The phone number to look up.
     * @return The matching contact, or null if the number isn't in contacts.
     */
    fun lookupContact(context: Context, number: String): ContactInfo? {
        val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number))
        context.contentResolver.query(
            uri,
            arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME, ContactsContract.PhoneLookup.PHOTO_THUMBNAIL_URI),
            null,
            null,
            null
        )?.use {
            if (it.moveToFirst()) {
                return ContactInfo(
                    name = it.getString(0),
                    photoUri = it.getString(1)
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
        else -> {
  Log.w("CallLogHelper", "Unknown call type: $type")
  "UNKNOWN"
}
    }
}
