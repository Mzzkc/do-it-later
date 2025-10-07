// Do It (Later) - Pomodoro Timer Module
// Handles pomodoro timer functionality for task focus sessions

class PomodoroTimer {
  constructor(app) {
    this.app = app;

    // Timer state
    this.state = {
      isActive: false,
      taskId: null,
      timeRemaining: 0,
      intervalId: null,
      roundCount: 0
    };
  }

  /**
   * Start pomodoro timer for a task
   * @param {string} taskId - Task ID to start timer for
   */
  start(taskId) {
    console.log('🐛 [POMODORO] startPomodoro called', { taskId });

    const taskInfo = this.app.findTask(taskId);
    console.log('🐛 [POMODORO] Task info:', taskInfo);

    if (!taskInfo) {
      console.error('🐛 [POMODORO] Task not found!');
      return;
    }

    // Stop existing timer if any
    console.log('🐛 [POMODORO] Stopping any existing timer...');
    this.stop();

    // Initialize timer
    this.state = {
      isActive: true,
      taskId: taskId,
      timeRemaining: Config.POMODORO_WORK_MINUTES * 60,
      intervalId: null,
      roundCount: 1
    };

    console.log('🐛 [POMODORO] Initialized state:', {
      isActive: this.state.isActive,
      taskId: this.state.taskId,
      timeRemaining: this.state.timeRemaining,
      workMinutes: Config.POMODORO_WORK_MINUTES,
      roundCount: this.state.roundCount
    });

    // Start countdown
    console.log('🐛 [POMODORO] Setting up interval...');
    this.state.intervalId = setInterval(() => this.tick(), 1000);
    console.log('🐛 [POMODORO] Interval ID:', this.state.intervalId);

    // Show timer UI
    console.log('🐛 [POMODORO] Showing timer UI...');
    this.showTimer();

    this.app.showNotification(`Pomodoro started for "${taskInfo.text}"`, Config.NOTIFICATION_TYPES.SUCCESS);
    console.log('🐛 [POMODORO] Pomodoro started successfully!');
  }

  /**
   * Timer tick - called every second
   */
  tick() {
    console.log('🐛 [POMODORO] tickPomodoro called', {
      isActive: this.state.isActive,
      timeRemaining: this.state.timeRemaining,
      intervalId: this.state.intervalId
    });

    if (!this.state.isActive) {
      console.log('🐛 [POMODORO] Timer not active, skipping tick');
      return;
    }

    this.state.timeRemaining--;
    console.log('🐛 [POMODORO] Time remaining after decrement:', this.state.timeRemaining);

    if (this.state.timeRemaining <= 0) {
      // Round complete
      console.log('🐛 [POMODORO] Round complete!');
      this.handleComplete();
    } else {
      // Update display
      console.log('🐛 [POMODORO] Updating display...');
      this.updateDisplay();
    }
  }

  /**
   * Handle round completion
   */
  handleComplete() {
    // Stop interval
    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
      this.state.intervalId = null;
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Show completion prompt
    this.showCompletionPrompt();
  }

  /**
   * Show completion prompt modal
   */
  showCompletionPrompt() {
    const taskInfo = this.app.findTask(this.state.taskId);
    if (!taskInfo) {
      this.stop();
      return;
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'pomodoro-prompt-modal';
    modal.innerHTML = `
      <div class="pomodoro-prompt-content">
        <h3>Pomodoro Complete!</h3>
        <p>Round ${this.state.roundCount} finished for:</p>
        <p class="task-name">"${Utils.escapeHtml(taskInfo.text)}"</p>
        <div class="pomodoro-prompt-actions">
          <button id="pomodoro-complete-btn" class="pomodoro-btn pomodoro-btn-success">Task Done</button>
          <button id="pomodoro-stop-btn" class="pomodoro-btn pomodoro-btn-secondary">Stop Timer</button>
          <button id="pomodoro-continue-btn" class="pomodoro-btn pomodoro-btn-primary">Continue</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle actions
    document.getElementById('pomodoro-complete-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
      this.completeTask();
    });

    document.getElementById('pomodoro-stop-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
      this.stop();
    });

    document.getElementById('pomodoro-continue-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
      this.continue();
    });
  }

  /**
   * Complete task and stop timer
   */
  completeTask() {
    const taskId = this.state.taskId;
    this.stop();
    this.app.toggleTask(taskId);
  }

  /**
   * Stop timer
   */
  stop() {
    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
    }

    this.state = {
      isActive: false,
      taskId: null,
      timeRemaining: 0,
      intervalId: null,
      roundCount: 0
    };

    this.hideTimer();
  }

  /**
   * Continue with next round
   */
  continue() {
    this.state.roundCount++;
    this.state.timeRemaining = Config.POMODORO_WORK_MINUTES * 60;
    this.state.intervalId = setInterval(() => this.tick(), 1000);
    this.showTimer();
  }

  /**
   * Show timer UI
   */
  showTimer() {
    console.log('🐛 [POMODORO] showPomodoroTimer called');

    let timerEl = document.getElementById('pomodoro-timer');
    console.log('🐛 [POMODORO] Existing timer element:', timerEl);

    if (!timerEl) {
      console.log('🐛 [POMODORO] Creating new timer element');
      timerEl = document.createElement('div');
      timerEl.id = 'pomodoro-timer';
      timerEl.className = 'pomodoro-timer';
      document.body.appendChild(timerEl);
      console.log('🐛 [POMODORO] Timer element created and appended to body');
    }

    // Set display to flex BEFORE updating content to ensure visibility
    console.log('🐛 [POMODORO] Setting display to flex');
    timerEl.style.display = 'flex';

    console.log('🐛 [POMODORO] Updating display...');
    this.updateDisplay();

    console.log('🐛 [POMODORO] Timer element style:', {
      display: timerEl.style.display,
      position: window.getComputedStyle(timerEl).position,
      visibility: window.getComputedStyle(timerEl).visibility
    });
  }

  /**
   * Hide timer UI
   */
  hideTimer() {
    const timerEl = document.getElementById('pomodoro-timer');
    if (timerEl) {
      timerEl.style.display = 'none';
    }
  }

  /**
   * Update timer display
   */
  updateDisplay() {
    console.log('🐛 [POMODORO] updatePomodoroDisplay called');

    const timerEl = document.getElementById('pomodoro-timer');
    if (!timerEl) {
      console.error('🐛 [POMODORO] Timer element not found!');
      return;
    }

    const minutes = Math.floor(this.state.timeRemaining / 60);
    const seconds = this.state.timeRemaining % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    console.log('🐛 [POMODORO] Time display:', {
      timeRemaining: this.state.timeRemaining,
      minutes,
      seconds,
      timeStr
    });

    const taskInfo = this.app.findTask(this.state.taskId);
    const taskText = taskInfo ? taskInfo.text : 'Unknown task';

    console.log('🐛 [POMODORO] Task:', { taskId: this.state.taskId, taskText });

    timerEl.innerHTML = `
      <div class="pomodoro-timer-content">
        <div class="pomodoro-timer-round">Round ${this.state.roundCount}</div>
        <div class="pomodoro-timer-time">${timeStr}</div>
        <div class="pomodoro-timer-task">${Utils.escapeHtml(taskText)}</div>
        <button class="pomodoro-timer-stop" onclick="app.pomodoro.stop()">×</button>
      </div>
    `;

    console.log('🐛 [POMODORO] Display updated successfully');
  }
}

// Freeze to prevent modifications
Object.freeze(PomodoroTimer.prototype);
