import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Download, CheckCircle2, XCircle, Clock, AlertTriangle, Lightbulb, Globe } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

// Derive a keyword label from a URL path segment
function urlToKeyword(url) {
  if (!url) return 'Unknown';
  try {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);
    if (!segments.length) return 'Home';
    const last = segments[segments.length - 1]
      .replace(/[-_]/g, ' ')
      .replace(/\.\w+$/, '')
      .replace(/\b\w/g, c => c.toUpperCase());
    return last || 'Home';
  } catch {
    return url.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase()) || 'Page';
  }
}

// Determine page status from its test cases and current task status
function getPageStatus(pageTests, taskStatus) {
  if (!pageTests.length) return 'pending';
  const isTaskActive = ['crawling', 'generating_test_cases', 'running_tests', 'pending'].includes(taskStatus);
  const allDone = pageTests.every(t => ['passed', 'failed'].includes(t.status));
  if (allDone) return 'completed';
  if (isTaskActive) return 'running';
  return 'pending';
}

const STATUS_STYLES = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  label: 'Pending'   },
  running:   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   label: 'Running'   },
  completed: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  label: 'Completed' },
  failed:    { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   label: 'Failed'    },
};

// Generate and download CSV for a single page
function downloadPageCSV(keyword, pageUrl, pageTests, pageErrors, pageUseCases, pageSuggestions) {
  const rows = [];
  rows.push(['Page Report: ' + keyword]);
  rows.push(['URL', pageUrl]);
  rows.push([]);
  rows.push(['USE CASES']);
  rows.push(['USE CASE TITLE', 'DESCRIPTION']);
  pageUseCases.forEach(uc => rows.push([uc.title, uc.description || '']));
  rows.push([]);
  rows.push(['TEST CASES']);
  rows.push(['TITLE', 'STATUS', 'EXPECTED RESULT', 'ERROR MESSAGE', 'STEPS', 'EXECUTION TIME (S)']);
  pageTests.forEach(tc => rows.push([
    tc.title, tc.status, tc.expected_result || '', tc.error_message || '', tc.steps || '',
    tc.execution_time != null ? tc.execution_time : '',
  ]));
  rows.push([]);
  rows.push(['ERRORS']);
  rows.push(['MESSAGE', 'SEVERITY', 'PAGE URL', 'CREATED AT']);
  pageErrors.forEach(e => rows.push([e.message, e.severity, e.page_url, e.created_at]));
  rows.push([]);
  rows.push(['SUGGESTIONS']);
  rows.push(['TITLE', 'PRIORITY', 'DESCRIPTION']);
  pageSuggestions.forEach(s => rows.push([s.title, s.priority, s.description || '']));

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${keyword.replace(/\s+/g, '_').toLowerCase()}_report.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function PageRow({ page, taskDetails, taskStatus }) {
  const [expanded, setExpanded] = useState(false);
  const { pageUrl, keyword, pageTests, pageStatus } = page;
  const st = STATUS_STYLES[pageStatus] || STATUS_STYLES.pending;

  const { use_cases = [], errors = [], suggestions = [] } = taskDetails || {};
  const pageErrors = errors.filter(e => e.page_url === pageUrl);
  const pageTestIds = new Set(pageTests.map(t => t.id));
  const pageUseCaseIds = new Set(pageTests.map(t => t.use_case_id).filter(Boolean));
  const pageUseCases = use_cases.filter(uc => pageUseCaseIds.has(uc.id));
  const pageSuggestions = suggestions.filter(s =>
    pageErrors.some(e => e.task_id === s.task_id) || pageUseCases.some(uc => uc.task_id === s.task_id)
  );

  const passed = pageTests.filter(t => t.status === 'passed').length;
  const failed = pageTests.filter(t => t.status === 'failed').length;

  return (
    <div style={{ ...styles.pageRow, borderColor: expanded ? st.border : 'rgba(255,255,255,0.05)' }}>
      {/* Row header */}
      <div style={styles.pageRowHeader} onClick={() => setExpanded(e => !e)}>
        <div style={styles.pageRowLeft}>
          <div style={{ ...styles.statusDot, background: st.color, boxShadow: pageStatus === 'running' ? `0 0 7px ${st.color}` : 'none' }} />
          <span style={styles.keywordLabel}>{keyword}</span>
          <span style={styles.pageUrlChip} title={pageUrl}>{pageUrl.replace(/^https?:\/\//, '')}</span>
        </div>
        <div style={styles.pageRowRight}>
          <span style={{ ...styles.statusBadge, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
            {st.label}
          </span>
          {pageTests.length > 0 && (
            <span style={styles.countChip}>
              <CheckCircle2 size={11} color="#22c55e" /> {passed}
              <XCircle size={11} color="#ef4444" style={{ marginLeft: 6 }} /> {failed}
            </span>
          )}
          {pageErrors.length > 0 && (
            <span style={{ ...styles.countChip, color: '#fca5a5' }}>
              <AlertTriangle size={11} /> {pageErrors.length} err
            </span>
          )}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); downloadPageCSV(keyword, pageUrl, pageTests, pageErrors, pageUseCases, pageSuggestions); }}
            style={styles.csvBtn}
            title="Download CSV for this page"
          >
            <Download size={13} /> CSV
          </button>
          {expanded ? <ChevronUp size={16} color="var(--text-dim)" /> : <ChevronDown size={16} color="var(--text-dim)" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={styles.expandedBody}>
          {/* Running: show live log snippet */}
          {pageStatus === 'running' && (
            <div style={styles.liveTag}>
              <span style={styles.liveDot} /> Live — test execution in progress for this page
            </div>
          )}

          {/* Use Cases */}
          {pageUseCases.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Use Cases</div>
              {pageUseCases.map(uc => (
                <div key={uc.id} style={styles.ucItem}>
                  <span style={styles.ucTitle}>{uc.title}</span>
                  {uc.description && <span style={styles.ucDesc}>{uc.description}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Test Cases */}
          {pageTests.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Test Cases ({pageTests.length})</div>
              {pageTests.map(tc => (
                <div key={tc.id} style={styles.tcRow}>
                  {tc.status === 'passed' && <CheckCircle2 size={14} color="#22c55e" style={{ flexShrink: 0 }} />}
                  {tc.status === 'failed' && <XCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />}
                  {tc.status === 'pending' && <Clock size={14} color="#f59e0b" style={{ flexShrink: 0 }} />}
                  <div style={styles.tcContent}>
                    <span style={styles.tcTitle}>{tc.title}</span>
                    {tc.error_message && <span style={styles.tcError}>{tc.error_message}</span>}
                  </div>
                  <span style={{ ...styles.miniStatus, color: tc.status === 'passed' ? '#22c55e' : tc.status === 'failed' ? '#ef4444' : '#f59e0b' }}>
                    {tc.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Errors */}
          {pageErrors.length > 0 && (
            <div style={styles.section}>
              <div style={{ ...styles.sectionLabel, color: '#fca5a5' }}>Errors & Warnings ({pageErrors.length})</div>
              {pageErrors.map(err => (
                <div key={err.id} style={styles.errRow}>
                  <AlertTriangle size={13} color="#f87171" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={styles.errMsg}>{err.message}</div>
                    <div style={styles.errMeta}>
                      <span style={{ ...styles.severityPill, background: err.severity === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)', color: err.severity === 'critical' ? '#fca5a5' : '#fcd34d' }}>{err.severity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {pageSuggestions.length > 0 && (
            <div style={styles.section}>
              <div style={{ ...styles.sectionLabel, color: '#fde68a' }}>AI Suggestions</div>
              {pageSuggestions.map(s => (
                <div key={s.id} style={styles.sugRow}>
                  <Lightbulb size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                  <span style={styles.sugText}>{s.title}</span>
                </div>
              ))}
            </div>
          )}

          {pageTests.length === 0 && pageErrors.length === 0 && (
            <div style={styles.noDataMsg}><Globe size={18} color="var(--text-dim)" /> No data yet for this page.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PagesUnderTest({ taskDetails, tasks }) {
  const { task = {}, test_cases = [] } = taskDetails || {};

  const pages = useMemo(() => {
    const map = new Map();
    test_cases.forEach(tc => {
      if (!tc.page_url) return;
      if (!map.has(tc.page_url)) map.set(tc.page_url, []);
      map.get(tc.page_url).push(tc);
    });
    return Array.from(map.entries()).map(([url, tests]) => ({
      pageUrl: url,
      keyword: urlToKeyword(url),
      pageTests: tests,
      pageStatus: getPageStatus(tests, task.status),
    }));
  }, [test_cases, task.status]);

  if (!pages.length) return null;

  const pendingCount = pages.filter(p => p.pageStatus === 'pending').length;
  const runningCount = pages.filter(p => p.pageStatus === 'running').length;
  const completedCount = pages.filter(p => p.pageStatus === 'completed').length;

  return (
    <div style={styles.wrapper}>
      <div style={styles.titleRow}>
        <div style={styles.titleLeft}>
          <h3 style={styles.title}>Pages Under Test</h3>
          <span style={styles.totalChip}>{pages.length} pages</span>
        </div>
        <div style={styles.summaryPills}>
          <span style={{ ...styles.summaryPill, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>⏳ {pendingCount} Pending</span>
          <span style={{ ...styles.summaryPill, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>● {runningCount} Running</span>
          <span style={{ ...styles.summaryPill, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)' }}>✓ {completedCount} Completed</span>
        </div>
      </div>
      <div style={styles.pageList}>
        {pages.map(page => (
          <PageRow
            key={page.pageUrl}
            page={page}
            taskDetails={taskDetails}
            taskStatus={task.status}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { marginBottom: '28px' },
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' },
  titleLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  title: { fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  totalChip: { fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: '600', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '999px' },
  summaryPills: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  summaryPill: { fontSize: '0.72rem', fontWeight: '700', padding: '3px 10px', borderRadius: '999px' },
  pageList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  pageRow: { background: 'rgba(255,255,255,0.015)', borderRadius: '12px', border: '1px solid', overflow: 'hidden', transition: 'border-color 0.25s ease' },
  pageRowHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', gap: '12px' },
  pageRowLeft: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 },
  pageRowRight: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, transition: 'box-shadow 0.3s ease' },
  keywordLabel: { fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap' },
  pageUrlChip: { fontSize: '0.71rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' },
  statusBadge: { fontSize: '0.68rem', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap' },
  countChip: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' },
  csvBtn: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '700', color: '#6366f1', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '6px', padding: '3px 9px', cursor: 'pointer', transition: 'opacity 0.2s' },
  expandedBody: { borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' },
  liveTag: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#22c55e', fontWeight: '600' },
  liveDot: { display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 1.2s ease-in-out infinite' },
  section: { display: 'flex', flexDirection: 'column', gap: '6px' },
  sectionLabel: { fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' },
  ucItem: { display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' },
  ucTitle: { fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-main)' },
  ucDesc: { fontSize: '0.76rem', color: 'var(--text-muted)' },
  tcRow: { display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 10px', background: 'rgba(255,255,255,0.015)', borderRadius: '6px' },
  tcContent: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  tcTitle: { fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '500' },
  tcError: { fontSize: '0.74rem', color: '#fca5a5', lineHeight: '1.3' },
  miniStatus: { fontSize: '0.65rem', fontWeight: '700', flexShrink: 0, textTransform: 'uppercase' },
  errRow: { display: 'flex', gap: '8px', padding: '7px 10px', background: 'rgba(239,68,68,0.05)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.12)' },
  errMsg: { fontSize: '0.78rem', color: '#fecaca', lineHeight: '1.4', marginBottom: '4px' },
  errMeta: { display: 'flex', gap: '6px' },
  severityPill: { fontSize: '0.65rem', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' },
  sugRow: { display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '5px 10px', background: 'rgba(245,158,11,0.04)', borderRadius: '6px' },
  sugText: { fontSize: '0.78rem', color: '#fde68a' },
  noDataMsg: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-dim)', padding: '10px' },
};
