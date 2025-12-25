const isDebugMode = process.env.REACT_APP_DEBUG === 'true';

export const debug = {
  log: (...args: any[]) => {
    if (isDebugMode) {
      console.log('[DEBUG]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (isDebugMode) {
      console.error('[ERROR]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDebugMode) {
      console.warn('[WARN]', ...args);
    }
  }
};

export const authLogger = {
  debug: (...args: any[]) => {
    if (isDebugMode) {
      console.log('[AUTH]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (isDebugMode) {
      console.error('[AUTH ERROR]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (isDebugMode) {
      console.info('[AUTH INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDebugMode) {
      console.warn('[AUTH WARN]', ...args);
    }
  }
};

export const apiLogger = {
  debug: (...args: any[]) => {
    if (isDebugMode) {
      console.log('[API]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (isDebugMode) {
      console.error('[API ERROR]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (isDebugMode) {
      console.info('[API INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDebugMode) {
      console.warn('[API WARN]', ...args);
    }
  }
};

export const logAuthState = (action: string, data?: any) => {
  if (isDebugMode) {
    console.log(`[AUTH STATE] ${action}`, data);
  }
};

export const performance = {
  mark: (label: string) => {
    if (isDebugMode && window.performance) {
      window.performance.mark(label);
    }
  },
  measure: (name: string, startMark?: string, endMark?: string) => {
    if (isDebugMode && window.performance) {
      try {
        if (startMark && endMark) {
          window.performance.measure(name, startMark, endMark);
        } else if (startMark) {
          window.performance.measure(name, startMark);
        } else {
          window.performance.measure(name);
        }
      } catch (e) {
        // Ignore performance measurement errors
      }
    }
  }
};
