
import React, { useState, useEffect, useRef } from 'react';
import { AtwoodState, SandboxState, SimulationType, HistoryPoint, RealityMode, Theme } from './types';
import { updateAtwoodPhysics, updateSandboxPhysics } from './services/physicsEngine';
import { SimControls } from './components/SimControls';
import { AtwoodCanvas } from './components/AtwoodCanvas';
import { SandboxCanvas } from './components/SandboxCanvas';
import { DataPanel } from './components/DataPanel';
import { NewtonsAnalysis } from './components/NewtonsAnalysis';
import { Layers, Info, Link, TriangleAlert, Sun, Moon } from 'lucide-react';
import { DEFAULT_ROPE_LIMIT } from './constants';

const INITIAL_ATWOOD: AtwoodState = {
  mass1: 2,
  mass2: 3,
  pulleyMass: 1,
  pulleyRadius: 0.2,
  frictionCoeff: 0.00,
  totalRopeLength: 5.0, // y1 (2.0) + y2 (3.0)
  ropeMaxTension: 50, // 50N limit. With 3kg mass, T ~ 30N. Add acceleration and it might break.
  airResistance: 0.1,
  isBroken: false,
  y1: 2.0,
  y2: 3.0,
  initialY1: 2.0, // Config state
  initialY2: 3.0, // Config state
  velocity: 0,
  angularVelocity: 0,
  acceleration: 0,
  tension1: 0,
  tension2: 0,
  time: 0,
};

const INITIAL_SANDBOX: SandboxState = {
  fixedPulleys: [],
  movablePulleys: [],
  loads: [], 
  anchors: [], 
  effortForce: 50, 
  loadPosition: 80, 
  loadVelocity: 0,
  isDragging: false,
  selectedId: null,
  friction: 0.00,
  ropeMaxTension: 120, // Lowered to 120N (approx 12kg static load) so it breaks easily with heavy weights
  airResistance: 0.1,
  isBroken: false,
  interactionMode: 'select',
  ropeSegments: [],
  ropeConnectionStartId: null,
  ropeBuilderState: {
    step: 'idle',
    firstId: null,
    secondId: null
  }
};

function App() {
  const [activeTab, setActiveTab] = useState<SimulationType>(SimulationType.ATWOOD);
  const [realityMode, setRealityMode] = useState<RealityMode>(RealityMode.IDEAL);
  const [theme, setTheme] = useState<Theme>('light');
  
  const [atwoodState, setAtwoodState] = useState<AtwoodState>(INITIAL_ATWOOD);
  const [sandboxState, setSandboxState] = useState<SandboxState>(INITIAL_SANDBOX);
  const [paused, setPaused] = useState(true);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [showVectors, setShowVectors] = useState(true);
  const [timeScale, setTimeScale] = useState<number>(1.0);

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Simulation Loop
  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const historyAccumulatorRef = useRef<number>(0); // New ref for stable sampling

  const isComplexAtwood = activeTab === SimulationType.ATWOOD && (sandboxState.fixedPulleys.length > 0 || sandboxState.movablePulleys.length > 0);

  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined && !paused) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      
      // Calculate scaled physics time step
      // Cap maximum delta at 0.05 (20fps min) to prevent physics explosions on lag
      const rawDt = Math.min(deltaTime, 0.05); 
      const dt = rawDt * timeScale;

      historyAccumulatorRef.current += deltaTime; // Use Real Time for sampling frequency

      // Sample rate: 20Hz (every 0.05s REAL TIME) for smooth graphs regardless of sim speed
      const shouldSample = historyAccumulatorRef.current >= 0.05;

      if (activeTab === SimulationType.ATWOOD && !isComplexAtwood) {
        // Standard Atwood Physics
        setAtwoodState(prev => {
           // Pass reality mode to physics
           const next = updateAtwoodPhysics(prev, dt, realityMode);
           
           if (!prev.isBroken && shouldSample) { 
               // Sanitize values for graph (snap tiny values to 0 to prevent scaling artifacts)
               const v = Math.abs(next.velocity) < 0.001 ? 0 : next.velocity;
               const a = Math.abs(next.acceleration) < 0.001 ? 0 : next.acceleration;

               setHistory(h => {
                   const newHistory = [...h, { 
                        time: parseFloat(next.time.toFixed(2)), 
                        velocity: parseFloat(v.toFixed(3)), 
                        acceleration: parseFloat(a.toFixed(3)),
                        position: parseFloat(next.y1.toFixed(3)) 
                   }];
                   // Keep last 100 points for a nice sliding window
                   return newHistory.slice(-100);
               });
           }
           return next;
        });
      } else {
        // Run Sandbox Physics
        setSandboxState(prev => {
            const next = updateSandboxPhysics(prev, dt, realityMode);
            
            if (!prev.isBroken && shouldSample) {
               const v = Math.abs(next.loadVelocity) < 0.001 ? 0 : next.loadVelocity;
               
               setHistory(h => {
                   const newHistory = [...h, {
                        time: parseFloat((Date.now() / 1000).toFixed(2)), // Relative time would be better, but this works for sandbox stream
                        velocity: parseFloat(v.toFixed(3)),
                        acceleration: 0, 
                        position: parseFloat((next.loadPosition / 10).toFixed(3)) 
                   }];
                   return newHistory.slice(-100);
               });
            }
            return next;
        });
      }

      if (shouldSample) {
          historyAccumulatorRef.current = 0;
      }
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [paused, activeTab, isComplexAtwood, realityMode, timeScale]); 

  const handleReset = () => {
    // Restore Atwood state to its initial configuration
    setAtwoodState(prev => ({
        ...prev,
        y1: prev.initialY1,
        y2: prev.initialY2,
        velocity: 0,
        acceleration: 0,
        angularVelocity: 0,
        tension1: 0,
        tension2: 0,
        time: 0,
        isBroken: false
    }));
    setSandboxState(INITIAL_SANDBOX);
    setHistory([]);
    historyAccumulatorRef.current = 0;
    setPaused(true);
  };
  
  const handleSandboxSelect = (id: string | null) => {
    if (sandboxState.interactionMode.startsWith('rope')) return;
    setSandboxState(prev => ({ ...prev, selectedId: id }));
  };
  
  const getObjCoords = (state: SandboxState, id: string) => {
      const bottomBaseY = 400 - (state.loadPosition * 3);
      const anchor = state.anchors.find(a => a.id === id);
      if (anchor) return { x: anchor.x, y: anchor.y };
      const fixed = state.fixedPulleys.find(p => p.id === id);
      if (fixed) return { x: fixed.x, y: fixed.y };
      const movable = state.movablePulleys.find(p => p.id === id);
      if (movable) return { x: movable.x, y: bottomBaseY };
      const load = state.loads.find(l => l.id === id);
      if (load) return { x: load.x, y: load.y };
      return { x: 0, y: 0 };
  };
  
  const handleSandboxObjectClick = (id: string) => {
    if (sandboxState.interactionMode === 'rope_pulley') {
      setSandboxState(prev => {
        const currentStep = prev.ropeBuilderState.step;
        if (currentStep === 'select_first') {
          return { ...prev, ropeBuilderState: { ...prev.ropeBuilderState, step: 'select_second', firstId: id } };
        }
        if (currentStep === 'select_second') {
           if (id === prev.ropeBuilderState.firstId) return prev;
           return { ...prev, ropeBuilderState: { ...prev.ropeBuilderState, step: 'select_pulley', secondId: id } };
        }
        if (currentStep === 'select_pulley') {
          if (!id.startsWith('fixed') && !id.startsWith('movable')) return prev;
          const firstId = prev.ropeBuilderState.firstId!;
          const secondId = prev.ropeBuilderState.secondId!;
          const pulleyId = id;
          const firstPos = getObjCoords(prev, firstId);
          const pulleyPos = getObjCoords(prev, pulleyId);
          const firstSide = firstPos.x < pulleyPos.x ? -1 : 1;
          const secondSide = getObjCoords(prev, secondId).x < pulleyPos.x ? -1 : 1;
          const segment1 = { id: `rope-${Date.now()}-1`, fromId: firstId, toId: pulleyId, type: 'pulley' as const, fromSide: 0, toSide: firstSide };
          const segment2 = { id: `rope-${Date.now()}-2`, fromId: pulleyId, toId: secondId, type: 'pulley' as const, fromSide: secondSide, toSide: 0 };
          return { ...prev, ropeSegments: [...prev.ropeSegments, segment1, segment2], ropeBuilderState: { step: 'select_first', firstId: null, secondId: null } };
        }
        return prev;
      });
      return;
    }
    if (sandboxState.interactionMode === 'rope_direct') {
      setSandboxState(prev => {
        if (!prev.ropeConnectionStartId) return { ...prev, ropeConnectionStartId: id };
        if (prev.ropeConnectionStartId === id) return { ...prev, ropeConnectionStartId: null };
        const exists = prev.ropeSegments.some(s => (s.fromId === prev.ropeConnectionStartId && s.toId === id) || (s.fromId === id && s.toId === prev.ropeConnectionStartId));
        if (exists) return { ...prev, ropeConnectionStartId: null };
        return {
          ...prev,
          ropeSegments: [...prev.ropeSegments, { id: `rope-${Date.now()}`, fromId: prev.ropeConnectionStartId, toId: id, type: 'direct', fromSide: 0, toSide: 0 }],
          ropeConnectionStartId: null 
        };
      });
    }
  };

  const handleSandboxMove = (id: string, x: number, y: number) => {
      setSandboxState(prev => {
          if (id.startsWith('fixed')) return { ...prev, fixedPulleys: prev.fixedPulleys.map(p => p.id === id ? { ...p, x, y } : p) };
          else if (id.startsWith('movable')) return { ...prev, movablePulleys: prev.movablePulleys.map(p => p.id === id ? { ...p, x } : p) };
          else if (id.startsWith('load')) return { ...prev, loads: prev.loads.map(l => l.id === id ? { ...l, x, y } : l) };
          else if (id.startsWith('anchor')) return { ...prev, anchors: prev.anchors.map(a => a.id === id ? { ...a, x, y } : a) };
          return prev;
      });
  };

  const handleSandboxClear = () => {
      setSandboxState(INITIAL_SANDBOX);
  };

  // Determine if Broken
  const isSystemBroken = (activeTab === SimulationType.ATWOOD && !isComplexAtwood) ? atwoodState.isBroken : sandboxState.isBroken;

  return (
    <div className={`flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300`}>
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 justify-between shrink-0 z-20 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Layers size={20} />
          </div>
          <h1 className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">PhysLab: Pulley Dynamics</h1>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => { setActiveTab(SimulationType.ATWOOD); setPaused(true); setHistory([]); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === SimulationType.ATWOOD ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Experiment: Atwood
          </button>
          <button
            onClick={() => { setActiveTab(SimulationType.SANDBOX); setPaused(true); setHistory([]); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === SimulationType.SANDBOX ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Sandbox: Builder
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
           <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200">
             <input type="checkbox" checked={showVectors} onChange={e => setShowVectors(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
             Show Force Vectors
           </label>
           <button 
             onClick={toggleTheme} 
             className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
             title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
           >
             {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
           </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <DataPanel 
          type={isComplexAtwood ? SimulationType.SANDBOX : activeTab}
          history={history}
          atwoodState={atwoodState}
          sandboxState={sandboxState}
          theme={theme}
        />
        
        <main className="flex-1 relative bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden cursor-crosshair transition-colors duration-300">
          <NewtonsAnalysis 
            type={activeTab} 
            atwoodState={atwoodState} 
            sandboxState={sandboxState}
            isComplexAtwood={isComplexAtwood}
          />

           {/* Broken State Overlay */}
           {isSystemBroken && (
             <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-500/10 backdrop-blur-[1px] pointer-events-none">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-2xl border-2 border-red-500 flex flex-col items-center animate-in zoom-in duration-300">
                   <TriangleAlert size={48} className="text-red-600 mb-2" />
                   <h2 className="text-2xl font-black text-red-700 tracking-tighter uppercase">Rope Snapped!</h2>
                   <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xs text-center">
                     Tension exceeded the rope's breaking limit of {activeTab === SimulationType.ATWOOD ? atwoodState.ropeMaxTension : sandboxState.ropeMaxTension}N.
                   </p>
                </div>
             </div>
           )}

          {activeTab === SimulationType.SANDBOX && sandboxState.interactionMode === 'rope_pulley' && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
                 <div className="bg-slate-800 dark:bg-slate-700 text-white px-6 py-2 rounded-full shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                     <Info size={18} className="text-blue-400" />
                     <div className="flex flex-col items-center">
                        <span className="font-bold text-sm">Pulley Route Tool</span>
                        <span className="text-xs text-slate-300">
                            {sandboxState.ropeBuilderState.step === 'select_first' && "Step 1: Select the FIRST load or anchor."}
                            {sandboxState.ropeBuilderState.step === 'select_second' && "Step 2: Select the SECOND load or anchor."}
                            {sandboxState.ropeBuilderState.step === 'select_pulley' && "Step 3: Click the PULLEY to wrap the rope around."}
                        </span>
                     </div>
                 </div>
             </div>
          )}

           {activeTab === SimulationType.SANDBOX && sandboxState.interactionMode === 'rope_direct' && sandboxState.ropeConnectionStartId && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
                 <div className="bg-slate-800 dark:bg-slate-700 text-white px-6 py-2 rounded-full shadow-lg flex items-center gap-3">
                     <Link size={18} className="text-emerald-400" />
                     <span className="text-xs font-medium">Select destination object to link...</span>
                 </div>
             </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center">
            {activeTab === SimulationType.SANDBOX || isComplexAtwood ? (
              <SandboxCanvas 
                state={sandboxState} 
                onSelect={handleSandboxSelect}
                onMove={handleSandboxMove}
                onObjectClick={handleSandboxObjectClick}
                showVectors={showVectors}
                theme={theme}
              />
            ) : (
              <AtwoodCanvas state={atwoodState} showVectors={showVectors} theme={theme} />
            )}
          </div>
          
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
            style={{ backgroundImage: `radial-gradient(${theme === 'dark' ? '#fff' : '#000'} 1px, transparent 1px)`, backgroundSize: '20px 20px' }}
          />
          
          {/* Mode Indicator Watermark */}
          <div className="absolute bottom-4 left-4 pointer-events-none">
             {realityMode === RealityMode.REAL ? (
                 <div className="bg-amber-100/80 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700 px-3 py-1 rounded text-amber-800 dark:text-amber-200 text-xs font-bold tracking-wider shadow-sm flex items-center gap-2">
                     <TriangleAlert size={12} /> REAL LIFE MODE (Fragile Ropes)
                 </div>
             ) : (
                 <div className="bg-blue-100/80 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 px-3 py-1 rounded text-blue-800 dark:text-blue-200 text-xs font-bold tracking-wider shadow-sm flex items-center gap-2">
                      IDEAL WORLD (Infinite Strength)
                 </div>
             )}
          </div>

          {activeTab === SimulationType.ATWOOD && !isComplexAtwood && (
             <div className="absolute top-4 left-4 pointer-events-none opacity-50">
               <div className="text-4xl font-black text-slate-200 dark:text-slate-800 tracking-tighter">ATWOOD</div>
               <div className="text-sm text-slate-400 dark:text-slate-600">Rotational Inertia Demo</div>
             </div>
          )}
           {activeTab === SimulationType.ATWOOD && isComplexAtwood && (
             <div className="absolute top-4 left-4 pointer-events-none opacity-50">
               <div className="text-4xl font-black text-slate-200 dark:text-slate-800 tracking-tighter">ADVANCED</div>
               <div className="text-sm text-slate-400 dark:text-slate-600">Complex System Simulation</div>
             </div>
          )}
          {activeTab === SimulationType.SANDBOX && (
             <div className="absolute top-4 left-4 pointer-events-none opacity-50">
               <div className="text-4xl font-black text-slate-200 dark:text-slate-800 tracking-tighter">BUILDER</div>
             </div>
          )}
        </main>

        <SimControls 
          type={activeTab}
          atwoodState={atwoodState}
          sandboxState={sandboxState}
          setAtwoodState={setAtwoodState}
          setSandboxState={setSandboxState}
          setActiveTab={setActiveTab}
          paused={paused}
          setPaused={setPaused}
          reset={handleReset}
          clearSandbox={handleSandboxClear}
          realityMode={realityMode}
          setRealityMode={setRealityMode}
          timeScale={timeScale}
          setTimeScale={setTimeScale}
        />
      </div>
    </div>
  );
}

export default App;
