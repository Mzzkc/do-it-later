// Do It (Later) - Deadline Picker Module
// Handles deadline selection UI for tasks

class DeadlinePicker {
  constructor(app) {
    this.app = app;
  }

  /**
   * Show deadline picker modal
   * @param {string} taskId - Task ID to set deadline for
   */
  show(taskId) {
    const taskInfo = this.app.taskManager.findTask(taskId);
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
    modal.id = 'deadline-picker';
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
        ${currentDeadline ? '<button id="remove-deadline-btn" style="padding: 10px 20px; border: 1px solid #dc2626; background: transparent; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Clear</button>' : ''}
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
        this.setDeadline(taskId, deadline);
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
        this.setDeadline(taskId, null);
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

  /**
   * Set task deadline
   * @param {string} taskId - Task ID
   * @param {string|null} deadline - ISO date string or null to remove
   */
  setDeadline(taskId, deadline) {
    // Find the actual task object to update
    const actualTask = this.app.taskManager.findTaskById(taskId);

    if (!actualTask) return;

    if (deadline) {
      actualTask.deadline = deadline;

      // If deadline is within 3 days, mark as important
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const deadlineDate = new Date(deadline);

      if (deadlineDate <= threeDaysFromNow && !actualTask.important) {
        actualTask.important = true;
      }

      this.app.showNotification(`Deadline set for ${new Date(deadline).toLocaleDateString()}`, Config.NOTIFICATION_TYPES.SUCCESS);
    } else {
      delete actualTask.deadline;
      // Don't auto-remove importance when removing deadline
      this.app.showNotification('Deadline removed', Config.NOTIFICATION_TYPES.SUCCESS);
    }

    // Rebuild trees after flat array modification (no count reinit - that would reset completion state)
    this.app.taskManager.buildTreesFromFlatData();

    this.app.save();
    this.app.render();
  }
}

// Freeze to prevent modifications
Object.freeze(DeadlinePicker.prototype);
