package com.dadaxon.aienglishacademy.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.databinding.FragmentAuthBinding
import com.dadaxon.aienglishacademy.store.StoreAction
import com.google.android.material.tabs.TabLayout
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Kirish / ro'yxatdan o'tish / mehmon.
 *
 * Qoida: Supabase sozlanmagan bo'lsa ham ilova O'LIMAYDI — forma yashiriladi,
 * sabab ochiq aytiladi (`auth_not_configured`), mehmon rejimi ishlaydi.
 * Hisob bilan kirilganda `AppStore` yangi foydalanuvchi ma'lumotini yuklaydi
 * va mavjud mahalliy navbatni shu hisobga sinxronlaydi (ikki tomonlama sinxron).
 */
class AuthFragment : Fragment() {

    private var _b: FragmentAuthBinding? = null
    private val b get() = requireNotNull(_b)

    private var registering = false
    private var busy = false

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentAuthBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        val c = container()
        b.heroMascot.setMood(MascotView.Mood.HAPPY)
        b.versionText.text = getString(R.string.settings_version, c.versionName())

        val client = c.supabase
        if (client == null || !client.isConfigured) {
            // Sozlanmagan — halol aytiladi; forma foydasiz, shuning uchun yashirinadi.
            b.authTabs.visibility = View.GONE
            b.emailField.setText("")
            b.emailField.isEnabled = false
            b.passwordField.isEnabled = false
            b.nameField.isEnabled = false
            b.submitButton.visibility = View.GONE
            b.authError.text = getString(R.string.auth_not_configured)
            b.authError.visibility = View.VISIBLE
            b.authHint.visibility = View.GONE
        }

        b.authTabs.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab) = setMode(tab.position == 1)
            override fun onTabUnselected(tab: TabLayout.Tab) = Unit
            override fun onTabReselected(tab: TabLayout.Tab) = Unit
        })

        b.submitButton.setOnClickListener { submit() }
        b.guestButton.setOnClickListener { proceed() }

        // Allaqachon sessiya bo'lsa (ilova qayta ochilganda) — Bekor qilish
        // o'rniga darhol davom etamiz.
        val sess = c.auth.session()
        if (sess != null && !c.auth.isExpired()) {
            b.authError.text = getString(R.string.auth_signed_in, sess.email ?: sess.userId)
            b.authError.visibility = View.VISIBLE
        }
    }

    private fun setMode(register: Boolean) {
        registering = register
        b.nameLayout.visibility = if (register) View.VISIBLE else View.GONE
        b.submitButton.setText(if (register) R.string.auth_btn_register else R.string.auth_btn_login)
        b.authError.visibility = View.GONE
    }

    private fun submit() {
        if (busy) return
        val c = container()
        val client = c.supabase ?: run { proceed(); return }
        if (!client.isConfigured) { proceed(); return }

        val email = (b.emailField.text?.toString() ?: "").trim()
        val password = b.passwordField.text?.toString() ?: ""
        if (email.isEmpty() || password.isEmpty()) {
            b.authError.setText(R.string.auth_validation_fields)
            b.authError.visibility = View.VISIBLE
            return
        }
        val name = b.nameField.text?.toString()?.trim()

        busy = true
        b.submitButton.isEnabled = false
        b.authError.visibility = View.GONE
        b.submitButton.setText(R.string.auth_logging_in)

        viewLifecycleOwner.lifecycleScope.launch {
            val res = withContext(Dispatchers.IO) {
                runCatching {
                    if (registering) client.signUp(email, password, name)
                    else client.signIn(email, password)
                }
            }
            busy = false
            b.submitButton.isEnabled = true
            b.submitButton.setText(if (registering) R.string.auth_btn_register else R.string.auth_btn_login)

            val r = res.getOrElse {
                showAuthError(getString(R.string.error_generic))
                return@launch
            }
            val s = r.session
            if (s == null) {
                showAuthError(r.errorUz ?: getString(R.string.error_generic))
                return@launch
            }
            c.auth.save(s)
            // Hisob almashdi — store'ni shu foydalanuvchi ma'lumotidan qayta
            // yuklaymiz va mavjud mahalliy yozuvlarni navbatga qo'shamiz.
            container().store.refresh()
            proceed()
        }
    }

    private fun showAuthError(msg: String) {
        _b?.authError?.text = msg
        _b?.authError?.visibility = View.VISIBLE
    }

    /** Mehmon yoki muvaffaqiyatli kirish — keyingi qadam. */
    private fun proceed() {
        val c = container()
        if (c.store.state.value.data.onboardedAt == null) {
            findNavController().navigate(R.id.onboardingFragment)
        } else {
            findNavController().navigate(R.id.dashboardFragment)
            // Mehmon holatida store holatini yangilash kerak (banner "mehmon").
            c.store.dispatch(StoreAction.Hydrate(c.store.state.value.data))
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }
}
