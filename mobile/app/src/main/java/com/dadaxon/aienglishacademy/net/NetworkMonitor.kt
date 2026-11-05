package com.dadaxon.aienglishacademy.net

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest

/**
 * Tarmoq holati — veb `sync.ts::networkStatus()` (`navigator.onLine`) ning
 * Android moslamasi. `ConnectivityManager.NetworkCallback` ishlatiladi:
 * ulanish qaytganda sinxronlashni O'ZIMIZ boshlay olamiz (navbat yo'qolmaydi).
 */
class NetworkMonitor(private val context: Context?) {
    private val cm: ConnectivityManager? =
        context?.applicationContext?.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

    @Volatile
    private var registered = false

    fun isOnline(): Boolean {
        val c = cm ?: return true // monitoring yo'q bo'lsa — urinib ko'ramiz
        val net = c.activeNetwork ?: return false
        val caps = c.getNetworkCapabilities(net) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    /** Holat o'zgarganda chaqiriladi (asosiy oqimda bo'lishi mumkin). */
    fun register(onChanged: (Boolean) -> Unit) {
        val c = cm ?: return
        if (registered) return
        try {
            val cb = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) = onChanged(true)
                override fun onLost(network: Network) = onChanged(isOnline())
            }
            c.registerNetworkCallback(
                NetworkRequest.Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build(),
                cb,
            )
            registered = true
        } catch (err: Exception) {
            registered = false
        }
    }
}
