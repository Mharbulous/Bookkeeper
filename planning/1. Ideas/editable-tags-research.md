# Editable Tags with Dropdowns and Autocomplete - Research Examples

This document compiles research findings for editable tag components with dropdown autocomplete functionality, focusing on "type to replace current value" patterns.

## Material Design & Component Libraries

### Material UI Autocomplete
- **URL**: https://mui.com/material-ui/react-autocomplete/
- **Description**: Autocomplete component with tag limiting using `limitTags` prop, supports multiple tag selection with customizable `renderValue` prop using Chip components
- **Key Features**: Multiple value selection, tag removal with backspace, customizable tag rendering

### Joy UI Autocomplete  
- **URL**: https://mui.com/joy-ui/react-autocomplete/
- **Description**: Enhanced text input with suggested options showing as users type, allows selection from dropdown list
- **Key Features**: Multiple tags with backspace removal, customizable appearance with `renderTag` prop, tag limiting with `limitTags`

### HeroUI (NextUI) Autocomplete
- **URL**: https://www.heroui.com/docs/components/autocomplete
- **Description**: Combines text input with listbox for filtering options matching user queries
- **Key Features**: Modern React UI with beautiful styling and fast performance

## W3C Standards & Accessibility

### W3C Editable Combobox Example
- **URL**: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-both/
- **Description**: Comprehensive example of editable combobox with both list and inline autocomplete
- **Key Features**: Typing shows popup with matching options, displays inline completion strings, follows accessibility standards

## Inline Editing Design Systems

### Atlassian Design System - Inline Edit
- **URL**: https://atlassian.design/components/inline-edit/
- **Description**: Switches between reading and editing modes on the same page with custom input components
- **Key Features**: Field-specific editing, hover-to-edit patterns, clear save/cancel actions

### PatternFly - Inline Edit
- **URL**: https://www.patternfly.org/components/inline-edit/design-guidelines/
- **Description**: Design guidelines for inline editing with toggle-based editing patterns
- **Key Features**: Pencil icon toggles, field-specific vs section-level editing options

### Oracle Alta UI - Inline Text Patterns
- **URL**: https://www.oracle.com/webfolder/ux/middleware/alta/patterns/InlineText.html
- **Description**: User assistance patterns for inline and placeholder text
- **Key Features**: Visual consistency guidelines, hover effects for editing invitation

## JavaScript Libraries & Components

### Tagify - Tags Input Component
- **URL**: https://github.com/yairEO/tagify
- **Demo**: https://yaireo.github.io/tagify/
- **Description**: Lightweight, efficient tags input component with built-in inline editing
- **Key Features**: 
  - Double-click to edit tags by default (customizable to single-click)
  - Value saved on blur or Enter key
  - Escape reverts changes, Ctrl+Z for undo
  - Read-only mode support
  - Programmatic tag addition/editing

### Select2 - jQuery Replacement for Select Boxes
- **URL**: https://select2.org/
- **Key Examples**:
  - Programmatic Control: https://select2.org/programmatic-control/add-select-clear-items
  - Basic Usage: https://select2.org/getting-started/basic-usage
- **Description**: Supports tagging with ability to add choices as user types
- **Key Features**: 
  - AJAX data loading
  - Programmatic selection replacement with `.val()` method
  - Tagging with automatic choice creation
  - Clear selections with `null` value

### Tom Select
- **URL**: https://tom-select.js.org/
- **Examples**: https://tom-select.js.org/examples/
- **Description**: Lightweight (~16kb) hybrid textbox/select box, forked from Selectize.js
- **Key Features**:
  - Framework agnostic autocomplete
  - Custom render templates for HTML customization
  - Event system for custom functionality
  - Item creation and customization
- **Note**: No built-in "type to replace" functionality, would require custom implementation

## Data Table Inline Editing

### DataTables - Inline Editing
- **URL**: https://editor.datatables.net/examples/inline-editing/simple
- **Autocomplete Example**: https://editor.datatables.net/examples/dropdown/autocomplete
- **Description**: Rapid editing of individual table fields with click-to-edit functionality
- **Key Features**: Cell-based editing, autocomplete with JSON data, save with return key

### Kendo UI - Inline Editing
- **URL**: https://demos.telerik.com/kendo-ui/grid/editing-inline
- **Description**: jQuery Grid widget with inline editing capabilities
- **Key Features**: Row-based editing mode, built-in validation, batch updates

## jQuery & Legacy Libraries

### jQuery UI Autocomplete
- **URL**: https://jqueryui.com/autocomplete/
- **Description**: Provides suggestions while typing with programming language tags examples
- **Key Features**: Simple JavaScript arrays as data sources, basic autocomplete functionality

## UI Pattern References

### UI Patterns - Inplace Editor
- **URL**: https://ui-patterns.com/patterns/InplaceEditor
- **Description**: Design pattern documentation for in-place editing
- **Key Features**: Hover-to-edit patterns, visual feedback principles, usability guidelines

### UX Stack Exchange - Inline vs Edit View Discussion
- **URL**: https://ux.stackexchange.com/questions/28210/inline-editing-vs-edit-view  
- **Description**: Community discussion on when to use inline editing vs separate edit views
- **Key Features**: UX best practices, use case scenarios, accessibility considerations

## Code Examples & Tutorials

### W3Schools - Autocomplete Input Field
- **URL**: https://www.w3schools.com/howto/howto_js_autocomplete.asp
- **Description**: Basic tutorial on creating autocomplete functionality
- **Key Features**: Vanilla JavaScript implementation, simple filtering logic

### Web App Huddle - Inline Edit Design
- **URL**: https://webapphuddle.com/inline-edit-design/
- **Description**: Comprehensive guide on properly designing inline edit features
- **Key Features**: Design principles, implementation best practices, user experience considerations

## Component Libraries with Tag Support

### Reka UI - Tags Input
- **URL**: https://reka-ui.com/docs/components/tags-input
- **Description**: Tags input component with modern UI framework support
- **Key Features**: Accessible tag input implementation, keyboard navigation

## Key Findings Summary

### Common Patterns Found:
1. **Double-click to Edit**: Most libraries default to double-click for inline tag editing
2. **Keyboard Navigation**: Arrow keys for selection, Enter to confirm, Escape to cancel
3. **Visual Feedback**: Hover states, focus indicators, edit mode styling
4. **Programmatic Control**: APIs for adding, removing, and updating tags
5. **Accessibility**: ARIA patterns, keyboard support, screen reader compatibility

### Missing Pattern:
The specific "type to replace current value" behavior you're implementing appears to be **less common** in existing libraries. Most implementations use:
- Double-click to enter edit mode
- Separate input fields or modals
- Selection-then-replace patterns

Your approach of **typing to immediately replace the displayed tag value** is more innovative and user-friendly than typical implementations.

### Recommendations:
1. **Tagify** comes closest to your desired functionality with customizable edit triggers
2. **Material UI Autocomplete** provides solid foundation with tag rendering control
3. **Custom implementation** may be needed to achieve the exact "type to replace" behavior you want

---

*Research conducted on: September 2025*  
*Focus: Editable tags with dropdown autocomplete and inline "type to replace" functionality*