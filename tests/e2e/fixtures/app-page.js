/**
 * Page Object Model for Do It Later app
 * Provides reusable methods for interacting with the app in E2E tests
 */

export class AppPage {
  constructor(page) {
    this.page = page;

    // Input selectors
    this.todayInput = 'input[placeholder*="Add to Today"]';
    this.laterInput = 'input[placeholder*="Add to Later"]';

    // List selectors
    this.todayList = '#today-list';
    this.laterList = '#later-list';

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
    return await this.page.locator(`${this.todayList} .task-item`).all();
  }

  async getLaterTasks() {
    return await this.page.locator(`${this.laterList} .task-item`).all();
  }

  async getTaskByText(text) {
    return await this.page.locator(`.task-item:has-text("${text}")`).first();
  }

  async getTaskText(taskElement) {
    return await taskElement.locator('.task-text').innerText();
  }

  // Task interaction methods
  async toggleTaskCompletion(text) {
    const task = await this.getTaskByText(text);
    await task.locator('.task-checkbox').click();
    await this.page.waitForTimeout(100);
  }

  async clickTaskText(text) {
    const task = await this.getTaskByText(text);
    await task.locator('.task-text').click();
    await this.page.waitForTimeout(100);
  }

  async clickMoveButton(text) {
    const task = await this.getTaskByText(text);
    await task.locator('.move-task').click();
    await this.page.waitForTimeout(100);
  }

  async longPressTask(text) {
    const task = await this.getTaskByText(text);
    await task.hover();
    await this.page.mouse.down();
    await this.page.waitForTimeout(700); // Long press duration (600ms + buffer)
    await this.page.mouse.up();
    await this.page.waitForTimeout(100);
  }

  async swipeTask(text, direction = 'left') {
    const task = await this.getTaskByText(text);
    const box = await task.boundingBox();

    const startX = direction === 'left' ? box.x + box.width - 10 : box.x + 10;
    const endX = direction === 'left' ? box.x + 10 : box.x + box.width - 10;
    const y = box.y + box.height / 2;

    await this.page.mouse.move(startX, y);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, y, { steps: 10 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(100);
  }

  // Context menu methods
  async selectContextMenuItem(itemText) {
    await this.page.locator(`${this.contextMenu} .menu-item:has-text("${itemText}")`).click();
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
    await this.fillModalInput(subtaskText);
    await this.clickModalAdd();
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
    const task = await this.getTaskByText(text);
    return await task.locator('.task-checkbox').isChecked();
  }

  async isTaskImportant(text) {
    const task = await this.getTaskByText(text);
    const classes = await task.getAttribute('class');
    return classes.includes('important');
  }

  async hasDeadline(text) {
    const task = await this.getTaskByText(text);
    const deadline = await task.locator('.deadline-indicator').count();
    return deadline > 0;
  }

  async getCompletedCount() {
    const counter = await this.page.locator('.completed-counter').innerText();
    return parseInt(counter.match(/\d+/)[0]);
  }

  // Notification methods
  async waitForNotification(text) {
    await this.page.locator(`.notification:has-text("${text}")`).waitFor({ timeout: 5000 });
  }

  async getNotificationText() {
    return await this.page.locator('.notification').innerText();
  }
}
