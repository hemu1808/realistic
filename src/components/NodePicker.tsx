'use client';

import { useState, useMemo } from 'react';
import { X, Search, FileImage, Sparkles, Maximize, Sun, Droplets, Eraser, ArrowUpCircle, Type, Image as ImageIcon, Crop, Palette, Contrast } from 'lucide-react';
import clsx from 'clsx';

export type NodeDefinition = {
  type: string;
  label: string;
  description: string;
  category: 'trigger' | 'ai' | 'transform' | 'filter' | 'output';
  icon: React.ReactNode;
  color: string;
  defaultData: Record<string, any>;
};

const NODE_CATALOG: NodeDefinition[] = [
  { type: 'imageUpload', label: 'Image Upload', description: 'Upload source images',            category: 'trigger',   icon: <FileImage size={15} />,     color: 'blue',    defaultData: { label: 'Upload Image' } },
  { type: 'aiRelight',   label: 'AI Relight',   description: 'Style transfer via NVIDIA SDXL',  category: 'ai',        icon: <Sparkles size={15} />,      color: 'violet',  defaultData: { label: 'AI Relight', preset: 'neon-cyberpunk' } },
  { type: 'bgRemove',    label: 'BG Remove',    description: 'AI background removal',           category: 'ai',        icon: <Eraser size={15} />,        color: 'rose',    defaultData: { label: 'Background Remove' } },
  { type: 'upscale',     label: 'Upscale',      description: 'Super-resolution 2x/4x/8x',      category: 'ai',        icon: <ArrowUpCircle size={15} />, color: 'teal',    defaultData: { label: 'Upscale', scale: 2 } },
  { type: 'resize',      label: 'Resize',       description: 'Custom dimensions',               category: 'transform', icon: <Maximize size={15} />,      color: 'cyan',    defaultData: { label: 'Resize', width: 512, height: 512 } },
  { type: 'colorAdjust', label: 'Color Adjust', description: 'Brightness / contrast / saturation', category: 'transform', icon: <Sun size={15} />,        color: 'amber',   defaultData: { label: 'Color Adjust', brightness: 100, contrast: 100, saturation: 100 } },
  { type: 'textOverlay', label: 'Text Overlay', description: 'Add text to images',              category: 'transform', icon: <Type size={15} />,          color: 'orange',  defaultData: { label: 'Text Overlay', text: '', fontSize: 24 } },
  { type: 'crop',        label: 'Crop',         description: 'Aspect ratio crop',               category: 'transform', icon: <Crop size={15} />,          color: 'lime',    defaultData: { label: 'Crop', ratio: '1:1' } },
  { type: 'blur',        label: 'Blur',         description: 'Gaussian / Motion / Radial',      category: 'filter',    icon: <Droplets size={15} />,      color: 'indigo',  defaultData: { label: 'Blur', blurType: 'Gaussian', radius: 4 } },
  { type: 'sharpen',     label: 'Sharpen',      description: 'Enhance edges & details',         category: 'filter',    icon: <Contrast size={15} />,      color: 'sky',     defaultData: { label: 'Sharpen', amount: 50 } },
  { type: 'grayscale',   label: 'Color Mode',   description: 'Grayscale / Sepia / Invert',      category: 'filter',    icon: <Palette size={15} />,       color: 'zinc',    defaultData: { label: 'Color Mode', mode: 'Grayscale' } },
  { type: 'outputNode',  label: 'Output',       description: 'Final result & download',         category: 'output',    icon: <ImageIcon size={15} />,     color: 'emerald', defaultData: { label: 'Output Result', imageUrl: null } },
];

const CATEGORIES = [
  { id: 'all',       label: 'All' },
  { id: 'trigger',   label: 'Input' },
  { id: 'ai',        label: 'AI' },
  { id: 'transform', label: 'Transform' },
  { id: 'filter',    label: 'Filter' },
  { id: 'output',    label: 'Output' },
];

const COLOR: Record<string, string> = {
  blue:    'bg-blue-500/15 text-blue-400',
  violet:  'bg-violet-500/15 text-violet-400',
  rose:    'bg-rose-500/15 text-rose-400',
  teal:    'bg-teal-500/15 text-teal-400',
  cyan:    'bg-cyan-500/15 text-cyan-400',
  amber:   'bg-amber-500/15 text-amber-400',
  orange:  'bg-orange-500/15 text-orange-400',
  indigo:  'bg-indigo-500/15 text-indigo-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  sky:     'bg-sky-500/15 text-sky-400',
  lime:    'bg-lime-500/15 text-lime-400',
  zinc:    'bg-zinc-500/15 text-zinc-400',
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (def: NodeDefinition) => void;
};

export default function NodePicker({ isOpen, onClose, onAddNode }: Props) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');

  const filtered = useMemo(() =>
    NODE_CATALOG.filter(n =>
      (cat === 'all' || n.category === cat) &&
      (!search || n.label.toLowerCase().includes(search.toLowerCase()) || n.description.toLowerCase().includes(search.toLowerCase()))
    ), [search, cat]);

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-[#0c0c0f] border-l border-[#1c1c20] z-50 flex flex-col shadow-[-8px_0_32px_rgba(0,0,0,0.5)] animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1c1c20]">
        <div>
          <h3 className="text-[14px] font-semibold text-white">Nodes</h3>
          <p className="text-[11px] text-zinc-600 mt-0.5">{filtered.length} available</p>
        </div>
        <button onClick={onClose} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-[#18181b] text-zinc-500 hover:text-zinc-300 transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-[#1c1c20]">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full rounded-lg bg-[#18181b] pl-8 pr-3 py-2 text-[12px] text-zinc-300 border border-[#27272a] outline-none focus:border-violet-500/50 placeholder:text-zinc-600 transition-colors"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-3 py-2 border-b border-[#1c1c20] flex gap-1 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            className={clsx(
              'flex-shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-all whitespace-nowrap',
              cat === c.id ? 'bg-violet-500/15 text-violet-300' : 'text-zinc-600 hover:text-zinc-400 hover:bg-[#18181b]'
            )}>
            {c.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-styled">
        {filtered.map(n => (
          <button key={n.type} onClick={() => { onAddNode(n); onClose(); }}
            className="w-full flex items-center gap-3 rounded-lg p-2.5 text-left hover:bg-[#18181b] transition-all group">
            <div className={clsx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110', COLOR[n.color])}>
              {n.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-zinc-300 group-hover:text-white leading-none">{n.label}</p>
              <p className="text-[10px] text-zinc-600 mt-1 leading-tight">{n.description}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-10 gap-2">
            <p className="text-[12px] text-zinc-600">No matches</p>
            <button onClick={() => { setSearch(''); setCat('all'); }} className="text-[11px] text-violet-400 hover:text-violet-300">Clear</button>
          </div>
        )}
      </div>
    </div>
  );
}
