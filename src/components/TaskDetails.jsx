import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, ShieldAlert, CheckCircle2, XCircle, ChevronDown, ChevronUp, 
  HelpCircle, Lightbulb, Clock, Layers, Link as LinkIcon, Compass, Sparkles,
  AlertTriangle, Activity, Terminal, Download, Square, Globe
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

function getScreenshotUrl(screenshotPath) {
  if (!screenshotPath) return null;
  const parts = screenshotPath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const taskId = parts[parts.length - 2];
  const filename = parts[parts.length - 1];
  return `${API_BASE}/screenshots/${encodeURIComponent(taskId)}/${encodeURIComponent(filename)}`;
}

// ── Dummy data map ──────────────────────────────────────────────────────────
const DUMMY_MAP = {
  first_name:'John', firstname:'John', fname:'John',
  last_name:'Doe', lastname:'Doe', lname:'Doe', surname:'Doe',
  name:'John Doe', full_name:'John Doe', fullname:'John Doe',
  username:'johndoe_test', user:'johndoe_test',
  email:'john.doe@testmail.com', mail:'john.doe@testmail.com',
  phone:'+1-555-0100', mobile:'+1-555-0101', tel:'+1-555-0102',
  password:'Test@Secure#2024', confirm_password:'Test@Secure#2024',
  new_password:'NewPass@2024', old_password:'OldPass@2024',
  address:'123 Test Street', street:'456 Demo Ave', city:'New York',
  state:'NY', zip:'10001', zipcode:'10001', postal:'10001', country:'USA',
  company:'Acme Corp', organization:'Test Org', website:'https://example.com',
  date:'2024-06-15', dob:'1990-01-15', birthday:'1990-01-15', age:'30',
  title:'Mr.', subject:'Test Inquiry', message:'Automated test message.',
  description:'Sample description for testing.', comment:'QA test comment.',
  amount:'100.00', price:'99.99', quantity:'1', search:'test query',
};

function getDummyValue(fieldName) {
  if (!fieldName) return 'test_value';
  const lower = fieldName.toLowerCase().replace(/[-\s]/g, '_');
  if (DUMMY_MAP[lower]) return DUMMY_MAP[lower];
  for (const [k, v] of Object.entries(DUMMY_MAP)) {
    if (lower.includes(k)) return v;
  }
  if (lower.includes('email')) return 'john.doe@testmail.com';
  if (lower.includes('pass'))  return 'Test@Secure#2024';
  if (lower.includes('phone') || lower.includes('mobile')) return '+1-555-0100';
  if (lower.includes('name'))  return 'John Doe';
  if (lower.includes('date'))  return '2024-06-15';
  if (lower.includes('url') || lower.includes('link')) return 'https://example.com';
  return `demo_${lower}`;
}

function extractFormFields(test) {
  const combined = (test.steps || '') + ' ' + (test.error_message || '');
  
  if (combined.includes('JSON_DUMMY_DATA:')) {
    try {
      const parts = combined.split('JSON_DUMMY_DATA:');
      const jsonStr = parts[1].trim().split('\n')[0].trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed).map(([field, value]) => ({
          field: field,
          value: String(value)
        }));
      }
    } catch (e) {
      console.error('Failed to parse embedded JSON_DUMMY_DATA', e);
    }
  }

  const fieldSet = new Set();

  // List after "fields:" keyword
  const colonList = combined.match(/(?:fields?|inputs?)[\s:]+([^.\n]+)/gi);
  if (colonList) {
    colonList.forEach(function(m) {
      m.replace(/^(?:fields?|inputs?)[\s:]+/i, '').split(/[,;]/).forEach(function(f) {
        const c = f.trim().replace(/["']/g, '');
        if (c && c.length > 1 && c.length < 50) fieldSet.add(c);
      });
    });
  }

  // "fill 'field_name'" pattern
  const fillRe = /fill(?:ing|ed)?\s+(?:field\s+)?["']?([\w_-]+)["']?/gi;
  let fm;
  while ((fm = fillRe.exec(combined)) !== null) fieldSet.add(fm[1].trim());

  // snake_case / kebab-case tokens in error message
  const tokenRe = /\b([a-z][a-z0-9]*(?:[_-][a-z0-9]+)+)\b/gi;
  let tm;
  while ((tm = tokenRe.exec(test.error_message || '')) !== null) {
    const v = tm[1];
    if (v.length > 3 && v.length < 40 && !['http','https','null','true','false'].includes(v.toLowerCase()))
      fieldSet.add(v);
  }

  // Capitalised words after colon in error (e.g. "John, Doe")
  const textNoJson = combined.replace(/JSON_DUMMY_DATA:.*$/, '');
  const capRe = /:\s*([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*)/g;
  let cm;
  while ((cm = capRe.exec(textNoJson)) !== null) {
    cm[1].split(',').forEach(function(w) {
      const c = w.trim();
      if (c.length > 1) fieldSet.add(c);
    });
  }

  return Array.from(fieldSet)
    .filter(function(f) { return f && f.length > 1 && !/^\d+$/.test(f); })
    .slice(0, 15)
    .map(function(f) { return { field: f, value: getDummyValue(f) }; });
}

// Find screenshot URL from errors linked to a test case
function findTestScreenshot(testId, errors) {
  if (!testId || !errors) return null;
  const linked = errors.find(e => e.test_case_id === testId && e.screenshot_path);
  return linked ? getScreenshotUrl(linked.screenshot_path) : null;
}

export default function TaskDetails({ taskDetails, isDetailsLoading, onRefreshDetails, onStartTest, onStopTest, activeTab = 'test-cases', setActiveTab, filterPageUrl, setFilterPageUrl }) {
  const [selectedErrorId, setSelectedErrorId] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [resumeUsername, setResumeUsername] = useState('');
  const [resumePassword, setResumePassword] = useState('');
  const [resumeOtpCode, setResumeOtpCode] = useState('');
  const [resumeLoginUrl, setResumeLoginUrl] = useState('');
  const [resumePostLoginUrl, setResumePostLoginUrl] = useState('');
  const [resumeError, setResumeError] = useState('');
  const [resumeLoading, setResumeLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);

  const handleStop = async () => {
    if (!task?.id) return;
    setStopLoading(true);
    try {
      if (typeof onStopTest === 'function') {
        await onStopTest(task.id);
      } else {
        const res = await fetch(`${API_BASE}/tasks/${task.id}/stop`, { method: 'POST' });
        if (!res.ok) {
          throw new Error('Failed to stop task.');
        }
      }
      if (typeof onRefreshDetails === 'function') {
        onRefreshDetails();
      }
    } catch (err) {
      console.error(err);
      alert('Error stopping task: ' + err.message);
    } finally {
      setStopLoading(false);
    }
  };
  const identifierInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const otpInputRef = useRef(null);


  

  const [expandedUseCases, setExpandedUseCases] = useState({});
  const [expandedTestCases, setExpandedTestCases] = useState({});
  const codeReviewRef = useRef(null);

  // Destructure props BEFORE any useEffect that references these variables
  const { task = {}, use_cases = [], test_cases = [], errors = [], suggestions = [], codebase, auth, auth_state, seeds, agent_states = [] } = taskDetails || {};

  const filteredTestCases = filterPageUrl
    ? test_cases.filter(tc => tc.page_url === filterPageUrl)
    : test_cases;

  const filteredUseCases = filterPageUrl
    ? use_cases.filter(uc => filteredTestCases.some(tc => tc.use_case_id === uc.id))
    : use_cases;

  const filteredErrors = filterPageUrl
    ? errors.filter(e => e.page_url === filterPageUrl)
    : errors;

  const selectedAgent = agent_states.find(state => state.id === selectedAgentId);
  const selectedError = filteredErrors.find(err => err.id === selectedErrorId) || filteredErrors[0] || null;
  const agentWarningCount = agent_states.reduce((count, state) => count + (state.errors_found || 0), 0);
  const orchestratorAgent = agent_states.find(state => state.agent_name === 'Orchestrator');
  const requiredAuthFields = (() => {
    const rawFields = auth_state?.required_fields || auth?.auth_required_fields;
    if (!rawFields) return [];
    try {
      const parsed = Array.isArray(rawFields) ? rawFields : JSON.parse(rawFields);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const missingAuthFields = requiredAuthFields.length > 0 ? requiredAuthFields : [];
  const otpOnlyResume = missingAuthFields.length === 1 && missingAuthFields[0] === 'otp';
  const normalizedAuthFields = Array.from(new Set(missingAuthFields.map(field => String(field || '').toLowerCase())));
  const authFlowHint = auth_state?.flow || auth?.auth_flow || (() => {
    const joined = normalizedAuthFields.join(' ');
    if (joined.includes('mobile') && joined.includes('otp')) return 'mobile_otp';
    if (joined.includes('email') && joined.includes('otp')) return 'email_otp';
    if (joined.includes('password') && joined.includes('otp')) return 'password_reset';
    if (normalizedAuthFields.includes('otp')) return 'otp';
    if (normalizedAuthFields.includes('password')) return 'password';
    if (normalizedAuthFields.some(field => ['mobile', 'email', 'username'].includes(field))) return 'identifier';
    return 'general';
  })();
  const visibleResumeFields = (() => {
    if (!normalizedAuthFields.length) {
      return ['identifier', 'password', 'otp', 'loginUrl', 'postLoginUrl'];
    }
    const fields = [];
    if (normalizedAuthFields.some(field => ['mobile', 'email', 'username'].includes(field))) fields.push('identifier');
    if (normalizedAuthFields.includes('password')) fields.push('password');
    if (normalizedAuthFields.includes('otp')) fields.push('otp');
    if (normalizedAuthFields.includes('challenge')) fields.push('otp');
    if (auth_state?.login_url || auth?.auth_login_url || auth?.auth_next_step) fields.push('loginUrl');
    if (auth_state?.post_login_url || auth?.auth_post_login_url || auth?.auth_next_step) fields.push('postLoginUrl');
    return Array.from(new Set(fields));
  })();
  const needsInput = task.status === 'needs_input' || Boolean(auth_state?.next_step || auth?.auth_next_step) || (auth_state?.required ?? auth?.auth_required ? (!auth_state?.username && !auth?.auth_username && !auth_state?.password_set && !auth?.auth_password) : false);
  const authPrompt = auth_state?.next_step || auth?.auth_next_step || (requiredAuthFields.length ? `Please provide: ${requiredAuthFields.join(', ')}` : '');
  const authHelperText = (() => {
    if (authFlowHint === 'mobile_otp') {
      return 'Enter the OTP or code sent to the mobile number on the account.';
    }
    if (authFlowHint === 'email_otp') {
      return 'Enter the OTP or verification code sent to the email address.';
    }
    if (authFlowHint === 'password_reset') {
      return 'Enter the new password and any verification code required to complete the reset.';
    }
    if (authFlowHint === 'otp') {
      return 'Enter the OTP or security code sent by the website.';
    }
    if (authFlowHint === 'password') {
      return 'Enter the password for the current account.';
    }
    if (authFlowHint === 'identifier') {
      return 'Enter the login identifier the site expects.';
    }
    return 'Provide the missing authentication detail so testing can continue.';
  })();
  const discoveredPages = Array.from(
    new Set(
      test_cases
        .map(test => test.page_url)
        .filter(Boolean)
    )
  );
  const seededPages = seeds?.seed_urls_json ? JSON.parse(seeds.seed_urls_json) : [];
  const discoveredOnlyPages = discoveredPages.filter(pageUrl => !seededPages.includes(pageUrl));

  // Scroll code review into view when a new error is selected and set default selected error
  useEffect(() => {
    if (codeReviewRef.current) {
      codeReviewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (errors && errors.length > 0 && selectedErrorId === null) {
      setSelectedErrorId(errors[0].id);
    }
    if (task.status === 'failed' && orchestratorAgent && selectedAgentId !== orchestratorAgent.id) {
      setSelectedAgentId(orchestratorAgent.id);
    }
  }, [selectedErrorId, errors, task.status, orchestratorAgent, selectedAgentId]);

  useEffect(() => {
    if (auth) {
      setResumeUsername(auth_state?.username || auth.auth_username || '');
      setResumePassword(auth_state?.password_set ? (auth.auth_password || '') : '');
      setResumeOtpCode(auth_state?.otp_set ? (auth.auth_otp_code || '') : '');
      setResumeLoginUrl(auth_state?.login_url || auth.auth_login_url || '');
      setResumePostLoginUrl(auth_state?.post_login_url || auth.auth_post_login_url || '');
    }
  }, [auth, auth_state]);

  useEffect(() => {
    if (!needsInput) return;
    const focusTarget =
      (visibleResumeFields.includes('identifier') && identifierInputRef.current) ||
      (visibleResumeFields.includes('password') && passwordInputRef.current) ||
      (visibleResumeFields.includes('otp') && otpInputRef.current);
    if (focusTarget && typeof focusTarget.focus === 'function') {
      const timer = window.setTimeout(() => focusTarget.focus(), 50);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [needsInput, visibleResumeFields]);
  if (isDetailsLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <div style={styles.loadingText}>Fetching Detailed Diagnostics...</div>
      </div>
    );
  }

  // Toggle Accordion Helpers
  const toggleUseCase = (id) => {
    setExpandedUseCases(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTestCase = (id) => {
    setExpandedTestCases(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleResumeWithAuth = async () => {
    setResumeError('');
    if (!task?.id) return;
    if (!resumeUsername.trim() && normalizedAuthFields.some(field => ['mobile', 'email', 'username'].includes(field))) {
      setResumeError('A login identifier is required to resume the run.');
      return;
    }
    if (!resumePassword.trim() && normalizedAuthFields.includes('password')) {
      setResumeError('Password is required to resume the run.');
      return;
    }
    if (!resumeOtpCode.trim() && normalizedAuthFields.includes('otp')) {
      setResumeError('OTP / security code is required to resume the run.');
      return;
    }
    setResumeLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/${task.id}/input`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_required: true,
          auth_login_url: resumeLoginUrl.trim(),
          auth_post_login_url: resumePostLoginUrl.trim(),
          auth_username: resumeUsername.trim(),
          auth_password: resumePassword,
          auth_otp_code: resumeOtpCode.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to save authentication details.');
      }
      const resumeRes = await fetch(`${API_BASE}/tasks/${task.id}/resume`, { method: 'POST' });
      if (!resumeRes.ok) {
        throw new Error('Failed to resume the task.');
      }
    } catch (err) {
      setResumeError(err.message || 'Unable to resume task.');
    } finally {
      setResumeLoading(false);
    }
  };

  const isRunning = ['crawling', 'generating_test_cases', 'running_tests', 'pending'].includes(task.status);

  // Status-specific running indicator
  const renderAgentStatus = () => {
    switch (task.status) {
      case 'pending':
        return (
          <div style={styles.agentBox}>
            <Sparkles className="animate-spin" size={24} color="var(--text-muted)" />
            <div>
              <h4 style={styles.agentBoxTitle}>Task Queued</h4>
              <p style={styles.agentBoxDesc}>AI agent is initializing testing environment...</p>
            </div>
          </div>
        );
      case 'planned':
        return (
          <div className="glass-panel" style={{ ...styles.agentBox, border: '1px dashed var(--primary-glow)', backgroundColor: 'rgba(99, 102, 241, 0.05)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Compass size={24} color="var(--primary)" />
              <div>
                <h4 style={styles.agentBoxTitle}>Test Suite Planned</h4>
                <p style={styles.agentBoxDesc}>
                  AI agent crawled the site and generated <strong>{test_cases.length} test cases</strong> across <strong>{use_cases.length} use cases</strong>. Ready for validation execution.
                </p>
              </div>
            </div>
            <button
              onClick={() => onStartTest && onStartTest(task.id)}
              className="btn-primary"
              style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <Sparkles size={16} />
              <span>Start Automated Test Suite</span>
            </button>
          </div>
        );
      case 'crawling':
        return (
          <div style={styles.agentBox}>
            <div className="agent-spinner" style={styles.miniSpinner} />
            <div>
              <h4 style={styles.agentBoxTitle}>Crawling Site Structure</h4>
              <p style={styles.agentBoxDesc}>Scanning DOM elements, anchor links, headers, and inputs on {task.url}...</p>
            </div>
          </div>
        );
      case 'generating_test_cases':
        return (
          <div style={styles.agentBox}>
            <div className="agent-spinner" style={{ ...styles.miniSpinner, borderTopColor: '#a78bfa' }} />
            <div>
              <h4 style={styles.agentBoxTitle}>Synthesizing Test Scenarios</h4>
              <p style={styles.agentBoxDesc}>Generative AI is building use cases and validation scripts for form flows and layouts...</p>
            </div>
          </div>
        );
      case 'running_tests':
        return (
          <div style={styles.agentBox}>
            <div className="agent-spinner" style={{ ...styles.miniSpinner, borderTopColor: '#2dd4bf' }} />
            <div>
              <h4 style={styles.agentBoxTitle}>Running Simulated Validations</h4>
              <p style={styles.agentBoxDesc}>Executing HTTP integrity checks and viewport breakpoint audits in real-time...</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in" style={styles.container}>
      {/* Title block */}
      <div className="glass-panel" style={styles.header}>
        <div style={styles.headerTitleRow}>
          <div>
            <span style={styles.domainSub}>TEST DIAGNOSTICS FOR</span>
            <h2 style={styles.title}>{task.url}</h2>
            {task.status === 'failed' && orchestratorAgent?.log_output && (
              <div style={styles.failureBanner}>
                <AlertTriangle size={14} color="var(--error)" />
                <span>{orchestratorAgent.log_output.split('\n').filter(Boolean).slice(-1)[0]}</span>
              </div>
            )}
            {task.status === 'stopped' && (
              <div style={{ ...styles.failureBanner, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#fbbf24' }}>
                <AlertTriangle size={14} color="#fbbf24" />
                <span>Task run was cancelled/stopped by user.</span>
              </div>
            )}
            {(discoveredOnlyPages.length > 0 || seededPages.length > 0) && (
              <div style={styles.pageProvenanceGrid}>
                {discoveredOnlyPages.length > 0 && (
                  <div style={styles.seedPanel}>
                    <span style={styles.pagePreviewLabel}>Discovered by crawl</span>
                    <div style={styles.pagePreviewList}>
                      {discoveredOnlyPages.slice(0, 8).map(pageUrl => (
                        <span key={pageUrl} style={styles.pagePreviewChip} title={pageUrl}>
                          {pageUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {seededPages.length > 0 && (
                  <div style={styles.seedPanel}>
                    <span style={styles.pagePreviewLabel}>Seeded manually</span>
                    <div style={styles.pagePreviewList}>
                      {seededPages.slice(0, 8).map(seedUrl => (
                        <span key={seedUrl} style={styles.pagePreviewChip} title={seedUrl}>
                          {seedUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {auth?.auth_required && (
              <div style={styles.seedPanel}>
                <span style={styles.pagePreviewLabel}>Auth session</span>
                <div style={styles.authSummary}>
                  <span>{auth.auth_login_url || 'Using start URL session'}</span>
                  <span>{auth.auth_username ? `User: ${auth.auth_username}` : 'No username stored'}</span>
                  <span>{auth.auth_otp_hint ? `OTP: ${auth.auth_otp_hint}` : 'No OTP hint stored'}</span>
                </div>
              </div>
            )}
            {codebase && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'monospace' }}>
                Codebase Path: {codebase.local_path} ({codebase.framework_type})
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {task.is_mobile && (
              <span className="status-badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                Viewport Emulation: Mobile WebView
              </span>
            )}
            <span className={`status-badge status-${task.status || 'unknown'}`}>
              {(task.status || 'unknown').replace(/_/g, ' ')}
            </span>
            {task.status === 'planned' && (
              <button
                onClick={() => onStartTest && onStartTest(task.id)}
                style={styles.startBtn}
                title="Start Playwright Test Execution"
              >
                <Sparkles size={10} fill="currentColor" />
                <span>Start Test</span>
              </button>
            )}
            {isRunning && (
              <button
                onClick={handleStop}
                disabled={stopLoading}
                style={styles.stopBtn}
                title="Stop / Cancel active test run"
              >
                <Square size={10} fill="currentColor" />
                {stopLoading ? 'Stopping...' : 'Stop'}
              </button>
            )}
            {task.id && (
              <a
                href={`${API_BASE}/tasks/${task.id}/report.xlsx`}
                download
                style={styles.csvDownloadBtn}
                title="Download Excel report"
              >
                <Download size={13} />
                Excel
              </a>
            )}
          </div>
        </div>
      </div>

      {renderAgentStatus()}

      {needsInput && (
        <div className="glass-panel" style={styles.agentPanel}>
          <h4 style={styles.agentPanelTitle}>
            <Terminal size={14} color="var(--primary)" />
            <span>Authentication required to continue</span>
          </h4>
          {authPrompt && <div style={styles.authPrompt}>{authPrompt}</div>}
          <div style={styles.authHelper}>{authHelperText}</div>
          <div style={styles.resumeGrid}>
            {visibleResumeFields.includes('identifier') && (
              <input
                type="text"
                placeholder="Username / email / mobile"
                value={resumeUsername}
                onChange={(e) => setResumeUsername(e.target.value)}
                ref={identifierInputRef}
                style={styles.resumeInput}
                disabled={resumeLoading}
              />
            )}
            {visibleResumeFields.includes('password') && (
              <input
                type="password"
                placeholder="Password"
                value={resumePassword}
                onChange={(e) => setResumePassword(e.target.value)}
                ref={passwordInputRef}
                style={styles.resumeInput}
                disabled={resumeLoading}
              />
            )}
            {visibleResumeFields.includes('otp') && (
              <input
                type="text"
                placeholder="OTP / security code"
                value={resumeOtpCode}
                onChange={(e) => setResumeOtpCode(e.target.value)}
                ref={otpInputRef}
                style={styles.resumeInput}
                disabled={resumeLoading}
              />
            )}
            {otpOnlyResume && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleResumeWithAuth}
                disabled={resumeLoading}
                style={styles.otpQuickAction}
              >
                {resumeLoading ? 'Resuming...' : 'Resume with OTP'}
              </button>
            )}
            {visibleResumeFields.includes('loginUrl') && (
              <input
                type="text"
                placeholder="Login page URL"
                value={resumeLoginUrl}
                onChange={(e) => setResumeLoginUrl(e.target.value)}
                style={styles.resumeInput}
                disabled={resumeLoading}
              />
            )}
            {visibleResumeFields.includes('postLoginUrl') && (
              <input
                type="text"
                placeholder="Post-login URL"
                value={resumePostLoginUrl}
                onChange={(e) => setResumePostLoginUrl(e.target.value)}
                style={styles.resumeInput}
                disabled={resumeLoading}
              />
            )}
          </div>
          {resumeError && <div style={styles.resumeError}>{resumeError}</div>}
          {!otpOnlyResume && (
            <button type="button" className="btn-primary" onClick={handleResumeWithAuth} disabled={resumeLoading} style={{ marginTop: '12px' }}>
              {resumeLoading ? 'Resuming...' : 'Save and Resume Testing'}
            </button>
          )}
        </div>
      )}

      {/* Sub-Agent Monitoring Panel */}
      {agent_states.length > 0 && (
        <div className="glass-panel" style={styles.agentPanel}>
          <h4 style={styles.agentPanelTitle}>
            <Activity size={14} color="var(--primary)" />
            <span>Active AI Sub-Agents</span>
          </h4>
          <div style={styles.agentGrid}>
            {agent_states.map(state => {
              const isRunning = state.status === 'running';
              const isCompleted = state.status === 'completed';
              const isFailed = state.status === 'failed';
              
              return (
                <button
                  key={state.id}
                  type="button"
                  onClick={() => setSelectedAgentId(selectedAgentId === state.id ? null : state.id)}
                  style={{
                  ...styles.agentStateCard,
                  borderLeft: isRunning ? '3px solid var(--accent)' : isCompleted ? '3px solid var(--success)' : isFailed ? '3px solid var(--error)' : '3px solid var(--text-dim)',
                  borderColor: selectedAgentId === state.id ? 'rgba(99, 102, 241, 0.55)' : 'rgba(255, 255, 255, 0.03)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}>
                  <div style={styles.agentCardHeader}>
                    <span style={styles.agentCardName}>{state.agent_name.replace('_', ' ')}</span>
                    <span className={`status-badge status-${state.status}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                      {state.status}
                    </span>
                  </div>
                  
                  {state.log_output && (
                    <div style={styles.agentLogBox}>
                      <pre style={styles.agentLogText}>
                        {state.log_output.split('\n').filter(Boolean).slice(-2).join('\n')}
                      </pre>
                    </div>
                  )}
                  
                  {state.errors_found > 0 && (
                    <div style={styles.agentErrorIndicator}>
                      <ShieldAlert size={10} /> {state.errors_found} agent warning{state.errors_found > 1 ? 's' : ''}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {selectedAgent && (
            <div style={styles.agentDetailBox}>
              <div style={styles.agentDetailHeader}>
                <span>{selectedAgent.agent_name.replace('_', ' ')} details</span>
                <span>{selectedAgent.errors_found || 0} warning{selectedAgent.errors_found === 1 ? '' : 's'}</span>
              </div>
              <pre style={styles.agentDetailLog}>
                {selectedAgent.log_output || 'No log output yet.'}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tested Pages Section */}
      {discoveredPages.length > 0 && (
        <div className="glass-panel" style={styles.pagesTestedPanel}>
          <h4 style={styles.agentPanelTitle}>
            <Globe size={14} color="var(--primary)" />
            <span>Tested Pages ({discoveredPages.length})</span>
          </h4>
          <div style={styles.pagesList}>
            {discoveredPages.map((pageUrl, idx) => (
              <div key={idx} style={styles.pageItemRow}>
                <span style={styles.pageItemNumber}>#{idx + 1}</span>
                <a 
                  href={pageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={styles.pageItemLink}
                >
                  {pageUrl}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div id="task-details-tabs" style={styles.tabsRow}>
        <button type="button"
          onClick={() => setActiveTab('test-cases')}
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === 'test-cases' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'test-cases' ? 'var(--text-main)' : 'var(--text-muted)',
          }}
        >
          <Layers size={16} />
          <span>Test Cases ({filterPageUrl ? `${filteredTestCases.length}/${test_cases.length}` : test_cases.length})</span>
        </button>

        <button type="button"
          onClick={() => setActiveTab('errors')}
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === 'errors' ? '2px solid var(--error)' : '2px solid transparent',
            color: activeTab === 'errors' ? 'var(--text-main)' : 'var(--text-muted)',
          }}
        >
          <ShieldAlert size={16} />
          <span>Browser Errors ({filterPageUrl ? `${filteredErrors.length}/${errors.length}` : errors.length})</span>
        </button>

        <button type="button"
          onClick={() => setActiveTab('suggestions')}
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === 'suggestions' ? '2px solid var(--warning)' : '2px solid transparent',
            color: activeTab === 'suggestions' ? 'var(--text-main)' : 'var(--text-muted)',
          }}
        >
          <Lightbulb size={16} />
          <span>AI Suggestions ({suggestions.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div style={styles.tabContent}>
        {filterPageUrl && (
          <div style={styles.filterAlert}>
            <div style={styles.filterAlertLeft}>
              <span style={styles.filterAlertDot} />
              <span style={styles.filterAlertText}>
                Showing results filtered for page: <strong style={{ color: '#fff' }}>{filterPageUrl.replace(/^https?:\/\//, '')}</strong>
              </span>
            </div>
            <button 
              type="button" 
              onClick={() => setFilterPageUrl(null)} 
              style={styles.clearFilterBtn}
            >
              Show All Pages
            </button>
          </div>
        )}

        {/* TAB 1: TEST CASES */}
        {activeTab === 'test-cases' && (
          <div className="animate-slide-in">
            {filteredUseCases.length === 0 ? (
              <div style={styles.noDataBox}>
                <Layers size={36} color="var(--text-dim)" />
                <div>{filterPageUrl ? "No test cases generated for this page." : "No test cases generated yet."}</div>
              </div>
            ) : (
              filteredUseCases.map(uc => {
                const ucTests = filteredTestCases.filter(t => t.use_case_id === uc.id);
                const isUcExpanded = expandedUseCases[uc.id] !== false; // Expanded by default

                return (
                  <div key={uc.id} className="glass-panel" style={styles.useCaseCard}>
                    <div onClick={() => toggleUseCase(uc.id)} style={styles.useCaseHeader}>
                      <div>
                        <h3 style={styles.useCaseTitle}>{uc.title}</h3>
                        {uc.description && <p style={styles.useCaseDesc}>{uc.description}</p>}
                      </div>
                      {isUcExpanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                    </div>

                    {isUcExpanded && (
                      <div style={styles.testList}>
                        {ucTests.map(test => {
                          const isTestExpanded = expandedTestCases[test.id] ?? (test.status === 'running' || test.status === 'failed');
                          const hasPassed = test.status === 'passed';
                          const hasFailed = test.status === 'failed';
                          const isRunningTest = test.status === 'running';
                          const isPending = test.status === 'pending';

                          return (
                            <div key={test.id} style={styles.testItem}>
                              <div 
                                onClick={() => toggleTestCase(test.id)} 
                                style={styles.testHeader}
                              >
                                <div style={styles.testTitleCol}>
                                  {hasPassed && <CheckCircle2 size={16} color="var(--success)" />}
                                  {hasFailed && <XCircle size={16} color="var(--error)" />}
                                  {isRunningTest && (
                                    <div 
                                      className="agent-spinner" 
                                      style={{ 
                                        width: '14px', 
                                        height: '14px', 
                                        borderWidth: '2px', 
                                        borderTopColor: 'var(--accent)',
                                        borderRadius: '50%',
                                        display: 'inline-block'
                                      }} 
                                    />
                                  )}
                                  {isPending && <Clock size={16} color="var(--info)" className="spin-effect" />}
                                  <span style={{ 
                                    ...styles.testTitle,
                                    textDecoration: isPending ? 'none' : 'none'
                                  }}>
                                    {test.title}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  {test.execution_time && (
                                    <span style={styles.execTime}>
                                      <Clock size={12} /> {test.execution_time}s
                                    </span>
                                  )}
                                  <span className={`status-badge status-${test.status}`} style={{ fontSize: '0.6rem' }}>
                                    {test.status}
                                  </span>
                                  {isTestExpanded ? <ChevronUp size={16} color="var(--text-dim)" /> : <ChevronDown size={16} color="var(--text-dim)" />}
                                </div>
                              </div>

                              {isTestExpanded && (
                                <div style={styles.testBody}>
                                  {/* Steps */}
                                  <div style={styles.stepBlock}>
                                    <div style={styles.bodyLabel}>Steps to Execute:</div>
                                    <pre style={styles.stepsText}>{test.steps}</pre>
                                  </div>
                                  
                                  {/* Expected Result */}
                                  <div style={styles.stepBlock}>
                                    <div style={styles.bodyLabel}>Expected Behavior:</div>
                                    <div style={styles.bodyContent}>{test.expected_result}</div>
                                  </div>

                                  {/* Error Details */}
                                  {test.error_message && (
                                    <div style={styles.errorReportBox}>
                                      <div style={styles.errorLabel}>
                                        <AlertTriangle size={14} /> Diagnostic Error Message:
                                      </div>
                                      <div style={styles.errorContent}>{test.error_message}</div>
                                    </div>
                                  )}

                                  {/* Dummy Data Used */}
                                  {(() => {
                                    const fields = extractFormFields(test);
                                    if (!fields.length) return null;
                                    return (
                                      <div style={styles.dummyDataBox}>
                                        <div style={styles.dummyDataLabel}>
                                          📋 Dummy Data Used in This Test
                                        </div>
                                        <div style={styles.dummyDataTable}>
                                          <div style={styles.dummyDataHeaderRow}>
                                            <span style={styles.dummyCol1}>Field Name</span>
                                            <span style={styles.dummyCol2}>Dummy Value Used</span>
                                            <span style={styles.dummyCol3}>Type Hint</span>
                                          </div>
                                          {fields.map(({ field, value }) => {
                                            const lower = field.toLowerCase();
                                            const typeHint =
                                              lower.includes('email') ? 'Email' :
                                              lower.includes('pass') ? 'Password' :
                                              lower.includes('phone') || lower.includes('mobile') ? 'Phone' :
                                              lower.includes('name') ? 'Name' :
                                              lower.includes('date') || lower.includes('dob') ? 'Date' :
                                              lower.includes('address') || lower.includes('city') || lower.includes('zip') ? 'Address' :
                                              lower.includes('url') || lower.includes('website') ? 'URL' :
                                              'Text';
                                            return (
                                              <div key={field} style={styles.dummyDataRow}>
                                                <span style={styles.dummyCol1}>
                                                  <code style={styles.dummyFieldCode}>{field}</code>
                                                </span>
                                                <span style={styles.dummyCol2}>
                                                  <span style={styles.dummyValue}>{value}</span>
                                                </span>
                                                <span style={styles.dummyCol3}>
                                                  <span style={styles.dummyTypeBadge}>{typeHint}</span>
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Test Case Screenshot */}
                                  {(() => {
                                    const shotUrl = findTestScreenshot(test.id, errors);
                                    if (!shotUrl) return null;
                                    return (
                                      <div style={styles.testScreenshotBox}>
                                        <div style={styles.dummyDataLabel}>
                                          📸 Test Execution Screenshot
                                        </div>
                                        <img
                                          src={shotUrl}
                                          alt={`Screenshot for ${test.title}`}
                                          style={styles.testScreenshotImg}
                                          onError={e => { e.target.style.display = 'none'; }}
                                        />
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {ucTests.length === 0 && (
                          <div style={styles.emptySubText}>Preparing tests for this use case...</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: ERRORS FOUND WITH CODE REVIEW SPLIT SCREEN */}
        {activeTab === 'errors' && (
          <div className="animate-slide-in">
            {filteredErrors.length === 0 ? (
              <div className="glass-panel" style={styles.noIssuesBox}>
                <CheckCircle2 size={40} color="var(--success)" style={{ marginBottom: '10px' }} />
                <h4 style={{ color: 'var(--success)', fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>{filterPageUrl ? "No Page Bugs" : "No Bugs Detected"}</h4>
                <p style={styles.noIssuesDesc}>{filterPageUrl ? "No errors or violations were reported for this specific page." : "Congratulations! No critical errors or test violations were reported for this site version."}</p>
                {agentWarningCount > 0 && !filterPageUrl && (
                  <p style={styles.noIssuesDesc}>
                    {agentWarningCount} sub-agent warning{agentWarningCount > 1 ? 's are' : ' is'} available in the Active AI Sub-Agents panel above.
                  </p>
                )}
              </div>
            ) : (
              <div style={styles.splitWorkspace}>
                {/* Left Column: Errors list */}
                <div style={styles.errorsListCol}>
                  {filteredErrors.map(err => {
                    const relatedTest = filteredTestCases.find(test => test.id === err.test_case_id);
                    const failureSummary = err.message.includes('.') ? err.message.split('.').slice(0, 1).join('.').trim() : err.message;
                    return (
                      <button
                        key={err.id}
                        onClick={() => setSelectedErrorId(err.id)}
                        className="glass-panel animate-fade-in"
                        style={{
                          ...styles.errorListItem,
                          border: selectedErrorId === err.id ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: selectedErrorId === err.id ? 'rgba(99, 102, 241, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left'
                        }}
                        type="button"
                        >
                        <div style={styles.errorHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <XCircle size={16} color="var(--error)" />
                            <span style={styles.errorHeadline}>{failureSummary}</span>
                          </div>
                          <span className={`severity-badge severity-${err.severity}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                            {err.severity}
                          </span>
                        </div>
                        
                        <p style={styles.errorDescCompact}>
                          {relatedTest ? relatedTest.title : err.message}
                        </p>
                        
                        <div style={styles.errorUrlText}>URL: {err.page_url}</div>
                      </button>
                    );
                  })}
                </div>
                
                {/* Right Column: Mapped Code & Fix */}
                <div className="glass-panel" style={styles.codeReviewCol} ref={codeReviewRef}>
                  {(() => {
                    const activeErr = selectedError;
                    if (!activeErr) return null;
                    
                    const ref = activeErr.code_reference;
                    const screenshotUrl = getScreenshotUrl(activeErr.screenshot_path);
                    const activeTest = test_cases.find(test => test.id === activeErr.test_case_id);
                    if (!ref) {
                      return (
                        <div style={styles.noCodeRefBox}>
                          <div style={styles.failureDetailBox}>
                            <div style={styles.codeBlockHeader}>Failure Details</div>
                            <div style={styles.failureDetailGrid}>
                              <div>
                                <div style={styles.failureLabel}>Reason</div>
                                <div style={styles.failureValue}>{activeErr.message}</div>
                              </div>
                              <div>
                                <div style={styles.failureLabel}>Severity</div>
                                <div style={styles.failureValue}>{activeErr.severity}</div>
                              </div>
                              <div>
                                <div style={styles.failureLabel}>Page URL</div>
                                <div style={styles.failureValue}>{activeErr.page_url}</div>
                              </div>
                              {activeTest && (
                                <>
                                  <div>
                                    <div style={styles.failureLabel}>Test Title</div>
                                    <div style={styles.failureValue}>{activeTest.title}</div>
                                  </div>
                                  <div>
                                    <div style={styles.failureLabel}>Expected Result</div>
                                    <div style={styles.failureValue}>{activeTest.expected_result || 'Not provided'}</div>
                                  </div>
                                  <div>
                                    <div style={styles.failureLabel}>Steps</div>
                                    <div style={styles.failureValue}>{activeTest.steps || 'Not provided'}</div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          {screenshotUrl && (
                            <div style={styles.screenshotBlock}>
                              <div style={styles.codeBlockHeader}>Failure Screenshot</div>
                              <img src={screenshotUrl} alt="Captured failure screenshot" style={styles.screenshotImage} />
                            </div>
                          )}
                          <Terminal size={32} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
                          <div>No codebase reference mapped</div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Specify a valid codebase path to run the automated CodeReview agent.
                          </p>
                        </div>
                      );
                    }
                    
                    return (
                      <div style={styles.codeReviewDetail}>
                        <div style={styles.codeReviewHeader}>
                          <div style={styles.codeFileLabel}>
                            <span style={styles.codeFileLabelText}>{ref.file_path}</span>
                            <span style={styles.codeLinesLabel}>Lines {ref.start_line}-{ref.end_line}</span>
                          </div>
                        </div>

                        {screenshotUrl && (
                          <div style={styles.screenshotBlock}>
                            <div style={styles.codeBlockHeader}>Failure Screenshot</div>
                            <img src={screenshotUrl} alt="Captured failure screenshot" style={styles.screenshotImage} />
                          </div>
                        )}
                        
                        <div style={styles.codeSnippetBlock}>
                          <div style={styles.codeBlockHeader}>Original Source Snippet</div>
                          <pre style={styles.codeText}>{ref.code_snippet}</pre>
                        </div>
                        
                        {ref.proposed_fix && (
                          <div style={styles.proposedFixBlock}>
                            <div style={styles.codeBlockHeaderFix}>AI Code Review Proposed Fix</div>
                            <pre style={styles.codeTextFix}>{ref.proposed_fix}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUGGESTIONS */}
        {activeTab === 'suggestions' && (
          <div className="animate-slide-in">
            {suggestions.length === 0 ? (
              <div style={styles.noDataBox}>
                <Lightbulb size={36} color="var(--text-dim)" />
                <div>No suggestions generated yet.</div>
              </div>
            ) : (
              suggestions.map(sug => (
                <div key={sug.id} className="glass-panel" style={styles.sugCard}>
                  <div style={styles.sugHeader}>
                    <div style={styles.sugTitleBox}>
                      <Lightbulb size={18} color="var(--warning)" style={{ flexShrink: 0 }} />
                      <h4 style={styles.sugTitle}>{sug.title}</h4>
                    </div>
                    <span className={`priority-badge priority-${sug.priority}`}>
                      {sug.priority} Priority
                    </span>
                  </div>
                  <p style={styles.sugDesc}>{sug.description}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Internal animations setup */}
      <style>{`
        .agent-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255, 255, 255, 0.05);
          border-top: 3px solid var(--primary);
          border-radius: 50%;
          animation: spin-slow 1s linear infinite;
        }
        .spin-effect {
          animation: spin-slow 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}

const styles = {
  filterAlert: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '8px',
    marginBottom: '16px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  filterAlertLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterAlertDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#818cf8',
    boxShadow: '0 0 6px #818cf8',
  },
  filterAlertText: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  clearFilterBtn: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#a5b4fc',
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '6px',
    padding: '4px 10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  csvDownloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#6366f1',
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '6px',
    padding: '4px 10px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
  stopBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#ef4444',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '6px',
    padding: '4px 10px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
  startBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#2dd4bf',
    background: 'rgba(20, 184, 166, 0.1)',
    border: '1px solid rgba(20, 184, 166, 0.3)',
    borderRadius: '6px',
    padding: '4px 10px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
  header: {
    padding: '24px',
  },
  failureBanner: {
    marginTop: '10px',
    padding: '10px 12px',
    borderRadius: '10px',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.22)',
    color: '#fecaca',
    fontSize: '0.82rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    lineHeight: '1.4',
  },
  pagePreviewStrip: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  pagePreviewLabel: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  pagePreviewList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  seedPanel: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  pageProvenanceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '10px',
    marginTop: '10px',
  },
  authSummary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
  },
  pagePreviewChip: {
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  domainSub: {
    fontSize: '0.65rem',
    letterSpacing: '0.15em',
    color: 'var(--text-dim)',
    fontWeight: '700',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-title)',
    marginTop: '4px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '120px 20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 255, 255, 0.05)',
    borderTop: '4px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin-slow 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '120px 40px',
  },
  emptyTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    fontFamily: 'var(--font-title)',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    maxWidth: '380px',
    lineHeight: '1.5',
  },
  agentBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    background: 'rgba(99, 102, 241, 0.06)',
    border: '1px dashed rgba(99, 102, 241, 0.3)',
    borderRadius: '12px',
  },
  miniSpinner: {
    flexShrink: 0,
  },
  agentBoxTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginBottom: '2px',
  },
  agentBoxDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  tabsRow: {
    display: 'flex',
    borderBottom: '1px solid var(--border-color)',
    gap: '16px',
    overflowX: 'auto',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '12px 6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    fontFamily: 'var(--font-title)',
    transition: 'var(--transition)',
  },
  tabContent: {
    paddingTop: '4px',
  },
  useCaseCard: {
    padding: '0px',
    marginBottom: '20px',
    overflow: 'hidden',
  },
  useCaseHeader: {
    padding: '20px 24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    background: 'rgba(255, 255, 255, 0.01)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
  },
  useCaseTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-title)',
  },
  useCaseDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  testList: {
    padding: '12px 24px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  testItem: {
    border: '1px solid rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    overflow: 'hidden',
  },
  testHeader: {
    padding: '12px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    transition: 'var(--transition)',
  },
  testHeaderHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  testTitleCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  testTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  execTime: {
    fontSize: '0.75rem',
    color: 'var(--text-dim)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  testBody: {
    padding: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderTop: '1px solid rgba(255, 255, 255, 0.02)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  stepBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  bodyLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  stepsText: {
    backgroundColor: 'rgba(16, 22, 42, 0.5)',
    padding: '10px 14px',
    borderRadius: '6px',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    fontFamily: 'monospace',
    lineHeight: '1.4',
    whiteSpace: 'pre-wrap',
    border: '1px solid rgba(255, 255, 255, 0.02)',
  },
  bodyContent: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    lineHeight: '1.4',
  },
  errorReportBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '14px',
  },
  errorLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--error)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
  },
  errorContent: {
    color: '#fca5a5',
    fontSize: '0.85rem',
    lineHeight: '1.4',
  },
  failureDetailBox: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  failureDetailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  failureLabel: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  failureValue: {
    fontSize: '0.85rem',
    color: 'var(--text-main)',
    lineHeight: '1.5',
    wordBreak: 'break-word',
  },
  noDataBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: 'var(--text-dim)',
    gap: '10px',
    fontSize: '0.9rem',
  },
  emptySubText: {
    fontSize: '0.8rem',
    color: 'var(--text-dim)',
    padding: '10px 0',
  },
  noIssuesBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
  },
  noIssuesDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    maxWidth: '340px',
    lineHeight: '1.5',
    marginTop: '2px',
  },
  errorCard: {
    padding: '20px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  errorHeadline: {
    fontWeight: '700',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
  },
  errorDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
  },
  errorMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    paddingTop: '6px',
    borderTop: '1px solid rgba(255, 255, 255, 0.02)',
  },
  errorMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: 'var(--text-dim)',
  },
  errorUrlLink: {
    color: 'var(--primary)',
    textDecoration: 'none',
  },
  sugCard: {
    padding: '20px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sugHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  sugTitleBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sugTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-title)',
  },
  sugDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    lineHeight: '1.45',
  },
  agentPanel: {
    padding: '16px',
    backgroundColor: 'rgba(16, 22, 42, 0.4)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  agentPanelTitle: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  agentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '10px',
  },
  agentStateCard: {
    padding: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minHeight: '80px',
    justifyContent: 'space-between',
    color: 'inherit',
    font: 'inherit',
  },
  agentCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '4px',
  },
  agentCardName: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  agentLogBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.01)',
  },
  agentLogText: {
    fontSize: '0.58rem',
    color: 'var(--text-muted)',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    margin: 0,
    lineHeight: '1.2',
  },
  agentErrorIndicator: {
    fontSize: '0.65rem',
    color: 'var(--error)',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  agentDetailBox: {
    marginTop: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    border: '1px solid rgba(99, 102, 241, 0.18)',
    borderRadius: '8px',
    padding: '12px',
  },
  agentDetailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '8px',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  agentDetailLog: {
    margin: 0,
    color: 'var(--text-muted)',
    fontFamily: 'monospace',
    fontSize: '0.72rem',
    lineHeight: '1.45',
    whiteSpace: 'pre-wrap',
  },
  splitWorkspace: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.1fr',
    gap: '20px',
    alignItems: 'start',
  },
  errorsListCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '480px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  errorListItem: {
    padding: '16px',
    cursor: 'pointer',
    transition: 'var(--transition)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  errorDescCompact: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    lineHeight: '1.45',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  errorUrlText: {
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
    wordBreak: 'break-all',
  },
  codeReviewCol: {
    padding: '20px',
    maxHeight: '480px',
    overflowY: 'auto',
    backgroundColor: '#070913',
  },
  noCodeRefBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--text-dim)',
    fontSize: '0.85rem',
  },
  codeReviewDetail: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  codeReviewHeader: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '10px',
  },
  codeFileLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  codeFileLabelText: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--primary)',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },
  codeLinesLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '600',
  },
  codeSnippetBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  screenshotBlock: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  screenshotImage: {
    width: '100%',
    maxHeight: '260px',
    objectFit: 'contain',
    backgroundColor: '#0a0d1a',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
  },
  codeBlockHeader: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  codeText: {
    backgroundColor: '#0a0d1a',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    padding: '12px',
    borderRadius: '8px',
    color: '#93c5fd',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    lineHeight: '1.4',
    overflowX: 'auto',
    margin: 0,
  },
  proposedFixBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
    border: '1px dashed rgba(16, 185, 129, 0.2)',
    borderRadius: '8px',
    padding: '12px',
  },
  codeBlockHeaderFix: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#34d399',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  codeTextFix: {
    backgroundColor: '#081c15',
    padding: '10px',
    borderRadius: '6px',
    color: '#a7f3d0',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    lineHeight: '1.4',
    overflowX: 'auto',
    margin: 0,
  },
  resumeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
    marginTop: '10px',
  },
  resumeInput: {
    width: '100%',
    minHeight: '42px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '0 14px',
    color: 'var(--text-main)',
    outline: 'none',
  },
  resumeError: {
    marginTop: '10px',
    color: 'var(--error)',
    fontSize: '0.82rem',
  },
  authPrompt: {
    marginTop: '10px',
    marginBottom: '6px',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    lineHeight: '1.45',
  },
  authHelper: {
    marginBottom: '8px',
    color: 'var(--text-dim)',
    fontSize: '0.8rem',
    lineHeight: '1.4',
  },
  otpQuickAction: {
    gridColumn: '1 / -1',
    marginTop: '2px',
  },

  // ── Dummy Data Table ───────────────────────────────────────────────────────
  dummyDataBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    border: '1px solid rgba(99, 102, 241, 0.18)',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  dummyDataLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#a5b4fc',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  dummyDataTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  dummyDataHeaderRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.4fr 0.6fr',
    gap: '8px',
    padding: '6px 10px',
    backgroundColor: 'rgba(99,102,241,0.1)',
    fontSize: '0.65rem',
    fontWeight: '700',
    color: '#a5b4fc',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  dummyDataRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.4fr 0.6fr',
    gap: '8px',
    padding: '6px 10px',
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    borderTop: '1px solid rgba(255,255,255,0.02)',
  },
  dummyCol1: { display: 'flex', alignItems: 'center', minWidth: 0 },
  dummyCol2: { display: 'flex', alignItems: 'center', minWidth: 0 },
  dummyCol3: { display: 'flex', alignItems: 'center' },
  dummyFieldCode: {
    fontSize: '0.72rem',
    fontFamily: 'monospace',
    color: '#93c5fd',
    background: 'rgba(59,130,246,0.1)',
    padding: '1px 5px',
    borderRadius: '3px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  dummyValue: {
    fontSize: '0.78rem',
    color: '#a5f3fc',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  dummyTypeBadge: {
    fontSize: '0.62rem',
    fontWeight: '700',
    color: '#c4b5fd',
    background: 'rgba(167,139,250,0.12)',
    border: '1px solid rgba(167,139,250,0.2)',
    padding: '1px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },

  // ── Test Screenshot ────────────────────────────────────────────────────────
  testScreenshotBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '12px',
  },
  testScreenshotImg: {
    width: '100%',
    maxHeight: '320px',
    objectFit: 'contain',
    backgroundColor: '#060912',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '6px',
  },
  pagesTestedPanel: {
    padding: '16px',
    backgroundColor: 'rgba(16, 22, 42, 0.4)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    marginTop: '16px',
  },
  pagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  pageItemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
    fontSize: '0.85rem',
  },
  pageItemNumber: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--accent)',
    fontFamily: 'monospace',
  },
  pageItemLink: {
    color: 'var(--text-main)',
    textDecoration: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'var(--transition)',
    cursor: 'pointer',
  },
};
