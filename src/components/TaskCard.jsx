import React from 'react';
import { Globe, Bug, ShieldCheck, HelpCircle, AlertTriangle, Lightbulb, Trash2, ArrowRight, Download, Square } from 'lucide-react';

const API_BASE = '/api';

export default function TaskCard({ task, isSelected, onClick, onDelete, onStop }) {
  // Format Date
  const dateStr = new Date(task.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate Progress Percent based on status
  const getProgress = () => {
    switch (task.status) {
      case 'pending': return 10;
      case 'crawling': return 35;
      case 'generating_test_cases': return 60;
      case 'planned': return 75;
      case 'running_tests': return 85;
      case 'completed': return 100;
      case 'failed': return 100;
      default: return 0;
    }
  };

  // Humanize Status Text
  const formatStatus = (status) => {
    return status.replace(/_/g, ' ');
  };

  const isRunning = ['pending', 'crawling', 'generating_test_cases', 'running_tests'].includes(task.status);
  const downloadExcel = (e) => {
    e.stopPropagation();
    window.open(`${API_BASE}/tasks/${task.id}/report.xlsx`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`glass-panel glass-panel-interactive ${isSelected ? 'selected-card' : ''}`}
      onClick={onClick}
      style={{
        ...styles.card,
        borderLeft: isSelected ? '4px solid var(--primary)' : '1px solid var(--border-color)',
        paddingLeft: isSelected ? '16px' : '20px'
      }}
    >
      <div style={styles.header}>
        <div style={styles.urlWrapper}>
          <Globe size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span style={styles.url} title={task.url}>{task.url}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete the test task for ${task.url}?`)) {
              onDelete(task.id);
            }
          }}
          style={styles.deleteBtn}
          title="Delete Task"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div style={styles.metaRow}>
        <span className={`status-badge status-${task.status}`} style={styles.badge}>
          {formatStatus(task.status)}
        </span>
        <span style={styles.time}>{dateStr}</span>
      </div>

      <div style={styles.exportRow}>
        {isRunning ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Are you sure you want to stop the active test run for ${task.url}?`)) {
                onStop(task.id);
              }
            }}
            style={styles.stopBtn}
            title="Stop/Cancel active test run"
          >
            <Square size={13} fill="currentColor" />
            <span>Stop Run</span>
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <button type="button" onClick={downloadExcel} style={styles.csvBtn} title="Download Excel report">
              <Download size={14} />
              <span>Download Excel</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`${API_BASE}/tasks/${task.id}/report.zip`, '_blank', 'noopener,noreferrer');
              }}
              style={styles.zipBtn}
              title="Download ZIP report (with Excel sheet and screenshots folder)"
            >
              <Download size={14} />
              <span>Download ZIP</span>
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar for Active Tasks */}
      {isRunning && (
        <div style={styles.progressContainer}>
          <div 
            style={{ 
              ...styles.progressBar, 
              width: `${getProgress()}%`,
              backgroundColor: task.status === 'running_tests' ? 'var(--accent)' : 'var(--primary)'
            }} 
          />
        </div>
      )}

      <div style={styles.stats}>
        <div style={styles.statItem} title={`${task.test_case_count} Test Cases`}>
          <ShieldCheck size={14} color="var(--accent)" />
          <span>{task.test_case_count}</span>
        </div>
        <div style={styles.statItem} title={`${task.error_count} Errors`}>
          <Bug size={14} color={task.error_count > 0 ? "var(--error)" : "var(--text-dim)"} />
          <span style={{ color: task.error_count > 0 ? "var(--error)" : "inherit" }}>
            {task.error_count}
          </span>
        </div>
        <div style={styles.statItem} title={`${task.suggestion_count} AI Suggestions`}>
          <Lightbulb size={14} color="var(--warning)" />
          <span>{task.suggestion_count}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '14px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  urlWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
    flex: 1,
  },
  url: {
    fontWeight: '700',
    fontFamily: 'var(--font-title)',
    fontSize: '0.95rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: 'var(--text-main)',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition)',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  badge: {
    fontSize: '0.65rem',
  },
  time: {
    fontSize: '0.75rem',
    color: 'var(--text-dim)',
  },
  exportRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  csvBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '7px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'var(--text-main)',
    fontSize: '0.78rem',
    cursor: 'pointer',
    width: '100%',
  },
  zipBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '7px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    background: 'rgba(16, 185, 129, 0.08)',
    color: '#10b981',
    fontSize: '0.78rem',
    cursor: 'pointer',
    width: '100%',
  },
  stopBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    background: 'rgba(239, 68, 68, 0.08)',
    color: '#ef4444',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background 0.2s',
  },
  progressContainer: {
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '2px',
  },
  progressBar: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.4s ease-out',
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.03)',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
};
