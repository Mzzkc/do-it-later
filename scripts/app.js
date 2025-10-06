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

    // Pomodoro timer state
    this.pomodoroState = {
      isActive: false,
      taskId: null,
      timeRemaining: 0, // in seconds
      intervalId: null,
      roundCount: 0
    };

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
      // New day detected - perform daily cleanup
      const completedToday = this.data.today.filter(task => task.completed).length;
      const completedLater = this.data.tomorrow.filter(task => task.completed).length;

      // Remove completed tasks from Today
      this.data.today = this.data.today.filter(task => !task.completed);

      // Remove completed tasks from Later, but keep incomplete ones there
      const incompleteLaterTasks = this.data.tomorrow.filter(task => !task.completed);

      // Check for week-old Later tasks (7+ days old) and move them to Today
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoTimestamp = weekAgo.getTime();

      const weekOldTasks = [];
      const remainingLaterTasks = [];

      incompleteLaterTasks.forEach(task => {
        const taskAge = task.createdAt || Date.now(); // Fallback for tasks without timestamp
        if (taskAge < weekAgoTimestamp) {
          // Task is 7+ days old, move to Today
          weekOldTasks.push(task);
        } else {
          // Keep in Later
          remainingLaterTasks.push(task);
        }
      });

      // Add week-old tasks to Today
      this.data.today.push(...weekOldTasks);

      // Update Later list with remaining tasks
      this.data.tomorrow = remainingLaterTasks;

      // Check deadlines on all tasks
      const allTasks = [...this.data.today, ...this.data.tomorrow];
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
            const laterIndex = this.data.tomorrow.findIndex(t => t.id === task.id);
            if (laterIndex !== -1) {
              this.data.tomorrow.splice(laterIndex, 1);
              this.data.today.push(task);
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
      if (weekOldTasks.length > 0) {
        notificationParts.push(`${weekOldTasks.length} week-old tasks moved to Today`);
      }
      if (deadlineTasksMoved > 0) {
        notificationParts.push(`${deadlineTasksMoved} deadline tasks moved to Today`);
      }
      if (tasksMarkedImportant > 0) {
        notificationParts.push(`${tasksMarkedImportant} tasks marked important (deadline approaching)`);
      }

      // Log cleanup for dev mode
      if (this.devMode && (completedToday > 0 || completedLater > 0 || weekOldTasks.length > 0 || deadlineTasksMoved > 0 || tasksMarkedImportant > 0)) {
        console.log(`🗑️ Daily cleanup: Removed ${completedToday + completedLater} completed tasks, moved ${weekOldTasks.length} week-old tasks to Today, moved ${deadlineTasksMoved} deadline tasks, marked ${tasksMarkedImportant} tasks important`);
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
    console.log(`🐛 [RENDER] renderList called for ${listName}`, {
      totalTasks: tasks.length,
      importantCount: tasks.filter(t => t.important).length,
      tasks: tasks.map(t => ({ id: t.id, text: t.text.substring(0, 20), important: t.important, completed: t.completed }))
    });

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

    // Filter to only show top-level tasks (no parentId)
    const topLevelTasks = tasks.filter(task => !task.parentId);
    console.log(`🐛 [RENDER] Top-level tasks for ${listName}:`, topLevelTasks.length);

    topLevelTasks.forEach((task, index) => {
      const li = document.createElement('li');
      // Phase 3: Add importance class for visual gradient effects
      const classes = ['task-item'];
      if (task.completed) classes.push('completed');
      if (task.important) {
        classes.push('important');
        console.log(`🐛 [RENDER] Adding 'important' class to task ${index}:`, {
          id: task.id,
          text: task.text.substring(0, 30),
          classes: classes.join(' ')
        });
      }

      li.className = classes.join(' ');
      li.setAttribute('data-task-id', task.id);

      console.log(`🐛 [RENDER] Task ${index} element:`, {
        id: task.id,
        className: li.className,
        important: task.important
      });

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

      li.addEventListener('touchmove', (e) => {
        if (taskStartX !== undefined && taskStartY !== undefined) {
          const currentX = e.touches[0].clientX;
          const currentY = e.touches[0].clientY;
          const deltaX = Math.abs(currentX - taskStartX);
          const deltaY = Math.abs(currentY - taskStartY);

          // If we detect scrolling movement, cancel long press
          if (deltaY > 15 || deltaX > 15) {
            if (this.devMode) {
              console.log('📱 CANCELLING LONG PRESS: Scroll detected', {
                taskId: task.id,
                deltaX,
                deltaY
              });
            }
            li.classList.remove('button-pressed');
            this.endLongPress();
          }
        }
      }, { passive: true });

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

      // Check if task has children
      const children = this.getChildren(task.id, listName);
      const hasChildren = children.length > 0;

      // Add expand/collapse icon if has children
      const expandIcon = hasChildren ?
        `<span class="expand-icon" data-task-id="${task.id}">${task.isExpanded ? '▼' : '▶'}</span>` : '';

      li.innerHTML = expandIcon + this.getTaskHTML(task, listName);
      listEl.appendChild(li);

      // Add expand/collapse click handler
      if (hasChildren) {
        const expandBtn = li.querySelector('.expand-icon');
        if (expandBtn) {
          expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSubtaskExpansion(task.id);
          });
        }
      }

      // Render subtasks if this task has children
      if (children.length > 0) {
        const subtaskContainer = document.createElement('ul');
        subtaskContainer.className = 'subtask-list';
        subtaskContainer.style.display = task.isExpanded ? 'block' : 'none';

        // Sort and render children
        const sortedChildren = this.sortTasks(children);
        sortedChildren.forEach(childTask => {
          const childLi = document.createElement('li');
          childLi.className = 'subtask-item task-item';
          if (childTask.completed) childLi.classList.add('completed');
          if (childTask.important) childLi.classList.add('important');
          childLi.setAttribute('data-task-id', childTask.id);
          childLi.setAttribute('data-parent-id', task.id);
          childLi.innerHTML = this.getTaskHTML(childTask, listName);

          // Add click handler for subtask completion
          childLi.addEventListener('click', (e) => {
            if (!e.target.closest('.move-icon')) {
              this.completeTask(childTask.id, e);
            }
          });

          subtaskContainer.appendChild(childLi);
        });

        listEl.appendChild(subtaskContainer);
      }

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

    // Deadline display
    let deadlineHTML = '';
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);

      const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

      let deadlineClass = 'deadline-indicator';
      let deadlineText = '';

      if (daysUntil < 0) {
        deadlineClass += ' overdue';
        deadlineText = `Overdue ${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? 'day' : 'days'}`;
      } else if (daysUntil === 0) {
        deadlineClass += ' today';
        deadlineText = 'Due today';
      } else if (daysUntil === 1) {
        deadlineClass += ' tomorrow';
        deadlineText = 'Due tomorrow';
      } else if (daysUntil <= 3) {
        deadlineClass += ' soon';
        deadlineText = `Due in ${daysUntil} days`;
      } else {
        deadlineText = `Due ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }

      deadlineHTML = `<span class="${deadlineClass}" title="${deadlineDate.toLocaleDateString()}">${deadlineText}</span>`;
    }

    return `
      <span class="task-text">${this.escapeHtml(task.text)}${deadlineHTML}</span>
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
      // Phase 4: Sort tasks before rendering
      const sortedToday = this.sortTasks([...this.data.today]);
      const sortedTomorrow = this.sortTasks([...this.data.tomorrow]);

      this.renderList('today', sortedToday);
      this.renderList('tomorrow', sortedTomorrow);

      if (this.devMode) {
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

      // Check if parent should auto-complete
      if (task.parentId) {
        this.checkParentCompletion(task.parentId, listName);
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

    if (this.devMode) {
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

    const taskInfo = this.findTask(taskId);
    console.log('🐛 [IMPORTANT] findTask result:', taskInfo);

    if (!taskInfo) {
      console.error('🐛 [IMPORTANT] Task not found!');
      return;
    }

    const task = taskInfo.task;
    const wasImportant = task.important;
    task.important = !task.important;

    console.log('🐛 [IMPORTANT] Toggled importance:', {
      taskId,
      text: task.text,
      wasImportant,
      nowImportant: task.important,
      taskObject: task
    });

    this.contextMenu.hide();
    this.save();

    console.log('🐛 [IMPORTANT] Saved to storage, now rendering...');

    // Phase 3: Add importance animation trigger
    if (task.important && !wasImportant) {
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

    const action = task.important ? 'marked as important' : 'importance removed';
    this.showNotification(`Task ${action}`, 'success');

    console.log('🐛 [IMPORTANT] Done with toggle, final state:', {
      taskId,
      isImportant: task.important,
      text: task.text,
      animationTriggered: task.important && !wasImportant
    });
  }

  // Handle menu set deadline action
  handleMenuSetDeadline(taskId) {
    this.contextMenu.hide();
    setTimeout(() => this.showDeadlinePicker(taskId), 50);
  }

  // Handle menu start pomodoro action
  handleMenuStartPomodoro(taskId) {
    this.contextMenu.hide();
    setTimeout(() => this.startPomodoro(taskId), 50);
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

      // Handle subtask movement
      if (task.parentId) {
        const originalParentId = task.parentId; // Store original parent ID before modification

        // Find or create parent in target list
        let parent = this.data[toList].find(t => t.id === task.parentId);
        if (!parent) {
          // Parent doesn't exist in target list, create it
          const sourceParent = this.data[fromList].find(t => t.id === task.parentId);
          if (sourceParent) {
            parent = { ...sourceParent, id: this.generateId(), parentId: null };
            this.data[toList].push(parent);
          }
        }
        // Update subtask's parentId to new parent
        if (parent) {
          task.parentId = parent.id;
        }

        // Check if source parent is now empty (use original parent ID)
        const sourceParent = this.data[fromList].find(t => t.id === originalParentId);
        if (sourceParent) {
          const remainingChildren = this.data[fromList].filter(t => t.parentId === sourceParent.id);
          if (remainingChildren.length === 0) {
            // Remove empty parent
            const parentIndex = this.data[fromList].findIndex(t => t.id === sourceParent.id);
            if (parentIndex !== -1) {
              this.data[fromList].splice(parentIndex, 1);
            }
          }
        }
      }

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

  // Reset completed task count (dev mode only)
  resetCompletedCount() {
    if (!this.devMode) return;

    const oldCount = this.data.totalCompleted || 0;
    this.data.totalCompleted = 0;
    this.save();
    this.updateCompletedCounter();
    this.showNotification(`Reset completed count from ${oldCount} to 0`, 'success');

    if (this.devMode) {
      console.log(`🔧 DEV: Reset completed count from ${oldCount} to 0`);
    }
  }

  // Test important tasks feature (dev mode only)
  testImportantTasks() {
    if (!this.devMode) return;

    console.log('🧪 Testing important tasks feature - Phase 4 List Sorting + Visual Effects...');

    // Add test tasks with visual gradient effects and sorting demonstration
    const testTasks = [
      {
        id: this.generateId(),
        text: '📅 Normal task added first',
        completed: false,
        important: false,
        createdAt: Date.now() - 300000 // 5 minutes ago
      },
      {
        id: this.generateId(),
        text: '⭐ Important: High priority task',
        completed: false,
        important: true,
        createdAt: Date.now() - 200000 // 3+ minutes ago
      },
      {
        id: this.generateId(),
        text: '🔥 Important: Most recent urgent task',
        completed: false,
        important: true,
        createdAt: Date.now() - 100000 // 1+ minutes ago
      },
      {
        id: this.generateId(),
        text: '📅 Another normal task',
        completed: false,
        important: false,
        createdAt: Date.now() - 50000 // 50 seconds ago
      },
      {
        id: this.generateId(),
        text: '✅ Completed important task',
        completed: true,
        important: true,
        createdAt: Date.now() - 400000 // 6+ minutes ago
      },
      {
        id: this.generateId(),
        text: '✅ Completed normal task',
        completed: true,
        important: false,
        createdAt: Date.now() - 250000 // 4+ minutes ago
      }
    ];

    // Add to both lists for comprehensive sorting testing
    this.data.today.push(...testTasks.slice(0, 3));
    this.data.tomorrow.push(...testTasks.slice(3));
    this.save();
    this.render();

    // Test QR generation
    const qrData = Sync.generateQRData(this.data);
    console.log('📱 QR Data with important task:', qrData);

    // Test parsing the QR data back
    try {
      const parsed = Sync.parseQRData(qrData);
      console.log('✅ Parsed QR data:', parsed);
      console.log('🎯 Important task preserved:', parsed.tomorrow.find(t => t.important));
    } catch (error) {
      console.error('❌ QR parsing failed:', error);
    }

    this.showNotification('Important tasks test completed - check console', 'info');
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

        // Add reset completed count button
        const resetCountBtn = document.createElement('button');
        resetCountBtn.className = 'sync-btn dev-mode-btn';
        resetCountBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          Reset Count
        `;
        resetCountBtn.addEventListener('click', () => this.resetCompletedCount());
        syncControls.appendChild(resetCountBtn);
        console.log('Reset completed count button added to sync controls');

        // Add test important tasks button
        const testImportantBtn = document.createElement('button');
        testImportantBtn.className = 'sync-btn dev-mode-btn';
        testImportantBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2z"/>
          </svg>
          Test Important
        `;
        testImportantBtn.addEventListener('click', () => this.testImportantTasks());
        syncControls.appendChild(testImportantBtn);
        console.log('Test important tasks button added to sync controls');
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

  // Show deadline picker dialog
  showDeadlinePicker(taskId) {
    const taskInfo = this.findTask(taskId);
    if (!taskInfo) return;

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'deadline-modal';
    modal.style.cssText = `
      background: var(--surface);
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    // Get current deadline or default to tomorrow
    const currentDeadline = taskInfo.deadline || '';
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1); // Minimum is tomorrow
    const minDateStr = minDate.toISOString().split('T')[0];

    modal.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: var(--text);">Set Deadline</h3>
      <p style="margin: 0 0 16px 0; color: var(--text-muted); font-size: 0.9rem;">
        Task will be marked important 3 days before and moved to Today on the deadline date.
      </p>
      <input type="date" id="deadline-input" value="${currentDeadline}" min="${minDateStr}"
        style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 6px;
        background: var(--background); color: var(--text); font-size: 1rem; margin-bottom: 16px;">
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        ${currentDeadline ? '<button id="remove-deadline-btn" style="padding: 10px 20px; border: 1px solid #dc2626; background: transparent; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Remove</button>' : ''}
        <button id="cancel-deadline-btn" style="padding: 10px 20px; border: 1px solid var(--border); background: transparent; color: var(--text); border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Cancel</button>
        <button id="set-deadline-btn" style="padding: 10px 20px; border: none; background: var(--primary-color); color: white; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Set Deadline</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const input = modal.querySelector('#deadline-input');
    const setBtn = modal.querySelector('#set-deadline-btn');
    const cancelBtn = modal.querySelector('#cancel-deadline-btn');
    const removeBtn = modal.querySelector('#remove-deadline-btn');

    // Focus input
    setTimeout(() => input.focus(), 100);

    // Set deadline
    setBtn.addEventListener('click', () => {
      const deadline = input.value;
      if (deadline) {
        this.setTaskDeadline(taskId, deadline);
        backdrop.remove();
      }
    });

    // Cancel
    cancelBtn.addEventListener('click', () => {
      backdrop.remove();
    });

    // Remove deadline
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        this.setTaskDeadline(taskId, null);
        backdrop.remove();
      });
    }

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
      }
    });

    // Close on escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        backdrop.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // Set task deadline
  setTaskDeadline(taskId, deadline) {
    // Find the actual task object to update
    let actualTask = null;
    let taskIndex = this.data.today.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      actualTask = this.data.today[taskIndex];
    } else {
      taskIndex = this.data.tomorrow.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        actualTask = this.data.tomorrow[taskIndex];
      }
    }

    if (!actualTask) return;

    if (deadline) {
      actualTask.deadline = deadline;
      this.showNotification(`Deadline set for ${new Date(deadline).toLocaleDateString()}`, Config.NOTIFICATION_TYPES.SUCCESS);
    } else {
      delete actualTask.deadline;
      // Don't auto-remove importance when removing deadline
      this.showNotification('Deadline removed', Config.NOTIFICATION_TYPES.SUCCESS);
    }

    this.save();
    this.render();
  }

  // Start pomodoro timer for a task
  startPomodoro(taskId) {
    console.log('🐛 [POMODORO] startPomodoro called', { taskId });

    const taskInfo = this.findTask(taskId);
    console.log('🐛 [POMODORO] Task info:', taskInfo);

    if (!taskInfo) {
      console.error('🐛 [POMODORO] Task not found!');
      return;
    }

    // Stop existing timer if any
    console.log('🐛 [POMODORO] Stopping any existing timer...');
    this.stopPomodoro();

    // Initialize timer
    this.pomodoroState = {
      isActive: true,
      taskId: taskId,
      timeRemaining: Config.POMODORO_WORK_MINUTES * 60,
      intervalId: null,
      roundCount: 1
    };

    console.log('🐛 [POMODORO] Initialized state:', {
      isActive: this.pomodoroState.isActive,
      taskId: this.pomodoroState.taskId,
      timeRemaining: this.pomodoroState.timeRemaining,
      workMinutes: Config.POMODORO_WORK_MINUTES,
      roundCount: this.pomodoroState.roundCount
    });

    // Start countdown
    console.log('🐛 [POMODORO] Setting up interval...');
    this.pomodoroState.intervalId = setInterval(() => this.tickPomodoro(), 1000);
    console.log('🐛 [POMODORO] Interval ID:', this.pomodoroState.intervalId);

    // Show timer UI
    console.log('🐛 [POMODORO] Showing timer UI...');
    this.showPomodoroTimer();

    this.showNotification(`Pomodoro started for "${taskInfo.task.text}"`, Config.NOTIFICATION_TYPES.SUCCESS);
    console.log('🐛 [POMODORO] Pomodoro started successfully!');
  }

  // Timer tick
  tickPomodoro() {
    console.log('🐛 [POMODORO] tickPomodoro called', {
      isActive: this.pomodoroState.isActive,
      timeRemaining: this.pomodoroState.timeRemaining,
      intervalId: this.pomodoroState.intervalId
    });

    if (!this.pomodoroState.isActive) {
      console.log('🐛 [POMODORO] Timer not active, skipping tick');
      return;
    }

    this.pomodoroState.timeRemaining--;
    console.log('🐛 [POMODORO] Time remaining after decrement:', this.pomodoroState.timeRemaining);

    if (this.pomodoroState.timeRemaining <= 0) {
      // Round complete
      console.log('🐛 [POMODORO] Round complete!');
      this.handlePomodoroComplete();
    } else {
      // Update display
      console.log('🐛 [POMODORO] Updating display...');
      this.updatePomodoroDisplay();
    }
  }

  // Handle round completion
  handlePomodoroComplete() {
    // Stop interval
    if (this.pomodoroState.intervalId) {
      clearInterval(this.pomodoroState.intervalId);
      this.pomodoroState.intervalId = null;
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Show completion prompt
    this.showPomodoroCompletionPrompt();
  }

  // Show completion prompt
  showPomodoroCompletionPrompt() {
    const taskInfo = this.findTask(this.pomodoroState.taskId);
    if (!taskInfo) {
      this.stopPomodoro();
      return;
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'pomodoro-prompt-modal';
    modal.innerHTML = `
      <div class="pomodoro-prompt-content">
        <h3>Pomodoro Complete!</h3>
        <p>Round ${this.pomodoroState.roundCount} finished for:</p>
        <p class="task-name">"${Utils.escapeHtml(taskInfo.task.text)}"</p>
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
      this.completePomodoroTask();
    });

    document.getElementById('pomodoro-stop-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
      this.stopPomodoro();
    });

    document.getElementById('pomodoro-continue-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
      this.continuePomodoroTask();
    });
  }

  // Complete task and stop timer
  completePomodoroTask() {
    const taskId = this.pomodoroState.taskId;
    this.stopPomodoro();
    this.toggleTask(taskId);
  }

  // Stop timer
  stopPomodoro() {
    if (this.pomodoroState.intervalId) {
      clearInterval(this.pomodoroState.intervalId);
    }

    this.pomodoroState = {
      isActive: false,
      taskId: null,
      timeRemaining: 0,
      intervalId: null,
      roundCount: 0
    };

    this.hidePomodoroTimer();
  }

  // Continue with next round
  continuePomodoroTask() {
    this.pomodoroState.roundCount++;
    this.pomodoroState.timeRemaining = Config.POMODORO_WORK_MINUTES * 60;
    this.pomodoroState.intervalId = setInterval(() => this.tickPomodoro(), 1000);
    this.updatePomodoroDisplay();
  }

  // Show timer UI
  showPomodoroTimer() {
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

    console.log('🐛 [POMODORO] Updating display...');
    this.updatePomodoroDisplay();

    console.log('🐛 [POMODORO] Setting display to flex');
    timerEl.style.display = 'flex';
    console.log('🐛 [POMODORO] Timer element style:', {
      display: timerEl.style.display,
      position: window.getComputedStyle(timerEl).position,
      visibility: window.getComputedStyle(timerEl).visibility
    });
  }

  // Hide timer UI
  hidePomodoroTimer() {
    const timerEl = document.getElementById('pomodoro-timer');
    if (timerEl) {
      timerEl.style.display = 'none';
    }
  }

  // Update timer display
  updatePomodoroDisplay() {
    console.log('🐛 [POMODORO] updatePomodoroDisplay called');

    const timerEl = document.getElementById('pomodoro-timer');
    if (!timerEl) {
      console.error('🐛 [POMODORO] Timer element not found!');
      return;
    }

    const minutes = Math.floor(this.pomodoroState.timeRemaining / 60);
    const seconds = this.pomodoroState.timeRemaining % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    console.log('🐛 [POMODORO] Time display:', {
      timeRemaining: this.pomodoroState.timeRemaining,
      minutes,
      seconds,
      timeStr
    });

    const taskInfo = this.findTask(this.pomodoroState.taskId);
    const taskText = taskInfo ? taskInfo.task.text : 'Unknown task';

    console.log('🐛 [POMODORO] Task:', { taskId: this.pomodoroState.taskId, taskText });

    timerEl.innerHTML = `
      <div class="pomodoro-timer-content">
        <div class="pomodoro-timer-round">Round ${this.pomodoroState.roundCount}</div>
        <div class="pomodoro-timer-time">${timeStr}</div>
        <div class="pomodoro-timer-task">${Utils.escapeHtml(taskText)}</div>
        <button class="pomodoro-timer-stop" onclick="app.stopPomodoro()">×</button>
      </div>
    `;

    console.log('🐛 [POMODORO] Display updated successfully');
  }

  // Subtask Management Methods

  // Show dialog to add subtask
  showAddSubtaskDialog(taskId) {
    const taskInfo = this.findTask(taskId);
    if (!taskInfo) return;

    const modal = document.createElement('div');
    modal.className = 'subtask-modal';
    modal.innerHTML = `
      <div class="subtask-modal-content">
        <h3>Add Subtask</h3>
        <p>Adding subtask to: "${Utils.escapeHtml(taskInfo.text)}"</p>
        <input type="text" id="subtask-input" placeholder="Enter subtask..." maxlength="200" autocomplete="off">
        <div class="subtask-modal-actions">
          <button id="cancel-subtask-btn">Cancel</button>
          <button id="add-subtask-btn" class="primary">Add</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('subtask-input');
    input.focus();

    document.getElementById('cancel-subtask-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    const addSubtask = () => {
      const text = input.value.trim();
      if (text) {
        this.addSubtask(taskId, text);
        document.body.removeChild(modal);
      }
    };

    document.getElementById('add-subtask-btn').addEventListener('click', addSubtask);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addSubtask();
    });
  }

  // Add subtask to a task
  addSubtask(parentTaskId, text) {
    const taskInfo = this.findTask(parentTaskId);
    if (!taskInfo) return;

    // Just create a new task with parentId set
    this.addTask(text, taskInfo.list, parentTaskId);
    this.showNotification('Subtask added', Config.NOTIFICATION_TYPES.SUCCESS);
  }

  // Toggle subtask expansion
  toggleSubtaskExpansion(taskId) {
    const taskInfo = this.findTask(taskId);
    if (!taskInfo) return;

    // Find the actual task in the data array (not the copy)
    const actualTask = this.data[taskInfo.list].find(t => t.id === taskId);
    if (actualTask) {
      actualTask.isExpanded = !actualTask.isExpanded;
      this.save();
      this.render();
    }
  }

  // Get children of a task
  getChildren(parentId, listName) {
    return this.data[listName].filter(task => task.parentId === parentId);
  }

  // Check if parent should auto-complete
  checkParentCompletion(parentId, listName) {
    const children = this.getChildren(parentId, listName);
    if (children.length === 0) return;

    const allComplete = children.every(child => child.completed);
    if (allComplete) {
      const parent = this.data[listName].find(t => t.id === parentId);
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
      // Remove inline styles if they were added
      const existingStyle = document.getElementById('qr-modal-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
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

    if (this.devMode) {
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

    if (this.devMode) {
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
    this.onClose = options.onClose || (() => {});
    this.devMode = options.devMode || false;

    // Menu state
    this.isVisible = false;
    this.currentTask = null;
    this.menuElement = null;
    this.backdropElement = null;

    if (this.devMode) {
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

    if (this.devMode) {
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

    if (this.devMode) {
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
