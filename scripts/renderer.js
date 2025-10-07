// Do It (Later) - Renderer Module
// Handles all rendering and HTML generation for tasks and lists

/**
 * Renderer class - Manages rendering of task lists and individual tasks
 * Handles all DOM manipulation for task display including:
 * - Task list rendering
 * - Individual task HTML generation
 * - Subtask rendering and expansion
 * - Event listener setup for touch/mouse interactions
 * - Move button interactions
 * - Deadline display
 * - Important task styling
 */
class Renderer {
  /**
   * Creates a new Renderer instance
   * @param {DoItTomorrowApp} app - Reference to the main application instance
   */
  constructor(app) {
    this.app = app;
  }

  /**
   * Renders a complete task list with all tasks and subtasks
   * Handles empty state messages, task animations, event listeners, and subtask expansion
   *
   * @param {string} listName - Name of the list to render ('today' or 'tomorrow')
   * @param {Array<Object>} tasks - Array of task objects to render
   */
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
        const totalCompleted = this.app.data.totalCompleted || 0;
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
        if (this.app.devMode) {
          console.log('👆 TASK TOUCHSTART:', {
            taskId: task.id,
            isScrolling: this.app.isScrolling
          });
        }

        taskStartX = e.touches[0].clientX;
        taskStartY = e.touches[0].clientY;
        taskStartTime = Date.now();
        touchHandled = true;

        li.classList.add('button-pressed');
        this.app.startLongPress(task.id, e);
      });

      li.addEventListener('touchmove', (e) => {
        if (taskStartX !== undefined && taskStartY !== undefined) {
          const currentX = e.touches[0].clientX;
          const currentY = e.touches[0].clientY;
          const deltaX = Math.abs(currentX - taskStartX);
          const deltaY = Math.abs(currentY - taskStartY);

          // If we detect scrolling movement, cancel long press
          if (deltaY > 15 || deltaX > 15) {
            if (this.app.devMode) {
              console.log('📱 CANCELLING LONG PRESS: Scroll detected', {
                taskId: task.id,
                deltaX,
                deltaY
              });
            }
            li.classList.remove('button-pressed');
            this.app.endLongPress();
          }
        }
      }, { passive: true });

      li.addEventListener('touchend', (e) => {
        li.classList.remove('button-pressed');
        this.app.endLongPress();

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const endTime = Date.now();

        const deltaX = Math.abs(endX - taskStartX);
        const deltaY = Math.abs(endY - taskStartY);
        const deltaTime = endTime - taskStartTime;

        // Only handle as tap if it's quick with minimal movement
        const isTap = deltaX < 10 && deltaY < 10 && deltaTime < 500;

        if (this.app.devMode) {
          console.log('📱 TASK TOUCHEND:', {
            taskId: task.id,
            deltaX,
            deltaY,
            deltaTime,
            isTap,
            wasLongPress: this.app.wasLongPress,
            willExecute: isTap && !this.app.wasLongPress
          });
        }

        if (isTap && !this.app.wasLongPress) {
          // Create a synthetic event for consistency with existing code
          const syntheticEvent = { type: 'tap', target: e.target };
          this.app.handleTaskClick(task.id, syntheticEvent);
        }

        // Reset touch handled flag after a delay to allow for click events from mouse
        setTimeout(() => {
          touchHandled = false;
        }, 100);
      });

      li.addEventListener('touchcancel', (e) => {
        li.classList.remove('button-pressed');
        this.app.endLongPress();
      });

      // Mouse events for desktop
      li.addEventListener('mousedown', (e) => {
        li.classList.add('button-pressed');
        this.app.startLongPress(task.id, e);
      });
      li.addEventListener('mouseup', () => {
        li.classList.remove('button-pressed');
        this.app.endLongPress();
      });
      li.addEventListener('mouseleave', () => {
        li.classList.remove('button-pressed');
        this.app.endLongPress();
      });
      li.addEventListener('click', (e) => {
        if (this.app.devMode) {
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
          if (this.app.devMode) {
            console.log('🚫 CLICK BLOCKED: Touch event already handled');
          }
          return;
        }

        this.app.handleTaskClick(task.id, e);
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

      // Check if task has children (get ALL children, regardless of list)
      const children = this.app.getChildren(task.id);
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
            this.app.toggleSubtaskExpansion(task.id);
          });
        }
      }

      // Render subtasks if this task has children OR if we're adding a subtask
      if (children.length > 0 || task._addingSubtask) {
        const subtaskContainer = document.createElement('ul');
        subtaskContainer.className = 'subtask-list';
        subtaskContainer.style.display = task.isExpanded ? 'block' : 'none';

        // Sort and render children
        const sortedChildren = this.app.sortTasks(children);
        sortedChildren.forEach(childTask => {
          const childLi = document.createElement('li');
          childLi.className = 'subtask-item task-item';
          if (childTask.completed) childLi.classList.add('completed');
          if (childTask.important) childLi.classList.add('important');
          childLi.setAttribute('data-task-id', childTask.id);
          childLi.setAttribute('data-parent-id', task.id);
          childLi.innerHTML = this.getTaskHTML(childTask, listName);

          // Add unified touch handling for subtasks (long press support)
          let subtaskStartX, subtaskStartY, subtaskStartTime;

          childLi.addEventListener('touchstart', (e) => {
            subtaskStartX = e.touches[0].clientX;
            subtaskStartY = e.touches[0].clientY;
            subtaskStartTime = Date.now();
            childLi.classList.add('button-pressed');
            this.app.startLongPress(childTask.id, e);
          });

          childLi.addEventListener('touchmove', (e) => {
            if (subtaskStartX !== undefined && subtaskStartY !== undefined) {
              const currentX = e.touches[0].clientX;
              const currentY = e.touches[0].clientY;
              const deltaX = Math.abs(currentX - subtaskStartX);
              const deltaY = Math.abs(currentY - subtaskStartY);

              if (deltaY > 15 || deltaX > 15) {
                childLi.classList.remove('button-pressed');
                this.app.endLongPress();
              }
            }
          }, { passive: true });

          childLi.addEventListener('touchend', (e) => {
            childLi.classList.remove('button-pressed');
            this.app.endLongPress();

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();

            const deltaX = Math.abs(endX - subtaskStartX);
            const deltaY = Math.abs(endY - subtaskStartY);
            const deltaTime = endTime - subtaskStartTime;

            const isTap = deltaX < 10 && deltaY < 10 && deltaTime < 500;

            if (isTap && !e.target.closest('.move-icon')) {
              // Check delete mode for the child's actual list (not parent's list)
              if (this.app.deleteMode[childTask.list]) {
                console.log('🐛 [DELETE] Delete mode active, deleting subtask:', childTask.id);
                this.app.deleteTaskWithSubtasks(childTask.id);
                this.app.showNotification('Subtask deleted', 'success');
              } else {
                this.app.completeTask(childTask.id, e);
              }
            }
          });

          // Add click handler for subtask (supports both delete mode and completion)
          childLi.addEventListener('click', (e) => {
            if (!e.target.closest('.move-icon')) {
              // Check delete mode for the child's actual list (not parent's list)
              if (this.app.deleteMode[childTask.list]) {
                console.log('🐛 [DELETE] Delete mode active, deleting subtask:', childTask.id);
                this.app.deleteTaskWithSubtasks(childTask.id);
                this.app.showNotification('Subtask deleted', 'success');
              } else {
                // Normal mode - complete the subtask
                this.app.completeTask(childTask.id, e);
              }
            }
          });

          // Add event listeners for subtask move icons
          const childMoveIcon = childLi.querySelector('.move-icon');
          if (childMoveIcon) {
            childMoveIcon.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopImmediatePropagation();
              const action = childMoveIcon.dataset.action;
              const taskId = childMoveIcon.dataset.taskId;
              if (action === 'push') {
                this.app.pushToTomorrow(taskId);
              } else if (action === 'pull') {
                this.app.pullToToday(taskId);
              }
            });
          }

          subtaskContainer.appendChild(childLi);
        });

        // Add inline input if we're in subtask-adding mode
        if (task._addingSubtask) {
          const inputLi = document.createElement('li');
          inputLi.className = 'subtask-input-container';
          inputLi.innerHTML = `
            <input
              type="text"
              id="subtask-input-${task.id}"
              class="subtask-input"
              placeholder="Add a subtask..."
              maxlength="200"
              autocomplete="off"
            />
          `;

          const input = inputLi.querySelector('input');

          // Handle adding subtask on Enter
          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              const text = input.value.trim();
              if (text) {
                console.log('🐛 [SUBTASK] Adding subtask:', text);
                this.app.addSubtask(task.id, text);
                // Clear input but keep it visible
                input.value = '';
                input.focus();
              }
            }
          });

          // Handle Escape to close the input
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              console.log('🐛 [SUBTASK] Closing subtask input');
              task._addingSubtask = false;
              this.app.save();
              this.app.render();
            }
          });

          subtaskContainer.appendChild(inputLi);
        }

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
            this.app.pushToTomorrow(taskId);
          } else if (action === 'pull') {
            this.app.pullToToday(taskId);
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
          this.app.endLongPress();

          // Add visual pressed state to arrow
          moveIcon.style.opacity = '0.6';

          if (this.app.devMode) {
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

          if (this.app.devMode) {
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
            if (this.app.devMode) {
              console.log('🚫 ARROW BLOCKED: Movement detected');
            }
            return;
          }

          e.preventDefault();
          e.stopImmediatePropagation();

          const action = moveIcon.dataset.action;
          const taskId = moveIcon.dataset.taskId;

          if (this.app.devMode) {
            console.log('✅ ARROW EXECUTED:', { action, taskId });
          }

          if (action === 'push') {
            this.app.pushToTomorrow(taskId);
          } else if (action === 'pull') {
            this.app.pullToToday(taskId);
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

  /**
   * Generates HTML markup for a single task
   * Includes task text, move buttons, and deadline indicators
   *
   * @param {Object} task - Task object to generate HTML for
   * @param {string} task.id - Unique task identifier
   * @param {string} task.text - Task text content
   * @param {boolean} task.completed - Whether task is completed
   * @param {string} [task.deadline] - Optional deadline date (ISO format)
   * @param {string} listName - Name of the list the task belongs to ('today' or 'tomorrow')
   * @returns {string} HTML string for the task
   */
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
      <span class="task-text">${Utils.escapeHtml(task.text)}${deadlineHTML}</span>
      <div class="task-actions">
        ${moveBtnHTML}
      </div>
    `;
  }
}

// Freeze the prototype to prevent modifications
Object.freeze(Renderer.prototype);
