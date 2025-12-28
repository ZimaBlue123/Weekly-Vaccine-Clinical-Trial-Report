import React, { useState, useEffect, useCallback } from 'react';
import { BotStatus, LogEntry, AppConfig } from './types';
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

      // Reset to waiting after a delay
      setTimeout(() => setStatus(BotStatus.WAITING), 5000);

    } catch (error: any) {
      setStatus(BotStatus.ERROR);
      addLog(`Error: ${error.message}`, 'error');
    }
  }, [apiKey, webhookUrl, status, addLog]);

  // Scheduler Effect (Friday 16:30)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const day = now.getDay(); // 5 is Friday
      const hour = now.getHours();
      const minute = now.getMinutes();
      const second = now.getSeconds();

      // Countdown / Status logic for UI
      const isFriday = day === 5;
      const isTime = hour === 16 && minute === 30;
      
      let nextRunText = "Next run: Friday 16:30";
      if (isFriday && hour < 16) nextRunText = `Today at 16:30`;
      if (isFriday && hour === 16 && minute < 30) nextRunText = `Starts in ${30 - minute} mins`;
      setCountDown(nextRunText);

      // Trigger Logic
      if (autoMode && isFriday && isTime && second === 0 && status === BotStatus.WAITING) {
        addLog("Auto-Scheduler triggered.", 'warning');
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
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                  {status === BotStatus.SEARCHING ? 'Processing...' : 'Run Now'}
                </button>
                <button
                  onClick={() => setAutoMode(!autoMode)}
                  className="px-6 py-2 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                >
                  {autoMode ? 'Disable Timer' : 'Enable Timer'}
                </button>
             </div>
          </div>

          {/* Quick Stats / Info */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-xl shadow-md text-white">
             <div className="text-indigo-100 text-sm font-medium mb-2">Schedule Target</div>
             <div className="text-4xl font-bold mb-1">Friday</div>
             <div className="text-2xl opacity-90">16:30 PM</div>
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
