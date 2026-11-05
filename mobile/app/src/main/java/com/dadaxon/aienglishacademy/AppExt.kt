package com.dadaxon.aienglishacademy

import android.app.Activity
import androidx.fragment.app.Fragment

/**
 * Ekrandan konteynerga qisqa yo'l — `(activity as AeaApp).container()`
 * har fragmentda takrorlanmasligi uchun.
 */
fun Activity.container(): AppContainer = (application as AeaApp).container()

fun Fragment.container(): AppContainer = requireActivity().container()
