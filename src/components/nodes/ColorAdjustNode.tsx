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
    <div className="w-56 rounded-xl border border-[#27272a] bg-[#0f0f12] text-zinc-300 shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden  transition-all duration-200 hover:border-amber-500/50 hover:shadow-amber-500/10">
      <Handle type="target" position={Position.Left} className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-blue-400" />
      <div className="flex items-center gap-2 bg-[#0f0f12] px-3 py-2 border-b border-[#27272a] rounded-t-xl">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-400"><Sun size={14} /></div>
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold tracking-wide text-zinc-200">Color Adjust</h3>
          <span className="text-[9px] text-zinc-600">Transform</span>
        </div>
      </div>
      <div className="p-3 space-y-2.5">
        {[
          { label: 'Brightness', value: brightness, key: 'brightness' },
          { label: 'Contrast', value: contrast, key: 'contrast' },
          { label: 'Saturation', value: saturation, key: 'saturation' },
        ].map(s => (
          <div key={s.key}>
            <div className="flex justify-between mb-1">
              <label className="text-[9px] uppercase font-bold tracking-wider text-zinc-600">{s.label}</label>
              <span className="text-[9px] text-zinc-400">{s.value}%</span>
            </div>
            <input type="range" min={0} max={200} value={s.value}
              onChange={e => updateNodeData(id, { [s.key]: +e.target.value })}
              className="w-full h-1 rounded-full appearance-none bg-[#27272a] accent-amber-400 cursor-pointer" />
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-amber-400" />
    </div>
  );
});
ColorAdjustNode.displayName = 'ColorAdjustNode';
