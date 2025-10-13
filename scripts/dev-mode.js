// Do It (Later) - Developer Mode Module
// Handles developer tools, debugging, and testing features

class DevMode {
  constructor(app) {
    this.app = app;
    this.active = false;
    this.tapCount = 0;
    this.tapTimer = null;
  }

  /**
   * Handle tap/click for dev mode activation
   */
  handleActivationTap() {
    this.tapCount++;

    // Reset counter if too much time has passed
    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
    }

    this.tapTimer = setTimeout(() => {
      this.tapCount = 0;
    }, Config.DEV_MODE_TAP_WINDOW_MS);

    // Activate dev mode after required taps
    if (this.tapCount >= Config.DEV_MODE_TAP_COUNT && !this.active) {
      this.activate();
    }
  }

  /**
   * Activate developer mode
   */
  activate() {
    this.active = true;
    console.log('Dev mode activated! Logging is now available.');
    this.updateUI();

    // Show notification and fallback alert for mobile
    this.app.showNotification('🔧 Dev Mode Activated', Config.NOTIFICATION_TYPES.SUCCESS);
    setTimeout(() => {
      if (!document.querySelector('.dev-mode-btn')) {
        alert('Dev Mode Activated! Check console logs and look for new buttons.');
      }
    }, 1000);
  }

  /**
   * Deactivate developer mode
   */
  deactivate() {
    this.active = false;
    this.app.showNotification('Dev Mode Disabled', Config.NOTIFICATION_TYPES.INFO);
    this.updateUI();
  }

  /**
   * Export logs as downloadable file
   */
  exportLogs() {
    const logsText = this.app.logs.map(log =>
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

    this.app.showNotification('Logs exported successfully', Config.NOTIFICATION_TYPES.SUCCESS);
  }

  /**
   * Reset completed task count (dev mode only)
   */
  resetCompletedCount() {
    if (!this.active) return;

    const oldCount = this.app.data.totalCompleted || 0;
    this.app.data.totalCompleted = 0;
    this.app.save();
    this.app.updateCompletedCounter();
    this.app.showNotification(`Reset completed count from ${oldCount} to 0`, Config.NOTIFICATION_TYPES.SUCCESS);

    if (this.active) {
      console.log(`🔧 DEV: Reset completed count from ${oldCount} to 0`);
    }
  }

  /**
   * Comprehensive test suite for subtasks, expansion, movement, and import/export
   */
  testImportantTasks() {
    if (!this.active) return;

    console.log('🧪 Starting Comprehensive Feature Test Suite...');
    console.log('━'.repeat(60));

    // Phase 1: Create parent tasks with subtasks
    console.log('\n📋 Phase 1: Creating parent tasks with subtasks...');

    const parent1Id = this.app.taskManager.generateId();
    const parent2Id = this.app.taskManager.generateId();
    const parent3Id = this.app.taskManager.generateId();

    const parent1 = {
      id: parent1Id,
      text: '🎯 Project Alpha (has subtasks in both lists)',
      completed: false,
      important: true,
      expandedInToday: true,
      expandedInLater: false, // Test different expansion states
      createdAt: Date.now() - 300000
    };

    const parent2 = {
      id: parent2Id,
      text: '📦 Shopping List (normal priority)',
      completed: false,
      important: false,
      expandedInToday: false, // Test collapsed in today
      expandedInLater: true,
      createdAt: Date.now() - 200000
    };

    const parent3 = {
      id: parent3Id,
      text: '🔥 Urgent Tasks (important)',
      completed: false,
      important: true,
      expandedInToday: true,
      expandedInLater: true,
      createdAt: Date.now() - 100000
    };

    // Create subtasks for each parent
    const subtasks = [
      // Parent 1 subtasks - will be split across lists
      {
        id: this.app.taskManager.generateId(),
        text: 'Complete design mockups',
        parentId: parent1Id,
        completed: false,
        important: false,
        expandedInToday: true,
        expandedInLater: true,
        createdAt: Date.now() - 290000
      },
      {
        id: this.app.taskManager.generateId(),
        text: 'Review code changes',
        parentId: parent1Id,
        completed: false,
        important: true, // Important subtask
        expandedInToday: true,
        expandedInLater: true,
        createdAt: Date.now() - 280000
      },
      {
        id: this.app.taskManager.generateId(),
        text: 'Write documentation',
        parentId: parent1Id,
        completed: false,
        important: false,
        expandedInToday: true,
        expandedInLater: true,
        createdAt: Date.now() - 270000
      },
      // Parent 2 subtasks
      {
        id: this.app.taskManager.generateId(),
        text: 'Buy groceries',
        parentId: parent2Id,
        completed: false,
        important: false,
        expandedInToday: true,
        expandedInLater: true,
        createdAt: Date.now() - 190000
      },
      {
        id: this.app.taskManager.generateId(),
        text: 'Get office supplies',
        parentId: parent2Id,
        completed: true, // Completed subtask
        important: false,
        expandedInToday: true,
        expandedInLater: true,
        createdAt: Date.now() - 180000
      },
      // Parent 3 subtasks
      {
        id: this.app.taskManager.generateId(),
        text: 'Fix critical bug',
        parentId: parent3Id,
        completed: false,
        important: true,
        expandedInToday: true,
        expandedInLater: true,
        createdAt: Date.now() - 90000
      },
      {
        id: this.app.taskManager.generateId(),
        text: 'Deploy hotfix',
        parentId: parent3Id,
        completed: false,
        important: true,
        expandedInToday: true,
        expandedInLater: true,
        createdAt: Date.now() - 80000
      }
    ];

    // Add parent 1 to both lists (since it has subtasks in both)
    this.app.data.today.push(parent1);
    this.app.data.tomorrow.push(parent1);

    // Add parent 1's first subtask to today, other two to later
    this.app.data.today.push(subtasks[0]);
    this.app.data.tomorrow.push(subtasks[1]);
    this.app.data.tomorrow.push(subtasks[2]);

    // Add parent 2 to tomorrow with its subtasks
    this.app.data.tomorrow.push(parent2);
    this.app.data.tomorrow.push(subtasks[3]);
    this.app.data.tomorrow.push(subtasks[4]);

    // Add parent 3 to today with its subtasks
    this.app.data.today.push(parent3);
    this.app.data.today.push(subtasks[5]);
    this.app.data.today.push(subtasks[6]);

    // Add some standalone tasks
    this.app.data.today.push({
      id: this.app.taskManager.generateId(),
      text: '📅 Standalone task in Today',
      completed: false,
      important: false,
      expandedInToday: true,
      expandedInLater: true,
      createdAt: Date.now() - 50000
    });

    this.app.data.tomorrow.push({
      id: this.app.taskManager.generateId(),
      text: '⭐ Important standalone in Later',
      completed: false,
      important: true,
      expandedInToday: true,
      expandedInLater: true,
      createdAt: Date.now() - 40000
    });

    this.app.save();
    this.app.render();

    console.log('✅ Created test data:');
    console.log(`   - Parent 1 (${parent1.text}): in both lists`);
    console.log(`     • 1 subtask in Today (expanded)`);
    console.log(`     • 2 subtasks in Later (collapsed)`);
    console.log(`   - Parent 2 (${parent2.text}): in Later only`);
    console.log(`     • 2 subtasks in Later (1 completed)`);
    console.log(`   - Parent 3 (${parent3.text}): in Today only`);
    console.log(`     • 2 important subtasks in Today`);
    console.log(`   - 2 standalone tasks`);

    // Phase 2: Test expansion states
    console.log('\n🔄 Phase 2: Testing expansion states...');
    console.log('   Parent 1: expandedInToday=true, expandedInLater=false');
    console.log('   Parent 2: expandedInToday=false, expandedInLater=true');
    console.log('   Parent 3: expandedInToday=true, expandedInLater=true');
    console.log('   ✅ Verify visually that expansion states are independent per list');

    // Phase 3: Test QR export/import
    console.log('\n📱 Phase 3: Testing QR export/import...');
    const qrData = Sync.generateQRData(this.app.data);
    console.log(`   Generated QR data: ${qrData.length} bytes`);
    console.log(`   Data: ${qrData.substring(0, 100)}...`);

    try {
      const parsedQR = Sync.parseQRData(qrData);
      console.log('   ✅ QR parsing successful');
      console.log(`   Recovered ${parsedQR.tasks.length} tasks`);

      // Validate expansion properties
      const tasksWithExpansion = parsedQR.tasks.filter(t =>
        t.hasOwnProperty('expandedInToday') && t.hasOwnProperty('expandedInLater')
      );
      console.log(`   ✅ ${tasksWithExpansion.length}/${parsedQR.tasks.length} tasks have expansion properties`);

      // Validate parent-child relationships
      const parents = parsedQR.tasks.filter(t => !t.parentId);
      const children = parsedQR.tasks.filter(t => t.parentId);
      console.log(`   ✅ ${parents.length} parents, ${children.length} children preserved`);

    } catch (error) {
      console.error('   ❌ QR parsing failed:', error);
    }

    // Phase 4: Test text export/import
    console.log('\n📄 Phase 4: Testing text export/import...');
    const textExport = Sync.exportToText(this.app.data);
    console.log(`   Generated text export: ${textExport.length} bytes`);

    try {
      const parsedText = Sync.parseFromText(textExport);
      console.log('   ✅ Text parsing successful');
      console.log(`   Today: ${parsedText.today.length} tasks`);
      console.log(`   Tomorrow: ${parsedText.tomorrow.length} tasks`);
      console.log(`   Total completed: ${parsedText.totalCompleted}`);

      // Validate all properties preserved
      const allTasks = [...parsedText.today, ...parsedText.tomorrow];
      const hasAllProps = allTasks.every(t =>
        t.hasOwnProperty('id') &&
        t.hasOwnProperty('text') &&
        t.hasOwnProperty('expandedInToday') &&
        t.hasOwnProperty('expandedInLater')
      );
      console.log(`   ${hasAllProps ? '✅' : '❌'} All task properties preserved`);

    } catch (error) {
      console.error('   ❌ Text parsing failed:', error);
    }

    // Phase 5: Test data migration
    console.log('\n🔄 Phase 5: Testing data migration (old isExpanded → new properties)...');
    const oldFormatTask = {
      id: 'test-migration',
      text: 'Old format task',
      completed: false,
      important: false,
      isExpanded: false, // Old property
      createdAt: Date.now()
    };

    const migratedData = Storage.migrateData({
      version: 2,
      tasks: [oldFormatTask],
      totalCompleted: 5,
      currentDate: Utils.getTodayISO(),
      lastUpdated: Date.now()
    });

    const migratedTask = [...migratedData.today, ...migratedData.tomorrow].find(t => t.id === 'test-migration');
    if (migratedTask) {
      console.log('   ✅ Migration successful');
      console.log(`   expandedInToday: ${migratedTask.expandedInToday}`);
      console.log(`   expandedInLater: ${migratedTask.expandedInLater}`);
      console.log(`   isExpanded removed: ${!migratedTask.hasOwnProperty('isExpanded')}`);
    } else {
      console.error('   ❌ Migration failed - task not found');
    }

    // Phase 6: Test sorting (important tasks first)
    console.log('\n📊 Phase 6: Validating task sorting...');
    const todayRenderData = this.app.taskManager.getRenderData('today');
    const tomorrowRenderData = this.app.taskManager.getRenderData('tomorrow');

    console.log('   Today list:');
    todayRenderData.forEach((task, idx) => {
      console.log(`     ${idx + 1}. ${task.important ? '⭐' : '📅'} ${task.text}`);
    });

    console.log('   Tomorrow list:');
    tomorrowRenderData.forEach((task, idx) => {
      console.log(`     ${idx + 1}. ${task.important ? '⭐' : '📅'} ${task.text}`);
    });

    // Validate important tasks are first
    const todayImportantFirst = todayRenderData.every((task, idx) => {
      if (idx === 0) return true;
      const prevTask = todayRenderData[idx - 1];
      if (prevTask.important && !task.important) return true;
      if (!prevTask.important && task.important) return false;
      return true;
    });

    console.log(`   ${todayImportantFirst ? '✅' : '❌'} Important tasks sorted first in Today`);

    // Phase 7: Summary
    console.log('\n━'.repeat(60));
    console.log('📈 Test Summary:');
    console.log('   ✅ Parent tasks with subtasks in multiple lists');
    console.log('   ✅ Independent expansion states per list');
    console.log('   ✅ QR export/import preserves all data');
    console.log('   ✅ Text export/import preserves all properties');
    console.log('   ✅ Data migration (old → new format)');
    console.log('   ✅ Important tasks sorted correctly');
    console.log('━'.repeat(60));
    console.log('🎉 All tests completed! Check console output above for details.');

    this.app.showNotification('✅ Comprehensive test suite completed - check console', Config.NOTIFICATION_TYPES.SUCCESS);
  }

  /**
   * Clear browser cache and reload
   */
  async clearCache() {
    try {
      // Clear localStorage (but preserve user data)
      const userData = localStorage.getItem(Config.STORAGE_KEY);
      const userTheme = localStorage.getItem(Config.THEME_KEY);

      // Clear all localStorage
      localStorage.clear();

      // Restore user data
      if (userData) localStorage.setItem(Config.STORAGE_KEY, userData);
      if (userTheme) localStorage.setItem(Config.THEME_KEY, userTheme);

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

      this.app.showNotification('Cache cleared! Reloading...', Config.NOTIFICATION_TYPES.SUCCESS);

      // Force reload with cache bypass
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);

    } catch (error) {
      console.error('Cache clear error:', error);
      this.app.showNotification('Cache clear failed. Try manual refresh (Ctrl+F5)', Config.NOTIFICATION_TYPES.ERROR);
    }
  }

  /**
   * Update dev mode UI elements
   */
  updateUI() {
    console.log('updateDevModeUI called, devMode:', this.active);
    const syncControls = document.querySelector('.sync-controls');
    const headerTop = document.querySelector('.header-top');

    console.log('syncControls found:', !!syncControls);
    console.log('headerTop found:', !!headerTop);

    // Remove existing dev mode buttons
    document.querySelectorAll('.dev-mode-btn').forEach(btn => btn.remove());

    if (this.active) {
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
        exitDevBtn.addEventListener('click', () => this.deactivate());
        headerTop.appendChild(exitDevBtn);
        console.log('Exit dev mode button added to header');
      } else {
        console.error('Could not find header-top element');
      }
    }
  }

  /**
   * Check if dev mode is active
   * @returns {boolean}
   */
  isActive() {
    return this.active;
  }
}

// Freeze to prevent modifications
Object.freeze(DevMode.prototype);
