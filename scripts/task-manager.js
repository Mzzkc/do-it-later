// Do It (Later) - Task Manager Module
// Handles all task-related operations including CRUD, movement, editing, and subtasks

/**
 * TaskManager class - Manages all task operations
 * Handles:
 * - Task CRUD operations
 * - Task movement between lists
 * - Task editing
 * - Subtask management
 * - Task completion and sorting
 */
class TaskManager {
  /**
   * Creates a new TaskManager instance
   * @param {DoItTomorrowApp} app - Reference to the main application instance
   */
  constructor(app) {
    this.app = app;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate unique ID for tasks
   * @returns {string} Unique task ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get all tasks from a specific list
   * @param {string} listName - Name of the list ('today' or 'tomorrow')
   * @returns {Array<Object>} Array of tasks in the list
   */
  getTasksByList(listName) {
    return this.app.data.tasks.filter(t => t.list === listName);
  }

  /**
   * Find a task by its ID
   * @param {string} id - Task ID
   * @returns {Object|undefined} Task object or undefined if not found
   */
  findTaskById(id) {
    return this.app.data.tasks.find(t => t.id === id);
  }

  /**
   * Add a task to a specific list
   * @param {Object} task - Task object to add
   * @param {string} listName - Name of the list to add to
   */
  addTaskToList(task, listName) {
    task.list = listName;
    this.app.data.tasks.push(task);
  }

  /**
   * Remove a task by ID
   * @param {string} id - Task ID
   * @returns {boolean} True if task was removed, false otherwise
   */
  removeTaskById(id) {
    const index = this.app.data.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      this.app.data.tasks.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Move a task to a different list
   * @param {string} id - Task ID
   * @param {string} toList - Target list name
   * @returns {boolean} True if task was moved, false otherwise
   */
  moveTaskToList(id, toList) {
    const task = this.findTaskById(id);
    if (task) {
      task.list = toList;
      return true;
    }
    return false;
  }

  /**
   * Helper function to find task by ID across both lists (returns a copy)
   * @param {string} id - Task ID
   * @returns {Object|null} Copy of task object or null if not found
   */
  findTask(id) {
    const task = this.findTaskById(id);
    return task ? { ...task } : null;
  }

  // ==================== CRUD OPERATIONS ====================

  /**
   * Add new task (always to Later list unless specified)
   * @param {string} text - Task text
   * @param {string} list - List to add to ('today' or 'tomorrow')
   * @param {string|null} parentId - Optional parent task ID for subtasks
   * @returns {Object|boolean} Task object if added successfully, false otherwise
   */
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
    this.app.save();
    this.app.render();
    return task;
  }

  /**
   * Delete task with all its subtasks (recursively)
   * @param {string} id - Task ID
   * @returns {boolean} True if task was deleted, false otherwise
   */
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
      const children = this.app.data.tasks.filter(t => t.parentId === id);
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
    this.app.save();
    this.app.render();

    return true;
  }

  /**
   * Delete task (simple version without subtasks)
   * @param {string} id - Task ID
   * @returns {boolean} True if task was deleted, false otherwise
   */
  deleteTask(id) {
    const found = this.removeTaskById(id);

    if (found) {
      this.app.save();
      this.app.render();
    }
    return found;
  }

  /**
   * Smart task sorting system
   * Sorts by importance first, then by creation time
   * @param {Array<Object>} tasks - Array of tasks to sort
   * @returns {Array<Object>} Sorted array of tasks
   */
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

  // ==================== TASK STATE ====================

  /**
   * Toggle task completion status
   * @param {string} id - Task ID
   * @param {Event} event - Optional event object for ripple effect
   * @returns {boolean} True if task was toggled, false otherwise
   */
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
        this.app.data.totalCompleted = (this.app.data.totalCompleted || 0) + 1;
        this.app.updateCompletedCounter();
      }
      // Decrement counter when unmarking (undo)
      else if (wasCompleted && !task.completed) {
        this.app.data.totalCompleted = Math.max(0, (this.app.data.totalCompleted || 0) - 1);
        this.app.updateCompletedCounter();
      }

      // If this is a parent task being marked incomplete, also mark all children incomplete
      if (wasCompleted && !task.completed && !task.parentId) {
        const children = this.getChildren(id, task.list);
        if (children.length > 0) {
          children.forEach(child => {
            if (child.completed) {
              child.completed = false;
              // Decrement counter for each child
              this.app.data.totalCompleted = Math.max(0, (this.app.data.totalCompleted || 0) - 1);
            }
          });
          this.app.updateCompletedCounter();
        }
      }

      // Check if parent should auto-complete
      if (task.parentId) {
        this.checkParentCompletion(task.parentId, task.list);
      }

      this.app.save();
      this.app.render();
      return true;
    }
    return false;
  }

  /**
   * Add ripple effect to clicked element
   * @param {HTMLElement} element - Element to add ripple effect to
   */
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

  // ==================== TASK MOVEMENT ====================

  /**
   * Move task from Today to Later
   * @param {string} id - Task ID
   */
  pushToTomorrow(id) {
    // Animate the task item being pushed right
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);
    if (taskElement) {
      taskElement.classList.add('pushing-right');
      setTimeout(() => {
        taskElement.classList.remove('pushing-right');
        this.animateTaskMovement(id, 'today', 'tomorrow', 'right');
      }, 150);
    }
  }

  /**
   * Move task from Later to Today (for productive days!)
   * @param {string} id - Task ID
   */
  pullToToday(id) {
    // Animate the task item being pushed left
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);
    if (taskElement) {
      taskElement.classList.add('pushing-left');
      setTimeout(() => {
        taskElement.classList.remove('pushing-left');
        this.animateTaskMovement(id, 'tomorrow', 'today', 'left');
      }, 150);
    }
  }

  /**
   * Animated task movement between lists
   * @param {string} id - Task ID
   * @param {string} fromList - Source list name
   * @param {string} toList - Target list name
   * @param {string} direction - Animation direction ('left' or 'right')
   * @returns {boolean} True if task was moved, false otherwise
   */
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
        const children = this.app.data.tasks.filter(t => t.parentId === task.id);
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

      this.app.save();

      // Mark task for moving-in animation from opposite direction
      const inDirection = direction === 'right' ? 'left' : 'right';
      task._justMoved = inDirection;
      this.app.render();

      return true;
    }, 150);
  }

  // ==================== TASK EDITING ====================

  /**
   * Enter edit mode for a task
   * @param {string} id - Task ID
   */
  enterEditMode(id) {
    // Prevent race conditions by checking if we're already editing this task
    if (this.app.editingTask === id) return;

    // Cancel any existing edit mode first
    if (this.app.editingTask) this.cancelEdit();

    const taskInfo = this.findTask(id);
    if (!taskInfo) return;

    const taskElement = document.querySelector(`[data-task-id="${id}"] .task-text`);
    if (!taskElement) return;

    this.app.editingTask = id;
    this.app.originalText = taskInfo.text;

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

  /**
   * Save edited task text
   * @param {string} newText - New task text
   */
  saveEdit(newText) {
    if (!this.app.editingTask) return;

    // Find the actual task object to update
    const actualTask = this.findTaskById(this.app.editingTask);

    if (!actualTask) return;

    // Validate new text
    if (newText && newText.length > 200) {
      this.app.showNotification('Task too long! Please keep it under 200 characters.', 'error');
      return;
    }

    // If text is empty, delete the task
    if (!newText || newText.trim() === '') {
      try {
        this.deleteTask(this.app.editingTask);
        this.app.showNotification('Task deleted', 'success');
        this.cancelEdit();
        this.app.render();
        return;
      } catch (error) {
        console.error('Error deleting task:', error);
        this.app.showNotification('Failed to delete task. Please try again.', 'error');
      }
    }

    // Update task text if changed and not empty
    if (newText && newText !== this.app.originalText) {
      try {
        actualTask.text = newText;
        this.app.save();
      } catch (error) {
        console.error('Error updating task:', error);
        this.app.showNotification('Failed to update task. Please try again.', 'error');
        actualTask.text = this.app.originalText; // Revert on error
      }
    }

    this.cancelEdit();
    this.app.render();
  }

  /**
   * Cancel edit mode
   */
  cancelEdit() {
    if (!this.app.editingTask) return;

    // More robust edit input removal
    const editInputs = document.querySelectorAll('.edit-input');
    editInputs.forEach(input => {
      try {
        if (input && input.parentNode && input.isConnected) {
          input.remove();
        }
      } catch (error) {
        if (this.app.devMode.isActive()) {
          console.log('⚠️ Edit input removal failed:', error.message);
        }
      }
    });

    // Restore task text display
    const taskElement = document.querySelector(`[data-task-id="${this.app.editingTask}"] .task-text`);
    if (taskElement) {
      taskElement.style.display = '';
    }

    this.app.editingTask = null;
    this.app.originalText = null;
    this.app.wasLongPress = false; // Reset long press flag when canceling edit
  }

  // ==================== SUBTASK MANAGEMENT ====================

  /**
   * Show inline input to add subtask
   * @param {string} taskId - Parent task ID
   */
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
    this.app.save();
    this.app.render();

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

  /**
   * Add subtask to a task
   * @param {string} parentTaskId - Parent task ID
   * @param {string} text - Subtask text
   */
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
    this.app.save();

    // Re-render to show the new subtask
    this.app.render();

    // Re-focus the input after render
    setTimeout(() => {
      const input = document.getElementById(`subtask-input-${parentTaskId}`);
      if (input) {
        input.focus();
        console.log('🐛 [SUBTASK] Re-focused input after adding subtask');
      }
    }, 50);

    this.app.showNotification('Subtask added', Config.NOTIFICATION_TYPES.SUCCESS);
  }

  /**
   * Toggle subtask expansion
   * @param {string} taskId - Task ID
   */
  toggleSubtaskExpansion(taskId) {
    const taskInfo = this.findTask(taskId);
    if (!taskInfo) return;

    // Find the actual task in the data array (not the copy) using helper method
    const actualTask = this.findTaskById(taskId);
    if (actualTask) {
      actualTask.isExpanded = !actualTask.isExpanded;
      this.app.save();

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

  /**
   * Get children of a task
   * @param {string} parentId - Parent task ID
   * @param {string|null} listName - Optional list name filter
   * @returns {Array<Object>} Array of child tasks
   */
  getChildren(parentId, listName = null) {
    // If listName is provided, filter by list (for backward compatibility)
    // If not provided, get ALL children regardless of list
    if (listName) {
      return this.app.data.tasks.filter(task => task.parentId === parentId && task.list === listName);
    }
    return this.app.data.tasks.filter(task => task.parentId === parentId);
  }

  /**
   * Check if parent should auto-complete
   * @param {string} parentId - Parent task ID
   * @param {string} listName - List name
   */
  checkParentCompletion(parentId, listName) {
    const children = this.getChildren(parentId, listName);
    if (children.length === 0) return;

    const allComplete = children.every(child => child.completed);
    if (allComplete) {
      const parent = this.app.data.tasks.find(t => t.id === parentId && t.list === listName);
      if (parent && !parent.completed) {
        parent.completed = true;
        this.app.showNotification('Task completed! All subtasks done.', Config.NOTIFICATION_TYPES.SUCCESS);
      }
    }
  }

  // ==================== VIEWMODEL METHODS ====================

  /**
   * Check if a task has children
   * @param {string} taskId - Task ID to check
   * @returns {boolean} True if task has children, false otherwise
   */
  hasChildren(taskId) {
    return this.app.data.tasks.some(task => task.parentId === taskId);
  }

  /**
   * Get sorted children of a task recursively
   * @param {string} parentId - Parent task ID
   * @returns {Array<Object>} Array of sorted child tasks with their children
   */
  getChildrenSorted(parentId) {
    const children = this.getChildren(parentId);
    if (children.length === 0) return [];

    const sorted = this.sortTasks(children);

    return sorted.map(child => ({
      ...child,
      children: this.getChildrenSorted(child.id),
      hasChildren: this.hasChildren(child.id),
      moveAction: child.list === 'today' ? 'push' : 'pull',
      moveIcon: child.list === 'today' ? Config.MOVE_ICON_ARROW_RIGHT : Config.MOVE_ICON_ARROW_LEFT
    }));
  }

  /**
   * Get complete render-ready data for a list
   * Returns fully prepared, sorted, hierarchical task data ready for rendering
   * @param {string} listName - Name of the list ('today' or 'tomorrow')
   * @returns {Array<Object>} Array of render-ready task objects
   */
  getRenderData(listName) {
    const tasks = this.getTasksByList(listName);
    const sorted = this.sortTasks(tasks);
    const topLevel = sorted.filter(task => !task.parentId);

    return topLevel.map(task => ({
      ...task,
      children: this.getChildrenSorted(task.id),
      hasChildren: this.hasChildren(task.id),
      moveAction: task.list === 'today' ? 'push' : 'pull',
      moveIcon: task.list === 'today' ? Config.MOVE_ICON_ARROW_RIGHT : Config.MOVE_ICON_ARROW_LEFT
    }));
  }
}

// Freeze the prototype to prevent modifications
Object.freeze(TaskManager.prototype);
