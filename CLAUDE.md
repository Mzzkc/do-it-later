# Do It Tomorrow - Claude Code Development Guide

## Project Overview

You are building an ultra-simple "Do It Tomorrow" clone - a PWA todo app with just two lists (Today/Tomorrow) and three actions (Add, Complete, Push to Tomorrow). This follows the 5-document AI project workflow with completed Deliberation, Requirements, and Master Plan phases.

## Current Status

- ✅ **Deliberation Phase:** Complete - All concepts explored and validated
- ✅ **Requirements Phase:** Complete - All requirements, constraints, and scope defined  
- ✅ **Master Plan Phase:** Complete - 5 development phases planned
- 🎯 **Current Phase:** Phase 1 - PWA Foundation

## Core Principles

**ABSOLUTE SIMPLICITY:** This overrides everything else. If adding complexity, question if it's truly needed.

**Three Actions Only:**
1. Add new task (to Tomorrow list)
2. Complete task (mark as done)  
3. Push task from Today to Tomorrow

**Two Lists Only:**
- Today: Tasks for today
- Tomorrow: Tasks for tomorrow (+ new tasks added during the day)

**Ephemeral Data:** localStorage only, data loss on cache clear is acceptable and communicated to user

## Development Phases

### Phase 1: PWA Foundation (CURRENT)
**Duration:** 3-4 days | **Complexity:** Medium

**Deliverables:**
- [ ] HTML5 semantic structure with proper PWA setup
- [ ] CSS3 mobile-first responsive framework
- [ ] PWA manifest.json with app metadata
- [ ] Service worker for offline functionality
- [ ] Basic app shell that loads instantly
- [ ] Cross-browser compatibility foundation

**Success Criteria:** App installs on mobile, loads offline, responsive across devices

**File Structure to Create:**
```
do-it-later/
├── index.html          # Main app interface
├── manifest.json       # PWA configuration
├── sw.js              # Service worker
├── styles/
│   ├── main.css       # Core styles
│   └── mobile.css     # Mobile-specific styles
├── scripts/
│   ├── app.js         # Main application logic
│   └── storage.js     # localStorage utilities
├── icons/
│   ├── icon-192.png   # PWA icons
│   ├── icon-512.png
│   └── favicon.ico
└── setup.sh           # Initial setup script
```

**Key Implementation Notes:**
- Mobile-first CSS with breakpoints: 320px, 768px, 1024px
- Touch-friendly minimum 44px tap targets
- High contrast, readable typography
- PWA must work offline after first load
- No frameworks - vanilla HTML/CSS/JS only

### Phase 2: Core Task Engine  
**Duration:** 4-5 days | **Complexity:** High

**Deliverables:**
- [ ] Two-list data model (Today/Tomorrow arrays)
- [ ] localStorage persistence with ephemeral warning
- [ ] Task CRUD operations (Create, Complete, Push to Tomorrow)
- [ ] Daily rollover logic (Tomorrow → Today at midnight)
- [ ] Date display and automatic updates
- [ ] Basic task rendering in lists

**Data Model:**
```javascript
{
  today: [
    { id: uuid, text: string, completed: boolean, createdAt: timestamp }
  ],
  tomorrow: [
    { id: uuid, text: string, completed: boolean, createdAt: timestamp }
  ],
  lastUpdated: timestamp,
  currentDate: 'YYYY-MM-DD'
}
```

**Core Functions Needed:**
- `addTask(text, list='tomorrow')` - Always add to Tomorrow unless specified
- `completeTask(id)` - Toggle completion status  
- `pushToTomorrow(id)` - Move task from Today to Tomorrow
- `checkDateRollover()` - Move Tomorrow to Today if new day
- `saveToStorage()` / `loadFromStorage()` - Persistence

### Phase 3: User Experience Polish
**Duration:** 3-4 days | **Complexity:** Medium

**Deliverables:**
- [ ] Optimized touch interactions and visual feedback
- [ ] Keyboard shortcuts (Enter=add, Space=complete, T=push to tomorrow)
- [ ] Smooth micro-interactions and loading states
- [ ] Clean aesthetic design implementation
- [ ] Clear ephemeral storage notice
- [ ] Error handling and edge cases
- [ ] Performance optimizations

**UI Requirements:**
- One-tap task addition (focus input field immediately)
- One-tap task completion (visual strikethrough)
- One-tap push to tomorrow (clear visual movement)
- Today's date prominently displayed
- Visual separation between Today/Tomorrow lists
- Subtle notice: "Tasks stored locally - clearing browser data resets lists"

### Phase 4: Discord Integration (Optional)
**Duration:** 5-6 days | **Complexity:** High

**Deliverables:**
- [ ] Discord OAuth authentication flow
- [ ] Private channel setup wizard
- [ ] Message-based sync system
- [ ] Sync state reconstruction from Discord messages
- [ ] Rate limiting and error handling
- [ ] Optional integration (app works without Discord)

**Discord Message Format:**
```
📋 [ADD] [TODAY/TOMORROW] Task description
✅ [COMPLETE] Task description  
⏭️ [PUSH] Task description (Today → Tomorrow)
🔄 [ROLLOVER] YYYY-MM-DD
```

**Integration Notes:**
- Completely optional - core app must work standalone
- Private Discord server/channel for each user
- Read last 50 messages to reconstruct current state
- Send new messages for each task action
- Graceful fallback when Discord unavailable

### Phase 5: Testing & Deployment
**Duration:** 2-3 days | **Complexity:** Low

**Deliverables:**
- [ ] Cross-platform testing (iOS Safari, Chrome, Firefox, Edge)
- [ ] Performance validation (<2 second load, <10 second new user flow)
- [ ] Security review (especially Discord OAuth if implemented)
- [ ] Production deployment configuration
- [ ] User documentation

## Technical Constraints

**Browser Support:** Modern browsers with ES6+, localStorage, PWA features
**Performance:** <2 second initial load, instant task operations
**Dependencies:** Vanilla JS only, no external frameworks
**Storage:** localStorage only, maximum ~5MB realistic usage
**Offline:** Must work offline after initial load

## Success Criteria

**User Experience:**
- New user can add first task within 10 seconds
- Interface requires zero explanation 
- All core actions work with single touch/click
- App loads completely within 2 seconds

**Technical:**
- Works offline after first load
- Responsive across mobile and desktop
- Zero crashes during normal usage
- Passes basic accessibility guidelines

## Implementation Guidelines

**Code Style:**
- Clear, readable variable names
- Comprehensive error handling
- Progressive enhancement approach
- Mobile-first responsive design
- Semantic HTML5 structure

**Testing Approach:**
- Manual testing across target platforms
- Performance testing with throttled connections
- User testing for intuitive operation
- Edge case testing (empty lists, long task names, etc.)

## Phase Completion Checklist

Before moving to next phase:
- [ ] All deliverables completed and working
- [ ] Success criteria validated through testing
- [ ] Code reviewed for simplicity and performance
- [ ] Cross-platform compatibility verified
- [ ] No critical bugs or usability issues

## Getting Started

1. Run the setup script to create initial directory structure
2. Begin with Phase 1: PWA Foundation
3. Focus on mobile-first, semantic HTML structure
4. Implement PWA manifest and service worker
5. Create responsive CSS framework
6. Validate PWA installation and offline functionality

## Important Notes

- **Simplicity Override:** When in doubt, choose the simpler approach
- **Mobile First:** Design and test on mobile before desktop
- **Progressive Enhancement:** Core functionality must work without advanced features
- **User Testing:** Validate each phase with real usage scenarios
- **Scope Discipline:** Resist feature additions not in requirements

Remember: The goal is an app so simple it gets out of the user's way completely.
