import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BotStatus, LogEntry } from './types';
import { generateWeeklyReport } from './services/geminiService';
import { sendToWeCom } from './services/wecomService';
import { WECOM_WEBHOOK_DEFAULT } from './constants';
import LogViewer from './components/LogViewer';
import ReportPreview from './components/ReportPreview';

// Helper for formatted time
const getTime = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

const App: React.FC = () => {
  // Config State
  const [apiKey, setApiKey] = useState<string>(process.env.API_KEY || '');
  const [webhookUrl, setWebhookUrl] = useState<string>(WECOM_WEBHOOK_DEFAULT);
  const [autoMode, setAutoMode] = useState<boolean>(true);
  
  // Runtime State
  const [status, setStatus] = useState<BotStatus>(BotStatus.WAITING);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastReport, setLastReport] = useState<string>('');
  const [countDown, setCountDown] = useState<string>('--:--:--');
  
  // Robust Scheduling Refs
  // We use a ref to track the last run date to avoid stale closures in setInterval
  const lastRunDateRef = useRef<string>('');

  // Logger
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      timestamp: getTime(),
      message,
      type
    }]);
  }, []);

  // The Workflow
  const executeWorkflow = useCallback(async () => {
    if (status === BotStatus.SEARCHING || status === BotStatus.GENERATING) return;

    if (!apiKey) {
      addLog("API Key missing. Cannot execute workflow.", 'error');
      setStatus(BotStatus.ERROR);
      // Auto-reset error state so scheduler can try again next week if key is fixed
      setTimeout(() => setStatus(BotStatus.WAITING), 10000); 
      return;
    }

    try {
      setStatus(BotStatus.SEARCHING);
      addLog("Starting workflow: Scanning data sources...", 'info');
      addLog("Sources: NMPA, CDE, FDA, WHO, and 30+ others.", 'info');

      // 1. Generate Report
      setStatus(BotStatus.GENERATING);
      addLog("Analysing data with Gemini 2.5 (Search Grounding)...", 'info');
      
      const reportContent = await generateWeeklyReport(apiKey);
      setLastReport(reportContent);
      addLog("Report generated successfully.", 'success');

      // 2. Send to WeCom
      setStatus(BotStatus.SENDING);
      addLog(`Sending to WeCom Webhook...`, 'info');
      
      await sendToWeCom(webhookUrl, reportContent);
      addLog("Successfully pushed to Enterprise WeChat.", 'success');
      
      setStatus(BotStatus.COMPLETED);
      addLog("Workflow complete. Waiting for next schedule.", 'success');

      // Reset to waiting after a delay to be ready for next cycle
      setTimeout(() => setStatus(BotStatus.WAITING), 60000);

    } catch (error: any) {
      setStatus(BotStatus.ERROR);
      addLog(`Error: ${error.message}`, 'error');
      // Auto-recover after 1 minute to ensure system doesn't get stuck in ERROR state forever
      setTimeout(() => setStatus(BotStatus.WAITING), 60000); 
    }
  }, [apiKey, webhookUrl, status, addLog]);

  // Scheduler Effect (Friday 16:30)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const day = now.getDay(); // 5 is Friday
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      // Date Key to ensure we only run once per day
      const dateKey = now.toLocaleDateString('en-GB');

      // Countdown / Status logic for UI
      const isFriday = day === 5;
      const isTimeWindow = hour === 16 && minute === 30; // 16:30:00 to 16:30:59
      
      let nextRunText = "Next run: Friday 16:30";
      if (isFriday) {
          if (hour < 16 || (hour === 16 && minute < 30)) {
             const diffMins = (16 * 60 + 30) - (hour * 60 + minute);
             nextRunText = diffMins < 60 ? `Starts in ${diffMins} mins` : "Today at 16:30";
          } else if (hour > 16 || (hour === 16 && minute > 30)) {
             nextRunText = "Next run: Next Friday";
          } else {
             nextRunText = "Running Scheduled Task...";
          }
      }
      setCountDown(nextRunText);

      // Trigger Logic
      // 1. Must be Auto Mode
      // 2. Must be Friday 16:30
      // 3. Must NOT have run today already (checked via Ref)
      // 4. Status must be WAITING (idle)
      if (
        autoMode && 
        isFriday && 
        isTimeWindow && 
        lastRunDateRef.current !== dateKey && 
        status === BotStatus.WAITING
      ) {
        addLog(`Auto-Scheduler triggered for ${dateKey}`, 'warning');
        lastRunDateRef.current = dateKey; // Mark as run immediately
        executeWorkflow();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [autoMode, status, executeWorkflow, addLog]);

  // Handle API Key Input for those who don't have env set
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Vaccine<span className="text-blue-600">Weekly</span>
              </h1>
              <p className="text-slate-500 mt-1">Automated Clinical Trial Intelligence & Reporting</p>
            </div>
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
              <div className={`w-3 h-3 rounded-full ${autoMode ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
              <div className="text-sm font-medium text-slate-600">
                {autoMode ? 'Auto-Pilot Active' : 'Manual Mode'}
              </div>
            </div>
          </div>
          {/* Production Warning */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm text-amber-800">
              <strong>Keep this tab open.</strong> The scheduler relies on the browser being active. 
              Running strictly at <strong>16:30 on Fridays</strong>.
            </div>
          </div>
        </header>

        {/* Configuration Panel */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Configuration</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Google Gemini API Key</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter AI Studio Key..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">WeCom Webhook URL</label>
              <input 
                type="text" 
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
              />
            </div>
          </div>
        </section>

        {/* Status & Control */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Status Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-2 flex flex-col justify-between">
             <div className="flex justify-between items-start">
               <div>
                  <h3 className="text-lg font-semibold text-slate-800">System Status</h3>
                  <p className="text-sm text-slate-500 mt-1">{countDown}</p>
               </div>
               <span className={`px-3 py-1 rounded-full text-xs font-bold
                 ${status === BotStatus.WAITING ? 'bg-slate-100 text-slate-600' : ''}
                 ${status === BotStatus.SEARCHING ? 'bg-blue-100 text-blue-600' : ''}
                 ${status === BotStatus.GENERATING ? 'bg-purple-100 text-purple-600' : ''}
                 ${status === BotStatus.SENDING ? 'bg-orange-100 text-orange-600' : ''}
                 ${status === BotStatus.COMPLETED ? 'bg-green-100 text-green-600' : ''}
                 ${status === BotStatus.ERROR ? 'bg-red-100 text-red-600' : ''}
               `}>
                 {status}
               </span>
             </div>
             
             <div className="mt-6 flex gap-3">
                <button
                  onClick={executeWorkflow}
                  disabled={status !== BotStatus.WAITING && status !== BotStatus.COMPLETED && status !== BotStatus.ERROR}
                  className={`px-6 py-2 rounded-lg font-medium text-white transition-all
                    ${status === BotStatus.WAITING || status === BotStatus.COMPLETED || status === BotStatus.ERROR
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg' 
                      : 'bg-slate-300 cursor-not-allowed'}
                  `}
                >
                  {status === BotStatus.SEARCHING ? 'Processing...' : 'Run Now (Manual)'}
                </button>
                <button
                  onClick={() => setAutoMode(!autoMode)}
                  className={`px-6 py-2 rounded-lg font-medium border transition-colors
                    ${autoMode 
                      ? 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200' 
                      : 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
                    }`}
                >
                  {autoMode ? 'Disable Timer' : 'Enable Timer'}
                </button>
             </div>
          </div>

          {/* Quick Stats / Info */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-xl shadow-md text-white flex flex-col justify-between">
             <div>
               <div className="text-indigo-100 text-sm font-medium mb-2">Next Scheduled Run</div>
               <div className="text-4xl font-bold mb-1">Friday</div>
               <div className="text-2xl opacity-90">16:30 PM</div>
             </div>
             <div className="mt-4 pt-4 border-t border-white/20 text-xs text-indigo-200">
               Targeting China & Global Databases (NMPA, FDA, WHO)
             </div>
          </div>
        </div>

        {/* Logs */}
        <LogViewer logs={logs} />

        {/* Preview */}
        <ReportPreview content={lastReport} />

      </div>
    </div>
  );
};

export default App;