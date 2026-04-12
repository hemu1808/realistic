import { Handle, Position } from '@xyflow/react';
import { Contrast } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const SharpenNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const amount = data.amount ?? 50;

  return (
    <div className="w-56 rounded-xl border border-[#27272a] bg-[#0f0f12] text-zinc-300 shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden  transition-all duration-200 hover:border-sky-500/50 hover:shadow-sky-500/10">
      <Handle type="target" position={Position.Left} className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-blue-400" />
      <div className="flex items-center gap-2 bg-[#0f0f12] px-3 py-2 border-b border-[#27272a] rounded-t-xl">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/20 text-sky-400"><Contrast size={14} /></div>
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold tracking-wide text-zinc-200">Sharpen</h3>
          <span className="text-[9px] text-zinc-600">Filter</span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex justify-between mb-1">
          <label className="text-[9px] uppercase font-bold tracking-wider text-zinc-600">Amount</label>
          <span className="text-[9px] text-zinc-400">{amount}%</span>
        </div>
        <input type="range" min={0} max={100} value={amount}
          onChange={e => updateNodeData(id, { amount: +e.target.value })}
          className="w-full h-1 rounded-full appearance-none bg-[#27272a] accent-sky-400 cursor-pointer" />
      </div>
      <Handle type="source" position={Position.Right} className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-sky-400" />
    </div>
  );
});
SharpenNode.displayName = 'SharpenNode';
