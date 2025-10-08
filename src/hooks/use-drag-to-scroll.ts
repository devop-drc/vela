import { useRef, useEffect, useCallback } from 'react';

export const useDragToScroll = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!ref.current) return;
    isDragging.current = true;
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollLeft.current = ref.current.scrollLeft;
    ref.current.style.cursor = 'grabbing';
    ref.current.style.userSelect = 'none';
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!ref.current) return;
    isDragging.current = false;
    ref.current.style.cursor = 'grab';
    ref.current.style.userSelect = 'auto';
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!ref.current) return;
    isDragging.current = false;
    ref.current.style.cursor = 'grab';
    ref.current.style.userSelect = 'auto';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // Adjust scroll speed
    ref.current.scrollLeft = scrollLeft.current - walk;
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mousemove', handleMouseMove);

    // Set initial cursor style
    element.style.cursor = 'grab';

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseDown, handleMouseLeave, handleMouseUp, handleMouseMove]);

  return ref;
};