// Debug utility for comprehensive logging
// Set REACT_APP_DEBUG=true in .env to enable debugging

export interface DebugConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug';
  modules: {
    auth: boolean;
    api: boolean;
    hooks: boolean;
    components: boolean;
    supabase: boolean;
  };
}

// Default debug configuration
const defaultConfig: DebugConfig = {
  enabled: process.env.REACT_APP_DEBUG === 'true' || process.env.NODE_ENV === 'development',
  level: 'debug',
  modules: {
    auth: true,
    api: true,
    hooks: true,
    components: true,
    supabase: true,
  }
};

// Runtime debug config (can be modified via debug panel)
let debugConfig: DebugConfig = { ...defaultConfig };

export const setDebugConfig = (config: Partial<DebugConfig>) => {
  debugConfig = { ...debugConfig, ...config };
  localStorage.setItem('debug-config', JSON.stringify(debugConfig));
};

export const getDebugConfig = (): DebugConfig => {
  const stored = localStorage.getItem('debug-config');
  if (stored) {
    try {
      return { ...defaultConfig, ...JSON.parse(stored) };
    } catch (e) {
      console.warn('Invalid debug config in localStorage, using defaults');
    }
  }
  return debugConfig;
};

// Initialize config from localStorage
debugConfig = getDebugConfig();

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type LogModule = keyof DebugConfig['modules'];

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: LogModule;
  message: string;
  data?: any;
}

// In-memory log storage for debug panel
const logHistory: LogEntry[] = [];
const MAX_LOG_ENTRIES = 1000;

const shouldLog = (level: LogLevel, module: LogModule): boolean => {
  if (!debugConfig.enabled) return level === 'error';
  if (!debugConfig.modules[module]) return level === 'error';
  
  const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
  const currentLevelIndex = levels.indexOf(debugConfig.level);
  const messageLevelIndex = levels.indexOf(level);
  
  return messageLevelIndex <= currentLevelIndex;
};

const addToHistory = (entry: LogEntry) => {
  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_ENTRIES) {
    logHistory.shift();
  }
};

const createLogger = (level: LogLevel, module: LogModule) => {
  return (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = { timestamp, level, module, message, data };
    
    addToHistory(entry);
    
    if (!shouldLog(level, module)) return;
    
    const prefix = `[${timestamp}] [${module.toUpperCase()}]`;
    const consoleMethod = level === 'debug' ? 'log' : level;
    
    if (data !== undefined) {
      console[consoleMethod](`${prefix} ${message}`, data);
    } else {
      console[consoleMethod](`${prefix} ${message}`);
    }
  };
};

// Module-specific loggers
export const authLogger = {
  error: createLogger('error', 'auth'),
  warn: createLogger('warn', 'auth'),
  info: createLogger('info', 'auth'),
  debug: createLogger('debug', 'auth'),
};

export const apiLogger = {
  error: createLogger('error', 'api'),
  warn: createLogger('warn', 'api'),
  info: createLogger('info', 'api'),
  debug: createLogger('debug', 'api'),
};

export const hooksLogger = {
  error: createLogger('error', 'hooks'),
  warn: createLogger('warn', 'hooks'),
  info: createLogger('info', 'hooks'),
  debug: createLogger('debug', 'hooks'),
};

export const componentLogger = {
  error: createLogger('error', 'components'),
  warn: createLogger('warn', 'components'),
  info: createLogger('info', 'components'),
  debug: createLogger('debug', 'components'),
};

export const supabaseLogger = {
  error: createLogger('error', 'supabase'),
  warn: createLogger('warn', 'supabase'),
  info: createLogger('info', 'supabase'),
  debug: createLogger('debug', 'supabase'),
};

// Generic logger for other modules
export const logger = {
  error: (message: string, data?: any) => createLogger('error', 'components')(message, data),
  warn: (message: string, data?: any) => createLogger('warn', 'components')(message, data),
  info: (message: string, data?: any) => createLogger('info', 'components')(message, data),
  debug: (message: string, data?: any) => createLogger('debug', 'components')(message, data),
};

// Performance timing utilities
export const performance = {
  mark: (name: string) => {
    if (debugConfig.enabled) {
      window.performance?.mark(name);
      logger.debug(`Performance mark: ${name}`);
    }
  },
  
  measure: (name: string, startMark: string, endMark?: string) => {
    if (debugConfig.enabled && window.performance?.measure) {
      try {
        window.performance.mark(endMark || `${name}-end`);
        const measurement = window.performance.measure(name, startMark, endMark || `${name}-end`);
        logger.info(`Performance: ${name} took ${measurement.duration.toFixed(2)}ms`);
        return measurement.duration;
      } catch (e) {
        logger.warn(`Performance measurement failed for ${name}`, e);
      }
    }
    return 0;
  }
};

// Utility to get log history for debug panel
export const getLogHistory = (): LogEntry[] => [...logHistory];

// Utility to clear log history
export const clearLogHistory = () => {
  logHistory.length = 0;
};

// Network request logging
export const logNetworkRequest = (method: string, url: string, data?: any, response?: any, error?: any) => {
  const message = `${method.toUpperCase()} ${url}`;
  
  if (error) {
    apiLogger.error(`${message} - Failed`, { data, error, response });
  } else {
    apiLogger.info(`${message} - Success`, { data, response });
  }
};

// Authentication state logging
export const logAuthState = (state: string, details?: any) => {
  authLogger.info(`Auth state: ${state}`, details);
};

// Component lifecycle logging
export const logComponentLifecycle = (componentName: string, lifecycle: string, data?: any) => {
  componentLogger.debug(`${componentName}: ${lifecycle}`, data);
};

// Error boundary logging
export const logError = (error: Error, errorInfo?: any, context?: string) => {
  const message = context ? `Error in ${context}` : 'Unhandled error';
  logger.error(message, { error: error.message, stack: error.stack, errorInfo });
};

// Debug helpers for development
export const debugHelpers = {
  // Log current debug config
  showConfig: () => {
    console.log('Current Debug Config:', debugConfig);
  },
  
  // Enable/disable specific modules
  enableModule: (module: LogModule) => {
    setDebugConfig({ modules: { ...debugConfig.modules, [module]: true } });
    logger.info(`Enabled logging for module: ${module}`);
  },
  
  disableModule: (module: LogModule) => {
    setDebugConfig({ modules: { ...debugConfig.modules, [module]: false } });
    logger.info(`Disabled logging for module: ${module}`);
  },
  
  // Set log level
  setLevel: (level: LogLevel) => {
    setDebugConfig({ level });
    logger.info(`Set log level to: ${level}`);
  },
  
  // Enable/disable all logging
  enable: () => {
    setDebugConfig({ enabled: true });
    logger.info('Debug logging enabled');
  },
  
  disable: () => {
    setDebugConfig({ enabled: false });
    console.log('Debug logging disabled');
  },
  
  // Show recent logs
  showLogs: (count: number = 50) => {
    const recentLogs = logHistory.slice(-count);
    console.table(recentLogs);
  }
};

// Make debug helpers available globally in development
if (process.env.NODE_ENV === 'development') {
  (window as any).debug = debugHelpers;
}

export default debugConfig;