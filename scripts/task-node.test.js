/**
 * Quick proof-of-concept test for TaskNode
 * Run with: node scripts/task-node.test.js
 */

import { TaskNode, TaskTree } from './task-node.js';

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    process.exit(1);
  }
  console.log('✓', message);
}

console.log('\n=== TaskNode Proof of Concept ===\n');

// Test 1: Basic tree structure
console.log('--- Tree Structure ---');
const today = new TaskTree('today');
const task1 = today.addTask('Buy groceries');
const subtask1 = task1.addChild('Get milk');
const subtask2 = task1.addChild('Get bread');

assert(task1.children.length === 2, 'Parent has 2 children');
assert(subtask1.parent === task1, 'Child knows its parent');
assert(task1.getDepth() === 1, 'Root child has depth 1');
assert(subtask1.getDepth() === 2, 'Nested child has depth 2');

// Test 2: Tree operations
console.log('\n--- Tree Operations ---');
const task2 = today.addTask('Exercise');
assert(today.getAllTasks().length === 4, 'Tree has 4 tasks total');
assert(today.findByText('Get milk') === subtask1, 'Find by text works');
assert(today.findById(task1.id) === task1, 'Find by ID works');

// Test 3: Completion cascade (the key behavior)
console.log('\n--- Completion Cascade ---');
subtask1.toggleComplete();
subtask2.toggleComplete();
assert(subtask1.completed === true, 'Subtask 1 completed');
assert(subtask2.completed === true, 'Subtask 2 completed');
assert(task1.completed === true, 'Parent auto-completed when all children done');

// Uncomplete one child - parent should uncomplete
subtask1.toggleComplete();
assert(subtask1.completed === false, 'Subtask 1 uncompleted');
assert(task1.completed === false, 'Parent auto-uncompleted');

// Test 4: Important sorting
console.log('\n--- Important Sorting ---');
subtask2.toggleImportant();
assert(subtask2.important === true, 'Subtask 2 marked important');
assert(task1.children[0] === subtask2, 'Important child sorted to top');

// Test 5: Serialization round-trip
console.log('\n--- Serialization ---');
const json = JSON.stringify(today.toJSON(), null, 2);
const restored = TaskTree.fromJSON(JSON.parse(json));

assert(restored.name === 'today', 'Tree name preserved');
assert(restored.getAllTasks().length === 4, 'All tasks preserved');

const restoredTask1 = restored.findByText('Buy groceries');
assert(restoredTask1.children.length === 2, 'Children preserved');
assert(restoredTask1.completed === false, 'Completion state preserved');

const restoredSubtask2 = restored.findByText('Get bread');
assert(restoredSubtask2.important === true, 'Important state preserved');
assert(restoredSubtask2.parent === restoredTask1, 'Parent reference rebuilt');

// Test 6: Per-list expansion state
console.log('\n--- Per-list Expansion ---');
const parentWithExpansion = today.findByText('Buy groceries');

// Default: expanded in both lists
assert(parentWithExpansion.isExpandedIn('today') === true, 'Default expanded in today');
assert(parentWithExpansion.isExpandedIn('tomorrow') === true, 'Default expanded in tomorrow');

// Toggle in today only
parentWithExpansion.toggleExpansionIn('today');
assert(parentWithExpansion.isExpandedIn('today') === false, 'Collapsed in today after toggle');
assert(parentWithExpansion.isExpandedIn('tomorrow') === true, 'Still expanded in tomorrow');

// Toggle back
parentWithExpansion.toggleExpansionIn('today');
assert(parentWithExpansion.isExpandedIn('today') === true, 'Expanded in today again');

// Set expansion explicitly
parentWithExpansion.setExpandedIn('tomorrow', false);
assert(parentWithExpansion.isExpandedIn('tomorrow') === false, 'Set collapsed in tomorrow');

// Test 'tomorrow' -> 'later' key mapping
parentWithExpansion.setExpandedIn('tomorrow', true);
assert(parentWithExpansion.expansionState.later === true, 'tomorrow maps to later key');

// Test serialization preserves expansion state
const expandedTask = new TaskNode('Test Expansion', {
  expandedInToday: false,
  expandedInLater: true
});
assert(expandedTask.isExpandedIn('today') === false, 'Constructor accepts expandedInToday');
assert(expandedTask.isExpandedIn('tomorrow') === true, 'Constructor accepts expandedInLater');

const expandedJson = expandedTask.toJSON();
assert(expandedJson.expandedInToday === false, 'toJSON serializes expandedInToday');
assert(expandedJson.expandedInLater === true, 'toJSON serializes expandedInLater');

// Test 7: Moving between trees
console.log('\n--- Moving Between Trees ---');
const later = new TaskTree('tomorrow');  // 'tomorrow' name for the later list
const movedTask = today.findByText('Exercise');

// Detach from today, add to later
movedTask.detach();
movedTask.moveTo(later.root);

assert(today.getAllTasks().length === 3, 'Today has 3 tasks after move');
assert(later.getAllTasks().length === 1, 'Later has 1 task after move');
assert(later.findByText('Exercise') === movedTask, 'Task found in later');

// Test 8: Moving subtask with parent recreation
console.log('\n--- Subtask Movement ---');
// When a subtask moves, its parent structure should follow
const subtaskToMove = today.findByText('Get milk');
const originalParent = subtaskToMove.parent;

// For this behavior, we'd need additional logic
// For now, just test basic detach
subtaskToMove.detach();
assert(originalParent.children.length === 1, 'Parent has 1 child after detach');
assert(subtaskToMove.parent === null, 'Detached subtask has no parent');

// Re-attach to later root as standalone
subtaskToMove.moveTo(later.root);
assert(later.getAllTasks().length === 2, 'Later now has 2 tasks');

console.log('\n=== All Tests Passed! ===\n');
console.log('Sample serialized structure:');
console.log(json);
