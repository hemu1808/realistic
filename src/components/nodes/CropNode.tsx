import { Handle, Position } from '@xyflow/react';
import { Crop as CropIcon } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const CropNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);

  return (
    <div className="w-56 rounded-xl border border-[#27272a] bg-[#0f0f12] text-zinc-300 shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden  transition-all duration-200 hover:border-lime-500/50 hover:shadow-lime-500/10">
      <Handle type="target" position={Position.Left} className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-blue-400" />
      <div className="flex items-center gap-2 bg-[#0f0f12] px-3 py-2 border-b border-[#27272a] rounded-t-xl">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-lime-500/20 text-lime-400"><CropIcon size={14} /></div>
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold tracking-wide text-zinc-200">Crop</h3>
          <span className="text-[9px] text-zinc-600">Transform</span>
        </div>
      </div>
      <div className="p-3">
        <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-600 mb-1.5">Aspect Ratio</label>
        <div className="flex gap-1.5">
          {['1:1', '16:9', '4:3', '3:2', 'Free'].map(r => (
            <button key={r} onClick={() => updateNodeData(id, { ratio: r })}
              className={`flex-1 rounded-md py-1.5 text-[10px] font-medium border transition-colors ${r === (data.ratio || '1:1') ? 'bg-lime-500/20 text-lime-300 border-lime-500/40' : 'bg-[#18181b] text-zinc-400 border-[#27272a] hover:border-lime-500/30'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-lime-400" />
    </div>
  );
});
CropNode.displayName = 'CropNode';
