import { useEffect } from 'react';

export const useViewportHeight = () => {
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    // Set the initial value
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set the initial value
    setVh();

    // Update the value on window resize
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);
};
