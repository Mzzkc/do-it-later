// Do It (Later) - Main Application
// Phase 1: Basic app initialization

class DoItTomorrowApp {
  constructor() {
    this.data = Storage.load();
    this.saveTimeout = null;
    this.renderTimeout = null;
    this.currentMobileView = 'today'; // Default to today on mobile
    this.devMode = false;
    this.devTapCount = 0;
    this.devTapTimer = null;
    this.logs = [];

    // Simple scroll detection
    this.isScrolling = false;

    this.setupLogging();
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
    if (this.devMode) {
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
      // New day - move incomplete tomorrow tasks to today, remove completed tasks
      this.data.today = this.data.tomorrow.filter(task => !task.completed);
      this.data.tomorrow = [];
      this.data.currentDate = today;
      this.save();
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
      const existingTasks = this.data[list];
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

  renderList(listName, tasks) {
    const listEl = document.getElementById(`${listName}-list`);
    if (!listEl) return;

    listEl.innerHTML = '';

    if (tasks.length === 0) {
      const emptyMsg = document.createElement('li');
      emptyMsg.className = 'empty-message';

      if (listName === 'today') {
        const totalCompleted = this.data.totalCompleted || 0;
        if (totalCompleted === 0) {
          emptyMsg.innerHTML = 'Ready to start your day?<br><small>Add tasks or move some from Later</small>';
        } else {
          emptyMsg.innerHTML = 'All done for today!<br><small>Take a break or tackle later tasks</small>';
        }
      } else {
        emptyMsg.innerHTML = 'What\'s on your agenda for later?<br><small>Type above to add your first task</small>';
      }

      listEl.appendChild(emptyMsg);
      return;
    }

    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
      li.setAttribute('data-task-id', task.id);

      // Unified touch handling with tap detection and long press
      let taskStartX, taskStartY, taskStartTime;
      let touchHandled = false;

      li.addEventListener('touchstart', (e) => {
        if (this.devMode) {
          console.log('👆 TASK TOUCHSTART:', {
            taskId: task.id,
            isScrolling: this.isScrolling
          });
        }

        taskStartX = e.touches[0].clientX;
        taskStartY = e.touches[0].clientY;
        taskStartTime = Date.now();
        touchHandled = true;

        li.classList.add('button-pressed');
        this.startLongPress(task.id, e);
      });

      li.addEventListener('touchend', (e) => {
        li.classList.remove('button-pressed');
        this.endLongPress();

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const endTime = Date.now();

        const deltaX = Math.abs(endX - taskStartX);
        const deltaY = Math.abs(endY - taskStartY);
        const deltaTime = endTime - taskStartTime;

        // Only handle as tap if it's quick with minimal movement
        const isTap = deltaX < 10 && deltaY < 10 && deltaTime < 500;

        if (this.devMode) {
          console.log('📱 TASK TOUCHEND:', {
            taskId: task.id,
            deltaX,
            deltaY,
            deltaTime,
            isTap,
            wasLongPress: this.wasLongPress,
            willExecute: isTap && !this.wasLongPress
          });
        }

        if (isTap && !this.wasLongPress) {
          // Create a synthetic event for consistency with existing code
          const syntheticEvent = { type: 'tap', target: e.target };
          this.handleTaskClick(task.id, syntheticEvent);
        }

        // Reset touch handled flag after a delay to allow for click events from mouse
        setTimeout(() => {
          touchHandled = false;
        }, 100);
      });

      li.addEventListener('touchcancel', (e) => {
        li.classList.remove('button-pressed');
        this.endLongPress();
      });

      // Mouse events for desktop
      li.addEventListener('mousedown', (e) => {
        li.classList.add('button-pressed');
        this.startLongPress(task.id, e);
      });
      li.addEventListener('mouseup', () => {
        li.classList.remove('button-pressed');
        this.endLongPress();
      });
      li.addEventListener('mouseleave', () => {
        li.classList.remove('button-pressed');
        this.endLongPress();
      });
      li.addEventListener('click', (e) => {
        if (this.devMode) {
          console.log('🖱️ TASK CLICK EVENT (MOUSE):', {
            taskId: task.id,
            target: e.target.tagName,
            eventType: e.type,
            touchHandled,
            willExecute: !touchHandled
          });
        }

        // Prevent click if touch was handled
        if (touchHandled) {
          if (this.devMode) {
            console.log('🚫 CLICK BLOCKED: Touch event already handled');
          }
          return;
        }

        this.handleTaskClick(task.id, e);
      });

      // Add moving-in animation for recently moved tasks
      if (task._justMoved) {
        li.classList.add(`moving-in-${task._justMoved}`);
        delete task._justMoved;

        // Clean up the animation class after it completes
        setTimeout(() => {
          li.classList.remove(`moving-in-left`);
          li.classList.remove(`moving-in-right`);
        }, 300);
      }

      li.innerHTML = this.getTaskHTML(task, listName);
      listEl.appendChild(li);

      // Add event listeners for arrow buttons
      const moveIcon = li.querySelector('.move-icon');
      if (moveIcon) {
        moveIcon.addEventListener('click', (e) => {
          e.preventDefault(); // Prevent any default behavior
          e.stopImmediatePropagation(); // Stop all propagation including other listeners
          const action = moveIcon.dataset.action;
          const taskId = moveIcon.dataset.taskId;
          if (action === 'push') {
            this.pushToTomorrow(taskId);
          } else if (action === 'pull') {
            this.pullToToday(taskId);
          }
        });
        // Touch events with simple tap detection
        let startX, startY, startTime;

        moveIcon.addEventListener('touchstart', (e) => {
          e.stopPropagation(); // Prevent task touchstart from firing
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          startTime = Date.now();

          // Cancel any existing long press for the parent task
          this.endLongPress();

          // Add visual pressed state to arrow
          moveIcon.style.opacity = '0.6';

          if (this.devMode) {
            console.log('⬅️ ARROW TOUCHSTART:', {
              action: moveIcon.dataset.action
            });
          }
        });

        moveIcon.addEventListener('touchend', (e) => {
          // Reset visual pressed state
          moveIcon.style.opacity = '';

          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          const endTime = Date.now();

          const deltaX = Math.abs(endX - startX);
          const deltaY = Math.abs(endY - startY);
          const deltaTime = endTime - startTime;

          // Only execute if it's a quick tap with minimal movement
          const isTap = deltaX < 10 && deltaY < 10 && deltaTime < 500;

          if (this.devMode) {
            console.log('⬅️ ARROW TOUCHEND:', {
              action: moveIcon.dataset.action,
              taskId: moveIcon.dataset.taskId,
              deltaX,
              deltaY,
              deltaTime,
              isTap
            });
          }

          if (!isTap) {
            if (this.devMode) {
              console.log('🚫 ARROW BLOCKED: Movement detected');
            }
            return;
          }

          e.preventDefault();
          e.stopImmediatePropagation();

          const action = moveIcon.dataset.action;
          const taskId = moveIcon.dataset.taskId;

          if (this.devMode) {
            console.log('✅ ARROW EXECUTED:', { action, taskId });
          }

          if (action === 'push') {
            this.pushToTomorrow(taskId);
          } else if (action === 'pull') {
            this.pullToToday(taskId);
          }
        });

        moveIcon.addEventListener('touchcancel', (e) => {
          // Reset visual pressed state
          moveIcon.style.opacity = '';
        });
      }
    });

    // Overflow detection removed
  }

  getTaskHTML(task, listName) {
    // Movement icons only for incomplete tasks - elegant arrows
    const moveBtnHTML = task.completed ? '' :
      (listName === 'today' ?
        `<span class="move-icon" data-action="push" data-task-id="${task.id}" title="Push to Later">→</span>` :
        `<span class="move-icon" data-action="pull" data-task-id="${task.id}" title="Pull to Today">←</span>`);

    return `
      <span class="task-text">${this.escapeHtml(task.text)}</span>
      <div class="task-actions">
        ${moveBtnHTML}
      </div>
    `;
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
      this.renderList('today', this.data.today);
      this.renderList('tomorrow', this.data.tomorrow);
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
  addTask(text, list = 'tomorrow') {
    if (!text || !text.trim()) return false;

    const task = {
      id: this.generateId(),
      text: text.trim(),
      completed: false,
      createdAt: Date.now()
    };

    this.data[list].push(task);
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
    let task = null;
    let taskIndex = -1;
    let listName = '';

    // Check today list
    taskIndex = this.data.today.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      task = this.data.today[taskIndex];
      listName = 'today';
    } else {
      // Check tomorrow list
      taskIndex = this.data.tomorrow.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        task = this.data.tomorrow[taskIndex];
        listName = 'tomorrow';
      }
    }

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
    if (this.devMode) {
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

  // Long press detection
  startLongPress(id, event) {
    // Store the event type to handle mobile differently
    const isTouchEvent = event.type === 'touchstart';

    if (this.devMode) {
      console.log('⏱️ LONG PRESS START:', {
        taskId: id,
        isTouchEvent,
        isScrolling: this.isScrolling,
        currentlyEditing: this.editingTask
      });
    }

    this.longPressTimer = setTimeout(() => {
      if (this.devMode) {
        console.log('⏱️ LONG PRESS TIMER FIRED:', {
          taskId: id,
          isScrolling: this.isScrolling,
          willBlock: this.isScrolling
        });
      }

      // No scroll blocking - let long press work naturally

      // Only prevent default when actually entering edit mode
      if (isTouchEvent && event.cancelable) {
        event.preventDefault();
      }

      if (this.devMode) {
        console.log('✏️ ENTERING EDIT MODE:', { taskId: id });
      }

      // If already editing a different task, cancel that first and wait
      if (this.editingTask && this.editingTask !== id) {
        if (this.devMode) {
          console.log('🔄 SWITCHING EDIT MODE:', { from: this.editingTask, to: id });
        }
        this.cancelEdit();
        // Small delay to ensure DOM is cleaned up
        setTimeout(() => {
          this.enterEditMode(id);
        }, 10);
        return;
      }

      this.enterEditMode(id);
      this.wasLongPress = true;
    }, 300); // 300ms for long press (shorter to reduce accidental triggers)
  }

  endLongPress() {
    if (this.longPressTimer) {
      if (this.devMode) {
        console.log('❌ LONG PRESS CANCELLED');
      }
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
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
    let actualTask = null;

    // Check today list
    let taskIndex = this.data.today.findIndex(t => t.id === this.editingTask);
    if (taskIndex !== -1) {
      actualTask = this.data.today[taskIndex];
    } else {
      // Check tomorrow list
      taskIndex = this.data.tomorrow.findIndex(t => t.id === this.editingTask);
      if (taskIndex !== -1) {
        actualTask = this.data.tomorrow[taskIndex];
      }
    }

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
        if (this.devMode) {
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
      const fromIndex = this.data[fromList].findIndex(task => task.id === id);
      if (fromIndex === -1) return false;

      const task = this.data[fromList].splice(fromIndex, 1)[0];
      this.data[toList].push(task);
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
    const todayTask = this.data.today.find(task => task.id === id);
    if (todayTask) {
      return { ...todayTask, list: 'today' };
    }

    const tomorrowTask = this.data.tomorrow.find(task => task.id === id);
    if (tomorrowTask) {
      return { ...tomorrowTask, list: 'tomorrow' };
    }

    return null;
  }

  // Delete task (not in requirements but useful for cleanup)
  deleteTask(id) {
    let found = false;

    // Check today list
    const todayIndex = this.data.today.findIndex(task => task.id === id);
    if (todayIndex !== -1) {
      this.data.today.splice(todayIndex, 1);
      found = true;
    }

    // Check tomorrow list
    const tomorrowIndex = this.data.tomorrow.findIndex(task => task.id === id);
    if (tomorrowIndex !== -1) {
      this.data.tomorrow.splice(tomorrowIndex, 1);
      found = true;
    }

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
        const importedData = await Sync.importFromFile(file);

        // Merge with existing data
        const shouldReplace = confirm(
          'Replace your current tasks with imported data?\n\n' +
          'Click OK to replace everything, or Cancel to merge with existing tasks.'
        );

        if (shouldReplace) {
          this.data = importedData;
        } else {
          // Merge: add imported tasks to existing ones (avoid duplicates)
          this.data.today.push(...importedData.today.filter(task =>
            !this.data.today.some(existing => existing.text === task.text)
          ));
          this.data.tomorrow.push(...importedData.tomorrow.filter(task =>
            !this.data.tomorrow.some(existing => existing.text === task.text)
          ));
          this.data.totalCompleted = Math.max(this.data.totalCompleted, importedData.totalCompleted);
        }

        this.save();
        this.render();
        this.showNotification(`Imported ${importedData.today.length + importedData.tomorrow.length} tasks`, 'success');

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
        // Read from clipboard
        const clipboardText = await navigator.clipboard.readText();

        if (!clipboardText.trim()) {
          this.showNotification('Clipboard is empty', 'error');
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

        // Merge with existing data
        const shouldReplace = confirm(
          'Replace your current tasks with clipboard data?\n\n' +
          'Click OK to replace everything, or Cancel to merge with existing tasks.'
        );

        if (shouldReplace) {
          this.data = importedData;
        } else {
          // Merge: add imported tasks to existing ones (avoid duplicates)
          this.data.today.push(...importedData.today.filter(task =>
            !this.data.today.some(existing => existing.text === task.text)
          ));
          this.data.tomorrow.push(...importedData.tomorrow.filter(task =>
            !this.data.tomorrow.some(existing => existing.text === task.text)
          ));
          this.data.totalCompleted = Math.max(this.data.totalCompleted, importedData.totalCompleted);
        }

        this.save();
        this.render();
        this.showNotification(`Imported ${importedData.today.length + importedData.tomorrow.length} tasks from clipboard`, 'success');

      } catch (error) {
        this.showNotification(`Import failed: ${error.message}`, 'error');
      }
    });

    // QR Code functionality
    qrBtn.addEventListener('click', () => {
      this.showQRModal();
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
      this.handleDevModeActivation();
    });
  }

  // Handle secret dev mode activation (7 taps within 3 seconds)
  handleDevModeActivation() {
    this.devTapCount++;

    // Reset counter if too much time has passed
    if (this.devTapTimer) {
      clearTimeout(this.devTapTimer);
    }

    this.devTapTimer = setTimeout(() => {
      this.devTapCount = 0;
    }, 3000);

    // Activate dev mode after 7 taps
    if (this.devTapCount >= 7 && !this.devMode) {
      this.devMode = true;
      console.log('Dev mode activated! Logging is now available.');
      this.updateDevModeUI(); // Update dev mode UI immediately

      // Show notification and fallback alert for mobile
      this.showNotification('🔧 Dev Mode Activated', 'success');
      setTimeout(() => {
        if (!document.querySelector('.dev-mode-btn')) {
          alert('Dev Mode Activated! Check console logs and look for new buttons.');
        }
      }, 1000);
    }
  }

  // Export logs as downloadable file
  exportLogs() {
    const logsText = this.logs.map(log =>
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');

    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `do-it-later-logs-${new Date().toISOString().slice(0,19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification('Logs exported successfully', 'success');
  }

  // Exit dev mode
  exitDevMode() {
    this.devMode = false;
    this.showNotification('Dev Mode Disabled', 'info');
    this.updateDevModeUI(); // Update dev mode UI
  }

  // Clear browser cache and reload
  async clearCache() {
    try {
      // Clear localStorage (but preserve user data)
      const userData = localStorage.getItem('do-it-later-data');
      const userTheme = localStorage.getItem('theme');

      // Clear all localStorage
      localStorage.clear();

      // Restore user data
      if (userData) localStorage.setItem('do-it-later-data', userData);
      if (userTheme) localStorage.setItem('theme', userTheme);

      // Clear service worker cache if available
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('Unregistering service worker...');
          await registration.unregister();
        }
      }

      // Clear cache API if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('Clearing caches:', cacheNames);
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      this.showNotification('Cache cleared! Reloading...', 'success');

      // Force reload with cache bypass
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);

    } catch (error) {
      console.error('Cache clear error:', error);
      this.showNotification('Cache clear failed. Try manual refresh (Ctrl+F5)', 'error');
    }
  }

  // Update dev mode UI elements
  updateDevModeUI() {
    console.log('updateDevModeUI called, devMode:', this.devMode);
    const syncControls = document.querySelector('.sync-controls');
    const headerTop = document.querySelector('.header-top');

    console.log('syncControls found:', !!syncControls);
    console.log('headerTop found:', !!headerTop);

    // Remove existing dev mode buttons
    document.querySelectorAll('.dev-mode-btn').forEach(btn => btn.remove());

    if (this.devMode) {
      // Add export logs button to sync controls
      if (syncControls) {
        const exportLogsBtn = document.createElement('button');
        exportLogsBtn.className = 'sync-btn dev-mode-btn';
        exportLogsBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3z"/>
            <path d="M4 6h8M4 8h8M4 10h6" stroke="white" stroke-width="1"/>
          </svg>
          Export Logs
        `;
        exportLogsBtn.addEventListener('click', () => this.exportLogs());
        syncControls.appendChild(exportLogsBtn);
        console.log('Export logs button added to sync controls');

        // Add clear cache button
        const clearCacheBtn = document.createElement('button');
        clearCacheBtn.className = 'sync-btn dev-mode-btn';
        clearCacheBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          Clear Cache
        `;
        clearCacheBtn.addEventListener('click', () => this.clearCache());
        syncControls.appendChild(clearCacheBtn);
        console.log('Clear cache button added to sync controls');
      } else {
        console.error('Could not find sync controls element');
      }

      // Add exit dev mode button to header
      if (headerTop) {
        const exitDevBtn = document.createElement('button');
        exitDevBtn.className = 'dev-mode-btn';
        exitDevBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
          </svg>
        `;
        exitDevBtn.title = 'Exit Dev Mode';
        exitDevBtn.style.cssText = `
          background: rgba(220, 38, 38, 0.2);
          border: 1px solid rgba(220, 38, 38, 0.4);
          color: #dc2626;
          border-radius: 4px;
          padding: 0.25rem;
          cursor: pointer;
          margin-left: 0.5rem;
        `;
        exitDevBtn.addEventListener('click', () => this.exitDevMode());
        headerTop.appendChild(exitDevBtn);
        console.log('Exit dev mode button added to header');
      } else {
        console.error('Could not find header-top element');
      }
    }
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

  // Show QR code modal with actual QR generation and scanning
  showQRModal() {
    const qrData = Sync.generateQRData(this.data);

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
      max-width: 90%;
      max-height: 90vh;
      overflow: auto;
      text-align: center;
      color: var(--text);
    `;

    content.innerHTML = `
      <button class="qr-close" id="close-modal" aria-label="Close modal">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
        </svg>
      </button>

      <h3 class="qr-modal-title">QR Sync</h3>

      <div class="qr-tabs">
        <button id="share-tab" class="qr-tab active">Share</button>
        <button id="scan-tab" class="qr-tab">Scan</button>
      </div>

      <!-- Share Panel -->
      <div id="share-panel" class="qr-panel">
        <div class="qr-container">
          <div id="qr-code" class="qr-code-display">
            <div class="qr-loading">Generating QR code...</div>
          </div>
        </div>
        <p class="qr-stats">
          ${this.data.today.length + this.data.tomorrow.length} tasks
        </p>
      </div>

      <!-- Scan Panel -->
      <div id="scan-panel" class="qr-panel qr-panel-hidden">
        <div class="camera-controls">
          <button id="start-camera" class="sync-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M15 12V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586L9.828 2.828A2 2 0 0 0 8.414 2H7.586a2 2 0 0 0-1.414.586L5.586 3.172A2 2 0 0 1 4.172 4H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2zM8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>
            Start Camera
          </button>
          <button id="stop-camera" class="sync-btn" style="display: none;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="12" rx="2"/>
            </svg>
            Stop Camera
          </button>
        </div>

        <div id="camera-area" class="camera-area" style="display: none;">
          <div class="camera-container">
            <video id="camera-preview" autoplay playsinline class="camera-preview"></video>
            <div class="scan-overlay">
              <div class="scan-corner scan-corner-tl"></div>
              <div class="scan-corner scan-corner-tr"></div>
              <div class="scan-corner scan-corner-bl"></div>
              <div class="scan-corner scan-corner-br"></div>
            </div>
          </div>
          <p id="scan-status" class="scan-status">
            Point camera at QR code and hold steady
          </p>
        </div>

        <div id="scan-result" class="scan-result" style="display: none;">
          <div class="scan-success">
            QR Code Detected
          </div>
          <p id="scan-data-preview" class="scan-preview"></p>
          <div class="scan-actions">
            <button id="import-scanned" class="sync-btn">Import Tasks</button>
            <button id="scan-again" class="sync-btn">Scan Again</button>
          </div>
        </div>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // QR tab styles are now handled in main.css

    // Generate QR code with multiple fallbacks
    this.generateQRCode(qrData);

    // Tab switching
    const shareTab = content.querySelector('#share-tab');
    const scanTab = content.querySelector('#scan-tab');
    const sharePanel = content.querySelector('#share-panel');
    const scanPanel = content.querySelector('#scan-panel');

    shareTab.addEventListener('click', () => {
      shareTab.classList.add('active');
      scanTab.classList.remove('active');
      sharePanel.classList.remove('qr-panel-hidden');
      scanPanel.classList.add('qr-panel-hidden');
    });

    scanTab.addEventListener('click', () => {
      scanTab.classList.add('active');
      shareTab.classList.remove('active');
      sharePanel.classList.add('qr-panel-hidden');
      scanPanel.classList.remove('qr-panel-hidden');
    });

    // Camera scanning functionality
    let currentScanner = null;
    let scannedData = null;

    const startCameraBtn = content.querySelector('#start-camera');
    const stopCameraBtn = content.querySelector('#stop-camera');
    const cameraArea = content.querySelector('#camera-area');
    const scanStatus = content.querySelector('#scan-status');
    const scanResult = content.querySelector('#scan-result');
    const importScannedBtn = content.querySelector('#import-scanned');
    const scanAgainBtn = content.querySelector('#scan-again');

    // Start camera scanning
    startCameraBtn.addEventListener('click', async () => {
      try {
        const video = content.querySelector('#camera-preview');
        currentScanner = new QRScanner();

        await currentScanner.init(
          video,
          (data) => {
            // QR code scanned successfully
            scannedData = data;
            this.handleQRScanSuccess(data, scanResult, scanStatus);
          },
          (error) => {
            scanStatus.textContent = `Error: ${error}`;
            scanStatus.style.color = 'var(--error-color, #ff6b6b)';
          }
        );

        currentScanner.startScanning();

        // Update UI
        cameraArea.style.display = 'block';
        startCameraBtn.style.display = 'none';
        stopCameraBtn.style.display = 'inline-flex';
        scanStatus.textContent = 'Scanning for QR codes...';
        scanStatus.style.color = 'var(--text-muted)';

      } catch (error) {
        console.error('Camera error:', error);
        scanStatus.textContent = `Camera access failed: ${error.message}`;
        scanStatus.style.color = 'var(--error-color, #ff6b6b)';
      }
    });

    // Stop camera scanning
    stopCameraBtn.addEventListener('click', () => {
      if (currentScanner) {
        currentScanner.stopScanning();
        currentScanner = null;
      }

      cameraArea.classList.add('camera-area-hidden');
      scanResult.style.display = 'none';
      startCameraBtn.style.display = 'inline-block';
      stopCameraBtn.style.display = 'none';
      scannedData = null;
    });

    // Import scanned data
    importScannedBtn.addEventListener('click', () => {
      if (!scannedData) {
        this.showNotification('No scanned data available', 'error');
        return;
      }

      this.importQRData(scannedData, modal, null);
    });

    // Scan again
    scanAgainBtn.addEventListener('click', () => {
      scanResult.style.display = 'none';
      scanStatus.textContent = 'Scanning for QR codes...';
      scanStatus.style.color = 'var(--text-muted)';
      scannedData = null;

      if (currentScanner) {
        currentScanner.startScanning();
      }
    });

    // Close modal handlers
    const closeModal = () => {
      // Cleanup camera if active
      if (currentScanner) {
        currentScanner.stopScanning();
      }
      document.body.removeChild(modal);
      document.head.removeChild(style);
    };

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    content.querySelector('#close-modal').addEventListener('click', closeModal);
  }

  // QR Code generation with fallbacks
  generateQRCode(data) {
    const qrElement = document.getElementById('qr-code');
    if (!qrElement) return;

    // Method 1: Try local QRCode library
    setTimeout(() => {
      try {
        qrElement.innerHTML = '';

        if (typeof QRCode !== 'undefined') {
          const qr = new QRCode(qrElement, {
            text: data,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
          });

          // Clean up the QR code display - remove any extra elements and padding
          setTimeout(() => {
            const qrImg = qrElement.querySelector('img');
            const qrCanvas = qrElement.querySelector('canvas');
            const qrTable = qrElement.querySelector('table');

            // Remove all existing content and styling
            qrElement.style.padding = '0';
            qrElement.style.margin = '0';
            qrElement.style.background = 'transparent';

            if (qrImg) {
              // Clean image-based QR codes
              qrElement.innerHTML = '';
              qrImg.style.cssText = 'display: block; margin: 0; padding: 0; width: 200px; height: 200px;';
              qrElement.appendChild(qrImg);
            } else if (qrCanvas) {
              // Clean canvas-based QR codes
              qrElement.innerHTML = '';
              qrCanvas.style.cssText = 'display: block; margin: 0; padding: 0; width: 200px; height: 200px;';
              qrElement.appendChild(qrCanvas);
            } else if (qrTable) {
              // Clean table-based QR codes (older browsers)
              qrElement.innerHTML = '';
              qrTable.style.cssText = 'margin: 0; padding: 0; border-collapse: collapse; width: 200px; height: 200px;';
              qrElement.appendChild(qrTable);
            }
          }, 100);

          console.log('QR generated with local library');
          return;
        }
        throw new Error('Local QRCode library not available');

      } catch (error) {
        console.log('Local QR generation failed:', error.message);
        this.generateQRCodeFallback(data);
      }
    }, 100);
  }

  // Fallback QR generation methods
  generateQRCodeFallback(data) {
    const qrElement = document.getElementById('qr-code');
    if (!qrElement) return;

    // Method 2: Online QR service
    try {
      const encodedData = encodeURIComponent(data);
      const maxUrlLength = 2048; // URL length limit

      if (encodedData.length > maxUrlLength) {
        throw new Error('Data too large for online QR service');
      }

      const img = document.createElement('img');
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`;
      img.style.cssText = 'width: 200px; height: 200px; border-radius: 4px;';
      img.onload = () => console.log('QR generated with online service');
      img.onerror = () => {
        qrElement.innerHTML = this.getManualQRFallback(data);
      };
      qrElement.innerHTML = '';
      qrElement.appendChild(img);

    } catch (error) {
      console.log('Online QR generation failed:', error.message);
      qrElement.innerHTML = this.getManualQRFallback(data);
    }
  }

  // Final fallback: Manual copy option
  getManualQRFallback(data) {
    const div = document.createElement('div');
    div.style.cssText = 'width: 200px; height: 200px; background: #f8f9fa; border: 2px dashed #dee2e6; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 1rem; color: #666;';

    const title = document.createElement('div');
    title.textContent = '📋 Manual Copy';
    title.style.cssText = 'font-size: 0.9rem; margin-bottom: 0.5rem;';

    const button = document.createElement('button');
    button.textContent = 'Copy Data';
    button.style.cssText = 'padding: 0.5rem; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;';
    button.onclick = () => {
      navigator.clipboard.writeText(data).then(() => {
        alert('Copied to clipboard!');
      }).catch(() => {
        prompt('Copy this data:', data);
      });
    };

    const subtitle = document.createElement('div');
    subtitle.textContent = 'Click to copy sync data';
    subtitle.style.cssText = 'font-size: 0.7rem; margin-top: 0.5rem; opacity: 0.7;';

    div.appendChild(title);
    div.appendChild(button);
    div.appendChild(subtitle);

    return div.outerHTML;
  }

  // Handle successful QR scan
  handleQRScanSuccess(data, scanResult, scanStatus) {
    try {
      // Validate the QR data
      const parsedData = Sync.parseQRData(data);
      const taskCount = parsedData.today.length + parsedData.tomorrow.length;

      // Show scan result
      scanResult.style.display = 'block';
      const preview = scanResult.querySelector('#scan-data-preview');
      preview.textContent = `Found ${taskCount} tasks to import (${parsedData.totalCompleted} completed lifetime)`;

      scanStatus.textContent = 'QR code scanned successfully!';
      scanStatus.style.color = 'var(--success-color)';

    } catch (error) {
      console.error('QR validation error:', error);
      scanStatus.textContent = `Invalid QR code: ${error.message}`;
      scanStatus.style.color = 'var(--error-color, #ff6b6b)';
    }
  }

  // Import QR data with confirmation
  importQRData(qrData, modal, style) {
    try {
      const importedData = Sync.parseQRData(qrData);

      const shouldReplace = confirm(
        'Replace your current tasks with scanned data?\n\n' +
        'Click OK to replace everything, or Cancel to merge with existing tasks.'
      );

      if (shouldReplace) {
        this.data = importedData;
      } else {
        // Merge: add imported tasks to existing ones
        this.data.today.push(...importedData.today);
        this.data.tomorrow.push(...importedData.tomorrow);
        this.data.totalCompleted = Math.max(this.data.totalCompleted, importedData.totalCompleted);
      }

      this.save();
      this.render();
      this.showNotification(`Imported ${importedData.today.length + importedData.tomorrow.length} tasks from QR scan`, 'success');

      // Close modal
      document.body.removeChild(modal);
      if (style) {
        document.head.removeChild(style);
      }

    } catch (error) {
      console.error('QR import error:', error);
      this.showNotification(`Invalid QR data: ${error.message}`, 'error');
    }
  }

  // Removed detectTextOverflow function
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new DoItTomorrowApp();
});
