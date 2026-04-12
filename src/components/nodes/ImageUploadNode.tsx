import { Handle, Position } from '@xyflow/react';
import { Upload, FileImage, Loader2, ImagePlus } from 'lucide-react';
import { memo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';

export const ImageUploadNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore(s => s.updateNodeData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.upload(fd);
      if (res.url) updateNodeData(id, { imageUrl: res.url });
    } catch { /* silently fail */ }
    finally { setUploading(false); }
  };

  return (
    <div className="w-[240px] rounded-xl border border-[#27272a] bg-[#0f0f12] shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-200 hover:border-blue-500/40">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[#1c1c20]">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15 text-blue-400">
          <FileImage size={13} />
        </div>
        <div>
          <h3 className="text-[12px] font-semibold text-zinc-200 leading-none">Image Upload</h3>
          <span className="text-[10px] text-zinc-600">Input</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          className={clsx(
            'relative flex flex-col items-center justify-center rounded-lg border border-dashed transition-all cursor-pointer overflow-hidden',
            data.imageUrl
              ? 'border-transparent h-auto'
              : 'border-[#27272a] hover:border-blue-500/30 hover:bg-blue-500/5 h-28',
            uploading && 'opacity-60 pointer-events-none'
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="animate-spin text-blue-400" size={16} />
              <p className="text-[10px] text-zinc-500 font-medium">Uploading…</p>
            </div>
          ) : data.imageUrl ? (
            <img src={data.imageUrl} alt="Source" className="w-full rounded-md object-cover max-h-[140px]" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImagePlus size={16} className="text-zinc-600" />
              <p className="text-[10px] text-zinc-500 font-medium">Click to upload</p>
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={handleFile} />
        </div>
      </div>

      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-[10px] !w-[10px] !rounded-full !border-2 !border-[#0f0f12] !bg-blue-400" />
    </div>
  );
});
ImageUploadNode.displayName = 'ImageUploadNode';
