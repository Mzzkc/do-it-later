// Do It (Later) - Task Controller Module
// Handles all task-related event handling using event delegation

/**
 * TaskController class - Manages task interaction events
 * Uses event delegation for optimal performance - one listener per list
 * Handles:
 * - Task clicks (completion/deletion)
 * - Task movement between lists
 * - Subtask expansion/collapse
 * - Touch gestures for mobile
 * - Subtask input handling
 */
class TaskController {
  /**
   * Creates a new TaskController instance
   * @param {DoItTomorrowApp} app - Reference to the main application instance
   */
  constructor(app) {
    this.app = app;
    this.touchState = new Map(); // Track touch state per element
  }

  /**
   * Bind all event listeners for a task list
   * Uses event delegation - one set of listeners per list container
   * @param {string} listName - Name of the list ('today' or 'tomorrow')
   */
  bindTaskListEvents(listName) {
    const container = document.getElementById(`${listName}-list`);
    if (!container) return;

    // Check if already bound to prevent duplicates
    if (container.dataset.eventsBound === 'true') return;
    container.dataset.eventsBound = 'true';

    // Set up delegated event handlers
    this.setupClickHandlers(container, listName);
    this.setupTouchHandlers(container, listName);
  }

  /**
   * Set up click event handlers for desktop/mouse interactions
   * @param {HTMLElement} container - List container element
   * @param {string} listName - Name of the list
   */
  setupClickHandlers(container, listName) {
    // Delegated click handler for all task interactions
    container.addEventListener('click', (e) => {
      // Handle expand/collapse icon clicks
      const expandIcon = e.target.closest('.expand-icon');
      if (expandIcon) {
        e.stopPropagation();
        const taskId = expandIcon.dataset.taskId;
        const taskElement = expandIcon.closest('[data-task-id]');
        this.app.taskManager.toggleSubtaskExpansion(taskId, taskElement);
        return;
      }

      // Handle move icon clicks
      const moveIcon = e.target.closest('.move-icon');
      if (moveIcon) {
        e.preventDefault();
        e.stopPropagation();
        const taskId = moveIcon.dataset.taskId;
        const action = moveIcon.dataset.action;
        this.handleMoveAction(taskId, action);
        return;
      }

      // Handle task item clicks (completion/deletion)
      const taskItem = e.target.closest('.task-item');
      if (taskItem && !e.target.closest('.move-icon') && !e.target.closest('.subtask-input')) {
        const taskId = taskItem.dataset.taskId;
        this.handleTaskClick(taskId, e, listName);
        return;
      }
    });

    // Handle subtask input
    container.addEventListener('keypress', (e) => {
      if (e.target.classList.contains('subtask-input') && e.key === 'Enter') {
        const input = e.target;
        const taskId = input.dataset.parentId;
        const text = input.value.trim();

        if (text) {
          this.app.taskManager.addSubtask(taskId, text);
          input.value = '';
        }
      }
    });

    // Handle Escape key to close subtask input
    container.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('subtask-input') && e.key === 'Escape') {
        const input = e.target;
        const taskId = input.dataset.parentId;
        const task = this.app.taskManager.findTaskById(taskId);
        if (task) {
          task._addingSubtask = false;
          this.app.render();
        }
      }
    });
  }

  /**
   * Set up touch event handlers for mobile interactions
   * @param {HTMLElement} container - List container element
   * @param {string} listName - Name of the list
   */
  setupTouchHandlers(container, listName) {
    // Touch start - track starting position and initiate long press
    container.addEventListener('touchstart', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (!taskItem) return;

      const touch = e.touches[0];
      const taskId = taskItem.dataset.taskId;

      this.touchState.set(taskId, {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        moved: false
      });

      // Integrate with LongPressManager
      if (!e.target.closest('.move-icon') && !e.target.closest('.expand-icon') && !e.target.closest('.subtask-input')) {
        this.app.longPressManager.start(taskItem, e);
      }
    });

    // Touch move - detect if user is scrolling/moving
    container.addEventListener('touchmove', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (!taskItem) return;

      const taskId = taskItem.dataset.taskId;
      const state = this.touchState.get(taskId);
      if (!state) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - state.startX);
      const deltaY = Math.abs(touch.clientY - state.startY);

      // Mark as moved if significant movement (more than 10px)
      if (deltaX > 10 || deltaY > 10) {
        state.moved = true;
      }

      // Cancel long press on movement
      this.app.longPressManager.cancel('movement');
    });

    // Touch end - handle tap vs move
    container.addEventListener('touchend', (e) => {
      // Handle expand icon
      const expandIcon = e.target.closest('.expand-icon');
      if (expandIcon) {
        e.preventDefault();
        e.stopPropagation();
        const taskId = expandIcon.dataset.taskId;
        const taskElement = expandIcon.closest('[data-task-id]');
        this.app.taskManager.toggleSubtaskExpansion(taskId, taskElement);
        this.touchState.delete(taskId);
        return;
      }

      // Handle move icon
      const moveIcon = e.target.closest('.move-icon');
      if (moveIcon) {
        e.preventDefault();
        e.stopPropagation();

        const taskId = moveIcon.dataset.taskId;
        const state = this.touchState.get(taskId);

        // Only trigger if it was a quick tap, not a drag
        if (state && !state.moved && (Date.now() - state.startTime) < 500) {
          const action = moveIcon.dataset.action;
          this.handleMoveAction(taskId, action);
        }

        this.touchState.delete(taskId);
        return;
      }

      // Handle task item tap
      const taskItem = e.target.closest('.task-item');
      if (taskItem && !e.target.closest('.move-icon') && !e.target.closest('.subtask-input')) {
        const taskId = taskItem.dataset.taskId;
        const state = this.touchState.get(taskId);

        // Only trigger if it was a tap, not a scroll/drag
        if (state && !state.moved && (Date.now() - state.startTime) < 500) {
          this.handleTaskClick(taskId, e, listName);
        }

        this.touchState.delete(taskId);
        return;
      }
    });

    // Touch cancel - clean up state
    container.addEventListener('touchcancel', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (taskItem) {
        const taskId = taskItem.dataset.taskId;
        this.touchState.delete(taskId);
        this.app.longPressManager.cancel('touch cancel');
      }
    });

    // Mouse handlers for desktop long press
    container.addEventListener('mousedown', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (!taskItem) return;

      // Don't trigger on icons or inputs
      if (e.target.closest('.move-icon') || e.target.closest('.expand-icon') || e.target.closest('.subtask-input')) return;

      this.app.longPressManager.start(taskItem, e);
    });

    container.addEventListener('mouseup', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (taskItem) {
        this.app.longPressManager.cancel('mouse up');
      }
    });

    container.addEventListener('mouseleave', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (taskItem) {
        this.app.longPressManager.cancel('mouse leave');
      }
    });
  }

  /**
   * Handle task click/tap for completion or deletion
   * @param {string} taskId - Task ID
   * @param {Event} event - Click or touch event
   * @param {string} listName - Name of the list
   */
  handleTaskClick(taskId, event, listName) {
    // Don't handle click if it was a long press
    if (this.app.wasLongPress) {
      this.app.wasLongPress = false;
      return;
    }

    if (this.app.deleteMode[listName]) {
      // Delete mode - remove task from THIS list only (handles cross-list parents correctly)
      // Pass listName to delete from specific list, not both trees
      this.app.taskManager.deleteTask(taskId, listName);
      this.app.showNotification('Task deleted', 'success');
    } else {
      // Normal mode - toggle completion
      this.app.taskManager.completeTask(taskId, event);
    }
  }

  /**
   * Handle move action (push to tomorrow or pull to today)
   * @param {string} taskId - Task ID
   * @param {string} action - Move action ('push' or 'pull')
   */
  handleMoveAction(taskId, action) {
    if (action === 'push') {
      this.app.taskManager.pushToTomorrow(taskId);
    } else if (action === 'pull') {
      this.app.taskManager.pullToToday(taskId);
    }
  }
}

// Freeze the prototype to prevent modifications
Object.freeze(TaskController.prototype);
