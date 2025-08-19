# Debug Logging System Guide

## Overview

A comprehensive debug logging system has been implemented to help track authentication issues, API calls, and application behavior. The system provides configurable logging with multiple levels and modules.

## Features

- **Configurable Log Levels**: Error, Warning, Info, Debug
- **Module-based Logging**: Separate controls for auth, api, hooks, components, and supabase modules
- **Real-time Debug Panel**: Visual interface to view logs and control settings
- **Performance Monitoring**: Automatic timing of operations
- **Export Functionality**: Export logs as JSON for analysis
- **Environment-based Configuration**: Different settings for development and production

## Quick Start

### Enable/Disable Debug Logging

**Option 1: Environment Variable (Recommended)**
```bash
# In .env.development
REACT_APP_DEBUG=true   # Enable debugging
REACT_APP_DEBUG=false  # Disable debugging
```

**Option 2: Browser Console (Runtime)**
```javascript
// Enable all debugging
window.debug.enable()

// Disable all debugging
window.debug.disable()

// Enable specific modules
window.debug.enableModule('auth')
window.debug.enableModule('api')

// Set log level
window.debug.setLevel('debug')  // or 'info', 'warn', 'error'
```

**Option 3: Debug Panel (Visual Interface)**
- Look for the bug icon (🐛) in the bottom-right corner
- Click to open the debug panel
- Toggle settings visually

## Debug Panel Usage

### Opening the Debug Panel
- **Development Mode**: Automatically available as a floating button
- **Manual**: The panel appears as a floating bug icon in the bottom-right corner

### Panel Features

#### Configuration Section
- **Enable/Disable Logging**: Master switch for all debug logging
- **Log Level**: Filter logs by minimum level (Error < Warning < Info < Debug)
- **Module Controls**: Toggle logging for specific modules:
  - `auth`: Authentication flow (login, logout, session management)
  - `api`: API calls and responses
  - `hooks`: React hooks (useApi, etc.)
  - `components`: Component lifecycle events
  - `supabase`: Supabase-specific operations

#### Logs Section
- **Real-time Log Display**: Shows recent log entries with timestamps
- **Filtering**: Filter by text, log level, or module
- **Auto Refresh**: Automatically updates log display
- **Export**: Download logs as JSON file
- **Clear**: Remove all current logs

## Log Types and What They Show

### Authentication Logs (`auth` module)
```
[AUTH] Starting login process { email: "user@example.com", hasPassword: true }
[AUTH] Auth state: LOGIN_START
[AUTH] Supabase signInWithPassword successful { userId: "...", email: "...", hasSession: true }
[AUTH] User profile retrieved successfully { email: "...", role: "admin" }
[AUTH] Auth state: LOGIN_SUCCESS { user: "user@example.com", hasToken: true }
```

### API Logs (`api` module)
```
[API] Starting API operation: auth.login { email: "user@example.com" }
[API] API operation completed: auth.login
```

### Hook Logs (`hooks` module)
```
[HOOKS] Starting API request: POST /login { hasToken: false, hasBody: true, endpoint: "/login" }
[HOOKS] Response received for /login { status: 200, statusText: "OK", ok: true }
[HOOKS] API request successful: /login { dataReceived: true }
```

### Supabase Logs (`supabase` module)
```
[SUPABASE] Auth state change event { event: "SIGNED_IN", hasSession: true }
[SUPABASE] Processing SIGNED_IN event { sessionId: "eyJhbGciOi...", expiresAt: 1234567890 }
```

## Troubleshooting Login Issues

### Common Debug Output for Login Problems

1. **Login Button Loading Forever**
   ```
   [AUTH] Starting login process { email: "user@example.com", hasPassword: true }
   [AUTH] Auth state: LOGIN_START
   [HOOKS] Starting API request: POST /api/auth/login
   [HOOKS] Response received for /api/auth/login { status: 500, statusText: "Internal Server Error", ok: false }
   [HOOKS] API request failed: /api/auth/login { status: 500, errorData: {...}, errorMessage: "..." }
   ```

2. **Authentication State Issues**
   ```
   [AUTH] Starting auth check
   [AUTH] Auth check error { message: "..." }
   [AUTH] No user found in auth check
   ```

3. **Session/Token Problems**
   ```
   [AUTH] Supabase signInWithPassword successful { userId: "...", hasSession: false }
   [AUTH] Login failed - no user data received
   ```

### Steps to Debug Login Issues

1. **Enable Full Debugging**
   ```javascript
   window.debug.enable()
   window.debug.setLevel('debug')
   ```

2. **Open Debug Panel**
   - Click the bug icon
   - Ensure all modules are enabled
   - Set log level to "Debug"

3. **Attempt Login**
   - Watch the logs in real-time
   - Look for error messages
   - Check the sequence of auth state changes

4. **Export Logs**
   - Click "Export" to download logs
   - Share logs for troubleshooting

## Performance Monitoring

The debug system includes automatic performance timing:

```
[COMPONENTS] Performance: login took 1250.30ms
[COMPONENTS] Performance: auth-check took 234.50ms
```

Access performance data:
```javascript
// Manual timing
window.debug.performance.mark('my-operation-start')
// ... do something
window.debug.performance.measure('my-operation', 'my-operation-start')
```

## Console Commands Reference

```javascript
// Show current configuration
window.debug.showConfig()

// Enable/disable modules
window.debug.enableModule('auth')
window.debug.disableModule('api')

// Set log levels
window.debug.setLevel('info')

// View recent logs in console
window.debug.showLogs(50)  // Show last 50 logs

// Clear log history
window.debug.clearLogs()
```

## Environment Configuration

### Development (.env.development)
```env
REACT_APP_DEBUG=true
```

### Production (.env.production)
```env
REACT_APP_DEBUG=false
```

### Advanced Configuration
```env
# Custom debug level (optional)
REACT_APP_DEBUG_LEVEL=debug

# Enable specific modules only (optional)
REACT_APP_DEBUG_MODULES=auth,api,hooks
```

## Best Practices

1. **Leave Debug Enabled in Development**: It helps catch issues early
2. **Use Appropriate Log Levels**: 
   - `error`: Critical failures
   - `warn`: Potential issues
   - `info`: Important events
   - `debug`: Detailed debugging information
3. **Export Logs for Bug Reports**: Include exported logs when reporting issues
4. **Disable in Production**: Ensure `REACT_APP_DEBUG=false` in production
5. **Filter by Module**: Focus on specific modules when debugging targeted issues

## Troubleshooting the Debug System

If debug logging isn't working:

1. **Check Environment Variables**
   ```bash
   echo $REACT_APP_DEBUG
   ```

2. **Verify in Browser Console**
   ```javascript
   console.log(process.env.REACT_APP_DEBUG)
   ```

3. **Manual Override**
   ```javascript
   window.debug.enable()
   ```

4. **Check Debug Panel**
   - Ensure the bug icon is visible
   - Verify "Enable Debug Logging" is checked

## Integration with Existing Code

The debug system is already integrated into:
- Authentication flow (AuthContext)
- API calls (supabaseApi)
- HTTP requests (useApi hook)
- Supabase operations

To add logging to new components:
```javascript
import { componentLogger } from '../utils/debug';

const MyComponent = () => {
  useEffect(() => {
    componentLogger.info('MyComponent mounted');
    return () => componentLogger.info('MyComponent unmounted');
  }, []);
  
  const handleAction = () => {
    componentLogger.debug('Button clicked', { timestamp: Date.now() });
  };
};
```