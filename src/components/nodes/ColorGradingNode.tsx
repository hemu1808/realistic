import { Handle, Position } from '@xyflow/react';
import { Film } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

const PROFILES = ['Teal & Orange', 'Moody Film', 'Cyberpunk', 'Vintage'];

export const ColorGradingNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const profile = data.profile || 'Teal & Orange';

  return (
    <div className="w-56 node-card hover:!border-[var(--t-accent)] transition-colors">
      <Handle type="target" position={Position.Left} />
      
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--t-accent)]/20 text-[var(--t-accent)]">
          <Film size={14} />
        </div>
        <div className="flex flex-col">
          <h3>LUT Color Grading</h3>
          <span className="subtitle">Cinematic</span>
        </div>
      </div>

      <div className="node-card-body">
        <div className="flex flex-col gap-1.5">
          {PROFILES.map(p => (
            <button key={p} onClick={() => updateNodeData(id, { profile: p })}
              className={`text-left rounded-md px-3 py-2 text-[11px] font-medium transition-all ${
                p === profile 
                  ? 'bg-[var(--t-bg1)] text-[var(--t-text)] shadow-sm ring-1 ring-[var(--t-borderSubtle)]' 
                  : 'text-[var(--t-textDim)] hover:text-[var(--t-textMuted)] bg-[var(--t-bg2)] border border-[var(--t-border)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
});

ColorGradingNode.displayName = 'ColorGradingNode';
