import { Handle, Position } from '@xyflow/react';
import { ArrowUpCircle } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const UpscaleNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const scale = data.scale || 2;

  return (
    <div className="w-56 node-card hover:!border-teal-500/40">
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-blue-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-500/20 text-teal-400"><ArrowUpCircle size={14} /></div>
        <div className="flex flex-col">
          <h3>Upscale</h3>
          <span className="subtitle">AI Model</span>
        </div>
      </div>
      <div className="node-card-body">
        <label className="node-label">Scale Factor</label>
        <div className="flex gap-1.5">
          {[2, 4, 8].map(s => (
            <button key={s} onClick={() => updateNodeData(id, { scale: s })}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-medium border transition-colors ${s === scale ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : ''}`}
              style={s !== scale ? { background: 'var(--t-bg2)', color: 'var(--t-textMuted)', borderColor: 'var(--t-border)' } : undefined}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-teal-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
    </div>
  );
});
UpscaleNode.displayName = 'UpscaleNode';
