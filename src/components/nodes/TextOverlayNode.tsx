import { Handle, Position } from '@xyflow/react';
import { Type } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/store/useStore';

export const TextOverlayNode = memo(({ id, data }: any) => {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const text = data.text || '';
  const fontSize = data.fontSize || 24;

  return (
    <div className="w-56 node-card hover:!border-orange-500/40">
      <Handle type="target" position={Position.Left}
        className="!left-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-blue-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
      <div className="node-card-header">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500/20 text-orange-400"><Type size={14} /></div>
        <div className="flex flex-col">
          <h3>Text Overlay</h3>
          <span className="subtitle">Transform</span>
        </div>
      </div>
      <div className="node-card-body space-y-2">
        <div>
          <label className="node-label">Text</label>
          <input type="text" value={text} placeholder="Enter text..." onChange={e => updateNodeData(id, { text: e.target.value })}
            className="node-input" />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="node-label !mb-0">Font Size</label>
            <span className="text-[9px]" style={{ color: 'var(--t-textMuted)' }}>{fontSize}px</span>
          </div>
          <input type="range" min={8} max={72} value={fontSize}
            onChange={e => updateNodeData(id, { fontSize: +e.target.value })} />
        </div>
      </div>
      <Handle type="source" position={Position.Right}
        className="!right-[-5px] !h-3 !w-3 !rounded-full !border-[2px] !bg-orange-400"
        style={{ borderColor: 'var(--t-bg1)' }} />
    </div>
  );
});
TextOverlayNode.displayName = 'TextOverlayNode';
