// Do It (Later) - Interaction Manager Module
// Handles long press detection and context menu interactions

/**
 * LongPressManager class - Detects and manages long press gestures
 * Supports both touch and mouse events with movement tolerance
 * Provides accessibility-optimized timing and visual feedback
 */
class LongPressManager {
  /**
   * Creates a new LongPressManager instance
   * @param {Object} options - Configuration options
   * @param {number} options.timeout - Long press duration in ms (default: 600)
   * @param {number} options.tolerance - Movement tolerance in pixels (default: 10)
   * @param {Function} options.onLongPress - Callback when long press triggers
   * @param {Function} options.onCancel - Callback when long press cancels
   * @param {Object} options.devMode - Dev mode instance for logging
   */
  constructor(options = {}) {
    this.timeout = options.timeout || 600; // Accessibility optimized
    this.tolerance = options.tolerance || 10; // Movement tolerance in pixels
    this.onLongPress = options.onLongPress || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.devMode = options.devMode || false;

    // State tracking
    this.isActive = false;
    this.timer = null;
    this.startTime = null;
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

  /**
   * Start long press detection
   * @param {HTMLElement} element - Element being pressed
   * @param {Event} event - Touch or mouse event
   */
  start(element, event) {
    if (!element || this.isActive) return;

    this.isActive = true;
    this.currentElement = element;
    this.startEvent = event;
    this.startTime = Date.now();

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

  /**
   * Cancel long press
   * @param {string} reason - Reason for cancellation
   */
  cancel(reason = 'manual') {
    if (!this.isActive) return;

    this.cleanup();
    this.onCancel(reason);

    if (this.devMode && reason !== 'normal') {
      console.log('❌ LONG PRESS CANCELLED:', reason);
    }
  }

  /**
   * Trigger long press callback
   * @private
   */
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

  /**
   * Setup movement detection for different device types
   * @private
   * @param {Event} startEvent - Initial touch or mouse event
   */
  setupMovementDetection(startEvent) {
    if (startEvent.type === 'touchstart') {
      this.setupTouchMovement();
    } else {
      this.setupMouseMovement();
    }
  }

  /**
   * Setup touch movement detection
   * @private
   */
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
        // Check if threshold time has been met
        const elapsed = Date.now() - this.startTime;
        if (elapsed >= this.timeout) {
          this.triggerLongPress();
        } else {
          this.cancel('touchend');
        }
      }
    };

    document.addEventListener('touchmove', moveHandler, { passive: true });
    document.addEventListener('touchend', endHandler);
    document.addEventListener('touchcancel', endHandler);
  }

  /**
   * Setup mouse movement detection
   * @private
   */
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
        // Check if threshold time has been met
        const elapsed = Date.now() - this.startTime;
        if (elapsed >= this.timeout) {
          this.triggerLongPress();
        } else {
          this.cancel('mouseup');
        }
      }
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
    document.addEventListener('mouseleave', upHandler);
  }

  /**
   * Check if movement exceeds tolerance
   * @private
   * @param {Object} currentPosition - Current pointer position
   * @returns {boolean} True if movement exceeded tolerance
   */
  isMovementExceeded(currentPosition) {
    if (!this.startPosition || !currentPosition) return false;

    const deltaX = Math.abs(currentPosition.x - this.startPosition.x);
    const deltaY = Math.abs(currentPosition.y - this.startPosition.y);

    return deltaX > this.tolerance || deltaY > this.tolerance;
  }

  /**
   * Get position from event (cross-platform)
   * @private
   * @param {Event} event - Touch or mouse event
   * @returns {Object} Position with x and y coordinates
   */
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

  /**
   * Cleanup state and timers
   * @private
   */
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

/**
 * ContextMenu class - Manages context menu display and interactions
 * Shows a popup menu with task actions on long press
 * Supports both mobile (bottom sheet) and desktop (positioned) layouts
 */
class ContextMenu {
  /**
   * Creates a new ContextMenu instance
   * @param {Object} options - Configuration options
   * @param {Function} options.onEdit - Callback for edit action
   * @param {Function} options.onToggleImportant - Callback for toggle important action
   * @param {Function} options.onSetDeadline - Callback for set deadline action
   * @param {Function} options.onStartPomodoro - Callback for start pomodoro action
   * @param {Function} options.onAddSubtask - Callback for add subtask action
   * @param {Function} options.onDelete - Callback for delete action
   * @param {Function} options.onClose - Callback when menu closes
   * @param {Object} options.devMode - Dev mode instance for logging
   */
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

  /**
   * Show context menu at position for task
   * @param {Object} position - Position with x and y coordinates
   * @param {Object} task - Task object
   */
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

  /**
   * Hide context menu
   */
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

  /**
   * Create menu DOM element
   * @private
   * @param {Object} position - Position with x and y coordinates
   * @param {Object} task - Task object
   */
  createMenuElement(position, task) {
    // Create backdrop
    this.backdropElement = document.createElement('div');
    this.backdropElement.className = 'context-menu-backdrop';

    // Create menu
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'context-menu';
    this.menuElement.className = 'context-menu';
    this.menuElement.setAttribute('role', 'menu');
    this.menuElement.setAttribute('aria-label', `Task options for "${task.text}"`);

    // Build menu items conditionally
    const menuItems = [];

    // Edit Task
    menuItems.push(`
      <div class="context-menu-item" role="menuitem" data-action="edit" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
          <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
        </svg>
        <span>Edit Task</span>
      </div>
    `);

    // Mark as Important
    menuItems.push(`
      <div class="context-menu-item" role="menuitem" data-action="important" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
        </svg>
        <span>${task.important ? 'Remove Importance' : 'Mark as Important'}</span>
      </div>
    `);

    // Set Deadline
    menuItems.push(`
      <div class="context-menu-item" role="menuitem" data-action="deadline" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
          <path d="M6.445 11.688V6.354h-.633A12.6 12.6 0 0 0 4.5 7.16v.695c.375-.257.969-.62 1.258-.777h.012v4.61h.675zm1.188-1.305c.047.64.594 1.406 1.703 1.406 1.258 0 2-1.066 2-2.871 0-1.934-.781-2.668-1.953-2.668-.926 0-1.797.672-1.797 1.809 0 1.16.824 1.77 1.676 1.77.746 0 1.23-.376 1.383-.79h.027c-.004 1.316-.461 2.164-1.305 2.164-.664 0-1.008-.45-1.05-.82h-.684zm2.953-2.317c0 .696-.559 1.18-1.184 1.18-.601 0-1.144-.383-1.144-1.2 0-.823.582-1.21 1.168-1.21.633 0 1.16.398 1.16 1.23z"/>
        </svg>
        <span>${task.deadline ? 'Change Deadline' : 'Set Deadline'}</span>
      </div>
    `);

    // Start Pomodoro
    menuItems.push(`
      <div class="context-menu-item" role="menuitem" data-action="pomodoro" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M8 3.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5H4a.5.5 0 0 1 0-1h3.5V4a.5.5 0 0 1 .5-.5z"/>
        </svg>
        <span>Start Pomodoro</span>
      </div>
    `);

    // Add Subtask (only if task doesn't have a parent)
    if (!task.parentId) {
      menuItems.push(`
        <div class="context-menu-item" role="menuitem" data-action="add-subtask" tabindex="0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
          </svg>
          <span>Add Subtask</span>
        </div>
      `);
    }

    // Delete Task
    menuItems.push(`
      <div class="context-menu-item" role="menuitem" data-action="delete" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
          <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
        </svg>
        <span>Delete Task</span>
      </div>
    `);

    // Set menu content
    this.menuElement.innerHTML = menuItems.join('');

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

  /**
   * Position menu with viewport awareness
   * @private
   * @param {Object} position - Position with x and y coordinates
   */
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

  /**
   * Setup menu interactions (click and keyboard)
   * @private
   */
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

  /**
   * Handle menu action selection
   * @private
   * @param {string} action - Action name (edit, important, deadline, etc.)
   */
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

  /**
   * Remove menu from DOM
   * @private
   */
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

// Freeze prototypes to prevent modifications
Object.freeze(LongPressManager.prototype);
Object.freeze(ContextMenu.prototype);
