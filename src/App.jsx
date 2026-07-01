import React, { useState, useEffect, useRef } from 'react';
import { Plus, Terminal, Activity, ShieldCheck, Bug, Lightbulb, Compass, Globe } from 'lucide-react';
import StatsOverview from './components/StatsOverview';
import TaskCard from './components/TaskCard';
import TaskDetails from './components/TaskDetails';
import CreateTaskModal from './components/CreateTaskModal';
import LiveProcessMonitor from './components/LiveProcessMonitor';
import PagesUnderTest from './components/PagesUnderTest';

const API_BASE = '/api';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [stats, setStats] = useState(null);

  // Loading States
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filterPageUrl, setFilterPageUrl] = useState(null);

  // Clear page filter when selecting another task
  useEffect(() => {
    setFilterPageUrl(null);
  }, [selectedTaskId]);

  // Keep a ref for active polling to prevent multiple intervals
  const pollingRef = useRef(null);

  // 1. Initial Data Fetch
  useEffect(() => {
    fetchTasks(true);
    fetchStats();
  }, []);

  // Keep refs of tasks and selectedTaskId to avoid stale closure in setInterval
  const tasksRef = useRef(tasks);
  const selectedTaskIdRef = useRef(selectedTaskId);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

  // 2. Poll when there are active tasks
  useEffect(() => {
    const hasRunningTasks = tasks.some(t => 
      ['pending', 'crawling', 'generating_test_cases', 'running_tests'].includes(t.status)
    );

    if (hasRunningTasks) {
      if (!pollingRef.current) {
        // Start polling
        pollingRef.current = setInterval(() => {
          fetchTasks(false);
          fetchStats();
          const currentSelectedTaskId = selectedTaskIdRef.current;
          if (currentSelectedTaskId) {
            // Also poll details for the selected running task
            const selectedTask = tasksRef.current.find(t => t.id === currentSelectedTaskId);
            if (selectedTask && ['pending', 'crawling', 'generating_test_cases', 'running_tests'].includes(selectedTask.status)) {
              fetchDetails(currentSelectedTaskId, false);
            }
          }
        }, 2000);
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        
        // Final sync of details when tasks finish
        const currentSelectedTaskId = selectedTaskIdRef.current;
        if (currentSelectedTaskId) {
          fetchDetails(currentSelectedTaskId, false);
        }
      }
    }

    return () => {
      if (pollingRef.current && !hasRunningTasks) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [tasks, selectedTaskId]);

  // 3. Fetch details whenever selection changes
  useEffect(() => {
    if (selectedTaskId) {
      fetchDetails(selectedTaskId, true);
    } else {
      setTaskDetails(null);
    }
  }, [selectedTaskId]);

  const fetchTasks = async (showLoading = false) => {
    if (showLoading) setIsListLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
        // If nothing selected, auto-select first task
        if (data.length > 0 && !selectedTaskIdRef.current) {
          setSelectedTaskId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      if (showLoading) setIsListLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchDetails = async (id, showLoading = false) => {
    if (showLoading) setIsDetailsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/details`);
      if (res.ok) {
        const data = await res.json();
        setTaskDetails(data);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      if (showLoading) setIsDetailsLoading(false);
    }
  };

  const handleCreateTask = async (urls, codebasePath, taskConfig = {}) => {
    setIsSubmitting(true);
    try {
      const targetUrls = Array.isArray(urls) ? urls : [urls];
      const createdTasks = [];
      const failedTasks = [];

      for (const url of targetUrls) {
        const res = await fetch(`${API_BASE}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, codebase_path: codebasePath, ...taskConfig }),
        });

        if (res.ok) {
          createdTasks.push(await res.json());
        } else {
          const errData = await res.json();
          failedTasks.push(`${url}: ${errData.detail || 'Failed to create task'}`);
        }
      }

      if (createdTasks.length > 0) {
        setIsCreateModalOpen(false);
        setSelectedTaskId(createdTasks[createdTasks.length - 1].id);
      }

      await fetchTasks(false);
      fetchStats();

      if (failedTasks.length > 0) {
        alert(`Some websites could not be added:\n${failedTasks.join('\n')}`);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error creating task:', err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedTaskId === id) {
          setSelectedTaskId(null);
          setTaskDetails(null);
        }
        await fetchTasks(false);
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleStopTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/stop`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchTasks(false);
        fetchStats();
        if (selectedTaskId === id) {
          fetchDetails(id, false);
        }
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.detail || 'Failed to stop task'}`);
      }
    } catch (err) {
      console.error('Error stopping task:', err);
    }
  };

  const handleStartTest = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/start-test`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchTasks(false);
        fetchStats();
        if (selectedTaskId === id) {
          fetchDetails(id, false);
        }
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.detail || 'Failed to start test'}`);
      }
    } catch (err) {
      console.error('Error starting test:', err);
    }
  };

  return (
    <div style={styles.appContainer}>
      {/* Header bar */}
      <header className="glass-panel" style={styles.navbar}>
        <div style={styles.brand}>
          <div style={styles.logoBox}>
            <Terminal size={20} color="#fff" />
          </div>
          <div>
            <h1 style={styles.brandTitle}>Datagrid QA</h1>
            <span style={styles.brandSub}>AI Agent Website Test Automation Suite</span>
          </div>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)} 
          className="btn-primary"
        >
          <Plus size={18} />
          <span>Test New Website</span>
        </button>
      </header>

      {/* Live Process Monitor */}
      <LiveProcessMonitor tasks={tasks} taskDetails={taskDetails} />

      {/* Global stats review */}
      <StatsOverview stats={stats} />

      {/* Pages Under Test */}
      <PagesUnderTest 
        taskDetails={taskDetails} 
        tasks={tasks} 
        setActiveTab={setActiveTab} 
        setFilterPageUrl={setFilterPageUrl} 
      />

      {/* Main split dashboard view */}
      <div style={styles.layoutGrid}>
        {/* Sidebar list */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitleRow}>
            <h3 style={styles.sidebarTitle}>Enrolled Websites</h3>
            <span style={styles.sidebarCount}>{tasks.length} Total</span>
          </div>
          
          <div style={styles.listContainer}>
            {isListLoading ? (
              <div style={styles.listSpinnerBox}>
                <div style={styles.listSpinner} />
              </div>
            ) : tasks.length === 0 ? (
              <div className="glass-panel" style={styles.emptyList}>
                <Globe size={32} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
                <div>No sites registered</div>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  style={styles.emptyListBtn}
                >
                  Create first test run
                </button>
              </div>
            ) : (
              tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={task.id === selectedTaskId}
                  onClick={() => setSelectedTaskId(task.id)}
                  onDelete={handleDeleteTask}
                  onStop={handleStopTask}
                />
              ))
            )}
          </div>
        </div>

        {/* Details diagnostics workspace */}
        <main className="glass-panel" style={styles.workspace}>
          <TaskDetails 
            taskDetails={taskDetails} 
            isDetailsLoading={isDetailsLoading}
            onStartTest={handleStartTest}
            onStopTest={handleStopTask}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            filterPageUrl={filterPageUrl}
            setFilterPageUrl={setFilterPageUrl}
            onRefreshDetails={() => {
              fetchDetails(selectedTaskId, false);
              fetchTasks(false);
            }}
          />
        </main>
      </div>

      {/* Task Creation popover */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

const styles = {
  appContainer: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '30px 20px 40px 20px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderRadius: '16px',
    marginBottom: '30px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  logoBox: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)',
  },
  brandTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    fontFamily: 'var(--font-title)',
    color: 'var(--text-main)',
    lineHeight: '1.1',
  },
  brandSub: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
    letterSpacing: '0.02em',
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '360px 1fr',
    gap: '30px',
    flex: 1,
    alignItems: 'start',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 280px)',
  },
  sidebarTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
    padding: '0 4px',
  },
  sidebarTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  sidebarCount: {
    fontSize: '0.75rem',
    color: 'var(--text-dim)',
    fontWeight: '600',
  },
  listContainer: {
    overflowY: 'auto',
    flex: 1,
    paddingRight: '4px',
  },
  listSpinnerBox: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px',
  },
  listSpinner: {
    width: '24px',
    height: '24px',
    border: '2px solid rgba(255, 255, 255, 0.05)',
    borderTop: '2px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin-slow 0.8s linear infinite',
  },
  emptyList: {
    padding: '30px 20px',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyListBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontWeight: '700',
    marginTop: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  workspace: {
    padding: '30px',
    minHeight: '480px',
    maxHeight: 'calc(100vh - 280px)',
    overflowY: 'auto',
  },
};
// Add media query handling in standard React app or via simple viewport resize checks
// This CSS system will support responsive grid out of the box.
