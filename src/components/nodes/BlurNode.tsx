import { Handle, Position } from '@xyflow/react';
import { Droplet } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';
import NodeHeader from './NodeHeader';

export const BlurNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore(s => s.updateNodeData);

  return (
    <div className="w-[220px] node-card hover:!border-blue-500/40">
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-[10px] !w-[10px] !rounded-full !border-2 !bg-blue-400"
        style={{ borderColor: 'var(--t-bg1)' }} />

      <NodeHeader
        id={id}
        icon={<Droplet size={13} />}
        label="Blur"
        subtitle="Filter"
        colorClass="bg-blue-500/15 text-blue-400"
      />

      <div className="node-card-body">
        <div className="flex items-center justify-between mb-2">
            <span className="node-label !mb-0">Radius</span>
            <span className="text-[10px] text-blue-400 font-bold">{data.blur || 5}px</span>
        </div>
        <input
          type="range"
          min="0" max="25" step="1"
          value={data.blur || 5}
          onChange={(e) => updateNodeData(id, { blur: parseInt(e.target.value) })}
        />
      </div>

      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-[10px] !w-[10px] !rounded-full !border-2 !bg-blue-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
    </div>
  );
});
BlurNode.displayName = 'BlurNode';
