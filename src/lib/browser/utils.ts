// AgentBrowser - Utility Helpers

import type { BrowserCookie } from './types';

/**
 * Generate a clean CSS selector for an element
 */
export function generateSelector(
  tag: string,
  attributes: Record<string, string>
): string {
  const id = attributes.id ? `#${attributes.id}` : '';
  if (id) return `${tag}${id}`;

  const classes = attributes.class
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((c) => `.${c}`)
    .join('');
  if (classes) return `${tag}${classes}`;

  const name = attributes.name ? `[name="${attributes.name}"]` : '';
  if (name) return `${tag}${name}`;

  const type = attributes.type ? `[type="${attributes.type}"]` : '';
  if (type) return `${tag}${type}`;

  const href = attributes.href ? `[href="${attributes.href}"]` : '';
  if (href) return `${tag}${href}`;

  return tag;
}

/**
 * Classify an element's interactive type
 */
export function classifyElementType(
  tag: string,
  attributes: Record<string, string>
): string {
  const role = attributes.role?.toLowerCase();
  const type = attributes.type?.toLowerCase();

  if (role === 'button' || tag === 'button') return 'button';
  if (role === 'link' || tag === 'a') return 'link';
  if (tag === 'input') {
    if (type === 'checkbox' || type === 'radio') return type;
    if (type === 'submit' || type === 'reset') return 'button';
    if (type === 'file') return 'file';
    if (type === 'password') return 'password';
    return 'input';
  }
  if (tag === 'textarea') return 'textarea';
  if (tag === 'select') return 'select';
  if (tag === 'option') return 'option';
  if (role === 'textbox') return 'textarea';
  if (role === 'checkbox' || role === 'switch') return 'button';
  if (role === 'combobox' || role === 'listbox') return 'select';
  if (role === 'tab') return 'button';
  if (
    attributes.onclick ||
    attributes.onmousedown ||
    attributes.onmouseup ||
    attributes.onchange
  )
    return 'button';
  if (tag === 'img' && attributes.onclick) return 'button';
  if (
    attributes.tabindex !== undefined &&
    attributes.tabindex !== '-1'
  )
    return 'focusable';

  return 'other';
}

/**
 * Truncate text to max length
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > maxLength
    ? cleaned.substring(0, maxLength) + '...'
    : cleaned;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safe JSON stringify
 */
export function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '{}';
  }
}

/**
 * Filter cookies to serializable format
 */
export function normalizeCookies(cookies: unknown[]): BrowserCookie[] {
  return cookies
    .map((c) => {
      const cookie = c as Record<string, unknown>;
      return {
        name: String(cookie.name || ''),
        value: String(cookie.value || ''),
        domain: cookie.domain ? String(cookie.domain) : undefined,
        path: cookie.path ? String(cookie.path) : undefined,
        expires: cookie.expires ? Number(cookie.expires) : undefined,
        httpOnly: Boolean(cookie.httpOnly),
        secure: Boolean(cookie.secure),
        sameSite: cookie.sameSite as BrowserCookie['sameSite'],
      };
    })
    .filter((c) => c.name);
}

/**
 * Measure async execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = Math.round(performance.now() - start);
  return { result, duration };
}

/**
 * Ensure the browser-data directory exists for a session
 */
export function getSessionDataDir(sessionId: string): string {
  return `/home/z/my-project/browser-data/${sessionId}`;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
