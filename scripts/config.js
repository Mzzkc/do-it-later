// Do It (Later) - Configuration and Constants
// Single source of truth for all app configuration

const Config = {
  // Application metadata
  VERSION: '1.21.5',
  APP_NAME: 'Do It (Later)',
  APP_SHORT_NAME: 'DoIt(Later)',

  // Storage
  STORAGE_KEY: 'do-it-later-data',
  THEME_KEY: 'do-it-later-theme',

  // Timing constants
  SAVE_DEBOUNCE_MS: 100,
  RENDER_DEBOUNCE_MS: 16, // ~60fps
  LONG_PRESS_TIMEOUT_MS: 600,
  LONG_PRESS_TOLERANCE_PX: 10,
  TAP_MAX_MOVEMENT_PX: 10,
  TAP_MAX_DURATION_MS: 500,
  SWIPE_THRESHOLD_PX: 50,
  SWIPE_CANCEL_VERTICAL_PX: 30,
  NOTIFICATION_DURATION_MS: 3000,
  NOTIFICATION_SLIDE_DELAY_MS: 10,
  NOTIFICATION_SLIDE_OUT_MS: 300,
  DEV_MODE_TAP_COUNT: 7,
  DEV_MODE_TAP_WINDOW_MS: 3000,
  COMPLETED_TASK_RETENTION_DAYS: 0, // Clean up immediately on rollover
  LATER_TASK_REMINDER_DAYS: 7,
  MAX_LOG_ENTRIES: 500,
  POMODORO_WORK_MINUTES: 25,
  POMODORO_BREAK_MINUTES: 5,

  // UI constraints
  MAX_TASK_LENGTH: 200,
  MOVE_ICON_ARROW_RIGHT: '→',
  MOVE_ICON_ARROW_LEFT: '←',

  // DOM selectors
  SELECTORS: {
    app: '#app',
    todayInput: '#today-task-input',
    tomorrowInput: '#tomorrow-task-input',
    todayList: '#today-list',
    tomorrowList: '#tomorrow-list',
    todaySection: '#today-section',
    tomorrowSection: '#tomorrow-section',
    currentDate: '#current-date',
    completedCounter: '#completed-counter',
    themeToggle: '#theme-toggle',
    exportFileBtn: '#export-file-btn',
    exportClipboardBtn: '#export-clipboard-btn',
    importFile: '#import-file',
    importClipboardBtn: '#import-clipboard-btn',
    qrBtn: '#qr-btn',
    mobileNav: '#mobile-nav',
    navBtns: '.nav-btn',
    deleteModeToggles: '.delete-mode-toggle',
    addTaskContainers: '.add-task-container',
    listSections: '.list-section',
    main: 'main'
  },

  // CSS classes
  CLASSES: {
    taskItem: 'task-item',
    completed: 'completed',
    important: 'important',
    editInput: 'edit-input',
    taskText: 'task-text',
    taskActions: 'task-actions',
    moveIcon: 'move-icon',
    emptyMessage: 'empty-message',
    notification: 'notification',
    lightTheme: 'light-theme',
    darkTheme: 'dark-theme',
    buttonPressed: 'button-pressed',
    deleteModeActive: 'delete-mode',
    navBtnActive: 'active',
    listSectionActive: 'active',
    movingInLeft: 'moving-in-left',
    movingInRight: 'moving-in-right',
    movingOutLeft: 'moving-out-left',
    movingOutRight: 'moving-out-right',
    pushingLeft: 'pushing-left',
    pushingRight: 'pushing-right',
    importanceAdded: 'importance-added',
    counterUpdate: 'counter-update',
    ripple: 'ripple',
    rippleFade: 'ripple-fade'
  },

  // Notification types
  NOTIFICATION_TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  },

  // Theme options
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark'
  },

  // Default theme
  DEFAULT_THEME: 'dark',

  // List names
  LISTS: {
    TODAY: 'today',
    TOMORROW: 'tomorrow'
  },

  // Task move directions
  DIRECTIONS: {
    LEFT: 'left',
    RIGHT: 'right'
  },

  // Sync format delimiters
  SYNC: {
    TASK_DELIMITER: '|',
    SECTION_DELIMITER: '~',
    IMPORTANT_PREFIX: '!',
    TODAY_PREFIX: 'T:',
    LATER_PREFIX: 'L:',
    COUNT_PREFIX: 'C:'
  },

  // Date format options
  DATE_FORMAT_OPTIONS: {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  },

  // Icons (SVG paths for notifications)
  ICONS: {
    success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px;"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5z"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px;"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px;"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px;"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>'
  },

  // Notification colors
  NOTIFICATION_COLORS: {
    success: '#059669',
    error: '#dc2626',
    warning: '#d97706',
    info: '#2563eb'
  },

  // Service worker path
  SERVICE_WORKER_PATH: '/sw.js',

  // File export
  EXPORT_FILE_PREFIX: 'do-it-later-',
  EXPORT_FILE_EXTENSION: '.txt',
  EXPORT_MIME_TYPE: 'text/plain',

  // QR Scanner
  QR_SCANNER: {
    FACING_MODE: 'environment',
    IDEAL_WIDTH: 1280,
    IDEAL_HEIGHT: 720,
    FRAME_LOG_INTERVAL: 60, // Log every 60 frames
    INVERSION_ATTEMPTS: 'dontInvert'
  }
};

// Freeze to prevent modifications
Object.freeze(Config);
Object.freeze(Config.SELECTORS);
Object.freeze(Config.CLASSES);
Object.freeze(Config.NOTIFICATION_TYPES);
Object.freeze(Config.THEMES);
Object.freeze(Config.LISTS);
Object.freeze(Config.DIRECTIONS);
Object.freeze(Config.SYNC);
Object.freeze(Config.DATE_FORMAT_OPTIONS);
Object.freeze(Config.ICONS);
Object.freeze(Config.NOTIFICATION_COLORS);
Object.freeze(Config.QR_SCANNER);
