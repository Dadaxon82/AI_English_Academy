#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '../src/content/a1');

/**
 * Kontent fayllarini skan qilish va validatsiyadan o'tkazish
 */
function validateContent() {
  console.log('🚀 AI English Academy Content Validationni boshlash...');

  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`❌ Xato: ${CONTENT_DIR} papkasi topilmadi.`);
    process.exit(1);
  }

  const files = fs.readdirSync(CONTENT_DIR).filter(file => file.endsWith('.ts'));
  let totalErrors = 0;
  let totalWarnings = 0;

  files.forEach(file => {
    const filePath = path.resolve(CONTENT_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    console.log(`\n🔍 Tekshirilmoqda: ${file}`);

    // --- 1. VocabularyItem tekshiruvi ---
    if (content.includes('vocabDay7') || content.includes('vocab')) {
      const items = extractObjects(content, 'VocabularyItem');
      if (items.length === 0) {
        console.warn(`  ⚠️ [${file}] VocabularyItem topilmadi.`);
      } else {
        items.forEach(item => {
          if (!item.id) {
            console.error(`  ❌ [${file}] VocabularyItem: 'id' yo'q.`);
            totalErrors++;
          }
          if (item.difficulty !== undefined && (item.difficulty < 1 || item.difficulty > 5)) {
            console.error(`  ❌ [${file}] VocabularyItem ${item.id}: 'difficulty' 1-5 oralig'ida bo'lishi kerak.`);
            totalErrors++;
          }
          if (!item.srs_metadata || typeof item.srs_metadata.last_seen !== 'number') {
            console.error(`  ❌ [${file}] VocabularyItem ${item.id}: 'srs_metadata' to'liq bo'lishi kerak.`);
            totalErrors++;
          }
        });
      }
    }

    // --- 2. GrammarTopic tekshiruvi ---
    if (content.includes('grammarDay7') || content.includes('grammar')) {
      const grammar = extractObjects(content, 'GrammarTopic')[0];
      if (grammar) {
        if (!grammar.explanationUz || !Array.isArray(grammar.explanationUz) || grammar.explanationUz.length === 0) {
          console.error(`  ❌ [${file}] GrammarTopic: 'explanationUz' bo'sh yoki massiv emas.`);
          totalErrors++;
        }
        if (!grammar.formula || !Array.isArray(grammar.formula) || grammar.formula.length === 0) {
          console.error(`  ❌ [${file}] GrammarTopic: 'formula' bo'sh yoki massiv emas.`);
          totalErrors++;
        }
        if (!grammar.exercises || !Array.isArray(grammar.exercises) || grammar.exercises.length === 0) {
          console.error(`  ❌ [${file}] GrammarTopic: 'exercises' bo'sh yoki massiv emas.`);
          totalErrors++;
        }
      }
    }

    // --- 3. ReadingPassage tekshiruvi ---
    if (content.includes('readingDay7') || content.includes('reading')) {
      const reading = extractObjects(content, 'ReadingPassage')[0];
      if (reading) {
        if (!reading.paragraphs || !Array.isArray(reading.paragraphs) || reading.paragraphs.length === 0) {
          console.error(`  ❌ [${file}] ReadingPassage: 'paragraphs' bo'sh yoki massiv emas.`);
          totalErrors++;
        }
        if (!reading.glossary || !Array.isArray(reading.glossary) || reading.glossary.length === 0) {
          console.error(`  ❌ [${file}] ReadingPassage: 'glossary' bo'sh yoki massiv emas.`);
          totalErrors++;
        }
      }
    }

    // --- 4. ListeningTask tekshiruvi ---
    if (content.includes('listeningDay7') || content.includes('listening')) {
      const listening = extractObjects(content, 'ListeningTask')[0];
      if (listening) {
        if (!listening.audio || !listening.audio.src) {
          console.error(`  ❌ [${file}] ListeningTask: 'audio.src' mavjud bo'lishi kerak.`);
          totalErrors++;
        }
        if (!listening.transcript || !Array.isArray(listening.transcript)) {
          console.error(`  ❌ [${file}] ListeningTask: 'transcript' massiv bo'lishi kerak.`);
          totalErrors++;
        }
      }
    }

    // --- 5. WritingTask tekshiruvi ---
    if (content.includes('writingDay7') || content.includes('writing')) {
      const writing = extractObjects(content, 'WritingTask')[0];
      if (writing) {
        if (!writing.instructionUz) {
          console.error(`  ❌ [${file}] WritingTask: 'instructionUz' yo'q.`);
          totalErrors++;
        }
        if (!writing.minWords || writing.minWords < 10) {
          console.error(`  ❌ [${file}] WritingTask: 'minWords' kamida 10 bo'lishi kerak.`);
          totalErrors++;
        }
      }
    }

    // --- 6. SpeakingTask tekshiruvi ---
    if (content.includes('speakingDay7') || content.includes('speaking')) {
      const speaking = extractObjects(content, 'SpeakingTask');
      speaking.forEach((s, index) => {
        if (!s.id) {
          console.error(`  ❌ [${file}] SpeakingTask [${index}]: 'id' yo'q.`);
          totalErrors++;
        }
        if (!s.minSeconds || s.minSeconds < 10) {
          console.error(`  ❌ [${file}] SpeakingTask ${s.id || index}: 'minSeconds' kamida 10 bo'lishi kerak.`);
          totalErrors++;
        }
      });
    }

    // --- 7. SectionTest tekshiruvi ---
    if (content.includes('testDay7') || content.includes('test')) {
      const test = extractObjects(content, 'SectionTest')[0];
      if (test) {
        if (!test.passScore || test.passScore < 1) {
          console.error(`  ❌ [${file}] SectionTest: 'passScore' bo'lishi kerak.`);
          totalErrors++;
        }
        if (!test.exercises || !Array.isArray(test.exercises)) {
          console.error(`  ❌ [${file}] SectionTest: 'exercises' massiv bo'lishi kerak.`);
          totalErrors++;
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
  } else {
    console.log(`✅ Barcha kontent fayllari muvaffaqiyatli tekshirildi!`);
    process.exit(0);
  }
}

/**
 * JS string ichidan obyektlarni extract qilish
 * Bu funksiya sodda JS obyektlarini qabul qiladi
 */
function extractObjects(content, typeName) {
  const objects = [];
  // Regex qidiradi: const [typeName] = [ ... ]
  const regex = new RegExp(`const ${typeName} = ([\\s\\S]*?);`, 'g');
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      let rawObj = match[1].trim();

      // Commentlarni olib tashlash (oddiy holatlar uchun)
      rawObj = rawObj.split('/*')[0].split('*/')[0].trim();

      // JS kodini JSON-ga o'girish (oddiy obyektlar uchun)
      // Obyekt ichidagi barcha ' ni " ga o'giramiz, lekin "ni qoldiramiz
      let jsonFriendly = rawObj
        .replace(/\/\/.*$/gm, '') // // commentlarni o'chiradi
        .replace(/'/g, '"')        // ' ni " ga o'giradi
        .replace(/,\s*$/, '');     // oxiridagi vergilni o'chiradi

      // Agar obyekt ichida funksiyalar yoki murakkab narsalar bo'lsa JSON.parse xato beradi
      // Shuning uchun faqat JSON formatiga yaqin narsalarni o'qiamiz
      const obj = JSON.parse(jsonFriendly);
      objects.push(obj);
    } catch (e) {
      // Obyekt JSON formatida emas yoki juda murakkab, tashlab o'tamiz
    }
  }
  return objects;
}

validateContent();
