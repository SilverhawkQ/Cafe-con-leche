import { useRef, useState, type FormEvent } from 'react';

// Any form-endpoint service that accepts a POST and returns JSON works (e.g. Formspree).
const ENDPOINT = import.meta.env.PUBLIC_FEEDBACK_URL as string | undefined;

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function Feedback() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<Status>('idle');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get('website')) return; // honeypot field: bots fill it, people never see it
    if (!ENDPOINT) return setStatus('error');
    setStatus('sending');
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body: data });
      if (res.ok) form.reset();
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  const open = () => {
    setStatus('idle');
    dialog.current?.showModal();
  };

  return (
    <>
      <button className="icon-btn" onClick={open} aria-label="Send feedback" title="Send feedback">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12Z" />
        </svg>
      </button>
      <dialog ref={dialog} className="feedback" onClick={(e) => e.target === dialog.current && dialog.current.close()}>
        <form onSubmit={submit}>
          <h2>Send feedback</h2>
          <label htmlFor="fb-message">What's on your mind?</label>
          <textarea id="fb-message" name="message" required rows={5} maxLength={2000} />
          <label htmlFor="fb-email">Email (optional, if you'd like a reply)</label>
          <input id="fb-email" name="email" type="email" autoComplete="email" />
          <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {status === 'sent' && <p role="status">Thanks! Got it.</p>}
          {status === 'error' && (
            <p role="alert">{ENDPOINT ? "Couldn't send. Please try again." : "Feedback isn't connected yet."}</p>
          )}
          <div className="actions">
            <button type="button" onClick={() => dialog.current?.close()}>Close</button>
            <button type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send'}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
