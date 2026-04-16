import { Handle, Position } from '@xyflow/react';
import { MoonStar } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const DayNightNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const mode = data.mode || 'day-to-night';

  return (
    <div className="w-64 node-card hover:!border-[var(--t-accent)] transition-colors">
      <Handle type="target" position={Position.Left} />
      
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--t-accent)]/20 text-[var(--t-accent)]">
          <MoonStar size={14} />
        </div>
        <div className="flex flex-col">
          <h3>Time of Day Translation</h3>
          <span className="subtitle">AI Generator</span>
        </div>
      </div>

      <div className="node-card-body space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-md bg-[var(--t-bg2)] p-1 border border-[var(--t-border)]">
          <button
            onClick={() => updateNodeData(id, { mode: 'day-to-night' })}
            className={`rounded px-2 py-1.5 text-[10px] font-medium transition-all ${
              mode === 'day-to-night'
                ? 'bg-[var(--t-bg1)] text-[var(--t-text)] shadow-sm ring-1 ring-[var(--t-borderSubtle)]'
                : 'text-[var(--t-textDim)] hover:text-[var(--t-textMuted)]'
            }`}
          >
            Day to Night
          </button>
          <button
            onClick={() => updateNodeData(id, { mode: 'night-to-day' })}
            className={`rounded px-2 py-1.5 text-[10px] font-medium transition-all ${
              mode === 'night-to-day'
                ? 'bg-[var(--t-bg1)] text-[var(--t-text)] shadow-sm ring-1 ring-[var(--t-borderSubtle)]'
                : 'text-[var(--t-textDim)] hover:text-[var(--t-textMuted)]'
            }`}
          >
            Night to Day
          </button>
        </div>

        <p className="text-[10px] text-[var(--t-textDim)] leading-relaxed">
          Powered by Deep Learning models. Synthesizes relighting, sky replacement, and physical lighting effects dynamically.
        </p>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
});

DayNightNode.displayName = 'DayNightNode';
