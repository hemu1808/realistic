import { Handle, Position } from '@xyflow/react';
import { Crop as CropIcon } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const CropNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);

  return (
    <div className="w-56 node-card hover:!border-lime-500/40">
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-blue-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-lime-500/20 text-lime-400"><CropIcon size={14} /></div>
        <div className="flex flex-col">
          <h3>Crop</h3>
          <span className="subtitle">Transform</span>
        </div>
      </div>
      <div className="node-card-body">
        <label className="node-label">Aspect Ratio</label>
        <div className="flex gap-1.5">
          {['1:1', '16:9', '4:3', '3:2', 'Free'].map(r => (
            <button key={r} onClick={() => updateNodeData(id, { ratio: r })}
              className={`flex-1 rounded-md py-1.5 text-[10px] font-medium border transition-colors ${r === (data.ratio || '1:1') ? 'bg-lime-500/20 text-lime-300 border-lime-500/40' : ''}`}
              style={r !== (data.ratio || '1:1') ? { background: 'var(--t-bg2)', color: 'var(--t-textMuted)', borderColor: 'var(--t-border)' } : undefined}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-lime-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
    </div>
  );
});
CropNode.displayName = 'CropNode';
