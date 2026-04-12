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
import NodePicker, { NodeDefinition } from './NodePicker';
import { Play, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const nodeTypes = {
  imageUpload:  ImageUploadNode,
  aiRelight:    AIRelightNode,
  outputNode:   OutputNode,
  resize:       ResizeNode,
  colorAdjust:  ColorAdjustNode,
  blur:         BlurNode,
  bgRemove:     BackgroundRemoveNode,
  upscale:      UpscaleNode,
  textOverlay:  TextOverlayNode,
  sharpen:      SharpenNode,
  crop:         CropNode,
  grayscale:    GrayscaleNode,
};

export default function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, updateNodeData } = useStore();
  const [isExecuting, setIsExecuting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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
      if (!jobId) { setIsExecuting(false); return; }
      toast('Workflow queued…', { icon: '⚡' });

      const es = api.streamJob(jobId);
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
    <div className="h-full w-full bg-[#09090b] relative">
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
        defaultEdgeOptions={{
          style: { strokeWidth: 2, stroke: '#7c3aed' },
          animated: true,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={0.8} color="#27272a" />
        <Controls />

        <Panel position="top-right" className="m-4 flex gap-2">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className={`h-9 flex items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium border transition-all duration-150 ${
              pickerOpen
                ? 'bg-[#18181b] text-white border-violet-500/40 shadow-lg shadow-black/30'
                : 'bg-[#0f0f12] text-zinc-400 border-[#27272a] hover:text-zinc-200 hover:border-[#3f3f46]'
            }`}
          >
            <Plus size={14} className={`transition-transform duration-200 ${pickerOpen ? 'rotate-45' : ''}`} />
            Add Node
          </button>
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="h-9 flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 text-[13px] font-semibold text-white shadow-lg shadow-violet-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
