// AgentBrowser - Session Manager
// Creates, restores, and manages browser sessions with persistence

import { db } from '@/lib/db';
import browserEngine from './engine';
import type {
  BrowserSessionConfig,
  ActiveSession,
  CreateSessionRequest,
  SessionResponse,
  SessionDetailResponse,
} from './types';
import { safeJsonParse, safeJsonStringify, getSessionDataDir, normalizeCookies } from './utils';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

class SessionManager {
  // ─── Create Session ──────────────────────────────────────────────

  async createSession(request: CreateSessionRequest): Promise<ActiveSession> {
    const id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const config: BrowserSessionConfig = {
      id,
      browserType: request.browserType || 'chromium',
      name: request.name || `Browser ${id.substring(0, 12)}`,
      headless: request.headless ?? true,
      proxy: request.proxy,
      viewport: request.viewport || { width: 1280, height: 720 },
      userAgent: request.userAgent,
      locale: request.locale,
      timezone: request.timezone,
    };

    // Create the browser session via engine
    const session = await browserEngine.createSession(config);

    // Create session data directory for persistence
    const dataDir = getSessionDataDir(id);
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    // Save session to database
    await db.browserSession.create({
      data: {
        id: session.id,
        name: config.name || `Browser ${id.substring(0, 12)}`,
        browserType: config.browserType,
        status: 'active',
        cookies: '[]',
        localStorage: '{}',
        metadata: safeJsonStringify({
          headless: config.headless,
          viewport: config.viewport,
          userAgent: config.userAgent,
          locale: config.locale,
          timezone: config.timezone,
        }),
      },
    });

    // Navigate to blank page
    try {
      await session.page.goto('about:blank', { waitUntil: 'domcontentloaded' });
    } catch {
      // about:blank might not be supported in all browsers
    }

    return session;
  }

  // ─── Restore Session ─────────────────────────────────────────────

  async restoreSession(id: string): Promise<ActiveSession> {
    // Find session in database
    const dbSession = await db.browserSession.findUnique({ where: { id } });
    if (!dbSession) {
      throw new Error(`Session ${id} not found in database`);
    }

    const metadata = safeJsonParse<Record<string, unknown>>(dbSession.metadata, {});

    const config: BrowserSessionConfig = {
      id: dbSession.id,
      browserType: dbSession.browserType as BrowserSessionConfig['browserType'],
      name: dbSession.name,
      headless: (metadata.headless as boolean) ?? true,
      viewport: metadata.viewport as BrowserSessionConfig['viewport'],
      userAgent: metadata.userAgent as string,
      locale: metadata.locale as string,
      timezone: metadata.timezone as string,
    };

    // Create new browser session
    const session = await browserEngine.createSession(config);

    // Restore cookies
    const savedCookies = safeJsonParse<unknown[]>(dbSession.cookies, []);
    if (savedCookies.length > 0) {
      await session.context.addCookies(
        normalizeCookies(savedCookies) as Parameters<typeof session.context.addCookies>[0]
      );
    }

    // Restore localStorage is done per-page after navigation

    // Update database status
    await db.browserSession.update({
      where: { id },
      data: { status: 'active' },
    });

    return session;
  }

  // ─── Close Session ───────────────────────────────────────────────

  async closeSession(id: string): Promise<boolean> {
    // Save state before closing
    await this.saveSessionState(id);

    // Close in engine
    const closed = await browserEngine.closeSession(id);

    // Update database
    await db.browserSession.update({
      where: { id },
      data: { status: 'closed' },
    }).catch(() => {});

    return closed;
  }

  // ─── Save Session State ──────────────────────────────────────────

  async saveSessionState(id: string): Promise<void> {
    const session = browserEngine.getSession(id);
    if (!session) return;

    try {
      // Save cookies
      const cookies = await session.context.cookies();
      const serializedCookies = safeJsonStringify(cookies);

      // Save localStorage
      const localStorageData = await session.page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            data[key] = window.localStorage.getItem(key) || '';
          }
        }
        return data;
      }).catch(() => ({}));

      // Persist to database
      await db.browserSession.update({
        where: { id },
        data: {
          cookies: serializedCookies,
          localStorage: safeJsonStringify(localStorageData),
          updatedAt: new Date(),
        },
      });

      // Persist to disk
      const dataDir = getSessionDataDir(id);
      if (!existsSync(dataDir)) {
        await mkdir(dataDir, { recursive: true });
      }
      await writeFile(
        path.join(dataDir, 'cookies.json'),
        serializedCookies,
        'utf-8'
      ).catch(() => {});
      await writeFile(
        path.join(dataDir, 'localStorage.json'),
        safeJsonStringify(localStorageData),
        'utf-8'
      ).catch(() => {});
    } catch (err) {
      console.error(`[SessionManager] Error saving state for ${id}:`, err);
    }
  }

  // ─── List Sessions ───────────────────────────────────────────────

  async listSessions(): Promise<SessionResponse[]> {
    const sessions = await db.browserSession.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const activeSessions = browserEngine.getAllSessions();
    const activeMap = new Map(activeSessions.map((s) => [s.id, s]));

    return sessions.map((s) => {
      const active = activeMap.get(s.id);
      return {
        id: s.id,
        name: s.name,
        browserType: s.browserType,
        status: active ? active.status : s.status,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      };
    });
  }

  // ─── Get Session Detail ──────────────────────────────────────────

  async getSessionDetail(id: string): Promise<SessionDetailResponse | null> {
    const dbSession = await db.browserSession.findUnique({ where: { id } });
    if (!dbSession) return null;

    const session = browserEngine.getSession(id);
    const cookies = safeJsonParse<unknown[]>(dbSession.cookies, []);

    return {
      id: dbSession.id,
      name: dbSession.name,
      browserType: dbSession.browserType,
      status: session ? session.status : dbSession.status,
      createdAt: dbSession.createdAt.toISOString(),
      updatedAt: dbSession.updatedAt.toISOString(),
      currentUrl: session ? session.page.url() : undefined,
      currentTitle: session
        ? await session.page.title().catch(() => undefined)
        : undefined,
      cookiesCount: cookies.length,
      metadata: safeJsonParse<Record<string, unknown>>(dbSession.metadata, {}),
      localStorageData: safeJsonParse<Record<string, string>>(
        dbSession.localStorage,
        {}
      ),
    };
  }

  // ─── Delete Session ──────────────────────────────────────────────

  async deleteSession(id: string): Promise<boolean> {
    // Close if active
    await this.closeSession(id).catch(() => {});

    // Delete from database
    await db.browserSession.delete({ where: { id } }).catch(() => {});

    // Clean up disk data
    const dataDir = getSessionDataDir(id);
    if (existsSync(dataDir)) {
      await rm(dataDir, { recursive: true, force: true }).catch(() => {});
    }

    return true;
  }
}

export const sessionManager = new SessionManager();
export default sessionManager;
