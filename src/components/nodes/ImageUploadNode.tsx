import { Handle, Position } from '@xyflow/react';
import { Upload, FileImage, Loader2, ImagePlus, Library } from 'lucide-react';
import { memo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import AssetPickerDialog from '../AssetPickerDialog';

export const ImageUploadNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore(s => s.updateNodeData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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
    <div className="w-[240px] node-card hover:!border-blue-500/40">
      {/* Header */}
      <div className="node-card-header">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15 text-blue-400">
            <FileImage size={13} />
          </div>
          <div>
            <h3>Image Upload</h3>
            <span className="subtitle">Input</span>
          </div>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="h-6 w-6 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--t-textDim)' }}
          title="Pick from Assets"
        >
          <Library size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="node-card-body">
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          className={clsx(
            'relative flex flex-col items-center justify-center rounded-lg border border-dashed transition-all cursor-pointer overflow-hidden',
            data.imageUrl
              ? 'border-transparent h-auto'
              : 'hover:border-blue-500/30 h-28',
            uploading && 'opacity-60 pointer-events-none'
          )}
          style={{ borderColor: data.imageUrl ? 'transparent' : 'var(--t-border)' }}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="animate-spin text-blue-400" size={16} />
              <p className="text-[10px] font-medium" style={{ color: 'var(--t-textDim)' }}>Uploading…</p>
            </div>
          ) : data.imageUrl ? (
            <img src={data.imageUrl} alt="Source" className="w-full rounded-md object-cover max-h-[140px]" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImagePlus size={16} style={{ color: 'var(--t-textDim)' }} />
              <p className="text-[10px] font-medium" style={{ color: 'var(--t-textDim)' }}>Click to upload</p>
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={handleFile} />
        </div>
      </div>

      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-[10px] !w-[10px] !rounded-full !border-2 !bg-blue-400"
        style={{ borderColor: 'var(--t-bg1)' }} />

      <AssetPickerDialog
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => updateNodeData(id, { imageUrl: url })}
      />
    </div>
  );
});
ImageUploadNode.displayName = 'ImageUploadNode';
