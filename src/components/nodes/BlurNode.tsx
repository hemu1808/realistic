import { Handle, Position } from '@xyflow/react';
import { Droplets, ChevronDown } from 'lucide-react';
import { memo, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';

const BLUR_TYPES = ['Gaussian', 'Motion', 'Radial', 'Box'];

export const BlurNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const [open, setOpen] = useState(false);
  const blurType = data.blurType || 'Gaussian';
  const radius = data.radius ?? 4;

  return (
    <div className="w-56 rounded-xl border border-[#27272a] bg-[#0f0f12] text-zinc-300 shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-visible  transition-all duration-200 hover:border-indigo-500/50 hover:shadow-indigo-500/10">
      <Handle type="target" position={Position.Left} className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-blue-400" />
      <div className="flex items-center gap-2 bg-[#0f0f12] px-3 py-2 border-b border-[#27272a] rounded-t-xl">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400"><Droplets size={14} /></div>
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold tracking-wide text-zinc-200">Blur</h3>
          <span className="text-[9px] text-zinc-600">Filter</span>
        </div>
      </div>
      <div className="p-3 space-y-2.5">
        <div>
          <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-600 mb-1">Type</label>
          <div className="relative">
            <button onClick={() => setOpen(!open)}
              className="flex w-full items-center justify-between rounded-md bg-[#18181b] px-2 py-1.5 text-[11px] text-zinc-300 border border-[#27272a] hover:border-indigo-500/50 transition-colors">
              <span>{blurType}</span>
              <ChevronDown size={12} className={clsx("text-zinc-400 transition-transform", open && "rotate-180")} />
            </button>
            {open && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-[#27272a] bg-[#0f0f12] shadow-2xl overflow-hidden">
                {BLUR_TYPES.map(t => (
                  <button key={t} onClick={() => { updateNodeData(id, { blurType: t }); setOpen(false); }}
                    className={clsx("flex w-full px-2.5 py-1.5 text-[11px] hover:bg-indigo-500/10 hover:text-indigo-300", t === blurType ? "bg-indigo-500/15 text-indigo-300" : "text-zinc-400")}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-[9px] uppercase font-bold tracking-wider text-zinc-600">Radius</label>
            <span className="text-[9px] text-zinc-400">{radius}px</span>
          </div>
          <input type="range" min={0} max={20} value={radius}
            onChange={e => updateNodeData(id, { radius: +e.target.value })}
            className="w-full h-1 rounded-full appearance-none bg-[#27272a] accent-indigo-400 cursor-pointer" />
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-indigo-400" />
    </div>
  );
});
BlurNode.displayName = 'BlurNode';
