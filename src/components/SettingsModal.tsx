import { ThemePicker } from './ThemePicker';
import { PROVIDERS, testKey, type LiveProvider } from '../services/llmService';
import type { AiConfig } from '../services/storage';
import React, { useEffect, useState } from 'react';
import { 
  X, 
  Settings, 
  Key, 
  Download, 
  Upload, 
  RefreshCw, 
  User, 
  Check, 
  Database,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { LearningProfile } from '../types';
import { storage } from '../services/storage';
import { SignOutButton } from '@clerk/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LearningProfile;
  setProfile: React.Dispatch<React.SetStateAction<LearningProfile>>;
  onResetDemo: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  setProfile,
  onResetDemo,
}) => {
  const LIVE = PROVIDERS.filter((p) => p.id !== 'mock') as (typeof PROVIDERS[number] & { id: LiveProvider })[];
  const [cfg, setCfg] = useState<AiConfig>(() => storage.getAiConfig());
  const [keys, setKeys] = useState<Record<string, string>>(() => Object.fromEntries(LIVE.map((p) => [p.id, storage.getApiKey(p.id)])));
  const [models, setModels] = useState<Record<string, string>>(() => Object.fromEntries(LIVE.map((p) => [p.id, storage.getApiModel(p.id)])));
  const [open, setOpen] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [tests, setTests] = useState<Record<string, { state: 'busy' | 'ok' | 'fail'; msg: string }>>({});
  const move = (id: LiveProvider, dir: -1 | 1) => {
    const o = [...cfg.order];
    const i = o.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    setCfg({ ...cfg, order: o });
  };
  const [name, setName] = useState(profile.studentName);
  const [degree, setDegree] = useState(profile.degreeName);
  const [university, setUniversity] = useState(profile.university);
  const [year, setYear] = useState(profile.currentYear);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: LearningProfile = {
      ...profile,
      studentName: name.trim(),
      degreeName: degree.trim(),
      university: university.trim(),
      currentYear: Number(year) as 1 | 2 | 3 | 4,
    };
    setProfile(updated);
    storage.saveProfile(updated);
    LIVE.forEach((p) => {
      storage.saveApiKey((keys[p.id] ?? '').trim(), p.id);
      storage.saveApiModel((models[p.id] ?? '').trim(), p.id);
    });
    storage.saveAiConfig(cfg);
    const first = cfg.order.find((p) => (keys[p] ?? '').trim());
    storage.saveApiProvider(first ?? 'mock'); // keeps the older single-provider setting in step

    setToastMessage('Settings successfully saved!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleTest = async (id: LiveProvider) => {
    const def = PROVIDERS.find((p) => p.id === id)!;
    setTests((t) => ({ ...t, [id]: { state: 'busy', msg: 'Checking…' } }));
    try {
      await testKey(id, (keys[id] ?? '').trim(), (models[id] || def.model).trim());
      setTests((t) => ({ ...t, [id]: { state: 'ok', msg: 'Connected' } }));
    } catch (err) {
      setTests((t) => ({ ...t, [id]: { state: 'fail', msg: err instanceof Error ? err.message : 'Could not connect.' } }));
    }
  };

  const handleDownloadBackup = async () => {
    const json = await storage.exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grove-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content && (await storage.importBackupJson(content))) {
        setProfile(storage.getProfile());
        setToastMessage('Backup successfully imported! Reloading...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        alert('Failed to parse backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl bg-surface border border-line p-6 shadow-2xl shadow-black/40 text-slate-200 animate-enter">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-lg bg-slate-800 text-slate-400 hover:text-text flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-text">Grove Settings & Data</h2>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Configure degree parameters, persistence, and AI connectivity.
        </p>

        {toastMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 p-3 text-xs font-semibold">
            <Check className="h-4 w-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="mb-6 space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Appearance</h3>
          <ThemePicker />
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          
          {/* Student Profile Info */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-400" />
              Student Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700/80 px-3 py-1.5 text-xs text-text focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Current Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value) as any)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700/80 px-3 py-1.5 text-xs text-text focus:outline-none focus:border-emerald-500"
                >
                  <option value={1}>Year 1 (Freshman)</option>
                  <option value={2}>Year 2 (Sophomore)</option>
                  <option value={3}>Year 3 (Junior)</option>
                  <option value={4}>Year 4 (Senior / Capstone)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Degree Program</label>
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700/80 px-3 py-1.5 text-xs text-text focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">University / Institute</label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700/80 px-3 py-1.5 text-xs text-text focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* AI Intelligence Provider */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-teal-400" />
              AI engines
            </h3>
            <p className="text-xs leading-relaxed text-muted">
              Add a key for any provider. Grove tries them from the top. If one fails or runs out of quota, the next one picks up the same question. With no keys, Grove answers locally from your notes.
            </p>

            <ul className="space-y-2">
              {cfg.order.map((id, idx) => {
                const def = LIVE.find((p) => p.id === id)!;
                const has = !!(keys[id] ?? '').trim();
                const isOpen = open === id;
                const t = tests[id];
                return (
                  <li key={id} className="rounded-lg border border-line">
                    <div className="flex items-center gap-2 p-2">
                      <span className="w-5 text-center font-mono text-xs text-muted">{idx + 1}</span>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => { setOpen(isOpen ? null : id); setShowKey(false); }}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-raised"
                      >
                        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${has ? 'bg-accent' : 'bg-line'}`} />
                        <span className="text-sm font-medium text-text">{def.label}</span>
                        <span className="truncate text-xs text-muted">{has ? 'Key saved' : 'No key'}</span>
                      </button>
                      <button type="button" aria-label={`Move ${def.label} up`} disabled={idx === 0} onClick={() => move(id, -1)} className="rounded-md px-2 py-1 text-muted hover:bg-raised hover:text-text">↑</button>
                      <button type="button" aria-label={`Move ${def.label} down`} disabled={idx === cfg.order.length - 1} onClick={() => move(id, 1)} className="rounded-md px-2 py-1 text-muted hover:bg-raised hover:text-text">↓</button>
                    </div>
                    {isOpen && (
                      <div className="space-y-3 border-t border-line p-3">
                        <div>
                          <label htmlFor={`key-${id}`} className="mb-1 block text-xs font-medium text-slate-400">{def.label} API key</label>
                          <div className="flex gap-2">
                            <input
                              id={`key-${id}`}
                              type={showKey ? 'text' : 'password'}
                              autoComplete="off"
                              spellCheck={false}
                              value={keys[id] ?? ''}
                              onChange={(e) => { setKeys({ ...keys, [id]: e.target.value }); setTests((x) => { const n = { ...x }; delete n[id]; return n; }); }}
                              placeholder={def.keyHint}
                              className="min-w-0 flex-1 rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-1.5 font-mono text-xs text-text focus:border-emerald-500 focus:outline-none"
                            />
                            <button type="button" onClick={() => setShowKey((v) => !v)} className="rounded-lg border border-line px-3 text-xs text-muted hover:bg-raised hover:text-text">
                              {showKey ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`model-${id}`} className="mb-1 block text-xs font-medium text-slate-400">Model</label>
                          <input
                            id={`model-${id}`}
                            type="text"
                            spellCheck={false}
                            value={models[id] ?? ''}
                            onChange={(e) => setModels({ ...models, [id]: e.target.value })}
                            placeholder={def.model}
                            className="w-full rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-1.5 font-mono text-xs text-text focus:border-emerald-500 focus:outline-none"
                          />
                          <p className="mt-1 text-xs text-muted">Blank uses {def.model}. Change it if the provider retires that name.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button type="button" onClick={() => void handleTest(id)} disabled={!has || t?.state === 'busy'} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-text hover:bg-raised">Test key</button>
                          {def.keyUrl && <a href={def.keyUrl} target="_blank" rel="noreferrer" className="text-xs text-accent underline-offset-2 hover:underline">Get a key</a>}
                          {has && <button type="button" onClick={() => setKeys({ ...keys, [id]: '' })} className="text-xs text-muted hover:text-text">Remove key</button>}
                          {t && <span role="status" className={`text-xs ${t.state === 'ok' ? 'text-accent' : t.state === 'fail' ? 'text-warn' : 'text-muted'}`}>{t.msg}</span>}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['ask', 'Answering questions'],
                ['quiz', 'Quizzes and practice'],
              ] as const).map(([task, label]) => (
                <div key={task}>
                  <label htmlFor={`route-${task}`} className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
                  <select
                    id={`route-${task}`}
                    value={cfg.routes[task]}
                    onChange={(e) => setCfg({ ...cfg, routes: { ...cfg.routes, [task]: e.target.value as LiveProvider | 'auto' } })}
                    className="w-full rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-1.5 text-xs text-text focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="auto">First available</option>
                    {LIVE.map((p) => (
                      <option key={p.id} value={p.id} disabled={!(keys[p.id] ?? '').trim()}>{p.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <label className="flex items-start gap-2 text-xs text-muted">
              <input type="checkbox" checked={cfg.failover} onChange={(e) => setCfg({ ...cfg, failover: e.target.checked })} className="mt-0.5 accent-[var(--color-accent)]" />
              <span>If a provider fails, hand the question to the next one with a key. Turn this off to stay on one provider and never spend the others.</span>
            </label>

            <p className="text-xs leading-relaxed text-muted">
              Keys stay in this browser and go only to their own provider. When you ask, the question, the few notes that match it and your last exchange are sent to the provider that answers. Use keys with spending limits, and remove them on a shared computer.
            </p>
          </div>

          {/* Backup & Persistence */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-blue-400" />
              Data Persistence & Portability
            </h3>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export 4-Year Backup (JSON)</span>
              </button>

              <label className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer transition-colors">
                <Upload className="h-3.5 w-3.5 text-blue-400" />
                <span>Restore from Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Danger Zone: Reset to Demo */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset all notes, portfolio, and profile to the initial 4-year demo dataset?')) {
                    onResetDemo();
                    onClose();
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset to 4-Year Demo Data</span>
              </button>

              <SignOutButton>
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </SignOutButton>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-on-accent px-5 py-2 text-xs font-semibold shadow-lg shadow-emerald-900/30"
            >
              Save Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
