/**
 * Button Component
 *
 * Styled button with variants.
 */

import { createElement } from '@ui/utils/dom';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonOptions {
  /** Button text */
  text: string;
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether button is loading */
  loading?: boolean;
  /**
   * Icon (as HTML/SVG string).
   * SECURITY: Only pass trusted icon content - this is rendered via innerHTML.
   * Do NOT pass user-supplied content here.
   */
  icon?: string;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: (e: MouseEvent) => void;
}

export interface ButtonComponent {
  /** The DOM element */
  element: HTMLButtonElement;
  /** Set disabled state */
  setDisabled(disabled: boolean): void;
  /** Set loading state */
  setLoading(loading: boolean): void;
  /** Set button text */
  setText(text: string): void;
  /** Destroy component */
  destroy(): void;
}

/**
 * Create a button component.
 */
export function createButton(options: ButtonOptions): ButtonComponent {
  const {
    text,
    variant = 'primary',
    size = 'medium',
    type = 'button',
    disabled = false,
    loading = false,
    icon,
    iconPosition = 'left',
    className = '',
    onClick,
  } = options;

  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    loading ? 'btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const button = createElement('button', {
    type,
    disabled: disabled || loading,
    class: classes,
  }) as HTMLButtonElement;

  // Build content
  function buildContent(btnText: string, isLoading: boolean): void {
    button.innerHTML = '';

    if (isLoading) {
      const spinner = createElement('span', { class: 'btn__spinner' });
      button.appendChild(spinner);
      button.appendChild(document.createTextNode(' Loading...'));
      return;
    }

    if (icon && iconPosition === 'left') {
      const iconEl = createElement('span', { class: 'btn__icon' });
      iconEl.innerHTML = icon;
      button.appendChild(iconEl);
    }

    button.appendChild(document.createTextNode(btnText));

    if (icon && iconPosition === 'right') {
      const iconEl = createElement('span', { class: 'btn__icon' });
      iconEl.innerHTML = icon;
      button.appendChild(iconEl);
    }
  }

  buildContent(text, loading);

  function handleClick(e: MouseEvent): void {
    if (!button.disabled) {
      onClick?.(e);
    }
  }

  button.addEventListener('click', handleClick);

  return {
    element: button,

    setDisabled(disabled: boolean): void {
      button.disabled = disabled;
    },

    setLoading(isLoading: boolean): void {
      button.disabled = isLoading;
      button.classList.toggle('btn--loading', isLoading);
      buildContent(text, isLoading);
    },

    setText(newText: string): void {
      buildContent(newText, button.classList.contains('btn--loading'));
    },

    destroy(): void {
      button.removeEventListener('click', handleClick);
    },
  };
}
