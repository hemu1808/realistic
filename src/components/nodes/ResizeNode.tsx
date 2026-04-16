import { Handle, Position } from '@xyflow/react';
import { Maximize } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const ResizeNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const width = data.width || 512;
  const height = data.height || 512;

  return (
    <div className="w-56 node-card hover:!border-cyan-500/40">
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-blue-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400"><Maximize size={14} /></div>
        <div className="flex flex-col">
          <h3>Resize</h3>
          <span className="subtitle">Transform</span>
        </div>
      </div>
      <div className="node-card-body space-y-2">
        <div>
          <label className="node-label">Width</label>
          <input type="number" value={width} onChange={e => updateNodeData(id, { width: +e.target.value })}
            className="node-input" />
        </div>
        <div>
          <label className="node-label">Height</label>
          <input type="number" value={height} onChange={e => updateNodeData(id, { height: +e.target.value })}
            className="node-input" />
        </div>
      </div>
      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-cyan-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
    </div>
  );
});
ResizeNode.displayName = 'ResizeNode';
