import { X, Play, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type Props = {
  id: string;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  colorClass?: string;
  onRun?: () => void;
};

export default function NodeHeader({ id, icon, label, subtitle, colorClass = 'bg-zinc-500', onRun }: Props) {
  const deleteNode = useStore(s => s.deleteNode);
  const nodes = useStore(s => s.nodes);
  const edges = useStore(s => s.edges);
  const [running, setRunning] = useState(false);

  const handleGlobalRun = async () => {
    setRunning(true);
    try {
      const { ok, data } = await api.executeWorkflow({ nodes, edges });
      if (!ok) {
        toast.error(data.detail || 'Execution error');
        return;
      }
      if (data.job_id) {
        toast.success(`Workflow started: ${data.job_id.slice(0, 8)}`);
      }
    } catch {
      toast.error('Failed to start workflow');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b group/header" style={{ borderColor: 'var(--t-borderSubtle)' }}>
      <div className="flex items-center gap-2.5">
        <div className={`flex h-6 w-6 items-center justify-center rounded-md ${colorClass} opacity-90`}>
          <div className="text-white">{icon}</div>
        </div>
        <div>
          <h3 className="text-[11px] font-bold leading-none tracking-tight" style={{ color: 'var(--t-text)' }}>{label}</h3>
          {subtitle && <span className="text-[9px] uppercase font-medium tracking-wider" style={{ color: 'var(--t-textDim)' }}>{subtitle}</span>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
        <button
          onClick={onRun || handleGlobalRun}
          disabled={running}
          className="h-6 w-6 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
          title="Run from here"
        >
          {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
        </button>
        <button
          onClick={() => deleteNode(id)}
          className="h-6 w-6 flex items-center justify-center rounded-md bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
          title="Delete node"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}
