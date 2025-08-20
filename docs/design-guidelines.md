# Design System Documentation

## Overview
This document serves as the definitive guide for maintaining visual consistency and design standards across the Vue Template application. All new features and components should adhere to these guidelines to ensure a cohesive user experience.

## Color Palette

### Primary Brand Colors
- **Brand Blue**: `#3b82f6` (`brand-blue`)
  - Primary actions, links, active states
  - Usage: Primary buttons, navigation highlights, focus states
- **Brand Blue Dark**: `#1d4ed8` (`brand-blue-dark`)
  - Hover states, pressed buttons
  - Usage: Button hover effects, active navigation items

### Neutral Colors (Slate Scale)
- **Slate 800**: `#1e293b` - Primary text, dark backgrounds
- **Slate 700**: `#334155` - Secondary text, sidebar backgrounds
- **Slate 600**: `#475569` - Muted text, borders
- **Slate 500**: `#64748b` - Placeholder text
- **Slate 400**: `#94a3b8` - Icons, disabled text
- **Slate 300**: `#cbd5e1` - Light borders
- **Slate 200**: `#e2e8f0` - Subtle borders, dividers
- **Slate 100**: `#f1f5f9` - Light backgrounds
- **Slate 50**: `#f8fafc` - Subtle backgrounds

### Semantic Colors
- **Success**: `#10b981` (green-500)
- **Warning**: `#f59e0b` (amber-500)
- **Error**: `#ef4444` (red-500)
- **Info**: `#3b82f6` (blue-500)

### Interactive States
- **Hover Blue**: `#dbeafe` (`blue-50`) - Light blue background for hover states
- **Hover Red**: `#fef2f2` (`red-50`) - Light red background for destructive actions

## Typography

### Font Family
- **Primary**: System font stack via Tailwind's default
- **Fallbacks**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif

### Font Sizes
- **xs**: `0.75rem` (`text-xs`) - Captions, labels
- **sm**: `0.875rem` (`text-sm`) - Body text, form inputs
- **base**: `1rem` (`text-base`) - Default body text
- **lg**: `1.125rem` (`text-lg`) - Subheadings
- **xl**: `1.25rem` (`text-xl`) - Small headings
- **2xl**: `1.5rem` (`text-2xl`) - Page titles, main headings

### Font Weights
- **Normal**: `400` (`font-normal`) - Body text
- **Medium**: `500` (`font-medium`) - Emphasized text, labels
- **Semibold**: `600` (`font-semibold`) - Subheadings, important text
- **Bold**: `700` (`font-bold`) - Headings, strong emphasis

### Line Heights
- **Tight**: `1.25` (`leading-tight`) - Headings
- **Normal**: `1.5` (`leading-normal`) - Body text
- **Relaxed**: `1.625` (`leading-relaxed`) - Long-form content

## Spacing System

### Padding/Margin Scale (Tailwind Units)
- **1**: `0.25rem` (4px) - Minimal spacing
- **2**: `0.5rem` (8px) - Small spacing
- **3**: `0.75rem` (12px) - Default component spacing
- **4**: `1rem` (16px) - Standard spacing
- **5**: `1.25rem` (20px) - Medium spacing
- **8**: `2rem` (32px) - Large spacing
- **10**: `2.5rem` (40px) - Extra large spacing

### Component-Specific Spacing
- **Button padding**: `py-3 px-4` (12px vertical, 16px horizontal)
- **Input padding**: `py-3 px-4 pl-11` (with icon)
- **Dropdown items**: `px-4 py-3` (16px horizontal, 12px vertical)
- **Card padding**: `p-6` (24px all sides)

## Border Radius

### Standard Radius Values
- **Small**: `rounded` (4px) - Buttons, inputs
- **Medium**: `rounded-lg` (8px) - Cards, modals
- **Large**: `rounded-xl` (12px) - Dropdowns, overlays
- **Full**: `rounded-full` - Avatars, pills

## Shadows

### Shadow Hierarchy
- **Small**: `shadow-sm` - Subtle elevation
- **Default**: `shadow` - Standard cards
- **Medium**: `shadow-md` - Elevated cards
- **Large**: `shadow-lg` - Modals, important overlays
- **Extra Large**: `shadow-xl` - Dropdowns, tooltips

## Icons

### Icon System
- **Style**: Heroicons (outline and solid variants)
- **Size**: `w-4 h-4` (16px) for UI icons, `w-5 h-5` (20px) for primary actions
- **Color**: `text-gray-400` default, matches text color on hover
- **Format**: SVG with `fill="currentColor"`

### Icon Usage Guidelines
- Use outline icons for default states
- Use solid icons for active/selected states
- Icons should always be accompanied by text labels for accessibility
- Maintain consistent sizing within component groups

## Interactive States

### Hover Effects
- **Background**: Subtle color shift (e.g., `hover:bg-blue-50`)
- **Text**: Color change to brand blue (`hover:text-brand-blue`)
- **Icons**: Color change to match text
- **Duration**: `transition-all duration-200`

### Focus States
- **Outline**: `focus:outline-none focus:ring-2 focus:ring-brand-blue`
- **Background**: `focus:bg-white` for inputs
- **Border**: `focus:border-brand-blue`

### Active States
- **Navigation**: `bg-brand-blue text-white`
- **Buttons**: Darker background variant

## Component Patterns

### Buttons
```html
<!-- Primary Button -->
<button class="bg-brand-blue hover:bg-brand-blue-dark text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200">

<!-- Secondary Button -->
<button class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200">

<!-- Destructive Button -->
<button class="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200">
```

### Form Inputs
```html
<input class="w-full py-3 px-4 border border-gray-300 rounded-lg bg-gray-50 text-sm transition-all duration-200 focus:outline-none focus:border-brand-blue focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]">
```

### Cards
```html
<div class="bg-white border border-gray-200 rounded-lg shadow-md p-6">
```

### Dropdowns
```html
<div class="bg-white border border-gray-200/50 rounded-xl shadow-xl backdrop-blur-sm overflow-hidden">
```

## Layout Guidelines

### Grid System
- Use Tailwind's grid utilities
- Prefer `gap-4` or `gap-6` for consistent spacing
- Use responsive prefixes (`md:`, `lg:`) for mobile-first design

### Containers
- **Page container**: `max-w-7xl mx-auto px-4`
- **Content sections**: `py-8` or `py-12` for vertical spacing

### Header
- **Height**: `h-20` (80px) fixed height
- **Background**: `bg-white` with `border-b border-slate-200`
- **Padding**: `px-8 py-5`

### Sidebar
- **Width**: `w-[60px]` collapsed, `w-[280px]` expanded
- **Background**: `bg-gradient-to-b from-slate-800 to-slate-700`

## Accessibility Guidelines

### Color Contrast
- Ensure minimum 4.5:1 contrast ratio for normal text
- Ensure minimum 3:1 contrast ratio for large text
- Never rely solely on color to convey information

### Focus Management
- All interactive elements must have visible focus states
- Tab order should be logical and intuitive
- Use `tabindex` appropriately for custom components

### Screen Reader Support
- Use semantic HTML elements when possible
- Provide `aria-label` for icon-only buttons
- Use `role` attributes for custom components

## Animation & Transitions

### Standard Durations
- **Fast**: `duration-150` (150ms) - Hover effects
- **Standard**: `duration-200` (200ms) - Most interactions
- **Slow**: `duration-300` (300ms) - Complex state changes

### Easing Functions
- **Default**: `ease-in-out` for most transitions
- **Entrance**: `ease-out` for appearing elements
- **Exit**: `ease-in` for disappearing elements

### Transform Guidelines
- Use `transform` for performance-optimized animations
- Prefer `scale`, `translate`, and `rotate` over layout-affecting properties
- Use `transition-transform` for transform-only animations

## Mobile Responsiveness

### Breakpoints (Tailwind defaults)
- **sm**: `640px` and up
- **md**: `768px` and up
- **lg**: `1024px` and up
- **xl**: `1280px` and up

### Mobile-First Approach
- Design for mobile first, enhance for larger screens
- Use responsive prefixes consistently
- Test all interactions on touch devices

### Touch Targets
- Minimum `44px × 44px` for touch targets
- Provide adequate spacing between interactive elements
- Consider thumb-friendly navigation patterns

## Implementation Notes

### Tailwind Configuration
- Custom colors are defined in `tailwind.config.js`
- Extend Tailwind's theme rather than overriding defaults
- Use CSS custom properties for dynamic theming if needed

### Component Organization
- Group related utilities together
- Use consistent class ordering: layout → spacing → colors → typography → effects
- Consider extracting complex utility combinations into component classes

### Performance Considerations
- Use Tailwind's purge functionality to remove unused styles
- Minimize custom CSS in favor of utility classes
- Leverage Tailwind's `@apply` directive sparingly

## Material Design Integration Strategy

### Component Library Preference
**Primary Strategy**: Use Material Design prebuilt components whenever possible to ensure consistency, accessibility, and reduced development time.

#### Recommended Material Design Library
- **Vuetify 3**: The recommended Material Design framework for Vue 3
  - Fully compatible with Vue 3 and Material Design 2 specifications
  - 80+ prebuilt components with excellent accessibility support
  - Consistent design system and theming capabilities
  - Active community support and comprehensive documentation

#### When to Use Material Design Components
✅ **Always prefer Material Design components for:**
- Form inputs (text fields, selects, checkboxes, radio buttons)
- Buttons and action components
- Navigation elements (tabs, menus, breadcrumbs)
- Data display (tables, lists, cards)
- Feedback components (alerts, snackbars, progress indicators)
- Layout components (grids, containers, dividers)

#### When Custom Components Are Acceptable
⚠️ **Only create custom components when:**
- Material Design component customization would be overly complex
- Specific business logic requires unique functionality not available in Material Design
- Brand-specific visual elements that must deviate from Material Design
- Performance optimization requires a lightweight custom solution

#### Integration Guidelines
1. **Installation**: Add Vuetify 3 to projects using `npm install vuetify@next`
2. **Theme Configuration**: Align Vuetify theme with existing color palette
3. **Migration Strategy**: Gradually replace custom components with Material Design equivalents
4. **Customization**: Use Vuetify's theming system rather than overriding CSS
5. **Documentation**: Document any custom Material Design component modifications

#### Material Design vs Custom Component Decision Matrix
```
High Complexity Customization Needed?
├── Yes → Consider custom component (with Material Design styling)
└── No → Use prebuilt Material Design component

Business Logic Unique?
├── Yes → Custom wrapper around Material Design base component
└── No → Use standard Material Design component

Performance Critical?
├── Yes → Evaluate Material Design vs custom implementation
└── No → Default to Material Design component
```

## Future Considerations

### Material Design 3 Migration
- Monitor Vuetify's Material Design 3 (Material You) implementation progress
- Plan for future migration when officially supported in Vuetify
- Consider design token structure that supports both Material Design 2 and 3

### Dark Mode
- Prepare for dark mode implementation using Tailwind's dark mode utilities
- Consider color semantics that work in both light and dark themes
- Leverage Material Design's dark theme specifications

### Theming
- Structure color tokens to support multiple brand themes
- Use CSS custom properties for runtime theme switching
- Integrate with Vuetify's theming system for consistency

### Component Library
- Prioritize Material Design components from Vuetify
- Create custom components only when Material Design doesn't meet requirements
- Document component APIs and usage examples
- Maintain consistency with Material Design principles even in custom components

---

*Last updated: [Current Date]*
*Version: 1.0*

For questions or suggestions regarding this design system, please refer to the development team.