import { Handle, Position } from '@xyflow/react';
import { Eye } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const DetailEnhanceNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const amount = data.amount ?? 0.5;

  return (
    <div className="w-60 node-card hover:!border-[var(--t-accent)] transition-colors">
      <Handle type="target" position={Position.Left} />
      
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--t-accent)]/20 text-[var(--t-accent)]">
          <Eye size={14} />
        </div>
        <div className="flex flex-col">
          <h3>Detail Enhance</h3>
          <span className="subtitle">Micro-Contrast</span>
        </div>
      </div>

      <div className="node-card-body">
        <div className="flex items-center justify-between text-[10px] mb-2">
          <span className="text-[var(--t-textDim)]">HDR Micro-pop</span>
          <span className="text-[var(--t-text)]">{(amount * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={amount}
          onChange={(e) => updateNodeData(id, { amount: parseFloat(e.target.value) })}
          className="w-full"
        />
        <p className="text-[9px] text-[var(--t-textDim)] mt-3 leading-relaxed">
          Enhances localized textures securely without clipping the highlight luminance or deep shadows.
        </p>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
});

DetailEnhanceNode.displayName = 'DetailEnhanceNode';
