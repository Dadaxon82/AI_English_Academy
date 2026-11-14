#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '../src/content/a2');

/**
 * A2 Kontent fayllarini skan qilish va validatsiyadan o'tkazish
 */
function validateContent() {
  console.log('🚀 AI English Academy A2 Content Validationni boshlash...');

  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`❌ Xato: ${CONTENT_DIR} papkasi topilmadi.`);
    process.exit(1);
  }

  const files = fs.readdirSync(CONTENT_DIR).filter(file =>
    file.endsWith('.ts') && !file.includes('mock-exam')
  );
  let totalErrors = 0;
  let totalWarnings = 0;

  files.forEach(file => {
    const filePath = path.resolve(CONTENT_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    console.log(`\n🔍 Tekshirilmoqda: ${file}`);

    // Check for basic exports
    if (!content.includes('export const day') && !content.includes('export const')) {
      console.warn(`  ⚠️ [${file}] Eksportlar topilmadi yoki noto'g'ri shaklda.`);
      totalWarnings++;
    }

    // --- 1. VocabularyItem tekshiruvi (15 ta so'z) ---
    if (file.includes('day-')) {
      const dayMatch = file.match(/day-(\d+)\.ts/);
      if (dayMatch) {
        const dayNum = parseInt(dayMatch[1]);
        if (dayNum >= 1 && dayNum <= 7) {
          const expectedCount = 15;
          const found = content.match(/id:\s*['"](\w+),\s*en:\s*['"](\w+)/g);
          const count = found ? found.length : 0;
          if (count !== expectedCount) {
            console.warn(`  ⚠️ [${file}] VocabularyItem: kutilgan ${expectedCount} ta, topildi ${count} ta.`);
            totalWarnings++;
          }
        }
      }
    }

    // --- 2. GrammarTopic tekshiruvi ---
    if (file.includes('day-')) {
      const dayMatch = file.match(/day-(\d+)\.ts/);
      if (dayMatch) {
        const dayNum = parseInt(dayMatch[1]);
        if (dayNum >= 1 && dayNum <= 7) {
          if (!content.includes('explanationUz:')) {
            console.error(`  ❌ [${file}] GrammarTopic: 'explanationUz' topilmadi.`);
            totalErrors++;
          }
          if (!content.includes('formula:')) {
            console.error(`  ❌ [${file}] GrammarTopic: 'formula' topilmadi.`);
            totalErrors++;
          }
          if (!content.includes('exercises:')) {
            console.error(`  ❌ [${file}] GrammarTopic: 'exercises' topilmadi.`);
            totalErrors++;
          }
        }
      }
    }

    // --- 3. ReadingPassage tekshiruvi ---
    if (file.includes('day-')) {
      const dayMatch = file.match(/day-(\d+)\.ts/);
      if (dayMatch) {
        const dayNum = parseInt(dayMatch[1]);
        if (dayNum >= 1 && dayNum <= 7) {
          if (!content.includes('paragraphs:')) {
            console.error(`  ❌ [${file}] ReadingPassage: 'paragraphs' topilmadi.`);
            totalErrors++;
          }
          if (!content.includes('glossary:')) {
            console.error(`  ❌ [${file}] ReadingPassage: 'glossary' topilmadi.`);
            totalErrors++;
          }
        }
      }
    }

    // --- 4. ListeningTask tekshiruvi ---
    if (file.includes('day-')) {
      const dayMatch = file.match(/day-(\d+)\.ts/);
      if (dayMatch) {
        const dayNum = parseInt(dayMatch[1]);
        if (dayNum >= 1 && dayNum <= 7) {
          if (!content.includes('audio:')) {
            console.error(`  ❌ [${file}] ListeningTask: 'audio' topilmadi.`);
            totalErrors++;
          }
          if (!content.includes('transcript:')) {
            console.error(`  ❌ [${file}] ListeningTask: 'transcript' topilmadi.`);
            totalErrors++;
          }
        }
      }
    }

    // --- 5. WritingTask tekshiruvi ---
    if (file.includes('day-')) {
      const dayMatch = file.match(/day-(\d+)\.ts/);
      if (dayMatch) {
        const dayNum = parseInt(dayMatch[1]);
        if (dayNum >= 1 && dayNum <= 7) {
          if (!content.includes('instruction:')) {
            console.error(`  ❌ [${file}] WritingTask: 'instruction' topilmadi.`);
            totalErrors++;
          }
          if (!content.includes('minWords:')) {
            console.error(`  ❌ [${file}] WritingTask: 'minWords' topilmadi.`);
            totalErrors++;
          }
        }
      }
    }

    // --- 6. SpeakingTask tekshiruvi ---
    if (file.includes('day-')) {
      const dayMatch = file.match(/day-(\d+)\.ts/);
      if (dayMatch) {
        const dayNum = parseInt(dayMatch[1]);
        if (dayNum >= 1 && dayNum <= 7) {
          if (!content.includes('minSeconds:')) {
            console.error(`  ❌ [${file}] SpeakingTask: 'minSeconds' topilmadi.`);
            totalErrors++;
          }
        }
      }
    }

    // --- 7. SectionTest tekshiruvi ---
    if (file.includes('day-')) {
      const dayMatch = file.match(/day-(\d+)\.ts/);
      if (dayMatch) {
        const dayNum = parseInt(dayMatch[1]);
        if (dayNum >= 1 && dayNum <= 7) {
          if (!content.includes('passScore:')) {
            console.error(`  ❌ [${file}] SectionTest: 'passScore' topilmadi.`);
            totalErrors++;
          }
          if (!content.includes('exercises:')) {
            console.error(`  ❌ [${file}] SectionTest: 'exercises' topilmadi.`);
            totalErrors++;
          }
        }
      }
    }
  });

  console.log(`\n🏁 Validatsiya yakunlandi.`);
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`Total Warnings: ${totalWarnings}`);

  if (totalErrors > 0) {
    console.error(`❌ Validatsiya muvaffaqiyatsiz tugadi.`);
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.warn(`⚠️ Warnings mavjud, lekin validatsiya muvaffaqiyatli.`);
  } else {
    console.log(`✅ A2 barcha kontent fayllari muvaffaqiyatli tekshirildi!`);
    process.exit(0);
  }
}

validateContent();
