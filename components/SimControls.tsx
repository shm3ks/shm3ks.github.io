
import React from 'react';
import { Play, Pause, RotateCcw, Settings2, Trash2, Box, PlusCircle, Eraser, Link, Spline, Scale, Anchor as AnchorIcon, Weight, Disc, ArrowRightFromLine, GitGraph, Workflow, Globe, TriangleAlert, Wind, Ruler, Rabbit, Turtle } from 'lucide-react';
import { AtwoodState, SandboxState, SimulationType, RealityMode } from '../types';

interface SimControlsProps {
  type: SimulationType;
  atwoodState: AtwoodState;
  sandboxState: SandboxState;
  setAtwoodState: (s: AtwoodState | ((prev: AtwoodState) => AtwoodState)) => void;
  setSandboxState: (s: SandboxState | ((prev: SandboxState) => SandboxState)) => void;
  setActiveTab: (t: SimulationType) => void;
  paused: boolean;
  setPaused: (p: boolean) => void;
  reset: () => void;
  clearSandbox: () => void;
  realityMode: RealityMode;
  setRealityMode: (m: RealityMode) => void;
  timeScale: number;
  setTimeScale: (n: number) => void;
}

const Slider = ({ label, value, min, max, step, onChange, unit, disabled = false, warning = false }: any) => (
  <div className={`mb-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
    <div className="flex justify-between mb-1">
      <label className={`text-sm font-medium ${warning ? 'text-amber-700 dark:text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>{label}</label>
      <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">{value?.toFixed(2) || value} {unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${warning ? 'bg-amber-200 dark:bg-amber-900 accent-amber-600' : 'bg-slate-200 dark:bg-slate-700 accent-blue-600'}`}
      disabled={disabled}
    />
  </div>
);

export const SimControls: React.FC<SimControlsProps> = ({
  type,
  atwoodState,
  sandboxState,
  setAtwoodState,
  setSandboxState,
  setActiveTab,
  paused,
  setPaused,
  reset,
  clearSandbox,
  realityMode,
  setRealityMode,
  timeScale,
  setTimeScale
}) => {

  const applyAtwoodPreset = (name: string) => {
    setPaused(true);
    clearSandbox(); 
    
    // Base reset state including the positions
    const resetProps = {
        velocity: 0,
        acceleration: 0,
        angularVelocity: 0,
        tension1: 0,
        tension2: 0,
        time: 0,
        isBroken: false,
        ropeMaxTension: 50,
        totalRopeLength: 5.0,
        initialY1: 2.5,
        initialY2: 2.5,
        y1: 2.5,
        y2: 2.5
    };

    switch (name) {
      case 'classic':
        setAtwoodState(s => ({ 
            ...s, ...resetProps, 
            mass1: 2.0, mass2: 3.5, 
            pulleyMass: 0.5, frictionCoeff: 0.05, pulleyRadius: 0.2 
        }));
        break;
      case 'large-radius':
         setAtwoodState(s => ({ 
             ...s, ...resetProps, 
             mass1: 2.0, mass2: 3.5, 
             pulleyMass: 2.0, 
             frictionCoeff: 0.05, pulleyRadius: 0.5 
         }));
        break;
    }
  };

  const applyComplexPreset = (name: 'movable' | 'tackle') => {
    const cx = 400;
    const r = 25;
    const offset = r * 1.05;
    setPaused(true);
    
    if (name === 'movable') {
        const movX = cx;
        const movY = 300;
        const anchorX = movX - (2 * offset);
        const fixX = movX + (2 * offset);
        // Reduced masses to 10kg and 6kg
        const load1 = { id: 'load-lift', mass: 10, color: '#ef4444', x: movX, y: 400, vx: 0, vy: 0 };
        const load2 = { id: 'load-pull', mass: 6, color: '#3b82f6', x: fixX + offset, y: 300, vx: 0, vy: 0 };

        setSandboxState({
            fixedPulleys: [{id: 'fixed-1', x: fixX, y: 50, radius: r}],
            movablePulleys: [{id: 'movable-1', x: movX, y: movY, radius: r}],
            loads: [load1, load2],
            anchors: [{id: 'anchor-1', x: anchorX, y: 50}],
            effortForce: 0,
            friction: 0.00, // Friction zeroed out to ensure movement
            interactionMode: 'select',
            ropeSegments: [
                { id: 'r1', fromId: 'anchor-1', toId: 'movable-1', type: 'pulley', fromSide: 0, toSide: -1 },
                { id: 'r2', fromId: 'movable-1', toId: 'fixed-1', type: 'pulley', fromSide: 1, toSide: -1 },
                { id: 'r3', fromId: 'fixed-1', toId: 'load-pull', type: 'pulley', fromSide: 1, toSide: 0 },
                { id: 'r4', fromId: 'movable-1', toId: 'load-lift', type: 'direct', fromSide: 0, toSide: 0 }
            ],
            ropeConnectionStartId: null,
            ropeBuilderState: { step: 'idle', firstId: null, secondId: null },
            loadPosition: 80, loadVelocity: 0, isDragging: false, selectedId: null,
            ropeMaxTension: 120, // Low enough to break with extra weight
            isBroken: false,
            airResistance: 0.1
        });
    } else if (name === 'tackle') {
         // Calculated for perfect vertical alignment
         const mX = cx; // 400
         const aX = mX - r; // 375 (Aligns with left side of movable)
         const f1X = mX + (r * 2); // 450 (Left side 425 aligns with right side of movable 425)
         const f2X = f1X + (r * 2); // 500 (Left side 475 aligns with right side of f1 475)
         const pullX = f2X + r; // 525 (Aligns with right side of f2)

         setSandboxState({
            fixedPulleys: [
                {id: 'f1', x: f1X, y: 50, radius: r}, 
                {id: 'f2', x: f2X, y: 50, radius: r}
            ],
            movablePulleys: [{id: 'm1', x: mX, y: 300, radius: r}],
            anchors: [{id: 'a1', x: aX, y: 50}],
            loads: [
                {id: 'load', mass: 10, color: '#ef4444', x: mX, y: 380, vx: 0, vy: 0}, 
                {id: 'pull', mass: 4, color: '#3b82f6', x: pullX, y: 200, vx: 0, vy: 0}
            ],
            effortForce: 0, 
            friction: 0.00,
            interactionMode: 'select', selectedId: null,
            ropeSegments: [
                // Anchor down to Movable Left. Vertical.
                {id: 's1', fromId: 'a1', toId: 'm1', type: 'pulley', fromSide: 0, toSide: -1},
                // Movable Right up to Fixed1 Left. Vertical.
                {id: 's2', fromId: 'm1', toId: 'f1', type: 'pulley', fromSide: 1, toSide: -1},
                // Fixed1 Right to Fixed2 Left. Side-by-side connection.
                {id: 's3', fromId: 'f1', toId: 'f2', type: 'pulley', fromSide: 1, toSide: -1},
                // Fixed2 Right down to Pull. Vertical.
                {id: 's4', fromId: 'f2', toId: 'pull', type: 'pulley', fromSide: 1, toSide: 0},
                // Load attached to Movable center
                {id: 's5', fromId: 'm1', toId: 'load', type: 'direct'}
            ],
             ropeConnectionStartId: null, ropeBuilderState: { step: 'idle', firstId: null, secondId: null },
             loadPosition: 80, loadVelocity: 0, isDragging: false, ropeMaxTension: 120, isBroken: false,
             airResistance: 0.1
         });
    }
  };

  const addPulley = (type: 'fixed' | 'movable') => {
      setSandboxState(prev => {
        const id = `${type}-${Date.now()}`;
        let x = 400; let y = type === 'fixed' ? 50 : 250; 
        if (type === 'fixed' && prev.fixedPulleys.length > 0) x = prev.fixedPulleys[prev.fixedPulleys.length - 1].x + 60;
        else if (type === 'movable' && prev.movablePulleys.length > 0) x = prev.movablePulleys[prev.movablePulleys.length - 1].x + 60;
        
        const newArr = type === 'fixed' ? { ...prev, fixedPulleys: [...prev.fixedPulleys, { id, x, y, radius: 25 }] } : { ...prev, movablePulleys: [...prev.movablePulleys, { id, x, y, radius: 25 }] };
        return newArr;
    });
  };
  
  const addAnchor = () => {
    setSandboxState(prev => ({ ...prev, anchors: [...prev.anchors, { id: `anchor-${Date.now()}`, x: 50, y: 50 }] }));
  };
  
  const addWeightBlock = () => {
     setSandboxState(prev => {
         const newId = `load-${Date.now()}`;
         const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
         const color = colors[prev.loads.length % colors.length];
         // Reduced default mass to 5kg
         return { ...prev, loads: [...prev.loads, { id: newId, mass: 5, color, x: 400, y: 350, vx: 0, vy: 0 }] };
     });
  };
  
  const setRopeMode = (mode: 'rope_direct' | 'rope_pulley') => {
      setSandboxState(prev => ({ 
          ...prev, 
          interactionMode: prev.interactionMode === mode ? 'select' : mode,
          selectedId: null, ropeConnectionStartId: null,
          ropeBuilderState: { step: mode === 'rope_pulley' ? 'select_first' : 'idle', firstId: null, secondId: null }
      }));
  };
  
  const clearRope = () => setSandboxState(prev => ({ ...prev, ropeSegments: [] }));

  const deleteSelected = () => {
    if (!sandboxState.selectedId) return;
    setSandboxState(s => ({
        ...s, 
        fixedPulleys: s.fixedPulleys.filter(p => p.id !== s.selectedId),
        movablePulleys: s.movablePulleys.filter(p => p.id !== s.selectedId),
        loads: s.loads.filter(l => l.id !== s.selectedId),
        anchors: s.anchors.filter(a => a.id !== s.selectedId),
        ropeSegments: s.ropeSegments.filter(seg => seg.fromId !== s.selectedId && seg.toId !== s.selectedId),
        selectedId: null
    }));
  };
  
  const updateSelectedLoadMass = (newMass: number) => {
      if (!sandboxState.selectedId || !sandboxState.selectedId.startsWith('load')) return;
      setSandboxState(prev => ({ ...prev, loads: prev.loads.map(l => l.id === prev.selectedId ? { ...l, mass: newMass } : l) }));
  };
  
  const updateSelectedPulleyRadius = (newRadius: number) => {
      if (!sandboxState.selectedId) return;
      setSandboxState(prev => ({
          ...prev,
          fixedPulleys: prev.selectedId!.startsWith('fixed') ? prev.fixedPulleys.map(p => p.id === prev.selectedId ? { ...p, radius: newRadius } : p) : prev.fixedPulleys,
          movablePulleys: prev.selectedId!.startsWith('movable') ? prev.movablePulleys.map(p => p.id === prev.selectedId ? { ...p, radius: newRadius } : p) : prev.movablePulleys
      }));
  };

  const getSelectedLoadMass = () => sandboxState.loads.find(l => l.id === sandboxState.selectedId)?.mass || 0;
  const getSelectedPulleyRadius = () => {
      return sandboxState.fixedPulleys.find(p => p.id === sandboxState.selectedId)?.radius || 
             sandboxState.movablePulleys.find(p => p.id === sandboxState.selectedId)?.radius || 25;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-80 h-full flex flex-col shadow-lg z-10 transition-colors duration-300">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
           <Settings2 size={20} className="text-slate-500" />
           Configuration
        </h2>
      </div>
      
      {/* Mode Selector */}
      <div className="p-2 mx-4 mt-4 bg-slate-100 dark:bg-slate-800 rounded-lg flex gap-1">
          <button 
             onClick={() => setRealityMode(RealityMode.IDEAL)}
             className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 ${realityMode === RealityMode.IDEAL ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
          >
             <Globe size={14} /> Ideal World
          </button>
          <button 
             onClick={() => setRealityMode(RealityMode.REAL)}
             className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 ${realityMode === RealityMode.REAL ? 'bg-white dark:bg-slate-600 shadow text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}
          >
             <TriangleAlert size={14} /> Real Life
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        
        {/* Real Life Controls (Only visible in REAL mode) */}
        {realityMode === RealityMode.REAL && (
            <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 animate-in slide-in-from-top-2">
                <h3 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase mb-2 border-b border-amber-200 dark:border-amber-800 pb-1 flex items-center gap-1">
                    <TriangleAlert size={12} /> Reality Limits
                </h3>
                {type === SimulationType.ATWOOD ? (
                    <>
                         <Slider
                            label="Rope Strength"
                            value={atwoodState.ropeMaxTension}
                            min={10} max={200} step={5} unit="N"
                            onChange={(v: number) => setAtwoodState(s => ({...s, ropeMaxTension: v}))}
                            warning
                         />
                         <Slider
                            label="Air Resistance"
                            value={atwoodState.airResistance}
                            min={0} max={5.0} step={0.1} unit="k"
                            onChange={(v: number) => setAtwoodState(s => ({...s, airResistance: v}))}
                            warning
                         />
                    </>
                ) : (
                    <>
                        <Slider
                            label="Rope Strength"
                            value={sandboxState.ropeMaxTension}
                            min={50} max={2000} step={50} unit="N"
                            onChange={(v: number) => setSandboxState(s => ({...s, ropeMaxTension: v}))}
                            warning
                        />
                        <Slider
                            label="Air Resistance"
                            value={sandboxState.airResistance}
                            min={0} max={5.0} step={0.1} unit="k"
                            onChange={(v: number) => setSandboxState(s => ({...s, airResistance: v}))}
                            warning
                        />
                    </>
                )}
            </div>
        )}

        {type === SimulationType.ATWOOD && (
          <>
             {/* Atwood Presets */}
             <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Experiments</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => applyAtwoodPreset('classic')} className="p-2 border border-slate-200 dark:border-slate-700 rounded text-xs bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex flex-col items-center"><Scale size={16} className="text-blue-500 mb-1"/>Classic Drop</button>
                    <button onClick={() => applyAtwoodPreset('large-radius')} className="p-2 border border-slate-200 dark:border-slate-700 rounded text-xs bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex flex-col items-center"><Disc size={16} className="text-purple-500 mb-1"/>Large Radius</button>
                </div>
             </div>

             <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase mb-2 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-1"><Workflow size={14} /> Advanced Systems</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => applyComplexPreset('movable')} className="p-2 border border-indigo-200 dark:border-indigo-800 rounded text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 font-semibold flex flex-col items-center"><GitGraph size={16} className="text-indigo-600 dark:text-indigo-400 mb-1"/>Movable Pulley</button>
                    <button onClick={() => applyComplexPreset('tackle')} className="p-2 border border-indigo-200 dark:border-indigo-800 rounded text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 font-semibold flex flex-col items-center"><GitGraph size={16} className="text-indigo-600 dark:text-indigo-400 mb-1"/>Complex Tackle</button>
                </div>
             </div>

             <div className="mb-6">
               <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase mb-2 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-1"><Ruler size={14} /> Rope Geometry</h3>
               <Slider 
                  label="Initial Left Height" 
                  value={atwoodState.initialY1} 
                  min={0.5} max={5.0} step={0.1} unit="m" 
                  onChange={(v: number) => setAtwoodState(s => ({ ...s, initialY1: v, y1: v, totalRopeLength: v + s.initialY2 }))}
               />
               <Slider 
                  label="Initial Right Height" 
                  value={atwoodState.initialY2} 
                  min={0.5} max={5.0} step={0.1} unit="m" 
                  onChange={(v: number) => setAtwoodState(s => ({ ...s, initialY2: v, y2: v, totalRopeLength: s.initialY1 + v }))}
               />
               <div className="text-[10px] text-slate-500 dark:text-slate-400 text-right">
                  Total Rope Length: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{atwoodState.totalRopeLength.toFixed(1)}m</span>
               </div>
            </div>

            <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900">
              <h3 className="text-xs font-bold text-red-800 dark:text-red-300 uppercase mb-2">Mass 1 (Left)</h3>
              <Slider label="Mass" value={atwoodState.mass1} min={0.1} max={20} step={0.1} unit="kg" onChange={(v: number) => setAtwoodState(s => ({ ...s, mass1: v }))}/>
            </div>
             <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
              <h3 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-2">Mass 2 (Right)</h3>
              <Slider label="Mass" value={atwoodState.mass2} min={0.1} max={20} step={0.1} unit="kg" onChange={(v: number) => setAtwoodState(s => ({ ...s, mass2: v }))}/>
            </div>
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Properties</h3>
              <Slider label="Pulley Mass" value={atwoodState.pulleyMass} min={0.1} max={20} step={0.1} unit="kg" onChange={(v: number) => setAtwoodState(s => ({ ...s, pulleyMass: v }))}/>
              <Slider label="Radius" value={atwoodState.pulleyRadius} min={0.1} max={1.0} step={0.1} unit="m" onChange={(v: number) => setAtwoodState(s => ({ ...s, pulleyRadius: v }))}/>
              <Slider label="Friction (k)" value={atwoodState.frictionCoeff} min={0.0} max={1.0} step={0.01} unit="" onChange={(v: number) => setAtwoodState(s => ({ ...s, frictionCoeff: v }))}/>
            </div>
          </>
        )}

        {type === SimulationType.SANDBOX && (
          <>
             <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Components</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => addPulley('fixed')} className="flex flex-col items-center justify-center p-3 rounded-lg border dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-medium text-slate-700 dark:text-slate-300"><PlusCircle size={20} className="mb-1 text-slate-500" />Fixed Pulley</button>
                    <button onClick={() => addPulley('movable')} className="flex flex-col items-center justify-center p-3 rounded-lg border dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-medium text-slate-700 dark:text-slate-300"><PlusCircle size={20} className="mb-1 text-slate-500" />Moving Pulley</button>
                     <button onClick={addWeightBlock} className="flex flex-col items-center justify-center p-3 rounded-lg border dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-medium text-slate-700 dark:text-slate-300"><Box size={20} className="mb-1 text-slate-500" />Add Weight</button>
                    <button onClick={addAnchor} className="flex flex-col items-center justify-center p-3 rounded-lg border dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-medium text-slate-700 dark:text-slate-300"><AnchorIcon size={20} className="mb-1 text-slate-500" />Add Anchor</button>
                </div>
             </div>

             <div className="mb-6">
                <div className="flex justify-between items-center mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">
                   <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">Rope Tools</h3>
                   <button onClick={clearRope} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/50 rounded" title="Clear All Ropes"><Eraser size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => setRopeMode('rope_direct')} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-xs font-medium ${sandboxState.interactionMode === 'rope_direct' ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-500 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}><Link size={18} className="mb-1" />Link Direct</button>
                    <button onClick={() => setRopeMode('rope_pulley')} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-xs font-medium ${sandboxState.interactionMode === 'rope_pulley' ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-500 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}><Spline size={18} className="mb-1" />Pulley Route</button>
                </div>
             </div>

             <button onClick={clearSandbox} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold uppercase transition-all mb-6"><Trash2 size={16} />Clear All</button>

             {sandboxState.selectedId && (
                 <div className="mb-6 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase">Selected: {sandboxState.selectedId.split('-')[0]}</h3>
                        <button onClick={deleteSelected} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 hover:bg-red-100 dark:hover:bg-red-950/50 rounded"><Trash2 size={16} /></button>
                    </div>
                     {/* Reduced Max range for mass slider to 50 for finer control */}
                     {sandboxState.selectedId.startsWith('load') && <Slider label="Block Mass" value={getSelectedLoadMass()} min={1} max={50} step={1} unit="kg" onChange={updateSelectedLoadMass}/>}
                     {(sandboxState.selectedId.startsWith('fixed') || sandboxState.selectedId.startsWith('movable')) && <Slider label="Pulley Radius" value={getSelectedPulleyRadius()} min={15} max={60} step={1} unit="px" onChange={updateSelectedPulleyRadius}/>}
                 </div>
             )}
            
            <div className="mb-6">
               <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Params</h3>
               <Slider label="Effort Force" value={sandboxState.effortForce} min={10} max={1000} step={10} unit="N" onChange={(v: number) => setSandboxState(s => ({ ...s, effortForce: v }))}/>
               <Slider label="System Friction" value={sandboxState.friction} min={0.0} max={1.0} step={0.01} unit="coeff" onChange={(v: number) => setSandboxState(s => ({ ...s, friction: v }))}/>
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col gap-2">
          {/* Time Scale Toggle */}
          <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1 mb-1">
             <button 
                onClick={() => setTimeScale(1.0)}
                className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${timeScale === 1.0 ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
             >
                <Rabbit size={14} /> Normal (1.0x)
             </button>
             <button 
                onClick={() => setTimeScale(0.2)}
                className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${timeScale === 0.2 ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
             >
                <Turtle size={14} /> Slow Mo (0.2x)
             </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPaused(!paused)}
              className={`flex-1 py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${paused ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
            >
              {paused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
              {paused ? "Start" : "Pause"}
            </button>
            <button onClick={reset} className="w-12 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all shadow-sm" title="Reset"><RotateCcw size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
