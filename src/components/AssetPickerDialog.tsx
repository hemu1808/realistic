'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
};

export default function AssetPickerDialog({ isOpen, onClose, onSelect }: Props) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.assets()
        .then(d => { setAssets(d.assets || []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  const filtered = assets.filter(a =>
    a.filename.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-[600px] max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--t-bg0)', border: '1px solid var(--t-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--t-borderSubtle)' }}>
          <div>
            <h3 className="text-lg font-bold tracking-tight" style={{ color: 'var(--t-text)' }}>Select Asset</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--t-textDim)' }}>Choose an image from your library</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--t-textDim)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--t-borderSubtle)' }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-textDim)' }} />
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl pl-10 pr-4 py-2 text-sm outline-none transition-colors"
              style={{
                background: 'var(--t-bg2)',
                color: 'var(--t-text)',
                border: '1px solid var(--t-border)',
              }}
            />
          </div>
        </div>

        {/* Grid */}
        <div
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 overflow-y-auto p-5 scrollbar-styled"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--t-textDim)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--t-textMuted)' }}>Loading library...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <p className="text-sm font-medium" style={{ color: 'var(--t-textMuted)' }}>No assets found</p>
              <button onClick={() => setSearch('')} className="text-xs" style={{ color: 'var(--t-accent)' }}>Clear search</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((a, i) => (
                <button
                  key={i}
                  onClick={() => { onSelect(a.url); onClose(); }}
                  className="group relative aspect-square rounded-xl overflow-hidden transition-all duration-200"
                  style={{ border: '1px solid var(--t-borderSubtle)', background: 'var(--t-bg0)' }}
                >
                  <img src={a.url} alt={a.filename} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white shadow-lg" style={{ background: 'var(--t-accent)' }}>Select</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
