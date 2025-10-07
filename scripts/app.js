// Do It (Later) - Main Application
// Phase 1: Basic app initialization

class DoItTomorrowApp {
  constructor() {
    this.data = Storage.load();
    this.saveTimeout = null;
    this.renderTimeout = null;
    this.currentMobileView = 'today'; // Default to today on mobile
    this.logs = [];

    // Simple scroll detection
    this.isScrolling = false;

    // Initialize modules
    this.taskManager = new TaskManager(this);
    this.pomodoro = new PomodoroTimer(this);
    this.deadlinePicker = new DeadlinePicker(this);
    this.devMode = new DevMode(this);
    this.qrHandler = new QRHandler(this);
    this.renderer = new Renderer(this);

    this.setupLogging();
    this.initializeLongPressSystem();
    this.init();
  }

  // Setup logging system to capture console messages
  setupLogging() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      this.addLog('log', args);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      this.addLog('error', args);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.addLog('warn', args);
      originalWarn.apply(console, args);
    };

    // Also capture unhandled errors
    window.addEventListener('error', (e) => {
      this.addLog('error', [`Unhandled error: ${e.message}`, e.filename, e.lineno]);
    });
  }

  addLog(type, args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    this.logs.push({ timestamp, type, message });

    // Keep only last 500 logs to prevent memory issues
    if (this.logs.length > 500) {
      this.logs.shift();
    }
  }


  init() {
    this.initTheme();
    this.updateCurrentDate();
    this.checkDateRollover();
    this.bindEvents();
    this.setupMobileNavigation();
    this.setupSwipeGestures();
    this.setupSyncControls();
    this.setupThemeToggle();
    this.setupDeleteMode();
    this.setupGlobalHandlers();
    this.render();
    this.updateCompletedCounter();
    this.registerServiceWorker();
  }

  // Setup global event handlers
  setupGlobalHandlers() {
    // Cancel edit mode when clicking outside
    document.addEventListener('click', (e) => {
      if (this.editingTask) {
        const editInput = document.querySelector('.edit-input');
        const clickedOnInput = editInput && editInput.contains(e.target);
        const clickedOnTask = e.target.closest(`[data-task-id="${this.editingTask}"]`);

        if (!clickedOnInput && !clickedOnTask) {
          this.taskManager.cancelEdit();
          this.render();
        }
      }
    });

    // Note: Mobile button focus is now handled purely with CSS :focus-visible

    // Setup scroll detection to prevent accidental taps during scroll
    this.setupScrollDetection();
  }

  setupScrollDetection() {
    // No scroll detection - let browser handle everything naturally
    this.isScrolling = false;

    // Only dev logging for debugging - no interference with interactions
    if (this.devMode.isActive()) {
      document.addEventListener('touchstart', (e) => {
        console.log('🟢 TOUCH START:', {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          target: e.target.className || e.target.tagName,
          time: Date.now()
        });
      }, { passive: true });

      document.addEventListener('touchend', () => {
        console.log('🔴 TOUCH END');
      }, { passive: true });
    }
  }
  
  updateCurrentDate() {
    const dateEl = document.getElementById('current-date');
    const today = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    dateEl.textContent = today.toLocaleDateString('en-US', options);
  }

  updateCompletedCounter() {
    const counterEl = document.getElementById('completed-counter');
    const count = this.data.totalCompleted || 0;
    counterEl.textContent = `${count} tasks completed`;

    // Add pulse animation for counter updates
    counterEl.classList.add('counter-update');
    setTimeout(() => {
      counterEl.classList.remove('counter-update');
    }, 300);
  }
  
  checkDateRollover() {
    const today = new Date().toISOString().split('T')[0];
    if (this.data.currentDate !== today) {
      // New day detected - perform daily cleanup
      const completedToday = this.data.tasks.filter(task => task.list === 'today' && task.completed).length;
      const completedLater = this.data.tasks.filter(task => task.list === 'tomorrow' && task.completed).length;

      // Remove completed tasks from Today
      this.data.tasks = this.data.tasks.filter(task => !(task.list === 'today' && task.completed));

      // Remove completed tasks from Later, but keep incomplete ones there
      const incompleteLaterTasks = this.data.tasks.filter(task => task.list === 'tomorrow' && !task.completed);

      // Check for week-old Later tasks (7+ days old) and move them to Today
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoTimestamp = weekAgo.getTime();

      let weekOldTasksMoved = 0;
      incompleteLaterTasks.forEach(task => {
        const taskAge = task.createdAt || Date.now(); // Fallback for tasks without timestamp
        if (taskAge < weekAgoTimestamp) {
          // Task is 7+ days old, move to Today
          task.list = 'today';
          weekOldTasksMoved++;
        }
        // Task is already in the list, just update the list property
      });

      // Check deadlines on all tasks
      const allTasks = this.data.tasks;
      const todayDate = new Date(today);
      const threeDaysFromNow = new Date(todayDate);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      let deadlineTasksMoved = 0;
      let tasksMarkedImportant = 0;

      allTasks.forEach(task => {
        if (task.deadline) {
          const deadlineDate = new Date(task.deadline);

          // If deadline is today, move to Today list
          if (task.deadline === today) {
            // Move from Later to Today if not already there
            if (task.list === 'tomorrow') {
              task.list = 'today';
              deadlineTasksMoved++;
            }
          }

          // If deadline is within 3 days, mark as important
          if (deadlineDate <= threeDaysFromNow && !task.important) {
            task.important = true;
            tasksMarkedImportant++;
          }
        }
      });

      // Update date
      this.data.currentDate = today;

      // Prepare notification message
      let notificationParts = [];
      if (completedToday > 0 || completedLater > 0) {
        notificationParts.push(`${completedToday + completedLater} completed tasks cleaned up`);
      }
      if (weekOldTasksMoved > 0) {
        notificationParts.push(`${weekOldTasksMoved} week-old tasks moved to Today`);
      }
      if (deadlineTasksMoved > 0) {
        notificationParts.push(`${deadlineTasksMoved} deadline tasks moved to Today`);
      }
      if (tasksMarkedImportant > 0) {
        notificationParts.push(`${tasksMarkedImportant} tasks marked important (deadline approaching)`);
      }

      // Log cleanup for dev mode
      if (this.devMode && (completedToday > 0 || completedLater > 0 || weekOldTasksMoved > 0 || deadlineTasksMoved > 0 || tasksMarkedImportant > 0)) {
        console.log(`🗑️ Daily cleanup: Removed ${completedToday + completedLater} completed tasks, moved ${weekOldTasksMoved} week-old tasks to Today, moved ${deadlineTasksMoved} deadline tasks, marked ${tasksMarkedImportant} tasks important`);
      }

      this.save();

      // Show notification about the rollover
      if (notificationParts.length > 0) {
        this.showNotification(`New day! ${notificationParts.join(', ')}`, 'info');
      }
    }
  }
  
  bindEvents() {
    const todayInput = document.getElementById('today-task-input');
    const tomorrowInput = document.getElementById('tomorrow-task-input');

    // Add task via Enter key for Today
    todayInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleAddTask('today', todayInput);
      }
    });

    // Add task via Enter key for Tomorrow
    tomorrowInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleAddTask('tomorrow', tomorrowInput);
      }
    });

    // Make entire add-task-container clickable
    const todayContainer = todayInput.closest('.add-task-container');
    const tomorrowContainer = tomorrowInput.closest('.add-task-container');

    todayContainer.addEventListener('click', (e) => {
      // Always ensure focus happens reliably
      e.preventDefault();
      todayInput.focus();
    });

    tomorrowContainer.addEventListener('click', (e) => {
      // Always ensure focus happens reliably
      e.preventDefault();
      tomorrowInput.focus();
    });

    // Auto-focus tomorrow input field initially
    tomorrowInput.focus();

    // Global escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.taskManager.cancelEdit();
      }
    });
  }

  handleAddTask(list, inputElement) {
    const text = inputElement.value.trim();

    if (text) {
      // Prevent adding extremely long tasks
      if (text.length > 200) {
        this.showNotification('Task too long! Please keep it under 200 characters.', 'error');
        return;
      }

      // Prevent duplicate tasks in the same list
      const existingTasks = this.taskManager.getTasksByList(list);
      if (existingTasks.some(task => task.text.toLowerCase() === text.toLowerCase())) {
        this.showNotification('This task already exists in this list!', 'warning');
        return;
      }

      try {
        this.taskManager.addTask(text, list);
        inputElement.value = '';
        inputElement.focus();
      } catch (error) {
        console.error('Error adding task:', error);
        this.showNotification('Failed to add task. Please try again.', 'error');
      }
    }
  }

  // Show notification to user
  showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Create SVG icons for notifications
    const icons = {
      success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px;"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5z"/></svg>',
      error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px;"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>',
      warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px;"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
      info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px;"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>'
    };

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `${icons[type] || icons.info}${message}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      z-index: 1000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    // Set background color based on type
    const colors = {
      success: '#059669',
      error: '#dc2626',
      warning: '#d97706',
      info: '#2563eb'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }


  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  save() {
    // Debounce saves to improve performance
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      try {
        this.data.lastUpdated = Date.now();
        const success = Storage.save(this.data);
        if (!success) {
          this.showNotification('Storage quota exceeded! Please clear some browser data.', 'error');
        }
      } catch (error) {
        console.error('Save error:', error);
        this.showNotification('Failed to save data. Your changes might be lost.', 'error');
      }
    }, 100);
  }

  // Debounced render for performance
  render() {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }

    this.renderTimeout = setTimeout(() => {
      // Phase 4: Filter and sort tasks by list property
      const todayTasks = this.data.tasks.filter(t => t.list === 'today');
      const tomorrowTasks = this.data.tasks.filter(t => t.list === 'tomorrow');

      const sortedToday = this.taskManager.sortTasks(todayTasks);
      const sortedTomorrow = this.taskManager.sortTasks(tomorrowTasks);

      this.renderer.renderList('today', sortedToday);
      this.renderer.renderList('tomorrow', sortedTomorrow);

      if (this.devMode.isActive()) {
        const importantToday = sortedToday.filter(t => t.important && !t.completed).length;
        const importantTomorrow = sortedTomorrow.filter(t => t.important && !t.completed).length;

        if (importantToday > 0 || importantTomorrow > 0) {
          console.log('📋 SORTED LISTS:', {
            today: {
              total: sortedToday.length,
              important: importantToday,
              order: sortedToday.map(t => `${t.important ? '⭐' : '📅'} ${t.text.substring(0, 20)}`)
            },
            tomorrow: {
              total: sortedTomorrow.length,
              important: importantTomorrow,
              order: sortedTomorrow.map(t => `${t.important ? '⭐' : '📅'} ${t.text.substring(0, 20)}`)
            }
          });
        }
      }
    }, 16); // ~60fps
  }

  // Setup mobile navigation
  setupMobileNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const day = e.target.dataset.day;
        this.switchMobileView(day);
      });
    });

    // Set initial mobile view
    this.updateMobileView();
  }

  // Switch mobile view between days
  switchMobileView(day) {
    this.currentMobileView = day;
    this.updateMobileView();
  }

  // Update mobile view display
  updateMobileView() {
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.day === this.currentMobileView);
    });

    // Update list sections
    document.querySelectorAll('.list-section').forEach(section => {
      const sectionId = section.id.replace('-section', '');
      section.classList.toggle('active', sectionId === this.currentMobileView);
    });
  }

  // Setup swipe gestures for mobile
  setupSwipeGestures() {
    let startX = 0;
    let startY = 0;
    let isDragging = false;

    const main = document.querySelector('main');

    main.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
    });

    main.addEventListener('touchmove', (e) => {
      if (!isDragging) return;

      const deltaY = Math.abs(e.touches[0].clientY - startY);
      // Prevent vertical scrolling interference
      if (deltaY > 30) {
        isDragging = false;
      }
    });

    main.addEventListener('touchend', (e) => {
      if (!isDragging) return;

      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - startX;
      const threshold = 50; // Minimum swipe distance

      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          // Swipe right - go to Today (left list)
          this.switchMobileView('today');
        } else {
          // Swipe left - go to Later (right list)
          this.switchMobileView('tomorrow');
        }
      }

      isDragging = false;
    });
  }



  // Handle task click (completion or edit)
  handleTaskClick(id, event) {
    if (this.devMode.isActive()) {
      console.log('👆 TASK CLICK:', {
        taskId: id,
        editingTask: this.editingTask,
        wasLongPress: this.wasLongPress,
        eventType: event.type
      });
    }

    // If we're in edit mode for a DIFFERENT task, cancel edit and allow click
    if (this.editingTask && this.editingTask !== id) {
      this.taskManager.cancelEdit();
      // Don't return - allow the click to proceed
    }
    // If we're in edit mode for THIS task, don't complete
    else if (this.editingTask === id) {
      return;
    }

    // If this was a long press, don't complete
    if (this.wasLongPress) {
      this.wasLongPress = false;
      return;
    }

    // Check if we're in delete mode for this list
    const taskInfo = this.taskManager.findTask(id);
    if (!taskInfo) return;

    const listName = taskInfo.list;
    if (this.deleteMode[listName]) {
      // Delete mode - delete the task
      this.taskManager.deleteTask(id);
      this.showNotification('Task deleted', 'success');
      this.render();
      return;
    }

    // Normal click - complete task
    this.taskManager.completeTask(id, event);
  }

  // Phase 2: Ultra-comprehensive Long Press & Context Menu System

  // Initialize long press and context menu systems
  initializeLongPressSystem() {
    this.longPressManager = new LongPressManager({
      timeout: 600, // Accessibility optimized timing
      tolerance: 10, // Movement tolerance in pixels
      onLongPress: (element, event, position) => this.handleLongPress(element, event, position),
      onCancel: (reason) => this.handleLongPressCancel(reason),
      devMode: this.devMode
    });

    this.contextMenu = new ContextMenu({
      onEdit: (taskId) => this.handleMenuEdit(taskId),
      onToggleImportant: (taskId) => this.handleMenuToggleImportant(taskId),
      onSetDeadline: (taskId) => this.handleMenuSetDeadline(taskId),
      onStartPomodoro: (taskId) => this.handleMenuStartPomodoro(taskId),
      onAddSubtask: (taskId) => this.handleMenuAddSubtask(taskId),
      onDelete: (taskId) => this.handleMenuDelete(taskId),
      onClose: () => this.handleMenuClose(),
      devMode: this.devMode
    });
  }

  // Handle long press trigger
  handleLongPress(element, event, position) {
    const taskId = element.dataset.taskId;
    if (!taskId) return;

    const task = this.taskManager.findTask(taskId);
    if (!task) return;

    // Check if we're in delete mode - just edit quickly
    const isDeleteMode = task.list === 'today' ? this.deleteModeToday : this.deleteModeTomorrow;
    if (isDeleteMode) {
      setTimeout(() => this.taskManager.enterEditMode(taskId), 10);
      return;
    }

    // Show context menu
    this.contextMenu.show(position, task);
    this.wasLongPress = true;

    if (this.devMode.isActive()) {
      console.log('✅ LONG PRESS TRIGGERED - CONTEXT MENU:', {
        taskId,
        position,
        isImportant: task.important
      });
    }
  }

  // Handle long press cancellation
  handleLongPressCancel(reason) {
    if (this.devMode && reason !== 'normal') {
      console.log('❌ LONG PRESS CANCELLED:', reason);
    }
  }

  // Handle menu edit action
  handleMenuEdit(taskId) {
    this.contextMenu.hide();
    setTimeout(() => this.taskManager.enterEditMode(taskId), 50);
  }

  // Handle menu toggle important action
  handleMenuToggleImportant(taskId) {
    console.log('🐛 [IMPORTANT] handleMenuToggleImportant called', { taskId });

    // Find the ACTUAL task in the data array (not a copy)
    const actualTask = this.taskManager.findTaskById(taskId);
    console.log('🐛 [IMPORTANT] findTaskById result:', actualTask);

    if (!actualTask) {
      console.error('🐛 [IMPORTANT] Task not found!');
      return;
    }

    const wasImportant = actualTask.important;
    actualTask.important = !actualTask.important;

    console.log('🐛 [IMPORTANT] Toggled importance:', {
      taskId,
      text: actualTask.text,
      wasImportant,
      nowImportant: actualTask.important,
      taskObject: actualTask
    });

    this.contextMenu.hide();
    this.save();

    console.log('🐛 [IMPORTANT] Saved to storage, now rendering...');

    // Phase 3: Add importance animation trigger
    if (actualTask.important && !wasImportant) {
      // First render to add the important class
      this.render();

      // Then trigger the glow animation
      setTimeout(() => {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        console.log('🐛 [IMPORTANT] Found task element for animation:', taskElement);
        if (taskElement) {
          console.log('🐛 [IMPORTANT] Element classes before:', taskElement.className);
          taskElement.classList.add('importance-added');
          console.log('🐛 [IMPORTANT] Element classes after:', taskElement.className);

          // Remove the animation class after it completes
          setTimeout(() => {
            taskElement.classList.remove('importance-added');
          }, 600);
        }
      }, 50);
    } else {
      // Just render normally for removing importance
      console.log('🐛 [IMPORTANT] Removing importance, rendering...');
      this.render();
    }

    const action = actualTask.important ? 'marked as important' : 'importance removed';
    this.showNotification(`Task ${action}`, 'success');

    console.log('🐛 [IMPORTANT] Done with toggle, final state:', {
      taskId,
      isImportant: actualTask.important,
      text: actualTask.text,
      animationTriggered: actualTask.important && !wasImportant
    });
  }

  // Handle menu set deadline action
  handleMenuSetDeadline(taskId) {
    this.contextMenu.hide();
    setTimeout(() => this.deadlinePicker.show(taskId), 50);
  }

  // Handle menu delete action
  handleMenuDelete(taskId) {
    console.log('🐛 [DELETE] handleMenuDelete called', { taskId });

    const task = this.taskManager.findTask(taskId);
    if (!task) {
      console.error('🐛 [DELETE] Task not found!');
      return;
    }

    this.contextMenu.hide();

    // Delete directly - no confirmation needed (long press + menu selection is intentional enough)
    console.log('🐛 [DELETE] Deleting task and all subtasks...');
    this.taskManager.deleteTaskWithSubtasks(taskId);
    this.showNotification('Task deleted', 'success');
  }

  // Handle menu start pomodoro action
  handleMenuStartPomodoro(taskId) {
    this.contextMenu.hide();
    setTimeout(() => this.pomodoro.start(taskId), 50);
  }

  // Handle menu add subtask action
  handleMenuAddSubtask(taskId) {
    this.contextMenu.hide();
    setTimeout(() => this.taskManager.showAddSubtaskDialog(taskId), 50);
  }

  // Handle menu close
  handleMenuClose() {
    // Menu handles its own hiding
  }

  // Legacy methods for backward compatibility
  startLongPress(id, event) {
    const element = event.target.closest('[data-task-id]');
    if (element) {
      this.longPressManager.start(element, event);
    }
  }

  endLongPress() {
    this.longPressManager.cancel('normal');
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration);
        })
        .catch(error => {
          console.log('SW registration failed:', error);
        });
    }
  }
  // Setup sync controls
  setupSyncControls() {
    const exportFileBtn = document.getElementById('export-file-btn');
    const exportClipboardBtn = document.getElementById('export-clipboard-btn');
    const importFile = document.getElementById('import-file');
    const importClipboardBtn = document.getElementById('import-clipboard-btn');
    const qrBtn = document.getElementById('qr-btn');

    // Export to file functionality
    exportFileBtn.addEventListener('click', () => {
      try {
        const filename = Sync.exportToFile(this.data);
        this.showNotification(`Exported to ${filename}`, 'success');
      } catch (error) {
        this.showNotification(`Export failed: ${error.message}`, 'error');
      }
    });

    // Export to clipboard functionality
    exportClipboardBtn.addEventListener('click', async () => {
      try {
        const textData = Sync.exportToText(this.data);
        await navigator.clipboard.writeText(textData);
        this.showNotification(`Copied to clipboard`, 'success');
      } catch (error) {
        this.showNotification(`Copy failed: ${error.message}`, 'error');
      }
    });

    // Import functionality
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        let importedData = await Sync.importFromFile(file);

        // Migrate old format to new format if needed
        importedData = Storage.migrateData(importedData);

        // Merge with existing data
        const shouldReplace = confirm(
          'Replace your current tasks with imported data?\n\n' +
          'Click OK to replace everything, or Cancel to merge with existing tasks.'
        );

        if (shouldReplace) {
          this.data = importedData;
        } else {
          // Merge: add imported tasks to existing ones (avoid duplicates)
          const importedTasks = importedData.tasks || [];
          importedTasks.forEach(task => {
            const isDuplicate = this.data.tasks.some(existing =>
              existing.text === task.text && existing.list === task.list
            );
            if (!isDuplicate) {
              this.data.tasks.push(task);
            }
          });
          this.data.totalCompleted = Math.max(this.data.totalCompleted, importedData.totalCompleted || 0);
        }

        this.save();
        this.render();

        const taskCount = importedData.tasks ? importedData.tasks.length : 0;
        this.showNotification(`Imported ${taskCount} tasks`, 'success');

        // Clear file input
        importFile.value = '';
      } catch (error) {
        this.showNotification(`Import failed: ${error.message}`, 'error');
        importFile.value = '';
      }
    });

    // Import from clipboard functionality
    importClipboardBtn.addEventListener('click', async () => {
      try {
        // Try to read from clipboard first
        let clipboardText = '';

        // Check if we're on mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
          // On mobile, try clipboard API first
          try {
            clipboardText = await navigator.clipboard.readText();
          } catch (clipboardError) {
            // If it fails on mobile, show paste dialog
            console.log('Mobile clipboard access failed, showing paste dialog');
            clipboardText = await this.showPasteDialog();
            if (!clipboardText) {
              return; // User cancelled
            }
          }
        } else {
          // On desktop, always use paste dialog to avoid permission prompts
          clipboardText = await this.showPasteDialog();
          if (!clipboardText) {
            return; // User cancelled
          }
        }

        if (!clipboardText.trim()) {
          this.showNotification('Clipboard is empty or no data pasted', 'error');
          return;
        }

        // Try to parse as exported text format first
        let importedData;
        try {
          importedData = Sync.parseFromText(clipboardText);
        } catch (textError) {
          // If text parsing fails, try QR format
          try {
            importedData = Sync.parseQRData(clipboardText);
          } catch (qrError) {
            throw new Error('Invalid data format - not exported text or QR data');
          }
        }

        // Migrate old format to new format if needed
        importedData = Storage.migrateData(importedData);

        // Merge with existing data
        const shouldReplace = confirm(
          'Replace your current tasks with clipboard data?\n\n' +
          'Click OK to replace everything, or Cancel to merge with existing tasks.'
        );

        if (shouldReplace) {
          this.data = importedData;
        } else {
          // Merge: add imported tasks to existing ones (avoid duplicates)
          const importedTasks = importedData.tasks || [];
          importedTasks.forEach(task => {
            const isDuplicate = this.data.tasks.some(existing =>
              existing.text === task.text && existing.list === task.list
            );
            if (!isDuplicate) {
              this.data.tasks.push(task);
            }
          });
          this.data.totalCompleted = Math.max(this.data.totalCompleted, importedData.totalCompleted || 0);
        }

        this.save();
        this.render();

        const taskCount = importedData.tasks ? importedData.tasks.length : 0;
        this.showNotification(`Imported ${taskCount} tasks from clipboard`, 'success');

      } catch (error) {
        console.error('Clipboard import error:', error);

        // Provide specific error messages based on the error type
        if (error.name === 'NotAllowedError') {
          this.showNotification('Clipboard access denied. Please allow clipboard permissions and try again.', 'error');
        } else if (error.name === 'SecurityError') {
          this.showNotification('Clipboard access blocked for security. Make sure you are on HTTPS or localhost.', 'error');
        } else if (error.message.includes('Clipboard API')) {
          this.showNotification(error.message, 'error');
        } else {
          this.showNotification(`Import failed: ${error.message}`, 'error');
        }
      }
    });

    // QR Code functionality
    qrBtn.addEventListener('click', () => {
      this.qrHandler.showModal();
    });
  }

  // Theme management
  initTheme() {
    const savedTheme = localStorage.getItem('do-it-later-theme') || 'dark';
    this.applyTheme(savedTheme);
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
      this.toggleTheme();
      this.devMode.handleActivationTap();
    });
  }

  applyTheme(theme) {
    const body = document.body;
    const themeLabel = document.querySelector('.theme-label');

    if (theme === 'light') {
      body.classList.add('light-theme');
      if (themeLabel) themeLabel.textContent = 'Light';
    } else {
      body.classList.remove('light-theme');
      if (themeLabel) themeLabel.textContent = 'Dark';
    }
    this.currentTheme = theme;
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    localStorage.setItem('do-it-later-theme', newTheme);
  }

  // Delete mode functionality
  setupDeleteMode() {
    this.deleteMode = {
      today: false,
      tomorrow: false
    };

    const deleteModeToggles = document.querySelectorAll('.delete-mode-toggle');
    deleteModeToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const listName = e.target.closest('.delete-mode-toggle').dataset.list;
        this.toggleDeleteMode(listName);
      });
    });
  }

  toggleDeleteMode(listName) {
    this.deleteMode[listName] = !this.deleteMode[listName];

    const section = document.getElementById(`${listName}-section`);
    const toggle = section.querySelector('.delete-mode-toggle');

    if (this.deleteMode[listName]) {
      section.classList.add('delete-mode');
      toggle.classList.add('active');
      this.showDeleteModeNotice(section);
    } else {
      section.classList.remove('delete-mode');
      toggle.classList.remove('active');
      this.hideDeleteModeNotice(section);
    }
  }

  showDeleteModeNotice(section) {
    let notice = section.querySelector('.delete-mode-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'delete-mode-notice';
      notice.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">
          <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
        </svg>
        Delete mode active - click any task to remove it
      `;
      section.insertBefore(notice, section.querySelector('ul'));
    }
  }

  hideDeleteModeNotice(section) {
    const notice = section.querySelector('.delete-mode-notice');
    if (notice) {
      notice.remove();
    }
  }

  // Show paste dialog when clipboard API fails
  showPasteDialog() {
    return new Promise((resolve) => {
      // Create modal
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      `;

      const content = document.createElement('div');
      content.style.cssText = `
        background: var(--surface);
        padding: 2rem;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        text-align: center;
        color: var(--text);
      `;

      content.innerHTML = `
        <h3 style="margin-top: 0;">Paste Your Tasks</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Press Ctrl+V (or Cmd+V on Mac) to paste your tasks data
        </p>
        <textarea
          id="paste-area"
          placeholder="Click here and press Ctrl+V to paste..."
          style="
            width: 100%;
            min-height: 200px;
            padding: 1rem;
            border: 1px solid var(--border);
            border-radius: 4px;
            background: var(--background);
            color: var(--text);
            font-family: inherit;
            resize: vertical;
            margin: 1rem 0;
          "
        ></textarea>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button id="paste-import" class="sync-btn" style="padding: 0.5rem 1.5rem;">Import</button>
          <button id="paste-cancel" class="sync-btn" style="padding: 0.5rem 1.5rem; opacity: 0.7;">Cancel</button>
        </div>
      `;

      modal.appendChild(content);
      document.body.appendChild(modal);

      // Auto-focus textarea
      const textarea = content.querySelector('#paste-area');
      setTimeout(() => textarea.focus(), 100);

      // Handle import
      content.querySelector('#paste-import').addEventListener('click', () => {
        const pastedText = textarea.value;
        document.body.removeChild(modal);
        resolve(pastedText);
      });

      // Handle cancel
      content.querySelector('#paste-cancel').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });

      // Close on outside click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(null);
        }
      });

      // Handle Enter key to import
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          const pastedText = textarea.value;
          document.body.removeChild(modal);
          resolve(pastedText);
        }
      });
    });
  }

  // Removed showQRModal - now in qr-handler.js
}

// Phase 2: Ultra-Comprehensive Long Press Manager
// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new DoItTomorrowApp();
});
