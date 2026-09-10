import React, { useState } from 'react';
import { Trash2, AlertTriangle, User, School, Hash, Mail } from 'lucide-react';
import Modal from '../common/Modal';

export default function DeleteParticipantModal({
  isOpen,
  onClose,
  participant,
  onConfirm
}) {
  const [deleting, setDeleting] = useState(false);

  if (!participant) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm(participant.id);
      onClose();
    } catch (err) {
      console.error('Delete error', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center border border-rose-200 dark:border-rose-900">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base font-black text-slate-900 dark:text-white">
              Delete Participant
            </span>
            <p className="text-xs font-normal text-slate-400">
              Permanent deletion from symposium registry
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Warning Callout */}
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/80 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800 dark:text-rose-300">
            <p className="font-bold">Irreversible Action</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-rose-700/90 dark:text-rose-400">
              Deleting this participant will permanently wipe their user account, credentials, examination attempts, answers, and scores.
            </p>
          </div>
        </div>

        {/* Participant Summary Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                {participant.full_name}
              </span>
              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                {participant.participant_id}
              </span>
            </div>
            {participant.registration_number && (
              <span className="font-mono text-[10px] text-slate-400">
                {participant.registration_number}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{participant.email}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <School className="w-3 h-3 text-slate-400" />
              <span>{participant.college || 'No college specified'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20 transition-all disabled:opacity-50"
          >
            {deleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Participant</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
