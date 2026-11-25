import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, UserCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth, AppUserProfile } from '../lib/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (profile: AppUserProfile, chosenRole: 'user' | 'admin') => void;
  intent?: 'user' | 'admin';
  reason?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  intent = 'user',
  reason,
}) => {
  const { signInWithGoogle, authBusy, authError, clearAuthError } = useAuth();
  const [activeOption, setActiveOption] = useState<'user' | 'admin' | null>(null);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveOption(null);
      setRoleNotice(null);
    }
  }, [isOpen, intent]);

  if (!isOpen) return null;

  const handleClose = () => {
    clearAuthError();
    setRoleNotice(null);
    setActiveOption(null);
    onClose();
  };

  const handleOptionClick = async (chosenRole: 'user' | 'admin') => {
    clearAuthError();
    setRoleNotice(null);
    setActiveOption(chosenRole);

    const signedProfile = await signInWithGoogle();
    setActiveOption(null);

    if (!signedProfile) {
      return;
    }

    if (chosenRole === 'admin' && signedProfile.role !== 'admin') {
      setRoleNotice(
        `Logged in as ${signedProfile.email} (End User). This Google account does not have Admin privileges. Please click Admin Login again to choose an authorized Admin account, or continue as End User.`
      );
      return;
    }

    onClose();
    if (onSuccess) {
      onSuccess(signedProfile, chosenRole);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl border border-[#EAEAEA] shadow-xl max-w-md w-full p-6 relative space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-[#6B7280] hover:text-[#111827] p-1 rounded-lg transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 pr-6">
          <h3 className="text-xl font-semibold text-[#111827]">Login</h3>
          <p className="text-sm text-[#4B5563]">
            {reason || 'Select an option below to login with your Google account.'}
          </p>
        </div>

        {authError && (
          <div className="p-3 bg-red-50 border border-red-200 text-[#DC2626] text-sm rounded-lg">
            {authError}
          </div>
        )}

        {roleNotice && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg space-y-2.5">
            <p className="leading-relaxed">{roleNotice}</p>
            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-semibold text-[#111827] underline underline-offset-2"
            >
              Continue as End User
            </button>
          </div>
        )}

        <div className="space-y-3">
          {/* Clickable End User Login Button */}
          <button
            type="button"
            onClick={() => handleOptionClick('user')}
            disabled={authBusy}
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-3 group disabled:opacity-60 cursor-pointer ${
              intent === 'user'
                ? 'border-[#111827] bg-[#FAFAFA] hover:bg-[#F3F4F6]'
                : 'border-[#E5E7EB] bg-white hover:border-[#111827] hover:bg-[#FAFAFA]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#111827] text-white flex items-center justify-center shrink-0 mt-0.5">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-[#111827]">End User Login</div>
                <div className="text-xs text-[#4B5563] mt-0.5 leading-relaxed">
                  Apply for open IPOs via UPI and track your submitted bids.
                </div>
              </div>
            </div>
            <div className="shrink-0 text-[#111827]">
              {authBusy && activeOption === 'user' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#111827] group-hover:translate-x-0.5 transition-all" />
              )}
            </div>
          </button>

          {/* Clickable Admin Login Button */}
          <button
            type="button"
            onClick={() => handleOptionClick('admin')}
            disabled={authBusy}
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-3 group disabled:opacity-60 cursor-pointer ${
              intent === 'admin'
                ? 'border-[#111827] bg-[#FAFAFA] hover:bg-[#F3F4F6]'
                : 'border-[#E5E7EB] bg-white hover:border-[#111827] hover:bg-[#FAFAFA]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] text-[#111827] border border-[#E5E7EB] group-hover:bg-[#111827] group-hover:text-white group-hover:border-[#111827] transition-colors flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-[#111827]">Admin Login</div>
                <div className="text-xs text-[#4B5563] mt-0.5 leading-relaxed">
                  Edit IPO details, GMP quotes, subscriptions, and backend settings.
                </div>
              </div>
            </div>
            <div className="shrink-0 text-[#111827]">
              {authBusy && activeOption === 'admin' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#111827] group-hover:translate-x-0.5 transition-all" />
              )}
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-[#6B7280]">
          You can browse all IPO details without login. Login is only required to apply for an IPO or edit details in the Admin backend.
        </p>
      </div>
    </div>
  );
};
