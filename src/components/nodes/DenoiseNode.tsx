import { Handle, Position } from '@xyflow/react';
import { Sparkle } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const DenoiseNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const intensity = data.intensity || 'Medium';

  return (
    <div className="w-56 node-card hover:!border-[var(--t-accent)] transition-colors">
      <Handle type="target" position={Position.Left} />
      
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--t-accent)]/20 text-[var(--t-accent)]">
          <Sparkle size={14} />
        </div>
        <div className="flex flex-col">
          <h3>AI Denoise</h3>
          <span className="subtitle">Cleanup</span>
        </div>
      </div>

      <div className="node-card-body">
        <label className="node-label">Intensity</label>
        <div className="flex gap-1.5">
          {['Light', 'Medium', 'Heavy'].map(lvl => (
            <button key={lvl} onClick={() => updateNodeData(id, { intensity: lvl })}
              className={`flex-1 rounded-md py-1.5 text-[10px] font-medium transition-all ${
                lvl === intensity 
                  ? 'bg-[var(--t-bg1)] text-[var(--t-text)] shadow-sm ring-1 ring-[var(--t-borderSubtle)]' 
                  : 'text-[var(--t-textDim)] hover:text-[var(--t-textMuted)] bg-[var(--t-bg2)] border border-[var(--t-border)]'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-[var(--t-textDim)] mt-3 leading-relaxed">
          Uses cinematic Non-local Means calculation to remove grain without blowing out hard edges.
        </p>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
});

DenoiseNode.displayName = 'DenoiseNode';
