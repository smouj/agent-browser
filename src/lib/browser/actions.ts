// AgentBrowser - Action Executor
// Executes browser actions with logging, timing, and error handling

import type { Page } from 'playwright';
import { db } from '@/lib/db';
import browserEngine from './engine';
import visionSystem from './vision';
import type { ActionRequest, ActionResult } from './types';
import { safeJsonStringify, normalizeCookies, measureTime } from './utils';

class ActionExecutor {
  // ─── Execute Action ──────────────────────────────────────────────

  async execute(sessionId: string, request: ActionRequest): Promise<ActionResult> {
    const session = browserEngine.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        action: request.action,
        target: request.target,
        value: request.value,
        error: `Session ${sessionId} not found or not active`,
        duration: 0,
      };
    }

    const { result, duration } = await measureTime(async () => {
      try {
        return await this.executeAction(session.page, request);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(message);
      }
    });

    const actionResult: ActionResult = {
      success: result.success,
      action: request.action,
      target: request.target,
      value: request.value,
      data: result.data,
      error: result.error,
      duration,
    };

    // Log the action to database
    try {
      await db.actionLog.create({
        data: {
          sessionId,
          action: request.action,
          target: request.target || null,
          value: request.value || null,
          result: safeJsonStringify({
            success: actionResult.success,
            error: actionResult.error,
            dataPreview: actionResult.data
              ? safeJsonStringify(actionResult.data).substring(0, 500)
              : undefined,
          }),
          duration,
          metadata: safeJsonStringify(request.options || {}),
        },
      });
    } catch (logErr) {
      console.error('[Actions] Failed to log action:', logErr);
    }

    // Emit event
    browserEngine.emit('action:executed', { sessionId, action: actionResult });

    return actionResult;
  }

  // ─── Action Dispatch ─────────────────────────────────────────────

  private async executeAction(
    page: Page,
    request: ActionRequest
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const { action, target, value, options } = request;

    switch (action) {
      // ── Navigation ──────────────────────────────────────
      case 'navigate':
        return this.navigate(page, target!, options);

      case 'goBack':
        return this.goBack(page);

      case 'goForward':
        return this.goForward(page);

      case 'reload':
        return this.reload(page, options);

      // ── Mouse Actions ───────────────────────────────────
      case 'click':
        return this.click(page, target!, options);

      case 'dblclick':
        return this.dblclick(page, target!, options);

      case 'hover':
        return this.hover(page, target!);

      case 'rightClick':
        return this.rightClick(page, target!, options);

      // ── Keyboard Actions ────────────────────────────────
      case 'type':
        return this.typeText(page, target!, value!, options);

      case 'press':
        return this.pressKey(page, value!);

      case 'select':
        return this.selectOption(page, target!, value!);

      // ── Scrolling ───────────────────────────────────────
      case 'scroll':
        return this.scroll(page, value, target, options);

      // ── Waiting ─────────────────────────────────────────
      case 'wait':
        return this.wait(value ? parseInt(value) : 1000);

      case 'waitForSelector':
        return this.waitForSelector(page, target!, options);

      case 'waitForNavigation':
        return this.waitForNavigation(page, options);

      // ── Screenshots ─────────────────────────────────────
      case 'screenshot':
        return this.screenshot(page, options);

      // ── JavaScript ──────────────────────────────────────
      case 'evaluate':
        return this.evaluate(page, value!);

      // ── Cookies ─────────────────────────────────────────
      case 'getCookies':
        return this.getCookies(page);

      case 'setCookies':
        return this.setCookies(page, value);

      case 'clearCookies':
        return this.clearCookies(page);

      // ── Storage ─────────────────────────────────────────
      case 'getLocalStorage':
        return this.getLocalStorage(page);

      case 'setLocalStorage':
        return this.setLocalStorage(page, value!);

      case 'clearLocalStorage':
        return this.clearLocalStorage(page);

      // ── Information ─────────────────────────────────────
      case 'getUrl':
        return this.getUrl(page);

      case 'getTitle':
        return this.getTitle(page);

      case 'getContent':
        return this.getContent(page);

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  }

  // ─── Navigation Actions ──────────────────────────────────────────

  private async navigate(
    page: Page,
    url: string,
    options?: Record<string, unknown>
  ) {
    if (!url) return { success: false, error: 'URL is required for navigate' };

    const waitUntil = (options?.waitUntil as 'load' | 'domcontentloaded' | 'networkidle') || 'domcontentloaded';
    const timeout = (options?.timeout as number) || 60000;

    await page.goto(url, { waitUntil, timeout });

    return {
      success: true,
      data: {
        url: page.url(),
        title: await page.title().catch(() => ''),
      },
    };
  }

  private async goBack(page: Page) {
    const response = await page.goBack({ waitUntil: 'domcontentloaded' });
    return {
      success: true,
      data: { url: page.url(), navigated: !!response },
    };
  }

  private async goForward(page: Page) {
    const response = await page.goForward({ waitUntil: 'domcontentloaded' });
    return {
      success: true,
      data: { url: page.url(), navigated: !!response },
    };
  }

  private async reload(page: Page, options?: Record<string, unknown>) {
    await page.reload({
      waitUntil: (options?.waitUntil as 'load' | 'domcontentloaded' | 'networkidle') || 'domcontentloaded',
    });
    return {
      success: true,
      data: { url: page.url(), title: await page.title().catch(() => '') },
    };
  }

  // ─── Mouse Actions ───────────────────────────────────────────────

  private async click(page: Page, selector: string, options?: Record<string, unknown>) {
    const element = await page.waitForSelector(selector, { timeout: 10000 });
    if (!element) return { success: false, error: `Element not found: ${selector}` };

    await element.click({
      button: (options?.button as 'left' | 'right' | 'middle') || 'left',
      clickCount: (options?.clickCount as number) || 1,
      delay: (options?.delay as number) || 0,
    });

    return { success: true, data: { clicked: selector } };
  }

  private async dblclick(page: Page, selector: string, options?: Record<string, unknown>) {
    const element = await page.waitForSelector(selector, { timeout: 10000 });
    if (!element) return { success: false, error: `Element not found: ${selector}` };

    await element.dblclick({ delay: (options?.delay as number) || 0 });
    return { success: true, data: { doubleClicked: selector } };
  }

  private async hover(page: Page, selector: string) {
    const element = await page.waitForSelector(selector, { timeout: 10000 });
    if (!element) return { success: false, error: `Element not found: ${selector}` };

    await element.hover();
    return { success: true, data: { hovered: selector } };
  }

  private async rightClick(page: Page, selector: string, options?: Record<string, unknown>) {
    const element = await page.waitForSelector(selector, { timeout: 10000 });
    if (!element) return { success: false, error: `Element not found: ${selector}` };

    await element.click({ button: 'right', delay: (options?.delay as number) || 0 });
    return { success: true, data: { rightClicked: selector } };
  }

  // ─── Keyboard Actions ────────────────────────────────────────────

  private async typeText(
    page: Page,
    selector: string,
    text: string,
    options?: Record<string, unknown>
  ) {
    const element = await page.waitForSelector(selector, { timeout: 10000 });
    if (!element) return { success: false, error: `Element not found: ${selector}` };

    const clearFirst = options?.clear !== false;
    if (clearFirst) {
      await element.click();
      await element.fill('');
    }

    if (options?.pressEnter) {
      await element.type(text, { delay: (options?.delay as number) || 0 });
      await page.keyboard.press('Enter');
    } else {
      await element.type(text, { delay: (options?.delay as number) || 0 });
    }

    return { success: true, data: { typed: selector, textLength: text.length } };
  }

  private async pressKey(page: Page, key: string) {
    if (!key) return { success: false, error: 'Key is required for press' };

    await page.keyboard.press(key);
    return { success: true, data: { pressed: key } };
  }

  private async selectOption(page: Page, selector: string, value: string) {
    const element = await page.waitForSelector(selector, { timeout: 10000 });
    if (!element) return { success: false, error: `Element not found: ${selector}` };

    await element.selectOption(value);
    return { success: true, data: { selected: selector, value } };
  }

  // ─── Scrolling ───────────────────────────────────────────────────

  private async scroll(
    page: Page,
    value?: string,
    direction?: string,
    options?: Record<string, unknown>
  ) {
    const scrollAmount = value ? parseInt(value) : 500;
    const scrollDirection = direction || 'down';
    const selector = options?.element as string | undefined;

    if (selector) {
      const element = await page.$(selector);
      if (element) {
        await element.evaluate(
          (el, { scrollDirection, scrollAmount }) => {
            if (scrollDirection === 'down') el.scrollTop += scrollAmount;
            else if (scrollDirection === 'up') el.scrollTop -= scrollAmount;
            else if (scrollDirection === 'left') el.scrollLeft -= scrollAmount;
            else if (scrollDirection === 'right') el.scrollLeft += scrollAmount;
          },
          { scrollDirection, scrollAmount }
        );
      }
    } else {
      await page.evaluate(
        ({ scrollDirection, scrollAmount }) => {
          if (scrollDirection === 'down')
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          else if (scrollDirection === 'up')
            window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
          else if (scrollDirection === 'left')
            window.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
          else if (scrollDirection === 'right')
            window.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        },
        { scrollDirection, scrollAmount }
      );
    }

    return {
      success: true,
      data: { direction: scrollDirection, amount: scrollAmount },
    };
  }

  // ─── Waiting ─────────────────────────────────────────────────────

  private async wait(ms?: number) {
    const duration = ms || 1000;
    await new Promise((resolve) => setTimeout(resolve, duration));
    return { success: true, data: { waited: duration } };
  }

  private async waitForSelector(
    page: Page,
    selector: string,
    options?: Record<string, unknown>
  ) {
    const state = (options?.state as 'visible' | 'hidden' | 'attached' | 'detached') || 'visible';
    const timeout = (options?.timeout as number) || 30000;

    await page.waitForSelector(selector, { state, timeout });
    return { success: true, data: { found: selector, state } };
  }

  private async waitForNavigation(page: Page, options?: Record<string, unknown>) {
    const waitUntil = (options?.waitUntil as 'load' | 'domcontentloaded' | 'networkidle') || 'domcontentloaded';
    const timeout = (options?.timeout as number) || 30000;

    await page.waitForNavigation({ waitUntil, timeout });
    return {
      success: true,
      data: { url: page.url() },
    };
  }

  // ─── Screenshots ─────────────────────────────────────────────────

  private async screenshot(page: Page, options?: Record<string, unknown>) {
    const fullPage = options?.fullPage as boolean;
    const element = options?.element as string | undefined;
    const quality = options?.quality as number | undefined;
    const type = (options?.type as 'png' | 'jpeg') || 'png';

    const base64 = await visionSystem.takeScreenshot(page, {
      fullPage,
      element,
      quality,
      type,
    });

    return {
      success: true,
      data: {
        screenshot: base64,
        type,
        fullPage: fullPage || false,
        element: element || null,
      },
    };
  }

  // ─── JavaScript ──────────────────────────────────────────────────

  private async evaluate(page: Page, expression: string) {
    if (!expression) return { success: false, error: 'Expression is required for evaluate' };

    const result = await page.evaluate((expr: string) => {
      return eval(expr);
    }, expression);

    return {
      success: true,
      data: { result },
    };
  }

  // ─── Cookies ─────────────────────────────────────────────────────

  private async getCookies(page: Page) {
    const context = page.context();
    const cookies = await context.cookies();
    return {
      success: true,
      data: { cookies: normalizeCookies(cookies) },
    };
  }

  private async setCookies(page: Page, value?: string) {
    if (!value) return { success: false, error: 'Cookies JSON is required' };

    try {
      const cookies = JSON.parse(value) as unknown[];
      const normalized = normalizeCookies(cookies);
      await page.context().addCookies(normalized as any);
      return { success: true, data: { cookiesSet: normalized.length } };
    } catch (err) {
      return { success: false, error: `Invalid cookies JSON: ${err}` };
    }
  }

  private async clearCookies(page: Page) {
    await page.context().clearCookies();
    return { success: true, data: { cleared: true } };
  }

  // ─── Storage ─────────────────────────────────────────────────────

  private async getLocalStorage(page: Page) {
    const data = await page.evaluate(() => {
      const result: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          result[key] = window.localStorage.getItem(key) || '';
        }
      }
      return result;
    });
    return { success: true, data };
  }

  private async setLocalStorage(page: Page, value: string) {
    try {
      const data = JSON.parse(value) as Record<string, string>;
      await page.evaluate((items: Record<string, string>) => {
        for (const [key, val] of Object.entries(items)) {
          window.localStorage.setItem(key, val);
        }
      }, data);
      return { success: true, data: { itemsSet: Object.keys(data).length } };
    } catch (err) {
      return { success: false, error: `Invalid localStorage JSON: ${err}` };
    }
  }

  private async clearLocalStorage(page: Page) {
    await page.evaluate(() => window.localStorage.clear());
    return { success: true, data: { cleared: true } };
  }

  // ─── Information ─────────────────────────────────────────────────

  private async getUrl(page: Page) {
    return { success: true, data: { url: page.url() } };
  }

  private async getTitle(page: Page) {
    const title = await page.title();
    return { success: true, data: { title } };
  }

  private async getContent(page: Page) {
    const content = await page.content();
    return {
      success: true,
      data: {
        content: content.substring(0, 100000),
        length: content.length,
      },
    };
  }
}

export const actionExecutor = new ActionExecutor();
export default actionExecutor;
