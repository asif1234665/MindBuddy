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
    const txt = input.toLowerCase().trim();

    // Check day 1 task triggering
    if (window.journeyManager && window.journeyManager.currentDay === 1) {
      // Trigger vent completion
      setTimeout(() => {
        window.journeyManager.completeTask("d1_vent");
      }, 1000);
    }

    // Keep history counters in memory to prevent repeating the same responses
    if (!this.responseIndices) {
      this.responseIndices = {};
    }

    const getVariedResponse = (key, pool) => {
      if (this.responseIndices[key] === undefined) {
        this.responseIndices[key] = 0;
      }
      const idx = this.responseIndices[key] % pool.length;
      this.responseIndices[key]++;
      return pool[idx];
    };

    // 1. Simple conversational fillers / agreements
    if (txt === "yes" || txt === "yeah" || txt === "yep" || txt === "ok" || txt === "okay" || txt === "sure") {
      const pool = [
        `I appreciate you staying open to this. Tell me a bit more about what's going on, or is there a specific activity you'd like to try? 🌸`,
        `Understood. I'm right here with you. What direction would you like our conversation to go next? 💬`,
        `Okay, friend. Take your time. I'm here to listen whenever you're ready to share. 🍵`
      ];
      return getVariedResponse("fillers", pool);
    }

    if (txt === "no" || txt === "nope" || txt === "not really") {
      const pool = [
        `That is completely fine. We don't have to push anything. We can just sit here quietly, play a game, or practice breathing. What sounds best? 🍃`,
        `No worries at all. Your comfort is what matters. Let me know how I can best support you right now. 🤝`
      ];
      return getVariedResponse("no_fillers", pool);
    }

    // 2. Greetings
    if (txt.includes("hello") || txt.includes("hi ") || txt.startsWith("hi") || txt.includes("hey")) {
      const pool = [
        `Hello there, friend! I'm ${this.name}. It is so nice to check in with you. How are you holding up today? 🌸`,
        `Hi! I'm glad you're here. How has your day been treating you? What's on your mind? 🍃`,
        `Hey there! I am ${this.name}, your mindful companion. I'm here to listen, talk, and help you find some calm. What can I do for you today? 🤖`
      ];
      return getVariedResponse("greetings", pool);
    }

    // 3. Anxiety / Panic / Fear
    if (txt.includes("anxious") || txt.includes("panic") || txt.includes("heart") || txt.includes("anxiety") || txt.includes("scared") || txt.includes("worry") || txt.includes("worried") || txt.includes("nervous")) {
      const pool = [
        `I hear you, and I can tell you're feeling very anxious right now. When anxiety flares, our body's threat detector is just trying to protect us, even if there's no real danger. Let's take a slow breath. If you are on Day 1 of your journey, try the Box Breathing exercise! 🌬️`,
        `It's completely okay to feel worried, but remember: you are safe in this present moment. Let's focus on 3 things you can see and 1 sound you can hear right now. What are they? 🌸`,
        `Anxiety is a heavy feeling. Let's try to soften it. Can we write down this worry together in the Cognitive Reframer (Day 2 exercise) and see if we can look at it a bit differently? 🍵`
      ];
      return getVariedResponse("anxiety", pool);
    }

    // 4. Stress / Overwhelm / Pressure
    if (txt.includes("stress") || txt.includes("busy") || txt.includes("overwhelm") || txt.includes("tired") || txt.includes("exhausted") || txt.includes("pressure") || txt.includes("work") || txt.includes("school") || txt.includes("project")) {
      const pool = [
        `It sounds like there is a lot on your plate, and you're carrying a heavy burden. Please give yourself permission to step away from it all for just a minute. You don't have to carry the whole mountain at once. 🌲`,
        `I understand. Overwhelm makes everything look urgent. Let's slow down. What is just one small thing you can control or do right now, even if it's just drinking a glass of water? 💧`,
        `Being stressed and tired is exhausting. You have been doing so much. Make sure to rest. Would you like to play a quick round of Tic-Tac-Toe to distract your mind for a bit? 🎮`
      ];
      return getVariedResponse("stress", pool);
    }

    // 5. Sadness / Loneliness / Pain
    if (txt.includes("sad") || txt.includes("cry") || txt.includes("depressed") || txt.includes("alone") || txt.includes("lonely") || txt.includes("hurt") || txt.includes("crying")) {
      const pool = [
        `I am so sorry you are going through this. Feeling sad or lonely can make the world feel very dark. Please know that I am here, and your feelings are completely valid. It's okay to not be okay. 🍵`,
        `I'm wrapping a warm, virtual hug around you. You don't have to put on a brave face with me. Tell me more about what's making you feel this way, if you feel comfortable sharing. 🌸`,
        `It's hard when we feel isolated. I'm glad you reached out. What is one small thing that usually brings you comfort when you feel down? A cozy blanket, a warm drink, or a favorite song? 🎵`
      ];
      return getVariedResponse("sadness", pool);
    }

    // 6. Self-doubt / Mistakes / Failures
    if (txt.includes("mistake") || txt.includes("fail") || txt.includes("failure") || txt.includes("stupid") || txt.includes("worthless") || txt.includes("hate myself")) {
      const pool = [
        `Please be gentle with yourself. You are judging yourself so harshly for being human. A mistake is just an experience to learn from, not a definition of who you are. 🌸`,
        `I hear a lot of self-doubt. You are capable and strong, even when things go wrong. If a close friend made this mistake, would you call them stupid? Try to offer that same kindness to yourself. 🍃`,
        `We all face setbacks. Let's look at this in the Day 2 Cognitive Reframer. It helps to rewrite these negative sentences with a bit more perspective and mercy. 🍵`
      ];
      return getVariedResponse("self_doubt", pool);
    }

    // 7. Relationships / Fights / Family
    if (txt.includes("friend") || txt.includes("family") || txt.includes("parent") || txt.includes("relationship") || txt.includes("fight") || txt.includes("argue") || txt.includes("argument")) {
      const pool = [
        `Relationship difficulties can cause a lot of emotional pain. It's exhausting when we feel misunderstood by people close to us. How are you holding up after that conflict? 💬`,
        `It is tough when communication breaks down. Take a deep breath. Sometimes giving the situation a little space is the best first step. What's the main thing you wish they understood? 🌸`
      ];
      return getVariedResponse("relationships", pool);
    }

    // 8. Help / Advice / Tips
    if (txt.includes("help") || txt.includes("advice") || txt.includes("tips") || txt.includes("what should i do")) {
      const pool = [
        `I'd love to help! If you're looking for breathing guidance, open Day 1. If you want to tackle negative thoughts, try Day 2. If you want to play a game to de-stress, head to the Game Center. What sounds most helpful right now? 🎮`,
        `While I can't make decisions for you, I can help you weigh your options. What's the main challenge you are trying to solve? Let's break it down together. 🌸`
      ];
      return getVariedResponse("advice", pool);
    }

    // 9. Games
    if (txt.includes("game") || txt.includes("play") || txt.includes("tic tac toe") || txt.includes("tic-tac-toe") || txt.includes("bored") || txt.includes("fun")) {
      const pool = [
        `I would love to play a game with you! Head over to the Game Center on the sidebar. We can play Tic-Tac-Toe, a Word Chain, or Memory cards. It's a great way to clear your head! 🎮`,
        `Let's play! Click the Game Center tab on the left. Playing games helps shift our focus and lets our brain release some positive dopamine. Which game do you want to play? 🤖`
      ];
      return getVariedResponse("games", pool);
    }

    // 10. Positive feedback / Gratitude / Thanks
    if (txt.includes("thank") || txt.includes("thanks") || txt.includes("good") || txt.includes("better") || txt.includes("happy") || txt.includes("great")) {
      const pool = [
        `Hearing that makes me so happy! I'm glad I could bring you some comfort. What else is on your mind, or would you like to check off another day's challenge? ☀️`,
        `You are very welcome! Self-care is a daily practice, and you are taking great steps. I'm always here for you. 🌸`,
        `That is wonderful to hear! I'm glad you're feeling a bit better. Remember, you can save these thoughts in your Worry Journal to review later! 🍵`
      ];
      return getVariedResponse("positive", pool);
    }

    // 11. Default Catch-all Conversational Responses
    const defaultPool = [
      `I'm listening. Sometimes it's hard to put what we're feeling into words, and that's okay. Tell me a bit more about what brought this to your mind. 💬`,
      `Thank you for sharing that with me. It takes courage to open up. What do you think is the hardest part of this situation for you right now? 🍵`,
      `I see. That sounds like a lot to process. If you could change one thing about this situation right now, what would it be? 🌸`,
      `I am here for you. Tell me a bit more. I want to understand what you are going through. 🍃`
    ];
    return getVariedResponse("default", defaultPool);
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
