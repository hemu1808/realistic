import { Handle, Position } from '@xyflow/react';
import { Image as ImageIcon, CheckCircle2, Download, Wand2 } from 'lucide-react';
import { memo } from 'react';
import clsx from 'clsx';

export const OutputNode = memo(({ data }: any) => {
  return (
    <div className={clsx(
      'w-[260px] rounded-xl border bg-[#0f0f12] shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-200',
      data.imageUrl ? 'border-emerald-500/30' : 'border-[#27272a] hover:border-emerald-500/25'
    )}>
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-[10px] !w-[10px] !rounded-full !border-2 !border-[#0f0f12] !bg-violet-400" />

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#1c1c20]">
        <div className="flex items-center gap-2.5">
          <div className={clsx(
            'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
            data.imageUrl ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-500/10 text-zinc-600'
          )}>
            <ImageIcon size={13} />
          </div>
          <div>
            <h3 className="text-[12px] font-semibold text-zinc-200 leading-none">Output</h3>
            <span className="text-[10px] text-zinc-600">Result</span>
          </div>
        </div>
        {data.imageUrl && <CheckCircle2 size={13} className="text-emerald-400" />}
      </div>

      {/* Content */}
      <div className="p-3">
        {data.imageUrl ? (
          <div className="relative group rounded-lg overflow-hidden border border-[#27272a]">
            <img src={data.imageUrl} alt="Result" className="w-full object-contain" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <a href={data.imageUrl} download
                className="flex items-center gap-1.5 rounded-md bg-white/10 border border-white/20 backdrop-blur px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/20 transition-colors">
                <Download size={11} /> Download
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-36 rounded-lg border border-dashed border-[#27272a] bg-[#09090b] gap-2.5">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-[#18181b] flex items-center justify-center">
                <Wand2 size={16} className="text-zinc-600" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 border-2 border-[#09090b]"></span>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-medium text-zinc-500">Awaiting result</p>
              <p className="text-[10px] text-zinc-700 mt-0.5">Click <span className="text-violet-400/80">Run</span> to process</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
OutputNode.displayName = 'OutputNode';
