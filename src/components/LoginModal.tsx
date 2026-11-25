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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-[#EAEAEA] shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6B7280] hover:text-[#111827] p-1 rounded-lg transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-[#111827] text-white flex items-center justify-center font-bold">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#111827]">Admin Authentication</h3>
            <p className="text-sm text-[#4B5563]">Sign in to manage IPO records, grey market data, and automated feeds</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-[#DC2626] text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1.5">
              Authorized Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. milanpatadia8@gmail.com"
              className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg focus:bg-white focus:border-[#111827] outline-none text-[#111827] transition-colors"
            />
          </div>

          {/* Quick preset selector for testing convenience */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-medium text-[#4B5563]">Select authorized role:</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => selectPreset('milanpatadia8@gmail.com')}
                className={`p-2.5 text-left border rounded-lg transition-colors text-xs ${
                  email === 'milanpatadia8@gmail.com'
                    ? 'border-[#111827] bg-[#FAFAFA] font-medium text-[#111827]'
                    : 'border-[#EAEAEA] text-[#4B5563] hover:bg-[#FAFAFA]'
                }`}
              >
                <div className="font-medium text-xs text-[#111827]">Administrator</div>
                <div className="text-xs text-[#6B7280] truncate">milanpatadia8@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() => selectPreset('editor@ipotracker.in')}
                className={`p-2.5 text-left border rounded-lg transition-colors text-xs ${
                  email === 'editor@ipotracker.in'
                    ? 'border-[#111827] bg-[#FAFAFA] font-medium text-[#111827]'
                    : 'border-[#EAEAEA] text-[#4B5563] hover:bg-[#FAFAFA]'
                }`}
              >
                <div className="font-medium text-xs text-[#111827]">Editor</div>
                <div className="text-xs text-[#6B7280] truncate">editor@ipotracker.in</div>
              </button>

              <button
                type="button"
                onClick={() => selectPreset('auditor@ipotracker.in')}
                className={`p-2.5 text-left border rounded-lg transition-colors text-xs ${
                  email === 'auditor@ipotracker.in'
                    ? 'border-[#111827] bg-[#FAFAFA] font-medium text-[#111827]'
                    : 'border-[#EAEAEA] text-[#4B5563] hover:bg-[#FAFAFA]'
                }`}
              >
                <div className="font-medium text-xs text-[#111827]">Reviewer</div>
                <div className="text-xs text-[#6B7280] truncate">auditor@ipotracker.in</div>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[#111827] hover:bg-neutral-800 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating Session...' : 'Sign In to Console'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-[#6B7280]">
          Enforces server-side authorization and audit logging.
        </p>
      </div>
    </div>
  );
};
