import { Handle, Position } from '@xyflow/react';
import { Contrast } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const SharpenNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const amount = data.amount ?? 50;

  return (
    <div className="w-56 node-card hover:!border-sky-500/40">
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-blue-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/20 text-sky-400"><Contrast size={14} /></div>
        <div className="flex flex-col">
          <h3>Sharpen</h3>
          <span className="subtitle">Filter</span>
        </div>
      </div>
      <div className="node-card-body">
        <div className="flex justify-between mb-1">
          <label className="node-label !mb-0">Amount</label>
          <span className="text-[9px]" style={{ color: 'var(--t-textMuted)' }}>{amount}%</span>
        </div>
        <input type="range" min={0} max={100} value={amount}
          onChange={e => updateNodeData(id, { amount: +e.target.value })} />
      </div>
      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-sky-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
    </div>
  );
});
SharpenNode.displayName = 'SharpenNode';
