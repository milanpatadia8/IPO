import React, { useState, useEffect } from 'react';
import { X, User, Phone, Image as ImageIcon, CheckCircle2, AlertCircle, ShieldCheck, Mail } from 'lucide-react';
import { useAuth, formatUserContact } from '../lib/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(profile.displayName || '');
      setPhone(profile.phone || '');
      setPhotoURL(profile.photoURL || '');
      setError('');
      setSavedMessage('');
      setAvatarFailed(false);
    }
  }, [isOpen, profile]);

  if (!isOpen || !profile) return null;

  const initials = (displayName || profile.displayName || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSavedMessage('');
    setSaving(true);
    try {
      await updateUserProfile({
        displayName,
        phone,
        photoURL,
      });
      setSavedMessage('Your profile has been updated.');
      setTimeout(() => {
        setSavedMessage('');
      }, 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const previewPhoto = photoURL.trim();
  const showPhoto = Boolean(previewPhoto && /^https?:\/\/\S+$/i.test(previewPhoto) && !avatarFailed);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-xl border border-[#E6DFD3] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#FAF7F1] border-b border-[#E6DFD3] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-semibold text-[#1C1917]">Edit Profile</h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Update your name, mobile number, and avatar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#EFEAE0] rounded-lg transition-colors"
            aria-label="Close edit profile dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Summary Banner */}
        <div className="px-6 pt-5 pb-3 flex items-center gap-3.5">
          {showPhoto ? (
            <img
              src={previewPhoto}
              alt={displayName || profile.displayName}
              onError={() => setAvatarFailed(true)}
              className="w-12 h-12 rounded-lg object-cover border border-[#E6DFD3] shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#14532D] text-[#FAF7F1] font-semibold text-base flex items-center justify-center shrink-0 tracking-wide">
              {initials || 'U'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#1C1917] truncate">
                {displayName.trim() || profile.displayName}
              </span>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                  profile.role === 'admin'
                    ? 'bg-[#EEF6F0] text-[#14532D] border-[#C6E2CE]'
                    : 'bg-[#FDF6E9] text-[#9A5B13] border-[#ECD7B3]'
                }`}
              >
                {profile.role === 'admin' ? 'Admin' : 'Investor'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#57534E] mt-1 truncate">
              <Mail className="w-3.5 h-3.5 text-[#78716C] shrink-0" />
              <span className="truncate">
                {formatUserContact(profile.email, profile.phone) || profile.email}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-4">
          {error && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {savedMessage && (
            <div className="p-3 bg-[#EEF6F0] border border-[#C6E2CE] text-[#14532D] rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="profile-name" className="block text-xs font-semibold text-[#1C1917]">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="profile-name"
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                className="w-full h-9 pl-9 pr-3 text-sm bg-[#FAF7F1] border border-[#DFD6C7] rounded-lg text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:bg-white focus:border-[#14532D] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-phone" className="block text-xs font-semibold text-[#1C1917]">
              Mobile Number <span className="font-normal text-[#78716C]">(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="profile-phone"
                type="tel"
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210 or +919876543210"
                className="w-full h-9 pl-9 pr-3 text-sm font-mono tabular-nums bg-[#FAF7F1] border border-[#DFD6C7] rounded-lg text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:bg-white focus:border-[#14532D] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-photo" className="block text-xs font-semibold text-[#1C1917]">
              Profile Photo URL <span className="font-normal text-[#78716C]">(Optional)</span>
            </label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="profile-photo"
                type="url"
                maxLength={500}
                value={photoURL}
                onChange={(e) => {
                  setAvatarFailed(false);
                  setPhotoURL(e.target.value);
                }}
                placeholder="https://example.com/avatar.jpg"
                className="w-full h-9 pl-9 pr-3 text-sm bg-[#FAF7F1] border border-[#DFD6C7] rounded-lg text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:bg-white focus:border-[#14532D] transition-colors"
              />
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between gap-2 text-[11px] text-[#78716C]">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#14532D]" />
              Saved securely to your account
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EFEAE0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#57534E] hover:text-[#1C1917] bg-[#FAF7F1] hover:bg-[#F2ECE1] border border-[#E6DFD3] rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#14532D] hover:bg-[#0F3F22] rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
