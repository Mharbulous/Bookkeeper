# Asynchronous Processes Documentation Table

## Overview

Create comprehensive documentation of all asynchronous processes currently running in the Bookkeeper application. This documentation is essential for implementing the Asynchronous Task Registry Manager system.

## Purpose

Before implementing the Task Registry system, we need a complete inventory of all async processes to ensure proper registration and management. This table will serve as the foundation for:
- Task Registry implementation planning
- Identifying parent-child relationships between processes
- Ensuring no async processes are missed during registry integration
- Understanding termination requirements for each process type

## Documentation Requirements

## Comprehensive Async Process Documentation

Each async process is documented using the following structured template:

```javascript
/**
 * ASYNC PROCESS: [Name]
 * Location: [File:Line]
 * Type: [Worker|Timer|Observer|Promise|EventListener|Watcher]
 * Trigger: [What starts it]
 * Cleanup: [How it's terminated]
 * Dependencies: [What it depends on]
 * Risk Level: [Low|Medium|High] for memory leaks
 * Parent Process: [What spawned it]
 * Cleanup Verification: [✓|✗|Partial]
 */
```

---

### **WEB WORKERS & WORKER MANAGEMENT**

**ASYNC PROCESS: File Hash Web Worker**
- **Location**: `src/workers/fileHashWorker.js:1-300`
- **Type**: Web Worker
- **Trigger**: File deduplication process initiation
- **Cleanup**: `worker.terminate()` in `useWebWorker.js:215`
- **Dependencies**: Browser Web Worker support, File API
- **Risk Level**: Medium (improper termination blocks resources)
- **Parent Process**: File Deduplication System
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Worker Manager Health Check**
- **Location**: `src/composables/useWebWorker.js:90`
- **Type**: setInterval
- **Trigger**: Worker initialization
- **Cleanup**: `clearInterval()` in `useWebWorker.js:87,102`
- **Dependencies**: Web Worker lifecycle
- **Risk Level**: Low (auto-cleanup on unmount)
- **Parent Process**: Web Worker Management
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Worker Message Timeout**
- **Location**: `src/composables/useWebWorker.js:115,220`
- **Type**: setTimeout
- **Trigger**: Worker message sending
- **Cleanup**: `clearTimeout()` on response or cleanup
- **Dependencies**: Web Worker communication
- **Risk Level**: Low (automatic cleanup)
- **Parent Process**: Worker Communication
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Worker Restart Delay**
- **Location**: `src/composables/useWorkerManager.js:155`
- **Type**: setTimeout
- **Trigger**: Worker failure detection
- **Cleanup**: Natural completion (1 second)
- **Dependencies**: Worker management system
- **Risk Level**: Low (short-lived)
- **Parent Process**: Worker Error Recovery
- **Cleanup Verification**: ✓

---

### **TIMERS & INTERVALS**

**ASYNC PROCESS: AsyncTracker Statistics Monitor**
- **Location**: `src/App.vue:54-61`
- **Type**: setInterval
- **Trigger**: Application startup (component mount)
- **Cleanup**: `clearInterval()` in `App.vue:78-82` on unmount
- **Dependencies**: AsyncTracker system, development environment
- **Risk Level**: Low (expected system monitoring process)
- **Parent Process**: Application Lifecycle
- **Cleanup Verification**: ✓
- **Notes**: Self-monitoring process that tracks async processes every 30 seconds. Registered as 'async-monitoring' type and excluded from suspicious process detection. This process is expected to persist for the application's lifetime and should never be flagged as suspicious.

**ASYNC PROCESS: Folder Analysis Timeout Controller**
- **Location**: `src/composables/useFolderTimeouts.js:32`
- **Type**: setTimeout with AbortController
- **Trigger**: Folder processing initiation
- **Cleanup**: `clearTimeout()` or `controller.abort()`
- **Dependencies**: Modern browser AbortController support
- **Risk Level**: Medium (complex cleanup logic)
- **Parent Process**: Folder Processing System
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Global Processing Timeout**
- **Location**: `src/composables/useFolderTimeouts.js:102`
- **Type**: setTimeout
- **Trigger**: Folder analysis start
- **Cleanup**: `clearTimeout()` in `useFolderTimeouts.js:247`
- **Dependencies**: Folder processing pipeline
- **Risk Level**: Low (explicit cleanup)
- **Parent Process**: Folder Analysis Controller
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Time-Based Warning Monitor**
- **Location**: `src/composables/useTimeBasedWarning.js:101`
- **Type**: setInterval
- **Trigger**: File processing start
- **Cleanup**: `clearInterval()` in `useTimeBasedWarning.js:106`
- **Dependencies**: Processing time estimation
- **Risk Level**: Medium (continuous monitoring)
- **Parent Process**: Progress Monitoring System
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Login Form Success Delay**
- **Location**: `src/components/features/auth/LoginForm.vue:108`
- **Type**: setTimeout
- **Trigger**: Successful authentication
- **Cleanup**: Natural completion (brief delay)
- **Dependencies**: Authentication success
- **Risk Level**: Low (short-lived)
- **Parent Process**: Authentication Flow
- **Cleanup Verification**: Partial (no explicit cleanup)

**ASYNC PROCESS: Folder Options Analysis Delay**
- **Location**: `src/composables/useFolderOptions.js:166`
- **Type**: setTimeout
- **Trigger**: UI completion message display
- **Cleanup**: Auto-cleanup after 500ms
- **Dependencies**: UI state management
- **Risk Level**: Low (short-lived)
- **Parent Process**: UI Interaction Handler
- **Cleanup Verification**: ✓

---

### **EVENT LISTENERS**

**ASYNC PROCESS: Document Click Outside Detection**
- **Location**: `src/components/AppSwitcher.vue:342,346`
- **Type**: Document Event Listener
- **Trigger**: Component mount
- **Cleanup**: `removeEventListener()` in onUnmounted
- **Dependencies**: DOM document object
- **Risk Level**: High (global event listener)
- **Parent Process**: App Switcher Component
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Modal Focus Trap**
- **Location**: `src/components/features/upload/CloudFileWarningModal.vue:257,276,284`
- **Type**: Document Event Listener (keydown)
- **Trigger**: Modal visibility
- **Cleanup**: `removeEventListener()` on unmount/hide
- **Dependencies**: Modal visibility state
- **Risk Level**: Medium (accessibility critical)
- **Parent Process**: Modal Accessibility System
- **Cleanup Verification**: ✓

**ASYNC PROCESS: AbortController Signal Listeners**
- **Location**: `src/composables/useFolderTimeouts.js:65,99`
- **Type**: AbortSignal Event Listener
- **Trigger**: AbortController creation
- **Cleanup**: `removeEventListener()` in cleanup
- **Dependencies**: AbortController lifecycle
- **Risk Level**: Medium (complex cleanup chain)
- **Parent Process**: Timeout Management
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Folder Analysis Abort Handler**
- **Location**: `src/composables/useFolderAnalysis.js:184`
- **Type**: AbortSignal Event Listener
- **Trigger**: Analysis start with timeout
- **Cleanup**: Automatic on signal abort
- **Dependencies**: Analysis timeout system
- **Risk Level**: Low (auto-cleanup)
- **Parent Process**: Folder Analysis Process
- **Cleanup Verification**: Partial

---

### **VUE REACTIVITY & WATCHERS**

**ASYNC PROCESS: Favicon Route Watcher**
- **Location**: `src/composables/useFavicon.js:27`
- **Type**: Vue watch
- **Trigger**: Route path changes
- **Cleanup**: Automatic unwatch on scope disposal
- **Dependencies**: Vue Router
- **Risk Level**: Low (Vue manages cleanup)
- **Parent Process**: Application Navigation
- **Cleanup Verification**: ✓

**ASYNC PROCESS: App Switcher Hover Watcher**
- **Location**: `src/components/AppSwitcher.vue:106`
- **Type**: Vue watch
- **Trigger**: Props change
- **Cleanup**: Automatic unwatch on component unmount
- **Dependencies**: Component props reactivity
- **Risk Level**: Low (Vue managed)
- **Parent Process**: Component Reactivity System
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Folder Options Completion Watcher**
- **Location**: `src/components/features/upload/FolderOptionsDialog.vue:240`
- **Type**: Vue watch
- **Trigger**: Props.allFilesComplete change
- **Cleanup**: Automatic on component unmount
- **Dependencies**: Upload completion state
- **Risk Level**: Low (Vue managed)
- **Parent Process**: Upload Progress Monitoring
- **Cleanup Verification**: ✓

**ASYNC PROCESS: File Upload Queue File Watcher**
- **Location**: `src/components/features/upload/FileUploadQueue.vue:243,326`
- **Type**: Vue watch (deep)
- **Trigger**: Props.files changes
- **Cleanup**: Automatic on component unmount
- **Dependencies**: File queue state
- **Risk Level**: Medium (deep watching large arrays)
- **Parent Process**: File Queue Management
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Cloud Warning Modal Visibility Watcher**
- **Location**: `src/components/features/upload/CloudFileWarningModal.vue:249`
- **Type**: Vue watch
- **Trigger**: Props.isVisible changes
- **Cleanup**: Automatic on component unmount
- **Dependencies**: Modal visibility state
- **Risk Level**: Low (Vue managed)
- **Parent Process**: Modal State Management
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Auth Store State Watcher**
- **Location**: `src/stores/auth.js:303`
- **Type**: Vue watch with unwatch
- **Trigger**: Auth state monitoring
- **Cleanup**: Explicit `unwatch()` call
- **Dependencies**: Authentication state changes
- **Risk Level**: Medium (store-level watcher)
- **Parent Process**: Authentication System
- **Cleanup Verification**: ✓

---

### **COMPONENT LIFECYCLE & DOM OPERATIONS**

**ASYNC PROCESS: App Switcher DOM Updates**
- **Location**: `src/components/AppSwitcher.vue:111,157,171,198,209,220`
- **Type**: Vue nextTick
- **Trigger**: Component reactivity
- **Cleanup**: Automatic (single execution)
- **Dependencies**: Vue reactivity system
- **Risk Level**: Low (single-use)
- **Parent Process**: Component State Management
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Cloud Modal DOM Updates**
- **Location**: `src/components/features/upload/CloudFileWarningModal.vue:251,268`
- **Type**: Vue nextTick
- **Trigger**: Modal rendering
- **Cleanup**: Automatic (single execution)
- **Dependencies**: DOM rendering cycle
- **Risk Level**: Low (single-use)
- **Parent Process**: Modal Rendering
- **Cleanup Verification**: ✓

**ASYNC PROCESS: File Queue Intersection Observer**
- **Location**: `src/components/features/upload/FileQueuePlaceholder.vue:28`
- **Type**: IntersectionObserver (VueUse)
- **Trigger**: Component mount
- **Cleanup**: `stop()` method on unmount
- **Dependencies**: VueUse intersection observer
- **Risk Level**: Medium (observer lifecycle)
- **Parent Process**: Lazy Loading System
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Idle Callback Observer Setup**
- **Location**: `src/components/features/upload/FileQueuePlaceholder.vue:47`
- **Type**: requestIdleCallback
- **Trigger**: Component initialization
- **Cleanup**: Browser-managed
- **Dependencies**: Browser idle callback support
- **Risk Level**: Low (browser managed)
- **Parent Process**: Performance Optimization
- **Cleanup Verification**: Partial

---

### **PROMISE CHAINS & ASYNC OPERATIONS**

**ASYNC PROCESS: Firebase Auth State Monitoring**
- **Location**: `src/services/authService.js:12`
- **Type**: Firebase onAuthStateChanged
- **Trigger**: Auth service initialization
- **Cleanup**: `unsubscribe()` callback immediate execution
- **Dependencies**: Firebase Auth SDK
- **Risk Level**: High (Firebase listener)
- **Parent Process**: Authentication System
- **Cleanup Verification**: ✓

**ASYNC PROCESS: File Queue Processing Chain**
- **Location**: `src/composables/useFileQueue.js:34,118,229`
- **Type**: Promise chains with async/await
- **Trigger**: File upload initiation
- **Cleanup**: Abortable via queue state management
- **Dependencies**: File processing pipeline
- **Risk Level**: Medium (long-running operations)
- **Parent Process**: File Upload System
- **Cleanup Verification**: Partial

**ASYNC PROCESS: Deduplication Processing Coordination**
- **Location**: `src/composables/useQueueDeduplication.js:26`
- **Type**: Promise chains with Worker coordination
- **Trigger**: File deduplication start
- **Cleanup**: `terminateWorker()` in cleanup
- **Dependencies**: Worker and main thread coordination
- **Risk Level**: Medium (multi-process coordination)
- **Parent Process**: File Processing Pipeline
- **Cleanup Verification**: ✓

**ASYNC PROCESS: File Progress Yield Points**
- **Location**: `src/composables/useFolderProgress.js:58`
- **Type**: Promise with setTimeout
- **Trigger**: Progress reporting loops
- **Cleanup**: Natural completion (10ms yields)
- **Dependencies**: Progress monitoring system
- **Risk Level**: Low (micro-tasks)
- **Parent Process**: UI Responsiveness System
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Route Guard Auth Waiting**
- **Location**: `src/router/guards/auth.js:12`
- **Type**: Async Promise await
- **Trigger**: Route navigation
- **Cleanup**: Natural completion on auth resolution
- **Dependencies**: Auth store initialization
- **Risk Level**: Low (navigation-scoped)
- **Parent Process**: Router Navigation System
- **Cleanup Verification**: ✓

---

### **LAZY LOADING & DYNAMIC IMPORTS**

**ASYNC PROCESS: Route Component Lazy Loading**
- **Location**: `src/router/index.js:11,17,23,29,35,41,47,53,59`
- **Type**: Dynamic imports
- **Trigger**: Route navigation
- **Cleanup**: Automatic on route change
- **Dependencies**: Vue Router and build system
- **Risk Level**: Low (framework managed)
- **Parent Process**: Router System
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Firebase Services Lazy Loading**
- **Location**: `src/stores/auth.js:187,269,284`
- **Type**: Dynamic imports
- **Trigger**: First auth operation
- **Cleanup**: Module cache persistence
- **Dependencies**: ES modules and bundler
- **Risk Level**: Low (module system managed)
- **Parent Process**: Authentication Store
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Team Store Service Lazy Loading**
- **Location**: `src/stores/team.js:89`
- **Type**: Dynamic imports
- **Trigger**: Auth store initialization
- **Cleanup**: Module cache persistence
- **Dependencies**: Store interdependencies
- **Risk Level**: Low (module system managed)
- **Parent Process**: Team Management Store
- **Cleanup Verification**: ✓

---

### **SPECIALIZED ASYNC PATTERNS**

**ASYNC PROCESS: File Queue nextTick Synchronization**
- **Location**: `src/composables/useFileQueue.js:81,145,201`
- **Type**: Vue nextTick
- **Trigger**: Queue state updates
- **Cleanup**: Automatic (single execution)
- **Dependencies**: Vue reactivity system
- **Risk Level**: Low (framework managed)
- **Parent Process**: Queue State Management
- **Cleanup Verification**: ✓

**ASYNC PROCESS: Memory Leak Test Timeouts**
- **Location**: Various test files
- **Type**: setTimeout in test suites
- **Trigger**: Test execution
- **Cleanup**: `clearTimeout()` in test cleanup
- **Dependencies**: Test framework
- **Risk Level**: Low (test environment only)
- **Parent Process**: Test Infrastructure
- **Cleanup Verification**: ✓

### Column Definitions

- **Process Name**: Descriptive name for the async process
- **File Location**: File path and approximate line numbers where process is created/managed  
- **Process Type**: Type of async operation (Web Worker, setTimeout, setInterval, Promise chain, etc.)
- **Parent Process**: If this process is spawned by another process, identify the parent
- **Termination Method**: How the process is currently terminated (if at all)
- **Notes**: Any special considerations, cleanup requirements, or dependencies

## Process Categories to Document

### Web Workers
- File hashing workers
- Any background processing workers

### Timers and Intervals  
- Time monitoring intervals
- Progress update timers
- Cleanup timeouts
- Performance measurement timers

### Promise Chains and Async Operations
- File deduplication processes
- Firebase uploads
- Progress tracking operations
- UI update cycles

### Component Lifecycle Processes
- Lazy loading operations
- Cache management processes
- Progressive rendering systems

## AsyncTracker Monitoring Logic

The AsyncTracker system includes sophisticated monitoring logic designed to identify problematic async processes while excluding expected system processes:

### Suspicious Process Detection
- **Long-running threshold**: 30 seconds from process creation
- **Excluded process types**: `'watcher'`, `'listener'`, `'async-monitoring'`
- **Self-monitoring exclusion**: The AsyncTracker's own monitoring interval is never flagged as suspicious

### Process Classification
1. **async-monitoring**: The AsyncTracker's 30-second statistics logging interval
   - Expected to run continuously for application lifetime
   - Explicitly excluded from suspicious process detection
   - Registered with proper cleanup on component unmount

2. **Suspicious processes**: Long-running processes that are NOT expected system processes
   - Triggers warning messages in console
   - Indicates potential memory leaks or stuck operations

3. **Expected system processes**: Long-running but legitimate processes
   - Shows info message: "Long-running processes detected, but all are expected system processes"
   - No warning generated when only these processes are running

### Console Output Behavior

The AsyncTracker monitoring system follows a simple rule:

**Desired Behavior:**
- **Only 1 async-monitoring process** → **No console output at all**
- **Any other scenario** → **Show full statistics table including async-monitoring**

**Specific Cases:**

✅ **Silent Cases (No Console Output):**
- Only 1 `async-monitoring` process running (normal application state)

🔊 **Console Output Cases (Full Statistics Table Displayed):**
- 1 `async-monitoring` + 1 `worker` → Show table with both processes
- 2+ `async-monitoring` processes → Show table + error about duplicates (bug condition)
- 0 `async-monitoring` + other processes → Show table with other processes
- Any combination of processes beyond just the single expected `async-monitoring`

**When Console Output Occurs, It Includes:**
- **Always**: Full statistics table showing ALL process types including `async-monitoring`
- **If multiple monitors detected**: Error message about duplicate monitoring processes
- **If suspicious processes found**: Warning about potentially problematic long-running processes

**Monitoring Interval:** Every 30 seconds

### Critical Implementation Requirements for Task Registry

1. **High-Priority Tracking**: Focus on High and Medium risk processes first
2. **Global Event Listeners**: Document click handlers and modal focus traps need special attention
3. **Worker Lifecycle**: Complex worker management with health checks and restart logic
4. **AbortController Integration**: Modern timeout patterns with signal cleanup
5. **Vue Reactivity Integration**: Must not interfere with Vue's built-in cleanup mechanisms
6. **Self-Monitoring Awareness**: Task Registry must exclude its own monitoring processes from leak detection

## Enhanced Methodology Validation

The improved methodology successfully identified **13 additional processes** beyond the initial 21, including:
- AsyncTracker self-monitoring interval (critical system process)
- Document event listeners (click outside, focus trapping)
- Vue reactivity watchers (route, props, visibility)
- AbortController signal listeners
- Component lifecycle async operations

## Implementation Notes

This comprehensive async process inventory provides the definitive foundation for Task Registry implementation. Each process includes:
- **Precise location information** for implementation targeting
- **Risk assessment** for prioritization
- **Cleanup verification status** for reliability assurance
- **Parent-child relationships** for hierarchical management
- **Dependency mapping** for coordination requirements

The structured documentation format enables systematic Task Registry development without requiring additional codebase archaeology.

---

**Dependencies**: None (foundational research task)  
**Enables**: `AsynchronousTaskRegistry.md` implementation  
**Priority**: High (blocks Task Registry implementation)  
**Effort**: Medium (enhanced research and comprehensive documentation)  
**Status**: ✅ **COMPLETE** - Ready for Task Registry implementation