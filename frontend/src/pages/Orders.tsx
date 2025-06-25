import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
} from '@mui/material';
import { ShoppingCart, Add } from '@mui/icons-material';

const Orders: React.FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Order Management
        </Typography>
        <Button variant="contained" startIcon={<Add />} sx={{ px: 3 }}>
          Create Order
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <ShoppingCart sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" fontWeight="600" gutterBottom>
                Order Management System
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                This feature is coming soon! You'll be able to create, manage, and track orders here.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Features will include:
                • Create new orders with multiple items
                • Track order status and production stages  
                • Manage order items and customizations
                • Generate order reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Orders; 