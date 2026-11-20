// utils/homeScroll.ts
type ScrollListener = () => void;

const listeners: Set<ScrollListener> = new Set();

export const onHomeTabPress = (listener: ScrollListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const triggerHomeScrollToTop = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn("Error in home scroll listener:", err);
    }
  });
};
