# Data Structure Refactor - In Progress

## CRITICAL: App is currently BROKEN - v1.9.0 is incomplete!

### What We're Doing

Refactoring from **two separate arrays** to a **single tasks array with list property**.

**Old Structure:**
```javascript
{
  today: [task1, task2, ...],
  tomorrow: [task3, task4, ...]
}
```

**New Structure:**
```javascript
{
  tasks: [
    { id: 1, text: "Parent", list: "today", parentId: null, ... },
    { id: 2, text: "Child 1", list: "today", parentId: 1, ... },
    { id: 3, text: "Child 2", list: "tomorrow", parentId: 1, ... }  // Different list!
  ],
  version: 2
}
```

### Why This Refactor?

1. **Eliminate duplicate parents** - Parent task exists once, children reference it by ID
2. **Simplify movement** - Just change `task.list = 'tomorrow'`, no copying needed
3. **True C-style references** - JavaScript objects are references, just like pointers in C
4. **Fix parent merging bug** - Moving subtask back to original list reconnects to same parent

### What's Already Done ✅

1. **Storage layer** (`scripts/storage.js`):
   - `getDefaultData()` now returns `{tasks: [], version: 2}`
   - `migrateData()` converts old format to new format automatically
   - `load()` auto-migrates on load

2. **Render function** (`scripts/app.js` line ~970):
   - Updated to filter tasks: `this.data.tasks.filter(t => t.list === 'today')`

### What Needs Updating (50+ locations)

#### Pattern to find all references:
```bash
grep -n "this\.data\.today\|this\.data\.tomorrow\|this\.data\[" scripts/app.js
```

#### Key areas to update:

1. **Date Rollover** (lines 172-233):
   - `this.data.today.filter(...)` → `this.data.tasks.filter(t => t.list === 'today')`
   - `this.data.tomorrow` → `this.data.tasks.filter(t => t.list === 'tomorrow')`
   - Remove from array → `task.list = null` or `this.data.tasks.splice(index, 1)`
   - Push to array → `task.list = 'today'`

2. **addTask** (line ~1103):
   ```javascript
   // OLD:
   this.data[list].push(task);

   // NEW:
   task.list = list;
   this.data.tasks.push(task);
   ```

3. **editTask** (lines ~1122-1130):
   ```javascript
   // OLD:
   taskIndex = this.data.today.findIndex(t => t.id === id);
   if (taskIndex !== -1) {
     task = this.data.today[taskIndex];
   }

   // NEW:
   task = this.data.tasks.find(t => t.id === id);
   ```

4. **handleMenuToggleImportant** (line ~1301):
   ```javascript
   // OLD:
   const actualTask = this.data[taskInfo.list].find(t => t.id === taskId);

   // NEW:
   const actualTask = this.data.tasks.find(t => t.id === taskId);
   ```

5. **animateTaskMovement** (lines ~1598-1678):
   ```javascript
   // OLD:
   const task = this.data[fromList].splice(fromIndex, 1)[0];
   this.data[toList].push(task);

   // NEW:
   const task = this.data.tasks.find(t => t.id === id);
   task.list = toList;
   // For children: child.list = toList;
   // No more creating duplicate parents!
   ```

6. **findTask** (lines ~1692-1697):
   ```javascript
   // OLD:
   const todayTask = this.data.today.find(task => task.id === id);
   if (todayTask) return { ...todayTask, list: 'today' };

   // NEW:
   const task = this.data.tasks.find(t => t.id === id);
   return task ? { ...task } : null;
   // List property already on task!
   ```

7. **deleteTask** (lines ~1783-1792):
   ```javascript
   // OLD:
   const todayIndex = this.data.today.findIndex(task => task.id === id);
   this.data.today.splice(todayIndex, 1);

   // NEW:
   const index = this.data.tasks.findIndex(t => t.id === id);
   this.data.tasks.splice(index, 1);
   ```

8. **Import/Export** (lines ~1861-1940):
   - Need to handle both old and new formats
   - Migrate imported data if needed

9. **getChildren** (line ~2837):
   ```javascript
   // OLD:
   return this.data[listName].filter(task => task.parentId === parentId);

   // NEW:
   return this.data.tasks.filter(t => t.parentId === parentId && t.list === listName);
   ```

10. **setTaskDeadline, addSubtask, etc.** - Similar pattern changes

### Helper Methods to Add

Add these after `generateId()` (around line 83):

```javascript
// Helper methods for new data structure
getTasksByList(listName) {
  return this.data.tasks.filter(t => t.list === listName);
}

findTaskById(id) {
  return this.data.tasks.find(t => t.id === id);
}

addTaskToList(task, listName) {
  task.list = listName;
  this.data.tasks.push(task);
}

removeTaskById(id) {
  const index = this.data.tasks.findIndex(t => t.id === id);
  if (index !== -1) {
    this.data.tasks.splice(index, 1);
    return true;
  }
  return false;
}

moveTaskToList(id, toList) {
  const task = this.findTaskById(id);
  if (task) {
    task.list = toList;
    return true;
  }
  return false;
}
```

### Testing After Refactor

1. Create tasks in today/tomorrow
2. Mark tasks as important - should work now
3. Move task with subtasks - all should move together
4. Move subtask individually - should merge with existing parent
5. Complete all subtasks - parent auto-completes
6. Delete parent - all subtasks deleted
7. Import/export - should preserve all properties

### Remaining Bugs to Fix AFTER Refactor

1. **Pomodoro timer not appearing** - investigate `showPomodoroTimer()`
2. **Completed supertask can't be unmarked** - add click handler on completed parents
3. **Import/export doesn't preserve properties** - update sync format

### Search & Replace Patterns

**Be careful with these - review each one:**

1. `this.data.today.filter` → `this.data.tasks.filter(t => t.list === 'today' && ...`
2. `this.data.tomorrow.filter` → `this.data.tasks.filter(t => t.list === 'tomorrow' && ...`
3. `this.data.today.find` → `this.data.tasks.find(t => t.list === 'today' && ...`
4. `this.data.tomorrow.find` → `this.data.tasks.filter(t => t.list === 'tomorrow' && ...`
5. `this.data[list]` → Use helper methods instead
6. `.splice(fromIndex, 1)[0]` followed by `.push(task)` → Just change `task.list = toList`

### Current Git Status

- Branch: `main`
- Last commit: `6a27ed6` - "[WIP] Start data structure refactor (v1.9.0) - INCOMPLETE"
- **DO NOT PUSH** until refactor is complete

### Files Modified

- `scripts/storage.js` - ✅ Complete
- `scripts/app.js` - ⚠️ Partially done (render only)
- `scripts/config.js` - Version bumped to 1.9.0
- `manifest.json` - Version bumped to 1.9.0

### Strategy for Completion

1. Add helper methods
2. Update in this order:
   - addTask
   - findTask (used everywhere)
   - editTask
   - deleteTask / deleteTaskWithSubtasks
   - completeTask
   - moveTask / animateTaskMovement
   - Date rollover
   - getChildren
   - Import/export
3. Test thoroughly
4. Fix remaining bugs
5. Commit and push

Good luck! 🚀
