// AgentBrowser - Core Browser Engine Singleton
// Manages Playwright browser instances with event emitter pattern

import { chromium, firefox, webkit } from 'playwright';
import type { Browser, BrowserContext, BrowserType as PWBrowserType } from 'playwright';
import type { BrowserType, BrowserSessionConfig, ActiveSession, SessionStatus } from './types';

// ─── Simple EventEmitter ───────────────────────────────────────────
type EventCallback = (...args: unknown[]) => void;

class SimpleEventEmitter {
  private listeners = new Map<string, Set<EventCallback>>();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(...args);
      } catch (err) {
        console.error(`[Engine] Event handler error for "${event}":`, err);
      }
    });
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

// ─── Engine Class ──────────────────────────────────────────────────

class BrowserEngine {
  private static instance: BrowserEngine | null = null;
  private browsers = new Map<string, Browser>();
  private sessions = new Map<string, ActiveSession>();
  private emitter: SimpleEventEmitter;
  private isShuttingDown = false;

  private constructor() {
    this.emitter = new SimpleEventEmitter();
    this.setupGracefulShutdown();
  }

  static getInstance(): BrowserEngine {
    if (!BrowserEngine.instance) {
      BrowserEngine.instance = new BrowserEngine();
    }
    return BrowserEngine.instance;
  }

  // ─── Event Emitter API ───────────────────────────────────────────

  on(event: string, callback: EventCallback): void {
    this.emitter.on(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.emitter.off(event, callback);
  }

  emit(event: string, ...args: unknown[]): void {
    this.emitter.emit(event, ...args);
  }

  // ─── Browser Lifecycle ───────────────────────────────────────────

  /**
   * Get or create a browser instance for the given browser type
   */
  async getBrowser(type: BrowserType, headless: boolean = true): Promise<Browser> {
    const key = `${type}:${headless}`;

    if (this.browsers.has(key)) {
      const existing = this.browsers.get(key)!;
      if (existing.isConnected()) {
        return existing;
      }
      // Browser disconnected, clean up
      this.browsers.delete(key);
    }

    const browserType = this.getBrowserType(type);
    const args: string[] = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ];

    const browser = await browserType.launch({
      headless,
      args,
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '/home/z/.cache/ms-playwright',
      },
    });

    this.browsers.set(key, browser);
    console.log(`[Engine] Launched ${type} browser (headless=${headless})`);

    browser.on('disconnected', () => {
      console.log(`[Engine] ${type} browser disconnected`);
      this.browsers.delete(key);
    });

    return browser;
  }

  /**
   * Create a new browser context and page for a session
   */
  async createSession(config: BrowserSessionConfig): Promise<ActiveSession> {
    if (this.sessions.has(config.id)) {
      throw new Error(`Session ${config.id} already exists`);
    }

    const browser = await this.getBrowser(
      config.browserType,
      config.headless ?? true
    );

    const contextOptions: Parameters<typeof browser.newContext>[0] = {
      viewport: config.viewport || { width: 1280, height: 720 },
      userAgent: config.userAgent,
      locale: config.locale || 'en-US',
      timezoneId: config.timezone || 'UTC',
    };

    if (config.proxy) {
      contextOptions.proxy = {
        server: config.proxy.server,
        username: config.proxy.username,
        password: config.proxy.password,
      };
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    // Set default timeout
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(60000);

    const session: ActiveSession = {
      id: config.id,
      config,
      context,
      page,
      createdAt: new Date(),
      status: 'active',
    };

    this.sessions.set(config.id, session);

    console.log(`[Engine] Session created: ${config.id} (${config.browserType})`);
    this.emit('session:created', session);

    return session;
  }

  /**
   * Get an active session by ID
   */
  getSession(id: string): ActiveSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Update session status
   */
  updateSessionStatus(id: string, status: SessionStatus): void {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      this.emit('session:updated', session);
    }
  }

  /**
   * Close and remove a session
   */
  async closeSession(id: string): Promise<boolean> {
    const session = this.sessions.get(id);
    if (!session) return false;

    try {
      session.status = 'closed';
      await session.page.close().catch(() => {});
      await session.context.close().catch(() => {});
    } catch (err) {
      console.error(`[Engine] Error closing session ${id}:`, err);
    }

    this.sessions.delete(id);
    console.log(`[Engine] Session closed: ${id}`);
    this.emit('session:closed', { id });

    return true;
  }

  /**
   * Get session count by browser type
   */
  getSessionCount(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const session of this.sessions.values()) {
      byType[session.config.browserType] = (byType[session.config.browserType] || 0) + 1;
    }
    return { total: this.sessions.size, byType };
  }

  /**
   * Close all sessions and browsers
   */
  async closeAll(): Promise<void> {
    this.isShuttingDown = true;

    // Close all sessions
    const closePromises = Array.from(this.sessions.keys()).map((id) =>
      this.closeSession(id).catch(() => {})
    );
    await Promise.all(closePromises);

    // Close all browsers
    const browserPromises = Array.from(this.browsers.values()).map((browser) =>
      browser.close().catch(() => {})
    );
    await Promise.all(browserPromises);
    this.browsers.clear();

    this.emitter.removeAllListeners();
    console.log('[Engine] All browsers and sessions closed');
  }

  // ─── Private Helpers ─────────────────────────────────────────────

  private getBrowserType(type: BrowserType): PWBrowserType {
    switch (type) {
      case 'firefox':
        return firefox;
      case 'webkit':
        return webkit;
      case 'chromium':
      default:
        return chromium;
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      console.log('[Engine] Graceful shutdown initiated...');
      await this.closeAll();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

// Export singleton
export const browserEngine = BrowserEngine.getInstance();
export { BrowserEngine };
export default browserEngine;
