'use client';

import Canvas from '@/components/Canvas';
import {
  Layers, Settings, Images, Zap, Globe, HardDrive,
  CheckCircle2, XCircle, Timer, RefreshCw, Upload,
  Loader2, Clock, Activity, ExternalLink, Copy,
  Palette, Check
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useThemeStore, applyThemeToDOM, THEMES, ThemeId } from '@/store/useThemeStore';

type View = 'workflows' | 'assets' | 'executions' | 'settings';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('workflows');
  const [backendStatus, setBackendStatus] = useState<any>(null);
  const themeId = useThemeStore(s => s.themeId);

  // Apply theme on mount
  useEffect(() => {
    applyThemeToDOM(themeId);
  }, [themeId]);

  useEffect(() => {
    api.health()
      .then(data => setBackendStatus(data))
      .catch(() => setBackendStatus(null));
  }, [activeView]);

  const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'workflows', label: 'Canvas', icon: <Layers size={15} strokeWidth={1.8} /> },
    { id: 'assets', label: 'Assets', icon: <Images size={15} strokeWidth={1.8} /> },
    { id: 'executions', label: 'History', icon: <Activity size={15} strokeWidth={1.8} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={15} strokeWidth={1.8} /> },
  ];

  return (
    <main className="flex h-screen w-screen flex-col text-zinc-300" style={{ fontFamily: "'Outfit', sans-serif", background: 'var(--t-bg0)' }}>
      {/* ═══ Header ═══ */}
      <header className="h-[52px] flex-shrink-0 flex items-center justify-between px-5 z-20" style={{ borderBottom: '1px solid var(--t-borderSubtle)', background: 'color-mix(in srgb, var(--t-bg0) 80%, var(--t-bg1))' }}>
        <div className="flex items-center gap-5">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center">
              <div className="absolute inset-0 rounded-lg" style={{ background: `linear-gradient(135deg, var(--t-accent), color-mix(in srgb, var(--t-accent) 70%, #4338ca))`, opacity: 0.9 }}></div>
              <div className="absolute inset-0 rounded-lg blur-md" style={{ background: `linear-gradient(135deg, var(--t-accent), color-mix(in srgb, var(--t-accent) 70%, #4338ca))`, opacity: 0.4 }}></div>
              <svg className="relative z-10" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--t-text)' }}>Realhistic</span>
          </div>

          <div className="h-5 w-px" style={{ background: 'var(--t-border)' }}></div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150"
                style={{
                  background: activeView === item.id ? 'var(--t-bg2)' : 'transparent',
                  color: activeView === item.id ? 'var(--t-text)' : 'var(--t-textDim)',
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full pl-2.5 pr-3 py-1" style={{ background: 'var(--t-bg2)' }}>
            <span className={`h-[6px] w-[6px] rounded-full ${backendStatus?.status === 'ok' ? 'bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/50' : 'bg-zinc-600'}`}></span>
            <span className="text-[11px] font-medium" style={{ color: 'var(--t-textDim)' }}>{backendStatus?.status === 'ok' ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
      </header>

      {/* ═══ Content ═══ */}
      <div className="flex-1 overflow-hidden relative">
        {activeView === 'workflows' && <Canvas />}
        {activeView === 'assets' && <AssetsView />}
        {activeView === 'executions' && <ExecutionsView />}
        {activeView === 'settings' && <SettingsView backendStatus={backendStatus} />}
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ASSETS VIEW
   ═══════════════════════════════════════════════════════════════ */
function AssetsView() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAssets = () => {
    setLoading(true);
    api.assets()
      .then(d => { setAssets(d.assets || []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { fetchAssets(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        await api.upload(fd);
      }
      toast.success(`Uploaded ${files.length} file(s)`);
      fetchAssets();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const fmtSize = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(0)}KB` : `${(b / 1048576).toFixed(1)}MB`;

  return (
    <div className="h-full overflow-y-auto scrollbar-styled" style={{ background: 'var(--t-bg0)' }}>
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-[85vh] max-w-[85vw] rounded-xl shadow-2xl object-contain animate-fade-in" />
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-8 py-8 animate-fade-in">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.03em]" style={{ color: 'var(--t-text)' }}>Assets</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--t-textDim)' }}>{assets.length} image{assets.length !== 1 ? 's' : ''} in your library</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchAssets} className="h-9 px-3 rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-all" style={{ border: '1px solid var(--t-border)', background: 'var(--t-bg2)', color: 'var(--t-textMuted)' }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-lg" style={{ background: 'var(--t-accent)' }}>
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-32"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--t-textDim)' }} /></div>
        ) : assets.length === 0 ? (
          <button onClick={() => fileRef.current?.click()} className="w-full py-28 rounded-2xl border-2 border-dashed transition-colors flex flex-col items-center gap-3 group cursor-pointer" style={{ borderColor: 'var(--t-border)' }}>
            <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-colors" style={{ background: 'var(--t-bg2)' }}>
              <Upload size={20} style={{ color: 'var(--t-textDim)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--t-textMuted)' }}>Drop images or click to upload</p>
              <p className="text-xs mt-1" style={{ color: 'var(--t-textDim)' }}>PNG, JPG, WEBP up to 20MB</p>
            </div>
          </button>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {assets.map((a: any, i: number) => (
              <div key={i} onClick={() => setLightbox(a.url)} className="group cursor-pointer rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30" style={{ border: '1px solid var(--t-borderSubtle)', background: 'var(--t-bg1)' }}>
                <div className="aspect-[4/3] relative overflow-hidden" style={{ background: 'var(--t-bg0)' }}>
                  <img src={a.url} alt={a.filename} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2.5">
                    <a href={a.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="h-7 px-2 rounded-md bg-white/10 backdrop-blur-md text-[10px] font-medium text-white flex items-center gap-1 hover:bg-white/20 transition-colors border border-white/10">
                      <ExternalLink size={10} />Open
                    </a>
                  </div>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[12px] font-medium truncate" style={{ color: 'var(--t-text)' }}>{a.filename.replace(/^[0-9a-f-]{36}_/, '')}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--t-textDim)' }}>{fmtSize(a.size_bytes)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   EXECUTIONS VIEW
   ═══════════════════════════════════════════════════════════════ */
function ExecutionsView() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = () => { setLoading(true); api.jobs().then(d => { setJobs(d.jobs || []); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { fetchJobs(); }, []);

  const ago = (iso: string) => {
    if (!iso) return '—';
    try {
      const s = Math.floor((Date.now() - new Date(iso + 'Z').getTime()) / 1000);
      if (s < 60) return `${s}s ago`;
      if (s < 3600) return `${Math.floor(s / 60)}m ago`;
      if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
      return `${Math.floor(s / 86400)}d ago`;
    } catch { return iso; }
  };

  const presetLabel = (id: string) => id ? id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') : '—';

  const ST: Record<string, { dot: string; text: string; label: string }> = {
    completed: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Done' },
    failed: { dot: 'bg-red-400', text: 'text-red-400', label: 'Failed' },
    processing: { dot: 'bg-blue-400 animate-pulse-soft', text: 'text-blue-400', label: 'Running' },
    pending: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Queued' },
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-styled" style={{ background: 'var(--t-bg0)' }}>
      <div className="max-w-[1100px] mx-auto px-8 py-8 animate-fade-in">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.03em]" style={{ color: 'var(--t-text)' }}>History</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--t-textDim)' }}>{jobs.length} execution{jobs.length !== 1 ? 's' : ''} recorded</p>
          </div>
          <button onClick={fetchJobs} className="h-9 px-3 rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-all" style={{ border: '1px solid var(--t-border)', background: 'var(--t-bg2)', color: 'var(--t-textMuted)' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-32"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--t-textDim)' }} /></div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center py-32 gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--t-bg2)' }}><Activity size={20} style={{ color: 'var(--t-textDim)' }} /></div>
            <p className="text-sm font-medium" style={{ color: 'var(--t-textMuted)' }}>No executions yet</p>
            <p className="text-xs" style={{ color: 'var(--t-textDim)' }}>Run a workflow on the Canvas tab to see results here</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--t-borderSubtle)' }}>
            <div className="grid grid-cols-[1fr_1.2fr_0.7fr_0.7fr_0.8fr] gap-4 px-5 py-3 border-b text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ background: 'var(--t-bg1)', borderColor: 'var(--t-borderSubtle)', color: 'var(--t-textDim)' }}>
              <span>Job ID</span><span>Preset</span><span>Status</span><span>Duration</span><span>Time</span>
            </div>
            {jobs.map((j: any) => {
              const st = ST[j.status] || ST.pending;
              return (
                <div key={j.id || j._id} className="grid grid-cols-[1fr_1.2fr_0.7fr_0.7fr_0.8fr] gap-4 px-5 py-3.5 border-b last:border-b-0 transition-colors text-[13px] group" style={{ borderColor: 'var(--t-borderSubtle)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-bg1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="font-mono text-[11px] truncate" style={{ color: 'var(--t-textDim)' }}>{(j.id || j._id || '').slice(0, 12)}</span>
                  <span className="font-medium" style={{ color: 'var(--t-text)' }}>{presetLabel(j.preset_id)}</span>
                  <span className={`flex items-center gap-2 ${st.text}`}>
                    <span className={`h-[6px] w-[6px] rounded-full ${st.dot}`}></span>
                    <span className="text-[12px] font-medium">{st.label}</span>
                  </span>
                  <span className="font-mono text-[12px]" style={{ color: 'var(--t-textDim)' }}>{j.duration_seconds != null ? `${j.duration_seconds}s` : '—'}</span>
                  <span className="text-[12px]" style={{ color: 'var(--t-textDim)' }}>{ago(j.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   SETTINGS VIEW
   ═══════════════════════════════════════════════════════════════ */
function SettingsView({ backendStatus }: { backendStatus: any }) {
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success('Copied'); };
  const { themeId, setTheme } = useThemeStore();

  const services = [
    { name: 'FastAPI Backend', status: backendStatus?.status === 'ok' ? 'connected' : 'offline' },
    { name: 'MongoDB', status: backendStatus?.mongodb?.includes('connected') ? 'connected' : 'fallback', detail: backendStatus?.mongodb },
    { name: 'Redis / ARQ', status: backendStatus?.redis?.includes('connected') ? 'connected' : 'fallback', detail: backendStatus?.redis },
    { name: 'NVIDIA AI', status: backendStatus?.nvidia?.includes('connected') ? 'connected' : 'fallback', detail: backendStatus?.nvidia },
  ];

  const statusColor: Record<string, string> = {
    connected: 'bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/50',
    fallback: 'bg-amber-400',
    offline: 'bg-red-400',
  };
  const statusText: Record<string, string> = {
    connected: 'text-emerald-400',
    fallback: 'text-amber-400',
    offline: 'text-red-400',
  };
  const statusLabel: Record<string, string> = {
    connected: 'Connected',
    fallback: 'Fallback',
    offline: 'Offline',
  };

  const commands = [
    { label: 'Frontend', cmd: 'npm run dev', color: 'text-emerald-400' },
    { label: 'Backend', cmd: 'uvicorn main:app --reload --port 8000', color: 'text-emerald-400' },
    { label: 'Worker', cmd: 'arq worker.WorkerSettings', color: 'text-amber-400' },
  ];

  // Theme preview color swatches
  const themeSwatches: Record<string, string[]> = {
    dark: ['#09090b', '#8b5cf6', '#a78bfa', '#fafafa'],
    light: ['#f8f9fa', '#4361ee', '#3a56d4', '#1a1a2e'],
    classy: ['#111111', '#d4a76a', '#e0b97e', '#f5f0e8'],
    style: ['#0c0a14', '#f472b6', '#f9a8d4', '#faf5ff'],
    modern: ['#0a0f0f', '#2dd4bf', '#5eead4', '#f0fdfa'],
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-styled" style={{ background: 'var(--t-bg0)' }}>
      <div className="max-w-2xl mx-auto px-8 py-8 space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.03em]" style={{ color: 'var(--t-text)' }}>Settings</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--t-textDim)' }}>Customize your workspace</p>
        </div>

        {/* ──── Themes ──── */}
        <section className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--t-borderSubtle)', background: 'var(--t-bg1)' }}>
          <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--t-borderSubtle)' }}>
            <Palette size={14} style={{ color: 'var(--t-textDim)' }} />
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--t-text)' }}>Theme</h3>
          </div>
          <div className="p-4 grid grid-cols-5 gap-3">
            {THEMES.map(t => {
              const active = t.id === themeId;
              const swatches = themeSwatches[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="relative flex flex-col items-center gap-2.5 rounded-xl p-3 transition-all duration-200"
                  style={{
                    border: `2px solid ${active ? 'var(--t-accent)' : 'var(--t-border)'}`,
                    background: active ? 'var(--t-accentDim)' : 'var(--t-bg2)',
                  }}
                >
                  {/* Color preview */}
                  <div className="w-full aspect-[16/10] rounded-lg overflow-hidden flex" style={{ border: '1px solid var(--t-border)' }}>
                    <div className="flex-1" style={{ background: swatches[0] }}></div>
                    <div className="w-2" style={{ background: swatches[1] }}></div>
                    <div className="flex-[0.6]" style={{ background: swatches[0] }}>
                      <div className="mt-2 mx-1 h-1 rounded-full" style={{ background: swatches[2] }}></div>
                      <div className="mt-1 mx-1 h-1 rounded-full opacity-50" style={{ background: swatches[2] }}></div>
                      <div className="mt-1 mx-1 h-0.5 rounded-full opacity-30" style={{ background: swatches[3] }}></div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: active ? 'var(--t-accent)' : 'var(--t-textMuted)' }}>
                    {t.label}
                  </span>
                  {active && (
                    <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full flex items-center justify-center" style={{ background: 'var(--t-accent)' }}>
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="px-5 pb-4">
            <p className="text-[11px]" style={{ color: 'var(--t-textDim)' }}>
              {THEMES.find(t => t.id === themeId)?.description || ''}
            </p>
          </div>
        </section>

        {/* Services */}
        <section className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--t-borderSubtle)', background: 'var(--t-bg1)' }}>
          <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--t-borderSubtle)' }}>
            <Globe size={14} style={{ color: 'var(--t-textDim)' }} />
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--t-text)' }}>Services</h3>
          </div>
          {services.map((s, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b last:border-b-0" style={{ borderColor: 'var(--t-borderSubtle)' }}>
              <span className="text-[13px]" style={{ color: 'var(--t-text)' }}>{s.name}</span>
              <div className="flex items-center gap-2.5">
                {s.detail && <span className="text-[11px] max-w-[220px] truncate font-mono" style={{ color: 'var(--t-textDim)' }}>{s.detail}</span>}
                <div className={`flex items-center gap-1.5 ${statusText[s.status] || 'text-zinc-500'}`}>
                  <span className={`h-[6px] w-[6px] rounded-full ${statusColor[s.status] || 'bg-zinc-600'}`}></span>
                  <span className="text-[11px] font-semibold">{statusLabel[s.status] || s.status}</span>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Environment */}
        <section className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--t-borderSubtle)', background: 'var(--t-bg1)' }}>
          <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--t-borderSubtle)' }}>
            <HardDrive size={14} style={{ color: 'var(--t-textDim)' }} />
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--t-text)' }}>Stack</h3>
          </div>
          <div>
            {[
              ['Frontend', 'Next.js 16 · React 19'],
              ['Backend', 'FastAPI · Uvicorn'],
              ['AI Engine', 'NVIDIA SDXL (NIM)'],
              ['State', 'Zustand · @xyflow/react'],
              ['Realtime', 'SSE EventSource'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between px-5 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--t-borderSubtle)' }}>
                <span className="text-[13px]" style={{ color: 'var(--t-textDim)' }}>{l}</span>
                <span className="text-[12px] font-mono" style={{ color: 'var(--t-text)' }}>{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Commands */}
        <section className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--t-borderSubtle)', background: 'var(--t-bg1)' }}>
          <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--t-borderSubtle)' }}>
            <Zap size={14} style={{ color: 'var(--t-textDim)' }} />
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--t-text)' }}>Quick Start</h3>
          </div>
          <div>
            {commands.map(c => (
              <div key={c.label} className="px-5 py-3.5 flex items-center justify-between group border-b last:border-b-0" style={{ borderColor: 'var(--t-borderSubtle)' }}>
                <div>
                  <p className="text-[11px] mb-1" style={{ color: 'var(--t-textDim)' }}>{c.label}</p>
                  <code className={`text-[12px] font-mono ${c.color}`}>{c.cmd}</code>
                </div>
                <button onClick={() => copy(c.cmd)} className="h-7 w-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ border: '1px solid var(--t-border)', background: 'var(--t-bg2)' }}>
                  <Copy size={12} style={{ color: 'var(--t-textMuted)' }} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
