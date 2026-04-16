import { Handle, Position } from '@xyflow/react';
import { Palette } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

const MODES = ['Grayscale', 'Sepia', 'Invert', 'Posterize'];

export const GrayscaleNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const mode = data.mode || 'Grayscale';

  return (
    <div className="w-56 node-card hover:!border-zinc-400/40">
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-blue-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-400/20 text-zinc-300"><Palette size={14} /></div>
        <div className="flex flex-col">
          <h3>Color Mode</h3>
          <span className="subtitle">Filter</span>
        </div>
      </div>
      <div className="node-card-body space-y-1">
        {MODES.map(m => (
          <button key={m} onClick={() => updateNodeData(id, { mode: m })}
            className={`flex w-full rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${m === mode ? 'bg-zinc-400/15 border border-zinc-400/30' : 'border border-transparent'}`}
            style={{
              color: m === mode ? 'var(--t-text)' : 'var(--t-textDim)',
            }}
            onMouseEnter={e => { if (m !== mode) e.currentTarget.style.background = 'var(--t-bg2)' }}
            onMouseLeave={e => { if (m !== mode) e.currentTarget.style.background = 'transparent' }}
          >
            {m}
          </button>
        ))}
      </div>
      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-zinc-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
    </div>
  );
});
GrayscaleNode.displayName = 'GrayscaleNode';
