import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
} from '@mui/material';
import { Factory } from '@mui/icons-material';

const Production: React.FC = () => {
    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">
                    Production Tracking
                </Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid size={12}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 8 }}>
                            <Factory sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h5" fontWeight="600" gutterBottom>
                                Production Management System
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                Track production stages and manage workflow here.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Features will include:
                                • Track Pre-treatment, Printing, and Post-process stages
                                • Update production status for order items
                                • View production dashboard and analytics
                                • Manage production schedules
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Production; 