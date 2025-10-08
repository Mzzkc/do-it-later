// Do It (Later) - Renderer Module
// Handles all rendering and HTML generation for tasks and lists
// PURE PRESENTATION LAYER - No event handlers, no business logic

/**
 * Renderer class - Pure view layer for task rendering
 * Responsible for:
 * - Converting data to HTML
 * - DOM manipulation for display
 * - Visual styling and animations
 *
 * NOT responsible for:
 * - Event handling (see TaskController)
 * - Business logic (see TaskManager)
 * - Data transformation (see TaskManager.getRenderData)
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
   * Expects render-ready data from TaskManager.getRenderData()
   *
   * @param {string} listName - Name of the list to render ('today' or 'tomorrow')
   * @param {Array<Object>} renderData - Pre-sorted, hierarchical task data
   */
  renderList(listName, renderData) {
    console.log(`🐛 [RENDER] renderList called for ${listName}`, {
      totalTasks: renderData.length,
      importantCount: renderData.filter(t => t.important).length,
      tasks: renderData.map(t => ({ id: t.id, text: t.text.substring(0, 20), important: t.important, completed: t.completed }))
    });

    const listEl = document.getElementById(`${listName}-list`);
    if (!listEl) return;

    listEl.innerHTML = '';

    if (renderData.length === 0) {
      listEl.appendChild(this.createEmptyMessage(listName));
      return;
    }

    renderData.forEach((task, index) => {
      const li = this.createTaskElement(task, listName);
      listEl.appendChild(li);

      console.log(`🐛 [RENDER] Task ${index} element:`, {
        id: task.id,
        className: li.className,
        important: task.important
      });
    });
  }

  /**
   * Create empty state message for list
   * @param {string} listName - Name of the list
   * @returns {HTMLElement} Empty message element
   */
  createEmptyMessage(listName) {
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

    return emptyMsg;
  }

  /**
   * Create complete task element with all children
   * @param {Object} task - Render-ready task object
   * @param {string} listName - Name of the list
   * @returns {HTMLElement} Complete task element
   */
  createTaskElement(task, listName) {
    const li = document.createElement('li');
    li.className = this.getTaskClasses(task);
    li.setAttribute('data-task-id', task.id);

    // Handle move-in animation
    if (task._justMoved) {
      li.classList.add(`moving-in-${task._justMoved}`);

      setTimeout(() => {
        const element = document.querySelector(`[data-task-id="${task.id}"]`);
        if (element) {
          element.classList.remove(`moving-in-${task._justMoved}`);
        }
      }, 300);
    }

    // Wrap task content in a container to fix flexbox layout issue
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    taskContent.innerHTML = this.getTaskHTML(task, listName);
    li.appendChild(taskContent);

    // Render children if present OR if adding a subtask
    if (task.hasChildren || task._addingSubtask) {
      const subtaskContainer = this.createSubtaskContainer(task, listName);
      li.appendChild(subtaskContainer);
    }

    return li;
  }

  /**
   * Get CSS classes for task element
   * @param {Object} task - Task object
   * @returns {string} Space-separated class names
   */
  getTaskClasses(task) {
    const classes = ['task-item'];
    if (task.completed) classes.push('completed');
    if (task.important) classes.push('important');
    return classes.join(' ');
  }

  /**
   * Create subtask container with all children
   * @param {Object} task - Parent task with children
   * @param {string} listName - Name of the list
   * @returns {HTMLElement} Subtask container element
   */
  createSubtaskContainer(task, listName) {
    const container = document.createElement('ul');
    container.className = 'subtask-list';
    container.style.display = task.isExpanded ? 'block' : 'none';

    // Render each child
    task.children.forEach(child => {
      const childLi = this.createSubtaskElement(child, listName);
      container.appendChild(childLi);
    });

    // Add subtask input if needed
    if (task._addingSubtask) {
      const inputLi = this.createSubtaskInput(task.id);
      container.appendChild(inputLi);
    }

    return container;
  }

  /**
   * Create subtask element
   * @param {Object} child - Child task object
   * @param {string} listName - Name of the list
   * @returns {HTMLElement} Subtask element
   */
  createSubtaskElement(child, listName) {
    const childLi = document.createElement('li');
    childLi.className = 'subtask-item task-item';
    if (child.completed) childLi.classList.add('completed');
    if (child.important) childLi.classList.add('important');
    childLi.setAttribute('data-task-id', child.id);

    // Wrap subtask content in a container to fix flexbox layout issue
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    taskContent.innerHTML = this.getTaskHTML(child, listName);
    childLi.appendChild(taskContent);

    return childLi;
  }

  /**
   * Create subtask input element
   * @param {string} parentId - Parent task ID
   * @returns {HTMLElement} Input element
   */
  createSubtaskInput(parentId) {
    const inputLi = document.createElement('li');
    inputLi.className = 'subtask-input-container';
    inputLi.innerHTML = `
      <input
        type="text"
        class="subtask-input"
        placeholder="Add a subtask..."
        data-parent-id="${parentId}"
        id="subtask-input-${parentId}"
      />
    `;
    return inputLi;
  }

  /**
   * Generate HTML markup for a task
   * @param {Object} task - Task object
   * @param {string} listName - Name of the list
   * @returns {string} HTML string
   */
  getTaskHTML(task, listName) {
    // Expand/collapse icon
    const expandIcon = task.hasChildren ?
      `<span class="expand-icon" data-task-id="${task.id}">${task.isExpanded ? '▼' : '▶'}</span>` : '';

    // Movement button
    const moveBtnHTML = task.completed ? '' :
      `<span class="move-icon" data-action="${task.moveAction}" data-task-id="${task.id}" title="${task.moveAction === 'push' ? 'Push to Later' : 'Pull to Today'}">${task.moveIcon}</span>`;

    // Deadline indicator
    const deadlineHTML = this.getDeadlineHTML(task.deadline);

    return `
      ${expandIcon}
      <span class="task-text">${Utils.escapeHtml(task.text)}${deadlineHTML}</span>
      <div class="task-actions">
        ${moveBtnHTML}
      </div>
    `;
  }

  /**
   * Generate deadline HTML indicator
   * @param {string|null} deadline - ISO date string or null
   * @returns {string} HTML string for deadline indicator
   */
  getDeadlineHTML(deadline) {
    if (!deadline) return '';

    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDay = new Date(deadline);
    deadlineDay.setHours(0, 0, 0, 0);

    const daysUntil = Math.ceil((deadlineDay - today) / (1000 * 60 * 60 * 24));

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

    return `<span class="${deadlineClass}" title="${deadlineDate.toLocaleDateString()}">${deadlineText}</span>`;
  }
}

// Freeze the prototype to prevent modifications
Object.freeze(Renderer.prototype);
