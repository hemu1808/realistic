import { Handle, Position } from '@xyflow/react';
import { ArrowUpCircle } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const UpscaleNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const scale = data.scale || 2;

  return (
    <div className="w-56 rounded-xl border border-[#27272a] bg-[#0f0f12] text-zinc-300 shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden  transition-all duration-200 hover:border-teal-500/50 hover:shadow-teal-500/10">
      <Handle type="target" position={Position.Left} className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-blue-400" />
      <div className="flex items-center gap-2 bg-[#0f0f12] px-3 py-2 border-b border-[#27272a] rounded-t-xl">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-500/20 text-teal-400"><ArrowUpCircle size={14} /></div>
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold tracking-wide text-zinc-200">Upscale</h3>
          <span className="text-[9px] text-zinc-600">AI Model</span>
        </div>
      </div>
      <div className="p-3">
        <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-600 mb-1.5">Scale Factor</label>
        <div className="flex gap-1.5">
          {[2, 4, 8].map(s => (
            <button key={s} onClick={() => updateNodeData(id, { scale: s })}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-medium border transition-colors ${s === scale ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'bg-[#18181b] text-zinc-400 border-[#27272a] hover:border-teal-500/30'}`}>
              {s}x
            </button>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-teal-400" />
    </div>
  );
});
UpscaleNode.displayName = 'UpscaleNode';
