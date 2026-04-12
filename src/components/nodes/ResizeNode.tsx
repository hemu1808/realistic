import { Handle, Position } from '@xyflow/react';
import { Maximize, Settings2 } from 'lucide-react';
import { memo, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';

export const ResizeNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const width = data.width || 512;
  const height = data.height || 512;

  return (
    <div className="w-56 rounded-xl border border-[#27272a] bg-[#0f0f12] text-zinc-300 shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden  transition-all duration-200 hover:border-cyan-500/50 hover:shadow-cyan-500/10">
      <Handle type="target" position={Position.Left} className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-blue-400" />
      <div className="flex items-center gap-2 bg-[#0f0f12] px-3 py-2 border-b border-[#27272a] rounded-t-xl">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400"><Maximize size={14} /></div>
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold tracking-wide text-zinc-200">Resize</h3>
          <span className="text-[9px] text-zinc-600">Transform</span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div>
          <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-600 mb-1">Width</label>
          <input type="number" value={width} onChange={e => updateNodeData(id, { width: +e.target.value })}
            className="w-full rounded-md bg-[#18181b] px-2 py-1 text-[11px] text-zinc-300 border border-[#27272a] outline-none focus:border-cyan-500/50" />
        </div>
        <div>
          <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-600 mb-1">Height</label>
          <input type="number" value={height} onChange={e => updateNodeData(id, { height: +e.target.value })}
            className="w-full rounded-md bg-[#18181b] px-2 py-1 text-[11px] text-zinc-300 border border-[#27272a] outline-none focus:border-cyan-500/50" />
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-cyan-400" />
    </div>
  );
});
ResizeNode.displayName = 'ResizeNode';
