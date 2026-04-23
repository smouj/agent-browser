// AgentBrowser - Vision System
// Provides screenshot capture, DOM extraction, accessibility tree, and interactive element detection

import type { Page } from 'playwright';
import type { VisionResult, InteractiveElement, PageMetadata, ScreenshotOptions } from './types';
import { generateSelector, classifyElementType, truncateText } from './utils';

class VisionSystem {
  // ─── Full Vision Snapshot ────────────────────────────────────────

  async captureVision(page: Page, options?: ScreenshotOptions): Promise<VisionResult> {
    const [screenshot, dom, accessibilityTree, interactiveElements, metadata] =
      await Promise.all([
        this.takeScreenshot(page, options),
        this.extractDOM(page),
        this.getAccessibilityTree(page),
        this.detectInteractiveElements(page),
        this.getPageMetadata(page),
      ]);

    return {
      screenshot,
      dom,
      accessibilityTree,
      interactiveElements,
      metadata,
    };
  }

  // ─── Screenshot Capture ──────────────────────────────────────────

  async takeScreenshot(page: Page, options?: ScreenshotOptions): Promise<string> {
    try {
      const screenshotOptions: Parameters<typeof page.screenshot>[0] = {
        type: options?.type || 'png',
        quality: options?.quality,
      };

      if (options?.element) {
        const element = await page.$(options.element);
        if (element) {
          const buf = await element.screenshot(screenshotOptions);
          return buf.toString('base64');
        }
      }

      if (options?.fullPage) {
        screenshotOptions.fullPage = true;
      } else {
        const vp = await page.viewportSize();
        screenshotOptions.clip = {
          x: 0,
          y: 0,
          width: vp?.width || 1280,
          height: vp?.height || 720,
        };
      }

      const buffer = await page.screenshot(screenshotOptions);
      return buffer.toString('base64');
    } catch (err) {
      console.error('[Vision] Screenshot error:', err);
      return '';
    }
  }

  // ─── DOM Extraction ──────────────────────────────────────────────

  async extractDOM(page: Page): Promise<string> {
    try {
      return await page.evaluate(() => {
        // Remove unwanted elements
        const removeSelectors = [
          'script',
          'style',
          'noscript',
          'svg',
          'path',
          'link[rel="stylesheet"]',
          'meta',
          '[hidden]',
          '[aria-hidden="true"]',
          '.sr-only',
          '[style*="display: none"]',
          '[style*="display:none"]',
          '[style*="visibility: hidden"]',
          '[style*="visibility:hidden"]',
        ];

        removeSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((el) => el.remove());
        });

        // Simplify the DOM tree
        const simplifyNode = (node: Node, depth: number = 0): string => {
          if (depth > 15) return ''; // Limit depth
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            return text ? text + ' ' : '';
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return '';

          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();

          // Skip non-visible elements
          const style = window.getComputedStyle(el);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0'
          ) {
            return '';
          }

          // Skip certain tags
          if (['svg', 'path', 'canvas'].includes(tag)) return '';

          let result = '';

          // Add self-closing or short tags
          if (['br', 'hr', 'img'].includes(tag)) {
            result += `<${tag}`;
            if (tag === 'img' && el.getAttribute('alt')) {
              result += ` alt="${el.getAttribute('alt')}"`;
            }
            if (tag === 'img' && el.getAttribute('src')) {
              result += ` src="${el.getAttribute('src')?.substring(0, 100)}"`;
            }
            result += '>';
            return result;
          }

          // Process children
          let children = '';
          for (const child of Array.from(node.childNodes)) {
            children += simplifyNode(child, depth + 1);
          }
          children = children.trim();

          if (!children && !['div', 'span', 'section', 'article'].includes(tag)) {
            return '';
          }

          // Build simplified tag
          result += `<${tag}`;
          if (el.id) result += ` id="${el.id}"`;
          if (el.className && typeof el.className === 'string') {
            const classes = el.className.trim().split(/\s+/).slice(0, 3).join(' ');
            if (classes) result += ` class="${classes}"`;
          }
          const href = el.getAttribute('href');
          if (href && tag === 'a') result += ` href="${href.substring(0, 200)}"`;
          const type = el.getAttribute('type');
          if (type) result += ` type="${type}"`;
          const name = el.getAttribute('name');
          if (name) result += ` name="${name}"`;
          const placeholder = el.getAttribute('placeholder');
          if (placeholder) result += ` placeholder="${placeholder}"`;
          const role = el.getAttribute('role');
          if (role) result += ` role="${role}"`;
          const ariaLabel = el.getAttribute('aria-label');
          if (ariaLabel) result += ` aria-label="${ariaLabel}"`;
          const value = el.getAttribute('value');
          if (value) result += ` value="${value?.substring(0, 100)}"`;
          const src = el.getAttribute('src');
          if (src && tag === 'img') result += ` src="${src.substring(0, 100)}"`;

          if (children) {
            result += `>${children}</${tag}>`;
          } else {
            result += '>';
          }

          return result;
        };

        return simplifyNode(document.body, 0)
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 50000); // Limit output size
      });
    } catch (err) {
      console.error('[Vision] DOM extraction error:', err);
      return '';
    }
  }

  // ─── Accessibility Tree ──────────────────────────────────────────

  async getAccessibilityTree(page: Page): Promise<object> {
    try {
      // @ts-expect-error - Playwright accessibility API
      const snapshot = await page.accessibility.snapshot();
      return snapshot as object;
    } catch (err) {
      console.error('[Vision] Accessibility tree error:', err);
      return { error: 'Failed to capture accessibility tree' };
    }
  }

  // ─── Interactive Elements Detection ───────────────────────────────

  async detectInteractiveElements(page: Page): Promise<InteractiveElement[]> {
    try {
      const elements = await page.evaluate(() => {
        const interactiveSelectors = [
          'a[href]',
          'button',
          'input:not([type="hidden"])',
          'select',
          'textarea',
          '[role="button"]',
          '[role="link"]',
          '[role="tab"]',
          '[role="checkbox"]',
          '[role="switch"]',
          '[role="combobox"]',
          '[role="listbox"]',
          '[role="textbox"]',
          '[role="menuitem"]',
          '[role="option"]',
          '[onclick]',
          '[onmousedown]',
          '[onmouseup]',
          '[contenteditable="true"]',
          'summary',
          'details > summary',
          '[tabindex]:not([tabindex="-1"])',
        ];

        const allElements = document.querySelectorAll(interactiveSelectors.join(', '));
        const results: Array<{
          tag: string;
          text: string;
          type: string;
          rect: { x: number; y: number; width: number; height: number };
          attributes: Record<string, string>;
          visible: boolean;
        }> = [];

        const seen = new Set<string>();

        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;

          // Check visibility
          const style = window.getComputedStyle(htmlEl);
          const rect = htmlEl.getBoundingClientRect();
          const isVisible =
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            parseFloat(style.opacity) > 0 &&
            rect.width > 0 &&
            rect.height > 0;

          // Create unique key to avoid duplicates
          const key = `${el.tagName}:${el.id || ''}:${el.className?.toString().substring(0, 50) || ''}:${el.textContent?.substring(0, 30) || ''}`;
          if (seen.has(key)) return;
          seen.add(key);

          // Extract attributes
          const attrs: Record<string, string> = {};
          const importantAttrs = [
            'id', 'class', 'name', 'type', 'value', 'placeholder',
            'href', 'role', 'aria-label', 'aria-describedby',
            'title', 'data-testid', 'for', 'disabled', 'checked',
            'readonly', 'required', 'autocomplete', 'src', 'alt',
          ];
          importantAttrs.forEach((attr) => {
            const val = el.getAttribute(attr);
            if (val !== null && val !== '') {
              attrs[attr] = val;
            }
          });

          const text = (el.textContent || '').trim().substring(0, 200);

          results.push({
            tag: el.tagName.toLowerCase(),
            text,
            type: '', // will be classified on the server side
            rect: {
              x: Math.round(rect.x + window.scrollX),
              y: Math.round(rect.y + window.scrollY),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
            attributes: attrs,
            visible: isVisible,
          });
        });

        // Sort by position (top to bottom, left to right)
        results.sort((a, b) => {
          const yDiff = a.rect.y - b.rect.y;
          if (Math.abs(yDiff) > 5) return yDiff;
          return a.rect.x - b.rect.x;
        });

        return results.slice(0, 200); // Limit to 200 elements
      });

      // Post-process: generate selectors and classify types
      return elements
        .filter((el) => el.visible)
        .map((el, index) => {
          const selector = generateSelector(el.tag, el.attributes);
          return {
            selector: selector || `${el.tag}:nth-of-type(${index + 1})`,
            tag: el.tag,
            text: truncateText(el.text),
            type: classifyElementType(el.tag, el.attributes),
            rect: el.rect,
            attributes: el.attributes,
          };
        });
    } catch (err) {
      console.error('[Vision] Interactive elements detection error:', err);
      return [];
    }
  }

  // ─── Page Metadata ───────────────────────────────────────────────

  async getPageMetadata(page: Page): Promise<PageMetadata> {
    try {
      const metadata = await page.evaluate(() => {
        const getMeta = (name: string): string => {
          const el =
            document.querySelector(`meta[property="${name}"]`) ||
            document.querySelector(`meta[name="${name}"]`);
          return el?.getAttribute('content') || '';
        };

        const getFavicon = (): string => {
          const icon =
            document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
            document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]') ||
            document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
          return icon?.href || '/favicon.ico';
        };

        return {
          title: document.title || '',
          url: window.location.href || '',
          description: getMeta('description'),
          ogTitle: getMeta('og:title'),
          ogDescription: getMeta('og:description'),
          ogImage: getMeta('og:image'),
          favicon: getFavicon(),
          language: document.documentElement.lang || navigator.language || '',
        };
      });

      return metadata;
    } catch (err) {
      console.error('[Vision] Page metadata error:', err);
      return {
        title: '',
        url: '',
        description: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        favicon: '',
        language: '',
      };
    }
  }
}

export const visionSystem = new VisionSystem();
export default visionSystem;
