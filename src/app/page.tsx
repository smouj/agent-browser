'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Monitor, Plus, Trash2, ExternalLink, Eye, Play, ChevronRight,
  Search, Copy, Clock, Globe, Chrome, Globe2, Compass, Loader2,
  PanelLeftClose, PanelLeft, Terminal, ImageIcon, Cookie, FileText,
  AlertCircle, CheckCircle2, XCircle, RefreshCw, ArrowLeft, ArrowRight,
  MousePointer, Type, Layers, Keyboard, Maximize2, Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────

interface Session {
  id: string;
  name: string;
  browserType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ActionLog {
  id: string;
  sessionId: string;
  action: string;
  target?: string;
  value?: string;
  result?: string;
  duration?: number;
  createdAt: string;
}

interface ActionResult {
  success: boolean;
  action: string;
  target?: string;
  value?: string;
  data?: any;
  error?: string;
  duration: number;
}

// ─── Browser Icons ──────────────────────────────────────────────────

function BrowserIcon({ type, className = 'h-4 w-4' }: { type: string; className?: string }) {
  switch (type) {
    case 'firefox': return <Globe2 className={className} />;
    case 'webkit': return <Compass className={className} />;
    default: return <Globe className={className} />;
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 border-emerald-200 hover:bg-emerald-500/25"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />Active</Badge>;
    case 'closed':
      return <Badge variant="secondary" className="text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-gray-400 mr-1.5" />Closed</Badge>;
    case 'error':
      return <Badge variant="destructive" className="bg-red-500/15 text-red-600 border-red-200 hover:bg-red-500/25"><span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5" />Error</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ─── Main App Component ────────────────────────────────────────────

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [visionData, setVisionData] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Action input state
  const [actionUrl, setActionUrl] = useState('');
  const [actionSelector, setActionSelector] = useState('');
  const [actionValue, setActionValue] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');

  // ─── Fetch Sessions ────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/browser/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      toast.error('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  // ─── Create Session ────────────────────────────────────────
  const createSession = async (browserType: string = 'chromium', name?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/browser/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || `${browserType.charAt(0).toUpperCase() + browserType.slice(1)} Session`,
          browserType,
          headless: true,
        }),
      });
      if (res.ok) {
        const session = await res.json();
        toast.success(`Session "${session.name}" created`);
        await fetchSessions();
        // Auto select
        setTimeout(() => {
          const newSession = { ...session, updatedAt: session.createdAt, status: 'active' };
          setSelectedSession(newSession);
        }, 500);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create session');
      }
    } catch {
      toast.error('Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete Session ────────────────────────────────────────
  const deleteSession = async (id: string) => {
    try {
      const res = await fetch(`/api/browser/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Session deleted');
        if (selectedSession?.id === id) {
          setSelectedSession(null);
          setScreenshot(null);
          setLogs([]);
          setVisionData(null);
        }
        await fetchSessions();
      }
    } catch {
      toast.error('Failed to delete session');
    }
  };

  // ─── Execute Action ────────────────────────────────────────
  const executeAction = async (action: string, target?: string, value?: string, options?: any): Promise<ActionResult | null> => {
    if (!selectedSession) return null;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/browser/sessions/${selectedSession.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target, value, options }),
      });
      const result: ActionResult = await res.json();
      if (!result.success) {
        toast.error(result.error || `Action ${action} failed`);
      }
      // Refresh logs
      fetchLogs();
      // Update URL/title if navigation
      if (['navigate', 'goBack', 'goForward', 'reload'].includes(action)) {
        setTimeout(() => {
          setCurrentUrl(result.data?.url || currentUrl);
          setPageTitle(result.data?.title || pageTitle);
          takeScreenshot();
        }, 500);
      }
      return result;
    } catch {
      toast.error(`Failed to execute action: ${action}`);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Take Screenshot ───────────────────────────────────────
  const takeScreenshot = async () => {
    if (!selectedSession) return;
    try {
      const res = await fetch(`/api/browser/sessions/${selectedSession.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'screenshot', options: { type: 'png' } }),
      });
      const result = await res.json();
      if (result.success && result.data?.screenshot) {
        setScreenshot(result.data.screenshot);
      }
    } catch {
      // Silent fail for screenshots
    }
  };

  // ─── Fetch Vision Data ─────────────────────────────────────
  const fetchVision = async () => {
    if (!selectedSession) return;
    try {
      const res = await fetch(`/api/browser/sessions/${selectedSession.id}/vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullPage: false }),
      });
      const data = await res.json();
      setVisionData(data);
      if (data.screenshot) setScreenshot(data.screenshot);
      if (data.metadata?.url) setCurrentUrl(data.metadata.url);
      if (data.metadata?.title) setPageTitle(data.metadata.title);
    } catch {
      toast.error('Failed to fetch vision data');
    }
  };

  // ─── Fetch Logs ────────────────────────────────────────────
  const fetchLogs = async () => {
    if (!selectedSession) return;
    try {
      const res = await fetch(`/api/browser/sessions/${selectedSession.id}/logs?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // Silent fail
    }
  };

  // ─── Select Session ────────────────────────────────────────
  const handleSelectSession = (session: Session) => {
    setSelectedSession(session);
    setScreenshot(null);
    setVisionData(null);
    setLogs([]);
    setCurrentUrl('');
    setPageTitle('');
    // Fetch initial data
    fetchLogs();
    takeScreenshot();
  };

  // ─── Quick Actions ─────────────────────────────────────────
  const handleNavigate = async () => {
    if (!actionUrl.trim()) return;
    await executeAction('navigate', actionUrl.trim());
    setActionUrl('');
  };

  const handleGoBack = () => executeAction('goBack');
  const handleGoForward = () => executeAction('goForward');
  const handleReload = () => executeAction('reload');

  const handleQuickClick = async () => {
    if (!actionSelector.trim()) return;
    await executeAction('click', actionSelector.trim());
    setActionSelector('');
  };

  const handleQuickType = async () => {
    if (!actionSelector.trim()) return;
    await executeAction('type', actionSelector.trim(), actionValue, { pressEnter: true });
    setActionSelector('');
    setActionValue('');
  };

  // ─── Copy to clipboard ─────────────────────────────────────
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {/* ─── Header ──────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </Button>
              <div className="flex items-center gap-2">
                <img src="/browser-logo.png" alt="AgentBrowser" className="h-7 w-7 rounded-md" />
                <div>
                  <h1 className="text-sm font-semibold leading-none">AgentBrowser</h1>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">AI Browser Automation</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedSession && (
                <Badge variant="outline" className="text-xs gap-1.5">
                  <BrowserIcon type={selectedSession.browserType} className="h-3 w-3" />
                  {selectedSession.name}
                </Badge>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    New Session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Browser Session</DialogTitle>
                    <DialogDescription>Launch a new browser instance for automation</DialogDescription>
                  </DialogHeader>
                  <CreateSessionForm onCreate={createSession} loading={loading} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* ─── Sidebar ────────────────────────────────────── */}
          {sidebarOpen && (
            <aside className="w-72 border-r bg-muted/30 flex flex-col shrink-0">
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sessions</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">{sessions.length}</Badge>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {sessions.length === 0 && !loading && (
                    <div className="text-center py-8 px-4">
                      <Monitor className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">No sessions yet</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">Create a new session to get started</p>
                    </div>
                  )}
                  {loading && sessions.length === 0 && (
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  )}
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => handleSelectSession(session)}
                      className={`w-full text-left p-3 rounded-lg transition-all hover:bg-accent/50 group ${
                        selectedSession?.id === session.id
                          ? 'bg-accent border border-accent-foreground/10'
                          : 'border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 p-1.5 rounded-md ${
                          selectedSession?.id === session.id ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'
                        }`}>
                          <BrowserIcon type={session.browserType} className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium truncate">{session.name}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={session.status} />
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(session.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </aside>
          )}

          {/* ─── Main Content ────────────────────────────────── */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {!selectedSession ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <img src="/browser-logo.png" alt="AgentBrowser" className="h-20 w-20 mx-auto mb-6 rounded-2xl shadow-lg" />
                  <h2 className="text-xl font-bold mb-2">Welcome to AgentBrowser</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Create a browser session to start automating. Control browsers via REST API or the built-in UI.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <Card className="p-3 border-dashed">
                      <MousePointer className="h-5 w-5 mx-auto mb-1.5 text-emerald-500" />
                      <p className="text-xs font-medium">Click & Type</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Interact with elements</p>
                    </Card>
                    <Card className="p-3 border-dashed">
                      <Eye className="h-5 w-5 mx-auto mb-1.5 text-amber-500" />
                      <p className="text-xs font-medium">Vision AI</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Screenshots & DOM</p>
                    </Card>
                    <Card className="p-3 border-dashed">
                      <Code className="h-5 w-5 mx-auto mb-1.5 text-violet-500" />
                      <p className="text-xs font-medium">REST API</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Full programmatic control</p>
                    </Card>
                  </div>
                  <Button onClick={() => createSession('chromium', 'My First Session')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="h-4 w-4 mr-1.5" /> Create Your First Session
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* ─── Navigation Bar ──────────────────────── */}
                <div className="border-b bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoBack} disabled={actionLoading}>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoForward} disabled={actionLoading}>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReload} disabled={actionLoading}>
                      <RefreshCw className={`h-3.5 w-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <div className="flex-1 flex items-center gap-1 bg-background rounded-md border px-2 py-1">
                      <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        value={actionUrl}
                        onChange={(e) => setActionUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                        placeholder={currentUrl || 'Enter URL and press Enter...'}
                        className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                        disabled={actionLoading}
                      />
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleNavigate} disabled={actionLoading || !actionUrl.trim()}>
                      Go
                    </Button>
                    <Separator orientation="vertical" className="h-5 mx-1" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={takeScreenshot} disabled={actionLoading}>
                          <ImageIcon className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Take Screenshot</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchVision} disabled={actionLoading}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Vision AI</p></TooltipContent>
                    </Tooltip>
                  </div>
                  {pageTitle && (
                    <p className="text-[10px] text-muted-foreground mt-1 truncate ml-12">{pageTitle}</p>
                  )}
                </div>

                {/* ─── Tabbed Content ───────────────────────── */}
                <Tabs defaultValue="screenshot" className="flex-1 flex flex-col overflow-hidden">
                  <div className="border-b px-3">
                    <TabsList className="bg-transparent h-9 p-0 gap-0">
                      <TabsTrigger value="screenshot" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3">
                        <ImageIcon className="h-3 w-3 mr-1" /> Screenshot
                      </TabsTrigger>
                      <TabsTrigger value="actions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3">
                        <Play className="h-3 w-3 mr-1" /> Actions
                      </TabsTrigger>
                      <TabsTrigger value="vision" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3">
                        <Eye className="h-3 w-3 mr-1" /> Vision AI
                      </TabsTrigger>
                      <TabsTrigger value="logs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3">
                        <FileText className="h-3 w-3 mr-1" /> Logs
                      </TabsTrigger>
                      <TabsTrigger value="api" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3">
                        <Terminal className="h-3 w-3 mr-1" /> API
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* ─── Screenshot Tab ─────────────────────── */}
                  <TabsContent value="screenshot" className="flex-1 overflow-hidden p-3 m-0">
                    {screenshot ? (
                      <div className="relative h-full flex items-center justify-center bg-muted/20 rounded-lg border overflow-hidden">
                        <img
                          src={`data:image/png;base64,${screenshot}`}
                          alt="Browser screenshot"
                          className="max-w-full max-h-full object-contain"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={() => copyToClipboard(`data:image/png;base64,${screenshot}`)}
                          >
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          {actionLoading ? (
                            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                          ) : (
                            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                          )}
                          <p className="text-sm text-muted-foreground">
                            {actionLoading ? 'Capturing...' : 'No screenshot taken yet'}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            Navigate to a URL or click the camera icon
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ─── Actions Tab ────────────────────────── */}
                  <TabsContent value="actions" className="flex-1 overflow-hidden m-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 h-full overflow-auto">
                      {/* Quick Actions */}
                      <Card className="shrink-0">
                        <CardHeader className="pb-3 pt-3 px-3">
                          <CardTitle className="text-sm">Quick Actions</CardTitle>
                          <CardDescription className="text-[10px]">Common browser interactions</CardDescription>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 space-y-2">
                          {/* Click */}
                          <div className="flex gap-1.5">
                            <Input
                              placeholder="CSS selector (e.g., button#submit)"
                              value={actionSelector}
                              onChange={(e) => setActionSelector(e.target.value)}
                              className="text-xs h-8"
                              onKeyDown={(e) => e.key === 'Enter' && handleQuickClick()}
                            />
                            <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleQuickClick} disabled={actionLoading || !actionSelector.trim()}>
                              <MousePointer className="h-3 w-3 mr-1" /> Click
                            </Button>
                          </div>
                          {/* Type */}
                          <div className="flex gap-1.5">
                            <Input
                              placeholder="Selector"
                              value={actionSelector}
                              onChange={(e) => setActionSelector(e.target.value)}
                              className="text-xs h-8 flex-1"
                            />
                            <Input
                              placeholder="Text to type"
                              value={actionValue}
                              onChange={(e) => setActionValue(e.target.value)}
                              className="text-xs h-8 flex-1"
                              onKeyDown={(e) => e.key === 'Enter' && handleQuickType()}
                            />
                            <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleQuickType} disabled={actionLoading || !actionSelector.trim() || !actionValue.trim()}>
                              <Type className="h-3 w-3 mr-1" /> Type
                            </Button>
                          </div>
                          {/* Key Press */}
                          <div className="flex gap-1.5">
                            <Input
                              placeholder="Key (e.g., Enter, Tab, Escape)"
                              className="text-xs h-8"
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  await executeAction('press', undefined, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                              id="keyInput"
                            />
                            <Button size="sm" className="h-8 text-xs shrink-0" onClick={async () => {
                              const input = document.getElementById('keyInput') as HTMLInputElement;
                              if (input.value) {
                                await executeAction('press', undefined, input.value);
                                input.value = '';
                              }
                            }}>
                              <Keyboard className="h-3 w-3 mr-1" /> Press
                            </Button>
                          </div>
                          <Separator />
                          {/* Additional Actions */}
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { label: 'Scroll Down', action: 'scroll', target: 'down', value: '500', icon: '↓' },
                              { label: 'Scroll Up', action: 'scroll', target: 'up', value: '500', icon: '↑' },
                              { label: 'Hover', action: 'hover', target: true, icon: '◎' },
                              { label: 'Wait 1s', action: 'wait', value: '1000', icon: '⏱' },
                              { label: 'Full Screenshot', action: 'screenshot', options: { fullPage: true }, icon: '📷' },
                              { label: 'Get Cookies', action: 'getCookies', icon: '🍪' },
                              { label: 'Get URL', action: 'getUrl', icon: '🔗' },
                              { label: 'Get Title', action: 'getTitle', icon: '📋' },
                            ].map((item) => (
                              <Button
                                key={item.label}
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] justify-start gap-1.5"
                                onClick={() => {
                                  if (item.target === true) {
                                    // Requires selector input
                                    const sel = prompt(`Enter CSS selector for ${item.label}:`);
                                    if (sel) executeAction(item.action, sel);
                                  } else {
                                    executeAction(item.action as string, item.target as string | undefined, item.value as string | undefined, item.options);
                                  }
                                }}
                                disabled={actionLoading}
                              >
                                <span className="text-xs">{item.icon}</span> {item.label}
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Action Logs */}
                      <Card className="shrink-0">
                        <CardHeader className="pb-3 pt-3 px-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-sm">Action History</CardTitle>
                              <CardDescription className="text-[10px]">Recent actions and results</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={fetchLogs}>
                              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                          <ScrollArea className="h-64">
                            {logs.length === 0 ? (
                              <div className="text-center py-8">
                                <Clock className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/40" />
                                <p className="text-xs text-muted-foreground">No actions executed yet</p>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {logs.map((log) => {
                                  const resultData = log.result ? JSON.parse(log.result) : {};
                                  return (
                                    <div key={log.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs">
                                      <div className="mt-0.5 shrink-0">
                                        {resultData.success ? (
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        ) : (
                                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <Badge variant="secondary" className="text-[10px] px-1.5 h-4 font-mono">
                                            {log.action}
                                          </Badge>
                                          {log.target && (
                                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={log.target}>
                                              {log.target}
                                            </span>
                                          )}
                                          {log.duration && (
                                            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                                              {log.duration}ms
                                            </span>
                                          )}
                                        </div>
                                        {resultData.error && (
                                          <p className="text-[10px] text-red-500 mt-0.5 truncate">{resultData.error}</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* ─── Vision AI Tab ──────────────────────── */}
                  <TabsContent value="vision" className="flex-1 overflow-hidden m-0">
                    <div className="h-full overflow-auto p-3">
                      {!visionData ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Eye className="h-10 w-10 mx-auto mb-3 text-amber-500/40" />
                            <p className="text-sm font-medium mb-1">Vision AI</p>
                            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                              Get a complete AI-ready snapshot of the page including screenshot, DOM tree, accessibility info, and interactive elements.
                            </p>
                            <Button onClick={fetchVision} disabled={actionLoading} className="bg-amber-600 hover:bg-amber-700 text-white">
                              {actionLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Eye className="h-4 w-4 mr-1.5" />}
                              Capture Vision
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Screenshot + Metadata */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                            <Card className="lg:col-span-2">
                              <CardHeader className="pb-2 pt-3 px-3">
                                <CardTitle className="text-sm">Screenshot</CardTitle>
                              </CardHeader>
                              <CardContent className="px-3 pb-3">
                                <div className="bg-muted/30 rounded-lg overflow-hidden border">
                                  <img
                                    src={`data:image/png;base64,${visionData.screenshot}`}
                                    alt="Vision screenshot"
                                    className="w-full"
                                  />
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="pb-2 pt-3 px-3">
                                <CardTitle className="text-sm">Page Info</CardTitle>
                              </CardHeader>
                              <CardContent className="px-3 pb-3 space-y-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Title:</span>
                                  <p className="font-medium truncate">{visionData.metadata?.title || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">URL:</span>
                                  <p className="font-mono text-[10px] break-all">{visionData.metadata?.url || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Description:</span>
                                  <p className="text-[10px] line-clamp-2">{visionData.metadata?.description || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Language:</span>
                                  <p>{visionData.metadata?.language || 'N/A'}</p>
                                </div>
                                <Separator />
                                <div>
                                  <span className="text-muted-foreground">Interactive Elements:</span>
                                  <p className="font-semibold text-emerald-600">{visionData.interactiveElements?.length || 0}</p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Interactive Elements */}
                          <Card>
                            <CardHeader className="pb-2 pt-3 px-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-sm">Interactive Elements</CardTitle>
                                  <CardDescription className="text-[10px]">
                                    {visionData.interactiveElements?.length || 0} elements detected
                                  </CardDescription>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px]"
                                  onClick={() => copyToClipboard(JSON.stringify(visionData.interactiveElements, null, 2))}
                                >
                                  <Copy className="h-3 w-3 mr-1" /> Copy JSON
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                              <ScrollArea className="h-48">
                                <div className="space-y-1">
                                  {visionData.interactiveElements?.slice(0, 50).map((el: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded text-[11px] hover:bg-muted/50 group">
                                      <Badge variant="secondary" className="text-[9px] px-1 h-4 shrink-0 font-mono">
                                        {el.type}
                                      </Badge>
                                      <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]" title={el.selector}>
                                        {el.selector}
                                      </span>
                                      {el.text && (
                                        <span className="text-[10px] truncate max-w-[150px]" title={el.text}>
                                          {el.text}
                                        </span>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                                        onClick={() => copyToClipboard(el.selector)}
                                      >
                                        <Copy className="h-2.5 w-2.5" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </CardContent>
                          </Card>

                          {/* DOM */}
                          <Card>
                            <CardHeader className="pb-2 pt-3 px-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-sm">Simplified DOM</CardTitle>
                                  <CardDescription className="text-[10px]">
                                    {visionData.dom?.length || 0} characters
                                  </CardDescription>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px]"
                                  onClick={() => copyToClipboard(visionData.dom)}
                                >
                                  <Copy className="h-3 w-3 mr-1" /> Copy
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                              <pre className="text-[10px] font-mono bg-muted/50 p-2 rounded-md max-h-48 overflow-auto whitespace-pre-wrap break-all">
                                {visionData.dom?.substring(0, 3000)}{visionData.dom?.length > 3000 ? '\n... (truncated)' : ''}
                              </pre>
                            </CardContent>
                          </Card>

                          {/* Accessibility Tree */}
                          <Card>
                            <CardHeader className="pb-2 pt-3 px-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-sm">Accessibility Tree</CardTitle>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px]"
                                  onClick={() => copyToClipboard(JSON.stringify(visionData.accessibilityTree, null, 2))}
                                >
                                  <Copy className="h-3 w-3 mr-1" /> Copy JSON
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                              <pre className="text-[10px] font-mono bg-muted/50 p-2 rounded-md max-h-48 overflow-auto whitespace-pre-wrap break-all">
                                {JSON.stringify(visionData.accessibilityTree, null, 2)?.substring(0, 3000)}
                              </pre>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ─── Logs Tab ──────────────────────────── */}
                  <TabsContent value="logs" className="flex-1 overflow-hidden m-0">
                    <div className="h-full flex flex-col p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Action Logs</span>
                          <Badge variant="secondary" className="text-[10px]">{logs.length}</Badge>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={fetchLogs}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                        </Button>
                      </div>
                      <ScrollArea className="flex-1">
                        {logs.length === 0 ? (
                          <div className="text-center py-12">
                            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No action logs yet</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {logs.map((log) => {
                              const resultData = log.result ? JSON.parse(log.result) : {};
                              return (
                                <Card key={log.id} className="p-2.5">
                                  <div className="flex items-center gap-2 mb-1">
                                    {resultData.success ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                    )}
                                    <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-mono">{log.action}</Badge>
                                    {log.target && (
                                      <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]" title={log.target}>
                                        → {log.target}
                                      </span>
                                    )}
                                    {log.value && (
                                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={log.value}>
                                        &quot;{log.value.substring(0, 50)}&quot;
                                      </span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                                      {log.duration}ms
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <Clock className="h-2.5 w-2.5" />
                                    {new Date(log.createdAt).toLocaleString()}
                                    {resultData.error && (
                                      <span className="text-red-500">- {resultData.error}</span>
                                    )}
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </TabsContent>

                  {/* ─── API Reference Tab ──────────────────── */}
                  <TabsContent value="api" className="flex-1 overflow-hidden m-0">
                    <ScrollArea className="h-full p-3">
                      <div className="max-w-2xl space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold mb-1">REST API Reference</h3>
                          <p className="text-xs text-muted-foreground mb-3">
                            Use these endpoints to programmatically control browser sessions. All endpoints accept and return JSON.
                          </p>
                        </div>

                        {selectedSession && (
                          <Card className="bg-emerald-500/5 border-emerald-200">
                            <CardContent className="p-3">
                              <p className="text-[10px] text-emerald-700 font-medium mb-1">Current Session ID</p>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono bg-emerald-50 px-2 py-0.5 rounded">{selectedSession.id}</code>
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(selectedSession.id)}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {[
                          {
                            method: 'POST',
                            path: '/api/browser/sessions',
                            desc: 'Create a new browser session',
                            body: '{ "name": "My Session", "browserType": "chromium", "headless": true }',
                          },
                          {
                            method: 'GET',
                            path: '/api/browser/sessions',
                            desc: 'List all browser sessions',
                          },
                          {
                            method: 'GET',
                            path: '/api/browser/sessions/:id',
                            desc: 'Get session details',
                          },
                          {
                            method: 'DELETE',
                            path: '/api/browser/sessions/:id',
                            desc: 'Close and delete a session',
                          },
                          {
                            method: 'POST',
                            path: '/api/browser/sessions/:id/action',
                            desc: 'Execute a browser action',
                            body: '{ "action": "navigate", "target": "https://example.com" }',
                          },
                          {
                            method: 'POST',
                            path: '/api/browser/sessions/:id/vision',
                            desc: 'Get full AI vision snapshot',
                            body: '{ "fullPage": false, "element": "#main" }',
                          },
                          {
                            method: 'GET',
                            path: '/api/browser/sessions/:id/cookies',
                            desc: 'Get session cookies',
                          },
                          {
                            method: 'POST',
                            path: '/api/browser/sessions/:id/cookies',
                            desc: 'Set session cookies',
                            body: '{ "cookies": [{ "name": "key", "value": "val" }] }',
                          },
                          {
                            method: 'GET',
                            path: '/api/browser/sessions/:id/logs',
                            desc: 'Get action logs (paginated)',
                          },
                        ].map((endpoint, idx) => (
                          <Card key={idx} className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={endpoint.method === 'GET' ? 'secondary' : 'default'}
                                className={`text-[10px] px-1.5 h-4 font-mono ${
                                  endpoint.method === 'POST' ? 'bg-emerald-600 text-white' :
                                  endpoint.method === 'DELETE' ? 'bg-red-600 text-white' : ''
                                }`}
                              >
                                {endpoint.method}
                              </Badge>
                              <code className="text-xs font-mono">{endpoint.path}</code>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{endpoint.desc}</p>
                            {endpoint.body && (
                              <pre className="text-[10px] font-mono bg-muted/50 p-1.5 rounded mt-1.5 overflow-x-auto">
                                {endpoint.body}
                              </pre>
                            )}
                          </Card>
                        ))}

                        <Card className="p-3 bg-amber-500/5 border-amber-200">
                          <p className="text-xs font-medium text-amber-800 mb-1">WebSocket (Port 3005)</p>
                          <p className="text-[10px] text-amber-700">
                            Connect via Socket.IO at <code className="bg-amber-50 px-1 rounded">/?XTransformPort=3005</code> for real-time events.
                            Events: <code>subscribe</code>, <code>request_screenshot</code>, <code>execute_action</code>.
                          </p>
                        </Card>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Create Session Form ────────────────────────────────────────────

function CreateSessionForm({
  onCreate,
  loading,
}: {
  onCreate: (type: string, name?: string) => Promise<void>;
  loading: boolean;
}) {
  const [browserType, setBrowserType] = useState('chromium');
  const [name, setName] = useState('');

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <label className="text-xs font-medium">Session Name</label>
        <Input
          placeholder="My Browser Session"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium">Browser Type</label>
        <Select value={browserType} onValueChange={setBrowserType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="chromium">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" />
                <span>Chromium</span>
              </div>
            </SelectItem>
            <SelectItem value="firefox">
              <div className="flex items-center gap-2">
                <Globe2 className="h-3.5 w-3.5" />
                <span>Firefox</span>
              </div>
            </SelectItem>
            <SelectItem value="webkit">
              <div className="flex items-center gap-2">
                <Compass className="h-3.5 w-3.5" />
                <span>WebKit</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Card
          className="p-3 cursor-pointer border-2 transition-all hover:border-emerald-300 text-center"
          onClick={() => onCreate('chromium', name || undefined)}
        >
          <Globe className="h-6 w-6 mx-auto mb-1 text-blue-500" />
          <p className="text-[10px] font-medium">Chromium</p>
        </Card>
        <Card
          className="p-3 cursor-pointer border-2 transition-all hover:border-orange-300 text-center"
          onClick={() => onCreate('firefox', name || undefined)}
        >
          <Globe2 className="h-6 w-6 mx-auto mb-1 text-orange-500" />
          <p className="text-[10px] font-medium">Firefox</p>
        </Card>
        <Card
          className="p-3 cursor-pointer border-2 transition-all hover:border-sky-300 text-center"
          onClick={() => onCreate('webkit', name || undefined)}
        >
          <Compass className="h-6 w-6 mx-auto mb-1 text-sky-500" />
          <p className="text-[10px] font-medium">WebKit</p>
        </Card>
      </div>
    </div>
  );
}
