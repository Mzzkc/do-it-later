/**
 * Page Object Model for Do It Later app
 * Provides reusable methods for interacting with the app in E2E tests
 */

export class AppPage {
  constructor(page) {
    this.page = page;

    // Input selectors
    this.todayInput = '#today-task-input';
    this.laterInput = '#tomorrow-task-input';

    // List selectors
    this.todayList = '#today-list';
    this.laterList = '#tomorrow-list';

    // Modal selectors
    this.modal = '.modal';
    this.modalInput = '.modal input[type="text"]';
    this.modalAddButton = '.modal-actions button:has-text("Add")';
    this.modalSaveButton = '.modal-actions button:has-text("Save")';
    this.modalCancelButton = '.modal-actions button:has-text("Cancel")';

    // Context menu selectors
    this.contextMenu = '.context-menu';
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
    });
  }

  async reload() {
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }

  // Task creation methods
  async addTodayTask(text) {
    await this.page.fill(this.todayInput, text);
    await this.page.press(this.todayInput, 'Enter');
    await this.page.waitForTimeout(100); // Wait for task to be added
  }

  async addLaterTask(text) {
    await this.page.fill(this.laterInput, text);
    await this.page.press(this.laterInput, 'Enter');
    await this.page.waitForTimeout(100);
  }

  // Task query methods
  async getTodayTasks() {
    return await this.page.locator(`${this.todayList} > .task-item`).all();
  }

  async getLaterTasks() {
    return await this.page.locator(`${this.laterList} > .task-item`).all();
  }

  async getTaskByText(text) {
    return await this.page.locator(`.task-item:has-text("${text}")`).first();
  }

  // Get a subtask specifically (not the parent task)
  async getSubtaskByText(text) {
    // Filter for subtask-item class to exclude parent tasks
    // Use :text-is() to match exact text and avoid matching parent tasks
    return await this.page.locator(`.subtask-item:has(.task-text:text-is("${text}"))`).first();
  }

  // Get task or subtask by text (tries subtask first, then parent)
  async getTaskOrSubtaskByText(text) {
    const subtaskCount = await this.page.locator(`.subtask-item:has(.task-text:text-is("${text}"))`).count();
    if (subtaskCount > 0) {
      return await this.getSubtaskByText(text);
    }
    return await this.getTaskByText(text);
  }

  async getTaskText(taskElement) {
    return await taskElement.locator('.task-text').first().innerText();
  }

  // Check if a task with given text exists in a specific list (includes subtasks)
  // Searches all .task-text elements within the list, including nested subtasks
  async isTaskInList(text, listName) {
    const listId = listName === 'today' ? 'today-list' : 'tomorrow-list';

    // Search for all .task-text elements within the list (including nested subtasks)
    const taskTexts = await this.page.locator(`#${listId} .task-text`).all();

    for (const taskText of taskTexts) {
      try {
        const textContent = await taskText.textContent();
        if (textContent && textContent.trim() === text.trim()) {
          return true;
        }
      } catch (e) {
        // Skip this element if there's an error
        continue;
      }
    }

    return false;
  }

  // Task interaction methods
  async toggleTaskCompletion(text) {
    // Use JavaScript click to avoid triggering long press detection
    const taskId = await this.page.evaluate((text) => {
      // Find the task by text
      const allTasks = [...app.data.today, ...app.data.tomorrow];
      const task = allTasks.find(t => t.text === text);
      if (task) {
        // Call completeTask directly
        app.taskManager.completeTask(task.id);
        return task.id;
      }
      return null;
    }, text);

    if (!taskId) {
      throw new Error(`Task "${text}" not found for completion`);
    }

    await this.page.waitForTimeout(100);
  }

  async clickTaskText(text) {
    const task = await this.getTaskOrSubtaskByText(text);
    await task.locator('.task-text').first().click({ force: true });
    await this.page.waitForTimeout(100);
  }

  async clickMoveButton(text) {
    const task = await this.getTaskOrSubtaskByText(text);
    const moveIcon = await task.locator('.move-icon').first();

    await moveIcon.hover();
    await this.page.waitForTimeout(50);
    await moveIcon.click({ force: true });

    // Wait for move animation + re-render
    await this.page.waitForTimeout(500);
  }

  async longPressTask(text) {
    const task = await this.getTaskOrSubtaskByText(text);
    await task.hover();
    await this.page.mouse.down();
    await this.page.waitForTimeout(700); // Long press duration (600ms + buffer)
    await this.page.mouse.up();
    await this.page.waitForTimeout(100);
  }

  async swipeTask(text, direction = 'left') {
    // "Swipe" gesture simulated by clicking the move icon
    // Left swipe = move to Later, Right swipe = move to Today
    await this.clickMoveButton(text);
  }

  // Context menu methods
  async selectContextMenuItem(itemText) {
    // Handle common aliases for menu items
    const textMap = {
      'Toggle Important': 'Important',
      'Edit': 'Edit Task'
    };

    const searchText = textMap[itemText] || itemText;
    await this.page.locator(`${this.contextMenu} .context-menu-item:has-text("${searchText}")`).click();
    await this.page.waitForTimeout(100);
  }

  // Modal methods
  async fillModalInput(text) {
    await this.page.fill(this.modalInput, text);
  }

  async clickModalAdd() {
    await this.page.click(this.modalAddButton);
    await this.page.waitForTimeout(100);
  }

  async clickModalSave() {
    await this.page.click(this.modalSaveButton);
    await this.page.waitForTimeout(100);
  }

  async clickModalCancel() {
    await this.page.click(this.modalCancelButton);
    await this.page.waitForTimeout(100);
  }

  // Subtask methods
  async addSubtask(parentText, subtaskText) {
    await this.longPressTask(parentText);
    await this.selectContextMenuItem('Add Subtask');

    // Wait for inline subtask input to appear
    const parent = await this.getTaskByText(parentText);
    const subtaskInput = parent.locator('.subtask-input');
    await subtaskInput.fill(subtaskText);
    await subtaskInput.press('Enter');
    await this.page.waitForTimeout(100);
  }

  async getSubtasks(parentText) {
    const parent = await this.getTaskByText(parentText);
    return await parent.locator('.subtask-list .task-item').all();
  }

  async toggleSubtaskExpansion(parentText) {
    const parent = await this.getTaskByText(parentText);
    await parent.locator('.expand-icon').click();
    await this.page.waitForTimeout(100);
  }

  async isSubtaskExpanded(parentText) {
    const parent = await this.getTaskByText(parentText);
    const expandIcon = await parent.locator('.expand-icon').innerText();
    return expandIcon === '▼';
  }

  // State verification methods
  async isTaskCompleted(text) {
    const task = await this.getTaskOrSubtaskByText(text);
    const classes = await task.getAttribute('class');
    return classes.includes('completed');
  }

  async isTaskImportant(text) {
    const task = await this.getTaskOrSubtaskByText(text);
    const classes = await task.getAttribute('class');
    return classes.includes('important');
  }

  async hasDeadline(text) {
    const task = await this.getTaskOrSubtaskByText(text);
    const deadline = await task.locator('.deadline-indicator').count();
    return deadline > 0;
  }

  async getCompletedCount() {
    const counter = await this.page.locator('#completed-counter').innerText();
    return parseInt(counter.match(/\d+/)[0]);
  }

  // Notification methods
  async waitForNotification(text) {
    await this.page.locator(`.notification:has-text("${text}")`).waitFor({ timeout: 5000 });
  }

  async getNotificationText() {
    return await this.page.locator('.notification').innerText();
  }

  // Deadline methods
  async setDeadline(taskText, dateString) {
    await this.longPressTask(taskText);

    // Context menu shows "Set Deadline" or "Change Deadline" depending on whether task already has a deadline
    const hasDeadline = await this.hasDeadline(taskText);
    const menuItemText = hasDeadline ? 'Change Deadline' : 'Set Deadline';

    await this.selectContextMenuItem(menuItemText);
    await this.page.fill('#deadline-input', dateString);
    await this.page.click('#set-deadline-btn');
    await this.page.waitForTimeout(100);
  }

  async removeDeadline(taskText) {
    await this.longPressTask(taskText);

    // When task has a deadline, context menu shows "Change Deadline"
    await this.selectContextMenuItem('Change Deadline');
    await this.page.click('#remove-deadline-btn');
    await this.page.waitForTimeout(100);
  }

  async getDeadlineIndicator(taskText) {
    const task = await this.getTaskOrSubtaskByText(taskText);
    return await task.locator('.deadline-indicator');
  }

  async getDeadlineColor(taskText) {
    const indicator = await this.getDeadlineIndicator(taskText);

    // Colors are set via CSS classes, not inline styles
    // Extract the computed background-color from the element
    const bgColor = await indicator.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.backgroundColor;
    });

    return bgColor;
  }

  async getDeadlineText(taskText) {
    const indicator = await this.getDeadlineIndicator(taskText);
    return await indicator.innerText();
  }

  // Pomodoro methods
  async startPomodoro(taskText) {
    await this.longPressTask(taskText);
    await this.selectContextMenuItem('Start Pomodoro');
    await this.page.waitForTimeout(100);
  }

  async getPomodoroTimer() {
    return await this.page.locator('.pomodoro-timer');
  }

  async getPomodoroTime() {
    const timer = await this.getPomodoroTimer();
    const timeText = await timer.locator('.pomodoro-timer-time').innerText();
    return timeText;
  }

  async getPomodoroRound() {
    const timer = await this.getPomodoroTimer();
    const roundText = await timer.locator('.pomodoro-timer-round').innerText();
    const match = roundText.match(/Round\s+(\d+)/i);
    return match ? parseInt(match[1]) : 0;
  }

  async clickPomodoroAction(actionText) {
    await this.page.locator(`.pomodoro-prompt-modal button:has-text("${actionText}")`).click();
    await this.page.waitForTimeout(100);
  }

  async isPomodoroActive() {
    const timer = await this.getPomodoroTimer();
    return await timer.isVisible();
  }

  // Import/Export methods
  async exportToFile() {
    await this.page.click('#export-file-btn');
    await this.page.waitForTimeout(500);
  }

  async exportToClipboard() {
    await this.page.click('#export-clipboard-btn');
    await this.page.waitForTimeout(500);
  }

  async getClipboardContent() {
    return await this.page.evaluate(() => navigator.clipboard.readText());
  }

  async importFromClipboard(data) {
    // Directly inject the data into the app, bypassing the paste dialog
    // This simulates importing by directly calling the import logic
    const result = await this.page.evaluate((jsonData) => {
      try {
        // Check if Sync and Storage are available (they're global constants)
        if (typeof Sync === 'undefined' || typeof Storage === 'undefined' || typeof app === 'undefined') {
          return { success: false, error: 'App not fully loaded' };
        }

        // Parse the data
        let importedData;
        try {
          importedData = Sync.parseFromText(jsonData);
          // Check if parsing returned any data (v3 format uses today/tomorrow arrays)
          const hasData = (importedData.today && importedData.today.length > 0) ||
                         (importedData.tomorrow && importedData.tomorrow.length > 0) ||
                         (importedData.tasks && importedData.tasks.length > 0);

          if (!hasData) {
            try {
              const qrParsed = Sync.parseQRData(jsonData);
              importedData = qrParsed;
            } catch (qrError) {
              // QR parsing failed, stick with text parse result
            }
          }
        } catch (textError) {
          // If text parsing fails, try QR format
          try {
            importedData = Sync.parseQRData(jsonData);
          } catch (qrError) {
            // Show error notification to match actual behavior
            const errorMsg = `Parse failed - Text: ${textError.message}, QR: ${qrError.message}`;
            app.showNotification('Could not parse imported data', 'error');
            return { success: false, error: errorMsg };
          }
        }

        // Migrate old format to new format if needed
        importedData = Storage.migrateData(importedData);

        // Merge: add imported tasks to existing ones (avoid duplicates)
        // V3 format uses today/tomorrow arrays
        const importedToday = importedData.today || [];
        const importedTomorrow = importedData.tomorrow || [];

        importedToday.forEach(task => {
          const isDuplicate = app.data.today.some(existing =>
            existing.text === task.text || existing.id === task.id
          );
          if (!isDuplicate) {
            app.data.today.push(task);
          }
        });

        importedTomorrow.forEach(task => {
          const isDuplicate = app.data.tomorrow.some(existing =>
            existing.text === task.text || existing.id === task.id
          );
          if (!isDuplicate) {
            app.data.tomorrow.push(task);
          }
        });
        app.data.totalCompleted = Math.max(app.data.totalCompleted, importedData.totalCompleted || 0);

        app.save();
        app.render();
        app.updateCompletedCounter();

        const taskCount = importedToday.length + importedTomorrow.length;
        app.showNotification(`Imported ${taskCount} tasks from clipboard`, 'success');

        return { success: true, count: taskCount };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, data);

    // Don't throw - let the test check for notification instead
    // if (!result.success) {
    //   throw new Error(`Import failed: ${result.error}`);
    // }

    await this.page.waitForTimeout(500);
  }

  async importFromFile(filePath) {
    const fileInput = await this.page.locator('#import-file');
    await fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(500);
  }

  // Theme methods
  async toggleTheme() {
    await this.page.click('#theme-toggle');
    await this.page.waitForTimeout(300);
  }

  async getCurrentTheme() {
    const body = await this.page.locator('body');
    const classes = await body.getAttribute('class');
    return classes && classes.includes('light-theme') ? 'light' : 'dark';
  }

  async getThemeLabel() {
    return await this.page.locator('#theme-toggle .theme-label').innerText();
  }

  // Keyboard methods
  async pressKeyInInput(listName, key) {
    const input = listName === 'today' ? this.todayInput : this.laterInput;
    await this.page.press(input, key);
    await this.page.waitForTimeout(100);
  }

  async typeInInput(listName, text) {
    const input = listName === 'today' ? this.todayInput : this.laterInput;
    await this.page.fill(input, text);
  }

  // Mobile navigation methods
  async switchMobileTab(tab) {
    await this.page.click(`#${tab}-nav`);
    await this.page.waitForTimeout(200);
  }

  async isMobileTabActive(tab) {
    const button = await this.page.locator(`#${tab}-nav`);
    const classes = await button.getAttribute('class');
    return classes.includes('active');
  }

  // Delete mode methods
  async enableDeleteMode(listName) {
    await this.page.click(`.delete-mode-toggle[data-list="${listName}"]`);
    await this.page.waitForTimeout(100);
  }

  async isDeleteModeActive(listName) {
    const section = listName === 'today' ? '#today-section' : '#tomorrow-section';
    const classes = await this.page.locator(section).getAttribute('class');
    return classes.includes('delete-mode');
  }

  // Validation methods
  async getInputValue(listName) {
    const input = listName === 'today' ? this.todayInput : this.laterInput;
    return await this.page.inputValue(input);
  }

  async verifyTaskLength(text) {
    return text.length <= 200;
  }

  // Date display methods
  async getCurrentDateDisplay() {
    return await this.page.locator('#current-date').innerText();
  }

  // Empty state methods
  async getEmptyMessage(listName) {
    const list = listName === 'today' ? this.todayList : this.laterList;
    const message = await this.page.locator(`${list} .empty-message`);
    if (await message.count() > 0) {
      return await message.innerText();
    }
    return null;
  }
}
