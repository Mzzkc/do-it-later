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
   * Test important tasks feature (dev mode only)
   */
  testImportantTasks() {
    if (!this.active) return;

    console.log('🧪 Testing important tasks feature - Phase 4 List Sorting + Visual Effects...');

    // Add test tasks with visual gradient effects and sorting demonstration
    const testTasks = [
      {
        id: this.app.generateId(),
        text: '📅 Normal task added first',
        completed: false,
        important: false,
        createdAt: Date.now() - 300000 // 5 minutes ago
      },
      {
        id: this.app.generateId(),
        text: '⭐ Important: High priority task',
        completed: false,
        important: true,
        createdAt: Date.now() - 200000 // 3+ minutes ago
      },
      {
        id: this.app.generateId(),
        text: '🔥 Important: Most recent urgent task',
        completed: false,
        important: true,
        createdAt: Date.now() - 100000 // 1+ minutes ago
      },
      {
        id: this.app.generateId(),
        text: '📅 Another normal task',
        completed: false,
        important: false,
        createdAt: Date.now() - 50000 // 50 seconds ago
      },
      {
        id: this.app.generateId(),
        text: '✅ Completed important task',
        completed: true,
        important: true,
        createdAt: Date.now() - 400000 // 6+ minutes ago
      },
      {
        id: this.app.generateId(),
        text: '✅ Completed normal task',
        completed: true,
        important: false,
        createdAt: Date.now() - 250000 // 4+ minutes ago
      }
    ];

    // Add to both lists for comprehensive sorting testing
    testTasks.slice(0, 3).forEach(task => { task.list = "today"; this.app.data.tasks.push(task); });
    testTasks.slice(3).forEach(task => { task.list = "tomorrow"; this.app.data.tasks.push(task); });
    this.app.save();
    this.app.render();

    // Test QR generation
    const qrData = Sync.generateQRData(this.app.data);
    console.log('📱 QR Data with important task:', qrData);

    // Test parsing the QR data back
    try {
      const parsed = Sync.parseQRData(qrData);
      console.log('✅ Parsed QR data:', parsed);
    } catch (error) {
      console.error('❌ QR parsing failed:', error);
    }

    this.app.showNotification('Important tasks test completed - check console', Config.NOTIFICATION_TYPES.INFO);
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
