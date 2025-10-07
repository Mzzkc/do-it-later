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

  // Generate unique ID for tasks
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Helper methods for new data structure
  getTasksByList(listName) {
    return this.data.tasks.filter(t => t.list === listName);
  }

  findTaskById(id) {
    return this.data.tasks.find(t => t.id === id);
  }

  addTaskToList(task, listName) {
    task.list = listName;
    this.data.tasks.push(task);
  }

  removeTaskById(id) {
    const index = this.data.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      this.data.tasks.splice(index, 1);
      return true;
    }
    return false;
  }

  moveTaskToList(id, toList) {
    const task = this.findTaskById(id);
    if (task) {
      task.list = toList;
      return true;
    }
    return false;
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
          this.cancelEdit();
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
        this.cancelEdit();
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
      const existingTasks = this.getTasksByList(list);
      if (existingTasks.some(task => task.text.toLowerCase() === text.toLowerCase())) {
        this.showNotification('This task already exists in this list!', 'warning');
        return;
      }

      try {
        this.addTask(text, list);
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

  // Phase 4: Smart task sorting system
  sortTasks(tasks) {
    console.log('🐛 [SORT] sortTasks called with tasks:', {
      total: tasks.length,
      important: tasks.filter(t => t.important).length,
      taskDetails: tasks.map(t => ({
        id: t.id,
        text: t.text.substring(0, 20),
        important: t.important,
        completed: t.completed,
        createdAt: t.createdAt
      }))
    });

    const sorted = tasks.sort((a, b) => {
      // First level: Importance (important tasks first, regardless of completion)
      if (a.important !== b.important) {
        const result = b.important ? 1 : -1;
        console.log(`🐛 [SORT] Comparing importance: ${a.text.substring(0, 15)} (${a.important}) vs ${b.text.substring(0, 15)} (${b.important}) = ${result}`);
        return result;
      }

      // Second level: Creation time (newest first for better UX)
      // Completed tasks stay in order with incomplete tasks
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    console.log('🐛 [SORT] After sorting:', {
      order: sorted.map((t, i) => `${i}: ${t.important ? '⭐' : '📅'} ${t.text.substring(0, 20)}`)
    });

    return sorted;
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

      const sortedToday = this.sortTasks(todayTasks);
      const sortedTomorrow = this.sortTasks(tomorrowTasks);

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

  // Core Task Management Functions

  // Add new task (always to Later list unless specified)
  addTask(text, list = 'tomorrow', parentId = null) {
    if (!text || !text.trim()) return false;

    const task = {
      id: this.generateId(),
      text: text.trim(),
      completed: false,
      important: false,
      createdAt: Date.now(),
      parentId: parentId,
      isExpanded: true
    };

    this.addTaskToList(task, list);
    this.save();
    this.render();
    return task;
  }

  // Toggle task completion status
  completeTask(id, event) {
    // Add ripple effect if event is provided
    if (event && event.target) {
      this.addRippleEffect(event.target);
    }

    // Find the actual task object (not a copy) in the data arrays
    const task = this.findTaskById(id);

    if (task) {
      const wasCompleted = task.completed;
      task.completed = !task.completed;

      // Increment lifetime counter when marking as complete
      if (!wasCompleted && task.completed) {
        this.data.totalCompleted = (this.data.totalCompleted || 0) + 1;
        this.updateCompletedCounter();
      }
      // Decrement counter when unmarking (undo)
      else if (wasCompleted && !task.completed) {
        this.data.totalCompleted = Math.max(0, (this.data.totalCompleted || 0) - 1);
        this.updateCompletedCounter();
      }

      // If this is a parent task being marked incomplete, also mark all children incomplete
      if (wasCompleted && !task.completed && !task.parentId) {
        const children = this.getChildren(id, task.list);
        if (children.length > 0) {
          children.forEach(child => {
            if (child.completed) {
              child.completed = false;
              // Decrement counter for each child
              this.data.totalCompleted = Math.max(0, (this.data.totalCompleted || 0) - 1);
            }
          });
          this.updateCompletedCounter();
        }
      }

      // Check if parent should auto-complete
      if (task.parentId) {
        this.checkParentCompletion(task.parentId, task.list);
      }

      this.save();
      this.render();
      return true;
    }
    return false;
  }

  // Add ripple effect to clicked element
  addRippleEffect(element) {
    // Don't add multiple ripples
    if (element.classList.contains('ripple')) return;

    element.classList.add('ripple');

    setTimeout(() => {
      element.classList.add('ripple-fade');
      element.classList.remove('ripple');

      setTimeout(() => {
        element.classList.remove('ripple-fade');
      }, 200);
    }, 300);
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
      this.cancelEdit();
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
    const taskInfo = this.findTask(id);
    if (!taskInfo) return;

    const listName = taskInfo.list;
    if (this.deleteMode[listName]) {
      // Delete mode - delete the task
      this.deleteTask(id);
      this.showNotification('Task deleted', 'success');
      this.render();
      return;
    }

    // Normal click - complete task
    this.completeTask(id, event);
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

    const task = this.findTask(taskId);
    if (!task) return;

    // Check if we're in delete mode - just edit quickly
    const isDeleteMode = task.list === 'today' ? this.deleteModeToday : this.deleteModeTomorrow;
    if (isDeleteMode) {
      setTimeout(() => this.enterEditMode(taskId), 10);
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
    setTimeout(() => this.enterEditMode(taskId), 50);
  }

  // Handle menu toggle important action
  handleMenuToggleImportant(taskId) {
    console.log('🐛 [IMPORTANT] handleMenuToggleImportant called', { taskId });

    // Find the ACTUAL task in the data array (not a copy)
    const actualTask = this.findTaskById(taskId);
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

    const task = this.findTask(taskId);
    if (!task) {
      console.error('🐛 [DELETE] Task not found!');
      return;
    }

    this.contextMenu.hide();

    // Delete directly - no confirmation needed (long press + menu selection is intentional enough)
    console.log('🐛 [DELETE] Deleting task and all subtasks...');
    this.deleteTaskWithSubtasks(taskId);
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
    setTimeout(() => this.showAddSubtaskDialog(taskId), 50);
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

  // Enter edit mode for a task
  enterEditMode(id) {
    // Prevent race conditions by checking if we're already editing this task
    if (this.editingTask === id) return;

    // Cancel any existing edit mode first
    if (this.editingTask) this.cancelEdit();

    const taskInfo = this.findTask(id);
    if (!taskInfo) return;

    const taskElement = document.querySelector(`[data-task-id="${id}"] .task-text`);
    if (!taskElement) return;

    this.editingTask = id;
    this.originalText = taskInfo.text;

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = taskInfo.text;
    input.className = 'edit-input';
    input.style.cssText = `
      width: 100%;
      background: transparent;
      border: 1px solid var(--primary-color);
      border-radius: 4px;
      padding: 4px 8px;
      color: var(--text);
      font-family: inherit;
      font-size: inherit;
      overflow: hidden;
      text-overflow: clip;
      white-space: nowrap;
      outline: none;
    `;

    // Replace task text with input
    taskElement.style.display = 'none';
    taskElement.parentNode.insertBefore(input, taskElement);

    // Focus and select all text
    input.focus();
    input.select();

    // Save on Enter or blur
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveEdit(input.value.trim());
      }
    });

    input.addEventListener('blur', () => {
      this.saveEdit(input.value.trim());
    });
  }

  // Save edited task text
  saveEdit(newText) {
    if (!this.editingTask) return;

    // Find the actual task object to update
    const actualTask = this.findTaskById(this.editingTask);

    if (!actualTask) return;

    // Validate new text
    if (newText && newText.length > 200) {
      this.showNotification('Task too long! Please keep it under 200 characters.', 'error');
      return;
    }

    // If text is empty, delete the task
    if (!newText || newText.trim() === '') {
      try {
        this.deleteTask(this.editingTask);
        this.showNotification('Task deleted', 'success');
        this.cancelEdit();
        this.render();
        return;
      } catch (error) {
        console.error('Error deleting task:', error);
        this.showNotification('Failed to delete task. Please try again.', 'error');
      }
    }

    // Update task text if changed and not empty
    if (newText && newText !== this.originalText) {
      try {
        actualTask.text = newText;
        this.save();
      } catch (error) {
        console.error('Error updating task:', error);
        this.showNotification('Failed to update task. Please try again.', 'error');
        actualTask.text = this.originalText; // Revert on error
      }
    }

    this.cancelEdit();
    this.render();
  }

  // Cancel edit mode
  cancelEdit() {
    if (!this.editingTask) return;

    // More robust edit input removal
    const editInputs = document.querySelectorAll('.edit-input');
    editInputs.forEach(input => {
      try {
        if (input && input.parentNode && input.isConnected) {
          input.remove();
        }
      } catch (error) {
        if (this.devMode.isActive()) {
          console.log('⚠️ Edit input removal failed:', error.message);
        }
      }
    });

    // Restore task text display
    const taskElement = document.querySelector(`[data-task-id="${this.editingTask}"] .task-text`);
    if (taskElement) {
      taskElement.style.display = '';
    }

    this.editingTask = null;
    this.originalText = null;
    this.wasLongPress = false; // Reset long press flag when canceling edit
  }

  // Move task from Today to Later
  pushToTomorrow(id) {
    // Animate the task item being pushed right
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);
    if (taskElement) {
      taskElement.classList.add('pushing-right');
      setTimeout(() => {
        taskElement.classList.remove('pushing-right');
        this.animateTaskMovement(id, 'today', 'tomorrow', 'right');
      }, 300);
    }
  }

  // Move task from Later to Today (for productive days!)
  pullToToday(id) {
    // Animate the task item being pushed left
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);
    if (taskElement) {
      taskElement.classList.add('pushing-left');
      setTimeout(() => {
        taskElement.classList.remove('pushing-left');
        this.animateTaskMovement(id, 'tomorrow', 'today', 'left');
      }, 300);
    }
  }

  // Animated task movement between lists
  animateTaskMovement(id, fromList, toList, direction) {
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);
    if (!taskElement) return false;

    // Add moving-out animation in correct direction
    taskElement.classList.add(`moving-out-${direction}`);

    // Wait for animation, then move the task
    setTimeout(() => {
      const task = this.findTaskById(id);
      if (!task) return false;

      console.log('🐛 [MOVE] Moving task:', {
        id: task.id,
        text: task.text.substring(0, 30),
        hasParent: !!task.parentId,
        fromList,
        toList
      });

      // Handle subtask movement (task being moved IS a subtask)
      if (task.parentId) {
        console.log('🐛 [MOVE] This is a subtask, moving individually...');
        const parent = this.findTaskById(task.parentId);

        if (!parent) {
          console.error('🐛 [MOVE] Parent not found!');
          return false;
        }

        // Just change the subtask's list property
        // Parent stays where it is, child can be in different list
        task.list = toList;
        console.log(`🐛 [MOVE] Moved subtask to ${toList}, parent remains in ${parent.list}`);
      } else {
        // Handle parent task movement - move all children with it
        const children = this.data.tasks.filter(t => t.parentId === task.id);
        if (children.length > 0) {
          console.log(`🐛 [MOVE] This is a parent task with ${children.length} children, moving them all`);

          // Move all children to the target list
          children.forEach(child => {
            child.list = toList;
            console.log(`🐛 [MOVE] Moved child: ${child.text.substring(0, 20)}`);
          });
        }

        // Move the parent task
        task.list = toList;
      }

      this.save();

      // Mark task for moving-in animation from opposite direction
      const inDirection = direction === 'right' ? 'left' : 'right';
      task._justMoved = inDirection;
      this.render();

      return true;
    }, 300);
  }

  // Helper function to find task by ID across both lists
  findTask(id) {
    const task = this.findTaskById(id);
    return task ? { ...task } : null;
  }

  // Delete task with all its subtasks (recursively)
  deleteTaskWithSubtasks(id) {
    console.log('🐛 [DELETE] deleteTaskWithSubtasks called', { id });

    let deletedCount = 0;
    const task = this.findTaskById(id);

    if (!task) {
      console.error('🐛 [DELETE] Task not found');
      return false;
    }

    console.log(`🐛 [DELETE] Found task:`, {
      id: task.id,
      text: task.text.substring(0, 30),
      hasParent: !!task.parentId
    });

    // If this is a parent task, delete all its children first
    if (!task.parentId) {
      // Find all children (across all lists)
      const children = this.data.tasks.filter(t => t.parentId === id);
      console.log(`🐛 [DELETE] Found ${children.length} children to delete`);

      children.forEach(child => {
        this.removeTaskById(child.id);
        deletedCount++;
        console.log(`🐛 [DELETE] Deleted child: ${child.text.substring(0, 20)}`);
      });
    }

    // Delete the task itself
    const removed = this.removeTaskById(id);
    if (removed) {
      deletedCount++;
      console.log(`🐛 [DELETE] Deleted main task`);
    }

    console.log(`🐛 [DELETE] Total tasks deleted: ${deletedCount}`);
    this.save();
    this.render();

    return true;
  }

  // Delete task (simple version without subtasks)
  deleteTask(id) {
    const found = this.removeTaskById(id);

    if (found) {
      this.save();
      this.render();
    }
    return found;
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

  // Subtask Management Methods

  // Show inline input to add subtask
  showAddSubtaskDialog(taskId) {
    console.log('🐛 [SUBTASK] showAddSubtaskDialog called', { taskId });

    const taskInfo = this.findTask(taskId);
    if (!taskInfo) {
      console.error('🐛 [SUBTASK] Task not found!');
      return;
    }

    // Find the actual task in the data array using helper method
    const actualTask = this.findTaskById(taskId);
    if (!actualTask) {
      console.error('🐛 [SUBTASK] Actual task not found in data!');
      return;
    }

    // Mark this task as having an active subtask input
    actualTask._addingSubtask = true;

    // Make sure the task is expanded so we can see the input
    if (!actualTask.isExpanded) {
      actualTask.isExpanded = true;
    }

    console.log('🐛 [SUBTASK] Marked task for subtask input, re-rendering...');
    this.save();
    this.render();

    // Focus the input after render
    setTimeout(() => {
      const input = document.getElementById(`subtask-input-${taskId}`);
      if (input) {
        input.focus();
        console.log('🐛 [SUBTASK] Focused subtask input');
      } else {
        console.error('🐛 [SUBTASK] Could not find subtask input after render');
      }
    }, 50);
  }

  // Add subtask to a task
  addSubtask(parentTaskId, text) {
    console.log('🐛 [SUBTASK] addSubtask called', { parentTaskId, text });

    const taskInfo = this.findTask(parentTaskId);
    if (!taskInfo) {
      console.error('🐛 [SUBTASK] Parent task not found!');
      return;
    }

    // Create a new task with parentId set
    const newTask = {
      id: this.generateId(),
      text: text,
      completed: false,
      important: false,
      parentId: parentTaskId,
      createdAt: Date.now()
    };

    console.log('🐛 [SUBTASK] Created new subtask:', newTask);

    // Add to the same list as the parent using helper method
    this.addTaskToList(newTask, taskInfo.list);
    this.save();

    // Re-render to show the new subtask
    this.render();

    // Re-focus the input after render
    setTimeout(() => {
      const input = document.getElementById(`subtask-input-${parentTaskId}`);
      if (input) {
        input.focus();
        console.log('🐛 [SUBTASK] Re-focused input after adding subtask');
      }
    }, 50);

    this.showNotification('Subtask added', Config.NOTIFICATION_TYPES.SUCCESS);
  }

  // Toggle subtask expansion
  toggleSubtaskExpansion(taskId) {
    const taskInfo = this.findTask(taskId);
    if (!taskInfo) return;

    // Find the actual task in the data array (not the copy) using helper method
    const actualTask = this.findTaskById(taskId);
    if (actualTask) {
      actualTask.isExpanded = !actualTask.isExpanded;
      this.save();

      // Instead of full render, just toggle the subtask list display and update icon
      const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
      if (taskElement) {
        // Find the expand icon and update it
        const expandIcon = taskElement.querySelector('.expand-icon');
        if (expandIcon) {
          expandIcon.textContent = actualTask.isExpanded ? '▼' : '▶';
        }

        // Find the subtask container (it's the next sibling after the task element)
        const subtaskList = taskElement.nextElementSibling;
        if (subtaskList && subtaskList.classList.contains('subtask-list')) {
          subtaskList.style.display = actualTask.isExpanded ? 'block' : 'none';
        }
      }
    }
  }

  // Get children of a task
  getChildren(parentId, listName = null) {
    // If listName is provided, filter by list (for backward compatibility)
    // If not provided, get ALL children regardless of list
    if (listName) {
      return this.data.tasks.filter(task => task.parentId === parentId && task.list === listName);
    }
    return this.data.tasks.filter(task => task.parentId === parentId);
  }

  // Check if parent should auto-complete
  checkParentCompletion(parentId, listName) {
    const children = this.getChildren(parentId, listName);
    if (children.length === 0) return;

    const allComplete = children.every(child => child.completed);
    if (allComplete) {
      const parent = this.data.tasks.find(t => t.id === parentId && t.list === listName);
      if (parent && !parent.completed) {
        parent.completed = true;
        this.showNotification('Task completed! All subtasks done.', Config.NOTIFICATION_TYPES.SUCCESS);
      }
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
class LongPressManager {
  constructor(options = {}) {
    this.timeout = options.timeout || 600; // Accessibility optimized
    this.tolerance = options.tolerance || 10; // Movement tolerance in pixels
    this.onLongPress = options.onLongPress || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.devMode = options.devMode || false;

    // State tracking
    this.isActive = false;
    this.timer = null;
    this.startPosition = null;
    this.currentElement = null;
    this.startEvent = null;

    // Device detection
    this.isTouchDevice = 'ontouchstart' in window;
    this.isPointerDevice = 'onpointerdown' in window;

    if (this.devMode.isActive()) {
      console.log('🎯 LongPressManager initialized:', {
        timeout: this.timeout,
        tolerance: this.tolerance,
        isTouchDevice: this.isTouchDevice,
        isPointerDevice: this.isPointerDevice
      });
    }
  }

  // Start long press detection
  start(element, event) {
    if (!element || this.isActive) return;

    this.isActive = true;
    this.currentElement = element;
    this.startEvent = event;

    // Get position from touch or mouse event
    const position = this.getEventPosition(event);
    this.startPosition = position;

    // Add visual feedback
    element.classList.add('button-pressed');

    // Set up movement detection
    this.setupMovementDetection(event);

    // Start timer
    this.timer = setTimeout(() => {
      if (this.isActive) {
        this.triggerLongPress();
      }
    }, this.timeout);

    if (this.devMode.isActive()) {
      console.log('⏱️ LONG PRESS START:', {
        element: element.dataset.taskId,
        position,
        eventType: event.type,
        timeout: this.timeout
      });
    }
  }

  // Cancel long press
  cancel(reason = 'manual') {
    if (!this.isActive) return;

    this.cleanup();
    this.onCancel(reason);

    if (this.devMode && reason !== 'normal') {
      console.log('❌ LONG PRESS CANCELLED:', reason);
    }
  }

  // Trigger long press
  triggerLongPress() {
    if (!this.isActive || !this.currentElement) return;

    const position = this.startPosition;
    const element = this.currentElement;
    const event = this.startEvent;

    this.cleanup();
    this.onLongPress(element, event, position);

    // Haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  // Setup movement detection for different device types
  setupMovementDetection(startEvent) {
    if (startEvent.type === 'touchstart') {
      this.setupTouchMovement();
    } else {
      this.setupMouseMovement();
    }
  }

  // Touch movement detection
  setupTouchMovement() {
    const moveHandler = (e) => {
      if (!this.isActive) return;
      const position = this.getEventPosition(e);
      if (this.isMovementExceeded(position)) {
        this.cancel('movement');
      }
    };

    const endHandler = () => {
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endHandler);
      document.removeEventListener('touchcancel', endHandler);
      if (this.isActive) {
        this.cancel('touchend');
      }
    };

    document.addEventListener('touchmove', moveHandler, { passive: true });
    document.addEventListener('touchend', endHandler);
    document.addEventListener('touchcancel', endHandler);
  }

  // Mouse movement detection
  setupMouseMovement() {
    const moveHandler = (e) => {
      if (!this.isActive) return;
      const position = this.getEventPosition(e);
      if (this.isMovementExceeded(position)) {
        this.cancel('movement');
      }
    };

    const upHandler = () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
      document.removeEventListener('mouseleave', upHandler);
      if (this.isActive) {
        this.cancel('mouseup');
      }
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
    document.addEventListener('mouseleave', upHandler);
  }

  // Check if movement exceeds tolerance
  isMovementExceeded(currentPosition) {
    if (!this.startPosition || !currentPosition) return false;

    const deltaX = Math.abs(currentPosition.x - this.startPosition.x);
    const deltaY = Math.abs(currentPosition.y - this.startPosition.y);

    return deltaX > this.tolerance || deltaY > this.tolerance;
  }

  // Get position from event (cross-platform)
  getEventPosition(event) {
    if (event.touches && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
    return {
      x: event.clientX,
      y: event.clientY
    };
  }

  // Cleanup state and timers
  cleanup() {
    this.isActive = false;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.currentElement) {
      this.currentElement.classList.remove('button-pressed');
      this.currentElement = null;
    }

    this.startPosition = null;
    this.startEvent = null;
  }
}

// Phase 2: Ultra-Comprehensive Context Menu
class ContextMenu {
  constructor(options = {}) {
    this.onEdit = options.onEdit || (() => {});
    this.onToggleImportant = options.onToggleImportant || (() => {});
    this.onSetDeadline = options.onSetDeadline || (() => {});
    this.onStartPomodoro = options.onStartPomodoro || (() => {});
    this.onAddSubtask = options.onAddSubtask || (() => {});
    this.onDelete = options.onDelete || (() => {});
    this.onClose = options.onClose || (() => {});
    this.devMode = options.devMode || false;

    // Menu state
    this.isVisible = false;
    this.currentTask = null;
    this.menuElement = null;
    this.backdropElement = null;

    if (this.devMode.isActive()) {
      console.log('📋 ContextMenu initialized');
    }
  }

  // Show context menu
  show(position, task) {
    if (this.isVisible) this.hide();

    this.currentTask = task;
    this.isVisible = true;

    this.createMenuElement(position, task);
    this.setupMenuInteractions();

    if (this.devMode.isActive()) {
      console.log('📋 CONTEXT MENU SHOWN:', {
        taskId: task.id,
        position,
        isImportant: task.important
      });
    }
  }

  // Hide context menu
  hide() {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.removeMenuElement();
    this.currentTask = null;
    this.onClose();

    if (this.devMode.isActive()) {
      console.log('📋 CONTEXT MENU HIDDEN');
    }
  }

  // Create menu DOM element
  createMenuElement(position, task) {
    // Create backdrop
    this.backdropElement = document.createElement('div');
    this.backdropElement.className = 'context-menu-backdrop';

    // Create menu
    this.menuElement = document.createElement('div');
    this.menuElement.className = 'context-menu';
    this.menuElement.setAttribute('role', 'menu');
    this.menuElement.setAttribute('aria-label', `Task options for "${task.text}"`);

    // Menu content
    this.menuElement.innerHTML = `
      <div class="context-menu-item" role="menuitem" data-action="edit" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
          <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
        </svg>
        <span>Edit Task</span>
      </div>
      <div class="context-menu-item" role="menuitem" data-action="important" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
        </svg>
        <span>${task.important ? 'Remove Importance' : 'Mark as Important'}</span>
      </div>
      <div class="context-menu-item" role="menuitem" data-action="deadline" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
          <path d="M6.445 11.688V6.354h-.633A12.6 12.6 0 0 0 4.5 7.16v.695c.375-.257.969-.62 1.258-.777h.012v4.61h.675zm1.188-1.305c.047.64.594 1.406 1.703 1.406 1.258 0 2-1.066 2-2.871 0-1.934-.781-2.668-1.953-2.668-.926 0-1.797.672-1.797 1.809 0 1.16.824 1.77 1.676 1.77.746 0 1.23-.376 1.383-.79h.027c-.004 1.316-.461 2.164-1.305 2.164-.664 0-1.008-.45-1.05-.82h-.684zm2.953-2.317c0 .696-.559 1.18-1.184 1.18-.601 0-1.144-.383-1.144-1.2 0-.823.582-1.21 1.168-1.21.633 0 1.16.398 1.16 1.23z"/>
        </svg>
        <span>${task.deadline ? 'Change Deadline' : 'Set Deadline'}</span>
      </div>
      <div class="context-menu-item" role="menuitem" data-action="pomodoro" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M8 3.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5H4a.5.5 0 0 1 0-1h3.5V4a.5.5 0 0 1 .5-.5z"/>
        </svg>
        <span>Start Pomodoro</span>
      </div>
      <div class="context-menu-item" role="menuitem" data-action="add-subtask" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
        </svg>
        <span>Add Subtask</span>
      </div>
      <div class="context-menu-item" role="menuitem" data-action="delete" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
          <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
        </svg>
        <span>Delete Task</span>
      </div>
    `;

    // Position menu
    this.positionMenu(position);

    // Add to DOM
    document.body.appendChild(this.backdropElement);
    document.body.appendChild(this.menuElement);

    // Animate in
    requestAnimationFrame(() => {
      this.backdropElement.style.opacity = '1';
      this.menuElement.style.opacity = '1';
      this.menuElement.style.transform = 'scale(1)';
    });
  }

  // Position menu with viewport awareness
  positionMenu(position) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth <= 768;

    if (isMobile) {
      // Mobile: Center bottom sheet
      this.menuElement.classList.add('mobile-bottom-sheet');
      this.menuElement.style.left = '50%';
      this.menuElement.style.top = 'auto';
      this.menuElement.style.bottom = '0';
      this.menuElement.style.transform = 'translateX(-50%)';
    } else {
      // Desktop: Position near touch/click point
      const menuWidth = 200; // Estimated menu width
      const menuHeight = 100; // Estimated menu height
      const margin = 20; // Margin from viewport edges

      let x = position.x;
      let y = position.y - 50; // Offset above touch point

      // Horizontal viewport constraints
      if (x + menuWidth > viewportWidth - margin) {
        x = viewportWidth - menuWidth - margin;
      }
      if (x < margin) {
        x = margin;
      }

      // Vertical viewport constraints
      if (y + menuHeight > viewportHeight - margin) {
        y = position.y - menuHeight - 10; // Flip above touch point
      }
      if (y < margin) {
        y = margin;
      }

      this.menuElement.style.left = `${x}px`;
      this.menuElement.style.top = `${y}px`;
      this.menuElement.style.bottom = 'auto';
      this.menuElement.style.transform = 'scale(1)';
    }
  }

  // Setup menu interactions
  setupMenuInteractions() {
    // Click handlers
    this.menuElement.addEventListener('click', (e) => {
      const item = e.target.closest('.context-menu-item');
      if (!item) return;

      const action = item.dataset.action;
      this.handleMenuAction(action);
      e.stopPropagation();
    });

    // Keyboard navigation
    this.menuElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      } else if (e.key === 'Enter' || e.key === ' ') {
        const focused = e.target.closest('.context-menu-item');
        if (focused) {
          e.preventDefault();
          this.handleMenuAction(focused.dataset.action);
        }
      }
    });

    // Backdrop click to close
    this.backdropElement.addEventListener('click', () => {
      this.hide();
    });

    // Focus first item
    setTimeout(() => {
      const firstItem = this.menuElement.querySelector('.context-menu-item');
      if (firstItem) {
        firstItem.focus();
      }
    }, 100);
  }

  // Handle menu action
  handleMenuAction(action) {
    if (!this.currentTask) return;

    switch (action) {
      case 'edit':
        this.onEdit(this.currentTask.id);
        break;
      case 'important':
        this.onToggleImportant(this.currentTask.id);
        break;
      case 'deadline':
        this.onSetDeadline(this.currentTask.id);
        break;
      case 'pomodoro':
        this.onStartPomodoro(this.currentTask.id);
        break;
      case 'add-subtask':
        this.onAddSubtask(this.currentTask.id);
        break;
      case 'delete':
        this.onDelete(this.currentTask.id);
        break;
    }
  }

  // Remove menu from DOM
  removeMenuElement() {
    if (this.menuElement) {
      this.menuElement.remove();
      this.menuElement = null;
    }
    if (this.backdropElement) {
      this.backdropElement.remove();
      this.backdropElement = null;
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new DoItTomorrowApp();
});
