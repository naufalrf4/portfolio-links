import { useCallback, useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

const THEME_KEY = 'theme';
const DURATION = 550;

export function ThemeToggler({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    const update = () => setIsDark(document.documentElement.dataset.theme !== 'light');
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = useCallback(() => {
    const button = buttonRef.current;
    if (!button || isTransitioningRef.current) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const maxRadius = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y));

    const applyTheme = () => {
      const next: Theme = isDark ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      setIsDark(next === 'dark');
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
      }
    };

    if (typeof document.startViewTransition !== 'function') {
      applyTheme();
      return;
    }

    const clipPath: [string, string] = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${maxRadius}px at ${x}px ${y}px)`,
    ];

    isTransitioningRef.current = true;
    const transition = document.startViewTransition(applyTheme);
    transition.finished.finally(() => {
      isTransitioningRef.current = false;
    }).catch(() => {});

    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath },
          {
            duration: DURATION,
            easing: 'ease-in-out',
            fill: 'forwards',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      })
      .catch(() => {});
  }, [isDark]);

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors duration-300 hover:text-teal hover:bg-bg-elevated ${className}`}
    >
      <span className="relative block h-[18px] w-[18px] overflow-hidden">
        <Sun
          size={18}
          className={`absolute inset-0 transition-all duration-300 ${isDark ? 'translate-y-0 rotate-0 opacity-100' : '-translate-y-3 rotate-90 opacity-0'}`}
        />
        <Moon
          size={18}
          className={`absolute inset-0 transition-all duration-300 ${!isDark ? 'translate-y-0 rotate-0 opacity-100' : 'translate-y-3 -rotate-90 opacity-0'}`}
        />
      </span>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
