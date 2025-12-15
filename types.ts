
export type Theme = 'light' | 'dark';

export enum SimulationType {
  ATWOOD = 'ATWOOD',
  SANDBOX = 'SANDBOX', // Block and Tackle builder
}

export enum RealityMode {
  IDEAL = 'IDEAL', // Infinite strength, no air resistance
  REAL = 'REAL',   // Rope limits, air resistance
}

export interface SimulationConfig {
  gravity: number;
  timeStep: number;
  paused: boolean;
}

// --- Atwood Machine Specific Types ---
export interface AtwoodState {
  mass1: number; // kg (Left)
  mass2: number; // kg (Right)
  pulleyMass: number; // kg
  pulleyRadius: number; // meters
  frictionCoeff: number; // unitless (simplified friction factor)
  totalRopeLength: number; // meters (Variable length)
  
  // Configuration State (Used for UI Sliders & Resets)
  initialY1: number;
  initialY2: number;

  // Real Life Parameters
  ropeMaxTension: number; // Newtons (Force at which it snaps)
  airResistance: number; // Drag coefficient
  isBroken: boolean; // Has the rope snapped?

  // Dynamic State
  y1: number; // Position of mass 1 (0 is top)
  y2: number; // Position of mass 2
  velocity: number; // m/s (Positive = Mass 1 moves UP, Mass 2 moves DOWN)
  angularVelocity: number; // rad/s
  acceleration: number; // m/s^2
  tension1: number; // Newtons
  tension2: number; // Newtons
  time: number;
}

export interface LoadObject {
  id: string;
  mass: number;
  color: string;
  x: number;
  y: number;
  vx: number; // Horizontal velocity for swinging
  vy: number; // Vertical velocity for independent freefall
}

export interface Pulley {
  id: string;
  x: number;
  y: number;
  radius: number; // Visual radius in pixels
  vx?: number; // Horizontal velocity for swaying
}

export interface Anchor {
  id: string;
  x: number;
  y: number;
}

export interface RopeSegment {
  id: string;
  fromId: string;
  toId: string;
  type: 'direct' | 'pulley'; // Added to distinguish visual style
  fromSide?: number; // -1 for left tangent, 1 for right tangent
  toSide?: number;   // -1 for left tangent, 1 for right tangent
}

// --- Sandbox (Block & Tackle) Types ---
export interface SandboxState {
  fixedPulleys: Pulley[]; // Array of fixed pulleys with positions
  movablePulleys: Pulley[]; // Array of movable pulleys with positions (relative X, dynamic Y)
  loads: LoadObject[]; // Array of weight objects attached
  anchors: Anchor[]; // User-definable fixed points
  effortForce: number; // The force applied
  friction: number; // Friction loss per pulley (0.0 - 0.1)
  
  // Real Life Parameters
  ropeMaxTension: number;
  airResistance: number; // Drag coefficient
  isBroken: boolean;

  // Interaction & Builder
  interactionMode: 'select' | 'rope_direct' | 'rope_pulley'; // Split modes
  ropeSegments: RopeSegment[]; // Explicit segments
  
  // New State for 3-step Pulley Route tool
  ropeBuilderState: {
    step: 'idle' | 'select_first' | 'select_second' | 'select_pulley';
    firstId: string | null;
    secondId: string | null;
  };
  
  ropeConnectionStartId: string | null; // Keep for 'direct' mode (2-step)
  
  // Dynamic State
  loadPosition: number; // 0 to 100 (percentage of height)
  loadVelocity: number;
  isDragging: boolean; // Is user manually pulling?
  
  // Interaction
  selectedId: string | null; // 'load-xyz', 'fixed-xyz', 'movable-xyz', etc.
}

export interface HistoryPoint {
  time: number;
  velocity: number;
  acceleration: number;
  position: number; // Added for new graph
  angularVelocity?: number;
}
