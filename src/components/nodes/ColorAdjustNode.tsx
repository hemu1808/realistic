import { Handle, Position } from '@xyflow/react';
import { Sun } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const ColorAdjustNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const brightness = data.brightness ?? 100;
  const contrast = data.contrast ?? 100;
  const saturation = data.saturation ?? 100;

  return (
    <div className="w-56 node-card hover:!border-amber-500/40">
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-blue-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-400"><Sun size={14} /></div>
        <div className="flex flex-col">
          <h3>Color Adjust</h3>
          <span className="subtitle">Transform</span>
        </div>
      </div>
      <div className="node-card-body space-y-2.5">
        {[
          { label: 'Brightness', value: brightness, key: 'brightness' },
          { label: 'Contrast', value: contrast, key: 'contrast' },
          { label: 'Saturation', value: saturation, key: 'saturation' },
        ].map(s => (
          <div key={s.key}>
            <div className="flex justify-between mb-1">
              <label className="node-label !mb-0">{s.label}</label>
              <span className="text-[9px]" style={{ color: 'var(--t-textMuted)' }}>{s.value}%</span>
            </div>
            <input type="range" min={0} max={200} value={s.value}
              onChange={e => updateNodeData(id, { [s.key]: +e.target.value })} />
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-amber-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
    </div>
  );
});
ColorAdjustNode.displayName = 'ColorAdjustNode';
