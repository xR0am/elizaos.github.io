/**
 * Log levels for processing steps
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

/**
 * Configuration for logger
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  prefix?: string;
}

/**
 * Default configuration
 */
const defaultConfig: LoggerConfig = {
  minLevel: LogLevel.INFO,
};

/**
 * A simple logger for processing steps
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Log a message at the specified level
   */
  log(level: LogLevel, message: string, data?: Record<string, any>): void {
    if (level > this.config.minLevel) return;

    const prefix = this.config.prefix ? `[${this.config.prefix}] ` : "";
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];

    // Format basic message
    let logMessage = `${timestamp} ${levelStr}: ${prefix}${message}`;

    // Add data as JSON if provided
    if (data) {
      // Limit data to prevent excessive logging
      const limitedData = this.limitObjectDepth(data);
      logMessage += ` ${JSON.stringify(limitedData)}`;
    }

    // Log to console
    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
      default:
        console.debug(logMessage);
        break;
    }
  }

  /**
   * Helper methods for each log level
   */
  error(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, data);
  }

  warn(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, data);
  }

  info(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, data);
  }

  debug(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  trace(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, data);
  }

  /**
   * Create a child logger with a specific prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix,
    });
  }

  /**
   * Limit object depth to prevent excessive logging
   */
  private limitObjectDepth(
    obj: any,
    depth: number = 0,
    maxDepth: number = 2
  ): any {
    if (depth >= maxDepth) {
      if (Array.isArray(obj)) {
        return obj.length > 0 ? [`${obj.length} items`] : [];
      }
      if (typeof obj === "object" && obj !== null) {
        return "[Object]";
      }
    }

    if (Array.isArray(obj)) {
      if (obj.length > 10) {
        // Truncate large arrays
        return [
          ...obj
            .slice(0, 5)
            .map((item) => this.limitObjectDepth(item, depth + 1, maxDepth)),
          `... ${obj.length - 10} more items ...`,
          ...obj
            .slice(-5)
            .map((item) => this.limitObjectDepth(item, depth + 1, maxDepth)),
        ];
      }
      return obj.map((item) =>
        this.limitObjectDepth(item, depth + 1, maxDepth)
      );
    }

    if (typeof obj === "object" && obj !== null) {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.limitObjectDepth(value, depth + 1, maxDepth);
      }
      return result;
    }

    return obj;
  }
}
