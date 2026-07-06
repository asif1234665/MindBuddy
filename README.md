# MindBuddy AI Agent - 5-Day Project

MindBuddy is a client-side AI companion website designed for a 5-day emotional health and stress relief challenge. It includes voice synthesis (text-to-speech) and recognition (speech-to-text), calming mini-games, and a guided journey.

## 📁 File Structure

- **[index.html](file:///C:/Users/HP/mindbuddy/index.html)**: Main structure of the application.
- **[style.css](file:///C:/Users/HP/mindbuddy/style.css)**: Calm, glassmorphic layout, variables, grids, and breathing bubble animations.
- **[app.js](file:///C:/Users/HP/mindbuddy/app.js)**: Orchestrates tab navigation, persistent storage logs, and includes a **Web Audio API synthesizer** generating offline ambient tracks (Rain, Waves, Cosmic Hum).
- **[agent.js](file:///C:/Users/HP/mindbuddy/agent.js)**: Voice engine (STT and TTS properties) and chat integration with optional Gemini Key input or a local empathetic rule fallback.
- **[games.js](file:///C:/Users/HP/mindbuddy/games.js)**: Game logic (Tic-Tac-Toe, Word Chain, Memory Match) and Box Breathing guide cycles.
- **[journey.js](file:///C:/Users/HP/mindbuddy/journey.js)**: Keeps track of Day unlocks (1-5) and checklists.

## 🚀 How to Run the Website

You can run the project in three different ways depending on your needs:

### Option A: Secure Server Mode (Recommended for Shared Multi-User Chat)
This mode runs a Python Flask backend that securely proxies your Gemini API calls, so that **none of your visitors need to enter an API key themselves**, and your private key is kept hidden.
1. Create a `config.json` file in the project folder (use `config.json.example` as a template) and add your `GEMINI_API_KEY`.
2. Open PowerShell or Command Prompt in the project folder:
   ```powershell
   cd C:\Users\HP\mindbuddy
   ```
3. Start the Flask backend:
   ```powershell
   python server.py
   ```
4. Open your browser and go to `http://localhost:8000`.

### Option B: Local Static Server (Quick testing)
A lightweight static server. In this mode, users will use the offline local emotional fallback conversation engine, or they can enter their own API key in their local Settings tab.
1. Navigate to the project directory:
   ```powershell
   cd C:\Users\HP\mindbuddy
   ```
2. Start Python's built-in static server:
   ```powershell
   python -m http.server 8000
   ```
3. Open your browser and go to `http://localhost:8000`.

### Option C: Direct Browser Launch
1. Double-click `index.html` in your file explorer to open it directly. (Note: Some advanced speech-to-text features may require running a server to comply with browser origin rules).

## 📅 The 5-Day Guided Journey
1. **Day 1: Grounding & Venting** - Share worries in chat (marks off "Vent worry" task) and practice 4-4-4-4 Box Breathing.
2. **Day 2: Reframing Thoughts** - Write down self-doubts and let ZenBuddy suggest a kind reframe, then complete a Word Chain game.
3. **Day 3: Mindful Play** - Play Tic-Tac-Toe vs ZenBuddy (featuring dynamic chatbot commentary) and clear the Memory Cards matching game.
4. **Day 4: Gratitude & Affirmations** - Log three small things you are thankful for and listen to ZenBuddy read them back as custom affirmations.
5. **Day 5: Future Self Letter** - Write a letter to your future self. ZenBuddy locks it in your Worry Journal history and triggers a final completion ceremony.
