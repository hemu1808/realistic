import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';

export type AppNode = Node;

type AppState = {
  nodes: AppNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodeData: (nodeId: string, data: any) => void;
};

const initialNodes: AppNode[] = [
  {
    id: 'upload-1',
    type: 'imageUpload',
    position: { x: 50, y: 180 },
    data: { label: 'Upload Image' },
  },
  {
    id: 'processor-1',
    type: 'aiRelight',
    position: { x: 400, y: 180 },
    data: { label: 'AI Relight', preset: 'neon-cyberpunk' },
  },
  {
    id: 'output-1',
    type: 'outputNode',
    position: { x: 750, y: 180 },
    data: { label: 'Output Result', imageUrl: null },
  },
];

// Pre-connect the default nodes so the workflow works on first run
const initialEdges: Edge[] = [
  { id: 'e-upload-processor', source: 'upload-1', target: 'processor-1' },
  { id: 'e-processor-output', source: 'processor-1', target: 'output-1' },
];

export const useStore = create<AppState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange: (changes: NodeChange<AppNode>[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  setNodes: (nodes: AppNode[]) => {
    set({ nodes });
  },
  setEdges: (edges: Edge[]) => {
    set({ edges });
  },
  updateNodeData: (nodeId: string, data: any) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    });
  },
}));
