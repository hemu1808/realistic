import { Handle, Position } from '@xyflow/react';
import { Eraser } from 'lucide-react';
import { memo } from 'react';

export const BackgroundRemoveNode = memo(({ data }: any) => {
  return (
    <div className="w-56 rounded-xl border border-[#27272a] bg-[#0f0f12] text-zinc-300 shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden  transition-all duration-200 hover:border-rose-500/50 hover:shadow-rose-500/10">
      <Handle type="target" position={Position.Left} className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-blue-400" />
      <div className="flex items-center gap-2 bg-[#0f0f12] px-3 py-2 border-b border-[#27272a] rounded-t-xl">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/20 text-rose-400"><Eraser size={14} /></div>
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold tracking-wide text-zinc-200">BG Remove</h3>
          <span className="text-[9px] text-zinc-600">AI Model</span>
        </div>
      </div>
      <div className="p-3">
        <div className="rounded-lg bg-[#09090b] p-2.5 border border-[#27272a] text-center">
          <p className="text-[10px] text-zinc-600">Removes background using AI segmentation model</p>
        </div>
        <div className="mt-2.5 flex items-center justify-between px-1">
          <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-600">Model</span>
          <span className="text-[10px] text-zinc-400">rembg v2</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-rose-400" />
    </div>
  );
});
BackgroundRemoveNode.displayName = 'BackgroundRemoveNode';
