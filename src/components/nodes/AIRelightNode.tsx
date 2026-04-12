import { Handle, Position } from '@xyflow/react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { memo, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';

const PRESETS = [
  { id: 'neon-cyberpunk',   label: 'Neon Cyberpunk' },
  { id: 'studio-ghibli',    label: 'Studio Ghibli' },
  { id: 'oil-painting',     label: 'Oil Painting' },
  { id: 'watercolor',       label: 'Watercolor' },
  { id: 'pixel-art',        label: 'Pixel Art' },
  { id: 'dark-fantasy',     label: 'Dark Fantasy' },
  { id: 'vaporwave',        label: 'Vaporwave' },
  { id: 'cinematic',        label: 'Cinematic' },
  { id: 'comic-book',       label: 'Comic Book' },
  { id: 'photorealistic',   label: 'Photorealistic' },
  { id: 'art-deco',         label: 'Art Deco' },
  { id: 'ukiyo-e',          label: 'Ukiyo-e' },
  { id: 'synthwave',        label: 'Synthwave' },
  { id: 'low-poly',         label: 'Low Poly' },
  { id: 'pencil-sketch',    label: 'Pencil Sketch' },
  { id: 'steampunk',        label: 'Steampunk' },
  { id: 'pop-art',          label: 'Pop Art' },
  { id: 'isometric',        label: 'Isometric' },
  { id: 'noir',             label: 'Film Noir' },
  { id: 'impressionist',    label: 'Impressionist' },
];

export const AIRelightNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore(s => s.updateNodeData);
  const [open, setOpen] = useState(false);
  const current = data.preset || 'neon-cyberpunk';
  const currentLabel = PRESETS.find(p => p.id === current)?.label || 'Neon Cyberpunk';

  return (
    <div className="w-[240px] rounded-xl border border-[#27272a] bg-[#0f0f12] shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-visible transition-all duration-200 hover:border-violet-500/40">
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-[10px] !w-[10px] !rounded-full !border-2 !border-[#0f0f12] !bg-violet-400" />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[#1c1c20]">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/15 text-violet-400">
          <Sparkles size={13} />
        </div>
        <div>
          <h3 className="text-[12px] font-semibold text-zinc-200 leading-none">AI Relight</h3>
          <span className="text-[10px] text-zinc-600">NVIDIA SDXL</span>
        </div>
      </div>

      {/* Dropdown */}
      <div className="p-3">
        <label className="block text-[10px] text-zinc-600 font-medium mb-1.5 uppercase tracking-wider">Style</label>
        <div className="relative">
          <button onClick={() => setOpen(!open)}
            className="flex w-full items-center justify-between rounded-md bg-[#18181b] px-2.5 py-2 text-[12px] text-zinc-300 border border-[#27272a] hover:border-violet-500/40 transition-colors">
            <span className="font-medium">{currentLabel}</span>
            <ChevronDown size={12} className={clsx('text-zinc-500 transition-transform duration-200', open && 'rotate-180')} />
          </button>

          {open && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-44 overflow-y-auto rounded-lg border border-[#27272a] bg-[#0f0f12] shadow-[0_8px_32px_rgba(0,0,0,0.7)] scrollbar-styled">
              {PRESETS.map(p => (
                <button key={p.id}
                  onClick={() => { updateNodeData(id, { preset: p.id }); setOpen(false); }}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-[12px] transition-colors',
                    p.id === current
                      ? 'bg-violet-500/10 text-violet-300 font-medium'
                      : 'text-zinc-500 hover:bg-[#18181b] hover:text-zinc-300'
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1c1c20]">
          <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Status</span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400">
            <span className="h-[5px] w-[5px] rounded-full bg-amber-400"></span>
            Ready
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-[10px] !w-[10px] !rounded-full !border-2 !border-[#0f0f12] !bg-violet-400" />
    </div>
  );
});
AIRelightNode.displayName = 'AIRelightNode';
