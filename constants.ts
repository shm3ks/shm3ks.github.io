
export const GRAVITY = 9.81;
export const FRICTION_SCALE = 0.4; // Adjusted to 0.4 to balance "fast at low friction" and "stops at high friction"
export const AIR_RESISTANCE_SCALE = 3.0; // Amplifier for drag force

// Real Life Defaults
export const DEFAULT_ROPE_LIMIT = 50; // Newtons

// Rendering Constants
export const ROPE_COLOR = "#334155";
export const ROPE_WIDTH = 2;
export const PULLEY_COLOR = "#cbd5e1";
export const PULLEY_BORDER = "#475569";
export const MASS_COLOR_1 = "#ef4444"; // Red
export const MASS_COLOR_2 = "#3b82f6"; // Blue

// Vector Colors
export const VECTOR_COLOR_ACCEL = "#a855f7"; // Purple (Motion/Kinematics) - distinct from forces
export const VECTOR_COLOR_GRAVITY = "#16a34a"; // Green (Weight/Gravity)
export const VECTOR_COLOR_TENSION = "#ca8a04"; // Dark Yellow/Amber (Tension) for better visibility on light bg
export const VECTOR_COLOR_FORCE = "#ca8a04"; // Generic Force -> Yellow

export const SELECTION_COLOR = "#d946ef"; // Fuchsia

export const CANVAS_HEIGHT = 600;
export const METERS_TO_PIXELS = 100; // 1 meter = 100 pixels scale

// Theme Colors for Canvas (SVG/Canvas elements that can't use Tailwind classes directly)
export const THEME_COLORS = {
  light: {
    rope: "#334155",
    pulleyFill: "#cbd5e1",
    pulleyBorder: "#475569",
    anchor: "#64748b",
    text: "#64748b",
    grid: "#e2e8f0"
  },
  dark: {
    rope: "#94a3b8", // Light gray rope on dark bg
    pulleyFill: "#1e293b", // Dark pulley
    pulleyBorder: "#475569",
    anchor: "#475569",
    text: "#94a3b8",
    grid: "#334155"
  }
};
