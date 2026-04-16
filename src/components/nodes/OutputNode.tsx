import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, Download, Image as ImageIcon } from 'lucide-react';
import { memo } from 'react';
import NodeHeader from './NodeHeader';

export const OutputNode = memo(({ id, data }: any) => {
  return (
    <div className="w-[300px] node-card hover:!border-emerald-500/40">
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-[10px] !w-[10px] !rounded-full !border-2 !bg-emerald-400"
        style={{ borderColor: 'var(--t-bg1)' }} />

      <NodeHeader
        id={id}
        icon={<CheckCircle2 size={13} />}
        label="Output"
        subtitle="Result"
        colorClass="bg-emerald-500/15 text-emerald-400"
      />

      <div className="p-4">
        <div
          className="relative aspect-video w-full rounded-lg flex items-center justify-center overflow-hidden"
          style={{ background: 'var(--t-bg0)', border: '1px solid var(--t-border)' }}
        >
          {data.imageUrl ? (
            <div className="group relative h-full w-full">
              <img src={data.imageUrl} alt="Output" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a
                  href={data.imageUrl}
                  download
                  onClick={e => e.stopPropagation()}
                  className="h-8 px-3 rounded-lg bg-emerald-600 text-[11px] font-bold text-white shadow-lg flex items-center gap-1.5 hover:bg-emerald-500 transition-colors"
                >
                  <Download size={12} /> Download
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5 opacity-40">
              <ImageIcon size={24} style={{ color: 'var(--t-textDim)' }} />
              <p className="text-[11px] font-medium" style={{ color: 'var(--t-textDim)' }}>Awaiting result…</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end px-4 py-2" style={{ background: 'color-mix(in srgb, var(--t-bg2) 30%, transparent)', borderTop: '1px solid var(--t-borderSubtle)' }}>
        <div className="flex items-center gap-1.5 pr-2">
            <span className={`h-1.5 w-1.5 rounded-full ${data.imageUrl ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : ''}`} style={!data.imageUrl ? { background: 'var(--t-textDim)' } : undefined}></span>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t-textDim)' }}>{data.imageUrl ? 'Completed' : 'Idle'}</span>
        </div>
      </div>
    </div>
  );
});
OutputNode.displayName = 'OutputNode';
