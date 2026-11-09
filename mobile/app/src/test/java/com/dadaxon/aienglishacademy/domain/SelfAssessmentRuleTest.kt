package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.ContentRepository
import com.dadaxon.aienglishacademy.data.FsAssetSource
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Veb `reducer.ts::self-assess` bilan bir xil qoida va eksport qilingan da'volar. */
class SelfAssessmentRuleTest {
    @Test fun `faqat 1-5 qabul qilinadi, daraja ozgarmaydi`() {
        val d = AppData()
        val d2 = applySelfAssess(d, "cd-a1-speak", 4, 10L)
        assertEquals(4, d2.selfAssessment["cd-a1-speak"]!!.score)
        assertEquals(d.settings.currentLevel, d2.settings.currentLevel)
        assertSame(d2, applySelfAssess(d2, "cd-a1-speak", 6, 11L))
        assertSame(d2, applySelfAssess(d2, "cd-a1-speak", 0, 11L))
        assertEquals(2, applySelfAssess(d2, "cd-a1-speak", 2, 12L).selfAssessment["cd-a1-speak"]!!.score)
    }

    @Test fun `can-do json ochiladi - 5 yorliq, har darajada 6 dava`() {
        val repo = ContentRepository(FsAssetSource(File(System.getProperty("contentDir") ?: "src/main/assets/content").parentFile))
        val f = repo.canDo()
        assertEquals(5, f.labels.size)
        for (lvl in listOf("A1", "A2", "B1", "B2", "C1")) assertEquals(lvl, 6, f.statements.count { it.level == lvl })
        assertTrue(f.statements.all { it.textUz.isNotBlank() })
    }
}
