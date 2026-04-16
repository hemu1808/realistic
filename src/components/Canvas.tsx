'use client';

import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  BackgroundVariant,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { ImageUploadNode } from './nodes/ImageUploadNode';
import { AIRelightNode } from './nodes/AIRelightNode';
import { OutputNode } from './nodes/OutputNode';
import { ResizeNode } from './nodes/ResizeNode';
import { ColorAdjustNode } from './nodes/ColorAdjustNode';
import { BlurNode } from './nodes/BlurNode';
import { BackgroundRemoveNode } from './nodes/BackgroundRemoveNode';
import { UpscaleNode } from './nodes/UpscaleNode';
import { TextOverlayNode } from './nodes/TextOverlayNode';
import { SharpenNode } from './nodes/SharpenNode';
import { CropNode } from './nodes/CropNode';
import { GrayscaleNode } from './nodes/GrayscaleNode';
import { AutoAdjustNode } from './nodes/AutoAdjustNode';
import { DayNightNode } from './nodes/DayNightNode';
import { DenoiseNode } from './nodes/DenoiseNode';
import { DetailEnhanceNode } from './nodes/DetailEnhanceNode';
import { ColorGradingNode } from './nodes/ColorGradingNode';
import NodePicker, { NodeDefinition } from './NodePicker';
import { Play, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useThemeStore, THEMES } from '@/store/useThemeStore';

const nodeTypes = {
  imageUpload: ImageUploadNode,
  aiRelight: AIRelightNode,
  autoAdjustNode: AutoAdjustNode,
  dayNightNode: DayNightNode,
  denoiseNode: DenoiseNode,
  detailEnhanceNode: DetailEnhanceNode,
  colorGradingNode: ColorGradingNode,
  outputNode: OutputNode,
  resize: ResizeNode,
  colorAdjust: ColorAdjustNode,
  blur: BlurNode,
  bgRemove: BackgroundRemoveNode,
  upscale: UpscaleNode,
  textOverlay: TextOverlayNode,
  sharpen: SharpenNode,
  crop: CropNode,
  grayscale: GrayscaleNode,
};

export default function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, updateNodeData, deleteNode } = useStore();
  const [isExecuting, setIsExecuting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const themeId = useThemeStore(s => s.themeId);
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  
  const selectedNodes = nodes.filter(n => n.selected);

  const handleAddNode = useCallback((def: NodeDefinition) => {
    const id = `${def.type}-${Date.now()}`;
    const newNode = {
      id,
      type: def.type,
      position: { x: 200 + Math.random() * 300, y: 100 + Math.random() * 300 },
      data: { ...def.defaultData },
    };
    useStore.getState().setNodes([...useStore.getState().nodes, newNode as any]);
    toast.success(`Added ${def.label}`);
  }, []);

  const handleExecute = useCallback(async () => {
    setIsExecuting(true);
    const outputNodes = nodes.filter(n => n.type === 'outputNode');
    outputNodes.forEach(n => updateNodeData(n.id, { imageUrl: null }));

    try {
      const { ok, data } = await api.executeWorkflow({ nodes, edges });
      if (!ok) { toast.error(data.detail || 'Execution error'); setIsExecuting(false); return; }

      const jobId = data.job_id;
      const streamToken = data.stream_token;
      if (!jobId || !streamToken) { setIsExecuting(false); return; }
      toast('Workflow queued…', { icon: '⚡' });

      const es = api.streamJob(jobId, streamToken);
      es.onmessage = (ev) => {
        const d = JSON.parse(ev.data);
        if (d.status === 'completed') {
          outputNodes.forEach(n => updateNodeData(n.id, { imageUrl: d.result_image_url }));
          setIsExecuting(false);
          es.close();
          toast.success(`Done in ${d.duration_seconds || '?'}s`);
        } else if (d.status === 'failed') {
          toast.error('Workflow failed');
          setIsExecuting(false);
          es.close();
        }
      };
      es.onerror = () => { es.close(); setIsExecuting(false); toast.error('Connection lost'); };
    } catch {
      toast.error('Network error');
      setIsExecuting(false);
    }
  }, [nodes, edges, updateNodeData]);

  return (
    <div className="h-full w-full relative" style={{ background: 'var(--t-bg0)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          style: { strokeWidth: 2, stroke: theme.colors.accent },
          animated: true,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={0.8} color={theme.colors.canvasDots} />
        <Controls position="bottom-right" style={{ margin: '1rem', border: `1px solid ${theme.colors.border}`, background: theme.colors.bg1, borderRadius: 10, boxShadow: '0 4px 32px rgba(0,0,0,0.5)' }} />

        <Panel position="top-right" className="m-4 flex gap-2">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="h-9 flex items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-all duration-150"
            style={{
              background: pickerOpen ? 'var(--t-bg2)' : 'var(--t-bg1)',
              color: pickerOpen ? 'var(--t-text)' : 'var(--t-textMuted)',
              border: pickerOpen ? `1px solid color-mix(in srgb, var(--t-accent) 40%, transparent)` : '1px solid var(--t-border)',
              boxShadow: pickerOpen ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            <Plus size={14} className={`transition-transform duration-200 ${pickerOpen ? 'rotate-45' : ''}`} />
            Add Node
          </button>
          
          {selectedNodes.length > 0 && (
            <button
              onClick={() => {
                selectedNodes.forEach(n => deleteNode(n.id));
                toast.success('Node deleted');
              }}
              className="h-9 flex items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 transition-colors"
            >
              <Trash2 size={14} />
              Delete Selection
            </button>
          )}

          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="h-9 flex items-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--t-accent)',
              boxShadow: `0 4px 16px color-mix(in srgb, var(--t-accent) 30%, transparent)`,
            }}
          >
            {isExecuting
              ? <Loader2 size={14} className="animate-spin" />
              : <Play size={13} className="fill-white" />}
            {isExecuting ? 'Running…' : 'Run'}
          </button>
        </Panel>
      </ReactFlow>

      <NodePicker isOpen={pickerOpen} onClose={() => setPickerOpen(false)} onAddNode={handleAddNode} />
    </div>
  );
}
