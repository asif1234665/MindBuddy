/* games.js - Calming Games & Exercises Logic */

class GamesManager {
  constructor() {
    this.activeGame = null; // 'ttt', 'words', 'memory'
    
    // Tic-Tac-Toe State
    this.tttBoard = Array(9).fill(null);
    this.tttGameActive = true;
    this.userSign = "X";
    this.agentSign = "O";
    
    // Word Association State
    this.wordChain = [];
    this.wordVocabulary = [
      "peace", "serenity", "growth", "sunshine", "breath", "harmony", "meadow", 
      "calm", "dream", "hope", "support", "strength", "forest", "ocean", "warmth", 
      "smile", "comfort", "laughter", "heal", "nurture", "zen", "energy", "tranquil",
      "mindful", "relax", "bright", "cozy", "kindness", "gentle", "balance", "bloom"
    ];

    // Memory Game State
    this.memoryCards = [];
    this.memoryFlipped = [];
    this.memoryMatches = 0;
    this.memoryIcons = ["🌸", "🕯️", "☁️", "☀️", "🌙", "🌊", "🌲", "🍵"];
    
    // Breathing Exercise State
    this.breathingActive = false;
    this.breathingCycleCount = 0;
    this.breathingTimer = null;
    
    this.initEventListeners();
  }

  initEventListeners() {
    // Game selection cards
    document.querySelectorAll(".game-select-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const gameName = btn.dataset.game;
        this.openGame(gameName);
      });
    });

    // Close Game Button
    const closeBtn = document.getElementById("close-game-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeGameArea());
    }

    // TTT cell clicks
    const cells = document.querySelectorAll(".ttt-cell");
    cells.forEach(cell => {
      cell.addEventListener("click", (e) => this.handleTTTCellClick(e));
    });
    
    // TTT reset
    const tttReset = document.getElementById("ttt-reset-btn");
    if (tttReset) {
      tttReset.addEventListener("click", () => this.resetTTT());
    }

    // Word Chain input sends
    const wordSendBtn = document.getElementById("word-game-send-btn");
    const wordInput = document.getElementById("word-game-input");
    if (wordSendBtn && wordInput) {
      wordSendBtn.addEventListener("click", () => this.submitWordChain());
      wordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.submitWordChain();
      });
    }

    const wordReset = document.getElementById("word-game-reset-btn");
    if (wordReset) {
      wordReset.addEventListener("click", () => this.resetWordChain());
    }

    // Memory reset
    const memoryReset = document.getElementById("memory-reset-btn");
    if (memoryReset) {
      memoryReset.addEventListener("click", () => this.resetMemory());
    }

    // Day 1 Breathing Control Buttons
    const breathControl = document.getElementById("breath-control-btn");
    if (breathControl) {
      breathControl.addEventListener("click", () => this.toggleBreathing());
    }

    const breathComplete = document.getElementById("breath-complete-btn");
    if (breathComplete) {
      breathComplete.addEventListener("click", () => {
        window.journeyManager.completeTask("d1_breath");
        showToast("Breathing exercise completed! Day 1 task checked off.", "success");
        // Hide panel or update
        document.getElementById("journey-interaction-panel").classList.remove("active");
      });
    }
  }

  // --- Main Play Area Control ---
  openGame(gameName) {
    this.activeGame = gameName;
    const playArea = document.getElementById("game-play-area");
    const tttArena = document.getElementById("game-arena-ttt");
    const wordsArena = document.getElementById("game-arena-words");
    const memoryArena = document.getElementById("game-arena-memory");
    const gameTitle = document.getElementById("game-play-title");

    playArea.classList.add("active");
    
    // Smooth scroll to game arena
    setTimeout(() => {
      playArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    // Hide all
    tttArena.style.display = "none";
    wordsArena.style.display = "none";
    memoryArena.style.display = "none";

    if (gameName === "ttt") {
      gameTitle.textContent = "Tic-Tac-Toe vs ZenBuddy";
      tttArena.style.display = "block";
      this.resetTTT();
    } else if (gameName === "words") {
      gameTitle.textContent = "Word Association Chain";
      wordsArena.style.display = "block";
      this.resetWordChain();
    } else if (gameName === "memory") {
      gameTitle.textContent = "Memory Cards of Calm";
      memoryArena.style.display = "block";
      this.resetMemory();
    }
  }

  closeGameArea() {
    document.getElementById("game-play-area").classList.remove("active");
    this.activeGame = null;
  }

  setCommentary(text) {
    const commDiv = document.getElementById("game-agent-commentary");
    if (commDiv) {
      commDiv.style.opacity = 0;
      setTimeout(() => {
        commDiv.innerHTML = `<i class="fa-solid fa-robot" style="color:var(--accent-teal)"></i> ZenBuddy says: "${text}"`;
        commDiv.style.opacity = 1;
        commDiv.style.transition = "opacity 0.3s ease";
        
        // Voice response if enabled
        if (window.agentBrain && window.agentBrain.speechEnabled) {
          window.agentBrain.speak(text);
        }
      }, 200);
    }
  }

  // --- Tic-Tac-Toe (TTT) Implementation ---
  resetTTT() {
    this.tttBoard = Array(9).fill(null);
    this.tttGameActive = true;
    
    const cells = document.querySelectorAll(".ttt-cell");
    cells.forEach(cell => {
      cell.textContent = "";
      cell.className = "ttt-cell";
    });

    const status = document.getElementById("ttt-status");
    if (status) {
      status.textContent = "Your Turn (X)";
      status.style.color = "var(--accent-purple)";
    }
    
    this.setCommentary("Let's play a friendly game! Make your first move.");
  }

  handleTTTCellClick(e) {
    const idx = parseInt(e.target.dataset.idx, 10);
    
    if (this.tttBoard[idx] || !this.tttGameActive || this.activeGame !== 'ttt') return;

    // User Move
    this.tttBoard[idx] = this.userSign;
    e.target.textContent = this.userSign;
    e.target.classList.add(this.userSign);
    
    // Check if won
    if (this.checkTTTWin(this.userSign)) {
      this.endTTTGame("user");
      return;
    }
    
    if (this.checkTTTDraw()) {
      this.endTTTGame("draw");
      return;
    }

    // Agent Turn
    const status = document.getElementById("ttt-status");
    if (status) {
      status.textContent = "ZenBuddy is thinking...";
      status.style.color = "var(--accent-teal)";
    }
    
    this.tttGameActive = false; // block user clicking during agent think
    
    setTimeout(() => {
      this.agentTTTMove();
    }, 700);
  }

  agentTTTMove() {
    if (this.activeGame !== 'ttt') return;
    
    // Simple Minimax or heuristic
    // 1. Try to win
    let move = this.findTTTWinningMove(this.agentSign);
    
    // 2. Try to block user
    if (move === null) {
      move = this.findTTTWinningMove(this.userSign);
    }
    
    // 3. Take Center
    if (move === null && this.tttBoard[4] === null) {
      move = 4;
    }
    
    // 4. Take random open slot
    if (move === null) {
      const openIdxs = this.tttBoard.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
      if (openIdxs.length > 0) {
        move = openIdxs[Math.floor(Math.random() * openIdxs.length)];
      }
    }

    if (move !== null) {
      this.tttBoard[move] = this.agentSign;
      const cell = document.querySelector(`.ttt-cell[data-idx="${move}"]`);
      if (cell) {
        cell.textContent = this.agentSign;
        cell.classList.add(this.agentSign);
      }

      if (this.checkTTTWin(this.agentSign)) {
        this.endTTTGame("agent");
        return;
      }
      
      if (this.checkTTTDraw()) {
        this.endTTTGame("draw");
        return;
      }

      this.tttGameActive = true;
      const status = document.getElementById("ttt-status");
      if (status) {
        status.textContent = "Your Turn (X)";
        status.style.color = "var(--accent-purple)";
      }

      // Context commentary based on moves
      const comments = [
        "Hmm, interesting move! I'll go here.",
        "A standard play. I'll cover this space.",
        "Keeping me on my toes! Let's try this.",
        "Your focus is really good today.",
        "Nice, let's keep playing!"
      ];
      this.setCommentary(comments[Math.floor(Math.random() * comments.length)]);
    }
  }

  findTTTWinningMove(sign) {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (let pattern of winPatterns) {
      const counts = pattern.map(idx => this.tttBoard[idx]);
      const signCount = counts.filter(c => c === sign).length;
      const nullCount = counts.filter(c => c === null).length;
      
      if (signCount === 2 && nullCount === 1) {
        const nullIdxInPattern = counts.indexOf(null);
        return pattern[nullIdxInPattern];
      }
    }
    return null;
  }

  checkTTTWin(sign) {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    return winPatterns.some(pattern => {
      return pattern.every(idx => this.tttBoard[idx] === sign);
    });
  }

  checkTTTDraw() {
    return this.tttBoard.every(cell => cell !== null);
  }

  endTTTGame(winner) {
    this.tttGameActive = false;
    const status = document.getElementById("ttt-status");

    if (winner === "user") {
      if (status) {
        status.textContent = "You Win! 🏆";
        status.style.color = "var(--accent-teal)";
      }
      this.setCommentary("You won! Wow, your concentration is stellar. Excellent job!");
      
      // Satisfy Day 3 task
      window.journeyManager.completeTask("d3_ttt");
    } else if (winner === "agent") {
      if (status) {
        status.textContent = "ZenBuddy Wins! 🤖";
        status.style.color = "var(--accent-pink)";
      }
      this.setCommentary("Aha! Three in a row. It was a wonderful match though! Let's play again.");
      
      // Still count playing as progress
      window.journeyManager.completeTask("d3_ttt");
    } else {
      if (status) {
        status.textContent = "Draw! 🤝";
        status.style.color = "var(--text-secondary)";
      }
      this.setCommentary("It's a draw! We are perfectly balanced. Great match!");
      
      window.journeyManager.completeTask("d3_ttt");
    }
  }


  // --- Word Association Chain Implementation ---
  resetWordChain() {
    this.wordChain = [];
    const chainBox = document.getElementById("word-chain-box");
    if (chainBox) {
      chainBox.innerHTML = "";
    }
    
    // Agent starts
    const startWord = "Peace";
    this.wordChain.push({ sender: "agent", word: startWord });
    this.renderWordChain();
    this.setCommentary(`Let's link warm, positive ideas. I start with: "${startWord}". What positive word does this remind you of?`);
  }

  renderWordChain() {
    const chainBox = document.getElementById("word-chain-box");
    if (!chainBox) return;

    chainBox.innerHTML = this.wordChain.map(item => {
      return `<div class="word-pill ${item.sender}"><span>${item.word}</span></div>`;
    }).join("");

    // Scroll to bottom
    chainBox.scrollTop = chainBox.scrollHeight;
  }

  submitWordChain() {
    const input = document.getElementById("word-game-input");
    if (!input) return;
    
    const word = input.value.trim();
    if (!word) return;

    // Add user word
    this.wordChain.push({ sender: "user", word: word });
    this.renderWordChain();
    input.value = "";

    // Trigger thinking
    setTimeout(() => {
      this.agentWordChainResponse(word);
    }, 650);
  }

  agentWordChainResponse(userWord) {
    if (this.activeGame !== 'words') return;

    // Pick a word from vocabulary that wasn't used yet, or just random
    const usedWords = this.wordChain.map(c => c.word.toLowerCase());
    let nextWordCandidates = this.wordVocabulary.filter(w => !usedWords.includes(w));
    
    if (nextWordCandidates.length === 0) {
      nextWordCandidates = this.wordVocabulary;
    }

    const agentWordRaw = nextWordCandidates[Math.floor(Math.random() * nextWordCandidates.length)];
    // Capitalize
    const agentWord = agentWordRaw.charAt(0).toUpperCase() + agentWordRaw.slice(1);

    this.wordChain.push({ sender: "agent", word: agentWord });
    this.renderWordChain();

    // Check count for task completion
    if (this.wordChain.length >= 6) {
      window.journeyManager.completeTask("d2_words");
      this.setCommentary(`"${agentWord}"! Beautiful chain. We've built a link of 6 positive concepts! This exercise triggers positive cognitive paths.`);
    } else {
      const commentaryOptions = [
        `Connecting "${userWord}" to "${agentWord}" makes perfect sense. What's next?`,
        `Ah, "${userWord}" brings "${agentWord}" to my mind. Keep it going!`,
        `"${userWord}" is a lovely thought. Let's link it to "${agentWord}".`,
        `Interesting association! Flowing from "${userWord}" directly to "${agentWord}".`
      ];
      this.setCommentary(commentaryOptions[Math.floor(Math.random() * commentaryOptions.length)]);
    }
  }


  // --- Memory Card Match Implementation ---
  resetMemory() {
    this.memoryFlipped = [];
    this.memoryMatches = 0;
    
    const status = document.getElementById("memory-status");
    if (status) {
      status.textContent = "Matches: 0 / 8";
    }

    // Create paired icons and shuffle
    const paired = [...this.memoryIcons, ...this.memoryIcons];
    this.shuffleArray(paired);

    const board = document.getElementById("memory-board");
    if (board) {
      board.innerHTML = paired.map((icon, idx) => {
        return `
          <div class="memory-card" data-idx="${idx}" data-icon="${icon}">
            <div class="memory-card-inner">
              <div class="memory-card-front">
                <i class="fa-solid fa-spa" style="font-size:1.25rem;"></i>
              </div>
              <div class="memory-card-back">
                ${icon}
              </div>
            </div>
          </div>
        `;
      }).join("");

      // Bind clicks
      board.querySelectorAll(".memory-card").forEach(card => {
        card.addEventListener("click", () => this.handleMemoryCardClick(card));
      });
    }

    this.setCommentary("Memory Match game initiated. Find the pairs of calming items. Go at your own pace!");
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  handleMemoryCardClick(card) {
    if (this.activeGame !== 'memory') return;
    
    // Ignore if already flipped/matched
    if (card.classList.contains("flipped") || card.classList.contains("matched") || this.memoryFlipped.length >= 2) return;

    // Flip card
    card.classList.add("flipped");
    this.memoryFlipped.push(card);

    if (this.memoryFlipped.length === 2) {
      const card1 = this.memoryFlipped[0];
      const card2 = this.memoryFlipped[1];

      if (card1.dataset.icon === card2.dataset.icon) {
        // Match!
        card1.classList.add("matched");
        card2.classList.add("matched");
        this.memoryFlipped = [];
        this.memoryMatches++;

        const status = document.getElementById("memory-status");
        if (status) {
          status.textContent = `Matches: ${this.memoryMatches} / 8`;
        }

        if (this.memoryMatches === 8) {
          window.journeyManager.completeTask("d3_memory");
          this.setCommentary("Amazing! You matched all pairs! Focusing on patterns is a great way to ground your attention.");
        } else {
          this.setCommentary(`Nice match! You found the ${card1.dataset.icon} pair.`);
        }
      } else {
        // No match, flip back
        setTimeout(() => {
          card1.classList.remove("flipped");
          card2.classList.remove("flipped");
          this.memoryFlipped = [];
        }, 1000);
      }
    }
  }


  // --- Day 1 Breathing Exercise Bubble Sync ---
  toggleBreathing() {
    const breathControlBtn = document.getElementById("breath-control-btn");
    
    if (this.breathingActive) {
      // Stop breathing
      this.breathingActive = false;
      if (breathControlBtn) breathControlBtn.textContent = "Start Breathing";
      this.stopBreathingCycle();
    } else {
      // Start breathing
      this.breathingActive = true;
      if (breathControlBtn) breathControlBtn.textContent = "Stop Session";
      this.breathingCycleCount = 0;
      this.runBreathingCycle();
    }
  }

  runBreathingCycle() {
    const bubble = document.getElementById("breathing-bubble");
    const bubbleText = document.getElementById("breathing-bubble-text");
    const guideText = document.getElementById("breathing-guide-text");
    const completeBtn = document.getElementById("breath-complete-btn");

    if (!this.breathingActive) return;

    let phase = 0; // 0 = Inhale, 1 = Hold, 2 = Exhale, 3 = Hold
    const breatheIteration = () => {
      if (!this.breathingActive) return;

      if (phase === 0) {
        // Inhale
        bubble.className = "breathing-bubble-outer inhale";
        bubbleText.textContent = "Inhale";
        guideText.textContent = "Breathe in deeply through your nose...";
        phase = 1;
        this.breathingTimer = setTimeout(breatheIteration, 4000);
      } else if (phase === 1) {
        // Hold
        bubbleText.textContent = "Hold";
        guideText.textContent = "Feel the air filling your lungs...";
        phase = 2;
        this.breathingTimer = setTimeout(breatheIteration, 4000);
      } else if (phase === 2) {
        // Exhale
        bubble.className = "breathing-bubble-outer exhale";
        bubbleText.textContent = "Exhale";
        guideText.textContent = "Release the air slowly through your mouth...";
        phase = 3;
        this.breathingTimer = setTimeout(breatheIteration, 4000);
      } else if (phase === 3) {
        // Hold
        bubbleText.textContent = "Rest";
        guideText.textContent = "Empty and relaxed...";
        phase = 0;
        this.breathingCycleCount++;
        
        if (this.breathingCycleCount >= 1) {
          // Completed at least one full cycle
          if (completeBtn) completeBtn.disabled = false;
        }

        this.breathingTimer = setTimeout(breatheIteration, 4000);
      }
    };

    breatheIteration();
  }

  stopBreathingCycle() {
    if (this.breathingTimer) {
      clearTimeout(this.breathingTimer);
      this.breathingTimer = null;
    }
    const bubble = document.getElementById("breathing-bubble");
    const bubbleText = document.getElementById("breathing-bubble-text");
    const guideText = document.getElementById("breathing-guide-text");
    
    if (bubble) bubble.className = "breathing-bubble-outer";
    if (bubbleText) bubbleText.textContent = "Ready";
    if (guideText) guideText.textContent = "Session stopped. Click Start to resume.";
  }
}

// Global instance
window.gamesManager = new GamesManager();
