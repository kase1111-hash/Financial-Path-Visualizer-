/**
 * Accessibility Utilities
 *
 * ARIA, keyboard navigation, focus management, and screen reader support.
 */

/**
 * Focus trap for modal dialogs.
 */
export function createFocusTrap(
  container: HTMLElement
): { activate: () => void; deactivate: () => void } {
  let previousActiveElement: Element | null = null;

  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  function getFocusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return {
    activate() {
      previousActiveElement = document.activeElement;
      container.addEventListener('keydown', handleKeyDown);

      // Focus first focusable element
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0]!.focus();
      }
    },

    deactivate() {
      container.removeEventListener('keydown', handleKeyDown);

      // Restore focus
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    },
  };
}

/**
 * Keyboard navigation handler for lists.
 */
export function createListNavigation(
  container: HTMLElement,
  options: {
    itemSelector: string;
    onSelect?: (item: HTMLElement, index: number) => void;
    orientation?: 'vertical' | 'horizontal';
    wrap?: boolean;
  }
): { destroy: () => void } {
  const { itemSelector, onSelect, orientation = 'vertical', wrap = true } = options;

  function getItems(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
  }

  function handleKeyDown(e: KeyboardEvent): void {
    const items = getItems();
    if (items.length === 0) return;

    const currentIndex = items.findIndex((item) => item === document.activeElement);
    let nextIndex = currentIndex;

    const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

    switch (e.key) {
      case prevKey:
        e.preventDefault();
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = wrap ? items.length - 1 : 0;
        }
        break;

      case nextKey:
        e.preventDefault();
        nextIndex = currentIndex + 1;
        if (nextIndex >= items.length) {
          nextIndex = wrap ? 0 : items.length - 1;
        }
        break;

      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;

      case 'End':
        e.preventDefault();
        nextIndex = items.length - 1;
        break;

      case 'Enter':
      case ' ':
        if (currentIndex >= 0 && onSelect) {
          e.preventDefault();
          onSelect(items[currentIndex]!, currentIndex);
        }
        return;

      default:
        return;
    }

    if (nextIndex !== currentIndex && items[nextIndex]) {
      items[nextIndex]!.focus();
    }
  }

  container.addEventListener('keydown', handleKeyDown);

  return {
    destroy() {
      container.removeEventListener('keydown', handleKeyDown);
    },
  };
}

/**
 * Announce text to screen readers.
 */
let announcer: HTMLElement | null = null;

export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
  }

  // Clear and re-set to trigger announcement
  announcer.textContent = '';
  announcer.setAttribute('aria-live', priority);

  // Use setTimeout to ensure the DOM change is detected
  setTimeout(() => {
    if (announcer) {
      announcer.textContent = message;
    }
  }, 100);
}

/**
 * Set ARIA attributes on an element.
 */
export function setAriaAttributes(
  element: HTMLElement,
  attributes: Record<string, string | boolean | number>
): void {
  for (const [key, value] of Object.entries(attributes)) {
    const attrName = key.startsWith('aria-') ? key : `aria-${key}`;

    if (typeof value === 'boolean') {
      element.setAttribute(attrName, String(value));
    } else {
      element.setAttribute(attrName, String(value));
    }
  }
}

/**
 * Generate a unique ID for ARIA relationships.
 */
let idCounter = 0;
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Link label to input for accessibility.
 */
export function linkLabelToInput(label: HTMLElement, input: HTMLElement): void {
  const id = input.id || generateAriaId('input');
  input.id = id;
  label.setAttribute('for', id);
}

/**
 * Setup skip link for keyboard navigation.
 */
export function setupSkipLink(
  targetId: string,
  linkText: string = 'Skip to main content'
): HTMLElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.className = 'skip-link';
  skipLink.textContent = linkText;

  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
    }
  });

  return skipLink;
}

/**
 * Check if user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast.
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Watch for reduced motion preference changes.
 */
export function watchReducedMotion(callback: (prefers: boolean) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mediaQuery.addEventListener('change', handler);

  return () => mediaQuery.removeEventListener('change', handler);
}

/**
 * Make an element "live" for screen readers.
 */
export function makeLiveRegion(
  element: HTMLElement,
  options: {
    politeness?: 'polite' | 'assertive' | 'off';
    atomic?: boolean;
    relevant?: 'additions' | 'removals' | 'text' | 'all';
  } = {}
): void {
  const { politeness = 'polite', atomic = true, relevant = 'additions text' } = options;

  element.setAttribute('aria-live', politeness);
  element.setAttribute('aria-atomic', String(atomic));
  element.setAttribute('aria-relevant', relevant);
}

/**
 * Create a visually hidden element for screen readers.
 */
export function createVisuallyHidden(text: string): HTMLElement {
  const span = document.createElement('span');
  span.className = 'sr-only';
  span.textContent = text;
  return span;
}

/**
 * Get the accessible name of an element.
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElements = labelledBy.split(' ').map((id) => document.getElementById(id));
    const labels = labelElements.filter(Boolean).map((el) => el!.textContent);
    if (labels.length > 0) {
      return labels.join(' ');
    }
  }

  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel;
  }

  // Check for label element
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent ?? '';
    }
  }

  // Fall back to text content
  return element.textContent ?? '';
}
