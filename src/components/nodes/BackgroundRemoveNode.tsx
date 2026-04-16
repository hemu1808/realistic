import { Handle, Position } from '@xyflow/react';
import { Eraser } from 'lucide-react';
import { memo } from 'react';

export const BackgroundRemoveNode = memo(({ data }: any) => {
  return (
    <div className="w-56 node-card hover:!border-rose-500/40">
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-blue-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/20 text-rose-400"><Eraser size={14} /></div>
        <div className="flex flex-col">
          <h3>BG Remove</h3>
          <span className="subtitle">AI Model</span>
        </div>
      </div>
      <div className="node-card-body">
        <div className="rounded-lg p-2.5 text-center" style={{ background: 'var(--t-bg0)', border: '1px solid var(--t-border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--t-textDim)' }}>Removes background using AI segmentation model</p>
        </div>
        <div className="mt-2.5 flex items-center justify-between px-1">
          <span className="node-label !mb-0">Model</span>
          <span className="text-[10px]" style={{ color: 'var(--t-textMuted)' }}>rembg v2</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-rose-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
    </div>
  );
});
BackgroundRemoveNode.displayName = 'BackgroundRemoveNode';
