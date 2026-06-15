import React, { useMemo } from 'react';
import { Activity, Globe, FileText, FormInput, Cpu, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

/**
 * Parses field:value pairs from agent log lines.
 * Looks for patterns like:
 *   - "Filling field 'email' with 'john@example.com'"
 *   - "Input 'first_name': 'John'"
 *   - "Setting username to 'demouser'"
 *   - "field: value" style lines
 */
function parseFormFieldsFromLogs(logText) {
  if (!logText) return [];
  const fields = [];
  const seen = new Set();

  const patterns = [
    // "Filling field 'email' with 'john@example.com'"
    /filling\s+(?:field\s+)?['"]?(\w[\w\s]*)['"]?\s+with\s+['"]([^'"]+)['"]/gi,
    // "Input 'first_name': 'John Doe'"
    /input\s+['"]?([\w\s]+)['"]?\s*[:=]\s+['"]([^'"]+)['"]/gi,
    // "Setting username to 'admin'"
    /setting\s+['"]?([\w\s]+)['"]?\s+to\s+['"]([^'"]+)['"]/gi,
    // "Typed 'hello world' into email field"
    /typed?\s+['"]([^'"]+)['"]\s+into\s+['"]?([\w\s]+)['"]?\s+field/gi,
    // "first_name: John" — generic key: value on its own line
    /^\s*([\w_\-]+)\s*:\s+(.{2,40})\s*$/gm,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(logText)) !== null) {
      const key = (match[1] || '').trim().toLowerCase().replace(/[_\-]/g, ' ');
      const value = (match[2] || '').trim();
      if (key && value && !seen.has(key) && value.length < 80) {
        seen.add(key);
        fields.push({ field: key, value });
      }
    }
  }

  return fields.slice(0, 12); // max 12 rows to keep it compact
}

/**
 * Extracts the most recently active page from test_cases.
 */
function getCurrentPage(test_cases, taskStatus) {
  if (!test_cases || test_cases.length === 0) return null;
  // Find a running test case page first
  const running = test_cases.find(tc => tc.status === 'pending' && tc.page_url);
  if (running) return running.page_url;
  // Fall back to most recent
  const withUrl = [...test_cases].filter(tc => tc.page_url).reverse();
  return withUrl[0]?.page_url || null;
}

/**
 * Converts a URL to a readable page name.
 */
function urlToPageName(url) {
  if (!url) return 'Unknown Page';
  try {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Home';
    const last = segments[segments.length - 1]
      .replace(/[-_]/g, ' ')
      .replace(/\.\w+$/, '')
      .replace(/\b\w/g, c => c.toUpperCase());
    return last || 'Home';
  } catch {
    return url.replace(/^https?:\/\//, '').split('/').pop() || url;
  }
}

const STATUS_CONFIG = {
  pending: {
    label: 'Queued',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.25)',
    icon: Clock,
  },
  crawling: {
    label: 'Crawling Site',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.25)',
    icon: Globe,
  },
  generating_test_cases: {
    label: 'Generating Tests',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.08)',
    border: 'rgba(167, 139, 250, 0.25)',
    icon: Cpu,
  },
  running_tests: {
    label: 'Running Tests',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.08)',
    border: 'rgba(34, 197, 94, 0.25)',
    icon: Activity,
  },
  completed: {
    label: 'Completed',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.25)',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.25)',
    icon: AlertCircle,
  },
};

export default function LiveProcessMonitor({ tasks, taskDetails }) {
  // Find the most active task (running task takes priority)
  const activeTask = useMemo(() => {
    if (!tasks || tasks.length === 0) return null;
    const runningStatuses = ['crawling', 'generating_test_cases', 'running_tests', 'pending'];
    return (
      tasks.find(t => runningStatuses.includes(t.status)) ||
      tasks[0]
    );
  }, [tasks]);

  const {
    task = {},
    test_cases = [],
    agent_states = [],
  } = taskDetails || {};

  // Merge task from tasks list if taskDetails is for a different task
  const displayTask = (task && task.id && task.id === activeTask?.id) ? task : activeTask;

  const isRunning = displayTask && ['crawling', 'generating_test_cases', 'running_tests', 'pending'].includes(displayTask.status);
  const config = STATUS_CONFIG[displayTask?.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  const currentPage = useMemo(() => getCurrentPage(test_cases, displayTask?.status), [test_cases, displayTask?.status]);
  const pageName = urlToPageName(currentPage);

  // Form agent log parsing
  const formAgent = agent_states.find(a => a.agent_name === 'Form');
  const orchAgent = agent_states.find(a => a.agent_name === 'Orchestrator');
  const formFields = useMemo(() => parseFormFieldsFromLogs(formAgent?.log_output || orchAgent?.log_output || ''), [formAgent, orchAgent]);

  // Live log tail (last 3 meaningful lines)
  const allLogs = agent_states
    .filter(a => a.log_output)
    .flatMap(a => a.log_output.split('\n').filter(Boolean).map(l => ({ agent: a.agent_name, line: l })));
  const recentLogs = allLogs.slice(-4);

  if (!displayTask) {
    return (
      <div className="glass-panel" style={styles.emptyMonitor}>
        <Activity size={20} color="var(--text-dim)" />
        <span style={styles.emptyText}>No active testing session — create a new test to begin monitoring</span>
      </div>
    );
  }

  return (
    <div
      className="glass-panel animate-fade-in"
      style={{
        ...styles.monitor,
        borderColor: config.border,
        background: `linear-gradient(135deg, ${config.bg} 0%, rgba(255,255,255,0.01) 100%)`,
      }}
    >
      {/* Header row */}
      <div style={styles.monitorHeader}>
        <div style={styles.monitorTitle}>
          <div style={{ ...styles.pulsingDot, background: config.color, boxShadow: isRunning ? `0 0 8px ${config.color}` : 'none' }} />
          <span style={styles.monitorLabel}>Live Test Monitor</span>
        </div>
        <span
          style={{
            ...styles.statusPill,
            background: config.bg,
            color: config.color,
            border: `1px solid ${config.border}`,
          }}
        >
          <StatusIcon size={12} />
          {config.label}
        </span>
      </div>

      {/* Content grid */}
      <div style={styles.contentGrid}>
        {/* Col 1: URL + Page */}
        <div style={styles.infoCol}>
          <div style={styles.infoBlock}>
            <div style={styles.infoLabel}>
              <Globe size={12} color="var(--text-dim)" />
              Testing URL
            </div>
            <div style={styles.infoValue} title={displayTask.url}>
              {displayTask.url}
            </div>
          </div>

          {currentPage && (
            <div style={styles.infoBlock}>
              <div style={styles.infoLabel}>
                <FileText size={12} color="var(--text-dim)" />
                Current Page
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ ...styles.pageKeywordBadge, borderColor: config.color, color: config.color }}>
                  {pageName}
                </span>
                <span style={styles.pageUrlSmall} title={currentPage}>
                  {currentPage.replace(/^https?:\/\//, '')}
                </span>
              </div>
            </div>
          )}

          {/* Agent pipeline status */}
          {agent_states.length > 0 && (
            <div style={styles.infoBlock}>
              <div style={styles.infoLabel}>
                <Cpu size={12} color="var(--text-dim)" />
                Agent Pipeline
              </div>
              <div style={styles.agentPipeline}>
                {agent_states.map(a => {
                  const aColor = a.status === 'completed' ? '#3b82f6' : a.status === 'running' ? '#22c55e' : a.status === 'failed' ? '#ef4444' : 'var(--text-dim)';
                  return (
                    <div
                      key={a.id}
                      style={{ ...styles.agentPill, borderColor: aColor, color: aColor }}
                      title={`${a.agent_name}: ${a.status}`}
                    >
                      <span style={{ ...styles.agentDot, background: aColor }} />
                      {a.agent_name.replace('_', ' ')}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Col 2: Form data being filled */}
        <div style={styles.formDataCol}>
          <div style={styles.infoLabel}>
            <FormInput size={12} color="var(--text-dim)" />
            Form Data Being Inserted
          </div>
          {formFields.length > 0 ? (
            <div style={styles.formFieldsTable}>
              {formFields.map(({ field, value }) => (
                <div key={field} style={styles.formFieldRow}>
                  <span style={styles.formFieldName}>{field}</span>
                  <span style={styles.formFieldArrow}>→</span>
                  <span style={styles.formFieldValue}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.noFormData}>
              {isRunning
                ? <><span style={styles.noFormDot} />Waiting for form interaction data...</>
                : 'No form data recorded for this session.'}
            </div>
          )}
        </div>

        {/* Col 3: Live log tail */}
        {recentLogs.length > 0 && (
          <div style={styles.logCol}>
            <div style={styles.infoLabel}>
              <Activity size={12} color="var(--text-dim)" />
              Live Log
            </div>
            <div style={styles.logBox}>
              {recentLogs.map((entry, i) => (
                <div key={i} style={styles.logLine}>
                  <span style={styles.logAgent}>[{entry.agent}]</span>
                  <span style={styles.logText}>{entry.line.slice(0, 120)}</span>
                </div>
              ))}
              {isRunning && <span style={styles.blinkingCursor}>▌</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  monitor: {
    padding: '20px 24px',
    borderRadius: '16px',
    border: '1px solid',
    marginBottom: '24px',
    transition: 'border-color 0.4s ease, background 0.4s ease',
  },
  emptyMonitor: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    marginBottom: '24px',
    borderRadius: '14px',
  },
  emptyText: {
    fontSize: '0.82rem',
    color: 'var(--text-dim)',
  },
  monitorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  monitorTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  monitorLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  pulsingDot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    animation: 'pulse-dot 1.5s ease-in-out infinite',
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '20px',
    alignItems: 'start',
  },
  infoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formDataCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  logCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  infoBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  infoLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.67rem',
    fontWeight: '700',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  infoValue: {
    fontSize: '0.85rem',
    color: 'var(--text-main)',
    fontWeight: '600',
    wordBreak: 'break-all',
    lineHeight: '1.4',
  },
  pageKeywordBadge: {
    padding: '3px 10px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '0.78rem',
    fontWeight: '700',
    letterSpacing: '0.02em',
  },
  pageUrlSmall: {
    fontSize: '0.72rem',
    color: 'var(--text-dim)',
    wordBreak: 'break-all',
  },
  agentPipeline: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  agentPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '0.68rem',
    fontWeight: '600',
  },
  agentDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  formFieldsTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
    padding: '10px 12px',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  formFieldRow: {
    display: 'grid',
    gridTemplateColumns: '120px 18px 1fr',
    gap: '6px',
    alignItems: 'center',
  },
  formFieldName: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-dim)',
    textTransform: 'capitalize',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  formFieldArrow: {
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
    textAlign: 'center',
  },
  formFieldValue: {
    fontSize: '0.75rem',
    color: '#a5f3fc',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  noFormData: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.78rem',
    color: 'var(--text-dim)',
    padding: '10px 12px',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.03)',
  },
  noFormDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#f59e0b',
    animation: 'pulse-dot 1.2s ease-in-out infinite',
    flexShrink: 0,
  },
  logBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    padding: '10px 12px',
    border: '1px solid rgba(255,255,255,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontFamily: 'monospace',
    overflowY: 'hidden',
  },
  logLine: {
    display: 'flex',
    gap: '6px',
    alignItems: 'flex-start',
    lineHeight: '1.4',
  },
  logAgent: {
    fontSize: '0.65rem',
    color: '#6366f1',
    fontWeight: '700',
    flexShrink: 0,
    marginTop: '1px',
  },
  logText: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    wordBreak: 'break-word',
  },
  blinkingCursor: {
    fontSize: '0.8rem',
    color: '#22c55e',
    animation: 'blink-cursor 1s step-start infinite',
  },
};
