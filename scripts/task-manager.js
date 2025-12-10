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

    // Operation locking system to prevent state corruption during edit mode
    this.lockedTasks = new Set();

    // Tree-based task storage (v4 architecture)
    // Trees provide O(1) parent/child access vs O(n) parentId lookups
    this.trees = {
      today: null,
      tomorrow: null
    };

    // Build trees from flat arrays
    this.buildTreesFromFlatData();

    // Initialize subtask counts from existing data (legacy - will be removed)
    this.initializeSubtaskCounts();
  }

  /**
   * Build TaskTree instances from the flat array data
   * Called at startup and after any external data modification
   */
  buildTreesFromFlatData() {
    // Use Storage helper to convert flat arrays to trees
    this.trees.today = Storage.convertFlatToTree(
      this.app.data.today,
      'today',
      TaskTree,
      TaskNode
    );
    this.trees.tomorrow = Storage.convertFlatToTree(
      this.app.data.tomorrow,
      'tomorrow',
      TaskTree,
      TaskNode
    );

    if (this.app.devMode && this.app.devMode.isActive()) {
      console.log('🌳 [TREE] Built trees from flat data:', {
        today: this.trees.today.getAllTasks().length,
        tomorrow: this.trees.tomorrow.getAllTasks().length
      });
    }
  }

  /**
   * Sync tree data back to flat arrays for storage
   * Called before save() to ensure flat arrays are up to date
   */
  syncTreestoFlatArrays() {
    // Preserve UI state from existing flat tasks before syncing
    const uiStateMap = new Map();
    [...this.app.data.today, ...this.app.data.tomorrow].forEach(task => {
      if (task._isEditing || task._addingSubtask || task._editText) {
        uiStateMap.set(task.id, {
          _isEditing: task._isEditing,
          _addingSubtask: task._addingSubtask,
          _editText: task._editText
        });
      }
    });

    this.app.data.today = Storage.convertTreeToFlat(this.trees.today);
    this.app.data.tomorrow = Storage.convertTreeToFlat(this.trees.tomorrow);

    // Restore UI state to the new flat tasks
    [...this.app.data.today, ...this.app.data.tomorrow].forEach(task => {
      const savedState = uiStateMap.get(task.id);
      if (savedState) {
        if (savedState._isEditing) task._isEditing = savedState._isEditing;
        if (savedState._addingSubtask) task._addingSubtask = savedState._addingSubtask;
        if (savedState._editText) task._editText = savedState._editText;
      }
    });

    // Reinitialize subtask counts from the fresh flat data
    // (counts are not stored in tree nodes, so need to rebuild)
    this.initializeSubtaskCounts();

    if (this.app.devMode && this.app.devMode.isActive()) {
      console.log('🌳 [TREE] Synced trees to flat arrays:', {
        today: this.app.data.today.length,
        tomorrow: this.app.data.tomorrow.length
      });
    }
  }

  /**
   * Ensure trees are up-to-date with flat arrays
   * Called before any tree-based operation during migration period
   * TODO: Remove once all operations use trees directly
   */
  ensureTreesFresh() {
    // Rebuild trees from current flat array data
    // This is O(n) but ensures correctness during migration
    this.buildTreesFromFlatData();
  }

  /**
   * Find a task node in trees by ID (O(1) lookup)
   * @param {string} id - Task ID
   * @returns {TaskNode|null} TaskNode or null if not found
   */
  findNodeById(id) {
    // Trees are authoritative - direct lookup, no rebuild needed
    return this.trees.today.findById(id) || this.trees.tomorrow.findById(id);
  }

  /**
   * Get which tree contains a node (O(1) lookup)
   * @param {string} id - Task ID
   * @returns {string|null} 'today', 'tomorrow', or null
   */
  getNodeTree(id) {
    // Trees are authoritative - direct lookup, no rebuild needed
    if (this.trees.today.findById(id)) return 'today';
    if (this.trees.tomorrow.findById(id)) return 'tomorrow';
    return null;
  }

  /**
   * Initialize subtask counts for all parent tasks from existing data
   * Children message their parents about their existence and completion state
   */
  initializeSubtaskCounts() {
    const allTasks = [...this.app.data.today, ...this.app.data.tomorrow];

    // For each subtask, message its parent
    allTasks.forEach(task => {
      if (task.parentId) {
        // Find which list(s) this subtask is in
        const inToday = this.app.data.today.find(t => t.id === task.id);
        const inLater = this.app.data.tomorrow.find(t => t.id === task.id);

        if (inToday) {
          this.incrementSubtaskTotal(task.parentId, 'today');
          if (task.completed) {
            this.incrementSubtaskCompleted(task.parentId, 'today');
          }
        }

        if (inLater) {
          this.incrementSubtaskTotal(task.parentId, 'tomorrow');
          if (task.completed) {
            this.incrementSubtaskCompleted(task.parentId, 'tomorrow');
          }
        }
      }
    });
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
   * Determine which list a task is in (O(1) via tree lookup)
   * @param {string} id - Task ID
   * @returns {string|null} 'today', 'tomorrow', or null if not found
   */
  getTaskList(id) {
    // Delegate to tree-based lookup for O(1) performance
    return this.getNodeTree(id);
  }

  /**
   * Get all tasks from a specific list
   * @param {string} listName - Name of the list ('today' or 'tomorrow')
   * @returns {Array<Object>} Array of tasks in the list
   */
  getTasksByList(listName) {
    return this.app.data[listName] || [];
  }

  /**
   * Find a task by its ID
   * @param {string} id - Task ID
   * @returns {Object|undefined} Task object or undefined if not found
   */
  findTaskById(id) {
    // Search in today list first
    let task = this.app.data.today.find(t => t.id === id);
    if (task) return task;
    // Then search in tomorrow list
    return this.app.data.tomorrow.find(t => t.id === id);
  }

  /**
   * Add a task to a specific list
   * @param {Object} task - Task object to add
   * @param {string} listName - Name of the list to add to
   */
  addTaskToList(task, listName) {
    this.app.data[listName].push(task);
  }

  /**
   * Remove a task by ID from both lists
   * @param {string} id - Task ID
   * @returns {boolean} True if task was removed, false otherwise
   */
  removeTaskById(id) {
    // Find task first to get parent info before deleting
    const taskInfo = this.findTask(id);
    const task = taskInfo ? taskInfo.task : null;

    // Try to remove from today list
    let index = this.app.data.today.findIndex(t => t.id === id);
    if (index !== -1) {
      this.app.data.today.splice(index, 1);

      // Message parent: subtask leaving
      if (task && task.parentId) {
        this.decrementSubtaskTotal(task.parentId, 'today');
        if (task.completed) {
          this.decrementSubtaskCompleted(task.parentId, 'today');
        }
      }

      // Task might also be in tomorrow list (if it's a parent with children in both)
      index = this.app.data.tomorrow.findIndex(t => t.id === id);
      if (index !== -1) {
        this.app.data.tomorrow.splice(index, 1);

        // Message parent: subtask leaving
        if (task && task.parentId) {
          this.decrementSubtaskTotal(task.parentId, 'tomorrow');
          if (task.completed) {
            this.decrementSubtaskCompleted(task.parentId, 'tomorrow');
          }
        }
      }
      return true;
    }

    // Try to remove from tomorrow list
    index = this.app.data.tomorrow.findIndex(t => t.id === id);
    if (index !== -1) {
      this.app.data.tomorrow.splice(index, 1);

      // Message parent: subtask leaving
      if (task && task.parentId) {
        this.decrementSubtaskTotal(task.parentId, 'tomorrow');
        if (task.completed) {
          this.decrementSubtaskCompleted(task.parentId, 'tomorrow');
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Move a task to a different list
   * v3: Maintains invariant that parents appear in lists where they have children
   * @param {string} id - Task ID
   * @param {string} toList - Target list name
   * @returns {boolean} True if task was moved, false otherwise
   */
  moveTaskToList(id, toList) {
    // WAVE 1 FIX: Track operation for save queue integrity
    this.app.incrementOperationCount();

    const task = this.findTaskById(id);
    if (!task) return false;

    const fromList = toList === 'today' ? 'tomorrow' : 'today';

    // WAVE 1 FIX: Collect all tasks to move in one pass to prevent inconsistencies
    const tasksToMove = [];
    const tasksToRemoveFromSource = [];

    // Always include the task being moved
    tasksToMove.push(task);
    tasksToRemoveFromSource.push(id);

    // v3 INVARIANT: If moving a PARENT task, move ALL children with it
    if (!task.parentId) {
      // Find all children in the source list
      const childrenInSource = this.app.data[fromList].filter(t => t.parentId === id);

      // Collect children to move
      childrenInSource.forEach(child => {
        tasksToMove.push(child);
        tasksToRemoveFromSource.push(child.id);
      });
    }

    // v3 INVARIANT: If moving a subtask, ensure parent is in destination list
    if (task.parentId) {
      const parent = this.findTaskById(task.parentId);
      if (parent && !this.app.data[toList].find(t => t.id === task.parentId)) {
        tasksToMove.push(parent);
      }

      // Remove parent from source list if no children remain there
      const remainingChildrenInSource = this.app.data[fromList]
        .filter(t => t.parentId === task.parentId && t.id !== id);

      if (remainingChildrenInSource.length === 0) {
        const parentInSource = this.app.data[fromList].find(t => t.id === task.parentId);
        if (parentInSource && !parentInSource.parentId) {
          tasksToRemoveFromSource.push(task.parentId);
        }
      }
    }

    // WAVE 1 FIX: Perform all removals in one pass (batch operation)
    // Message parents when subtasks leave
    tasksToRemoveFromSource.forEach(taskId => {
      const taskToRemove = this.findTaskById(taskId);
      if (taskToRemove && taskToRemove.parentId) {
        this.decrementSubtaskTotal(taskToRemove.parentId, fromList);
        if (taskToRemove.completed) {
          this.decrementSubtaskCompleted(taskToRemove.parentId, fromList);
        }
      }
    });

    this.app.data[fromList] = this.app.data[fromList].filter(
      t => !tasksToRemoveFromSource.includes(t.id)
    );

    // WAVE 1 FIX: Perform all additions in one pass (batch operation)
    // Message parents when subtasks enter
    tasksToMove.forEach(taskToMove => {
      if (!this.app.data[toList].find(t => t.id === taskToMove.id)) {
        // Initialize expansion property for destination list if undefined
        // This ensures tasks default to expanded when first moved to a list
        const expandedProp = toList === 'today' ? 'expandedInToday' : 'expandedInLater';
        console.log(`🐛 [MOVE] Moving ${taskToMove.text} to ${toList}: ${expandedProp} was ${taskToMove[expandedProp]}`);
        if (taskToMove[expandedProp] === undefined) {
          taskToMove[expandedProp] = true;
          console.log(`🐛 [MOVE] Initialized ${expandedProp} to true`);
        }
        this.app.data[toList].push(taskToMove);

        // Message parent: subtask entering
        if (taskToMove.parentId) {
          this.incrementSubtaskTotal(taskToMove.parentId, toList);
          if (taskToMove.completed) {
            this.incrementSubtaskCompleted(taskToMove.parentId, toList);
          }
        }
      }
    });

    return true;
  }

  /**
   * Helper function to find task by ID with list info
   * @param {string} id - Task ID
   * @returns {Object|null} Object with {task, list} or null if not found
   */
  findTask(id) {
    const task = this.findTaskById(id);
    if (!task) return null;

    const list = this.getTaskList(id);
    return { ...task, list };
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

    const id = this.generateId();
    const tree = this.trees[list];

    // TREE-FIRST: Add to tree structure directly
    const nodeOptions = {
      id,
      completed: false,
      important: false,
      expandedInToday: true,
      expandedInLater: true,
      createdAt: Date.now()
    };

    let node;
    if (parentId) {
      // Adding as subtask - find parent in this tree
      const parentNode = tree.findById(parentId);
      if (parentNode) {
        node = parentNode.addChild(text.trim(), nodeOptions);
        // Update subtask counts (for compatibility with existing UI)
        this.incrementSubtaskTotal(parentId, list);
      } else {
        // Parent not in this tree - add as top-level
        // (This handles edge cases where parent doesn't exist yet)
        console.warn(`[TREE] Parent ${parentId} not found in ${list} tree, adding as top-level`);
        node = tree.addTask(text.trim(), nodeOptions);
      }
    } else {
      // Top-level task
      node = tree.addTask(text.trim(), nodeOptions);
    }

    // Sync tree to flat arrays (keeps existing code working)
    this.syncTreestoFlatArrays();

    this.app.save();
    this.app.render();

    // Return flat task object for API compatibility
    return this.findTaskById(id);
  }

  /**
   * Delete task with all its subtasks (recursively)
   * TREE-FIRST: Uses node.detach() which automatically removes entire subtree
   * @param {string} id - Task ID
   * @returns {boolean} True if task was deleted, false otherwise
   */
  deleteTaskWithSubtasks(id) {
    console.log('🐛 [DELETE] deleteTaskWithSubtasks called', { id });

    // TREE-FIRST: Find node in either tree
    const nodeInToday = this.trees.today.findById(id);
    const nodeInTomorrow = this.trees.tomorrow.findById(id);

    if (!nodeInToday && !nodeInTomorrow) {
      console.error('🐛 [DELETE] Task not found in trees');
      return false;
    }

    // Track what we're deleting for subtask counts
    const collectNodes = (node) => {
      const nodes = [node];
      node.children.forEach(child => nodes.push(...collectNodes(child)));
      return nodes;
    };

    let deletedCount = 0;

    // Delete from Today tree
    if (nodeInToday) {
      const nodesToDelete = collectNodes(nodeInToday);
      console.log(`🐛 [DELETE] Deleting ${nodesToDelete.length} nodes from Today tree`);

      // Update subtask counts for subtasks being deleted
      nodesToDelete.forEach(node => {
        if (node.parent && !node.parent.isVirtualRoot()) {
          this.decrementSubtaskTotal(node.parent.id, 'today');
          if (node.completed) {
            this.decrementSubtaskCompleted(node.parent.id, 'today');
          }
        }
      });

      nodeInToday.detach();
      deletedCount += nodesToDelete.length;
    }

    // Delete from Tomorrow tree (task could be in both if parent with children in both)
    if (nodeInTomorrow) {
      const nodesToDelete = collectNodes(nodeInTomorrow);
      console.log(`🐛 [DELETE] Deleting ${nodesToDelete.length} nodes from Tomorrow tree`);

      // Update subtask counts
      nodesToDelete.forEach(node => {
        if (node.parent && !node.parent.isVirtualRoot()) {
          this.decrementSubtaskTotal(node.parent.id, 'tomorrow');
          if (node.completed) {
            this.decrementSubtaskCompleted(node.parent.id, 'tomorrow');
          }
        }
      });

      nodeInTomorrow.detach();
      deletedCount += nodesToDelete.length;
    }

    console.log(`🐛 [DELETE] Total nodes deleted: ${deletedCount}`);

    // Stop pomodoro if this task was running one
    if (this.app.pomodoro && this.app.pomodoro.state.taskId === id) {
      console.log('🐛 [DELETE] Stopping pomodoro for deleted task');
      this.app.pomodoro.stop();
    }

    // Sync tree changes to flat arrays
    this.syncTreestoFlatArrays();

    this.app.save();
    this.app.render();

    return true;
  }

  /**
   * Delete task (simple version - just this node, not children)
   * TREE-FIRST: Detaches node from tree
   * NOTE: Deletes from ALL trees where task exists. Use deleteTaskFromList for list-specific deletion.
   * @param {string} id - Task ID
   * @param {string|null} listName - Optional: specific list to delete from (for cross-list parents)
   * @returns {boolean} True if task was deleted, false otherwise
   */
  deleteTask(id, listName = null) {
    // If listName specified, use list-specific deletion (handles cross-list parents correctly)
    if (listName) {
      return this.deleteTaskFromList(id, listName);
    }

    // TREE-FIRST: Find node in either tree
    const nodeInToday = this.trees.today.findById(id);
    const nodeInTomorrow = this.trees.tomorrow.findById(id);

    if (!nodeInToday && !nodeInTomorrow) {
      return false;
    }

    // Delete from Today tree
    if (nodeInToday) {
      // Update subtask counts if this is a subtask
      if (nodeInToday.parent && !nodeInToday.parent.isVirtualRoot()) {
        this.decrementSubtaskTotal(nodeInToday.parent.id, 'today');
        if (nodeInToday.completed) {
          this.decrementSubtaskCompleted(nodeInToday.parent.id, 'today');
        }
      }
      nodeInToday.detach();
    }

    // Delete from Tomorrow tree
    if (nodeInTomorrow) {
      if (nodeInTomorrow.parent && !nodeInTomorrow.parent.isVirtualRoot()) {
        this.decrementSubtaskTotal(nodeInTomorrow.parent.id, 'tomorrow');
        if (nodeInTomorrow.completed) {
          this.decrementSubtaskCompleted(nodeInTomorrow.parent.id, 'tomorrow');
        }
      }
      nodeInTomorrow.detach();
    }

    // Stop pomodoro if this task was running one
    if (this.app.pomodoro && this.app.pomodoro.state.taskId === id) {
      console.log('🐛 [DELETE] Stopping pomodoro for deleted task');
      this.app.pomodoro.stop();
    }

    // Sync tree changes to flat arrays
    this.syncTreestoFlatArrays();

    this.app.save();
    this.app.render();

    return true;
  }

  /**
   * Delete task from a specific list only (for cross-list parent handling)
   * Used when user clicks delete on a parent that exists in both lists
   * @param {string} id - Task ID
   * @param {string} listName - List to delete from ('today' or 'tomorrow')
   * @returns {boolean} True if task was deleted, false otherwise
   */
  deleteTaskFromList(id, listName) {
    const treeName = listName === 'today' ? 'today' : 'tomorrow';
    const tree = this.trees[treeName];
    const node = tree.findById(id);

    if (!node) {
      // Task doesn't exist in this list - try global delete
      return this.deleteTask(id, null);
    }

    // Update subtask counts if this is a subtask
    if (node.parent && !node.parent.isVirtualRoot()) {
      this.decrementSubtaskTotal(node.parent.id, listName);
      if (node.completed) {
        this.decrementSubtaskCompleted(node.parent.id, listName);
      }
    }

    // Also delete children in this list
    const collectChildren = (n) => {
      const nodes = [];
      n.children.forEach(child => {
        nodes.push(child);
        nodes.push(...collectChildren(child));
      });
      return nodes;
    };
    const childNodes = collectChildren(node);
    childNodes.forEach(child => {
      if (child.parent && !child.parent.isVirtualRoot()) {
        this.decrementSubtaskTotal(child.parent.id, listName);
        if (child.completed) {
          this.decrementSubtaskCompleted(child.parent.id, listName);
        }
      }
    });

    // Detach the node (and its children)
    node.detach();

    // Stop pomodoro if this task was running one
    if (this.app.pomodoro && this.app.pomodoro.state.taskId === id) {
      console.log('🐛 [DELETE] Stopping pomodoro for deleted task');
      this.app.pomodoro.stop();
    }

    // Sync tree changes to flat arrays
    this.syncTreestoFlatArrays();

    this.app.save();
    this.app.render();

    return true;
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
    // Check if task is locked (in edit mode) - prevent completion during edit
    if (this.lockedTasks.has(id)) {
      console.log('🐛 [COMPLETE] Task is locked (edit mode), ignoring completion request');
      return false;
    }

    // Ripple effect disabled for flat UI
    // if (event && event.target) {
    //   this.addRippleEffect(event.target);
    // }

    // Find the actual task object (not a copy) in the data arrays
    const task = this.findTaskById(id);

    if (task) {
      const wasCompleted = task.completed;
      task.completed = !task.completed;

      // Increment lifetime counter when marking as complete
      if (!wasCompleted && task.completed) {
        this.app.data.totalCompleted = (this.app.data.totalCompleted || 0) + 1;
        this.app.updateCompletedCounter();

        // Parent manually completed → cascade to children by calling completeTask()
        // Children will message parent back with proper counts
        if (!task.parentId) {
          const taskInfo = this.findTask(id);
          if (taskInfo) {
            const children = this.getChildren(id, taskInfo.list);
            children.forEach(child => {
              if (!child.completed) {
                // Call completeTask() so child messages parent properly
                this.completeTask(child.id);
              }
            });
          }
        }
      }
      // Decrement counter when unmarking (undo)
      else if (wasCompleted && !task.completed) {
        this.app.data.totalCompleted = Math.max(0, (this.app.data.totalCompleted || 0) - 1);
        this.app.updateCompletedCounter();
      }

      // Parent manually uncompleted → cascade to children
      if (wasCompleted && !task.completed && !task.parentId) {
        const taskInfo = this.findTask(id);
        if (taskInfo) {
          const children = this.getChildren(id, taskInfo.list);
          children.forEach(child => {
            if (child.completed) {
              // Call completeTask() to toggle child and message parent
              this.completeTask(child.id);
            }
          });
        }
      }

      // Subtask messages parent about completion state changes
      if (task.parentId) {
        const taskInfo = this.findTask(id);
        const listName = taskInfo ? taskInfo.list : null;

        if (listName) {
          // Message parent: completed/uncompleted
          if (!wasCompleted && task.completed) {
            this.incrementSubtaskCompleted(task.parentId, listName);
          } else if (wasCompleted && !task.completed) {
            this.decrementSubtaskCompleted(task.parentId, listName);
          }

          // Check if parent should auto-complete
          const parent = this.findTaskById(task.parentId);
          if (parent && parent.subtaskCounts) {
            const listKey = listName === 'tomorrow' ? 'later' : 'today';
            const counts = parent.subtaskCounts[listKey];

            if (counts.completed === counts.total && counts.total > 0 && !parent.completed) {
              parent.completed = true;
              this.app.data.totalCompleted = (this.app.data.totalCompleted || 0) + 1;
              this.app.updateCompletedCounter();
              this.app.showNotification('Task completed! All subtasks done.', Config.NOTIFICATION_TYPES.SUCCESS);
            } else if (counts.completed < counts.total && parent.completed) {
              parent.completed = false;
              this.app.data.totalCompleted = Math.max(0, (this.app.data.totalCompleted || 0) - 1);
              this.app.updateCompletedCounter();
            }
          }
        }
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
    // Call animateTaskMovement directly (it handles animation)
    this.animateTaskMovement(id, 'today', 'tomorrow', 'right');
  }

  /**
   * Move task from Later to Today (for productive days!)
   * @param {string} id - Task ID
   */
  pullToToday(id) {
    // Call animateTaskMovement directly (it handles animation)
    this.animateTaskMovement(id, 'tomorrow', 'today', 'left');
  }

  /**
   * Move task between lists (instant, no animation)
   * TREE-FIRST: Operates on tree structure, then syncs to flat arrays
   * @param {string} id - Task ID
   * @param {string} fromList - Source list name
   * @param {string} toList - Target list name
   * @param {string} direction - Unused, kept for API compatibility
   * @returns {boolean} True if task was moved, false otherwise
   */
  animateTaskMovement(id, fromList, toList, direction) {
    const sourceTree = this.trees[fromList];
    const destTree = this.trees[toList];
    const nodeInSource = sourceTree.findById(id);

    if (!nodeInSource) {
      console.error('🐛 [MOVE] Task not found in source tree');
      return false;
    }

    console.log('🐛 [MOVE] Moving task:', {
      id: nodeInSource.id,
      text: nodeInSource.text.substring(0, 30),
      hasParent: nodeInSource.parent && !nodeInSource.parent.isVirtualRoot(),
      fromList,
      toList
    });

    const isSubtask = nodeInSource.parent && !nodeInSource.parent.isVirtualRoot();

    if (isSubtask) {
      // SUBTASK MOVEMENT
      console.log('🐛 [MOVE] This is a subtask, moving individually...');
      const parentId = nodeInSource.parent.id;
      const parentText = nodeInSource.parent.text;

      // Detach from source tree
      nodeInSource.detach();

      // Check if parent exists in destination tree (by ID first)
      let parentInDest = destTree.findById(parentId);

      if (!parentInDest) {
        // Parent by ID not found - check if parent with same TEXT exists
        // This handles merging when a parent with same name exists in dest
        parentInDest = destTree.findByText(parentText);

        if (parentInDest && !parentInDest.isVirtualRoot()) {
          // Found existing parent with same text - merge subtask under it
          console.log(`🐛 [MOVE] Found existing parent "${parentText}" in ${toList}, merging subtask`);
        } else {
          // No parent with same text - need to create parent from source
          const parentInSource = sourceTree.findById(parentId);
          const parentData = parentInSource || this.findTaskById(parentId);

          if (parentData) {
            console.log(`🐛 [MOVE] Adding parent to ${toList} tree`);
            parentInDest = destTree.addTask(parentData.text, {
              id: parentData.id,
              completed: parentData.completed,
              important: parentData.important,
              expandedInToday: parentData.expandedInToday !== false ? true : parentData.expansionState?.today,
              expandedInLater: parentData.expandedInLater !== false ? true : parentData.expansionState?.later,
              deadline: parentData.deadline,
              createdAt: parentData.createdAt
            });
          }
        }
      }

      // Add subtask to dest tree under parent
      if (parentInDest && !parentInDest.isVirtualRoot()) {
        parentInDest.addChild(nodeInSource.text, {
          id: nodeInSource.id,
          completed: nodeInSource.completed,
          important: nodeInSource.important,
          expandedInToday: nodeInSource.expansionState.today,
          expandedInLater: nodeInSource.expansionState.later,
          deadline: nodeInSource.deadline,
          createdAt: nodeInSource.createdAt
        });
      } else {
        // Fallback: add as top-level if parent couldn't be found/created
        console.warn('🐛 [MOVE] Parent not found, adding subtask as top-level');
        destTree.addTask(nodeInSource.text, {
          id: nodeInSource.id,
          completed: nodeInSource.completed,
          important: nodeInSource.important,
          expandedInToday: nodeInSource.expansionState.today,
          expandedInLater: nodeInSource.expansionState.later,
          deadline: nodeInSource.deadline,
          createdAt: nodeInSource.createdAt
        });
      }

      // Clean up parent from source if it has no more children there
      const parentInSourceAfter = sourceTree.findById(parentId);
      if (parentInSourceAfter && parentInSourceAfter.children.length === 0) {
        console.log(`🐛 [MOVE] Removing orphan parent from ${fromList} tree`);
        parentInSourceAfter.detach();
      }

    } else {
      // PARENT TASK MOVEMENT - move entire subtree
      const childCount = nodeInSource.children.length;
      console.log(`🐛 [MOVE] This is a parent task with ${childCount} children, moving subtree`);

      // Collect node data before detaching
      const nodeData = {
        id: nodeInSource.id,
        text: nodeInSource.text,
        completed: nodeInSource.completed,
        important: nodeInSource.important,
        expandedInToday: nodeInSource.expansionState.today,
        expandedInLater: nodeInSource.expansionState.later,
        deadline: nodeInSource.deadline,
        createdAt: nodeInSource.createdAt,
        children: nodeInSource.children.map(child => ({
          id: child.id,
          text: child.text,
          completed: child.completed,
          important: child.important,
          expandedInToday: child.expansionState.today,
          expandedInLater: child.expansionState.later,
          deadline: child.deadline,
          createdAt: child.createdAt
        }))
      };

      // Detach entire subtree from source
      nodeInSource.detach();

      // Add to destination tree
      const newParent = destTree.addTask(nodeData.text, {
        id: nodeData.id,
        completed: nodeData.completed,
        important: nodeData.important,
        expandedInToday: nodeData.expandedInToday,
        expandedInLater: nodeData.expandedInLater,
        deadline: nodeData.deadline,
        createdAt: nodeData.createdAt
      });

      // Recreate children in destination
      nodeData.children.forEach(childData => {
        newParent.addChild(childData.text, {
          id: childData.id,
          completed: childData.completed,
          important: childData.important,
          expandedInToday: childData.expandedInToday,
          expandedInLater: childData.expandedInLater,
          deadline: childData.deadline,
          createdAt: childData.createdAt
        });
        console.log(`🐛 [MOVE] Moved child: ${childData.text.substring(0, 20)}`);
      });
    }

    // Sync tree changes to flat arrays
    this.syncTreestoFlatArrays();

    this.app.save();
    this.app.render();

    return true;
  }

  /**
   * Validate V3 invariant: parent should only exist in lists where it has children
   * TREE-FIRST: Now operates on tree structure
   * @param {string} parentId - Parent task ID to validate
   */
  validateV3Invariant(parentId) {
    // With tree-first, invariants are maintained by tree structure
    // This is now a verification/logging function
    const nodeInToday = this.trees.today.findById(parentId);
    const nodeInTomorrow = this.trees.tomorrow.findById(parentId);

    if (!nodeInToday && !nodeInTomorrow) return;

    console.log('🐛 [V3 VALIDATE] Parent validation:', {
      parentId,
      inToday: !!nodeInToday,
      inTomorrow: !!nodeInTomorrow,
      childrenInToday: nodeInToday ? nodeInToday.children.length : 0,
      childrenInTomorrow: nodeInTomorrow ? nodeInTomorrow.children.length : 0
    });

    // In tree-first, we clean up orphan parents during move operations
    // This function now just logs for verification
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

    // Lock the task to prevent completion/deletion during edit
    this.lockedTasks.add(id);
    console.log('🐛 [EDIT] Task locked:', id);

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = taskInfo.text;
    input.className = 'edit-input';
    input.setAttribute('enterkeyhint', 'done');
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

    // Unlock the task
    if (this.app.editingTask) {
      this.lockedTasks.delete(this.app.editingTask);
      console.log('🐛 [EDIT] Task unlocked:', this.app.editingTask);
    }

    this.app.editingTask = null;
    this.app.originalText = null;
    this.app.wasLongPress = false; // Reset long press flag when canceling edit
  }

  // ==================== SUBTASK MANAGEMENT ====================

  /**
   * Show inline input to add subtask
   * TREE-FIRST: Modifies tree node expansion state
   * @param {string} taskId - Parent task ID
   */
  showAddSubtaskDialog(taskId) {
    console.log('🐛 [SUBTASK] showAddSubtaskDialog called', { taskId });

    // TREE-FIRST: Find node in trees
    const nodeInToday = this.trees.today.findById(taskId);
    const nodeInTomorrow = this.trees.tomorrow.findById(taskId);

    if (!nodeInToday && !nodeInTomorrow) {
      console.error('🐛 [SUBTASK] Task not found in trees!');
      return;
    }

    // Make sure the task is expanded in both lists so we can see the input
    if (nodeInToday) {
      nodeInToday.setExpandedIn('today', true);
      nodeInToday.setExpandedIn('tomorrow', true);
    }
    if (nodeInTomorrow) {
      nodeInTomorrow.setExpandedIn('today', true);
      nodeInTomorrow.setExpandedIn('tomorrow', true);
    }

    // Sync tree state to flat arrays
    this.syncTreestoFlatArrays();

    // Mark this task as having an active subtask input
    // (This is UI state, set on flat task for renderer to read)
    const actualTask = this.findTaskById(taskId);
    if (actualTask) {
      actualTask._addingSubtask = true;
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
   * TREE-FIRST: Adds subtask as child node in tree
   * @param {string} parentTaskId - Parent task ID
   * @param {string} text - Subtask text
   */
  addSubtask(parentTaskId, text) {
    console.log('🐛 [SUBTASK] addSubtask called', { parentTaskId, text });

    // TREE-FIRST: Find parent node in trees
    const parentInToday = this.trees.today.findById(parentTaskId);
    const parentInTomorrow = this.trees.tomorrow.findById(parentTaskId);

    if (!parentInToday && !parentInTomorrow) {
      console.error('🐛 [SUBTASK] Parent task not found in trees!');
      return;
    }

    // WAVE 1 FIX: Track operation for save queue integrity
    this.app.incrementOperationCount();

    const id = this.generateId();
    const nodeOptions = {
      id,
      completed: false,
      important: false,
      expandedInToday: true,
      expandedInLater: true,
      createdAt: Date.now()
    };

    // Add subtask to the tree where parent exists
    // (prefer Today if parent is in both)
    const targetTree = parentInToday ? 'today' : 'tomorrow';
    const parentNode = parentInToday || parentInTomorrow;

    parentNode.addChild(text, nodeOptions);
    console.log('🐛 [SUBTASK] Added subtask to tree:', { parentTaskId, text, targetTree });

    // Message parent: subtask entering (for compatibility with count system)
    this.incrementSubtaskTotal(parentTaskId, targetTree);

    // Sync tree to flat arrays
    this.syncTreestoFlatArrays();

    this.app.save();
    this.app.render();

    // Re-focus the input after render
    setTimeout(() => {
      const input = document.getElementById(`subtask-input-${parentTaskId}`);
      if (input) {
        input.focus();
        console.log('🐛 [SUBTASK] Re-focused input after adding subtask');
      }
    }, 50);
  }

  /**
   * Toggle subtask expansion
   * TREE-FIRST: Modifies expansion state on tree node
   * @param {string} taskId - Task ID
   * @param {HTMLElement} taskElement - Specific task element that was clicked (optional)
   */
  toggleSubtaskExpansion(taskId, taskElement = null) {
    // WAVE 1 FIX: Track operation for save queue integrity
    this.app.incrementOperationCount();

    // Determine which list this element is in
    const targetElement = taskElement || document.querySelector(`[data-task-id="${taskId}"]`);
    if (!targetElement) return;

    const listContainer = targetElement.closest('#today-list, #tomorrow-list');
    const listName = listContainer?.id === 'today-list' ? 'today' : 'tomorrow';

    // TREE-FIRST: Find and modify the node in the appropriate tree
    const tree = this.trees[listName];
    const node = tree.findById(taskId);

    if (node) {
      // Toggle expansion state for this specific list
      node.toggleExpansionIn(listName);

      // Sync tree to flat arrays
      this.syncTreestoFlatArrays();

      this.app.save();
      this.app.render();
    }
  }

  /**
   * Get children of a task (O(1) child lookup via tree)
   * @param {string} parentId - Parent task ID
   * @param {string|null} listName - Optional list name filter
   * @returns {Array<Object>} Array of child tasks (flat task objects for compatibility)
   */
  getChildren(parentId, listName = null) {
    // Trees are authoritative - direct lookup, no rebuild needed
    // If listName is specified, search that tree specifically
    // (parent may exist in both trees with different children)
    let node = null;
    if (listName) {
      node = this.trees[listName].findById(parentId);
    } else {
      // No list specified - search both trees
      node = this.trees.today.findById(parentId) || this.trees.tomorrow.findById(parentId);
    }

    if (!node || node.children.length === 0) return [];

    // Get child IDs from tree
    const childIds = new Set(node.children.map(c => c.id));

    // Return flat task objects for compatibility with rest of system
    const allTasks = [...this.app.data.today, ...this.app.data.tomorrow];
    let children = allTasks.filter(t => childIds.has(t.id));

    // If listName is provided, further filter by which list the child is in
    if (listName) {
      children = children.filter(child => this.app.data[listName].find(t => t.id === child.id));
    }

    return children;
  }

  /**
   * Initialize subtask counts for a parent task
   * @param {Object} parent - Parent task
   */
  initSubtaskCounts(parent) {
    if (!parent.subtaskCounts) {
      parent.subtaskCounts = {
        today: { total: 0, completed: 0 },
        later: { total: 0, completed: 0 }
      };
    }
  }

  /**
   * Subtask messages parent when entering a list
   * @param {string} parentId - Parent task ID
   * @param {string} listName - 'today' or 'later'
   */
  incrementSubtaskTotal(parentId, listName) {
    const parent = this.findTaskById(parentId);
    if (!parent) return;

    this.initSubtaskCounts(parent);
    const listKey = listName === 'tomorrow' ? 'later' : 'today';
    parent.subtaskCounts[listKey].total++;
  }

  /**
   * Subtask messages parent when leaving a list
   * @param {string} parentId - Parent task ID
   * @param {string} listName - 'today' or 'later'
   */
  decrementSubtaskTotal(parentId, listName) {
    const parent = this.findTaskById(parentId);
    if (!parent) return;

    this.initSubtaskCounts(parent);
    const listKey = listName === 'tomorrow' ? 'later' : 'today';
    parent.subtaskCounts[listKey].total = Math.max(0, parent.subtaskCounts[listKey].total - 1);
  }

  /**
   * Subtask messages parent when completed
   * @param {string} parentId - Parent task ID
   * @param {string} listName - 'today' or 'later'
   */
  incrementSubtaskCompleted(parentId, listName) {
    const parent = this.findTaskById(parentId);
    if (!parent) return;

    this.initSubtaskCounts(parent);
    const listKey = listName === 'tomorrow' ? 'later' : 'today';
    parent.subtaskCounts[listKey].completed++;
  }

  /**
   * Subtask messages parent when uncompleted
   * @param {string} parentId - Parent task ID
   * @param {string} listName - 'today' or 'later'
   */
  decrementSubtaskCompleted(parentId, listName) {
    const parent = this.findTaskById(parentId);
    if (!parent) return;

    this.initSubtaskCounts(parent);
    const listKey = listName === 'tomorrow' ? 'later' : 'today';
    parent.subtaskCounts[listKey].completed = Math.max(0, parent.subtaskCounts[listKey].completed - 1);
  }

  /**
   * Check if parent should auto-complete
   * Note: Does NOT call save() or render() - caller is responsible for that
   * @param {string} parentId - Parent task ID
   * @param {string} listName - List name (optional, kept for backward compatibility)
   */
  checkParentCompletion(parentId, listName) {
    // Check ALL children regardless of which list they're in
    // (subtasks can be in different lists than parent after recent refactor)
    const children = this.getChildren(parentId);
    if (children.length === 0) return;

    const allComplete = children.every(child => child.completed);
    if (allComplete) {
      // Find the parent task
      const parent = this.findTaskById(parentId);
      if (parent && !parent.completed) {
        parent.completed = true;
        // Increment the completed counter for the parent too
        this.app.data.totalCompleted = (this.app.data.totalCompleted || 0) + 1;
        this.app.updateCompletedCounter();
        this.app.showNotification('Task completed! All subtasks done.', Config.NOTIFICATION_TYPES.SUCCESS);
        // Note: Caller (completeTask) will handle save() and render()
      }
    }
  }

  // ==================== VIEWMODEL METHODS ====================

  /**
   * Check if a task has children (O(1) with trees vs O(n) with flat arrays)
   * @param {string} taskId - Task ID to check
   * @returns {boolean} True if task has children, false otherwise
   */
  hasChildren(taskId) {
    // Use tree for O(1) lookup
    const node = this.findNodeById(taskId);
    return node ? node.children.length > 0 : false;
  }

  /**
   * Get sorted children of a task recursively, optionally filtered by list
   * @param {string} parentId - Parent task ID
   * @param {string|null} listName - Optional list name to filter children
   * @returns {Array<Object>} Array of sorted child tasks with their children
   */
  getChildrenSorted(parentId, listName = null) {
    const children = this.getChildren(parentId, listName);
    if (children.length === 0) return [];

    const sorted = this.sortTasks(children);

    return sorted.map(child => ({
      ...child,
      children: this.getChildrenSorted(child.id, listName),
      hasChildren: this.hasChildren(child.id),
      isExpanded: listName === 'today' ? (child.expandedInToday !== false) : (child.expandedInLater !== false),  // Per-list expansion for children
      moveAction: this.getTaskList(child.id) === 'today' ? 'push' : 'pull',
      moveIcon: this.getTaskList(child.id) === 'today' ? Config.MOVE_ICON_ARROW_RIGHT : Config.MOVE_ICON_ARROW_LEFT
    }));
  }

  /**
   * Get complete render-ready data for a list (TREE-BASED)
   * Returns hierarchical task data with children arrays
   * Tree roots already contain top-level tasks - no parent chain walking needed
   *
   * @param {string} listName - Name of the list ('today' or 'tomorrow')
   * @returns {Array<Object>} Array of render-ready task objects with children
   */
  getRenderData(listName) {
    // Ensure trees are current with flat data
    this.ensureTreesFresh();

    // Tree root's children ARE the top-level tasks for this list
    // No need to walk parent chains - tree structure handles this
    const tree = this.trees[listName];
    const topLevelNodes = tree.root.children;

    // Get flat task objects for top-level nodes (for compatibility)
    const topLevelTasks = topLevelNodes
      .map(node => this.findTaskById(node.id))
      .filter(task => task !== undefined);

    // Sort and return with children arrays (filtered to this list only)
    const sorted = this.sortTasks(topLevelTasks);

    return sorted.map(task => this.taskToRenderData(task, listName));
  }

  /**
   * Convert a task to render-ready format with children
   * @param {Object} task - Flat task object
   * @param {string} listName - Name of the list ('today' or 'tomorrow')
   * @returns {Object} Render-ready task object with children
   */
  taskToRenderData(task, listName) {
    const isExpanded = listName === 'today' ? (task.expandedInToday !== false) : (task.expandedInLater !== false);

    // Compute completion for parent tasks from counts
    let completed = task.completed;
    if (!task.parentId && task.subtaskCounts) {
      const listKey = listName === 'tomorrow' ? 'later' : 'today';
      const counts = task.subtaskCounts[listKey];
      // Parent is complete in this list if all subtasks in this list are complete
      completed = counts.completed === counts.total && counts.total > 0;
    }

    return {
      ...task,
      completed,  // Use computed completion for parents
      children: this.getChildrenSorted(task.id, listName),
      hasChildren: this.hasChildren(task.id),
      isExpanded,  // Backwards compatible default to true
      moveAction: listName === 'today' ? 'push' : 'pull',
      moveIcon: listName === 'today' ? Config.MOVE_ICON_ARROW_RIGHT : Config.MOVE_ICON_ARROW_LEFT
    };
  }
}

// Freeze the prototype to prevent modifications
Object.freeze(TaskManager.prototype);
