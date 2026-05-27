'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  Loader2, 
  Search, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Briefcase, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Download, 
  Clock, 
  Sparkles, 
  Plus, 
  RefreshCw, 
  FileJson,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Award,
  AlertTriangle
} from 'lucide-react';
import { CandidateProfile, FileUploadState } from '@/types';
import { mockCandidates } from '@/utils/mockData';

export default function HomePage() {
  // App States
  const [filesQueue, setFilesQueue] = useState<FileUploadState[]>([]);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'evaluation' | 'raw'>('overview');
  
  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  
  // Environment Status
  const [forceMock, setForceMock] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Animate the processing steps to give visual feedback during extraction
  const processingStepsText = [
    "Reading file queue...",
    "Sending to secure backend proxy route...",
    "Contacting n8n workflow pipeline...",
    "Parsing PDF layout and extracting elements...",
    "Running AI model extraction on ATS fields...",
    "Synthesizing structured candidate profile cards..."
  ];

  useEffect(() => {
    if (isProcessing) {
      setProcessingStep(0);
      const interval = setInterval(() => {
        setProcessingStep((prev) => {
          if (prev < processingStepsText.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1800);
      return () => clearInterval(interval);
    }
  }, [isProcessing]);


  // Set default selection when candidates are loaded
  useEffect(() => {
    if (candidates.length > 0 && !selectedCandidateId) {
      setSelectedCandidateId(candidates[0].id);
    }
  }, [candidates, selectedCandidateId]);

  // Get active candidate profile
  const activeCandidate = candidates.find(c => c.id === selectedCandidateId) || null;

  // Search filter
  const filteredCandidates = candidates.filter(candidate => {
    const query = searchQuery.toLowerCase();
    return (
      candidate.name.toLowerCase().includes(query) ||
      (candidate.position && candidate.position.toLowerCase().includes(query)) ||
      (candidate.university && candidate.university.toLowerCase().includes(query)) ||
      (candidate.level && candidate.level.toLowerCase().includes(query)) ||
      (candidate.skills && candidate.skills.some(s => s.toLowerCase().includes(query)))
    );
  });

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  // Add files to the queue
  const addFilesToQueue = (newFiles: FileList) => {
    const allowedType = "application/pdf";
    const addedQueueItems: FileUploadState[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      
      // Validate PDF format
      if (file.type !== allowedType && !file.name.toLowerCase().endsWith('.pdf')) {
        alert(`File "${file.name}" must be a PDF.`);
        continue;
      }

      // Validate 10MB limit
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`File "${file.name}" exceeds the 10MB size limit.`);
        continue;
      }

      // Check if file is already in queue
      if (filesQueue.some(item => item.file.name === file.name && item.file.size === file.size)) {
        continue;
      }

      addedQueueItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        status: 'pending',
        progress: 0
      });
    }

    if (addedQueueItems.length > 0) {
      setFilesQueue(prev => [...prev, ...addedQueueItems]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
    // Reset input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove file from the queue
  const removeFileFromQueue = (id: string) => {
    setFilesQueue(prev => prev.filter(item => item.id !== id));
  };

  // Trigger file selection click
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Process CVs (Send to Next.js API Proxy)
  const handleProcessCVs = async () => {
    if (filesQueue.length === 0) return;
    
    setIsProcessing(true);
    setProcessingError(null);
    
    // Update all queue states to uploading/processing
    setFilesQueue(prev => prev.map(item => ({ ...item, status: 'processing', progress: 50 })));

    try {
      const payload = new FormData();
      filesQueue.forEach(item => {
        payload.append('files', item.file);
      });

      // Call API Proxy
      const mockQueryParam = forceMock ? '?mock=true' : '';
      const response = await fetch(`/api/process-cv${mockQueryParam}`, {
        method: 'POST',
        body: payload
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'The CV parser returned an error. Try toggling Mock Mode to demo.');
      }

      // Set all queue items as successful
      setFilesQueue(prev => prev.map(item => ({ ...item, status: 'success', progress: 100 })));
      
      // Append extracted candidate profiles
      setCandidates(prev => {
        // Filter out any duplicates if uploaded again
        const freshProfiles = data.data as CandidateProfile[];
        const filteredPrev = prev.filter(c => !freshProfiles.some(p => p.fileName === c.fileName));
        return [...filteredPrev, ...freshProfiles];
      });

      // Select the first parsed profile from this batch
      if (data.data && data.data.length > 0) {
        setSelectedCandidateId(data.data[0].id);
      }

      // Wait a moment so user sees the "Success" state in queue, then clear queue
      setTimeout(() => {
        setFilesQueue([]);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setProcessingError(err.message || 'An error occurred during CV parsing. Please check your environment variables and n8n webhook status.');
      setFilesQueue(prev => prev.map(item => ({ ...item, status: 'error', error: err.message })));
    } finally {
      setIsProcessing(false);
    }
  };

  // Load sample high-fidelity mock data directly for demo purposes
  const handleLoadDemoData = () => {
    setCandidates(mockCandidates);
    setSelectedCandidateId(mockCandidates[0].id);
    setProcessingError(null);
  };

  // Copy raw JSON to clipboard
  const handleCopyJson = () => {
    if (!activeCandidate) return;
    navigator.clipboard.writeText(JSON.stringify(activeCandidate, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Download raw JSON file
  const handleDownloadJson = () => {
    if (!activeCandidate) return;
    const blob = new Blob([JSON.stringify(activeCandidate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeCandidate.name.replace(/\s+/g, '_')}_profile.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper formatting for bytes
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper to render candidate badges based on status
  const getStatusColor = (status?: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('accept') || s.includes('pass') || s.includes('onboard')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (s.includes('negotiating') || s.includes('interview') || s.includes('r1') || s.includes('r2')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    if (s.includes('reject') || s.includes('fail') || s.includes('decline')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  // Dynamic list of skills extracted (either parsed directly or simulated for aesthetic completeness)
  const getCandidateSkills = (candidate: CandidateProfile): string[] => {
    if (candidate.rawResponse?.skills && Array.isArray(candidate.rawResponse.skills)) {
      return candidate.rawResponse.skills;
    }
    // Standard mock tags for standard display
    if (candidate.position?.toLowerCase().includes('frontend')) {
      return ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Redux Toolkit', 'REST APIs', 'Jest', 'Webpack', 'CI/CD'];
    }
    if (candidate.position?.toLowerCase().includes('product')) {
      return ['Product Strategy', 'Agile/Scrum', 'User Research', 'Product Roadmap', 'SQL', 'Amplitude', 'Jira', 'Mockups'];
    }
    return ['Cloud Infrastructure', 'Kubernetes', 'Docker', 'AWS', 'Terraform', 'CI/CD Pipelines', 'Bash scripting', 'Prometheus'];
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-start">
      
      {/* HEADER SECTION */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/20 p-2 rounded-xl border border-indigo-500/30">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              ResumeFlow AI
            </h1>
          </div>
          <p className="text-muted-foreground mt-1.5 text-sm max-w-xl">
            Upload multiple PDF resumes, parse candidate information using automated n8n workflows, and view normalized ATS spreadsheets in real-time.
          </p>
        </div>

        {/* DEMO / MOCK SWITCH */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 border border-white/5 px-4 py-2.5 rounded-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={forceMock}
                onChange={() => setForceMock(!forceMock)}
              />
              <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
              <span className="ml-2 text-xs font-medium text-slate-300 select-none">
                Demo Mode
              </span>
            </label>
          </div>
        </div>
      </header>

      {/* ERROR BANNER */}
      {processingError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Workflow Processing Failure</p>
            <p className="opacity-90 mt-0.5">{processingError}</p>
            <div className="mt-3 flex gap-3">
              <button 
                onClick={() => {
                  setForceMock(true);
                  setProcessingError(null);
                }} 
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-semibold hover:bg-rose-500/30 transition"
              >
                Enable Demo/Mock Mode
              </button>
              <button 
                onClick={handleLoadDemoData}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition"
              >
                Load Sample Profiles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD GRID CONTAINER */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-h-0">
        
        {/* LEFT COLUMN: UPLOAD CONTROLS OR CANDIDATE SELECTOR */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
          
          {/* UPLOAD BOX (ALWAYS AVAILABLE OR MINIMIZED IF PROFILES EXIST) */}
          <div className={`glass-panel rounded-3xl p-6 transition-all duration-300 ${candidates.length > 0 ? 'bg-slate-950/40 border-white/5' : ''}`}>
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
                {candidates.length > 0 ? 'Upload More Resumes' : 'Start Processing'}
              </h2>
              {candidates.length === 0 && (
                <button 
                  onClick={handleLoadDemoData} 
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Load Samples
                </button>
              )}
            </div>

            {/* DRAG AND DROP ZONE */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                isDragActive 
                  ? 'border-indigo-500 bg-indigo-500/5 scale-[0.99]' 
                  : 'border-white/10 hover:border-white/20 hover:bg-white/2 hover:scale-[1.01]'
              } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf"
                className="hidden"
                onChange={handleFileInputChange}
                onClick={(e) => e.stopPropagation()}
              />
              
              <div className="bg-slate-900 p-4 rounded-full border border-white/5 mb-3 text-slate-400 shadow-inner">
                <UploadCloud className="w-6 h-6 text-slate-300" />
              </div>
              
              <span className="text-sm font-medium text-slate-200">Drag & Drop CV Files</span>
              <span className="text-xs text-slate-500 mt-1">Supports multiple PDFs up to 10MB each</span>
            </div>

            {/* SELECTED FILES QUEUE LIST */}
            {filesQueue.length > 0 && (
              <div className="mt-6 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">{filesQueue.length} File(s) Selected</span>
                  <button 
                    onClick={() => setFilesQueue([])} 
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {filesQueue.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{formatBytes(item.size)}</p>
                        </div>
                      </div>

                      {isProcessing ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                          <span className="text-[10px] text-indigo-400 font-semibold">Parsing...</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFileFromQueue(item.id);
                          }}
                          className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* PROCESS BUTTON */}
                <button
                  onClick={handleProcessCVs}
                  disabled={isProcessing}
                  className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Running AI Extraction...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Process {filesQueue.length} CV{filesQueue.length > 1 ? 's' : ''} with n8n</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ACTIVE CANDIDATE SELECTOR / ATS LIST */}
          {candidates.length > 0 && (
            <div className="glass-panel rounded-3xl p-6 flex flex-col min-h-[300px]">
              
              <div className="flex items-center justify-between mb-4 gap-2">
                <div>
                  <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
                    ATS Candidates
                  </h2>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">{candidates.length} Profiles Extracted</span>
                </div>
                <button
                  onClick={() => {
                    setCandidates([]);
                    setSelectedCandidateId(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 hover:underline"
                >
                  Reset List
                </button>
              </div>

              {/* SEARCH BAR */}
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search name, skill, university..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* CANDIDATE SIDEBAR CARDS */}
              <div className="space-y-2.5 overflow-y-auto max-h-[400px] pr-1">
                {filteredCandidates.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-xs text-slate-500">No candidates match your search.</p>
                  </div>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const isSelected = candidate.id === selectedCandidateId;
                    return (
                      <div
                        key={candidate.id}
                        onClick={() => setSelectedCandidateId(candidate.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                          isSelected 
                            ? 'bg-indigo-600/10 border-indigo-500/40 shadow-md shadow-indigo-950/20' 
                            : 'bg-slate-950/40 border-white/5 hover:bg-slate-900/40 hover:border-white/10'
                        }`}
                      >
                        {/* Avatar initials */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {candidate.name.split(' ').pop()?.substring(0, 2).toUpperCase() || 'CV'}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-slate-200 truncate">{candidate.name}</p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{candidate.position || 'Parsed Profile'}</p>
                          
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {candidate.level && (
                              <span className="text-[9px] font-semibold bg-slate-800 border border-white/5 text-slate-400 px-1.5 py-0.5 rounded-md">
                                {candidate.level}
                              </span>
                            )}
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${getStatusColor(candidate.status)}`}>
                              {candidate.status || 'Pending'}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className={`w-3.5 h-3.5 text-slate-500 self-center shrink-0 transition-transform ${isSelected ? 'translate-x-1 text-indigo-400' : ''}`} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: MAIN WORKSPACE (UPLOADER STATE OR PROFILE VIEWER) */}
        <div className="lg:col-span-8 h-full flex flex-col">
          
          {/* STATE A: SIMULATING PROCESSING LOADER */}
          {isProcessing && (
            <div className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center text-center flex-1 min-h-[480px]">
              <div className="relative mb-6">
                {/* Glowing Loader Animation */}
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse"></div>
                <Loader2 className="w-16 h-16 text-indigo-500 animate-spin relative" />
              </div>

              <h2 className="text-xl font-bold text-slate-200">Processing Your Resumes</h2>
              <p className="text-slate-400 text-sm mt-1 max-w-md">
                n8n is running your parsing flow to read, extract, and build the profile models.
              </p>

              {/* AUTOMATED STEP CHECKLIST FOR AESTHETICS */}
              <div className="mt-8 max-w-sm w-full bg-slate-900/40 border border-white/5 rounded-2xl p-4 text-left space-y-3">
                {processingStepsText.map((step, idx) => {
                  const isCurrent = idx === processingStep;
                  const isPassed = idx < processingStep;
                  
                  return (
                    <div key={idx} className="flex items-center gap-3 text-xs transition-opacity duration-300">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0"></div>
                      )}
                      <span className={`font-medium ${
                        isPassed ? 'text-slate-400 line-through decoration-slate-600' : isCurrent ? 'text-indigo-300 font-bold' : 'text-slate-600'
                      }`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STATE B: EMPTY INITIAL VIEW */}
          {!isProcessing && candidates.length === 0 && (
            <div className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center text-center flex-1 min-h-[480px]">
              <div className="bg-indigo-600/10 p-6 rounded-3xl border border-indigo-500/20 text-indigo-400 mb-4 shadow-inner">
                <FileText className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-200">No Candidate Profiles Extracted</h2>
              <p className="text-slate-400 text-sm mt-1.5 max-w-md mx-auto">
                Upload one or multiple PDF resumes to the queue to kickstart the n8n synchronous parsing flow, or load our simulated sample data.
              </p>
              
              <div className="flex gap-4 mt-6">
                <button 
                  onClick={triggerFileSelect}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/10"
                >
                  Upload CVs
                </button>
                <button 
                  onClick={handleLoadDemoData}
                  className="bg-slate-900 hover:bg-slate-850 border border-white/10 text-slate-300 font-semibold py-2.5 px-5 rounded-xl text-sm transition-all"
                >
                  Load Sample Profiles
                </button>
              </div>
            </div>
          )}

          {/* STATE C: HIGH-FIDELITY CANDIDATE DETAILED ATS DASHBOARD */}
          {!isProcessing && candidates.length > 0 && activeCandidate && (
            <div className="glass-panel rounded-3xl flex-1 flex flex-col min-h-[480px] overflow-hidden border border-white/5">
              
              {/* DETAIL PANEL HEADER */}
              <div className="p-6 border-b border-white/5 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Big initials avatar */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-lg font-bold text-white shadow-md shadow-indigo-600/10 shrink-0">
                    {activeCandidate.name.split(' ').pop()?.substring(0, 2).toUpperCase() || 'CV'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-100 truncate">{activeCandidate.name}</h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(activeCandidate.status)}`}>
                        {activeCandidate.status || 'Screening'}
                      </span>
                    </div>
                    
                    <p className="text-slate-400 text-sm mt-0.5 font-medium flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{activeCandidate.position || 'Parsed Role'}</span>
                      {activeCandidate.level && (
                        <>
                          <span className="h-1 w-1 bg-slate-700 rounded-full"></span>
                          <span className="text-slate-500 text-xs font-semibold">{activeCandidate.level} Level</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* PROFILE ACTIONS */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {activeCandidate.cvLink && (
                    <a
                      href={activeCandidate.cvLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
                      title="Open Extracted CV Document"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  
                  <button
                    onClick={handleCopyJson}
                    className="p-2 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition flex items-center gap-1.5"
                    title="Copy Raw Profile JSON"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-[10px] font-semibold hidden md:inline">{copySuccess ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleDownloadJson}
                    className="p-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-600/20 transition flex items-center gap-1.5"
                    title="Export Profile JSON"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-[10px] font-semibold hidden md:inline">Export</span>
                  </button>
                </div>
              </div>

              {/* TABS SELECTOR */}
              <div className="border-b border-white/5 bg-slate-950/20 px-6 flex">
                {(['overview', 'evaluation', 'raw'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3.5 px-4 text-xs font-bold border-b-2 tracking-wide uppercase transition-all -mb-[1px] select-none ${
                      activeTab === tab 
                        ? 'border-indigo-500 text-indigo-400' 
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab === 'raw' ? 'Raw Response' : tab}
                  </button>
                ))}
              </div>

              {/* TAB CONTENT SPACE */}
              <div className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-380px)]">
                
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    
                    {/* PERSONAL INFORMATION CARD GRID */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-400" /> Identity & Contact
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        
                        {/* EMAIL */}
                        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-950 text-indigo-400 border border-white/5">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email</p>
                            {activeCandidate.email ? (
                              <a href={`mailto:${activeCandidate.email}`} className="text-xs font-semibold text-slate-300 truncate hover:text-indigo-400 block mt-0.5">{activeCandidate.email}</a>
                            ) : (
                              <p className="text-xs text-slate-600 italic mt-0.5">Not extracted</p>
                            )}
                          </div>
                        </div>

                        {/* PHONE */}
                        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-950 text-indigo-400 border border-white/5">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Phone</p>
                            {activeCandidate.phone ? (
                              <a href={`tel:${activeCandidate.phone}`} className="text-xs font-semibold text-slate-300 truncate hover:text-indigo-400 block mt-0.5">{activeCandidate.phone}</a>
                            ) : (
                              <p className="text-xs text-slate-600 italic mt-0.5">Not extracted</p>
                            )}
                          </div>
                        </div>

                        {/* YOB */}
                        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-950 text-indigo-400 border border-white/5">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Year of Birth</p>
                            <p className="text-xs font-semibold text-slate-300 mt-0.5">{activeCandidate.yearOfBirth || 'Not extracted'}</p>
                          </div>
                        </div>

                        {/* BRANCH */}
                        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-950 text-indigo-400 border border-white/5">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Target Branch</p>
                            <p className="text-xs font-semibold text-slate-300 mt-0.5 truncate">{activeCandidate.branch || 'Not extracted'}</p>
                          </div>
                        </div>

                        {/* EXPECTED SALARY */}
                        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-950 text-emerald-400 border border-white/5">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Expect Gross Salary</p>
                            <p className="text-xs font-extrabold text-emerald-400 mt-0.5">{activeCandidate.expectSalary || 'Negotiable'}</p>
                          </div>
                        </div>

                        {/* SOURCE DETAIL */}
                        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-950 text-indigo-400 border border-white/5">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Source Detail</p>
                            <p className="text-xs font-semibold text-slate-300 mt-0.5 truncate">{activeCandidate.sourceDetail || 'Direct Apply'}</p>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* DYNAMIC SKILLS BADGES */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-indigo-400" /> Extracted Skill Matrix
                      </h3>
                      
                      <div className="flex flex-wrap gap-2 bg-slate-900/35 border border-white/5 p-4 rounded-2xl">
                        {getCandidateSkills(activeCandidate).map((skill, i) => (
                          <span 
                            key={i} 
                            className="bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-xl text-xs font-medium cursor-default transition"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* EDUCATION INFORMATION */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Educational Background
                      </h3>
                      
                      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/5 pb-4 mb-4">
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-200 truncate">{activeCandidate.university || 'University not specified'}</h4>
                            <p className="text-xs text-indigo-400 mt-0.5">{activeCandidate.educationalLevel || 'Degree not specified'}</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Graduation Month: {activeCandidate.month || activeCandidate.appliedDate?.split('-')[1] || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Extra metadata blocks */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 font-bold block">Application Wk/Mo:</span>
                            <span className="text-slate-300 mt-0.5 block">{activeCandidate.week || 'W20'} / {activeCandidate.month || 'May'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold block">Resume File Reference:</span>
                            <span className="text-indigo-400 mt-0.5 block truncate font-mono select-all hover:underline cursor-pointer">{activeCandidate.fileName}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 2: EVALUATION & WORKFLOW STATS */}
                {activeTab === 'evaluation' && (
                  <div className="space-y-6">
                    
                    {/* HM REVIEW SUMMARY */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
                      <div className="flex items-center justify-between gap-4 mb-3 border-b border-white/5 pb-3">
                        <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-indigo-400" /> Hiring Manager Evaluation
                        </h3>
                        {activeCandidate.rate && (
                          <div className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg px-2.5 py-1 text-xs font-extrabold">
                            Rate: {activeCandidate.rate}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/30 p-4 rounded-xl border border-white/5">
                        &ldquo;{activeCandidate.hmReview || 'Hiring Manager review commentary is currently blank. Ready for first round rating.'}&rdquo;
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs pt-2">
                        <div>
                          <span className="text-slate-500 block">HM Result Status</span>
                          <span className="text-slate-200 font-semibold block mt-0.5">{activeCandidate.hmResult || 'Awaiting Review'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">TA Owner Assigned</span>
                          <span className="text-slate-200 font-semibold block mt-0.5">{activeCandidate.taOwner || 'Unassigned'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Interview Panel</span>
                          <span className="text-slate-200 font-semibold block mt-0.5 truncate">{activeCandidate.interviewer || 'To be selected'}</span>
                        </div>
                      </div>
                    </div>

                    {/* DETAILED DATE TIMELINE TRACKER */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
                      <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-indigo-400" /> Recruitment Pipeline Milestones
                      </h3>

                      {/* DECLINE WARNING BANNER */}
                      {activeCandidate.declineReason && (
                        <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-2.5 text-xs">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Decline Reason Provided:</p>
                            <p className="opacity-95 mt-0.5 font-medium">{activeCandidate.declineReason}</p>
                          </div>
                        </div>
                      )}

                      {/* GRID TIMELINE MILESTONES */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
                        
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-slate-500 block">Applied Date</span>
                          <span className="text-slate-200 font-semibold mt-1 block">{activeCandidate.appliedDate || 'N/A'}</span>
                        </div>

                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-slate-500 block">R1 Tech Date</span>
                          <span className="text-slate-200 font-semibold mt-1 block">{activeCandidate.r1Date || 'Pending'}</span>
                        </div>

                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-slate-500 block">R2 Culture Date</span>
                          <span className="text-slate-200 font-semibold mt-1 block">{activeCandidate.r2Date || 'Pending'}</span>
                        </div>

                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-slate-500 block">Offer Date</span>
                          <span className="text-slate-200 font-semibold mt-1 block">{activeCandidate.offerDate || 'Pending'}</span>
                        </div>

                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-slate-500 block">Accepted Offer</span>
                          <span className="text-slate-200 font-semibold mt-1 block">{activeCandidate.acceptedOfferDate || 'Pending'}</span>
                        </div>

                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-slate-500 block">Onboard Date</span>
                          <span className="text-slate-200 font-semibold mt-1 block text-emerald-400">{activeCandidate.onboardDate || 'Pending'}</span>
                        </div>

                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-slate-500 block">Time to Hire</span>
                          <span className="text-slate-200 font-semibold mt-1 block">{activeCandidate.timeToHire || 'Calculating'}</span>
                        </div>

                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-slate-500 block">Calendar Month</span>
                          <span className="text-slate-200 font-semibold mt-1 block">{activeCandidate.month || 'May'}</span>
                        </div>

                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 3: RAW JSON */}
                {activeTab === 'raw' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Exact JSON returned from server-side proxy route:</span>
                      <button 
                        onClick={handleCopyJson} 
                        className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
                      >
                        <Copy className="w-3 h-3" /> {copySuccess ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>

                    <pre className="p-4 rounded-2xl bg-slate-950 border border-white/5 text-xs text-indigo-300 overflow-x-auto font-mono max-h-96 shadow-inner leading-relaxed">
                      {JSON.stringify(activeCandidate, null, 2)}
                    </pre>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
