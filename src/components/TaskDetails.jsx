import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, ShieldAlert, CheckCircle2, XCircle, ChevronDown, ChevronUp, 
  HelpCircle, Lightbulb, Clock, Layers, Link as LinkIcon, Compass, Sparkles,
  AlertTriangle, Activity, Terminal
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

export default function TaskDetails({ taskDetails, isDetailsLoading }) {
  const [activeTab, setActiveTab] = useState('test-cases');
  const [selectedErrorId, setSelectedErrorId] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState(null);


  

  const [expandedUseCases, setExpandedUseCases] = useState({});
  const [expandedTestCases, setExpandedTestCases] = useState({});
  const codeReviewRef = useRef(null);

  // Destructure props BEFORE any useEffect that references these variables
  const { task = {}, use_cases = [], test_cases = [], errors = [], suggestions = [], codebase, agent_states = [] } = taskDetails || {};
  const selectedAgent = agent_states.find(state => state.id === selectedAgentId);
  const agentWarningCount = agent_states.reduce((count, state) => count + (state.errors_found || 0), 0);

  // Scroll code review into view when a new error is selected and set default selected error
  useEffect(() => {
    if (codeReviewRef.current) {
      codeReviewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (errors && errors.length > 0 && selectedErrorId === null) {
      setSelectedErrorId(errors[0].id);
    }
  }, [selectedErrorId, errors]);
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
            {codebase && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'monospace' }}>
                Codebase Path: {codebase.local_path} ({codebase.framework_type})
              </div>
            )}
          </div>
          <span className={`status-badge status-${task.status || 'unknown'}`}>
            {(task.status || 'unknown').replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {renderAgentStatus()}

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

      {/* Tabs */}
      <div style={styles.tabsRow}>
        <button type="button"
          onClick={() => setActiveTab('test-cases')}
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === 'test-cases' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'test-cases' ? 'var(--text-main)' : 'var(--text-muted)',
          }}
        >
          <Layers size={16} />
          <span>Test Cases ({test_cases.length})</span>
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
          <span>Browser Errors ({errors.length})</span>
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
        {/* TAB 1: TEST CASES */}
        {activeTab === 'test-cases' && (
          <div className="animate-slide-in">
            {use_cases.length === 0 ? (
              <div style={styles.noDataBox}>
                <Layers size={36} color="var(--text-dim)" />
                <div>No test cases generated yet.</div>
              </div>
            ) : (
              use_cases.map(uc => {
                const ucTests = test_cases.filter(t => t.use_case_id === uc.id);
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
                          const isTestExpanded = expandedTestCases[test.id];
                          const hasPassed = test.status === 'passed';
                          const hasFailed = test.status === 'failed';
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
            {errors.length === 0 ? (
              <div className="glass-panel" style={styles.noIssuesBox}>
                <CheckCircle2 size={40} color="var(--success)" style={{ marginBottom: '10px' }} />
                <h4 style={{ color: 'var(--success)', fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>No Bugs Detected</h4>
                <p style={styles.noIssuesDesc}>Congratulations! No critical errors or test violations were reported for this site version.</p>
                {agentWarningCount > 0 && (
                  <p style={styles.noIssuesDesc}>
                    {agentWarningCount} sub-agent warning{agentWarningCount > 1 ? 's are' : ' is'} available in the Active AI Sub-Agents panel above.
                  </p>
                )}
              </div>
            ) : (
              <div style={styles.splitWorkspace}>
                {/* Left Column: Errors list */}
                <div style={styles.errorsListCol}>
                  {errors.map(err => {
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
                            <span style={styles.errorHeadline}>{err.message.split('!')[0]}</span>
                          </div>
                          <span className={`severity-badge severity-${err.severity}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                            {err.severity}
                          </span>
                        </div>
                        
                        <p style={styles.errorDescCompact}>
                          {err.message.includes('!') ? err.message.substring(err.message.indexOf('!') + 1).trim() : err.message}
                        </p>
                        
                        <div style={styles.errorUrlText}>URL: {err.page_url}</div>
                      </button>
                    );
                  })}
                </div>
                
                {/* Right Column: Mapped Code & Fix */}
                <div className="glass-panel" style={styles.codeReviewCol} ref={codeReviewRef}>
                  {(() => {
                    const activeErr = errors.find(e => e.id === selectedErrorId) || errors[0];
                    if (!activeErr) return null;
                    
                    const ref = activeErr.code_reference;
                    const screenshotUrl = getScreenshotUrl(activeErr.screenshot_path);
                    if (!ref) {
                      return (
                        <div style={styles.noCodeRefBox}>
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
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    padding: '24px',
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
};
