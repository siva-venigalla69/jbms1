import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Button,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Fab,
  Stack
} from '@mui/material';
import {
  BugReport,
  ExpandMore,
  ExpandLess,
  Clear,
  Download,
  Visibility,
  VisibilityOff,
  Settings
} from '@mui/icons-material';
import {
  getDebugConfig,
  setDebugConfig,
  getLogHistory,
  clearLogHistory,
  debugHelpers,
  type DebugConfig,
  type LogLevel,
  type LogModule
} from '../../utils/debug';

interface DebugPanelProps {
  position?: 'fixed' | 'relative';
  initiallyOpen?: boolean;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ 
  position = 'fixed', 
  initiallyOpen = false 
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [config, setConfig] = useState<DebugConfig>(getDebugConfig());
  const [logs, setLogs] = useState(getLogHistory());
  const [logFilter, setLogFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [moduleFilter, setModuleFilter] = useState<LogModule | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh logs
  useEffect(() => {
    if (!autoRefresh || !isOpen) return;

    const interval = setInterval(() => {
      setLogs(getLogHistory());
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, isOpen]);

  const handleConfigChange = (updates: Partial<DebugConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setDebugConfig(newConfig);
  };

  const handleModuleToggle = (module: LogModule) => {
    const newModules = {
      ...config.modules,
      [module]: !config.modules[module]
    };
    handleConfigChange({ modules: newModules });
  };

  const clearLogs = () => {
    clearLogHistory();
    setLogs([]);
  };

  const exportLogs = () => {
    const logData = JSON.stringify(logs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `debug-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;
    if (logFilter && !log.message.toLowerCase().includes(logFilter.toLowerCase())) return false;
    return true;
  }).slice(-500); // Show last 500 logs

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'info';
      case 'debug': return 'default';
      default: return 'default';
    }
  };

  if (position === 'fixed') {
    return (
      <>
        {/* Floating Action Button */}
        <Fab
          color="secondary"
          aria-label="debug"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            opacity: isOpen ? 0 : 1,
            transition: 'opacity 0.3s'
          }}
          onClick={() => setIsOpen(true)}
        >
          <BugReport />
        </Fab>

        {/* Debug Panel */}
        <Paper
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            width: 600,
            maxHeight: '80vh',
            zIndex: 1001,
            overflow: 'hidden',
            display: isOpen ? 'block' : 'none'
          }}
        >
          <DebugPanelContent
            config={config}
            logs={filteredLogs}
            logFilter={logFilter}
            setLogFilter={setLogFilter}
            levelFilter={levelFilter}
            setLevelFilter={setLevelFilter}
            moduleFilter={moduleFilter}
            setModuleFilter={setModuleFilter}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
            onConfigChange={handleConfigChange}
            onModuleToggle={handleModuleToggle}
            onClearLogs={clearLogs}
            onExportLogs={exportLogs}
            onClose={() => setIsOpen(false)}
            getLevelColor={getLevelColor}
          />
        </Paper>
      </>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <DebugPanelContent
        config={config}
        logs={filteredLogs}
        logFilter={logFilter}
        setLogFilter={setLogFilter}
        levelFilter={levelFilter}
        setLevelFilter={setLevelFilter}
        moduleFilter={moduleFilter}
        setModuleFilter={setModuleFilter}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        onConfigChange={handleConfigChange}
        onModuleToggle={handleModuleToggle}
        onClearLogs={clearLogs}
        onExportLogs={exportLogs}
        getLevelColor={getLevelColor}
      />
    </Paper>
  );
};

interface DebugPanelContentProps {
  config: DebugConfig;
  logs: any[];
  logFilter: string;
  setLogFilter: (filter: string) => void;
  levelFilter: LogLevel | 'all';
  setLevelFilter: (level: LogLevel | 'all') => void;
  moduleFilter: LogModule | 'all';
  setModuleFilter: (module: LogModule | 'all') => void;
  autoRefresh: boolean;
  setAutoRefresh: (refresh: boolean) => void;
  onConfigChange: (updates: Partial<DebugConfig>) => void;
  onModuleToggle: (module: LogModule) => void;
  onClearLogs: () => void;
  onExportLogs: () => void;
  onClose?: () => void;
  getLevelColor: (level: LogLevel) => any;
}

const DebugPanelContent: React.FC<DebugPanelContentProps> = ({
  config,
  logs,
  logFilter,
  setLogFilter,
  levelFilter,
  setLevelFilter,
  moduleFilter,
  setModuleFilter,
  autoRefresh,
  setAutoRefresh,
  onConfigChange,
  onModuleToggle,
  onClearLogs,
  onExportLogs,
  onClose,
  getLevelColor
}) => {
  const [configExpanded, setConfigExpanded] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(true);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BugReport />
          <Typography variant="h6">Debug Panel</Typography>
          <Chip 
            label={config.enabled ? 'ON' : 'OFF'} 
            color={config.enabled ? 'success' : 'default'}
            size="small"
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton 
            onClick={onClose || (() => {})} 
            sx={{ 
              color: 'inherit',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              border: '1px solid rgba(255,255,255,0.2)',
              opacity: onClose ? 1 : 0.5,
            }}
            title={onClose ? "Close Debug Panel" : "Close not available"}
            size="small"
            disabled={!onClose}
          >
            <VisibilityOff />
          </IconButton>
        </Box>
      </Box>

      {/* Configuration Section */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box
          sx={{ p: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          onClick={() => setConfigExpanded(!configExpanded)}
        >
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings /> Configuration
          </Typography>
          {configExpanded ? <ExpandLess /> : <ExpandMore />}
        </Box>
        
        <Collapse in={configExpanded}>
          <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enabled}
                    onChange={(e) => onConfigChange({ enabled: e.target.checked })}
                  />
                }
                label="Enable Debug Logging"
              />
              
              <Box sx={{ width: '200px' }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Log Level</InputLabel>
                  <Select
                    value={config.level}
                    label="Log Level"
                    onChange={(e) => onConfigChange({ level: e.target.value as LogLevel })}
                  >
                    <MenuItem value="error">Error</MenuItem>
                    <MenuItem value="warn">Warning</MenuItem>
                    <MenuItem value="info">Info</MenuItem>
                    <MenuItem value="debug">Debug</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>Modules</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {Object.entries(config.modules).map(([module, enabled]) => (
                    <FormControlLabel
                      key={module}
                      control={
                        <Switch
                          checked={enabled}
                          onChange={() => onModuleToggle(module as LogModule)}
                          size="small"
                        />
                      }
                      label={module}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Collapse>
      </Box>

      {/* Logs Section */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box
          sx={{ p: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          onClick={() => setLogsExpanded(!logsExpanded)}
        >
          <Typography variant="subtitle1">
            Logs ({logs.length})
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label="Auto Refresh"
              onClick={(e) => e.stopPropagation()}
            />
            {logsExpanded ? <ExpandLess /> : <ExpandMore />}
          </Box>
        </Box>
        
        <Collapse in={logsExpanded}>
          <Box sx={{ p: 2 }}>
            {/* Log Filters */}
            <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
              <TextField
                size="small"
                label="Filter logs"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                sx={{ minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Level</InputLabel>
                <Select
                  value={levelFilter}
                  label="Level"
                  onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="warn">Warning</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="debug">Debug</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Module</InputLabel>
                <Select
                  value={moduleFilter}
                  label="Module"
                  onChange={(e) => setModuleFilter(e.target.value as LogModule | 'all')}
                >
                  <MenuItem value="all">All</MenuItem>
                  {Object.keys(config.modules).map(module => (
                    <MenuItem key={module} value={module}>{module}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button onClick={onClearLogs} variant="outlined" size="small" startIcon={<Clear />}>
                Clear
              </Button>
            </Stack>

            {/* Action Buttons */}
            <Box sx={{ mb: 2 }}>
              <Button onClick={onExportLogs} variant="outlined" size="small" startIcon={<Download />} sx={{ mr: 1 }}>
                Export
              </Button>
              <Button 
                onClick={() => debugHelpers.showLogs()} 
                variant="outlined" 
                size="small"
                sx={{ mr: 1 }}
              >
                Log to Console
              </Button>
            </Box>

            {/* Log Table */}
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Module</TableCell>
                    <TableCell>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow key={index} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.level.toUpperCase()} 
                          color={getLevelColor(log.level)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={log.module} variant="outlined" size="small" />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {log.message}
                        {log.data && (
                          <Box sx={{ mt: 0.5, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                            <pre style={{ margin: 0, fontSize: '0.7rem', overflow: 'auto' }}>
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};

export default DebugPanel;