/**
 * DIALOGLAR — real hayot stsenariylari (g'oya: Babbel; matnlar bizniki).
 *
 * Har darajaning har kuniga bitta suhbat (kun mavzusi bilan bir xil):
 * o'quvchi `b` rolida, uning replikalaridagi `___` o'rniga mos so'z
 * tanlanadi. Har suhbat oxirida «Nega shunday?» — qisqa grammatika izohi.
 *
 * Mashqlar `dialogueExercise()` bilan yasaladi va `dlg-<suhbat>-<qator>` id
 * oladi — shuning uchun `findExercise()` ularni qayta tiklaydi va xatolar
 * Xatolar daftariga (va Takrorlash menejeriga) o'zi tushadi.
 *
 * Kontent qoidasi (`src/test/dialogues.test.ts`): har suhbatda 3 ta bo'shliq,
 * javob variantlar ichida va BITTA marta, `___` har bo'shliqli qatorda aynan
 * bitta, o'zbekcha tarjima bo'sh emas, A1/A2 da 7 tadan (har kunga bittadan).
 */

import type { CefrLevel, Dialogue, DialogueLine, MultipleChoiceExercise } from './types'

export const DIALOGUE_PREFIX = 'dlg-'

export const DIALOGUES: readonly Dialogue[] = [
  /* ------------------------------- A1 ------------------------------- */
  {
    id: 'a1-d1-first-class',
    level: 'A1',
    dayNumber: 1,
    titleUz: 'Birinchi dars: tanishuv',
    situationUz: 'Til kursidagi birinchi darsingiz. O‘qituvchi siz bilan tanishmoqda.',
    roles: { a: 'Teacher', b: 'You' },
    lines: [
      { speaker: 'a', en: 'Good morning! I’m Ms Brown, your teacher.', uz: 'Xayrli tong! Men Braun xonim, sizning o‘qituvchingizman.' },
      {
        speaker: 'b',
        en: 'Good morning! My name ___ Aziz.',
        uz: 'Xayrli tong! Mening ismim Aziz.',
        gap: { answer: 'is', options: ['am', 'is', 'are'], skill: 'grammar', whyUz: '“My name” — bitta narsa (u), shuning uchun “is”: My name is…' },
      },
      { speaker: 'a', en: 'Nice to meet you, Aziz. Where are you from?', uz: 'Tanishganimdan xursandman, Aziz. Qayerdansiz?' },
      {
        speaker: 'b',
        en: 'I’m ___ Uzbekistan. I live in Tashkent.',
        uz: 'Men O‘zbekistondanman. Toshkentda yashayman.',
        gap: { answer: 'from', options: ['in', 'at', 'from'], skill: 'vocabulary', whyUz: 'Kelib chiqish “from” bilan aytiladi: I’m from Uzbekistan.' },
      },
      { speaker: 'a', en: 'Great. How old are you?', uz: 'Ajoyib. Necha yoshdasiz?' },
      {
        speaker: 'b',
        en: 'I’m nineteen. Nice to ___ you too!',
        uz: 'O‘n to‘qqiz yoshdaman. Men ham tanishganimdan xursandman!',
        gap: { answer: 'meet', options: ['meet', 'see', 'know'], skill: 'vocabulary', whyUz: 'Birinchi tanishuvda qotib qolgan ibora: “Nice to meet you”.' },
      },
    ],
    note: {
      titleUz: 'am / is / are — qachon qaysi biri?',
      pointsUz: ['I → am (I’m).', 'he / she / it va bitta narsa (my name) → is.', 'you / we / they → are.'],
      examples: [
        { en: 'I am a student.', uz: 'Men talabaman.' },
        { en: 'My teacher is from London.', uz: 'O‘qituvchim Londondan.' },
        { en: 'We are in class 3.', uz: 'Biz 3-sinfdamiz.' },
      ],
    },
  },
  {
    id: 'a1-d2-family-photo',
    level: 'A1',
    dayNumber: 2,
    titleUz: 'Oilaviy surat',
    situationUz: 'Do‘stingiz telefoningizdagi oilaviy suratni ko‘rib, savol bermoqda.',
    roles: { a: 'Friend', b: 'You' },
    lines: [
      { speaker: 'a', en: 'What a nice photo! Who is this woman?', uz: 'Qanday chiroyli surat! Bu ayol kim?' },
      {
        speaker: 'b',
        en: 'That’s ___ mother. Her name is Dilnoza.',
        uz: 'Bu mening onam. Uning ismi Dilnoza.',
        gap: { answer: 'my', options: ['I', 'my', 'me'], skill: 'grammar', whyUz: 'Egalik “my” bilan: my mother — mening onam.' },
      },
      { speaker: 'a', en: 'And the tall man?', uz: 'Uzun bo‘yli erkak-chi?' },
      {
        speaker: 'b',
        en: 'He’s my ___. He is a doctor.',
        uz: 'U mening akam. U shifokor.',
        gap: { answer: 'brother', options: ['sister', 'brother', 'grandmother'], skill: 'vocabulary', whyUz: 'Erkak qarindosh — “brother” (aka/uka); “sister” — opa/singil.' },
      },
      { speaker: 'a', en: 'Have you got any sisters?', uz: 'Opa-singlingiz bormi?' },
      {
        speaker: 'b',
        en: 'Yes, I ___ got one sister. She is ten.',
        uz: 'Ha, bitta singlim bor. U o‘n yoshda.',
        gap: { answer: 'have', options: ['has', 'have', 'am'], skill: 'grammar', whyUz: '“I” bilan “have got” ishlatiladi; “has got” — he/she uchun.' },
      },
    ],
    note: {
      titleUz: 'Egalik: my / your / his / her va have got',
      pointsUz: ['my — mening, your — sizning, his — uning (erkak), her — uning (ayol).', 'I / you / we / they → have got; he / she → has got.'],
      examples: [
        { en: 'This is my brother.', uz: 'Bu mening akam.' },
        { en: 'She has got two cats.', uz: 'Uning ikkita mushugi bor.' },
      ],
    },
  },
  {
    id: 'a1-d3-meeting-time',
    level: 'A1',
    dayNumber: 3,
    titleUz: 'Uchrashuv vaqtini kelishish',
    situationUz: 'Sinfdoshingiz siz bilan birga kutubxonaga borish uchun vaqt so‘ramoqda.',
    roles: { a: 'Classmate', b: 'You' },
    lines: [
      { speaker: 'a', en: 'Let’s go to the library tomorrow. What time do you get up?', uz: 'Ertaga kutubxonaga boraylik. Soat nechada turasiz?' },
      {
        speaker: 'b',
        en: 'I usually get up ___ seven o’clock.',
        uz: 'Odatda soat yettida turaman.',
        gap: { answer: 'at', options: ['in', 'on', 'at'], skill: 'grammar', whyUz: 'Soat bilan “at”: at seven o’clock, at 8:30.' },
      },
      { speaker: 'a', en: 'And when do you have breakfast?', uz: 'Nonushtani qachon qilasiz?' },
      {
        speaker: 'b',
        en: 'I ___ breakfast at half past seven.',
        uz: 'Yetti yarimda nonushta qilaman.',
        gap: { answer: 'have', options: ['have', 'has', 'having'], skill: 'grammar', whyUz: 'Present Simple, “I” bilan fe’l o‘zgarmaydi: I have breakfast.' },
      },
      { speaker: 'a', en: 'OK. Let’s meet at nine.', uz: 'Yaxshi. Soat to‘qqizda uchrashaylik.' },
      {
        speaker: 'b',
        en: 'Great! See you ___.',
        uz: 'Zo‘r! Ertaga ko‘rishguncha.',
        gap: { answer: 'tomorrow', options: ['yesterday', 'tomorrow', 'today'], skill: 'vocabulary', whyUz: 'Uchrashuv ertaga — “See you tomorrow”.' },
      },
    ],
    note: {
      titleUz: 'Present Simple va vaqt predloglari',
      pointsUz: ['Har kungi odat: I get up, I have breakfast (fe’l o‘zgarmaydi).', 'he / she bilan fe’lga -s qo‘shiladi: she gets up.', 'Soat → at, kun → on (on Monday), qism → in (in the morning).'],
      examples: [
        { en: 'I go to school at eight.', uz: 'Men soat sakkizda maktabga boraman.' },
        { en: 'She works on Saturdays.', uz: 'U shanba kunlari ishlaydi.' },
      ],
    },
  },
  {
    id: 'a1-d4-new-flat',
    level: 'A1',
    dayNumber: 4,
    titleUz: 'Yangi kvartira: narsa qayerda?',
    situationUz: 'Ijaraga olingan kvartiraga keldingiz. Uy egasi xonalarni ko‘rsatmoqda.',
    roles: { a: 'Landlord', b: 'You' },
    lines: [
      { speaker: 'a', en: 'Welcome! This is the living room.', uz: 'Xush kelibsiz! Bu mehmonxona.' },
      {
        speaker: 'b',
        en: 'It’s nice. Is ___ a TV?',
        uz: 'Yaxshi ekan. Televizor bormi?',
        gap: { answer: 'there', options: ['it', 'there', 'they'], skill: 'grammar', whyUz: 'Biror narsa borligini so‘rash: Is there a…? / There is a…' },
      },
      { speaker: 'a', en: 'Yes, there is. It’s next to the window.', uz: 'Ha, bor. U derazaning yonida.' },
      {
        speaker: 'b',
        en: 'And where are the keys? Are they ___ the table?',
        uz: 'Kalitlar qayerda? Ular stol ustidami?',
        gap: { answer: 'on', options: ['on', 'in', 'at'], skill: 'grammar', whyUz: 'Sirt ustida — “on”: on the table. Ichida — “in”: in the box.' },
      },
      { speaker: 'a', en: 'No, they are in the kitchen, in the drawer.', uz: 'Yo‘q, ular oshxonada, tortmada.' },
      {
        speaker: 'b',
        en: 'How many bedrooms ___ there?',
        uz: 'Nechta yotoqxona bor?',
        gap: { answer: 'are', options: ['is', 'are', 'be'], skill: 'grammar', whyUz: '“bedrooms” — ko‘plik, shuning uchun “are there”.' },
      },
      { speaker: 'a', en: 'There are two bedrooms and one bathroom.', uz: 'Ikkita yotoqxona va bitta hammom bor.' },
    ],
    note: {
      titleUz: 'There is / there are va joy predloglari',
      pointsUz: ['Bitta narsa → there is; ko‘p narsa → there are.', 'Savol: Is there…? / Are there…?', 'on — ustida, in — ichida, next to — yonida, under — tagida.'],
      examples: [
        { en: 'There is a lamp next to the bed.', uz: 'Karavot yonida chiroq bor.' },
        { en: 'Are there any chairs in the kitchen?', uz: 'Oshxonada stullar bormi?' },
      ],
    },
  },
  {
    id: 'a1-d5-cafe',
    level: 'A1',
    dayNumber: 5,
    titleUz: 'Kafeda buyurtma berish',
    situationUz: 'Kafega kirdingiz. Ofitsiant buyurtmangizni olmoqda.',
    roles: { a: 'Waiter', b: 'You' },
    lines: [
      { speaker: 'a', en: 'Hello! What would you like?', uz: 'Salom! Nima olasiz?' },
      {
        speaker: 'b',
        en: '___ I have a cup of tea, please?',
        uz: 'Bir piyola choy olsam bo‘ladimi?',
        gap: { answer: 'Can', options: ['Do', 'Can', 'Am'], skill: 'grammar', whyUz: 'Xushmuomala so‘rov: “Can I have…, please?”' },
      },
      { speaker: 'a', en: 'Of course. Anything to eat?', uz: 'Albatta. Yeyish uchun biror narsa?' },
      {
        speaker: 'b',
        en: 'Yes, I’d like ___ sandwich, please.',
        uz: 'Ha, bitta sendvich olaman.',
        gap: { answer: 'a', options: ['a', 'an', 'some'], skill: 'grammar', whyUz: '“sandwich” undosh tovush bilan boshlanadi va sanaladi → a sandwich.' },
      },
      { speaker: 'a', en: 'Sorry, we haven’t got any sandwiches today. We’ve got soup.', uz: 'Kechirasiz, bugun sendvich yo‘q. Sho‘rva bor.' },
      {
        speaker: 'b',
        en: 'OK, some soup, then. How ___ is it?',
        uz: 'Mayli, unda sho‘rva. Qancha turadi?',
        gap: { answer: 'much', options: ['many', 'much', 'old'], skill: 'vocabulary', whyUz: 'Narx so‘rash: “How much is it?”' },
      },
      { speaker: 'a', en: 'The tea and the soup are six dollars.', uz: 'Choy va sho‘rva olti dollar.' },
    ],
    note: {
      titleUz: 'Xushmuomala buyurtma: Can I have… / I’d like…',
      pointsUz: ['“Can I have…, please?” va “I’d like…” — muloyim so‘rov.', 'Sanaladigan bittasi → a/an; sanalmaydigan → some (some soup, some water).', 'Narx: How much is it? / How much are they?'],
      examples: [
        { en: 'Can I have some water, please?', uz: 'Bir oz suv bersangiz.' },
        { en: 'I’d like an apple juice.', uz: 'Olma sharbati olaman.' },
      ],
    },
  },
  {
    id: 'a1-d6-weekend-plan',
    level: 'A1',
    dayNumber: 6,
    titleUz: 'Hafta oxiriga taklif',
    situationUz: 'Do‘stingiz shanba kuni kinoga borishni taklif qilmoqda.',
    roles: { a: 'Friend', b: 'You' },
    lines: [
      { speaker: 'a', en: 'I’m going to watch a film on Saturday. Can you come?', uz: 'Shanba kuni kino ko‘rmoqchiman. Kela olasanmi?' },
      {
        speaker: 'b',
        en: 'Sorry, I ___ come on Saturday. I work.',
        uz: 'Kechir, shanba kuni kela olmayman. Ishlayman.',
        gap: { answer: 'can’t', options: ['can’t', 'don’t', 'am not'], skill: 'grammar', whyUz: 'Imkoniyat yo‘qligi “can’t” bilan: I can’t come.' },
      },
      { speaker: 'a', en: 'What about Sunday?', uz: 'Yakshanba-chi?' },
      {
        speaker: 'b',
        en: 'Sunday is OK. I’m going ___ visit my grandmother in the morning, but I’m free in the evening.',
        uz: 'Yakshanba bo‘ladi. Ertalab buvimnikiga bormoqchiman, lekin kechqurun bo‘shman.',
        gap: { answer: 'to', options: ['for', 'to', 'at'], skill: 'grammar', whyUz: 'Reja: be going TO + fe’l — I’m going to visit.' },
      },
      { speaker: 'a', en: 'Great! Do you like comedies?', uz: 'Zo‘r! Komediyalarni yoqtirasanmi?' },
      {
        speaker: 'b',
        en: 'Yes, I love ___ comedies!',
        uz: 'Ha, komediya ko‘rishni juda yaxshi ko‘raman!',
        gap: { answer: 'watching', options: ['watch', 'watches', 'watching'], skill: 'grammar', whyUz: 'love / like dan keyin fe’l -ing bilan: I love watching…' },
      },
    ],
    note: {
      titleUz: 'can / can’t va be going to',
      pointsUz: ['can / can’t + fe’l — qila olish (I can swim, I can’t come).', 'Reja: am / is / are going to + fe’l.', 'like / love / hate + fe’l-ing.'],
      examples: [
        { en: 'We are going to play football.', uz: 'Biz futbol o‘ynamoqchimiz.' },
        { en: 'She can’t drive.', uz: 'U mashina hayday olmaydi.' },
      ],
    },
  },
  {
    id: 'a1-d7-directions',
    level: 'A1',
    dayNumber: 7,
    titleUz: 'Yo‘l so‘rash',
    situationUz: 'Yangi shahardasiz va temir yo‘l vokzalini qidiryapsiz. Yo‘lovchidan so‘raysiz.',
    roles: { a: 'Passer-by', b: 'You' },
    lines: [
      {
        speaker: 'b',
        en: 'Excuse me, ___ is the railway station?',
        uz: 'Kechirasiz, temir yo‘l vokzali qayerda?',
        gap: { answer: 'where', options: ['what', 'where', 'who'], skill: 'vocabulary', whyUz: 'Joy so‘rash — “where”: Where is…?' },
      },
      { speaker: 'a', en: 'Go straight on and turn left at the bridge.', uz: 'To‘g‘riga yuring va ko‘prikda chapga buriling.' },
      {
        speaker: 'b',
        en: 'Turn left ___ the bridge. OK.',
        uz: 'Ko‘prikda chapga burilaman. Tushunarli.',
        gap: { answer: 'at', options: ['on', 'at', 'to'], skill: 'grammar', whyUz: 'Aniq nuqtada burilish — “at”: turn left at the bridge.' },
      },
      { speaker: 'a', en: 'Then the station is on your right, next to the museum.', uz: 'Keyin vokzal o‘ng tomoningizda, muzey yonida.' },
      {
        speaker: 'b',
        en: 'Is it far? Yesterday I ___ lost here!',
        uz: 'Uzoqmi? Kecha shu yerda adashib qolgandim!',
        gap: { answer: 'was', options: ['am', 'was', 'were'], skill: 'grammar', whyUz: 'O‘tgan zamon, “I” bilan → was: I was lost.' },
      },
      { speaker: 'a', en: 'No, it’s about five minutes on foot.', uz: 'Yo‘q, piyoda besh daqiqacha.' },
    ],
    note: {
      titleUz: 'Yo‘l ko‘rsatish iboralari va was / were',
      pointsUz: ['go straight on — to‘g‘riga yuring; turn left / right — chapga / o‘ngga buriling.', 'on your left / right — chap / o‘ng tomoningizda.', 'O‘tgan zamon: I / he / she / it → was; you / we / they → were.'],
      examples: [
        { en: 'The bank is on the left.', uz: 'Bank chap tomonda.' },
        { en: 'We were at home yesterday.', uz: 'Kecha biz uyda edik.' },
      ],
    },
  },

  /* ------------------------------- A2 ------------------------------- */
  {
    id: 'a2-d1-holiday-back',
    level: 'A2',
    dayNumber: 1,
    titleUz: 'Ta’tildan qaytgach',
    situationUz: 'Ishxonada hamkasbingiz ta’tilingiz haqida so‘ramoqda.',
    roles: { a: 'Colleague', b: 'You' },
    lines: [
      { speaker: 'a', en: 'Welcome back! How was your holiday?', uz: 'Qaytganingiz bilan! Ta’tilingiz qanday o‘tdi?' },
      {
        speaker: 'b',
        en: 'It was great, thanks. We ___ Samarkand for a week.',
        uz: 'Zo‘r o‘tdi, rahmat. Bir hafta Samarqandga borib keldik.',
        gap: { answer: 'visited', options: ['visit', 'visited', 'visiting'], skill: 'grammar', whyUz: 'Tugagan voqea — Past Simple: visit + -ed = visited.' },
      },
      { speaker: 'a', en: 'Lovely! What did you do there?', uz: 'Ajoyib! U yerda nima qildingiz?' },
      {
        speaker: 'b',
        en: 'We ___ around the old city and took lots of photos.',
        uz: 'Eski shahar bo‘ylab sayr qildik va ko‘p surat oldik.',
        gap: { answer: 'walked', options: ['walked', 'walks', 'walk'], skill: 'grammar', whyUz: 'Past Simple: walk → walked.' },
      },
      { speaker: 'a', en: 'Did you like the food?', uz: 'Taomlar yoqdimi?' },
      {
        speaker: 'b',
        en: 'Yes, I ___. The plov was amazing!',
        uz: 'Ha, yoqdi. Palov ajoyib edi!',
        gap: { answer: 'did', options: ['do', 'did', 'was'], skill: 'grammar', whyUz: 'Did you…? savoliga qisqa javob: Yes, I did / No, I didn’t.' },
      },
    ],
    note: {
      titleUz: 'Past Simple: to‘g‘ri fe’llar va qisqa javoblar',
      pointsUz: ['To‘g‘ri fe’l + -ed: visit → visited, walk → walked.', 'Savol: Did + ega + fe’lning 1-shakli? (Did you like…?)', 'Qisqa javob: Yes, I did. / No, I didn’t.'],
      examples: [
        { en: 'We stayed in a small hotel.', uz: 'Biz kichik mehmonxonada qoldik.' },
        { en: 'Did she call you? — No, she didn’t.', uz: 'U sizga qo‘ng‘iroq qildimi? — Yo‘q.' },
      ],
    },
  },
  {
    id: 'a2-d2-childhood',
    level: 'A2',
    dayNumber: 2,
    titleUz: 'Bolalik xotiralari',
    situationUz: 'Yangi tanishingiz bilan bolalikdagi o‘yinlar haqida gaplashyapsiz.',
    roles: { a: 'New friend', b: 'You' },
    lines: [
      { speaker: 'a', en: 'Where did you grow up?', uz: 'Qayerda o‘sgansiz?' },
      {
        speaker: 'b',
        en: 'I grew up in a small village. Our house ___ near a river.',
        uz: 'Kichik qishloqda o‘sganman. Uyimiz daryo yonida edi.',
        gap: { answer: 'was', options: ['was', 'were', 'is'], skill: 'grammar', whyUz: 'Bitta uy, o‘tgan zamon → was.' },
      },
      { speaker: 'a', en: 'What games did you play?', uz: 'Qanday o‘yinlar o‘ynardingiz?' },
      {
        speaker: 'b',
        en: 'We ___ football every day after school.',
        uz: 'Har kuni maktabdan keyin futbol o‘ynardik.',
        gap: { answer: 'played', options: ['play', 'played', 'playing'], skill: 'grammar', whyUz: 'play → played (y dan oldin unli bo‘lsa, -ed oddiy qo‘shiladi).' },
      },
      { speaker: 'a', en: 'Who was your favourite teacher?', uz: 'Eng yaxshi ko‘rgan o‘qituvchingiz kim edi?' },
      {
        speaker: 'b',
        en: 'Mr Karimov. He ___ us a lot about nature.',
        uz: 'Karimov domla. U bizga tabiat haqida ko‘p narsa o‘rgatgan.',
        gap: { answer: 'taught', options: ['teached', 'taught', 'teach'], skill: 'grammar', whyUz: '“teach” — noto‘g‘ri fe’l: teach → taught.' },
      },
    ],
    note: {
      titleUz: 'Noto‘g‘ri fe’llar va was / were',
      pointsUz: ['Ba’zi fe’llar -ed olmaydi: grow → grew, teach → taught, go → went.', 'Ularni yodlash kerak — har biri alohida shaklga ega.', 'I / he / she / it → was, you / we / they → were.'],
      examples: [
        { en: 'I went to school by bus.', uz: 'Maktabga avtobusda borardim.' },
        { en: 'My parents were teachers.', uz: 'Ota-onam o‘qituvchi edi.' },
      ],
    },
  },
  {
    id: 'a2-d3-train-ticket',
    level: 'A2',
    dayNumber: 3,
    titleUz: 'Vokzalda chipta olish',
    situationUz: 'Buxoroga borish uchun vokzal kassasidasiz.',
    roles: { a: 'Ticket clerk', b: 'You' },
    lines: [
      { speaker: 'a', en: 'Good afternoon. Where are you travelling to?', uz: 'Xayrli kun. Qayerga ketyapsiz?' },
      {
        speaker: 'b',
        en: 'To Bukhara. Which is ___, the train or the bus?',
        uz: 'Buxoroga. Qaysi biri tezroq: poyezdmi yoki avtobus?',
        gap: { answer: 'faster', options: ['fast', 'faster', 'fastest'], skill: 'grammar', whyUz: 'Ikki narsani solishtirish: qisqa sifat + -er → faster.' },
      },
      { speaker: 'a', en: 'The fast train. It takes four hours.', uz: 'Tezyurar poyezd. To‘rt soat yuradi.' },
      {
        speaker: 'b',
        en: 'Is it ___ expensive than the bus?',
        uz: 'U avtobusdan qimmatroqmi?',
        gap: { answer: 'more', options: ['more', 'most', 'much'], skill: 'grammar', whyUz: 'Uzun sifat bilan qiyos: more + sifat + than → more expensive than.' },
      },
      { speaker: 'a', en: 'A little. A return ticket is 200,000 sums.', uz: 'Biroz. Borib-kelish chiptasi 200 000 so‘m.' },
      {
        speaker: 'b',
        en: 'OK, one ___ ticket, please.',
        uz: 'Mayli, bitta borib-kelish chiptasi, iltimos.',
        gap: { answer: 'return', options: ['single', 'return', 'free'], skill: 'vocabulary', whyUz: '“return ticket” — borib-kelish; “single” — faqat bir tomonga.' },
      },
    ],
    note: {
      titleUz: 'Qiyosiy daraja: faster, more expensive',
      pointsUz: ['Qisqa sifat + -er + than: cheap → cheaper than.', 'Uzun sifat: more + sifat + than: more comfortable than.', 'Eng: the + -est / the most (the fastest, the most expensive).'],
      examples: [
        { en: 'The bus is cheaper than the train.', uz: 'Avtobus poyezddan arzonroq.' },
        { en: 'This is the most beautiful city.', uz: 'Bu eng go‘zal shahar.' },
      ],
    },
  },
  {
    id: 'a2-d4-weekend-weather',
    level: 'A2',
    dayNumber: 4,
    titleUz: 'Ob-havo va hafta oxiri rejalari',
    situationUz: 'Do‘stingiz bilan hafta oxiri tog‘ga chiqishni rejalashtiryapsiz.',
    roles: { a: 'Friend', b: 'You' },
    lines: [
      { speaker: 'a', en: 'What are your plans for the weekend?', uz: 'Hafta oxiriga qanday rejalaring bor?' },
      {
        speaker: 'b',
        en: 'I’m ___ to go hiking in the mountains.',
        uz: 'Tog‘da piyoda sayrga chiqmoqchiman.',
        gap: { answer: 'going', options: ['going', 'go', 'will'], skill: 'grammar', whyUz: 'Oldindan qilingan reja: be going to + fe’l.' },
      },
      { speaker: 'a', en: 'Do you know the weather forecast?', uz: 'Ob-havo ma’lumotini bilasanmi?' },
      {
        speaker: 'b',
        en: 'They say it ___ be sunny on Saturday.',
        uz: 'Shanba kuni quyoshli bo‘lishini aytishyapti.',
        gap: { answer: 'will', options: ['is', 'will', 'does'], skill: 'grammar', whyUz: 'Bashorat (ob-havo) — will + fe’l: it will be sunny.' },
      },
      { speaker: 'a', en: 'Sounds great. Can I come too?', uz: 'Zo‘r eshitiladi. Men ham borsam bo‘ladimi?' },
      {
        speaker: 'b',
        en: 'Of course! I ___ call you tonight with the details.',
        uz: 'Albatta! Kechqurun qo‘ng‘iroq qilib, tafsilotlarini aytaman.',
        gap: { answer: 'will', options: ['will', 'am', 'going'], skill: 'grammar', whyUz: 'Shu zahoti qabul qilingan qaror yoki va’da — will: I’ll call you.' },
      },
    ],
    note: {
      titleUz: 'be going to va will — farqi',
      pointsUz: ['be going to — oldindan o‘ylangan reja (I’m going to visit…).', 'will — bashorat (It will rain) yoki shu zahoti qaror/va’da (I’ll help you).'],
      examples: [
        { en: 'We are going to buy a new car.', uz: 'Yangi mashina olmoqchimiz.' },
        { en: 'It’s cold. I’ll close the window.', uz: 'Sovuq. Derazani yopaman.' },
      ],
    },
  },
  {
    id: 'a2-d5-job-interview',
    level: 'A2',
    dayNumber: 5,
    titleUz: 'Ish suhbati',
    situationUz: 'Mehmonxonaga resepshn xodimi lavozimiga suhbatdasiz.',
    roles: { a: 'Manager', b: 'You' },
    lines: [
      { speaker: 'a', en: 'Have you ever worked in a hotel?', uz: 'Hech mehmonxonada ishlaganmisiz?' },
      {
        speaker: 'b',
        en: 'Yes, I ___. I worked at a hotel in Tashkent last year.',
        uz: 'Ha, ishlaganman. O‘tgan yili Toshkentdagi mehmonxonada ishladim.',
        gap: { answer: 'have', options: ['have', 'did', 'am'], skill: 'grammar', whyUz: 'Have you ever…? savoliga qisqa javob: Yes, I have / No, I haven’t.' },
      },
      { speaker: 'a', en: 'Good. Have you finished your English course?', uz: 'Yaxshi. Ingliz tili kursingizni tugatdingizmi?' },
      {
        speaker: 'b',
        en: 'Not ___. I finish next month.',
        uz: 'Hali yo‘q. Keyingi oy tugataman.',
        gap: { answer: 'yet', options: ['already', 'yet', 'just'], skill: 'grammar', whyUz: 'Inkor va savolda “yet” — hali: not yet.' },
      },
      { speaker: 'a', en: 'And have you used our booking system before?', uz: 'Bizning bron qilish tizimimizdan oldin foydalanganmisiz?' },
      {
        speaker: 'b',
        en: 'No, I’ve ___ used it, but I learn quickly.',
        uz: 'Yo‘q, hech foydalanmaganman, lekin tez o‘rganaman.',
        gap: { answer: 'never', options: ['ever', 'never', 'yet'], skill: 'grammar', whyUz: '“never” — hech qachon: I’ve never used it.' },
      },
    ],
    note: {
      titleUz: 'Present Perfect: ever, never, already, yet',
      pointsUz: ['have / has + fe’lning 3-shakli: I have worked, she has finished.', 'ever — savolda “hech”; never — “hech qachon”.', 'already — allaqachon (tasdiq); yet — hali (inkor/savol).'],
      examples: [
        { en: 'Have you ever been to London?', uz: 'Hech Londonda bo‘lganmisiz?' },
        { en: 'I have already sent the email.', uz: 'Xatni allaqachon yubordim.' },
      ],
    },
  },
  {
    id: 'a2-d6-doctor',
    level: 'A2',
    dayNumber: 6,
    titleUz: 'Shifokor qabulida',
    situationUz: 'Bir necha kundan beri boshingiz og‘riyapti. Shifokor maslahat bermoqda.',
    roles: { a: 'Doctor', b: 'You' },
    lines: [
      { speaker: 'a', en: 'What’s the problem?', uz: 'Nima bezovta qilyapti?' },
      {
        speaker: 'b',
        en: 'I ___ a headache for three days.',
        uz: 'Uch kundan beri boshim og‘riyapti.',
        gap: { answer: 'have had', options: ['have had', 'had have', 'has'], skill: 'grammar', whyUz: 'Hozirgacha davom etayotgan holat: have had … for three days.' },
      },
      { speaker: 'a', en: 'Do you sleep well? Do you drink enough water?', uz: 'Yaxshi uxlaysizmi? Yetarli suv ichasizmi?' },
      {
        speaker: 'b',
        en: 'Not really. What ___ I do?',
        uz: 'Unchalik emas. Nima qilishim kerak?',
        gap: { answer: 'should', options: ['should', 'must to', 'have'], skill: 'grammar', whyUz: 'Maslahat so‘rash — should: What should I do?' },
      },
      { speaker: 'a', en: 'You should sleep eight hours and drink more water. You mustn’t work late.', uz: 'Sakkiz soat uxlang va ko‘proq suv iching. Kech ishlamasligingiz shart.' },
      {
        speaker: 'b',
        en: 'Do I have ___ take any medicine?',
        uz: 'Biror dori ichishim kerakmi?',
        gap: { answer: 'to', options: ['to', 'for', 'at'], skill: 'grammar', whyUz: 'Majburiyat: have to + fe’l → Do I have to take…?' },
      },
    ],
    note: {
      titleUz: 'Modal fe’llar: should, must, have to',
      pointsUz: ['should — maslahat (You should rest).', 'must / mustn’t — qat’iy qoida (You mustn’t smoke here).', 'have to — tashqi majburiyat (I have to work on Saturday).', 'Modal fe’ldan keyin “to” qo‘yilmaydi: must go, should eat (have to bundan mustasno).'],
      examples: [
        { en: 'You should see a dentist.', uz: 'Tish shifokoriga borishingiz kerak.' },
        { en: 'We have to wear a uniform.', uz: 'Biz forma kiyishimiz shart.' },
      ],
    },
  },
  {
    id: 'a2-d7-market',
    level: 'A2',
    dayNumber: 7,
    titleUz: 'Do‘konda xarid',
    situationUz: 'Mehmonlar uchun ovqat tayyorlaysiz va oziq-ovqat do‘konidasiz.',
    roles: { a: 'Shop assistant', b: 'You' },
    lines: [
      { speaker: 'a', en: 'Hello! Can I help you?', uz: 'Salom! Yordam bera olamanmi?' },
      {
        speaker: 'b',
        en: 'Yes, please. I need ___ tomatoes and some rice.',
        uz: 'Ha, iltimos. Menga bir nechta pomidor va bir oz guruch kerak.',
        gap: { answer: 'some', options: ['any', 'some', 'much'], skill: 'grammar', whyUz: 'Tasdiq gapda — some: I need some tomatoes.' },
      },
      { speaker: 'a', en: 'How many tomatoes would you like?', uz: 'Nechta pomidor olasiz?' },
      {
        speaker: 'b',
        en: 'A kilo, please. And how ___ rice do I need for six people?',
        uz: 'Bir kilo, iltimos. Olti kishiga qancha guruch kerak?',
        gap: { answer: 'much', options: ['many', 'much', 'lot'], skill: 'grammar', whyUz: '“rice” — sanalmaydi → how much; sanaladigan → how many.' },
      },
      { speaker: 'a', en: 'About one kilo. Do you need any onions?', uz: 'Taxminan bir kilo. Piyoz kerakmi?' },
      {
        speaker: 'b',
        en: 'No, thanks. I’ve got a ___ of onions at home.',
        uz: 'Yo‘q, rahmat. Uyda piyoz ko‘p.',
        gap: { answer: 'lot', options: ['lot', 'many', 'few'], skill: 'grammar', whyUz: '“a lot of” — ko‘p (sanaladigan ham, sanalmaydigan ham).' },
      },
    ],
    note: {
      titleUz: 'some / any, much / many, a lot of',
      pointsUz: ['some — tasdiqda, any — inkor va savolda.', 'many — sanaladigan (many apples), much — sanalmaydigan (much water).', 'a lot of — ikkalasi bilan ham ishlaydi.'],
      examples: [
        { en: 'Is there any milk?', uz: 'Sut bormi?' },
        { en: 'We haven’t got much time.', uz: 'Vaqtimiz ko‘p emas.' },
      ],
    },
  },
]

/** Daraja bo'yicha suhbatlar (kun tartibida). */
export function dialoguesFor(level: CefrLevel): Dialogue[] {
  return DIALOGUES.filter((d) => d.level === level).sort((a, b) => a.dayNumber - b.dayNumber)
}

export function findDialogue(id: string): Dialogue | undefined {
  return DIALOGUES.find((d) => d.id === id)
}

/** Bo'shliqli qatorlarning indekslari (suhbat ichidagi tartibda). */
export function gapLineIndexes(d: Dialogue): number[] {
  return d.lines.flatMap((l, i) => (l.gap ? [i] : []))
}

export function dialogueExerciseId(d: Dialogue, lineIndex: number): string {
  return `${DIALOGUE_PREFIX}${d.id}-${lineIndex}`
}

/** Qatorni to'liq ko'rinishda (bo'shliq o'rniga javob) — yakuniy ko'rish uchun. */
export function filledLine(line: DialogueLine): string {
  return line.gap ? line.en.replace('___', line.gap.answer) : line.en
}

/**
 * Bo'shliqli qator → tanlov mashqi. Savol — o'quvchining replikasi, iqtibos —
 * undan oldingi replika (suhbat konteksti).
 */
export function dialogueExercise(d: Dialogue, lineIndex: number): MultipleChoiceExercise | undefined {
  const line = d.lines[lineIndex]
  if (!line?.gap) return undefined
  const prev = lineIndex > 0 ? d.lines[lineIndex - 1] : undefined
  return {
    id: dialogueExerciseId(d, lineIndex),
    kind: 'multiple-choice',
    instructionUz: 'Suhbatni davom ettiring: bo‘sh joyga mos variantni tanlang.',
    level: d.level,
    skill: line.gap.skill,
    explanationUz: `${line.gap.whyUz} To‘liq: “${filledLine(line)}” — ${line.uz}`,
    difficulty: d.level === 'A1' ? 1 : 2,
    tags: ['dialogue', d.id],
    passageExcerpt: prev ? `${d.roles[prev.speaker]}: ${prev.en}` : undefined,
    question: `${d.roles[line.speaker]}: ${line.en}`,
    options: line.gap.options,
    answerIndex: line.gap.options.indexOf(line.gap.answer),
  }
}

/** `dlg-<suhbat id>-<qator>` → mashq (Xatolar daftari uchun). */
export function findDialogueExercise(id: string): MultipleChoiceExercise | undefined {
  if (!id.startsWith(DIALOGUE_PREFIX)) return undefined
  const m = /^(.*)-(\d+)$/.exec(id.slice(DIALOGUE_PREFIX.length))
  if (!m) return undefined
  const d = findDialogue(m[1]!)
  return d ? dialogueExercise(d, Number(m[2])) : undefined
}

/** Barcha suhbat mashqlari (kontent auditi va qidiruv uchun). */
export function allDialogueExercises(level?: CefrLevel): MultipleChoiceExercise[] {
  return (level ? dialoguesFor(level) : [...DIALOGUES]).flatMap((d) =>
    gapLineIndexes(d)
      .map((i) => dialogueExercise(d, i))
      .filter((e): e is MultipleChoiceExercise => e !== undefined),
  )
}
