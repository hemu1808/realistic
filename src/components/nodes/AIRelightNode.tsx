import { Handle, Position } from '@xyflow/react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { memo, useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';
import NodeHeader from './NodeHeader';

const PRESETS = [
  { id: 'neon-cyberpunk',   label: 'Neon Cyberpunk' },
  { id: 'night-vision',     label: 'Night Vision' },
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
  const dropRef = useRef<HTMLDivElement>(null);
  const current = data.preset || 'neon-cyberpunk';
  const currentLabel = PRESETS.find(p => p.id === current)?.label || 'Neon Cyberpunk';

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as HTMLElement)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="w-[240px] node-card overflow-visible hover:!border-violet-500/40">
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-[10px] !w-[10px] !rounded-full !border-2 !bg-violet-400"
        style={{ borderColor: 'var(--t-bg1)' }} />

      <NodeHeader
        id={id}
        icon={<Sparkles size={13} />}
        label="AI Relight"
        subtitle="NVIDIA SDXL"
        colorClass="bg-violet-500/15 text-violet-400"
      />

      <div className="node-card-body nowheel !overflow-visible" ref={dropRef}>
        <label className="node-label">Style</label>
        <div className="relative">
          <button onClick={() => setOpen(!open)}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[12px] transition-colors"
            style={{
              background: 'var(--t-bg2)',
              color: 'var(--t-text)',
              border: '1px solid var(--t-border)',
            }}
          >
            <span className="font-medium text-left truncate pr-2">{currentLabel}</span>
            <ChevronDown size={12} className={clsx('flex-shrink-0 transition-transform duration-200', open && 'rotate-180')} style={{ color: 'var(--t-textDim)' }} />
          </button>

          {open && (
            <div
              className="absolute left-0 right-0 top-full mt-2 z-[9999] max-h-56 overflow-y-auto rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] scrollbar-styled nowheel border border-[#ffffff08] backdrop-blur-xl"
              style={{ background: 'color-mix(in srgb, var(--t-bg1) 85%, transparent)' }}
              onWheelCapture={(e) => e.stopPropagation()}
            >
              <div className="p-1.5 flex flex-col gap-0.5">
                {PRESETS.map(p => (
                  <button key={p.id}
                    onClick={() => { updateNodeData(id, { preset: p.id }); setOpen(false); }}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-[12px] transition-all rounded-md',
                      p.id === current ? 'bg-violet-500/20 text-violet-300 font-semibold' : 'text-zinc-400 hover:bg-[#ffffff0a] hover:text-zinc-200'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: '1px solid var(--t-borderSubtle)' }}>
          <span className="node-label !mb-0">Status</span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400">
            <span className="h-[5px] w-[5px] rounded-full bg-amber-400"></span>
            Ready
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-[10px] !w-[10px] !rounded-full !border-2 !bg-violet-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
    </div>
  );
});
AIRelightNode.displayName = 'AIRelightNode';
