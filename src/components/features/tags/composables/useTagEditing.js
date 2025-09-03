import { ref } from 'vue'

export function useTagEditing(tag, allowCustomInput, emit) {
  // Track current focused tag for pagination management
  const currentFocusedTag = ref(null)

  // Helper functions
  const capitalizeFirstLetter = (str) => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const resetFilterState = () => {
    tag.filterText = ''
    tag.filterTextRaw = ''
    tag.isFiltering = false
    tag.highlightedIndex = -1
    tag.customInputValue = ''
    tag.isHeaderEditing = false
    tag.hasStartedTyping = false
    tag.isOpen = false
  }

  const resetPaginationState = (tagId) => {
    // Reset all pagination radio buttons for this tag to page 1
    const pageRadios = document.querySelectorAll(`input[name*="${tagId}"]`)
    pageRadios.forEach((radio) => {
      radio.checked = radio.id.includes('page1')
    })
  }

  // Main event handlers
  const handleTagClick = () => {
    // Check if already in editing mode before making changes
    const wasAlreadyEditing = tag.isHeaderEditing
    
    // Open dropdown and enter edit mode in one action
    tag.isOpen = true
    tag.isHeaderEditing = true
    
    // Only reset hasStartedTyping on initial click, not during editing (prevents spacebar resets)
    if (!wasAlreadyEditing) {
      tag.hasStartedTyping = false
    }
    
    // Update focused tag for pagination management
    if (currentFocusedTag.value && currentFocusedTag.value.id !== tag.id) {
      resetPaginationState(currentFocusedTag.value.id)
    }
    currentFocusedTag.value = tag
    
    console.log(`Tag clicked and opened: ${tag.tagName}`)
  }

  const handleTagBlur = (event) => {
    // Capture event data before timeout (event becomes stale inside setTimeout)
    const relatedTarget = event.relatedTarget
    const currentTarget = event.currentTarget
    
    // Add a small delay to allow clicks on dropdown options to register
    setTimeout(() => {
      const smartTagContainer = currentTarget ? currentTarget.closest('.smart-tag') : null
      
      // Check if focus is still within the smart-tag container or dropdown elements
      const focusStillInTag = relatedTarget && smartTagContainer && smartTagContainer.contains(relatedTarget)
      const focusInDropdownOption = relatedTarget && relatedTarget.closest('.dropdown-option')
      const focusInPagination = relatedTarget && relatedTarget.closest('.dropdown-pagination')
      
      // Only keep dropdown open if focus is explicitly within dropdown elements
      if (!focusStillInTag && !focusInDropdownOption && !focusInPagination) {
        // Discard any typed text and revert to original value
        tag.filterText = ''
        tag.filterTextRaw = ''
        tag.isFiltering = false
        tag.hasStartedTyping = false
        tag.isHeaderEditing = false
        tag.isOpen = false
        console.log(`Focus lost - discarded typed text, reverted to: ${tag.tagName}`)
      } else {
        console.log(`Focus still within dropdown area, keeping open`)
      }
    }, 150) // Slightly longer delay
  }

  const handleTypeToFilter = (event) => {
    // Only handle typing when header is in edit mode (for open categories)
    if (allowCustomInput && !tag.isHeaderEditing) {
      return
    }
    
    // Ignore non-alphanumeric keys except backspace
    if (event.key.length > 1 && event.key !== 'Backspace' && event.key !== 'Enter' && event.key !== 'Escape' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return
    }
    
    // Handle special keys
    if (event.key === 'Escape') {
      // Discard typed text and revert to original value
      tag.filterText = ''
      tag.filterTextRaw = ''
      tag.isFiltering = false
      tag.hasStartedTyping = false
      tag.isHeaderEditing = false
      tag.isOpen = false
      console.log(`Escaped - reverted to original: ${tag.tagName}`)
      return
    }
    
    if (event.key === 'Enter') {
      handleEnterKey()
      // Close dropdown after accepting value
      tag.isOpen = false
      tag.isHeaderEditing = false
      return
    }
    
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      handleArrowNavigation(event)
      return
    }
    
    // Handle text input
    let newFilterText = tag.filterText || ''
    
    if (event.key === 'Backspace') {
      newFilterText = newFilterText.slice(0, -1)
    } else if (event.key.length === 1) {
      newFilterText += event.key
    }
    
    // Update filter state with capitalization
    const capitalizedText = capitalizeFirstLetter(newFilterText)
    tag.filterText = capitalizedText  // Display capitalized version
    tag.filterTextRaw = newFilterText  // Store original for filtering
    tag.isFiltering = capitalizedText.length > 0
    
    // Mark that user has started typing (for cursor positioning)
    if (allowCustomInput && capitalizedText.length > 0) {
      tag.hasStartedTyping = true
      console.log(`Set hasStartedTyping=true for text: "${capitalizedText}" (length: ${capitalizedText.length})`)
    } else if (allowCustomInput && capitalizedText.length === 0) {
      // Reset to left cursor when user has deleted all content
      tag.hasStartedTyping = false
      console.log(`Reset hasStartedTyping=false - user deleted all content`)
    }
    
    if (allowCustomInput) {
      tag.customInputValue = capitalizedText
      tag.highlightedIndex = -1 // No auto-highlight for open categories
    } else {
      // For locked categories, would need access to filtered options to highlight first match
      // This would be handled by the parent component
    }
    
    console.log(`Filtering with: "${capitalizedText}"`)
    
    // Emit filter change event
    emit('filter-changed', { filterText: capitalizedText, rawText: newFilterText })
  }

  const handleEnterKey = () => {
    if (allowCustomInput) {
      // For open categories, use filter text or current tag name
      const newValue = tag.filterText || tag.tagName
      if (newValue && newValue !== tag.tagName) {
        // Emit events for adding new option and updating tag
        emit('tag-created', { tagName: newValue, categoryId: tag.categoryId })
        emit('tag-updated', { ...tag, tagName: newValue })
        tag.tagName = newValue
        console.log(`Tag updated to: ${newValue}`)
      }
    } else {
      // For locked categories, would use highlighted option
      // This would be handled by the parent component with highlighted index
    }
    
    resetFilterState()
  }

  const handleArrowNavigation = (event) => {
    if (allowCustomInput) return // No arrow navigation for open categories
    
    event.preventDefault()
    // Arrow navigation would be handled by parent component with access to filtered options
    emit('arrow-navigation', { direction: event.key, currentIndex: tag.highlightedIndex })
  }

  const selectFromDropdown = (newValue) => {
    const startTime = performance.now()

    // Update tag and emit events
    const oldValue = tag.tagName
    tag.tagName = newValue
    console.log(`Tag updated via dropdown: ${oldValue} → ${newValue}`)

    // Emit selection event
    emit('tag-selected', { oldValue, newValue, tag })

    // Reset filter state and pagination
    resetFilterState()
    resetPaginationState(tag.id)

    const endTime = performance.now()
    console.log(`Dropdown selection completed in ${Math.round((endTime - startTime) * 100) / 100}ms`)
  }

  // Global click handler for closing dropdowns
  const handleGlobalClick = (event) => {
    // Check if click is outside any smart-tag container
    const clickedSmartTag = event.target.closest('.smart-tag')
    
    if (tag.isOpen && (!clickedSmartTag || !clickedSmartTag.contains(event.target))) {
      // Discard typed text and close dropdown
      tag.filterText = ''
      tag.filterTextRaw = ''
      tag.isFiltering = false
      tag.hasStartedTyping = false
      tag.isHeaderEditing = false
      tag.isOpen = false
      console.log(`Global click - closed dropdown for: ${tag.tagName}`)
    }
    
    // Reset pagination for previously focused tag
    if (!clickedSmartTag && currentFocusedTag.value) {
      resetPaginationState(currentFocusedTag.value.id)
      currentFocusedTag.value = null
      console.log('Clicked outside tags - reset pagination')
    }
  }

  return {
    handleTagClick,
    handleTagBlur,
    handleTypeToFilter,
    selectFromDropdown,
    resetPaginationState,
    resetFilterState,
    handleGlobalClick
  }
}