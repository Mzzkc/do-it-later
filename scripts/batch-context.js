// Do It (Later) - Batch Context Module
// WAVE 4 FIX: Provides transactional batching for rapid operations
// Prevents race conditions by deferring save/render until batch completes

/**
 * BatchContext class - Wraps rapid operations in atomic batches
 *
 * Purpose: When users rapidly click (add subtasks, toggle importance, move tasks),
 * each operation would normally save+render immediately. With 10ms save debounce,
 * intermediate states can be saved, causing data loss.
 *
 * Solution: Batch related operations together, save+render ONCE at end.
 *
 * Example:
 *   app.batchContext.run(() => {
 *     addSubtask1();  // No save
 *     addSubtask2();  // No save
 *     addSubtask3();  // No save
 *   }); // Now save+render happens ONCE with all 3 subtasks
 */
class BatchContext {
  /**
   * Creates a new BatchContext instance
   * @param {DoItTomorrowApp} app - Reference to main application
   */
  constructor(app) {
    this.app = app;
    this.batchDepth = 0; // Supports nested batches
  }

  /**
   * Check if currently in a batch
   * @returns {boolean} True if batch is active
   */
  inBatch() {
    return this.batchDepth > 0;
  }

  /**
   * Begin a new batch (can be nested)
   */
  begin() {
    this.batchDepth++;
    console.log(`🔄 [BATCH] BEGIN (depth: ${this.batchDepth})`);
  }

  /**
   * End current batch, commit if no more nested batches
   */
  end() {
    this.batchDepth = Math.max(0, this.batchDepth - 1);

    if (this.batchDepth === 0) {
      console.log('✅ [BATCH] COMMIT (saving & rendering)');
      this.app.save();
      this.app.render();
    } else {
      console.log(`🔄 [BATCH] END (depth now: ${this.batchDepth})`);
    }
  }

  /**
   * Wrap a synchronous operation in a batch
   * @param {Function} fn - Function to execute in batch
   * @returns {*} Return value of fn
   */
  run(fn) {
    this.begin();
    try {
      return fn();
    } finally {
      this.end();
    }
  }

  /**
   * Wrap an async operation in a batch
   * @param {Function} fn - Async function to execute in batch
   * @returns {Promise<*>} Promise of fn's return value
   */
  async runAsync(fn) {
    this.begin();
    try {
      return await fn();
    } finally {
      this.end();
    }
  }
}

// Freeze the prototype to prevent modifications
Object.freeze(BatchContext.prototype);
