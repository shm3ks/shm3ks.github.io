
import React from 'react';
import { AtwoodState, Theme } from '../types';
import { METERS_TO_PIXELS, ROPE_WIDTH, MASS_COLOR_1, MASS_COLOR_2, VECTOR_COLOR_ACCEL, VECTOR_COLOR_GRAVITY, VECTOR_COLOR_TENSION, THEME_COLORS } from '../constants';

interface Props {
  state: AtwoodState;
  showVectors: boolean;
  theme: Theme;
}

export const AtwoodCanvas: React.FC<Props> = ({ state, showVectors, theme }) => {
  const cx = 300; // Center X
  const cy = 100; // Center Y of pulley axle
  const r = state.pulleyRadius * 80; // Scale radius for visibility
  
  // Calculate positions in pixels
  const y1_px = cy + (state.y1 * METERS_TO_PIXELS * 0.5); 
  const y2_px = cy + (state.y2 * METERS_TO_PIXELS * 0.5);

  const massSize = 40;
  
  const colors = THEME_COLORS[theme];

  return (
    <svg className="w-full h-full overflow-visible">
      <defs>
        <marker id="arrowhead-accel" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={VECTOR_COLOR_ACCEL} />
        </marker>
        <marker id="arrowhead-gravity" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={VECTOR_COLOR_GRAVITY} />
        </marker>
        <marker id="arrowhead-tension" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={VECTOR_COLOR_TENSION} />
        </marker>
      </defs>

      {/* Ceiling Anchor */}
      <line x1={cx} y1={0} x2={cx} y2={cy} stroke={colors.anchor} strokeWidth="4" />
      <rect x={cx - 20} y={0} width={40} height={10} fill={colors.anchor} />

      {/* Ropes - If Broken, make dashed or hide */}
      {!state.isBroken && (
          <>
            <line x1={cx - r} y1={cy} x2={cx - r} y2={y1_px} stroke={colors.rope} strokeWidth={ROPE_WIDTH} />
            <line x1={cx + r} y1={cy} x2={cx + r} y2={y2_px} stroke={colors.rope} strokeWidth={ROPE_WIDTH} />
          </>
      )}
      
      {/* Broken Visuals */}
      {state.isBroken && (
          <>
             {/* Dangling bits near pulley */}
             <line x1={cx - r} y1={cy} x2={cx - r} y2={cy + 50} stroke={colors.rope} strokeWidth={ROPE_WIDTH} strokeDasharray="4 4" />
             <line x1={cx + r} y1={cy} x2={cx + r} y2={cy + 50} stroke={colors.rope} strokeWidth={ROPE_WIDTH} strokeDasharray="4 4" />
             
             {/* Ropes falling with masses */}
             <line x1={cx - r} y1={y1_px - 80} x2={cx - r} y2={y1_px} stroke={colors.rope} strokeWidth={ROPE_WIDTH} strokeDasharray="4 4" className="opacity-50" />
             <line x1={cx + r} y1={y2_px - 80} x2={cx + r} y2={y2_px} stroke={colors.rope} strokeWidth={ROPE_WIDTH} strokeDasharray="4 4" className="opacity-50" />
          </>
      )}

      {/* Pulley - Static visual without spokes */}
      <g> 
        <circle cx={cx} cy={cy} r={r} fill={colors.pulleyFill} stroke={colors.pulleyBorder} strokeWidth="3" />
        <circle cx={cx} cy={cy} r={4} fill={colors.pulleyBorder} />
      </g>
      
      <text x={cx} y={cy - r - 10} textAnchor="middle" className="text-xs font-mono" fill={colors.text}>
        R = {state.pulleyRadius}m
      </text>

      {/* Mass 1 (Left) */}
      <g transform={`translate(${cx - r - massSize/2}, ${y1_px})`}>
        <rect width={massSize} height={massSize} rx="4" fill={MASS_COLOR_1} />
        <text x={massSize/2} y={massSize/2 + 5} textAnchor="middle" fill="white" className="text-xs font-bold">M1</text>
        
        {showVectors && !state.isBroken && (
          <>
            {/* Gravity Vector (Down) */}
            <line x1={massSize/2} y1={massSize} x2={massSize/2} y2={massSize + 60} stroke={VECTOR_COLOR_GRAVITY} strokeWidth="2" markerEnd="url(#arrowhead-gravity)" />
            <text x={massSize/2 + 5} y={massSize + 55} fill={VECTOR_COLOR_GRAVITY} className="text-[10px] font-bold italic" style={{ textShadow: '0px 0px 2px rgba(255,255,255,0.8)' }}>m₁g</text>

            {/* Tension Vector (Up) */}
            <line x1={massSize/2} y1={0} x2={massSize/2} y2={-45} stroke={VECTOR_COLOR_TENSION} strokeWidth="2" markerEnd="url(#arrowhead-tension)" />
            <text x={massSize/2 + 5} y={-35} fill={VECTOR_COLOR_TENSION} className="text-[10px] font-bold italic" style={{ textShadow: '0px 0px 2px rgba(255,255,255,0.8)' }}>T₁</text>

            {/* Acceleration Vector (Side) */}
            {Math.abs(state.acceleration) > 0.1 && (
              <g transform={`translate(-15, ${massSize/2})`}>
                 <line x1={0} y1={0} x2={0} y2={state.acceleration > 0 ? -30 : 30} stroke={VECTOR_COLOR_ACCEL} strokeWidth="3" markerEnd="url(#arrowhead-accel)" />
                 <text x={-10} y={state.acceleration > 0 ? -15 : 15} textAnchor="end" fill={VECTOR_COLOR_ACCEL} className="text-[11px] font-bold italic">a</text>
              </g>
            )}
          </>
        )}
      </g>

      {/* Mass 2 (Right) */}
      <g transform={`translate(${cx + r - massSize/2}, ${y2_px})`}>
        <rect width={massSize} height={massSize} rx="4" fill={MASS_COLOR_2} />
        <text x={massSize/2} y={massSize/2 + 5} textAnchor="middle" fill="white" className="text-xs font-bold">M2</text>
         {showVectors && !state.isBroken && (
          <>
            {/* Gravity Vector (Down) */}
            <line x1={massSize/2} y1={massSize} x2={massSize/2} y2={massSize + 75} stroke={VECTOR_COLOR_GRAVITY} strokeWidth="2" markerEnd="url(#arrowhead-gravity)" />
            <text x={massSize/2 + 5} y={massSize + 70} fill={VECTOR_COLOR_GRAVITY} className="text-[10px] font-bold italic" style={{ textShadow: '0px 0px 2px rgba(255,255,255,0.8)' }}>m₂g</text>

            {/* Tension Vector (Up) */}
            <line x1={massSize/2} y1={0} x2={massSize/2} y2={-45} stroke={VECTOR_COLOR_TENSION} strokeWidth="2" markerEnd="url(#arrowhead-tension)" />
            <text x={massSize/2 + 5} y={-35} fill={VECTOR_COLOR_TENSION} className="text-[10px] font-bold italic" style={{ textShadow: '0px 0px 2px rgba(255,255,255,0.8)' }}>T₂</text>
          </>
        )}
      </g>
    </svg>
  );
};
