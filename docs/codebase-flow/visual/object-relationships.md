# Object Relationships

## Class Hierarchy

```mermaid
classDiagram
    class DoItTomorrowApp {
        -data: Object
        -saveTimeout: number
        -renderTimeout: number
        -currentMobileView: string
        -logs: Array
        -isScrolling: boolean
        -editingTask: string
        -deleteMode: Object
        -longPressManager: LongPressManager
        +taskManager: TaskManager
        +importExportManager: ImportExportManager
        +pomodoro: PomodoroTimer
        +deadlinePicker: DeadlinePicker
        +devMode: DevMode
        +qrHandler: QRHandler
        +renderer: Renderer
        +constructor()
        +init()
        +saveData()
        +render()
        +addTask()
        +toggleTask()
        +moveTask()
        +deleteTask()
        +editTask()
    }

    class TaskManager {
        -app: DoItTomorrowApp
        +constructor(app)
        +generateId()
        +getTasksByList(listName)
        +findTaskById(id)
        +addTask(text, listName)
        +toggleTask(id)
        +moveTaskToList(id, toList)
        +deleteTask(id)
        +editTask(id, newText)
        +addSubtask(parentId, text)
        +toggleImportance(id)
        +setDeadline(id, date)
        +sortTasks(tasks)
    }

    class Renderer {
        -app: DoItTomorrowApp
        +constructor(app)
        +render()
        +createTaskElement(task, index)
        +createCheckbox(task)
        +createTaskText(task)
        +createMoveButton(task)
        +createDeleteButton(task)
        +handleImportanceGradient()
        +updateMobileView()
    }

    class ImportExportManager {
        -app: DoItTomorrowApp
        +constructor(app)
        +setup()
        +exportToFile()
        +exportToClipboard()
        +importFromFile(file)
        +importFromClipboard()
        +mergeTasks(importedData)
    }

    class PomodoroTimer {
        -app: DoItTomorrowApp
        -timer: number
        -timeRemaining: number
        -isRunning: boolean
        -isBreak: boolean
        +constructor(app)
        +start()
        +pause()
        +reset()
        +tick()
        +complete()
    }

    class DeadlinePicker {
        -app: DoItTomorrowApp
        -currentTaskId: string
        +constructor(app)
        +show(taskId)
        +hide()
        +setDeadline(date)
        +clearDeadline()
    }

    class QRHandler {
        -app: DoItTomorrowApp
        -qrCode: QRCode
        +constructor(app)
        +generateQRCode()
        +displayQRCode()
        +closeQRDisplay()
    }

    class QRScanner {
        -video: HTMLVideoElement
        -canvas: HTMLCanvasElement
        -isScanning: boolean
        +constructor()
        +start()
        +stop()
        +decode(imageData)
    }

    class DevMode {
        -app: DoItTomorrowApp
        -isActive: boolean
        -tapCount: number
        +constructor(app)
        +activate()
        +deactivate()
        +log(message)
        +showLogs()
    }

    class LongPressManager {
        -timeout: number
        -tolerance: number
        -isActive: boolean
        -timer: number
        -startPosition: Object
        +constructor(options)
        +start(element, event)
        +cancel(reason)
        +triggerLongPress()
        +cleanup()
    }

    %% Relationships
    DoItTomorrowApp *-- TaskManager : composition
    DoItTomorrowApp *-- Renderer : composition
    DoItTomorrowApp *-- ImportExportManager : composition
    DoItTomorrowApp *-- PomodoroTimer : composition
    DoItTomorrowApp *-- DeadlinePicker : composition
    DoItTomorrowApp *-- QRHandler : composition
    DoItTomorrowApp *-- DevMode : composition
    DoItTomorrowApp *-- LongPressManager : composition

    TaskManager ..> DoItTomorrowApp : uses
    Renderer ..> DoItTomorrowApp : uses
    ImportExportManager ..> DoItTomorrowApp : uses
    PomodoroTimer ..> DoItTomorrowApp : uses
    DeadlinePicker ..> DoItTomorrowApp : uses
    QRHandler ..> DoItTomorrowApp : uses
    DevMode ..> DoItTomorrowApp : uses
```

## Data Model Relationships

```mermaid
erDiagram
    AppData ||--o{ Task : contains
    Task ||--o{ Subtask : has
    Task {
        string id PK
        string text
        string list "today or tomorrow"
        boolean completed
        boolean important
        string deadline "ISO date or null"
        string parentId FK "for subtasks"
    }
    Subtask {
        string id PK
        string text
        boolean completed
        string parentId FK
    }
    AppData {
        array tasks
        number lastUpdated
        string currentDate
        number totalCompleted
        number version
    }
    Theme {
        string value "light or dark"
    }
    LocalStorage ||--|| AppData : stores
    LocalStorage ||--|| Theme : stores
```

## Module Object Relationships

```mermaid
graph TD
    subgraph "Singleton Objects"
        Config[Config<br/>Frozen object with constants]
        Utils[Utils<br/>Frozen object with utilities]
        Storage[Storage<br/>Frozen object with storage methods]
        Sync[Sync<br/>Import/export utilities]
    end

    subgraph "Instance Objects"
        App[DoItTomorrowApp<br/>Main application instance]
        TM[TaskManager<br/>Task operations]
        R[Renderer<br/>DOM rendering]
        IEM[ImportExportManager<br/>Import/export orchestration]
        P[PomodoroTimer<br/>Timer feature]
        DP[DeadlinePicker<br/>Date picker]
        QH[QRHandler<br/>QR generation]
        QS[QRScanner<br/>QR scanning]
        DM[DevMode<br/>Developer tools]
        LPM[LongPressManager<br/>Gesture detection]
    end

    subgraph "Data Objects"
        Tasks[Task Objects<br/>Array of task data]
        AppState[App State<br/>Current application state]
    end

    %% Object creation flow
    App -->|creates| TM
    App -->|creates| R
    App -->|creates| IEM
    App -->|creates| P
    App -->|creates| DP
    App -->|creates| QH
    App -->|creates| DM
    App -->|creates| LPM

    %% Object usage
    TM -->|uses| Tasks
    R -->|reads| Tasks
    IEM -->|modifies| Tasks
    Storage -->|persists| AppState
    AppState -->|contains| Tasks

    %% Singleton usage
    TM -->|uses| Config
    TM -->|uses| Utils
    R -->|uses| Config
    R -->|uses| Utils
    App -->|uses| Storage
    IEM -->|uses| Sync

    style Config fill:#f9f
    style Utils fill:#f9f
    style Storage fill:#f9f
    style App fill:#bfb
    style Tasks fill:#bbf
```

## Task Object State Transitions

```mermaid
stateDiagram-v2
    [*] --> Created: new Task()
    Created --> Today: list = 'today'
    Created --> Tomorrow: list = 'tomorrow'

    Today --> Tomorrow: moveTask()
    Tomorrow --> Today: moveTask()

    Today --> Important: toggleImportance()
    Tomorrow --> Important: toggleImportance()
    Important --> Today: toggleImportance()
    Important --> Tomorrow: toggleImportance()

    Today --> WithDeadline: setDeadline()
    Tomorrow --> WithDeadline: setDeadline()
    WithDeadline --> Today: clearDeadline()
    WithDeadline --> Tomorrow: clearDeadline()

    Today --> WithSubtasks: addSubtask()
    Tomorrow --> WithSubtasks: addSubtask()
    Important --> WithSubtasks: addSubtask()
    WithDeadline --> WithSubtasks: addSubtask()

    Today --> Completed: toggleTask()
    Tomorrow --> Completed: toggleTask()
    Important --> Completed: toggleTask()
    WithDeadline --> Completed: toggleTask()
    WithSubtasks --> Completed: toggleTask()

    Completed --> Today: toggleTask()
    Completed --> Tomorrow: toggleTask()

    Completed --> Deleted: Date rollover cleanup
    Today --> Deleted: deleteTask()
    Tomorrow --> Deleted: deleteTask()

    Deleted --> [*]
```

## Component Communication Flow

```mermaid
graph TD
    subgraph "User Interface Layer"
        DOM[DOM Elements]
        Events[Event Handlers]
    end

    subgraph "Controller Layer"
        App[DoItTomorrowApp]
        Modules[Feature Modules]
    end

    subgraph "Data Layer"
        State[Application State]
        Storage[LocalStorage]
    end

    %% UI to Controller
    DOM -->|events| Events
    Events -->|calls| App
    App -->|delegates| Modules

    %% Controller to Data
    Modules -->|modifies| State
    State -->|persists| Storage

    %% Data to UI
    State -->|triggers| App
    App -->|calls| Renderer[Renderer]
    Renderer -->|updates| DOM

    %% Bidirectional
    Storage <-->|load/save| State

    style DOM fill:#f9f
    style App fill:#bfb
    style State fill:#bbf
```

## Object Lifecycle

```mermaid
sequenceDiagram
    participant Browser
    participant HTML
    participant Scripts
    participant App
    participant Modules
    participant Storage

    Browser->>HTML: Load index.html
    HTML->>Scripts: Load JS files in order
    Scripts->>Scripts: Define Config, Utils, Storage
    Scripts->>App: Create DoItTomorrowApp instance

    Note over App: Constructor phase
    App->>Storage: Storage.load()
    Storage->>App: Return saved data
    App->>Modules: Create all module instances
    Modules->>App: Modules ready

    Note over App: Initialization phase
    App->>App: init()
    App->>App: setupEventListeners()
    App->>App: render()
    App->>Browser: Register service worker

    Note over App: Running phase
    loop User Interactions
        Browser->>App: User event
        App->>Modules: Delegate to module
        Modules->>App: Update data
        App->>Storage: Save (debounced)
        App->>App: Render (debounced)
    end

    Note over App: Cleanup phase
    Browser->>App: Page unload
    App->>Storage: Final save
    App->>Modules: Cleanup timers
```

## Memory References

```mermaid
graph LR
    subgraph "Global Scope"
        Window[window]
        Document[document]
        LocalStorage[localStorage]
    end

    subgraph "Application Scope"
        AppInstance[app instance]
        Config[Config object]
        Utils[Utils object]
        Storage[Storage object]
    end

    subgraph "Module References"
        TaskManagerRef[app.taskManager]
        RendererRef[app.renderer]
        OtherModules[app.otherModules...]
    end

    subgraph "Data References"
        AppData[app.data]
        TasksArray[app.data.tasks]
    end

    Window -->|contains| AppInstance
    AppInstance -->|references| Config
    AppInstance -->|references| Utils
    AppInstance -->|references| Storage
    AppInstance -->|contains| TaskManagerRef
    AppInstance -->|contains| RendererRef
    AppInstance -->|contains| OtherModules
    AppInstance -->|contains| AppData
    AppData -->|contains| TasksArray

    style Window fill:#ddd
    style AppInstance fill:#bfb
    style AppData fill:#bbf
```