Asynchronous Task Registry: Project To-Do
The goal of this project is to create a robust, centralized system for managing the lifecycle of all asynchronous tasks within the application. This registry will ensure that tasks are properly tracked, terminated, and cleaned up, preventing memory leaks and improving overall system stability.

Core Concepts
The system will be built around a single TaskManager class (or module) that maintains a centralized registry of all active asynchronous processes. Each process will be identified by a unique ID and will store a reference to its parent process if one exists, creating a hierarchical structure.

Key Components
TaskManager Class: A singleton class that holds the registry and provides the public-facing methods for interaction.

Process Registry: An internal data structure (e.g., a Map or Object) where each key is a unique task ID and the value is an object containing information about the task (e.g., the process reference, its parent's ID).

Unique ID Generator: A simple function to create a unique identifier for each task upon registration.

Required Methods and Functionality
1. register(task, parentId)
This is the central method for adding a new task to the registry.

task: The asynchronous process itself. This could be a reference to a setTimeout ID, a Promise, or a Web Worker instance.

parentId (Optional): The unique ID of the parent task. This is crucial for handling nested processes like your recursive search.

The method will:

Generate a unique ID for the new task.

Add the task and its parentId to the internal registry.

Return the new task's unique ID for later use (e.g., for termination or as a parentId for child tasks).

2. terminate(taskId)
This is the primary method for stopping a task and ensuring a clean shutdown.

taskId: The unique ID of the task to be terminated.

The method will:

Retrieve the task from the registry using its ID.

Check if the task has any child tasks.

If child tasks exist, it will recursively call terminate() on each child's ID first. This ensures the entire nested tree is properly unwound from the bottom up.

Once all children are terminated, it will execute the appropriate cleanup action for the parent task (e.g., clearTimeout(), worker.terminate()).

Finally, it will remove the task from the registry using the cleanup() method.

3. cleanup(taskId)
This method is for internal use by terminate() and is responsible for removing a completed or terminated task from the registry. This prevents the registry from growing indefinitely.

4. terminateAll()
A global method that will iterate through the entire registry and call terminate() on all top-level (root) tasks. This is a powerful feature for a complete application shutdown or a major state reset.

Specific Case: Recursive Folder Search
For your recursive search and timeout scenario, the register() and terminate() methods will work together to manage the nested processes.

When a function calls a sub-search on a sub-folder, it will register() that new process and pass the parent search's ID as the parentId.

When a timeout is set for a specific folder search, it will also be register()ed with the folder search's unique ID as its parentId.

This hierarchical structure allows for a single, reliable point of termination. To stop the entire search, you only need to call manager.terminate(rootSearchId). The manager will then handle the rest, ensuring that all timeouts and sub-searches are correctly canceled.