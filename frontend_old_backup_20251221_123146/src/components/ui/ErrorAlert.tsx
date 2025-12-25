import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Typography,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface ErrorAlertProps {
  error: string | Error | null;
  severity?: 'error' | 'warning' | 'info';
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  collapsible?: boolean;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  severity = 'error',
  title,
  onRetry,
  onDismiss,
  showDetails = false,
  collapsible = false
}) => {
  const [expanded, setExpanded] = React.useState(false);

  if (!error) return null;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const getIcon = () => {
    switch (severity) {
      case 'warning':
        return <WarningIcon />;
      case 'info':
        return <InfoIcon />;
      default:
        return <ErrorIcon />;
    }
  };

  const getDefaultTitle = () => {
    switch (severity) {
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Error';
    }
  };

  return (
    <Alert
      severity={severity}
      icon={getIcon()}
      action={
        <Box display="flex" gap={1}>
          {collapsible && (
            <IconButton
              color="inherit"
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
          {onRetry && (
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              color="inherit"
              size="small"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </Box>
      }
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      
      <Typography variant="body2">
        {errorMessage}
      </Typography>

      {(showDetails || collapsible) && (
        <Collapse in={expanded || showDetails}>
          <Box mt={1}>
            {errorStack && (
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  padding: 1,
                  borderRadius: 1,
                  maxHeight: 200,
                  overflow: 'auto'
                }}
              >
                {errorStack}
              </Typography>
            )}
          </Box>
        </Collapse>
      )}
    </Alert>
  );
};

export default ErrorAlert;