// AgentBrowser - TypeScript Types & Interfaces

export type BrowserType = 'chromium' | 'firefox' | 'webkit';
export type SessionStatus = 'active' | 'closed' | 'error';

export interface BrowserSessionConfig {
  id: string;
  browserType: BrowserType;
  name?: string;
  headless?: boolean;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  locale?: string;
  timezone?: string;
}

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export interface ViewportConfig {
  width: number;
  height: number;
}

export interface ActiveSession {
  id: string;
  config: BrowserSessionConfig;
  context: import('playwright').BrowserContext;
  page: import('playwright').Page;
  createdAt: Date;
  status: SessionStatus;
}

// Vision types
export interface VisionResult {
  screenshot: string; // base64 PNG
  dom: string; // simplified HTML
  accessibilityTree: object;
  interactiveElements: InteractiveElement[];
  metadata: PageMetadata;
}

export interface InteractiveElement {
  selector: string;
  tag: string;
  text: string;
  type: string; // button, link, input, select, etc.
  rect: { x: number; y: number; width: number; height: number };
  attributes: Record<string, string>;
}

export interface PageMetadata {
  title: string;
  url: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  favicon: string;
  language: string;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  element?: string;
  quality?: number;
  type?: 'png' | 'jpeg';
}

// Action types
export interface ActionRequest {
  action: string;
  target?: string;
  value?: string;
  options?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  action: string;
  target?: string;
  value?: string;
  data?: unknown;
  error?: string;
  duration: number;
}

// Cookie types
export interface BrowserCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

// WebSocket event types
export interface WSActionEvent {
  type: 'action';
  sessionId: string;
  action: string;
  target?: string;
  result: ActionResult;
  timestamp: string;
}

export interface WSSessionEvent {
  type: 'session_update' | 'session_created' | 'session_closed';
  sessionId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface WSScreenshotEvent {
  type: 'screenshot';
  sessionId: string;
  screenshot: string; // base64
  timestamp: string;
}

// API response types
export interface SessionResponse {
  id: string;
  name: string;
  browserType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  currentUrl?: string;
  currentTitle?: string;
  cookiesCount?: number;
}

export interface SessionDetailResponse extends SessionResponse {
  metadata: Record<string, unknown>;
  localStorageData?: Record<string, string>;
}

export interface CreateSessionRequest {
  name?: string;
  browserType?: BrowserType;
  headless?: boolean;
  proxy?: ProxyConfig;
  viewport?: ViewportConfig;
  userAgent?: string;
  locale?: string;
  timezone?: string;
}

export interface VisionRequest {
  fullPage?: boolean;
  element?: string;
}

export interface ActionLogResponse {
  id: string;
  sessionId: string;
  action: string;
  target?: string;
  value?: string;
  result?: string;
  duration?: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}
