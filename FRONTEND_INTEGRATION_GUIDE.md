# 🚀 Frontend Integration Guide

## 📋 **Step 1: Deploy API Functions**

First run: **`CORRECTED_API_FUNCTIONS.sql`**

This adds all the smart functions for QC tracking, invoice generation, and notifications.

## 🔧 **Step 2: Update Existing Frontend Components**

### **Production Screen Updates**

#### **Replace Legacy Column References:**
```javascript
// OLD CODE (replace these):
item.fabric_stage        → item.production_status
item.design_stage        → item.design_status

// OR use the compatibility view:
item.fabric_stage        // Still works via order_items_legacy view
item.design_stage        // Still works via order_items_legacy view
```

#### **Add New Production Stages:**
```javascript
// Update your production status options:
const PRODUCTION_STAGES = [
    { value: 'pending', label: 'Pending', color: '#gray' },
    { value: 'pre_treatment', label: 'Pre-treatment', color: '#blue' },
    { value: 'printing', label: 'Printing', color: '#orange' },
    { value: 'post_process', label: 'Post Process', color: '#purple' },
    { value: 'quality_check', label: 'Quality Check', color: '#yellow' },
    { value: 'completed', label: 'Completed', color: '#green' },
    { value: 'rework', label: 'Rework', color: '#red' }
];
```

#### **Add QC Information Display:**
```javascript
// In your production table, add QC columns:
const QCStatusCell = ({ item }) => {
    const qcStatus = item.qc_pass_status;
    const qcPerson = item.qc_person_name; // From order_items_legacy view
    
    return (
        <div className="qc-status">
            <span className={`badge badge-${getQCStatusColor(qcStatus)}`}>
                {getQCStatusDisplay(qcStatus)}
            </span>
            {qcPerson && (
                <div className="qc-person">QC by: {qcPerson}</div>
            )}
        </div>
    );
};

const getQCStatusColor = (status) => {
    switch (status) {
        case 'pass': return 'success';
        case 'fail': return 'danger';
        case 'rework': return 'warning';
        default: return 'secondary';
    }
};

const getQCStatusDisplay = (status) => {
    switch (status) {
        case 'pass': return '✅ Passed';
        case 'fail': return '❌ Failed';
        case 'rework': return '🔄 Rework';
        default: return '⏳ Pending';
    }
};
```

### **Update API Calls**

#### **Enhanced Production Status Update:**
```javascript
// Update your existing updateProductionStatus function:
const updateProductionStatus = async (orderItemId, newStatus) => {
    try {
        // Your existing API call should still work
        const response = await orderItemApi.updateProductionStatus(orderItemId, newStatus);
        
        // Now it supports the new stages: quality_check, completed, rework
        return response;
    } catch (error) {
        console.error('Production status update failed:', error);
        throw error;
    }
};
```

## 🎯 **Step 3: Add New QC Management Features**

### **QC Dashboard Component:**
```javascript
// Create new component: QCDashboard.tsx
import React, { useState, useEffect } from 'react';

const QCDashboard = () => {
    const [qcData, setQcData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        fetchQCDashboard();
    }, []);
    
    const fetchQCDashboard = async () => {
        try {
            // Call the new SQL function via your API
            const response = await supabase.rpc('get_qc_dashboard');
            setQcData(response.data);
        } catch (error) {
            console.error('Failed to fetch QC dashboard:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const performQC = async (orderItemId, qcStatus, notes, images = []) => {
        try {
            const currentUser = await supabase.auth.getUser();
            
            await supabase.rpc('perform_quality_check', {
                p_order_item_id: orderItemId,
                p_qc_user_id: currentUser.data.user.id,
                p_qc_status: qcStatus,
                p_qc_notes: notes,
                p_qc_images: images
            });
            
            // Refresh dashboard
            fetchQCDashboard();
        } catch (error) {
            console.error('QC operation failed:', error);
            throw error;
        }
    };
    
    if (loading) return <div>Loading QC Dashboard...</div>;
    
    return (
        <div className="qc-dashboard">
            <h2>Quality Check Dashboard</h2>
            
            {/* Metrics Cards */}
            <div className="metrics-row">
                <MetricCard 
                    title="Pending QC" 
                    value={qcData?.metrics?.pending_qc || 0}
                    color="yellow" 
                />
                <MetricCard 
                    title="Completed Today" 
                    value={qcData?.metrics?.completed_today || 0}
                    color="green" 
                />
                <MetricCard 
                    title="Failed QC" 
                    value={qcData?.metrics?.failed_qc || 0}
                    color="red" 
                />
            </div>
            
            {/* Pending Items Table */}
            <QCPendingItemsTable 
                items={qcData?.pending_items || []}
                onPerformQC={performQC}
            />
        </div>
    );
};

// Add to your routing
<Route path="/qc-dashboard" component={QCDashboard} />
```

### **QC Action Modal:**
```javascript
const QCActionModal = ({ item, isOpen, onClose, onSubmit }) => {
    const [qcStatus, setQcStatus] = useState('');
    const [notes, setNotes] = useState('');
    const [images, setImages] = useState([]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmit(item.id, qcStatus, notes, images);
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <h3>Quality Check - {item.material_type}</h3>
                
                <div className="form-group">
                    <label>QC Result:</label>
                    <select value={qcStatus} onChange={(e) => setQcStatus(e.target.value)} required>
                        <option value="">Select Result</option>
                        <option value="pass">✅ Pass</option>
                        <option value="fail">❌ Fail</option>
                        <option value="rework">🔄 Rework Required</option>
                    </select>
                </div>
                
                <div className="form-group">
                    <label>QC Notes:</label>
                    <textarea 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter quality check notes..."
                        rows={4}
                        required={qcStatus === 'fail' || qcStatus === 'rework'}
                    />
                </div>
                
                <div className="form-group">
                    <label>QC Photos (optional):</label>
                    <input 
                        type="file" 
                        multiple 
                        accept="image/*"
                        onChange={handleImageUpload}
                    />
                </div>
                
                <div className="form-actions">
                    <button type="button" onClick={onClose}>Cancel</button>
                    <button type="submit" disabled={!qcStatus}>Submit QC</button>
                </div>
            </form>
        </Modal>
    );
};
```

## 💰 **Step 4: Enhanced Invoice Management**

### **Smart Invoice Generation:**
```javascript
const SmartInvoiceGenerator = () => {
    const [availableChallans, setAvailableChallans] = useState([]);
    const [selectedChallans, setSelectedChallans] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    
    const fetchAvailableChallans = async (customerId = null) => {
        try {
            const response = await supabase.rpc('get_available_challans_for_invoice', {
                p_customer_id: customerId
            });
            setAvailableChallans(response.data || []);
        } catch (error) {
            console.error('Failed to fetch available challans:', error);
        }
    };
    
    const generateInvoice = async () => {
        try {
            const currentUser = await supabase.auth.getUser();
            
            const response = await supabase.rpc('generate_invoice_from_challans', {
                p_challan_ids: selectedChallans,
                p_created_by: currentUser.data.user.id,
                p_invoice_notes: 'Generated from delivery challans'
            });
            
            // Redirect to invoice edit page
            navigate(`/invoices/edit/${response.data.id}`);
        } catch (error) {
            console.error('Invoice generation failed:', error);
        }
    };
    
    return (
        <div className="smart-invoice-generator">
            <h2>Generate Invoice</h2>
            
            {/* Customer Selection */}
            <CustomerSelector onSelect={setSelectedCustomer} />
            
            {/* Available Challans */}
            <ChallanSelector 
                challans={availableChallans}
                selected={selectedChallans}
                onSelectionChange={setSelectedChallans}
            />
            
            {/* Generate Button */}
            <button 
                onClick={generateInvoice}
                disabled={selectedChallans.length === 0}
                className="btn-primary"
            >
                Generate Invoice ({selectedChallans.length} challans)
            </button>
        </div>
    );
};
```

### **Invoice Editor with Revision Tracking:**
```javascript
const InvoiceEditor = ({ invoiceId }) => {
    const [invoice, setInvoice] = useState(null);
    const [canEdit, setCanEdit] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    useEffect(() => {
        checkEditPermissions();
        fetchInvoice();
    }, [invoiceId]);
    
    const checkEditPermissions = async () => {
        try {
            const currentUser = await supabase.auth.getUser();
            const response = await supabase.rpc('can_edit_invoice', {
                p_invoice_id: invoiceId,
                p_user_id: currentUser.data.user.id
            });
            setCanEdit(response.data.can_edit);
        } catch (error) {
            console.error('Permission check failed:', error);
        }
    };
    
    const updateInvoice = async (updates, description) => {
        try {
            const currentUser = await supabase.auth.getUser();
            
            const response = await supabase.rpc('update_invoice_with_revision', {
                p_invoice_id: invoiceId,
                p_user_id: currentUser.data.user.id,
                p_updates: updates,
                p_change_description: description
            });
            
            setInvoice(response.data);
            setEditMode(false);
        } catch (error) {
            console.error('Invoice update failed:', error);
        }
    };
    
    return (
        <div className="invoice-editor">
            <div className="invoice-header">
                <h2>Invoice #{invoice?.invoice_number}</h2>
                <div className="invoice-status">
                    <StatusBadge status={invoice?.invoice_status} />
                    <span className="revision">Rev. {invoice?.revision_number}</span>
                </div>
            </div>
            
            {canEdit && (
                <button onClick={() => setEditMode(!editMode)}>
                    {editMode ? 'Cancel Edit' : 'Edit Invoice'}
                </button>
            )}
            
            <InvoiceForm 
                invoice={invoice}
                editMode={editMode}
                onUpdate={updateInvoice}
                canEdit={canEdit}
            />
        </div>
    );
};
```

## 🔔 **Step 5: Smart Notifications**

### **Notification Center:**
```javascript
const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    
    useEffect(() => {
        fetchNotifications();
        // Set up polling for new notifications
        const interval = setInterval(fetchNotifications, 30000); // Every 30 seconds
        return () => clearInterval(interval);
    }, []);
    
    const fetchNotifications = async () => {
        try {
            const currentUser = await supabase.auth.getUser();
            const response = await supabase.rpc('get_user_notifications', {
                p_user_id: currentUser.data.user.id,
                p_unread_only: false
            });
            
            const notifs = response.data || [];
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };
    
    const markAsRead = async (notificationId) => {
        try {
            const currentUser = await supabase.auth.getUser();
            await supabase.rpc('mark_notification_read', {
                p_notification_id: notificationId,
                p_user_id: currentUser.data.user.id
            });
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };
    
    return (
        <div className="notification-center">
            <div className="notification-header">
                🔔 Notifications {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </div>
            
            <div className="notification-list">
                {notifications.map(notification => (
                    <NotificationItem 
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                    />
                ))}
            </div>
        </div>
    );
};
```

## 🚀 **Step 6: Generate Smart Notifications**

Add this to run periodically (via cron job or scheduled task):
```javascript
// Call this function periodically to generate smart notifications
const generateSmartNotifications = async () => {
    try {
        await supabase.rpc('create_smart_notifications');
        console.log('Smart notifications generated successfully');
    } catch (error) {
        console.error('Failed to generate notifications:', error);
    }
};

// Set up to run every hour
setInterval(generateSmartNotifications, 60 * 60 * 1000);
```

## ✅ **Quick Deployment Checklist:**

1. ✅ Run `CORRECTED_API_FUNCTIONS.sql`
2. ✅ Update production screen to use new stages
3. ✅ Add QC Dashboard component  
4. ✅ Create Smart Invoice Generator
5. ✅ Add Invoice Editor with revision tracking
6. ✅ Implement Notification Center
7. ✅ Set up periodic notification generation
8. ✅ Test end-to-end workflow

## 🎯 **Key Benefits After Implementation:**

- 👤 **QC Tracking**: See exactly who did quality checks
- 🚫 **Duplicate Prevention**: Can't invoice same challan twice  
- ✏️ **Invoice Editing**: Edit invoices safely with revision history
- 🔔 **Smart Alerts**: Automatic notifications for pending tasks
- 📊 **Better UX**: Color-coded status indicators throughout
- 🚀 **Efficiency**: One-click actions and bulk operations

This integration maintains backward compatibility while adding powerful new features! 🎉