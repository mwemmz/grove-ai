import { ThemePicker } from './ThemePicker';
import { PROVIDERS, testKey, type Provider } from '../services/llmService';
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
  const [provider, setProvider] = useState<Provider>(() => storage.getApiProvider());
  const [keys, setKeys] = useState<Record<string, string>>(() => Object.fromEntries(PROVIDERS.map((p) => [p.id, storage.getApiKey(p.id)])));
  const [models, setModels] = useState<Record<string, string>>(() => Object.fromEntries(PROVIDERS.map((p) => [p.id, storage.getApiModel(p.id)])));
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<{ state: 'idle' | 'busy' | 'ok' | 'fail'; msg: string }>({ state: 'idle', msg: '' });
  const apiKey = keys[provider] ?? '';
  const def = PROVIDERS.find((p) => p.id === provider)!;
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
    storage.saveApiProvider(provider);
    PROVIDERS.forEach((p) => {
      if (p.id === 'mock') return;
      storage.saveApiKey((keys[p.id] ?? '').trim(), p.id);
      storage.saveApiModel((models[p.id] ?? '').trim(), p.id);
    });

    setToastMessage('Settings successfully saved!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleTest = async () => {
    if (provider === 'mock') return;
    setTest({ state: 'busy', msg: 'Checking…' });
    try {
      await testKey(provider, apiKey.trim(), (models[provider] || def.model).trim());
      setTest({ state: 'ok', msg: 'Connected. Save settings to use it.' });
    } catch (err) {
      setTest({ state: 'fail', msg: err instanceof Error ? err.message : 'Could not connect.' });
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
              AI Intelligence Engine
            </h3>

            <div role="radiogroup" aria-label="AI engine" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PROVIDERS.map((p) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={provider === p.id}
                  key={p.id}
                  onClick={() => { setProvider(p.id); setTest({ state: 'idle', msg: '' }); setShowKey(false); }}
                  className={`rounded-lg border p-2.5 text-left ${
                    provider === p.id ? 'border-accent bg-raised text-text' : 'border-line text-muted hover:bg-raised hover:text-text'
                  }`}
                >
                  <div className="text-xs font-bold">{p.label}</div>
                  <div className="mt-0.5 text-xs text-muted">{p.sub}</div>
                </button>
              ))}
            </div>

            {provider === 'mock' ? (
              <p className="text-xs text-muted">Answers come from your notes with built-in rules. Add a key to get a real AI model answering from them.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label htmlFor="ai-key" className="mb-1 block text-xs font-medium text-slate-400">{def.label} API key</label>
                  <div className="flex gap-2">
                    <input
                      id="ai-key"
                      type={showKey ? 'text' : 'password'}
                      autoComplete="off"
                      spellCheck={false}
                      value={apiKey}
                      onChange={(e) => { setKeys({ ...keys, [provider]: e.target.value }); setTest({ state: 'idle', msg: '' }); }}
                      placeholder={def.keyHint}
                      className="min-w-0 flex-1 rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-1.5 font-mono text-xs text-text focus:border-emerald-500 focus:outline-none"
                    />
                    <button type="button" onClick={() => setShowKey((v) => !v)} className="rounded-lg border border-line px-3 text-xs text-muted hover:bg-raised hover:text-text">
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="ai-model" className="mb-1 block text-xs font-medium text-slate-400">Model</label>
                  <input
                    id="ai-model"
                    type="text"
                    spellCheck={false}
                    value={models[provider] ?? ''}
                    onChange={(e) => setModels({ ...models, [provider]: e.target.value })}
                    placeholder={def.model}
                    className="w-full rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-1.5 font-mono text-xs text-text focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-muted">Leave blank to use {def.model}. Change it if the provider retires that name.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => void handleTest()} disabled={!apiKey.trim() || test.state === 'busy'} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-text hover:bg-raised">
                    Test key
                  </button>
                  {def.keyUrl && (
                    <a href={def.keyUrl} target="_blank" rel="noreferrer" className="text-xs text-accent underline-offset-2 hover:underline">Get a key</a>
                  )}
                  {apiKey && (
                    <button type="button" onClick={() => { setKeys({ ...keys, [provider]: '' }); setTest({ state: 'idle', msg: '' }); }} className="text-xs text-muted hover:text-text">
                      Remove key
                    </button>
                  )}
                  {test.msg && (
                    <span role="status" className={`text-xs ${test.state === 'ok' ? 'text-accent' : test.state === 'fail' ? 'text-warn' : 'text-muted'}`}>{test.msg}</span>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-muted">
                  Your key stays in this browser and goes only to {def.label}. When you ask a question, the question and the few notes that match it are sent there to write the answer. Use a key with a spending limit, and remove it on a shared computer.
                </p>
              </div>
            )}
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
