import { Handle, Position } from '@xyflow/react';
import { Palette } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

const MODES = ['Grayscale', 'Sepia', 'Invert', 'Posterize'];

export const GrayscaleNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const mode = data.mode || 'Grayscale';

  return (
    <div className="w-56 rounded-xl border border-[#27272a] bg-[#0f0f12] text-zinc-300 shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden  transition-all duration-200 hover:border-zinc-400/50 hover:shadow-zinc-400/10">
      <Handle type="target" position={Position.Left} className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-blue-400" />
      <div className="flex items-center gap-2 bg-[#0f0f12] px-3 py-2 border-b border-[#27272a] rounded-t-xl">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-400/20 text-zinc-300"><Palette size={14} /></div>
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold tracking-wide text-zinc-200">Color Mode</h3>
          <span className="text-[9px] text-zinc-600">Filter</span>
        </div>
      </div>
      <div className="p-3 space-y-1">
        {MODES.map(m => (
          <button key={m} onClick={() => updateNodeData(id, { mode: m })}
            className={`flex w-full rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${m === mode ? 'bg-zinc-400/15 text-zinc-200 border border-zinc-400/30' : 'text-zinc-600 hover:bg-[#18181b] hover:text-zinc-300 border border-transparent'}`}>
            {m}
          </button>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-zinc-400" />
    </div>
  );
});
GrayscaleNode.displayName = 'GrayscaleNode';
