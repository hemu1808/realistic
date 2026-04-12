import { Handle, Position } from '@xyflow/react';
import { Type } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const TextOverlayNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const text = data.text || '';
  const fontSize = data.fontSize || 24;

  return (
    <div className="w-56 rounded-xl border border-[#27272a] bg-[#0f0f12] text-zinc-300 shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden  transition-all duration-200 hover:border-orange-500/50 hover:shadow-orange-500/10">
      <Handle type="target" position={Position.Left} className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-blue-400" />
      <div className="flex items-center gap-2 bg-[#0f0f12] px-3 py-2 border-b border-[#27272a] rounded-t-xl">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500/20 text-orange-400"><Type size={14} /></div>
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold tracking-wide text-zinc-200">Text Overlay</h3>
          <span className="text-[9px] text-zinc-600">Transform</span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div>
          <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-600 mb-1">Text</label>
          <input type="text" value={text} placeholder="Enter text..." onChange={e => updateNodeData(id, { text: e.target.value })}
            className="w-full rounded-md bg-[#18181b] px-2 py-1.5 text-[11px] text-zinc-300 border border-[#27272a] outline-none focus:border-orange-500/50 placeholder:text-zinc-600" />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-[9px] uppercase font-bold tracking-wider text-zinc-600">Font Size</label>
            <span className="text-[9px] text-zinc-400">{fontSize}px</span>
          </div>
          <input type="range" min={8} max={72} value={fontSize}
            onChange={e => updateNodeData(id, { fontSize: +e.target.value })}
            className="w-full h-1 rounded-full appearance-none bg-[#27272a] accent-orange-400 cursor-pointer" />
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !border-[#0f0f12] !bg-orange-400" />
    </div>
  );
});
TextOverlayNode.displayName = 'TextOverlayNode';
