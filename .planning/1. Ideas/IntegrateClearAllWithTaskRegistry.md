# Integrate Clear All Button with Task Registry System

## Overview

Refactor the Clear All button's comprehensive cleanup functionality to leverage the centralized Asynchronous Task Registry Manager instead of manually coordinating cleanup across multiple composables and components.

## Context

The Clear All button cleanup system (documented in `ClearAllComprehensiveCleanup.md`) currently manually orchestrates termination across multiple async processes: web workers, time monitoring, deduplication processes, UI updates, and component caches. This approach works but creates tight coupling and maintenance overhead as more async tasks are added to the application.

## High-Level Refactoring Goals

### Replace Manual Coordination with Registry-Based Management
- **Current**: Clear All manually calls cleanup methods across 6+ composables
- **Target**: Clear All calls `TaskRegistry.terminateAll()` or targeted termination methods

### Leverage Hierarchical Task Termination
- Register all async processes (workers, timers, deduplication) in the Task Registry with proper parent-child relationships
- Replace manual cleanup orchestration with registry's recursive termination system
- Eliminate the need for custom cleanup sequencing and error handling

### Improve Scalability and Maintainability  
- New async processes automatically participate in cleanup through registry registration
- Reduce coupling between Clear All functionality and individual composables
- Centralize termination logic and error handling in the Task Registry

## Prerequisites

This refactoring depends on:
1. **Task Registry Implementation**: Complete implementation of the Asynchronous Task Registry Manager system
2. **Process Registration**: All relevant async processes (workers, timers, deduplication) registered with the Task Registry
3. **Integration Testing**: Registry system proven stable with existing async workflows

## Expected Benefits

- **Simplified Cleanup**: Single `terminateAll()` call replaces manual multi-step coordination
- **Robust Termination**: Registry's recursive cleanup handles complex parent-child relationships automatically  
- **Reduced Maintenance**: New async processes automatically participate in cleanup without Clear All modifications
- **Consistent Error Handling**: Centralized termination error handling through the Task Registry
- **Better Performance**: Registry can optimize termination order and resource cleanup

## Implementation Scope

This task involves refactoring the existing comprehensive cleanup system, not redesigning the Clear All functionality. The user experience and cleanup results should remain identical, with improved internal architecture and maintainability.

---

**Dependencies**: `docs/plans/Bookkeeper/2. TODOs/AsynchronousTaskRegistry.md` implementation  
**Related Plans**: `ClearAllComprehensiveCleanup.md`  
**Priority**: Medium (post-MVP enhancement)  
**Effort**: Low-Medium (primarily refactoring existing working system)