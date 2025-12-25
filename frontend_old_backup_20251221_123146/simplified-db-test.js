// Simplified Real Database Test for Design Quantity Assignment
// Focus on testing the core functionality with existing schema

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL, 
    process.env.REACT_APP_SUPABASE_ANON_KEY
);

class SimplifiedTester {
    constructor() {
        this.testData = {};
        this.results = [];
    }
    
    log(step, status, data = null, error = null) {
        const result = { step, status, data, error, timestamp: new Date().toISOString() };
        this.results.push(result);
        
        const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
        console.log(`${emoji} ${step}`);
        
        if (data && typeof data === 'object') {
            console.log('   ', JSON.stringify(data, null, 2));
        }
        
        if (error) {
            console.log('   Error:', error);
        }
    }
    
    async createTestCustomer() {
        this.log('Creating Test Customer', 'running');
        
        try {
            // Use simpler customer data that matches existing schema
            const customerData = {
                name: 'E2E Test - Rajesh Textiles',
                contact_person: 'Rajesh Kumar',
                phone: '+91-9876543210',
                email: 'e2etest.rajesh@example.com',
                address: '123 Test Street, Coimbatore, Tamil Nadu'
            };
            
            const { data, error } = await supabase
                .from('customers')
                .insert([customerData])
                .select()
                .single();
            
            if (error) throw error;
            
            this.testData.customer = data;
            this.log('Creating Test Customer', 'success', { id: data.id, name: data.name });
            return true;
        } catch (error) {
            this.log('Creating Test Customer', 'error', null, error.message);
            return false;
        }
    }
    
    async createTestOrder() {
        this.log('Creating Test Order with Items', 'running');
        
        try {
            // Create order
            const orderData = {
                customer_id: this.testData.customer.id,
                order_number: `E2E-${Date.now()}`,
                order_date: new Date().toISOString().split('T')[0],
                status: 'confirmed'
            };
            
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([orderData])
                .select()
                .single();
            
            if (orderError) throw orderError;
            
            // Create order items with design quantities
            const orderItemsData = [
                {
                    order_id: order.id,
                    material_type: 'saree',
                    quantity: 20,
                    unit_price: 1200.00,
                    designs_provided_quantity: 12,
                    designs_approved_quantity: 10,
                    current_stage: 'design_ready'
                },
                {
                    order_id: order.id,
                    material_type: 'dupatta',
                    quantity: 15,
                    unit_price: 800.00,
                    designs_provided_quantity: 8,
                    designs_approved_quantity: 6,
                    current_stage: 'design_ready'
                }
            ];
            
            const { data: orderItems, error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsData)
                .select();
            
            if (itemsError) throw itemsError;
            
            this.testData.order = { ...order, items: orderItems };
            this.log('Creating Test Order with Items', 'success', { 
                orderId: order.id, 
                itemCount: orderItems.length 
            });
            return true;
        } catch (error) {
            this.log('Creating Test Order with Items', 'error', null, error.message);
            return false;
        }
    }
    
    async testDesignAssignments() {
        this.log('Testing Design Assignment with Quantity Splitting', 'running');
        
        try {
            const assignments = [];
            
            // Get items
            const sareeItem = this.testData.order.items.find(item => item.material_type === 'saree');
            const dupattaItem = this.testData.order.items.find(item => item.material_type === 'dupatta');
            
            // Create mock designer IDs (using UUIDs)
            const designerIds = [
                'designer-1-' + Date.now(),
                'designer-2-' + Date.now(),
                'designer-3-' + Date.now()
            ];
            
            // Saree assignments (10 designs total: 4+3+3)
            const sareeAssignments = [
                {
                    order_item_id: sareeItem.id,
                    designer_id: designerIds[0],
                    assigned_design_quantity: 4,
                    priority_level: 'high',
                    expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    estimated_hours: 16.0,
                    assignment_notes: 'Lead designer for premium saree designs',
                    status: 'assigned'
                },
                {
                    order_item_id: sareeItem.id,
                    designer_id: designerIds[1],
                    assigned_design_quantity: 3,
                    priority_level: 'high',
                    expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    estimated_hours: 12.0,
                    assignment_notes: 'Supporting designer for saree designs',
                    status: 'assigned'
                },
                {
                    order_item_id: sareeItem.id,
                    designer_id: designerIds[2],
                    assigned_design_quantity: 3,
                    priority_level: 'high',
                    expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    estimated_hours: 12.0,
                    assignment_notes: 'Supporting designer for saree designs',
                    status: 'assigned'
                }
            ];
            
            // Dupatta assignments (6 designs total: 4+2)
            const dupattaAssignments = [
                {
                    order_item_id: dupattaItem.id,
                    designer_id: designerIds[0],
                    assigned_design_quantity: 4,
                    priority_level: 'medium',
                    expected_delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    estimated_hours: 8.0,
                    assignment_notes: 'Matching dupatta designs',
                    status: 'assigned'
                },
                {
                    order_item_id: dupattaItem.id,
                    designer_id: designerIds[1],
                    assigned_design_quantity: 2,
                    priority_level: 'medium',
                    expected_delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    estimated_hours: 4.0,
                    assignment_notes: 'Supporting dupatta designs',
                    status: 'assigned'
                }
            ];
            
            const allAssignments = [...sareeAssignments, ...dupattaAssignments];
            
            // Insert assignments one by one
            for (let i = 0; i < allAssignments.length; i++) {
                const assignment = allAssignments[i];
                const { data, error } = await supabase
                    .from('designer_assignments')
                    .insert([assignment])
                    .select()
                    .single();
                
                if (error) throw error;
                assignments.push(data);
                
                console.log(`    ✅ Assignment ${i+1}/${allAssignments.length}: ${assignment.assigned_design_quantity} designs to ${assignment.designer_id.split('-')[1]}`);
            }
            
            this.testData.assignments = assignments;
            
            // Calculate totals
            const sareeTotal = sareeAssignments.reduce((sum, a) => sum + a.assigned_design_quantity, 0);
            const dupattaTotal = dupattaAssignments.reduce((sum, a) => sum + a.assigned_design_quantity, 0);
            
            this.log('Testing Design Assignment with Quantity Splitting', 'success', {
                totalAssignments: assignments.length,
                sareeDesignsAssigned: `${sareeTotal}/10`,
                dupattaDesignsAssigned: `${dupattaTotal}/6`
            });
            
            return true;
        } catch (error) {
            this.log('Testing Design Assignment with Quantity Splitting', 'error', null, error.message);
            return false;
        }
    }
    
    async testAssignmentSummaryView() {
        this.log('Testing Design Assignment Summary View', 'running');
        
        try {
            const summaries = [];
            
            for (const item of this.testData.order.items) {
                const { data, error } = await supabase
                    .from('design_assignment_summary')
                    .select('*')
                    .eq('order_item_id', item.id)
                    .single();
                
                if (error) throw error;
                summaries.push(data);
                
                console.log(`    📊 ${item.material_type}: ${data.total_assigned_designs}/${data.designs_approved_quantity} assigned, ${data.unassigned_designs} unassigned`);
            }
            
            this.testData.summaries = summaries;
            this.log('Testing Design Assignment Summary View', 'success', {
                summariesFound: summaries.length
            });
            
            return true;
        } catch (error) {
            this.log('Testing Design Assignment Summary View', 'error', null, error.message);
            return false;
        }
    }
    
    async testOverAssignmentValidation() {
        this.log('Testing Over-Assignment Validation (Should Fail)', 'running');
        
        try {
            const sareeItem = this.testData.order.items.find(item => item.material_type === 'saree');
            
            // Try to assign 5 more designs (would make total 15, but only 10 available)
            const overAssignment = {
                order_item_id: sareeItem.id,
                designer_id: 'test-designer-' + Date.now(),
                assigned_design_quantity: 5,
                priority_level: 'low',
                expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                estimated_hours: 10.0,
                assignment_notes: 'Over-assignment test - should fail',
                status: 'assigned'
            };
            
            const { data, error } = await supabase
                .from('designer_assignments')
                .insert([overAssignment])
                .select();
            
            if (error) {
                // Expected behavior - validation should prevent this
                this.log('Testing Over-Assignment Validation (Should Fail)', 'success', {
                    validationWorking: true,
                    preventedOverAssignment: true,
                    errorMessage: error.message
                });
                return true;
            } else {
                // Unexpected - validation didn't work
                this.log('Testing Over-Assignment Validation (Should Fail)', 'error', null, 
                    'Over-assignment was allowed! Validation is not working correctly.');
                return false;
            }
        } catch (error) {
            this.log('Testing Over-Assignment Validation (Should Fail)', 'error', null, error.message);
            return false;
        }
    }
    
    async cleanupTestData() {
        this.log('Cleaning up test data', 'running');
        
        try {
            // Delete in reverse order
            if (this.testData.assignments) {
                await supabase.from('designer_assignments').delete().in('id', this.testData.assignments.map(a => a.id));
            }
            
            if (this.testData.order && this.testData.order.items) {
                await supabase.from('order_items').delete().in('id', this.testData.order.items.map(i => i.id));
                await supabase.from('orders').delete().eq('id', this.testData.order.id);
            }
            
            if (this.testData.customer) {
                await supabase.from('customers').delete().eq('id', this.testData.customer.id);
            }
            
            this.log('Cleaning up test data', 'success');
            return true;
        } catch (error) {
            this.log('Cleaning up test data', 'error', null, error.message);
            return false;
        }
    }
    
    generateReport() {
        console.log('\n📊 DESIGN QUANTITY ASSIGNMENT TEST REPORT');
        console.log('===========================================');
        
        const successCount = this.results.filter(r => r.status === 'success').length;
        const errorCount = this.results.filter(r => r.status === 'error').length;
        
        console.log(`Total Tests: ${this.results.length}`);
        console.log(`Successful: ${successCount}`);
        console.log(`Failed: ${errorCount}`);
        console.log(`Success Rate: ${((successCount / this.results.length) * 100).toFixed(1)}%`);
        
        console.log('\n📋 DETAILED RESULTS:');
        this.results.forEach(result => {
            const emoji = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⏳';
            console.log(`${emoji} ${result.step}`);
            if (result.error) {
                console.log(`    ❌ ${result.error}`);
            }
        });
        
        // Summary of key functionality
        if (this.testData.summaries) {
            console.log('\n🎯 DESIGN ASSIGNMENT SUMMARY:');
            console.log('==============================');
            this.testData.summaries.forEach(summary => {
                console.log(`📦 ${summary.material_type.toUpperCase()}:`);
                console.log(`   Available Designs: ${summary.designs_approved_quantity}`);
                console.log(`   Assigned Designs: ${summary.total_assigned_designs}`);
                console.log(`   Unassigned Designs: ${summary.unassigned_designs}`);
                console.log(`   Number of Designers: ${summary.number_of_designers}`);
                console.log(`   Allocation: ${((summary.total_assigned_designs / summary.designs_approved_quantity) * 100).toFixed(1)}%`);
                console.log('');
            });
        }
        
        const allPassed = successCount === this.results.length;
        
        if (allPassed) {
            console.log('🎉 ALL TESTS PASSED!');
            console.log('✅ Design quantity assignment working correctly');
            console.log('✅ Database validation preventing over-assignment');
            console.log('✅ Assignment summary view working');
            console.log('✅ Quantity splitting across multiple designers working');
            console.log('\n🚀 Ready for frontend testing at http://localhost:3000');
        }
        
        return allPassed;
    }
}

async function runSimplifiedTest() {
    const tester = new SimplifiedTester();
    
    try {
        console.log('🚀 Testing Design Quantity Assignment Feature');
        console.log('============================================\n');
        
        // Run tests
        if (!await tester.createTestCustomer()) return false;
        if (!await tester.createTestOrder()) return false;
        if (!await tester.testDesignAssignments()) return false;
        if (!await tester.testAssignmentSummaryView()) return false;
        if (!await tester.testOverAssignmentValidation()) return false;
        
        const allPassed = tester.generateReport();
        
        // Cleanup
        await tester.cleanupTestData();
        
        return allPassed;
        
    } catch (error) {
        console.error('\n💥 Test failed with exception:', error);
        await tester.cleanupTestData();
        return false;
    }
}

// Run the test
runSimplifiedTest()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });