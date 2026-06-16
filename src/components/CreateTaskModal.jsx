import React, { useState } from 'react';
import { Globe, Sparkles, X, Terminal, CheckCircle2, FolderOpen } from 'lucide-react';

export default function CreateTaskModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [url, setUrl] = useState('');
  const [seedUrls, setSeedUrls] = useState('');
  const [codebasePath, setCodebasePath] = useState('');
  const [isMobile, setIsMobile] = useState(false);
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

  const [aiModel, setAiModel] = useState('auto');
  const [userPrompt, setUserPrompt] = useState('');
  const [customUseCases, setCustomUseCases] = useState([]);

  const handleAddCustomUseCase = () => {
    setCustomUseCases([
      ...customUseCases,
      { title: '', description: '', test_cases: [] }
    ]);
  };

  const handleRemoveCustomUseCase = (index) => {
    setCustomUseCases(customUseCases.filter((_, i) => i !== index));
  };

  const handleUpdateUseCaseTitle = (index, value) => {
    const updated = [...customUseCases];
    updated[index].title = value;
    setCustomUseCases(updated);
  };

  const handleUpdateUseCaseDesc = (index, value) => {
    const updated = [...customUseCases];
    updated[index].description = value;
    setCustomUseCases(updated);
  };

  const handleAddCustomTestCase = (ucIndex) => {
    const updated = [...customUseCases];
    updated[ucIndex].test_cases.push({ title: '', steps: '', expected_result: '' });
    setCustomUseCases(updated);
  };

  const handleRemoveCustomTestCase = (ucIndex, tcIndex) => {
    const updated = [...customUseCases];
    updated[ucIndex].test_cases = updated[ucIndex].test_cases.filter((_, i) => i !== tcIndex);
    setCustomUseCases(updated);
  };

  const handleUpdateTestCase = (ucIndex, tcIndex, field, value) => {
    const updated = [...customUseCases];
    updated[ucIndex].test_cases[tcIndex][field] = value;
    setCustomUseCases(updated);
  };

  // Auto-check mobile webview viewport if target URL or codebase belongs to the mobile webview project
  React.useEffect(() => {
    if (
      url.includes('192.168.10.125:3000') ||
      codebasePath.toLowerCase().includes('ahoa')
    ) {
      setIsMobile(true);
    }
  }, [url, codebasePath]);

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
      is_mobile: isMobile,
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
      ai_model: aiModel,
      user_prompt: userPrompt.trim() || null,
      custom_use_cases_json: customUseCases.length > 0 
        ? JSON.stringify(customUseCases.filter(uc => uc.title.trim() !== ""))
        : null
    });
    setUrl('');
    setSeedUrls('');
    setCodebasePath('');
    setIsMobile(false);
    setAuthRequired(false);
    setAuthLoginUrl('');
    setAuthPostLoginUrl('');
    setProtectedUrls('');
    setAuthUsername('');
    setAuthPassword('');
    setAuthOtpCode('');
    setAuthOtpHint('');
    setAiModel('auto');
    setUserPrompt('');
    setCustomUseCases([]);
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
            <label style={styles.label}>AI Model Selection</label>
            <div style={styles.fieldRow}>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                disabled={isSubmitting}
                style={styles.select}
              >
                <option value="auto">Auto-Route (Based on available API Keys)</option>
                <option value="gemini-1.5-flash">Google Gemini (gemini-1.5-flash)</option>
                <option value="gpt-4o">OpenAI ChatGPT (gpt-4o)</option>
              </select>
            </div>
            <div style={styles.helpText}>Select which AI engine handles parallel sub-agents and reviews codebase tasks.</div>
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Additional Instructions / Prompts</label>
            <div style={styles.fieldRow}>
              <textarea
                rows={2}
                placeholder="e.g. Focus on checking responsive layout overflow. Test with standard credentials."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                disabled={isSubmitting}
                style={styles.textarea}
              />
            </div>
            <div style={styles.helpText}>Provide custom text instructions to instruct the AI agent to focus on specific pages, scenarios, or links.</div>
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
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={isMobile}
                onChange={(e) => setIsMobile(e.target.checked)}
                disabled={isSubmitting}
              />
              <span style={{ fontWeight: '600' }}>Emulate Mobile WebView / Viewport</span>
            </label>
            <div style={styles.helpText}>Enable if the site is designed exclusively for mobile/webview screens (prevents blank pages).</div>
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

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Custom Use Cases & Test Cases</label>
            <div style={styles.customContainer}>
              {customUseCases.map((uc, ucIdx) => (
                <div key={ucIdx} style={styles.customUseCaseCard}>
                  <div style={styles.customUseCaseHeader}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent)' }}>Use Case #{ucIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomUseCase(ucIdx)}
                      style={styles.removeBtn}
                    >
                      Remove Use Case
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Use Case Title (e.g. Navigation check)"
                    value={uc.title}
                    onChange={(e) => handleUpdateUseCaseTitle(ucIdx, e.target.value)}
                    style={styles.customInput}
                  />
                  <input
                    type="text"
                    placeholder="Use Case Description (optional)"
                    value={uc.description}
                    onChange={(e) => handleUpdateUseCaseDesc(ucIdx, e.target.value)}
                    style={styles.customInput}
                  />
                  
                  <div style={{ marginLeft: '12px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>Test Cases</span>
                      <button
                        type="button"
                        onClick={() => handleAddCustomTestCase(ucIdx)}
                        style={styles.addTestBtn}
                      >
                        + Add Test Case
                      </button>
                    </div>

                    {uc.test_cases.map((tc, tcIdx) => (
                      <div key={tcIdx} style={styles.customTestCaseCard}>
                        <div style={styles.customUseCaseHeader}>
                          <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--primary)' }}>Test Case #{tcIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomTestCase(ucIdx, tcIdx)}
                            style={styles.removeBtn}
                          >
                            Remove Test
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Test Title (e.g. Verify link redirects)"
                          value={tc.title}
                          onChange={(e) => handleUpdateTestCase(ucIdx, tcIdx, 'title', e.target.value)}
                          style={styles.customInputCompact}
                        />
                        <textarea
                          rows={2}
                          placeholder="Steps (e.g. 1. Click about link\n2. Verify header)"
                          value={tc.steps}
                          onChange={(e) => handleUpdateTestCase(ucIdx, tcIdx, 'steps', e.target.value)}
                          style={styles.customTextareaCompact}
                        />
                        <input
                          type="text"
                          placeholder="Expected Result (e.g. Reaches about page)"
                          value={tc.expected_result}
                          onChange={(e) => handleUpdateTestCase(ucIdx, tcIdx, 'expected_result', e.target.value)}
                          style={styles.customInputCompact}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddCustomUseCase}
                style={styles.addUseCaseBtn}
              >
                + Add Custom Use Case
              </button>
            </div>
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
  select: {
    flex: 1,
    height: '42px',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '0 14px',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(255,255,255,0.6)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    backgroundSize: '14px',
  },
  customContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '4px',
  },
  customUseCaseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  customUseCaseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--error)',
    fontSize: '0.7rem',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  addTestBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontSize: '0.75rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  addUseCaseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px dashed var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-main)',
    padding: '8px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition)',
    textAlign: 'center',
  },
  customTestCaseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
    padding: '10px',
    marginTop: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  customInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    height: '34px',
    padding: '0 10px',
    color: 'var(--text-main)',
    fontSize: '0.85rem',
    outline: 'none',
  },
  customInputCompact: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    height: '30px',
    padding: '0 8px',
    color: 'var(--text-main)',
    fontSize: '0.8rem',
    outline: 'none',
  },
  customTextareaCompact: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '6px 8px',
    color: 'var(--text-main)',
    fontSize: '0.8rem',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'var(--font-body)',
  },
};
