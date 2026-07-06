/* agent.js - AI Companion Brain & Web Speech Interface */

class AgentBrain {
  constructor() {
    this.name = "ZenBuddy";
    this.speechEnabled = true;
    this.speechVoiceName = "none";
    this.selectedVoice = null;
    this.recognition = null;
    this.isListening = false;
    this.geminiApiKey = "";
    
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
    this.loadSettings();
  }

  loadSettings() {
    const savedName = localStorage.getItem("mindbuddy_agent_name");
    if (savedName) this.name = savedName;
    
    const savedKey = localStorage.getItem("mindbuddy_gemini_key");
    if (savedKey) this.geminiApiKey = savedKey;

    const savedSpeechActive = localStorage.getItem("mindbuddy_speech_active");
    if (savedSpeechActive !== null) {
      this.speechEnabled = savedSpeechActive === "true";
    }

    const savedVoice = localStorage.getItem("mindbuddy_speech_voice");
    if (savedVoice) this.speechVoiceName = savedVoice;
  }

  saveSettings(name, key, speechActive, voiceName) {
    this.name = name || "ZenBuddy";
    this.geminiApiKey = key || "";
    this.speechEnabled = speechActive;
    this.speechVoiceName = voiceName || "none";

    localStorage.setItem("mindbuddy_agent_name", this.name);
    localStorage.setItem("mindbuddy_gemini_key", this.geminiApiKey);
    localStorage.setItem("mindbuddy_speech_active", this.speechEnabled);
    localStorage.setItem("mindbuddy_speech_voice", this.speechVoiceName);

    this.updateVoiceSelection();
  }

  // --- Web Speech API (Text to Speech) ---
  initSpeechSynthesis() {
    if (!('speechSynthesis' in window)) {
      console.warn("Text-to-Speech is not supported in this browser.");
      return;
    }

    // Populate voices on load
    const populateVoices = () => {
      const select = document.getElementById("settings-voice-select");
      if (!select) return;

      // Clear existing
      select.innerHTML = '<option value="none">Browser Default Voice</option>';

      const voices = window.speechSynthesis.getVoices();
      voices.forEach(voice => {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (voice.name === this.speechVoiceName) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      
      this.updateVoiceSelection();
    };

    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }
  }

  updateVoiceSelection() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    this.selectedVoice = voices.find(v => v.name === this.speechVoiceName) || null;
  }

  speak(text) {
    if (!this.speechEnabled || !('speechSynthesis' in window)) return;

    // Stop ongoing speech
    window.speechSynthesis.cancel();

    // Remove emoji icons from speech text for cleaner reads
    const cleanText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    // Speech UI triggers
    const speechWave = document.getElementById("agent-speech-wave");
    utterance.onstart = () => {
      if (speechWave) speechWave.classList.add("active");
    };

    utterance.onend = utterance.onerror = () => {
      if (speechWave) speechWave.classList.remove("active");
    };

    window.speechSynthesis.speak(utterance);
  }

  // --- Web Speech API (Speech to Text) ---
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech-to-Text is not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      const micBtn = document.getElementById("mic-toggle-btn");
      if (micBtn) micBtn.classList.add("listening");
      showToast("ZenBuddy is listening...", "info");
    };

    this.recognition.onerror = (e) => {
      console.error(e);
      this.isListening = false;
      const micBtn = document.getElementById("mic-toggle-btn");
      if (micBtn) micBtn.classList.remove("listening");
      showToast("Speech recognition error: " + e.error, "error");
    };

    this.recognition.onend = () => {
      this.isListening = false;
      const micBtn = document.getElementById("mic-toggle-btn");
      if (micBtn) micBtn.classList.remove("listening");
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const inputField = document.getElementById("chat-input-field");
      if (inputField) {
        inputField.value = transcript;
        // Auto trigger send after speak
        setTimeout(() => {
          document.getElementById("chat-send-btn").click();
        }, 500);
      }
    };
  }

  toggleListening() {
    if (!this.recognition) {
      showToast("Speech recognition is not supported in this browser.", "error");
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }

  // --- Brain Reasoning & Conversational API ---
  async getResponse(userInput, history = []) {
    // If Gemini key is set, attempt Gemini API fetch
    if (this.geminiApiKey) {
      try {
        return await this.callGeminiAPI(userInput, history);
      } catch (err) {
        console.error("Gemini API Error, falling back to local brain:", err);
        return this.getLocalBrainResponse(userInput);
      }
    } else {
      return this.getLocalBrainResponse(userInput);
    }
  }

  async callGeminiAPI(userInput, history) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;
    
    // Convert history for API
    const formattedHistory = [];
    // System rule prompt
    const systemPrompt = `You are ${this.name}, a warm, supportive, and wise AI friend. Your core purpose is to listen to the user's worries, comfort them like a close buddy, and offer simple grounding tips. Keep your replies structured, kind, concise (no more than 3-4 sentences in chat unless necessary), and highly comforting. Validate their emotions first before offering suggestions.`;

    formattedHistory.push({
      role: "user",
      parts: [{ text: systemPrompt + " Please respond to the user's initial greeting or message." }]
    });

    formattedHistory.push({
      role: "model",
      parts: [{ text: `Hello! I am ${this.name}, your mindful friend. I am ready to support you. What is on your mind?` }]
    });

    history.forEach(msg => {
      formattedHistory.push({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      });
    });

    // Append current user input
    formattedHistory.push({
      role: "user",
      parts: [{ text: userInput }]
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: formattedHistory
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Invalid API response format");
    }
  }

  getLocalBrainResponse(input) {
    const txt = input.toLowerCase();

    // Check day 1 task triggering
    if (window.journeyManager && window.journeyManager.currentDay === 1) {
      // Trigger vent completion
      setTimeout(() => {
        window.journeyManager.completeTask("d1_vent");
      }, 1000);
    }

    // Sentiment/Keyword matching local responses
    if (txt.includes("hello") || txt.includes("hi ") || txt.includes("hey")) {
      return `Hello there, friend! I am ${this.name}. I'm here to listen to anything that's making you anxious or stressed. What's currently on your mind? 🌸`;
    }
    
    if (txt.includes("anxious") || txt.includes("panic") || txt.includes("heart") || txt.includes("anxiety") || txt.includes("scared")) {
      return `I hear how intense that feeling is right now. When anxiety flares, our bodies are just trying to keep us safe, but we can teach them that it's okay to stand down. Let's take a deep breath together. If you're on Day 1 of your journey, try opening the Box Breathing exercise! 🌬️`;
    }

    if (txt.includes("stress") || txt.includes("busy") || txt.includes("overwhelm") || txt.includes("tired") || txt.includes("fail")) {
      return `It sounds like you are carrying a very heavy load right now. Please remember that you don't need to have everything figured out this exact second. Take a step back, rest your shoulders, and let's tackle things one little piece at a time. I'm right here with you. 🌲`;
    }

    if (txt.includes("sad") || txt.includes("cry") || txt.includes("depressed") || txt.includes("alone") || txt.includes("hurt")) {
      return `I am so sorry you are going through this. Feeling down can make us feel isolated, but I want you to know that your feelings are completely valid, and you are not alone. It's okay to feel this way. Be extra gentle with yourself today. 🍵`;
    }

    if (txt.includes("game") || txt.includes("play") || txt.includes("tic tac toe") || txt.includes("tic-tac-toe")) {
      return `I'd love to play with you! Head over to the Game Center on the sidebar. We can play Tic-Tac-Toe, a Word Chain, or a Memory match. It's a wonderful way to give your mind a restful distraction! 🎮`;
    }

    if (txt.includes("thank") || txt.includes("good") || txt.includes("better") || txt.includes("happy")) {
      return `Hearing that brings a smile to my face! I am so glad I could support you. Remember, self-care is a daily practice, and you are doing a wonderful job. What else would you like to discuss or do today? ☀️`;
    }

    // Default Empathetic Catch-All
    return `Thank you for sharing that with me. I'm listening. It takes courage to open up about what is bothering you. What do you think is the biggest thing triggering that feeling right now? Let's talk it through. 💬`;
  }

  // --- Dynamic Reframer System ---
  reframeWorry(worry) {
    // Local reframe logic generator
    const localReframes = [
      `Even though you feel like this, you have handled difficult days before. Making mistakes is a step toward learning.`,
      `It is natural to worry, but this outcome is just one possibility, not a certainty. Let's focus on what you can control right now.`,
      `You are holding yourself to a standard of perfection. You are allowed to be in progress. Your worth isn't tied only to results.`,
      `This feeling is temporary. It is okay to take a break and try again. Your effort is what counts.`
    ];

    const chosenReframe = localReframes[Math.floor(Math.random() * localReframes.length)];
    
    // Complete Day 2 task
    if (window.journeyManager) {
      window.journeyManager.completeTask("d2_reframe");
    }

    return `Instead of: "${worry}"\n\nTry thinking: "I am doing the best I can, and that is enough. ${chosenReframe}"`;
  }

  // --- Gratitude feedback generator ---
  getGratitudeFeedback(item1, item2, item3) {
    if (window.journeyManager) {
      window.journeyManager.completeTask("d4_gratitude");
    }

    const affirmations = [
      `1. I appreciate the joy found in: "${item1}"`,
      `2. I welcome the grounding presence of: "${item2}"`,
      `3. I honor the comfort and warmth of: "${item3}"`
    ].join("\n");

    const feedback = `These are beautiful things to hold close, friend. Noting "${item1}", "${item2}", and "${item3}" helps train our minds to notice the light around us. \n\nClick "Voice Affirmations" to hear me read these back to you!`;
    return { feedback, affirmations };
  }
}

// Global instance
window.agentBrain = new AgentBrain();
