/* app.js - Main Controller & Web Audio Ambient Sound Synthesizer */

// --- Web Audio Ambient Sound Synth Engine ---
class AmbientSoundEngine {
  constructor() {
    this.ctx = null;
    this.nodes = {
      rain: null,
      waves: null,
      hum: null
    };
    this.states = {
      rain: false,
      waves: false,
      hum: false
    };
  }

  lazyInit() {
    if (this.ctx) return;
    // Create AudioContext
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
  }

  toggleRain(active) {
    this.lazyInit();
    this.states.rain = active;

    if (active) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      
      // 1. Create a white noise source
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // 2. Create a bandpass filter to shape rain tone
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.8;

      // 3. Create a gain node for volume control
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);

      // Connect
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      noiseSource.start();
      
      this.nodes.rain = {
        source: noiseSource,
        gain: gainNode
      };
    } else {
      if (this.nodes.rain) {
        try { this.nodes.rain.source.stop(); } catch (e) {}
        this.nodes.rain = null;
      }
    }
  }

  toggleWaves(active) {
    this.lazyInit();
    this.states.waves = active;

    if (active) {
      if (this.ctx.state === 'suspended') this.ctx.resume();

      // 1. Create white noise
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // 2. Low pass filter for sea swell depth
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 350;

      // 3. Gain modulator for automatic wave rolling (LFO)
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.04, this.ctx.currentTime);

      // Use a slow oscillator (LFO) to swell gain up and down
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.12; // 0.12 Hz = roughly 8s cycles
      
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.08; // swell amplitude

      // Connect LFO to gainNode parameter
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);

      // Connect noise path
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      noiseSource.start();
      lfo.start();

      this.nodes.waves = {
        source: noiseSource,
        lfo: lfo,
        gain: gainNode
      };
    } else {
      if (this.nodes.waves) {
        try { this.nodes.waves.source.stop(); } catch(e) {}
        try { this.nodes.waves.lfo.stop(); } catch(e) {}
        this.nodes.waves = null;
      }
    }
  }

  toggleHum(active) {
    this.lazyInit();
    this.states.hum = active;

    if (active) {
      if (this.ctx.state === 'suspended') this.ctx.resume();

      // Meditation Drone: Triangle wave at 75Hz and a detuned sine at 75.5Hz
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.value = 75;

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 75.6;

      // Low pass filter to remove harsh harmonics
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 120;

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.18, this.ctx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      this.nodes.hum = {
        osc1: osc1,
        osc2: osc2,
        gain: gainNode
      };
    } else {
      if (this.nodes.hum) {
        try { this.nodes.hum.osc1.stop(); } catch(e) {}
        try { this.nodes.hum.osc2.stop(); } catch(e) {}
        this.nodes.hum = null;
      }
    }
  }
}

// Global Ambient Synth
const soundEngine = new AmbientSoundEngine();


// --- Toast Notification helper ---
function showToast(message, type = "info") {
  const existing = document.querySelector(".toast-msg");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast-msg ${type}`;
  
  let icon = '<i class="fa-solid fa-circle-info"></i>';
  if (type === "success") icon = '<i class="fa-solid fa-circle-check"></i>';
  if (type === "error") icon = '<i class="fa-solid fa-triangle-exclamation"></i>';

  toast.innerHTML = `${icon} <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = 0;
    toast.style.transform = "translateY(20px) scale(0.9)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}


// --- Main Application Manager ---
document.addEventListener("DOMContentLoaded", () => {
  
  // 1. Navigation Panel Switches
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".page-section, .chat-section");
  const pageTitle = document.getElementById("page-title");
  const pageSubtitle = document.getElementById("page-subtitle");

  const pageSubtitles = {
    dashboard: "Your personal space for calm and clarity.",
    chat: "A safe, silent space to share what's weighing you down.",
    journey: "Step-by-step reflection exercises mapped out for you.",
    games: "Calm your mind and improve focus with light interactive play.",
    journal: "Review your shared thoughts, reframes, and reflections.",
    settings: "Configure ZenBuddy's properties and key parameters."
  };

  const pageTitles = {
    dashboard: "Welcome Home",
    chat: "Venting & Discussion",
    journey: "5-Day Emotional Journey",
    games: "Game Center",
    journal: "Your Worry Journal",
    settings: "System Settings"
  };

  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      const target = link.dataset.target;
      
      // Update nav link states
      navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      // Update pages visibility
      sections.forEach(sec => sec.classList.remove("active"));
      const activeSection = document.getElementById(`section-${target}`);
      if (activeSection) activeSection.classList.add("active");

      // Update title text
      if (pageTitle) pageTitle.textContent = pageTitles[target];
      if (pageSubtitle) pageSubtitle.textContent = pageSubtitles[target];

      // Custom view refreshes
      if (target === "journal") {
        renderJournalHistory();
      } else if (target === "dashboard" || target === "journey") {
        window.journeyManager.updateUI();
      }

      // Close mobile navigation drawer if any
      const sidebar = document.getElementById("sidebar");
      if (sidebar) sidebar.classList.remove("mobile-open");
    });
  });

  // Dashboard shortcuts
  const dashStartBtn = document.getElementById("dash-start-btn");
  if (dashStartBtn) {
    dashStartBtn.addEventListener("click", () => {
      document.getElementById("nav-chat").click();
    });
  }

  const dashJourneyBtn = document.getElementById("dash-journey-btn");
  if (dashJourneyBtn) {
    dashJourneyBtn.addEventListener("click", () => {
      document.getElementById("nav-journey").click();
    });
  }

  const dashMapLink = document.getElementById("dash-map-link");
  if (dashMapLink) {
    dashMapLink.addEventListener("click", () => {
      document.getElementById("nav-journey").click();
    });
  }

  // 2. Ambient Sounds Mixer Triggers
  const rainBtn = document.getElementById("sound-rain");
  const wavesBtn = document.getElementById("sound-waves");
  const humBtn = document.getElementById("sound-hum");

  const handleSoundBtnClick = (btn, type) => {
    btn.addEventListener("click", () => {
      const active = !btn.classList.contains("active");
      if (active) {
        btn.classList.add("active");
        if (type === "rain") soundEngine.toggleRain(true);
        if (type === "waves") soundEngine.toggleWaves(true);
        if (type === "hum") soundEngine.toggleHum(true);
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} sound activated.`, "success");
      } else {
        btn.classList.remove("active");
        if (type === "rain") soundEngine.toggleRain(false);
        if (type === "waves") soundEngine.toggleWaves(false);
        if (type === "hum") soundEngine.toggleHum(false);
      }
    });
  };

  if (rainBtn) handleSoundBtnClick(rainBtn, "rain");
  if (wavesBtn) handleSoundBtnClick(wavesBtn, "waves");
  if (humBtn) handleSoundBtnClick(humBtn, "hum");

  // 3. API Key indicator color adjustment
  const updateApiIndicator = () => {
    const btn = document.getElementById("api-indicator");
    if (!btn) return;
    if (window.agentBrain && window.agentBrain.geminiApiKey) {
      btn.style.color = "var(--accent-teal)";
      btn.style.borderColor = "var(--accent-teal)";
      btn.title = "Gemini AI Connected";
    } else {
      btn.style.color = "var(--text-secondary)";
      btn.style.borderColor = "var(--border-glass)";
      btn.title = "API Key not loaded (Local fallback active)";
    }
  };
  updateApiIndicator();

  const apiIndicatorBtn = document.getElementById("api-indicator");
  if (apiIndicatorBtn) {
    apiIndicatorBtn.addEventListener("click", () => {
      document.getElementById("nav-settings").click();
    });
  }

  // 4. Chat Interface Implementation
  const chatSendBtn = document.getElementById("chat-send-btn");
  const chatInput = document.getElementById("chat-input-field");
  const chatHistory = document.getElementById("chat-history-container");
  const voiceSpeechBtn = document.getElementById("synthesis-voice-btn");
  const micBtn = document.getElementById("mic-toggle-btn");

  const appendChatMessage = (sender, text) => {
    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${sender}`;
    
    // Format timestamp
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubble.innerHTML = `${text.replace(/\n/g, "<br>")} <span class="message-time">${timeStr}</span>`;
    chatHistory.appendChild(bubble);

    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
  };

  const handleUserMessageSend = async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    // Append user bubble
    appendChatMessage("user", text);
    chatInput.value = "";

    // Append loading placeholder for Agent
    const loadingBubble = document.createElement("div");
    loadingBubble.className = "message-bubble agent";
    loadingBubble.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${window.agentBrain.name} is listening...`;
    chatHistory.appendChild(loadingBubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Call brain
    // Gather simple history from chat window
    const messageHistory = [];
    const bubbles = chatHistory.querySelectorAll(".message-bubble:not(:last-child)");
    bubbles.forEach(b => {
      const isUser = b.classList.contains("user");
      const cleanText = b.innerText.split("\n")[0];
      messageHistory.push({ sender: isUser ? "user" : "agent", text: cleanText });
    });

    const reply = await window.agentBrain.getResponse(text, messageHistory);

    // Remove loading placeholder
    loadingBubble.remove();

    // Append Agent bubble
    appendChatMessage("agent", reply);

    // Voice speak out
    window.agentBrain.speak(reply);
  };

  if (chatSendBtn && chatInput) {
    chatSendBtn.addEventListener("click", handleUserMessageSend);
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleUserMessageSend();
    });
  }

  // Voice output toggle in chat box
  if (voiceSpeechBtn) {
    const updateVoiceBtnUI = () => {
      if (window.agentBrain.speechEnabled) {
        voiceSpeechBtn.classList.add("active");
        voiceSpeechBtn.title = "Voice Speech: Active";
      } else {
        voiceSpeechBtn.classList.remove("active");
        voiceSpeechBtn.title = "Voice Speech: Muted";
      }
    };
    updateVoiceBtnUI();
    
    voiceSpeechBtn.addEventListener("click", () => {
      window.agentBrain.speechEnabled = !window.agentBrain.speechEnabled;
      updateVoiceBtnUI();
      // update setting box
      const check = document.getElementById("settings-speech-output-active");
      if (check) check.checked = window.agentBrain.speechEnabled;
      showToast(window.agentBrain.speechEnabled ? "ZenBuddy speech feedback turned ON." : "ZenBuddy speech feedback turned OFF.");
    });
  }

  // Speech-to-Text mic trigger
  if (micBtn) {
    micBtn.addEventListener("click", () => {
      window.agentBrain.toggleListening();
    });
  }


  // 5. Journey Exercises Events
  const closeInteractionBtn = document.getElementById("close-interaction-btn");
  if (closeInteractionBtn) {
    closeInteractionBtn.addEventListener("click", () => {
      document.getElementById("journey-interaction-panel").classList.remove("active");
    });
  }

  // Day 2 Cognitive Reframer
  const reframeSubmit = document.getElementById("reframe-submit-btn");
  const reframeWorryInput = document.getElementById("reframe-input-worry");
  const reframeOutputDiv = document.getElementById("reframe-output-text");
  const reframeCompleteBtn = document.getElementById("reframe-complete-btn");

  if (reframeSubmit && reframeWorryInput && reframeOutputDiv) {
    reframeSubmit.addEventListener("click", () => {
      const worry = reframeWorryInput.value.trim();
      if (!worry) {
        showToast("Please enter a self-critical thought first.", "error");
        return;
      }

      reframeOutputDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Formulating a compassionate reframe...`;
      
      setTimeout(() => {
        const result = window.agentBrain.reframeWorry(worry);
        reframeOutputDiv.textContent = result;
        if (reframeCompleteBtn) reframeCompleteBtn.disabled = false;
        
        // speak reframe
        window.agentBrain.speak(result);
      }, 900);
    });
  }

  if (reframeCompleteBtn) {
    reframeCompleteBtn.addEventListener("click", () => {
      const worry = reframeWorryInput.value.trim();
      const output = reframeOutputDiv.textContent;
      
      saveToJournal(2, worry, output);
      window.journeyManager.completeTask("d2_reframe");
      showToast("Reframing task completed! Added to your journal.", "success");
      
      document.getElementById("journey-interaction-panel").classList.remove("active");
    });
  }

  // Day 3 exercise redirect
  const day3Redirect = document.getElementById("day3-goto-games");
  if (day3Redirect) {
    day3Redirect.addEventListener("click", () => {
      document.getElementById("nav-games").click();
    });
  }

  // Day 4 Gratitude entries
  const gratitudeSubmit = document.getElementById("gratitude-submit-btn");
  const gratitudeSpeak = document.getElementById("gratitude-speak-btn");
  const gratFeedback = document.getElementById("gratitude-agent-feedback");

  let activeAffirmationsList = "";

  if (gratitudeSubmit) {
    gratitudeSubmit.addEventListener("click", () => {
      const g1 = document.getElementById("gratitude-1").value.trim();
      const g2 = document.getElementById("gratitude-2").value.trim();
      const g3 = document.getElementById("gratitude-3").value.trim();

      if (!g1 || !g2 || !g3) {
        showToast("Please write down all three items to complete the exercise.", "error");
        return;
      }

      const { feedback, affirmations } = window.agentBrain.getGratitudeFeedback(g1, g2, g3);
      activeAffirmationsList = affirmations;

      gratFeedback.innerHTML = feedback.replace(/\n/g, "<br>");
      gratFeedback.style.display = "block";
      
      saveToJournal(4, "Listed 3 Gratitudes:\n1. " + g1 + "\n2. " + g2 + "\n3. " + g3, feedback);
      window.journeyManager.completeTask("d4_gratitude");
      showToast("Gratitude list submitted! Day 4 progress updated.", "success");
    });
  }

  if (gratitudeSpeak) {
    gratitudeSpeak.addEventListener("click", () => {
      if (!activeAffirmationsList) {
        showToast("Please submit your gratitude list first.", "error");
        return;
      }
      window.agentBrain.speak("Repeat these positive statements after me: " + activeAffirmationsList);
      window.journeyManager.completeTask("d4_affirm");
      showToast("Voice affirmations triggered! Day 4 finished. 🎉", "success");
    });
  }

  // Day 5 Letter to Future Self
  const letterSubmit = document.getElementById("future-letter-submit");
  const letterInput = document.getElementById("future-letter-input");
  if (letterSubmit && letterInput) {
    letterSubmit.addEventListener("click", () => {
      const text = letterInput.value.trim();
      if (!text) {
        showToast("Please write a short letter to lock in your intentions.", "error");
        return;
      }

      saveToJournal(5, "Letter to Future Self", text);
      window.journeyManager.completeTask("d5_letter");
      
      // Celebrate completion
      const closingRemark = "Congratulations! You have completed your 5-Day MindBuddy Emotional Journey! You took time to face your worries, focus your attention, and count your blessings. Carry this sense of resilience forward with you. I am always here whenever you need a friend.";
      window.agentBrain.speak(closingRemark);
      window.journeyManager.completeTask("d5_celebrate");

      showToast("Your 5-Day Journey is fully completed! Amazing milestone. 🏆", "success");
      document.getElementById("journey-interaction-panel").classList.remove("active");
    });
  }


  // 6. Game Choices Area switches
  const closeGameBtn = document.getElementById("close-game-btn");
  if (closeGameBtn) {
    closeGameBtn.addEventListener("click", () => {
      document.getElementById("game-play-area").classList.remove("active");
    });
  }


  // 7. Worry Journal history loader
  const clearJournalBtn = document.getElementById("clear-journal-btn");
  if (clearJournalBtn) {
    clearJournalBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to erase your journal logs? This cannot be undone.")) {
        localStorage.removeItem("mindbuddy_worry_history");
        renderJournalHistory();
        showToast("Worry Journal records cleared.");
      }
    });
  }


  // 8. Settings Save & Reset Buttons
  const settingsName = document.getElementById("settings-agent-name");
  const settingsKey = document.getElementById("settings-api-key");
  const settingsSpeechActive = document.getElementById("settings-speech-output-active");
  const settingsVoiceSelect = document.getElementById("settings-voice-select");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const resetProgressBtn = document.getElementById("reset-progress-btn");

  // Load fields
  if (settingsName) settingsName.value = window.agentBrain.name;
  if (settingsKey) settingsKey.value = window.agentBrain.geminiApiKey;
  if (settingsSpeechActive) settingsSpeechActive.checked = window.agentBrain.speechEnabled;

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", () => {
      const name = settingsName.value.trim();
      const key = settingsKey.value.trim();
      const speech = settingsSpeechActive.checked;
      const voice = settingsVoiceSelect.value;

      window.agentBrain.saveSettings(name, key, speech, voice);
      
      // Update header/status elements
      document.getElementById("agent-display-name").textContent = window.agentBrain.name;
      updateApiIndicator();

      showToast("Settings successfully saved!", "success");
    });
  }

  if (resetProgressBtn) {
    resetProgressBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to reset your 5-day journey progress? Your unlocked days will go back to Day 1.")) {
        window.journeyManager.resetProgress();
        localStorage.removeItem("mindbuddy_worry_history");
        
        // Reset interactive elements values
        document.getElementById("reframe-input-worry").value = "";
        document.getElementById("gratitude-1").value = "";
        document.getElementById("gratitude-2").value = "";
        document.getElementById("gratitude-3").value = "";
        document.getElementById("future-letter-input").value = "";
        document.getElementById("future-letter-input").disabled = false;
        
        showToast("Journey progress & history successfully reset.", "success");
        document.getElementById("nav-dashboard").click();
      }
    });
  }

  // --- Local Storage Journal Log Helpers ---
  function saveToJournal(dayNum, worryText, adviceText) {
    let history = [];
    const saved = localStorage.getItem("mindbuddy_worry_history");
    if (saved) {
      try {
        history = JSON.parse(saved);
      } catch (e) {
        history = [];
      }
    }

    const item = {
      date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      day: dayNum,
      worry: worryText,
      advice: adviceText
    };

    history.unshift(item); // newest first
    localStorage.setItem("mindbuddy_worry_history", JSON.stringify(history));
  }

  function renderJournalHistory() {
    const list = document.getElementById("journal-list-container");
    if (!list) return;

    let history = [];
    const saved = localStorage.getItem("mindbuddy_worry_history");
    if (saved) {
      try {
        history = JSON.parse(saved);
      } catch (e) {
        history = [];
      }
    }

    if (history.length === 0) {
      list.innerHTML = `
        <div class="glass-card" style="text-align:center; padding: 3rem; color:var(--text-secondary);">
          <i class="fa-solid fa-scroll" style="font-size:3rem; margin-bottom:1rem; opacity:0.3;"></i>
          <p>Your journal is currently empty. Start sharing your worries in Chat or complete the 5-Day Exercises to build your recovery timeline.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = history.map(item => {
      return `
        <div class="journal-card">
          <div class="journal-meta">
            <span class="journal-day-tag">Day ${item.day} Reflection</span>
            <span>${item.date}</span>
          </div>
          <div class="journal-worry">
            <strong>Topic:</strong> ${item.worry.replace(/\n/g, "<br>")}
          </div>
          <div class="journal-response">
            ${item.advice.replace(/\n/g, "<br>")}
          </div>
        </div>
      `;
    }).join("");
  }

  // Listen to Journey events for Toast popups
  window.addEventListener("taskCompleted", (e) => {
    showToast(`Task Completed: "${e.detail.taskId}" Checked off!`);
  });

  window.addEventListener("dayUnlocked", (e) => {
    showToast(`Day ${e.detail.day} is now Unlocked! Excellent growth. 🌱`, "success");
  });

  // Initial startup load
  window.journeyManager.updateUI();
  document.getElementById("agent-display-name").textContent = window.agentBrain.name;
});
