import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth, AppUserProfile } from '../lib/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (profile: AppUserProfile) => void;
  reason?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  reason,
}) => {
  const {
    signInWithCredentials,
    signUpWithCredentials,
    signInWithGoogle,
    authBusy,
    authError,
    clearAuthError,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode('login');
      setPassword('');
      clearAuthError();
    }
  }, [isOpen, clearAuthError]);

  if (!isOpen) return null;

  const handleClose = () => {
    clearAuthError();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();

    const user =
      mode === 'signup'
        ? await signUpWithCredentials({ name, identifier, password })
        : await signInWithCredentials({ identifier, password });

    if (user) {
      onClose();
      if (onSuccess) onSuccess(user);
    }
  };

  const handleGoogleClick = async () => {
    clearAuthError();
    const user = await signInWithGoogle();
    if (user) {
      onClose();
      if (onSuccess) onSuccess(user);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/50 backdrop-blur-xs p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl border border-[#E6DFD3] shadow-xl max-w-md w-full p-6 relative space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-[#78716C] hover:text-[#1C1917] p-1 rounded-lg hover:bg-[#FAF7F1] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Single Unified Title */}
        <div className="space-y-1 pr-6">
          <h3 className="text-xl font-display font-bold text-[#1C1917]">
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </h3>
          <p className="text-sm text-[#57534E]">
            {reason || 'Sign in with Google for automatic cloud sync across updates.'}
          </p>
        </div>

        {authError && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-sm rounded-lg leading-relaxed">
            {authError}
          </div>
        )}

        {/* Primary Persistent Cloud Auth: Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={authBusy}
          className="w-full h-11 bg-[#14532D] hover:bg-[#0F3F22] text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
        >
          {authBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.48-1.74 4.34-5.27 4.34-3.17 0-5.76-2.62-5.76-5.86s2.59-5.86 5.76-5.86c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.78 4.18 14.68 3.25 12.17 3.25 7.21 3.25 3.2 7.26 3.2 12.22s4.01 8.97 8.97 8.97c5.18 0 8.61-3.64 8.61-8.77 0-.59-.06-1.04-.14-1.32z"
                />
              </svg>
            </span>
          )}
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-[#E6DFD3]" />
          <span className="px-3 text-xs text-[#78716C]">or use email / mobile</span>
          <div className="flex-1 border-t border-[#E6DFD3]" />
        </div>

        {/* Single Login / Sign Up Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#EFE9DD] rounded-lg text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              clearAuthError();
            }}
            className={`py-2 rounded-md transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              clearAuthError();
            }}
            className={`py-2 rounded-md transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Unified Email / Mobile + Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label htmlFor="auth-name" className="block text-xs font-medium text-[#57534E]">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                required
                autoComplete="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-[#FAF7F1] focus:bg-white border border-[#DFD6C7] focus:border-[#14532D] rounded-lg outline-none text-[#1C1917]"
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="auth-identifier" className="block text-xs font-medium text-[#57534E]">
              Email or Mobile Number
            </label>
            <input
              id="auth-identifier"
              type="text"
              required
              autoComplete="username"
              placeholder="name@email.com or 9876543210"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-[#FAF7F1] focus:bg-white border border-[#DFD6C7] focus:border-[#14532D] rounded-lg outline-none text-[#1C1917]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="auth-password" className="block text-xs font-medium text-[#57534E]">
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder={mode === 'signup' ? 'Create password (min 6 chars)' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 pl-3 pr-10 text-sm bg-[#FAF7F1] focus:bg-white border border-[#DFD6C7] focus:border-[#14532D] rounded-lg outline-none text-[#1C1917]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-2.5 text-[#78716C] hover:text-[#1C1917] p-0.5"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={authBusy}
            className="w-full h-10 bg-[#FAF7F1] hover:bg-[#EFE9DD] text-[#1C1917] border border-[#DFD6C7] font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {authBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{mode === 'login' ? 'Login' : 'Create Account'}</span>
          </button>
        </form>

        <p className="text-center text-xs text-[#78716C]">
          You can view all IPO details without login.
        </p>
      </div>
    </div>
  );
};
