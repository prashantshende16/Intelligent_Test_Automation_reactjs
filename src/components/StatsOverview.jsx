import React from 'react';
import { Activity, ShieldAlert, CheckCircle, Lightbulb, Play, Clock, Zap, CheckCircle2 } from 'lucide-react';

export default function StatsOverview({ stats }) {
  const successRate = stats ? stats.success_rate : 100;
  const totalTasks = stats ? stats.total_tasks : 0;
  const totalTestCases = stats ? stats.total_test_cases : 0;
  const totalErrors = stats ? stats.total_errors : 0;
  const totalSuggestions = stats ? stats.total_suggestions : 0;

  const statusCounts = stats?.status_counts || {};
  const pendingCount = (statusCounts.pending || 0) + (statusCounts.crawling || 0) + (statusCounts.generating_test_cases || 0);
  const runningCount = statusCounts.running_tests || 0;
  const completedCount = statusCounts.completed || 0;
  const failedCount = statusCounts.failed || 0;

  return (
    <>
      <div style={styles.grid}>
      {/* Total Sites Card */}
      <div className="glass-panel" style={styles.card}>
        <div style={{ ...styles.iconBg, backgroundColor: 'rgba(99, 102, 241, 0.15)' }}>
          <Activity size={24} color="#6366f1" />
        </div>
        <div>
          <div style={styles.label}>Websites Enrolled</div>
          <div style={styles.value}>{totalTasks}</div>
        </div>
      </div>

      {/* Total Test Cases Card */}
      <div className="glass-panel" style={styles.card}>
        <div style={{ ...styles.iconBg, backgroundColor: 'rgba(20, 184, 166, 0.15)' }}>
          <Play size={24} color="#14b8a6" />
        </div>
        <div>
          <div style={styles.label}>Test Cases Generated</div>
          <div style={styles.value}>{totalTestCases}</div>
        </div>
      </div>

      {/* Success Rate Card */}
      <div className="glass-panel" style={styles.card}>
        <div style={{ ...styles.iconBg, backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
          <CheckCircle size={24} color="#10b981" />
        </div>
        <div>
          <div style={styles.label}>Automation Success Rate</div>
          <div style={styles.value}>{successRate}%</div>
        </div>
      </div>

      {/* Errors Found Card */}
      <div className="glass-panel" style={styles.card}>
        <div style={{ ...styles.iconBg, backgroundColor: totalErrors > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(107, 114, 128, 0.15)' }}>
          <ShieldAlert size={24} color={totalErrors > 0 ? "#ef4444" : "#9ca3af"} />
        </div>
        <div>
          <div style={styles.label}>Bugs &amp; Violations Detected</div>
          <div style={styles.value}>{totalErrors}</div>
        </div>
      </div>

      {/* Suggestions Card */}
      <div className="glass-panel" style={styles.card}>
        <div style={{ ...styles.iconBg, backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
          <Lightbulb size={24} color="#f59e0b" />
        </div>
        <div>
          <div style={styles.label}>AI Recommendations</div>
          <div style={styles.value}>{totalSuggestions}</div>
        </div>
      </div>
    </div>

    {/* Status count row */}
    <div style={styles.statusRow}>
      <div className="glass-panel" style={styles.statusCard}>
        <div style={{ ...styles.statusIcon, background: 'rgba(245,158,11,0.15)' }}>
          <Clock size={18} color="#f59e0b" />
        </div>
        <div>
          <div style={styles.statusLabel}>Pending / Queued</div>
          <div style={{ ...styles.statusValue, color: '#f59e0b' }}>{pendingCount}</div>
        </div>
      </div>

      <div className="glass-panel" style={styles.statusCard}>
        <div style={{ ...styles.statusIcon, background: 'rgba(34,197,94,0.15)' }}>
          <Zap size={18} color="#22c55e" />
        </div>
        <div>
          <div style={styles.statusLabel}>Currently Running</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={styles.statusValue}>{runningCount}</div>
            {runningCount > 0 && <span style={styles.runningDot} />}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={styles.statusCard}>
        <div style={{ ...styles.statusIcon, background: 'rgba(59,130,246,0.15)' }}>
          <CheckCircle2 size={18} color="#3b82f6" />
        </div>
        <div>
          <div style={styles.statusLabel}>Completed</div>
          <div style={{ ...styles.statusValue, color: '#3b82f6' }}>{completedCount}</div>
        </div>
      </div>

      <div className="glass-panel" style={styles.statusCard}>
        <div style={{ ...styles.statusIcon, background: failedCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.1)' }}>
          <ShieldAlert size={18} color={failedCount > 0 ? '#ef4444' : '#9ca3af'} />
        </div>
        <div>
          <div style={styles.statusLabel}>Failed Runs</div>
          <div style={{ ...styles.statusValue, color: failedCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>{failedCount}</div>
        </div>
      </div>
    </div>
    </>
  );
}


const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '14px',
    animation: 'fade-in 0.5s ease-out forwards',
  },
  statusRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '14px',
    marginBottom: '30px',
  },
  statusCard: {
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
    marginBottom: '2px',
  },
  statusValue: {
    fontSize: '1.35rem',
    fontWeight: '800',
    fontFamily: 'var(--font-title)',
    color: 'var(--text-main)',
    lineHeight: '1.2',
  },
  runningDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 6px #22c55e',
    animation: 'pulse-dot 1.2s ease-in-out infinite',
  },
  card: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconBg: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
    marginBottom: '4px',
  },
  value: {
    fontSize: '1.6rem',
    fontWeight: '800',
    fontFamily: 'var(--font-title)',
    color: 'var(--text-main)',
    lineHeight: '1.2',
  },
};
