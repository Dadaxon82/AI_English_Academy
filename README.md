# AI English Academy 🎓

AI English Academy is a robust, offline-first English language learning platform designed to guide users from A1 to C1 levels using a structured CEFR-based curriculum. It combines traditional pedagogical methods (SRS, structured daily plans) with modern features like AI-assisted writing analysis, interactive speaking exercises with transcription, and a comprehensive progress tracking system.

## 🚀 Features

- **Offline-First Persistence**: Uses `idb-keyval` for primary storage with `localStorage` fallback, ensuring learning can continue without a constant internet connection.
- **Structured Learning Path**: A 7-day-per-level curriculum with 6 daily skills (Vocabulary, Grammar, Reading, Listening, Writing, Speaking).
- **Spaced Repetition System (SRS)**: Integrated vocabulary management based on the SM-2 algorithm.
- **Smart Content Bundling**: Centralized content registry allowing for easy addition of new levels and modules.
- **Interactive Exercises**:
  - **Grammar**: Adaptive "step-by-step" learning with feedback on consecutive errors.
  - **Reading**: Immersive text experience with integrated glossary and time-tracking.
  - **Listening**: Audio playback with transcript unlock policies (always/listen-first/check-first).
  - **Speaking**: Browser-based speech recognition with real-time transcription and analysis.
  - **Writing**: Writing assistant with word counters, prompt guidance, and rule-based/AI analysis.
- **Progress Analytics**: Detailed tracking of skill evidence, streaks, XP, and mock exam results.
- **Mock Exams**: Final assessments for each level to verify proficiency.

## 🛠 Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide React.
- **Persistence**: `idb-keyval` (IndexedDB), `localStorage`.
- **Backend/Auth**: Supabase (Auth, Database, Storage).
- **AI**: (Optional) Integration with LLMs for writing analysis and content generation.
- **Audio**: Web Audio API, Browser Speech Recognition API.

## 🏗 Architecture

- **Content Registry**: `src/content/index.ts` maps levels to bundles of daily plans and vocabulary.
- **Storage Layer**: `src/lib/storage.ts` handles the abstraction between IndexedDB and LocalStorage, including a sync queue for Supabase.
- **Sync Engine**: `src/lib/sync.ts` manages background synchronization of user data (settings, results, vocabulary).
- **Analysis Engine**: `src/lib/analyze.ts` provides rule-based feedback on writing submissions.
- **SRS Logic**: `src/lib/srs.ts` implements the core spaced repetition formulas.

## ⚙️ Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-repo/ai-english-academy.git
    cd ai-english-academy
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Configuration**:
    Create a `.env.local` file and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

## 📖 Usage

1.  **Onboarding**: New users start by setting their current level, target goal, daily study minutes, and exam date.
2.  **Daily Plan**: The dashboard presents a customized 90-minute daily plan.
3.  **Learning**: Navigate through the "O'quv yo'li" (Learning Path) to complete days sequentially.
4.  **Review**: Use the "Lug'at" (Vocabulary) section to review words learned during lessons using the SRS system.
5.  **Assessment**: Take mock exams at the end of each level to see your progress.

## 📄 License

This project is licensed under the MIT License.
