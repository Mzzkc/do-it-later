# Event Flow Diagram

## Complete Event System

```mermaid
graph TD
    subgraph "DOM Events"
        KeyEvents[Keyboard Events<br/>keydown, keyup]
        MouseEvents[Mouse Events<br/>click, mousedown, mouseup]
        TouchEvents[Touch Events<br/>touchstart, touchmove, touchend]
        ChangeEvents[Change Events<br/>input change]
        FocusEvents[Focus Events<br/>focus, blur]
    end

    subgraph "Event Listeners"
        InputListeners[Input Field Listeners<br/>Enter key → Add task]
        CheckboxListeners[Checkbox Listeners<br/>Click → Toggle task]
        ButtonListeners[Button Listeners<br/>Click → Actions]
        SwipeListeners[Swipe Gesture Listeners<br/>Touch → Move task]
        LongPressListeners[Long Press Listeners<br/>Hold → Context menu]
    end

    subgraph "Event Handlers"
        AddTaskHandler[addTask()<br/>Create new task]
        ToggleTaskHandler[toggleTask()<br/>Complete/uncomplete]
        MoveTaskHandler[moveTask()<br/>Change list]
        DeleteTaskHandler[deleteTask()<br/>Remove task]
        EditTaskHandler[editTask()<br/>Modify text]
        ContextMenuHandler[showContextMenu()<br/>Show options]
    end

    subgraph "State Updates"
        DataUpdate[Update app.data]
        SaveTrigger[Trigger saveData()]
        RenderTrigger[Trigger render()]
    end

    subgraph "UI Updates"
        DOMManipulation[DOM Updates]
        CSSClasses[CSS Class Changes]
        Animations[CSS Animations]
    end

    %% Event flow connections
    KeyEvents --> InputListeners
    MouseEvents --> CheckboxListeners
    MouseEvents --> ButtonListeners
    TouchEvents --> SwipeListeners
    TouchEvents --> LongPressListeners
    ChangeEvents --> InputListeners
    FocusEvents --> InputListeners

    InputListeners --> AddTaskHandler
    CheckboxListeners --> ToggleTaskHandler
    ButtonListeners --> MoveTaskHandler
    ButtonListeners --> DeleteTaskHandler
    SwipeListeners --> MoveTaskHandler
    LongPressListeners --> ContextMenuHandler

    AddTaskHandler --> DataUpdate
    ToggleTaskHandler --> DataUpdate
    MoveTaskHandler --> DataUpdate
    DeleteTaskHandler --> DataUpdate
    EditTaskHandler --> DataUpdate

    DataUpdate --> SaveTrigger
    DataUpdate --> RenderTrigger
    RenderTrigger --> DOMManipulation
    DOMManipulation --> CSSClasses
    CSSClasses --> Animations

    style KeyEvents fill:#f9f
    style MouseEvents fill:#f9f
    style TouchEvents fill:#f9f
    style DataUpdate fill:#bfb
```

## Touch Gesture Detection

```mermaid
stateDiagram-v2
    [*] --> Idle: Ready

    Idle --> TouchStart: touchstart event
    TouchStart --> TrackingTouch: Store position & time

    TrackingTouch --> CheckMovement: touchmove event
    CheckMovement --> SwipeDetected: Move > 50px horizontal
    CheckMovement --> LongPressWait: Move < 10px
    CheckMovement --> CancelGesture: Move > 10px vertical

    LongPressWait --> LongPressTriggered: 600ms elapsed
    LongPressTriggered --> ShowContextMenu: Display menu
    ShowContextMenu --> Idle: Menu action

    SwipeDetected --> AnimateSwipe: Add CSS classes
    AnimateSwipe --> TouchEnd: touchend event
    TouchEnd --> CompleteSwipe: Move task
    CompleteSwipe --> Idle: Animation done

    CancelGesture --> Idle: Reset
    TrackingTouch --> NormalTap: touchend < 500ms
    NormalTap --> ClickAction: Trigger click
    ClickAction --> Idle: Complete
```

## Event Propagation & Delegation

```mermaid
graph TD
    subgraph "Event Bubbling"
        TaskItem[Task Item Click]
        TaskItem --> ListContainer[List Container]
        ListContainer --> MainSection[Main Section]
        MainSection --> AppDiv[App Div]
        AppDiv --> Body[Document Body]
    end

    subgraph "Event Delegation"
        ListClick[List Container Listener]
        ListClick --> CheckTarget{Identify Target}
        CheckTarget -->|Checkbox| HandleToggle[Toggle Task]
        CheckTarget -->|Text| HandleEdit[Edit Task]
        CheckTarget -->|Move Button| HandleMove[Move Task]
        CheckTarget -->|Delete Button| HandleDelete[Delete Task]
    end

    subgraph "Stop Propagation Points"
        InputFocus[Input Focus] -->|stopPropagation| NoPropagate[Prevent Bubbling]
        ContextMenu[Context Menu Click] -->|stopPropagation| NoPropagate
        ModalClick[Modal Click] -->|stopPropagation| NoPropagate
    end
```

## Mobile vs Desktop Event Handling

```mermaid
graph LR
    subgraph "Mobile Events"
        MTouch[Touch Events]
        MSwipe[Swipe Gestures]
        MLongPress[Long Press]
        MTap[Tap]
    end

    subgraph "Desktop Events"
        DMouse[Mouse Events]
        DClick[Click]
        DDrag[Drag & Drop<br/>Not Implemented]
        DRightClick[Right Click<br/>Not Used]
    end

    subgraph "Unified Handlers"
        UAddTask[Add Task]
        UToggle[Toggle Complete]
        UMove[Move Task]
        UDelete[Delete Task]
    end

    MTouch --> UMove
    MSwipe --> UMove
    MLongPress --> UMove
    MTap --> UToggle
    MTap --> UAddTask

    DMouse --> UMove
    DClick --> UToggle
    DClick --> UAddTask
    DClick --> UDelete

    style MTouch fill:#f9f
    style DMouse fill:#bbf
```

## Keyboard Shortcuts

```mermaid
graph TD
    subgraph "Implemented Shortcuts"
        Enter[Enter Key] --> AddTask[Add Task<br/>When in input field]
        Escape[Escape Key] --> CancelEdit[Cancel Edit<br/>When editing task]
    end

    subgraph "Potential Shortcuts (Not Implemented)"
        Tab[Tab] -.-> SwitchLists[Switch between lists]
        Delete[Delete] -.-> DeleteSelected[Delete selected task]
        Space[Space] -.-> ToggleSelected[Toggle selected task]
        Arrows[Arrow Keys] -.-> Navigate[Navigate tasks]
    end

    style Enter fill:#bfb
    style Escape fill:#bfb
    style Tab fill:#ddd
    style Delete fill:#ddd
```

## Event Timing & Debouncing

```mermaid
sequenceDiagram
    participant User
    participant DOM
    participant Handler
    participant Debounce
    participant Storage
    participant Renderer

    User->>DOM: Type in input (multiple keystrokes)
    DOM->>Handler: keydown events (rapid)

    Note over Handler: Each change triggers save & render

    Handler->>Debounce: saveData() called
    Debounce-->>Debounce: Clear previous timer
    Debounce->>Debounce: Set 100ms timer

    Handler->>Debounce: render() called
    Debounce-->>Debounce: Clear previous timer
    Debounce->>Debounce: Set 16ms timer

    Note over Debounce: Wait for timers...

    Debounce->>Renderer: Execute render (16ms later)
    Renderer->>DOM: Update UI

    Debounce->>Storage: Execute save (100ms later)
    Storage->>localStorage: Write data
```

## Context Menu Event Flow

```mermaid
graph TD
    subgraph "Long Press Detection"
        TouchStart[Touch Start] --> StartTimer[Start 600ms Timer]
        StartTimer --> MonitorMove[Monitor Movement]
        MonitorMove --> CheckMove{Moved > 10px?}
        CheckMove -->|Yes| CancelTimer[Cancel Timer]
        CheckMove -->|No| WaitTimer[Continue Waiting]
        WaitTimer --> TimerComplete{600ms Elapsed?}
        TimerComplete -->|Yes| TriggerMenu[Trigger Context Menu]
        TimerComplete -->|No| WaitTimer
    end

    subgraph "Context Menu Display"
        TriggerMenu --> CreateMenu[Create Menu DOM]
        CreateMenu --> PositionMenu[Position Near Task]
        PositionMenu --> ShowOptions[Show Available Actions]
        ShowOptions --> WaitSelection[Wait for Selection]
    end

    subgraph "Menu Actions"
        WaitSelection --> ActionSelected{Which Action?}
        ActionSelected -->|Add Subtask| AddSubtask[Create Subtask]
        ActionSelected -->|Set Deadline| ShowDeadline[Show Date Picker]
        ActionSelected -->|Mark Important| ToggleImportant[Toggle Flag]
        ActionSelected -->|Delete| DeleteTask[Remove Task]
        ActionSelected -->|Cancel| CloseMenu[Close Menu]
    end

    AddSubtask --> UpdateData[Update app.data]
    ShowDeadline --> UpdateData
    ToggleImportant --> UpdateData
    DeleteTask --> UpdateData
    UpdateData --> SaveRender[Save & Render]
    CloseMenu --> RemoveMenu[Remove Menu DOM]

    style TouchStart fill:#f9f
    style TriggerMenu fill:#bfb
    style UpdateData fill:#bbf
```

## Custom Event System

```mermaid
graph TD
    subgraph "Custom Events (Potential Enhancement)"
        TaskAdded[task-added Event]
        TaskCompleted[task-completed Event]
        TaskMoved[task-moved Event]
        DataSaved[data-saved Event]
        ThemeChanged[theme-changed Event]
    end

    subgraph "Event Emitters"
        AddTask[addTask()] --> TaskAdded
        ToggleTask[toggleTask()] --> TaskCompleted
        MoveTask[moveTask()] --> TaskMoved
        SaveData[saveData()] --> DataSaved
        ToggleTheme[toggleTheme()] --> ThemeChanged
    end

    subgraph "Event Listeners"
        TaskAdded --> Analytics[Analytics Tracking]
        TaskCompleted --> Achievements[Achievement System]
        TaskMoved --> SyncModule[Sync Module]
        DataSaved --> BackupModule[Backup Module]
        ThemeChanged --> PreferenceModule[Preference Module]
    end

    style TaskAdded fill:#ddd
    style Analytics fill:#ddd
    Note[Note: Custom events not currently implemented]
```