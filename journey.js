/* journey.js - 5-Day Journey Manager */

const JOURNEY_DAYS = [
  {
    day: 1,
    name: "Grounding & Venting",
    subtitle: "Re-center yourself in the present moment.",
    desc: "Share your initial worries with ZenBuddy to clear your head, and practice Box Breathing to soothe your nervous system.",
    tasks: [
      { id: "d1_vent", text: "Vent a worry to ZenBuddy in Chat" },
      { id: "d1_breath", text: "Complete 1 breathing cycle" }
    ],
    exerciseId: "exercise-day-1"
  },
  {
    day: 2,
    name: "Reframing Perspectives",
    subtitle: "Challenge and soften negative self-talk.",
    desc: "Use the Cognitive Reframer tool to transform a harsh self-criticism into a kind, logic-based, supportive statement with ZenBuddy's help.",
    tasks: [
      { id: "d2_reframe", text: "Reframe a worry with ZenBuddy" },
      { id: "d2_words", text: "Play a game of Word Association" }
    ],
    exerciseId: "exercise-day-2"
  },
  {
    day: 3,
    name: "Mindful Play",
    subtitle: "Release mental blocks through games.",
    desc: "Divert your attention from stress. Challenge ZenBuddy to a playful match of Tic-Tac-Toe or complete the Memory Matching challenge.",
    tasks: [
      { id: "d3_ttt", text: "Play Tic-Tac-Toe vs ZenBuddy" },
      { id: "d3_memory", text: "Solve the Memory Cards game" }
    ],
    exerciseId: "exercise-day-3"
  },
  {
    day: 4,
    name: "Gratitude & Affirmations",
    subtitle: "Refocus on the positive things in your life.",
    desc: "Write down three things you are thankful for today, and let ZenBuddy voice them as customized, positive affirmations back to you.",
    tasks: [
      { id: "d4_gratitude", text: "Submit 3 items of gratitude" },
      { id: "d4_affirm", text: "Listen to voice affirmations" }
    ],
    exerciseId: "exercise-day-4"
  },
  {
    day: 5,
    name: "Looking Forward",
    subtitle: "Set intentions and honor your progress.",
    desc: "Write a short letter to your future self containing your takeaways. ZenBuddy will lock it in your journal and celebrate your accomplishments.",
    tasks: [
      { id: "d5_letter", text: "Write your letter to the Future Self" },
      { id: "d5_celebrate", text: "Read ZenBuddy's final message" }
    ],
    exerciseId: "exercise-day-5"
  }
];

class JourneyManager {
  constructor() {
    this.currentDay = 1; // Highest day unlocked
    this.activeDayView = 1; // Currently selected day in interface
    this.completedTasks = {}; // Format: { task_id: true }
    this.loadState();
  }

  loadState() {
    const savedDay = localStorage.getItem("mindbuddy_current_day");
    if (savedDay) this.currentDay = parseInt(savedDay, 10);
    
    const savedTasks = localStorage.getItem("mindbuddy_completed_tasks");
    if (savedTasks) {
      try {
        this.completedTasks = JSON.parse(savedTasks);
      } catch (e) {
        this.completedTasks = {};
      }
    }
  }

  saveState() {
    localStorage.setItem("mindbuddy_current_day", this.currentDay);
    localStorage.setItem("mindbuddy_completed_tasks", JSON.stringify(this.completedTasks));
  }

  resetProgress() {
    this.currentDay = 1;
    this.activeDayView = 1;
    this.completedTasks = {};
    this.saveState();
    this.updateUI();
  }

  completeTask(taskId) {
    if (this.completedTasks[taskId]) return; // Already completed
    
    this.completedTasks[taskId] = true;
    this.saveState();
    this.checkDayCompletions();
    this.updateUI();
    
    // Fire event for UI notifications
    window.dispatchEvent(new CustomEvent("taskCompleted", { detail: { taskId } }));
  }

  checkDayCompletions() {
    const activeDayData = JOURNEY_DAYS[this.currentDay - 1];
    if (!activeDayData) return;

    const allDone = activeDayData.tasks.every(task => this.completedTasks[task.id]);
    if (allDone && this.currentDay < 5) {
      this.currentDay += 1;
      this.activeDayView = this.currentDay;
      this.saveState();
      
      // Fire event for UI notifications
      window.dispatchEvent(new CustomEvent("dayUnlocked", { detail: { day: this.currentDay } }));
    }
  }

  isDayCompleted(dayNum) {
    const dayData = JOURNEY_DAYS[dayNum - 1];
    if (!dayData) return false;
    return dayData.tasks.every(task => this.completedTasks[task.id]);
  }

  getOverallProgressPercentage() {
    let totalTasks = 0;
    let completedCount = 0;
    JOURNEY_DAYS.forEach(dayData => {
      totalTasks += dayData.tasks.length;
      dayData.tasks.forEach(task => {
        if (this.completedTasks[task.id]) completedCount++;
      });
    });
    return Math.round((completedCount / totalTasks) * 100);
  }

  updateUI() {
    // 1. Update Sidebar Day Badge & Progress bar
    const sidebarDayText = document.getElementById("sidebar-day-text");
    const sidebarProgressFill = document.getElementById("sidebar-progress-fill");
    
    if (sidebarDayText) {
      if (this.currentDay > 5 || (this.currentDay === 5 && this.isDayCompleted(5))) {
        sidebarDayText.textContent = "Journey Completed! 🎉";
      } else {
        const activeName = JOURNEY_DAYS[this.currentDay - 1].name.split(" & ")[0];
        sidebarDayText.textContent = `Day ${this.currentDay}: ${activeName}`;
      }
    }
    
    if (sidebarProgressFill) {
      sidebarProgressFill.style.width = `${this.getOverallProgressPercentage()}%`;
    }

    // 2. Render Dashboard Map Card
    const dashDaysStack = document.getElementById("dash-days-stack");
    if (dashDaysStack) {
      dashDaysStack.innerHTML = JOURNEY_DAYS.map(d => {
        const isCompleted = this.isDayCompleted(d.day);
        const isActive = d.day === this.currentDay;
        const isLocked = d.day > this.currentDay;
        
        let statusText = "Locked";
        if (isCompleted) statusText = "Completed";
        else if (isActive) statusText = "Active Day";
        else if (!isLocked) statusText = "Unlocked";

        let classList = "journey-day-item";
        if (isLocked) classList += " locked";
        else {
          classList += " unlocked";
          if (isActive) classList += " active";
        }

        const icon = isCompleted 
          ? '<i class="fa-solid fa-circle-check day-check-icon"></i>' 
          : (isLocked ? '<i class="fa-solid fa-lock day-lock-icon"></i>' : '<i class="fa-solid fa-circle day-lock-icon" style="color:var(--accent-purple); font-size:0.6rem;"></i>');

        return `
          <div class="${classList}" data-day="${d.day}">
            <div class="day-num-box">${d.day}</div>
            <div class="day-info">
              <span class="day-name">${d.name}</span>
              <span class="day-status-text">${statusText}</span>
            </div>
            ${icon}
          </div>
        `;
      }).join("");

      // Add click handlers on dashboard items
      dashDaysStack.querySelectorAll(".journey-day-item.unlocked").forEach(item => {
        item.addEventListener("click", () => {
          const dayNum = parseInt(item.dataset.day, 10);
          this.openExercisePanel(dayNum);
          // Navigate to journey view
          document.getElementById("nav-journey").click();
        });
      });
    }

    // 3. Render 5-Day Journey Board View Grid
    const journeyCardsGrid = document.getElementById("journey-cards-grid");
    if (journeyCardsGrid) {
      journeyCardsGrid.innerHTML = JOURNEY_DAYS.map(d => {
        const isCompleted = this.isDayCompleted(d.day);
        const isActive = d.day === this.currentDay;
        const isLocked = d.day > this.currentDay;

        let stateClass = "locked";
        let badgeText = "Locked";
        
        if (isCompleted) {
          stateClass = "completed";
          badgeText = "Done";
        } else if (isActive) {
          stateClass = "active";
          badgeText = "Start Daily Exercise";
        } else if (!isLocked) {
          stateClass = "unlocked";
          badgeText = "Open Review";
        }

        // Render checklist items
        const checklistHtml = d.tasks.map(task => {
          const done = this.completedTasks[task.id];
          const icon = done 
            ? '<i class="fa-solid fa-circle-check done"></i>' 
            : '<i class="fa-regular fa-circle todo"></i>';
          return `<li class="journey-task-item">${icon} <span>${task.text}</span></li>`;
        }).join("");

        const buttonText = isCompleted ? "Practice Again" : (isActive ? "Start Exercise" : "Review Day");
        const buttonDisabled = isLocked ? "disabled" : "";
        const buttonClass = isActive ? "btn-primary" : "btn-secondary";

        return `
          <div class="journey-card ${stateClass}">
            <div class="journey-card-day">
              <span>Day ${d.day}</span>
              <span class="journey-card-status-badge">${badgeText}</span>
            </div>
            <h3 class="journey-card-title">${d.name}</h3>
            <p class="journey-card-desc">${d.desc}</p>
            <ul class="journey-card-tasks">
              ${checklistHtml}
            </ul>
            <button class="btn ${buttonClass} journey-card-btn" data-day="${d.day}" ${buttonDisabled}>
              ${buttonText}
            </button>
          </div>
        `;
      }).join("");

      // Add click handlers on journey cards
      journeyCardsGrid.querySelectorAll(".journey-card-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const dayNum = parseInt(btn.dataset.day, 10);
          this.openExercisePanel(dayNum);
        });
      });
    }
  }

  openExercisePanel(dayNum) {
    this.activeDayView = dayNum;
    const panel = document.getElementById("journey-interaction-panel");
    if (!panel) return;

    panel.classList.add("active");
    
    // Scroll smoothly to panel
    setTimeout(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    const dayData = JOURNEY_DAYS[dayNum - 1];
    document.getElementById("panel-exercise-title").innerHTML = `<i class="fa-solid fa-feather"></i> Day ${dayNum} Exercise: ${dayData.name}`;

    // Hide all exercise containers
    JOURNEY_DAYS.forEach(d => {
      const container = document.getElementById(d.exerciseId);
      if (container) container.style.display = "none";
    });

    // Show selected container
    const activeContainer = document.getElementById(dayData.exerciseId);
    if (activeContainer) {
      activeContainer.style.display = "block";
      this.initSpecificExercise(dayNum);
    }
  }

  initSpecificExercise(dayNum) {
    // Custom exercise setups
    if (dayNum === 1) {
      // Day 1: Reset breathing bubble to original state
      const bubble = document.getElementById("breathing-bubble");
      const bubbleText = document.getElementById("breathing-bubble-text");
      const guideText = document.getElementById("breathing-guide-text");
      const completeBtn = document.getElementById("breath-complete-btn");
      
      if (bubble) {
        bubble.className = "breathing-bubble-outer";
      }
      if (bubbleText) bubbleText.textContent = "Ready";
      if (guideText) guideText.textContent = "Click Start below to begin";
      
      // If task already done, enable complete button
      if (completeBtn) {
        completeBtn.disabled = !this.completedTasks["d1_breath"];
      }
    }
    else if (dayNum === 2) {
      // Day 2: Clear input and outputs
      const worryInput = document.getElementById("reframe-input-worry");
      const outputDiv = document.getElementById("reframe-output-text");
      const completeBtn = document.getElementById("reframe-complete-btn");
      
      if (worryInput && !this.completedTasks["d2_reframe"]) {
        worryInput.value = "";
      }
      if (outputDiv && !this.completedTasks["d2_reframe"]) {
        outputDiv.innerHTML = `Your reframed thoughts will appear here. ZenBuddy will help you see the situation with more grace and clarity.`;
      }
      if (completeBtn) {
        completeBtn.disabled = !this.completedTasks["d2_reframe"];
      }
    }
    else if (dayNum === 4) {
      // Day 4: Clear inputs
      const compBtn = document.getElementById("gratitude-submit-btn");
      const feedbackDiv = document.getElementById("gratitude-agent-feedback");
      if (feedbackDiv && !this.completedTasks["d4_gratitude"]) {
        feedbackDiv.style.display = "none";
      }
    }
    else if (dayNum === 5) {
      const letterInput = document.getElementById("future-letter-input");
      if (letterInput && this.completedTasks["d5_letter"]) {
        // letter already written, read only
        letterInput.disabled = true;
      }
    }
  }
}

// Global instance
window.journeyManager = new JourneyManager();
