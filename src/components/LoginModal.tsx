import React, { useState } from 'react';
import { ShieldCheck, X, Lock, CheckCircle2 } from 'lucide-react';
import { AdminUser } from '../types/ipo';
import { api } from '../lib/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AdminUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('milanpatadia8@gmail.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    try {
      const user = await api.adminLogin(email.trim());
      onSuccess(user);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (presetEmail: string) => {
    setEmail(presetEmail);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-md"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Admin Authentication</h3>
            <p className="text-xs text-slate-500">Sign in to manage IPO records, GMP, and feeds</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Authorized Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. milanpatadia8@gmail.com"
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-slate-400 outline-none transition-colors"
            />
          </div>

          {/* Quick preset selector for testing convenience */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-medium text-slate-500">Select authorized role:</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => selectPreset('milanpatadia8@gmail.com')}
                className={`p-2 text-left border rounded-md transition-colors text-xs ${
                  email === 'milanpatadia8@gmail.com'
                    ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium">Administrator</div>
                <div className="text-[10px] text-slate-400 truncate">milanpatadia8@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() => selectPreset('editor@ipotracker.in')}
                className={`p-2 text-left border rounded-md transition-colors text-xs ${
                  email === 'editor@ipotracker.in'
                    ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium">Editor</div>
                <div className="text-[10px] text-slate-400 truncate">editor@ipotracker.in</div>
              </button>

              <button
                type="button"
                onClick={() => selectPreset('auditor@ipotracker.in')}
                className={`p-2 text-left border rounded-md transition-colors text-xs ${
                  email === 'auditor@ipotracker.in'
                    ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium">Reviewer</div>
                <div className="text-[10px] text-slate-400 truncate">auditor@ipotracker.in</div>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating Session...' : 'Sign In to Admin Panel'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Enforces server-side authorization and tamper-resistant audit logging.
        </p>
      </div>
    </div>
  );
};
