// Real Database End-to-End Test
// This script tests against the actual Supabase database with the deployed schema

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('🔧 Connecting to Supabase...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'Not found');

const supabase = createClient(supabaseUrl, supabaseKey);

class RealDatabaseTester {
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
            console.log('Data:', JSON.stringify(data, null, 2));
        }
        
        if (error) {
            console.log('Error:', error);
        }
    }
    
    async testDatabaseConnection() {
        this.log('Database Connection Test', 'running');
        
        try {
            // Simple query to test connection
            const { data, error } = await supabase
                .from('customers')
                .select('count', { count: 'exact', head: true });
            
            if (error) throw error;
            
            this.log('Database Connection Test', 'success', { customerCount: data });
            return true;
        } catch (error) {
            this.log('Database Connection Test', 'error', null, error.message);
            return false;
        }
    }
    
    async testSchemaChanges() {
        this.log('Schema Changes Verification', 'running');
        
        try {
            // Check if assigned_design_quantity column exists
            const { data, error } = await supabase
                .from('designer_assignments')
                .select('assigned_design_quantity')
                .limit(1);
            
            if (error) {
                // If error mentions assigned_design_quantity doesn't exist, schema not deployed
                if (error.message.includes('assigned_design_quantity')) {
                    throw new Error('assigned_design_quantity column not found - schema not deployed');
                }
                throw error;
            }
            
            this.log('Schema Changes Verification', 'success', { schemaDeployed: true });
            return true;
        } catch (error) {
            this.log('Schema Changes Verification', 'error', null, error.message);
            return false;
        }
    }
    
    async createTestCustomer() {
        this.log('Creating Test Customer', 'running');
        
        try {
            const customerData = {
                name: 'E2E Test - Rajesh Textiles',
                contact_person: 'Rajesh Kumar',
                phone: '+91-9876543210',
                email: 'e2etest.rajesh@rateshtextiles.com',
                address: '123 Test Street, Coimbatore, Tamil Nadu - 641001',
                gst_number: '33AAAAA0000A1Z5',
                business_type: 'RETAIL',
                payment_terms: 'NET_30',
                credit_limit: 500000.00
            };
            
            const { data, error } = await supabase
                .from('customers')
                .insert([customerData])
                .select()
                .single();
            
            if (error) throw error;
            
            this.testData.customer = data;
            this.log('Creating Test Customer', 'success', data);
            return true;
        } catch (error) {
            this.log('Creating Test Customer', 'error', null, error.message);
            return false;
        }
    }
    
    async createTestMaterialStock() {
        this.log('Creating Test Material Stock', 'running');
        
        try {
            const materialData = [
                {
                    customer_id: this.testData.customer.id,
                    material_type: 'saree',
                    quantity: 50,
                    unit_cost: 250.00,
                    supplier_name: 'Premium Silk Mills',
                    supplier_invoice: 'PSM-E2E-001',
                    quality_notes: 'Premium quality silk material for E2E test'
                },
                {
                    customer_id: this.testData.customer.id,
                    material_type: 'dupatta',
                    quantity: 30,
                    unit_cost: 150.00,
                    supplier_name: 'Fine Fabrics Ltd',
                    supplier_invoice: 'FF-E2E-002',
                    quality_notes: 'High quality cotton dupatta material for E2E test'
                }
            ];
            
            const { data, error } = await supabase
                .from('material_in')
                .insert(materialData)
                .select();
            
            if (error) throw error;
            
            this.testData.materials = data;
            this.log('Creating Test Material Stock', 'success', data);
            return true;
        } catch (error) {
            this.log('Creating Test Material Stock', 'error', null, error.message);
            return false;
        }
    }
    
    async createTestOrder() {
        this.log('Creating Test Order', 'running');
        
        try {
            // Create order first
            const orderData = {
                customer_id: this.testData.customer.id,
                order_number: `E2E-ORD-${Date.now()}`,
                order_date: new Date().toISOString().split('T')[0],
                expected_delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                priority_level: 'HIGH',
                special_instructions: 'E2E Test Order - Customer requires premium quality finish',
                status: 'CONFIRMED'
            };
            
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([orderData])
                .select()
                .single();
            
            if (orderError) throw orderError;
            
            // Create order items
            const orderItemsData = [
                {
                    order_id: order.id,
                    material_type: 'saree',
                    quantity: 20,
                    unit_price: 1200.00,
                    customization_details: JSON.stringify({
                        design_type: 'traditional',
                        color_scheme: 'red_gold',
                        border_type: 'heavy_zari',
                        blouse_required: true
                    }),
                    special_instructions: 'Heavy work sarees with gold zari border',
                    current_stage: 'design_pending'
                },
                {
                    order_id: order.id,
                    material_type: 'dupatta',
                    quantity: 15,
                    unit_price: 800.00,
                    customization_details: JSON.stringify({
                        design_type: 'matching',
                        color_scheme: 'red_gold',
                        border_type: 'light_zari'
                    }),
                    special_instructions: 'Matching dupattas for the sarees',
                    current_stage: 'design_pending'
                }
            ];
            
            const { data: orderItems, error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsData)
                .select();
            
            if (itemsError) throw itemsError;
            
            this.testData.order = { ...order, items: orderItems };
            this.log('Creating Test Order', 'success', { order, orderItems });
            return true;
        } catch (error) {
            this.log('Creating Test Order', 'error', null, error.message);
            return false;
        }
    }
    
    async updateDesignQuantities() {
        this.log('Updating Design Quantities', 'running');
        
        try {
            const updates = [];
            
            // Update each order item with design quantities
            for (let i = 0; i < this.testData.order.items.length; i++) {
                const item = this.testData.order.items[i];
                const designsProvided = i === 0 ? 12 : 8;  // 12 for sarees, 8 for dupattas
                const designsApproved = i === 0 ? 10 : 6;  // 10 for sarees, 6 for dupattas
                
                const { data, error } = await supabase
                    .from('order_items')
                    .update({
                        designs_provided_quantity: designsProvided,
                        designs_approved_quantity: designsApproved,
                        current_stage: 'design_ready'
                    })
                    .eq('id', item.id)
                    .select()
                    .single();
                
                if (error) throw error;
                updates.push(data);
            }
            
            // Update local data
            this.testData.order.items = updates;
            this.log('Updating Design Quantities', 'success', updates);
            return true;
        } catch (error) {
            this.log('Updating Design Quantities', 'error', null, error.message);
            return false;
        }
    }
    
    async createTestDesigners() {
        this.log('Creating Test Designers', 'running');
        
        try {
            const designersData = [
                {
                    name: 'E2E Priya Sharma',
                    email: 'e2e.priya@testdesign.com',
                    phone: '+91-9876543301',
                    specialization: 'Traditional Designs',
                    experience_years: 8,
                    hourly_rate: 500.00,
                    status: 'active'
                },
                {
                    name: 'E2E Kavya Reddy',
                    email: 'e2e.kavya@testdesign.com',
                    phone: '+91-9876543302',
                    specialization: 'Modern Patterns',
                    experience_years: 5,
                    hourly_rate: 400.00,
                    status: 'active'
                },
                {
                    name: 'E2E Meera Singh',
                    email: 'e2e.meera@testdesign.com',
                    phone: '+91-9876543303',
                    specialization: 'Zari Work',
                    experience_years: 6,
                    hourly_rate: 450.00,
                    status: 'active'
                }
            ];
            
            const { data, error } = await supabase
                .from('designers')
                .insert(designersData)
                .select();
            
            if (error) throw error;
            
            this.testData.designers = data;
            this.log('Creating Test Designers', 'success', data);
            return true;
        } catch (error) {
            this.log('Creating Test Designers', 'error', null, error.message);
            return false;
        }
    }
    
    async testDesignAssignments() {
        this.log('Creating Design Assignments with Quantity Splitting', 'running');
        
        try {
            const assignments = [];
            
            // Saree assignments (10 designs total)
            const sareeItem = this.testData.order.items.find(item => item.material_type === 'saree');
            const sareeAssignments = [
                {
                    order_item_id: sareeItem.id,
                    designer_id: this.testData.designers[0].id,
                    assigned_design_quantity: 4,
                    priority_level: 'high',
                    expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    estimated_hours: 16.0,
                    assignment_notes: 'Lead designer for premium saree designs - E2E Test',
                    status: 'assigned'
                },
                {
                    order_item_id: sareeItem.id,
                    designer_id: this.testData.designers[1].id,
                    assigned_design_quantity: 3,
                    priority_level: 'high',
                    expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    estimated_hours: 12.0,
                    assignment_notes: 'Supporting designer for saree designs - E2E Test',
                    status: 'assigned'
                },
                {
                    order_item_id: sareeItem.id,
                    designer_id: this.testData.designers[2].id,
                    assigned_design_quantity: 3,
                    priority_level: 'high',
                    expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    estimated_hours: 12.0,
                    assignment_notes: 'Supporting designer for saree designs - E2E Test',
                    status: 'assigned'
                }
            ];
            
            // Dupatta assignments (6 designs total)
            const dupattaItem = this.testData.order.items.find(item => item.material_type === 'dupatta');
            const dupattaAssignments = [
                {
                    order_item_id: dupattaItem.id,
                    designer_id: this.testData.designers[0].id,
                    assigned_design_quantity: 4,
                    priority_level: 'medium',
                    expected_delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    estimated_hours: 8.0,
                    assignment_notes: 'Matching dupatta designs - E2E Test',
                    status: 'assigned'
                },
                {
                    order_item_id: dupattaItem.id,
                    designer_id: this.testData.designers[1].id,
                    assigned_design_quantity: 2,
                    priority_level: 'medium',
                    expected_delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    estimated_hours: 4.0,
                    assignment_notes: 'Supporting dupatta designs - E2E Test',
                    status: 'assigned'
                }
            ];
            
            const allAssignments = [...sareeAssignments, ...dupattaAssignments];
            
            // Insert assignments one by one to test validation
            for (const assignment of allAssignments) {
                const { data, error } = await supabase
                    .from('designer_assignments')
                    .insert([assignment])
                    .select()
                    .single();
                
                if (error) throw error;
                assignments.push(data);
            }
            
            this.testData.assignments = assignments;
            this.log('Creating Design Assignments with Quantity Splitting', 'success', assignments);
            
            // Verify no over-assignment
            const sareeTotal = sareeAssignments.reduce((sum, a) => sum + a.assigned_design_quantity, 0);
            const dupattaTotal = dupattaAssignments.reduce((sum, a) => sum + a.assigned_design_quantity, 0);
            
            console.log(`  📊 Saree Designs: ${sareeTotal}/10 assigned`);
            console.log(`  📊 Dupatta Designs: ${dupattaTotal}/6 assigned`);
            
            return true;
        } catch (error) {
            this.log('Creating Design Assignments with Quantity Splitting', 'error', null, error.message);
            return false;
        }
    }
    
    async testDesignAssignmentSummary() {
        this.log('Testing Design Assignment Summary View', 'running');
        
        try {
            // Test the summary view for both order items
            const summaries = [];
            
            for (const item of this.testData.order.items) {
                const { data, error } = await supabase
                    .from('design_assignment_summary')
                    .select('*')
                    .eq('order_item_id', item.id)
                    .single();
                
                if (error) throw error;
                summaries.push(data);
            }
            
            this.testData.assignmentSummaries = summaries;
            this.log('Testing Design Assignment Summary View', 'success', summaries);
            return true;
        } catch (error) {
            this.log('Testing Design Assignment Summary View', 'error', null, error.message);
            return false;
        }
    }
    
    async testOverAssignmentValidation() {
        this.log('Testing Over-Assignment Validation', 'running');
        
        try {
            const sareeItem = this.testData.order.items.find(item => item.material_type === 'saree');
            
            // Try to assign more designs than available (should fail)
            const overAssignment = {
                order_item_id: sareeItem.id,
                designer_id: this.testData.designers[0].id,
                assigned_design_quantity: 5, // This would make total 15, but only 10 available
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
                // This is expected - validation should prevent over-assignment
                this.log('Testing Over-Assignment Validation', 'success', { 
                    validationWorking: true, 
                    errorMessage: error.message 
                });
                return true;
            } else {
                // This is bad - validation failed
                this.log('Testing Over-Assignment Validation', 'error', null, 'Over-assignment was allowed - validation not working');
                return false;
            }
        } catch (error) {
            this.log('Testing Over-Assignment Validation', 'error', null, error.message);
            return false;
        }
    }
    
    async cleanupTestData() {
        this.log('Cleaning up test data', 'running');
        
        try {
            // Delete in reverse order of creation to handle foreign keys
            if (this.testData.assignments) {
                await supabase.from('designer_assignments').delete().in('id', this.testData.assignments.map(a => a.id));
            }
            
            if (this.testData.designers) {
                await supabase.from('designers').delete().in('id', this.testData.designers.map(d => d.id));
            }
            
            if (this.testData.order && this.testData.order.items) {
                await supabase.from('order_items').delete().in('id', this.testData.order.items.map(i => i.id));
                await supabase.from('orders').delete().eq('id', this.testData.order.id);
            }
            
            if (this.testData.materials) {
                await supabase.from('material_in').delete().in('id', this.testData.materials.map(m => m.id));
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
        console.log('\n📊 REAL DATABASE TEST REPORT');
        console.log('==============================');
        
        const successCount = this.results.filter(r => r.status === 'success').length;
        const errorCount = this.results.filter(r => r.status === 'error').length;
        
        console.log(`Total Tests: ${this.results.length}`);
        console.log(`Successful: ${successCount}`);
        console.log(`Failed: ${errorCount}`);
        console.log(`Success Rate: ${((successCount / this.results.length) * 100).toFixed(1)}%`);
        
        console.log('\n📋 TEST RESULTS:');
        this.results.forEach(result => {
            const emoji = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⏳';
            console.log(`${emoji} ${result.step}`);
            if (result.error) {
                console.log(`    Error: ${result.error}`);
            }
        });
        
        if (this.testData.assignmentSummaries) {
            console.log('\n🎯 DESIGN ASSIGNMENT SUMMARY:');
            this.testData.assignmentSummaries.forEach(summary => {
                console.log(`Material: ${summary.material_type}`);
                console.log(`  Approved Designs: ${summary.designs_approved_quantity}`);
                console.log(`  Assigned Designs: ${summary.total_assigned_designs}`);
                console.log(`  Unassigned Designs: ${summary.unassigned_designs}`);
                console.log(`  Number of Designers: ${summary.number_of_designers}`);
            });
        }
        
        return successCount === this.results.length;
    }
}

async function runRealDatabaseTest() {
    const tester = new RealDatabaseTester();
    
    try {
        console.log('🚀 Starting Real Database End-to-End Test');
        console.log('==========================================\n');
        
        // Test connection and schema
        if (!await tester.testDatabaseConnection()) return false;
        if (!await tester.testSchemaChanges()) return false;
        
        // Create test data
        if (!await tester.createTestCustomer()) return false;
        if (!await tester.createTestMaterialStock()) return false;
        if (!await tester.createTestOrder()) return false;
        if (!await tester.updateDesignQuantities()) return false;
        if (!await tester.createTestDesigners()) return false;
        
        // Test design assignments
        if (!await tester.testDesignAssignments()) return false;
        if (!await tester.testDesignAssignmentSummary()) return false;
        if (!await tester.testOverAssignmentValidation()) return false;
        
        const allPassed = tester.generateReport();
        
        // Cleanup
        await tester.cleanupTestData();
        
        if (allPassed) {
            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('✅ Database schema deployed correctly');
            console.log('✅ Design quantity assignment working');
            console.log('✅ Validation preventing over-assignment');
            console.log('✅ Assignment summary view working');
            console.log('\n🚀 Ready for frontend testing!');
        } else {
            console.log('\n❌ SOME TESTS FAILED');
            console.log('Please check the errors above');
        }
        
        return allPassed;
        
    } catch (error) {
        console.error('\n💥 Test failed with exception:', error);
        await tester.cleanupTestData();
        return false;
    }
}

// Run the test
runRealDatabaseTest()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });