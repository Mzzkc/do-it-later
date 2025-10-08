# Module Dependency Graph

## Complete Module Hierarchy

```mermaid
graph TD
    subgraph "Layer 0: Configuration"
        Config[config.js<br/>Constants & Settings]
    end

    subgraph "Layer 1: Utilities"
        Utils[utils.js<br/>Helper Functions]
    end

    subgraph "Layer 2: Core Services"
        Storage[storage.js<br/>LocalStorage]
        Sync[sync.js<br/>Import/Export Format]
    end

    subgraph "Layer 3: Data Management"
        TaskManager[task-manager.js<br/>Task CRUD]
    end

    subgraph "Layer 4: UI Components"
        Renderer[renderer.js<br/>DOM Rendering]
        InteractionManager[interaction-manager.js<br/>Touch/Mouse Events]
        DeadlinePicker[deadline-picker.js<br/>Date Selection]
        Pomodoro[pomodoro.js<br/>Timer Feature]
    end

    subgraph "Layer 5: Features"
        ImportExport[import-export-manager.js<br/>File/Clipboard IO]
        QRHandler[qr-handler.js<br/>QR Generation]
        QRScanner[qr-scanner.js<br/>QR Reading]
        DevMode[dev-mode.js<br/>Debug Tools]
    end

    subgraph "Layer 6: Application"
        App[app.js<br/>Main Controller]
    end

    subgraph "External"
        HTML[index.html]
        SW[sw.js<br/>Service Worker]
        QRLib[qrcode.min.js<br/>3rd Party]
        JSQRLib[jsQR CDN<br/>3rd Party]
    end

    %% Dependencies
    Config --> Utils
    Utils --> Storage
    Utils --> Sync
    Storage --> TaskManager
    Utils --> TaskManager
    Config --> TaskManager

    TaskManager --> Renderer
    Utils --> Renderer
    Config --> Renderer

    Config --> InteractionManager
    Config --> DeadlinePicker
    Config --> Pomodoro
    Utils --> Pomodoro

    Sync --> ImportExport
    Utils --> ImportExport
    Config --> ImportExport

    QRLib --> QRHandler
    Config --> QRHandler
    Utils --> QRHandler

    JSQRLib --> QRScanner
    Config --> QRScanner

    Config --> DevMode
    Utils --> DevMode

    %% All modules connect to App
    Storage --> App
    TaskManager --> App
    Renderer --> App
    InteractionManager --> App
    DeadlinePicker --> App
    Pomodoro --> App
    ImportExport --> App
    QRHandler --> App
    QRScanner --> App
    DevMode --> App
    Config --> App
    Utils --> App

    %% HTML loads everything
    HTML --> Config
    HTML --> Utils
    HTML --> Storage
    HTML --> Sync
    HTML --> QRLib
    HTML --> JSQRLib
    HTML --> QRScanner
    HTML --> Pomodoro
    HTML --> DeadlinePicker
    HTML --> DevMode
    HTML --> QRHandler
    HTML --> Renderer
    HTML --> TaskManager
    HTML --> InteractionManager
    HTML --> ImportExport
    HTML --> App

    %% Service Worker
    HTML --> SW

    classDef config fill:#f9f,stroke:#333,stroke-width:2px
    classDef util fill:#bbf,stroke:#333,stroke-width:2px
    classDef core fill:#bfb,stroke:#333,stroke-width:2px
    classDef data fill:#fbf,stroke:#333,stroke-width:2px
    classDef ui fill:#ffb,stroke:#333,stroke-width:2px
    classDef feature fill:#bff,stroke:#333,stroke-width:2px
    classDef app fill:#fbb,stroke:#333,stroke-width:2px
    classDef external fill:#ddd,stroke:#333,stroke-width:2px

    class Config config
    class Utils util
    class Storage,Sync core
    class TaskManager data
    class Renderer,InteractionManager,DeadlinePicker,Pomodoro ui
    class ImportExport,QRHandler,QRScanner,DevMode feature
    class App app
    class HTML,SW,QRLib,JSQRLib external
```

## Simplified Dependency Chain

```mermaid
graph LR
    Config --> Utils --> Storage --> TaskManager --> App
    Utils --> Sync --> ImportExport --> App
    TaskManager --> Renderer --> App
    Config --> AllModules[All Other Modules]

    style Config fill:#f9f
    style Utils fill:#bbf
    style Storage fill:#bfb
    style TaskManager fill:#fbf
    style Renderer fill:#ffb
    style App fill:#fbb
```

## Module Load Order (from index.html)

```mermaid
graph TD
    Start[Page Load] --> L1[1. config.js]
    L1 --> L2[2. utils.js]
    L2 --> L3[3. storage.js]
    L3 --> L4[4. sync.js]
    L4 --> L5[5. qrcode.min.js]
    L5 --> L6[6. jsQR CDN]
    L6 --> L7[7. qr-scanner.js]
    L7 --> L8[8. pomodoro.js]
    L8 --> L9[9. deadline-picker.js]
    L9 --> L10[10. dev-mode.js]
    L10 --> L11[11. qr-handler.js]
    L11 --> L12[12. renderer.js]
    L12 --> L13[13. task-manager.js]
    L13 --> L14[14. interaction-manager.js]
    L14 --> L15[15. import-export-manager.js]
    L15 --> L16[16. app.js]
    L16 --> Init[App Initialization]
```

## Circular Dependencies

**None detected** - The architecture maintains a clean hierarchical structure with no circular dependencies.

## Key Observations

1. **Config is the foundation** - Every module depends on Config for constants
2. **Utils is the shared library** - Provides common functions to most modules
3. **App is the orchestrator** - Instantiates and coordinates all other modules
4. **Clear layering** - Each layer depends only on layers below it
5. **No framework dependencies** - Pure vanilla JavaScript
6. **External dependencies minimal** - Only QR code libraries are external