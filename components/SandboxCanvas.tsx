
import React, { useRef, useState } from 'react';
import { SandboxState, Theme } from '../types';
import { ROPE_WIDTH, SELECTION_COLOR, VECTOR_COLOR_FORCE, VECTOR_COLOR_GRAVITY, VECTOR_COLOR_TENSION, THEME_COLORS } from '../constants';

interface Props {
  state: SandboxState;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onObjectClick: (id: string) => void;
  showVectors: boolean;
  theme: Theme;
}

export const SandboxCanvas: React.FC<Props> = ({ state, onSelect, onMove, onObjectClick, showVectors, theme }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<{ id: string, startX: number, startY: number, initialObjX: number, initialObjY: number } | null>(null);

  const cx = 400; 
  const colors = THEME_COLORS[theme];
  
  const fixedPositions = state.fixedPulleys;
  const movablePositions = state.movablePulleys;

  const getObjectPosition = (id: string) => {
      const fixed = fixedPositions.find(p => p.id === id);
      if (fixed) return { x: fixed.x, y: fixed.y, radius: fixed.radius };
      const movable = movablePositions.find(p => p.id === id);
      if (movable) return { x: movable.x, y: movable.y, radius: movable.radius };
      const load = state.loads.find(l => l.id === id);
      if (load) return { x: load.x, y: load.y, radius: 0 };
      const anchor = state.anchors.find(a => a.id === id);
      if (anchor) return { x: anchor.x, y: anchor.y, radius: 0 };
      return null;
  };

  const isPulley = (id: string) => id.startsWith('fixed') || id.startsWith('movable');

  const getSVGPoint = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
  };

  const handleMouseDown = (e: React.MouseEvent, id: string, initialX: number, initialY: number) => {
    e.stopPropagation();
    if (state.interactionMode.startsWith('rope')) return;

    onSelect(id);
    const { x, y } = getSVGPoint(e.clientX, e.clientY);
    setDragState({ id, startX: x, startY: y, initialObjX: initialX, initialObjY: initialY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!dragState) return;
      e.preventDefault();
      const { x, y } = getSVGPoint(e.clientX, e.clientY);
      const dx = x - dragState.startX;
      const dy = y - dragState.startY;
      onMove(dragState.id, dragState.initialObjX + dx, dragState.initialObjY + dy);
  };

  const handleMouseUp = () => setDragState(null);

  const getTangentPoint = (
    c1: {x: number, y: number, radius: number}, 
    c2: {x: number, y: number, radius: number}, 
    side: number 
  ): {x: number, y: number} => {
      const ropeOffset = 1.05; // Gap for visual rope thickness
      const r = c1.radius * ropeOffset;

      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 1) return { x: c1.x + (side * r), y: c1.y };

      const vecAngle = Math.atan2(dy, dx);
      let theta = Math.PI / 2;
      
      if (c2.radius < 2) { 
           if (dist > r) {
                theta = Math.acos(r / dist);
           }
      }

      const ang1 = vecAngle + theta;
      const ang2 = vecAngle - theta;
      
      const p1 = {
          x: c1.x + r * Math.cos(ang1),
          y: c1.y + r * Math.sin(ang1)
      };
      const p2 = {
          x: c1.x + r * Math.cos(ang2),
          y: c1.y + r * Math.sin(ang2)
      };
      
      if (side === -1) {
          return p1.x < p2.x ? p1 : p2;
      } else {
          return p1.x > p2.x ? p1 : p2;
      }
  };

  const pulleyWrapSides: Record<string, Set<number>> = {};
  
  const renderRope = () => {
      if (state.isBroken) return null;

      for (const k in pulleyWrapSides) delete pulleyWrapSides[k];

      return state.ropeSegments.map((segment) => {
          const startObj = getObjectPosition(segment.fromId);
          const endObj = getObjectPosition(segment.toId);
          if (!startObj || !endObj) return null;

          let x1 = startObj.x; let y1 = startObj.y;
          let x2 = endObj.x; let y2 = endObj.y;

          if (segment.type === 'pulley') {
              if (isPulley(segment.fromId)) {
                   const side = segment.fromSide || (x2 < x1 ? -1 : 1);
                   const t = getTangentPoint(startObj, endObj, side);
                   x1 = t.x; y1 = t.y;
                   
                   if (!pulleyWrapSides[segment.fromId]) pulleyWrapSides[segment.fromId] = new Set();
                   pulleyWrapSides[segment.fromId].add(side);
              }
              
              if (isPulley(segment.toId)) {
                   const side = segment.toSide || (x1 < x2 ? -1 : 1);
                   const t = getTangentPoint(endObj, startObj, side);
                   x2 = t.x; y2 = t.y;
                   
                   if (!pulleyWrapSides[segment.toId]) pulleyWrapSides[segment.toId] = new Set();
                   pulleyWrapSides[segment.toId].add(side);
              }
          }

          return <line key={segment.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.rope} strokeWidth={ROPE_WIDTH} />;
      });
  };

  const renderPulleyArcs = () => {
      if (state.isBroken) return null;
      const arcs = [];
      for (const [id, sides] of Object.entries(pulleyWrapSides)) {
          if (sides.has(-1) && sides.has(1)) {
               const pulley = getObjectPosition(id);
               if (pulley) {
                   const r = (pulley.radius || 25);
                   const ropeR = r * 1.05; 
                   const startX = pulley.x - ropeR;
                   const endX = pulley.x + ropeR;
                   const y = pulley.y;
                   
                   const isMovable = id.startsWith('movable');
                   const sweep = isMovable ? 0 : 1; 

                   arcs.push(
                       <path key={`arc-${id}`} d={`M ${startX} ${y} A ${ropeR} ${ropeR} 0 0 ${sweep} ${endX} ${y}`} stroke={colors.rope} strokeWidth={ROPE_WIDTH} fill="none" />
                   );
               }
          }
      }
      return arcs;
  };

  const isHighlighted = (id: string) => {
      if (state.interactionMode === 'rope_direct' && state.ropeConnectionStartId === id) return true;
      if (state.interactionMode === 'rope_pulley') {
          if (state.ropeBuilderState.firstId === id) return true;
          if (state.ropeBuilderState.secondId === id) return true;
          if (state.ropeBuilderState.step === 'select_pulley' && isPulley(id)) return true;
      }
      return false;
  };
  
  const getHighlightColor = (id: string) => {
      if (state.ropeBuilderState.firstId === id) return '#3b82f6';
      if (state.ropeBuilderState.secondId === id) return '#ef4444'; 
      if (state.ropeBuilderState.step === 'select_pulley' && isPulley(id)) return '#10b981';
      return '#3b82f6';
  };

  const isConnected = (id: string) => state.ropeSegments.some(s => s.fromId === id || s.toId === id);

  const ropeLines = renderRope();
  const ropeArcs = renderPulleyArcs();

  return (
    <svg 
        ref={svgRef}
        className={`w-full h-full ${state.interactionMode.startsWith('rope') ? 'cursor-crosshair' : ''}`}
        onClick={() => onSelect(null)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
        <defs>
          <marker id="arrowhead-force-sandbox" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={VECTOR_COLOR_FORCE} />
          </marker>
          <marker id="arrowhead-gravity-sandbox" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={VECTOR_COLOR_GRAVITY} />
          </marker>
          <marker id="arrowhead-tension-sandbox" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={VECTOR_COLOR_TENSION} />
          </marker>
        </defs>

        {state.anchors.map((anchor) => (
             <g 
                key={anchor.id} transform={`translate(${anchor.x}, ${anchor.y})`}
                className="cursor-grab active:cursor-grabbing hover:opacity-90"
                onMouseDown={(e) => handleMouseDown(e, anchor.id, anchor.x, anchor.y)}
                onClick={(e) => { e.stopPropagation(); onObjectClick(anchor.id); }}
             >
                {isHighlighted(anchor.id) && <circle r={14} stroke={getHighlightColor(anchor.id)} strokeWidth="2" fill="none" className="animate-pulse" />}
                <rect x={-8} y={-8} width={16} height={16} fill={colors.anchor} rx={2} stroke={state.selectedId === anchor.id ? SELECTION_COLOR : "none"} strokeWidth={2} />
                <circle r={3} fill={colors.pulleyBorder} />
                <text x={0} y={-14} textAnchor="middle" className="text-[10px] select-none pointer-events-none" fill={colors.text}>Anchor</text>
             </g>
        ))}

        {fixedPositions.map((pos) => (
          <g 
            key={pos.id} transform={`translate(${pos.x}, ${pos.y})`}
            className="cursor-grab active:cursor-grabbing hover:opacity-90"
            onMouseDown={(e) => handleMouseDown(e, pos.id, pos.x, pos.y)}
            onClick={(e) => { e.stopPropagation(); onObjectClick(pos.id); }}
          >
             {isHighlighted(pos.id) && <circle r={pos.radius + 6} stroke={getHighlightColor(pos.id)} strokeWidth="3" fill="none" className="animate-pulse" />}
             {!isHighlighted(pos.id) && isConnected(pos.id) && !state.isBroken && <circle r={pos.radius + 4} stroke={colors.anchor} strokeWidth="1" fill="none" />}
            <circle r={pos.radius} fill={state.selectedId === pos.id ? SELECTION_COLOR : colors.pulleyFill} stroke={colors.pulleyBorder} strokeWidth="3" />
            <circle r={4} fill={colors.pulleyBorder} />
            {state.selectedId === pos.id && <circle r={pos.radius + 4} stroke={SELECTION_COLOR} strokeWidth="2" fill="none" strokeDasharray="4 2" />}
          </g>
        ))}

        {movablePositions.map((pos) => (
          <g 
            key={pos.id} transform={`translate(${pos.x}, ${pos.y})`}
            className="cursor-grab active:cursor-grabbing hover:opacity-90"
            onMouseDown={(e) => handleMouseDown(e, pos.id, pos.x, pos.y)}
            onClick={(e) => { e.stopPropagation(); onObjectClick(pos.id); }}
          >
            {isHighlighted(pos.id) && <circle r={pos.radius + 6} stroke={getHighlightColor(pos.id)} strokeWidth="3" fill="none" className="animate-pulse" />}
            {!isHighlighted(pos.id) && isConnected(pos.id) && !state.isBroken && <circle r={pos.radius + 4} stroke={colors.anchor} strokeWidth="1" fill="none" />}
            <circle r={pos.radius} fill={state.selectedId === pos.id ? SELECTION_COLOR : colors.pulleyFill} stroke={colors.pulleyBorder} strokeWidth="3" />
            <circle r={4} fill={colors.pulleyBorder} />
            {state.selectedId === pos.id && <circle r={pos.radius + 4} stroke={SELECTION_COLOR} strokeWidth="2" fill="none" strokeDasharray="4 2" />}
            
            {showVectors && !state.isBroken && (
               <>
                 {/* Movable Pulley Gravity (Approximation for visualization) */}
                 <line x1={0} y1={pos.radius} x2={0} y2={pos.radius + 30} stroke={VECTOR_COLOR_GRAVITY} strokeWidth="2" markerEnd="url(#arrowhead-gravity-sandbox)" />
                 <text x={8} y={pos.radius + 35} fill={VECTOR_COLOR_GRAVITY} className="text-[10px] font-bold italic" style={{ textShadow: '0px 0px 2px rgba(255,255,255,0.8)' }}>mₚg</text>
               </>
            )}
          </g>
        ))}

        {state.loads.map((load) => {
             const height = Math.max(20, Math.min(60, load.mass)); 
             const width = 60;
             const isSelected = state.selectedId === load.id;
             return (
                 <g
                    key={load.id} transform={`translate(${load.x}, ${load.y})`}
                    className="cursor-grab active:cursor-grabbing hover:opacity-90"
                    onMouseDown={(e) => handleMouseDown(e, load.id, load.x, load.y)}
                    onClick={(e) => { e.stopPropagation(); onObjectClick(load.id); }}
                 >
                    {isHighlighted(load.id) && <rect x={-width/2 - 4} y={-4} width={width+8} height={height+8} stroke={getHighlightColor(load.id)} strokeWidth="3" fill="none" rx={6} className="animate-pulse" />}
                    <path d="M 0 -10 L 0 0" stroke={colors.pulleyBorder} strokeWidth="3" />
                    <rect x={-width/2} y={0} width={width} height={height} fill={isSelected ? SELECTION_COLOR : load.color} rx={4} stroke={isSelected ? 'white' : 'none'} strokeWidth={2} />
                    <text x={0} y={height/2 + 5} textAnchor="middle" fill="white" className="font-bold text-xs pointer-events-none select-none">{load.mass}kg</text>
                    {showVectors && !state.isBroken && (
                        <>
                            {/* Gravity */}
                            <line x1={0} y1={height/2} x2={0} y2={height/2 + 35 + (load.mass * 0.15)} stroke={VECTOR_COLOR_GRAVITY} strokeWidth="2" markerEnd="url(#arrowhead-gravity-sandbox)" />
                            <text x={8} y={height/2 + 35} fill={VECTOR_COLOR_GRAVITY} className="text-[10px] font-bold italic" style={{ textShadow: '0px 0px 2px rgba(255,255,255,0.8)' }}>mg</text>

                            {/* Tension - Offset to -15 to be visible next to hook/rope */}
                            {isConnected(load.id) && (
                              <>
                                <line x1={15} y1={-10} x2={15} y2={-50} stroke={VECTOR_COLOR_TENSION} strokeWidth="2" markerEnd="url(#arrowhead-tension-sandbox)" />
                                <text x={20} y={-40} fill={VECTOR_COLOR_TENSION} className="text-[10px] font-bold italic" style={{ textShadow: '0px 0px 2px rgba(255,255,255,0.8)' }}>T</text>
                              </>
                            )}
                        </>
                    )}
                 </g>
             );
        })}

        {ropeLines}
        {ropeArcs}

        {state.fixedPulleys.length === 0 && state.movablePulleys.length === 0 && state.loads.length === 0 && state.anchors.length === 0 && (
             <text x={cx} y={300} textAnchor="middle" fill={colors.text} className="text-[10px] uppercase font-bold tracking-widest opacity-30 select-none">Canvas Empty</text>
         )}
    </svg>
  );
};
