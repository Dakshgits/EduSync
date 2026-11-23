import Modal from './Modal';
import { Spinner } from '../common/Feedback';

export default function ConfirmationModal({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, busy = false, onConfirm, onClose, children }) {
  return (
    <Modal open={open} onClose={onClose} title={title} busy={busy} size="sm"
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>{cancelLabel}</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy && <Spinner className="h-4 w-4 !text-white" />}{confirmLabel}
          </button>
        </>
      )}>
      <p className="text-sm leading-relaxed text-slate-600">{message}</p>
      {children}
    </Modal>
  );
}
