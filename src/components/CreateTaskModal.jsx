import React, { useState } from 'react';
import { Globe, Sparkles, X, Terminal, CheckCircle2, FolderOpen } from 'lucide-react';

export default function CreateTaskModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [url, setUrl] = useState('');
  const [seedUrls, setSeedUrls] = useState('');
  const [codebasePath, setCodebasePath] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [authLoginUrl, setAuthLoginUrl] = useState('');
  const [authPostLoginUrl, setAuthPostLoginUrl] = useState('');
  const [protectedUrls, setProtectedUrls] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authOtpCode, setAuthOtpCode] = useState('');
  const [authOtpHint, setAuthOtpHint] = useState('');
  const [urlError, setUrlError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Reset previous errors
    setUrlError('');
    setCodeError('');
    setError('');

    if (!url.trim()) {
      setUrlError('Please enter a valid website URL.');
      return;
    }

    // Clean and validate URL format lightly. Multiple websites become multiple tasks.
    const targetUrls = url
      .split(/[\n,]+/)
      .map(value => value.trim())
      .filter(Boolean);
    
    // Quick regex check for standard domains or localhost
    const urlRegex = /^(https?:\/\/)?(localhost|(?:\d{1,3}\.){3}\d{1,3}|[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+)(:[0-9]+)?(\/.*)?$/;
    
    const invalidUrl = targetUrls.find(targetUrl => !urlRegex.test(targetUrl));
    if (invalidUrl) {
      setUrlError(`Invalid URL format: ${invalidUrl}`);
      return;
    }

    if (codebasePath && codebasePath.trim() === '') {
      setCodeError('Please provide a valid codebase folder path or leave empty.');
      return;
    }
    const forcedProtectedUrls = protectedUrls
      .split(/[\n,]+/)
      .map(value => value.trim())
      .filter(Boolean);

    onSubmit(targetUrls, codebasePath.trim(), {
      seed_urls: seedUrls
        .split(/[\n,]+/)
        .map(value => value.trim())
        .filter(Boolean)
        .concat(forcedProtectedUrls),
      auth_required: authRequired,
      auth_login_url: authLoginUrl.trim(),
      auth_post_login_url: authPostLoginUrl.trim(),
      auth_username: authUsername.trim(),
      auth_password: authPassword,
      auth_otp_code: authOtpCode.trim(),
      auth_otp_hint: authOtpHint.trim(),
    });
    setUrl('');
    setSeedUrls('');
    setCodebasePath('');
    setAuthRequired(false);
    setAuthLoginUrl('');
    setAuthPostLoginUrl('');
    setProtectedUrls('');
    setAuthUsername('');
    setAuthPassword('');
    setAuthOtpCode('');
    setAuthOtpHint('');
  };

  return (
    <div style={styles.overlay}>
      <div className="glass-panel animate-fade-in" style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleBox}>
            <Sparkles size={18} color="var(--primary)" />
            <h3 style={styles.title}>New AI Web Test</h3>
          </div>
          <button onClick={onClose} style={styles.closeBtn} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputWrapper}>
            <label style={styles.label}>Website Target URLs</label>
            <div style={styles.fieldRow}>
              <div style={styles.iconBox}>
                <Globe size={18} color="var(--primary)" />
              </div>
              <textarea
                rows={3}
                placeholder={'e.g. example.com\nlocalhost:3000\nhttps://demo.site/login'}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError('');
                  setUrlError('');
                }}
                disabled={isSubmitting}
                style={styles.textarea}
                autoFocus
              />
            </div>
            <div style={styles.helpText}>Add one website per line. Each website will run as a separate task.</div>
            {urlError && <div style={styles.errorText}>{urlError}</div>}
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Local Codebase Folder Path</label>
            <div style={styles.fieldRow}>
              <div style={styles.iconBox}>
                <FolderOpen size={18} color="var(--primary)" />
              </div>
              <input
                type="text"
                placeholder="e.g. /home/dev04/datagrid/sharM/ReactProjectMarket (Optional)"
                value={codebasePath}
                onChange={(e) => {
                  setCodebasePath(e.target.value);
                  setError('');
                  setCodeError('');
                }}
                disabled={isSubmitting}
                style={styles.input}
              />
            </div>
            {codeError && <div style={styles.errorText}>{codeError}</div>}
            {error && <div style={styles.errorText}>{error}</div>}
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Seed URLs for Known Pages</label>
            <div style={styles.fieldRow}>
              <div style={styles.iconBox}>
                <Globe size={18} color="var(--primary)" />
              </div>
              <textarea
                rows={3}
                placeholder={'e.g. https://ams.aahoa.com/become-a-member\nhttps://ams.aahoa.com/become-a-vendor'}
                value={seedUrls}
                onChange={(e) => setSeedUrls(e.target.value)}
                disabled={isSubmitting}
                style={styles.textarea}
              />
            </div>
            <div style={styles.helpText}>Optional. Add pages that should be tested even if the homepage crawl does not expose them.</div>
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Authentication / Session</label>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={authRequired}
                onChange={(e) => setAuthRequired(e.target.checked)}
              />
              <span>This website needs login or session access</span>
            </label>

            {authRequired && (
              <div style={styles.authGrid}>
                <input
                  type="text"
                  placeholder="Login page URL (optional)"
                  value={authLoginUrl}
                  onChange={(e) => setAuthLoginUrl(e.target.value)}
                  disabled={isSubmitting}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Post-login URL (e.g. https://scmt.datagrid.co.in/dashboard)"
                  value={authPostLoginUrl}
                  onChange={(e) => setAuthPostLoginUrl(e.target.value)}
                  disabled={isSubmitting}
                  style={styles.input}
                />
                <textarea
                  rows={3}
                  placeholder={'Protected dashboard pages to force-test\nhttps://scmt.datagrid.co.in/dashboard\nhttps://scmt.datagrid.co.in/reports'}
                  value={protectedUrls}
                  onChange={(e) => setProtectedUrls(e.target.value)}
                  disabled={isSubmitting}
                  style={styles.authTextarea}
                />
                <input
                  type="text"
                  placeholder="Username / email"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  disabled={isSubmitting}
                  style={styles.input}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  disabled={isSubmitting}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="OTP code if already available"
                  value={authOtpCode}
                  onChange={(e) => setAuthOtpCode(e.target.value)}
                  disabled={isSubmitting}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="OTP hint / description"
                  value={authOtpHint}
                  onChange={(e) => setAuthOtpHint(e.target.value)}
                  disabled={isSubmitting}
                  style={styles.input}
                />
              </div>
            )}
          </div>

          {/* Explanation checklist */}
          <div style={styles.processBox}>
            <div style={styles.processBoxTitle}>
              <Terminal size={14} color="var(--accent)" />
              <span>Automated Pipeline Operations</span>
            </div>
            <div style={styles.stepList}>
              <div style={styles.stepItem}>
                <CheckCircle2 size={14} color="var(--primary)" />
                <span>Crawl DOM layout tree and scrape active inputs</span>
              </div>
              <div style={styles.stepItem}>
                <CheckCircle2 size={14} color="var(--primary)" />
                <span>Synthesize relevant UX use cases via LLM context</span>
              </div>
              <div style={styles.stepItem}>
                <CheckCircle2 size={14} color="var(--primary)" />
                <span>Generate and execute automated test scripts</span>
              </div>
              <div style={styles.stepItem}>
                <CheckCircle2 size={14} color="var(--primary)" />
                <span>Diagnose failures, log errors and severity classes</span>
              </div>
              <div style={styles.stepItem}>
                <CheckCircle2 size={14} color="var(--primary)" />
                <span>Publish accessibility and performance optimizations</span>
              </div>
            </div>
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary"
              style={{ padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ padding: '8px 16px' }}
            >
              {isSubmitting ? (
                <>
                  <div style={styles.buttonSpinner} />
                  <span>Enrolling Task...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Launch Agent Test{url.split(/[\n,]+/).filter(value => value.trim()).length > 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 16, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '460px',
    maxHeight: 'calc(100vh - 40px)',
    backgroundColor: '#0c0f1e',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '700',
    fontFamily: 'var(--font-title)',
    color: 'var(--text-main)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'var(--transition)',
  },
  form: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
    minHeight: 0,
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  },
  authGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '10px',
    marginTop: '6px',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    overflow: 'hidden',
    transition: 'var(--transition)',
  },
  iconBox: {
    width: '42px',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: '1px solid var(--border-color)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  input: {
    flex: 1,
    height: '42px',
    background: 'none',
    border: 'none',
    padding: '0 14px',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
  },
  textarea: {
    flex: 1,
    minHeight: '86px',
    background: 'none',
    border: 'none',
    padding: '10px 14px',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    lineHeight: '1.45',
    outline: 'none',
    width: '100%',
    resize: 'vertical',
    fontFamily: 'var(--font-body)',
  },
  authTextarea: {
    minHeight: '82px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    lineHeight: '1.45',
    outline: 'none',
    width: '100%',
    resize: 'vertical',
    fontFamily: 'var(--font-body)',
  },
  helpText: {
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
    lineHeight: '1.4',
  },
  errorText: {
    fontSize: '0.75rem',
    color: 'var(--error)',
    fontWeight: '500',
  },
  processBox: {
    backgroundColor: 'rgba(16, 22, 42, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
    padding: '16px',
  },
  processBoxTitle: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: 'auto',
    paddingTop: '8px',
    position: 'sticky',
    bottom: 0,
    backgroundColor: '#0c0f1e',
  },
  buttonSpinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderTop: '2px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin-slow 0.8s linear infinite',
  },
};
