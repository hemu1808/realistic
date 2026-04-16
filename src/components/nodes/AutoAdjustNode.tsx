import { Handle, Position } from '@xyflow/react';
import { SlidersHorizontal } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const AutoAdjustNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const mode = data.mode || 'traditional';
  const intensity = data.intensity ?? 1.0;

  return (
    <div className="w-64 node-card hover:!border-[var(--t-accent)] transition-colors">
      <Handle type="target" position={Position.Left} />
      
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--t-accent)]/20 text-[var(--t-accent)]">
          <SlidersHorizontal size={14} />
        </div>
        <div className="flex flex-col">
          <h3>Auto-Adjust Levels</h3>
          <span className="subtitle">Enhance</span>
        </div>
      </div>

      <div className="node-card-body space-y-3">
        <div className="flex flex-col gap-1 rounded-md bg-[var(--t-bg2)] p-1 border border-[var(--t-border)]">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => updateNodeData(id, { mode: 'traditional' })}
              className={`rounded px-2 py-1 text-[9px] font-medium transition-all ${
                mode === 'traditional'
                  ? 'bg-[var(--t-bg1)] text-[var(--t-text)] shadow-sm ring-1 ring-[var(--t-borderSubtle)]'
                  : 'text-[var(--t-textDim)] hover:text-[var(--t-textMuted)]'
              }`}
            >
              Traditional (Local)
            </button>
            <button
              onClick={() => updateNodeData(id, { mode: 'agent' })}
              className={`flex items-center justify-center gap-1.5 rounded px-2 py-1 text-[9px] font-medium transition-all ${
                mode === 'agent'
                  ? 'bg-[var(--t-bg1)] text-[var(--t-accent)] shadow-sm ring-1 ring-[var(--t-borderSubtle)]'
                  : 'text-[var(--t-textDim)] hover:text-[var(--t-textMuted)]'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--t-accent)] animate-pulse-soft" />
              RL Agent
            </button>
          </div>
          <button
            onClick={() => updateNodeData(id, { mode: 'ai' })}
            className={`flex items-center justify-center gap-1.5 rounded px-2 py-1 text-[9px] font-medium transition-all ${
              mode === 'ai'
                ? 'bg-[var(--t-bg1)] text-violet-400 shadow-sm ring-1 ring-[var(--t-borderSubtle)]'
                : 'text-[var(--t-textDim)] hover:text-[var(--t-textMuted)]'
            }`}
          >
            Diffusion (Cloud)
          </button>
        </div>

        {mode === 'traditional' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--t-textDim)]">Intensity Profile</span>
              <span className="text-[var(--t-text)]">{(intensity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={intensity}
              onChange={(e) => updateNodeData(id, { intensity: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-[9px] text-[var(--t-textDim)] mt-2 leading-relaxed">
              Utilizes CLAHE &amp; Gray World White Balance.
            </p>
          </div>
        )}
        
        {mode === 'agent' && (
           <div className="space-y-1">
             <p className="text-[10px] text-[var(--t-textDim)] leading-relaxed">
               Uses a deep Convolutional Reinforcement Learning agent to mathematically evaluate the image's layout and determine optimal curve offsets.
             </p>
           </div>
        )}
        
        {mode === 'ai' && (
           <p className="text-[10px] text-[var(--t-textDim)] leading-relaxed">
             Uses Zero-Shot prompting and diffusion (SDXL Engine) to completely rebuild exposure and contrast artificially via the Cloud.
           </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
});

AutoAdjustNode.displayName = 'AutoAdjustNode';
