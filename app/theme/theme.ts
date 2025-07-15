// themes.ts

export const lightTheme = {
    mode: 'light',

    // --- Core UI Colors ---
    background: '#FAFAFA',             // Soft, modern off-white (better than pure white), keeps content calm.
    card: '#FFFFFF',                   // Pure white for strong content containers.
    cardBackground: '#F4F4F6',         // Slightly tinted grey for card inner layers (e.g., image stats, actions).

    // --- Text Colors ---
    text: '#1A1A1A',                   // Deep gray-black (not harsh pure black) for good readability.
    textLight: '#666666',              // Softer grey for subheadings, muted labels.
    errorText: '#D32F2F',              // Explicit text color for error messages (matches 'error' color).

    // --- Brand & Accent Colors ---
    primary: '#5A50D6',                // Elegant indigo/blue-violet. Deep, professional, modern.
    accent: '#FFC400',                 // Rich gold for highlights — ideal for tips, sales, achievements.

    // --- Functional Colors ---
    success: '#2E7D32',                // Rich, accessible green (used in Material UI) for confirmations.
    error: '#D32F2F',                  // Consistent danger/error red for backgrounds/borders.
    danger: '#B71C1C',                 // Deeper red for destructive actions (e.g., content deletion).
    warning: '#FFA000',                // A standard amber for warnings.

    // --- UI Element Specific Colors ---
    borderColor: '#DDDDDD',            // Clean, light gray — not too visible, but provides structure.
    inputBackground: '#FFFFFF',        // Clean and focus-friendly.
    placeholderTextColor: '#9E9E9E',   // Light-medium grey, readable but subtle.
    shadowColor: 'rgba(0,0,0,0.08)',   // Softer shadow with subtle elevation.
    
    // --- Newly Added / Common Colors ---
    buttonText: '#FFFFFF',             // Default text color for primary buttons.
    highlight: '#E0E0E0',              // Color for pressed/focused states of interactive elements.
    divider: '#E0E0E0',                // Light grey for separating content sections.
    icon: '#666666',                   // Default color for icons (can be overridden).
    overlay: 'rgba(0,0,0,0.5)',        // Semi-transparent overlay for modals, popups.
    statusBar: 'light-content',        // For status bar text color (iOS specific: 'dark-content' or 'light-content')
};

export const darkTheme = {
    mode: 'dark',

    // --- Core UI Colors ---
    background: '#101010',             // Deep charcoal, modern and OLED-friendly.
    card: '#1A1A1A',                   // Slight contrast for cards.
    cardBackground: '#2A2A2A',         // Inner card elements stand out gently.

    // --- Text Colors ---
    text: '#EAEAEA',                   // Light but not too sharp — friendly on eyes.
    textLight: '#A0A0A0',              // Good secondary contrast.
    errorText: '#FF6F61',              // Explicit text color for error messages in dark mode.

    // --- Brand & Accent Colors ---
    primary: '#8B80FF',                // Slightly brighter indigo for dark backgrounds.
    accent: '#FFD740',                 // Brighter, warmer gold — pops without straining.

    // --- Functional Colors ---
    success: '#66BB6A',                // Green with good contrast in dark mode.
    error: '#FF6F61',                  // Calmer red, visible and warm for backgrounds/borders.
    danger: '#E53935',                 // Strong red for destructive intent.
    warning: '#FFC107',                // A brighter amber for warnings in dark mode.

    // --- UI Element Specific Colors ---
    borderColor: '#2E2E2E',            // Soft border — distinguish containers.
    inputBackground: '#1D1D1D',        // Slightly elevated input field surface.
    placeholderTextColor: '#777777',   // Subtle but readable.
    shadowColor: 'rgba(0,0,0,0.4)',    // Stronger shadow in dark for depth.

    // --- Newly Added / Common Colors ---
    buttonText: '#101010',             // Often dark text on bright buttons in dark mode.
    highlight: '#3A3A3A',              // Color for pressed/focused states of interactive elements.
    divider: '#3A3A3A',                // Dark grey for separating content sections.
    icon: '#A0A0A0',                   // Default color for icons (can be overridden).
    overlay: 'rgba(0,0,0,0.7)',        // Slightly darker overlay for better contrast in dark mode.
    statusBar: 'dark-content',         // For status bar text color (iOS specific: 'dark-content' or 'light-content')
};