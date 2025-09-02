// Test Database Update Function
// Use this to debug what's actually happening with database updates

import { supabase } from '../lib/supabase';

export const testDatabaseUpdate = async (orderItemId: string) => {
  console.log('🧪 [TEST] Starting database update test for:', orderItemId);
  
  try {
    // Step 1: Check current data
    const { data: currentData, error: fetchError } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', orderItemId)
      .single();
    
    console.log('📋 [TEST] Current data:', { currentData, fetchError });
    
    if (fetchError) {
      console.error('❌ [TEST] Error fetching current data:', fetchError);
      return;
    }
    
    // Step 2: Try a simple update
    const testUpdateData = {
      customization_details: `TEST UPDATE - ${new Date().toISOString()}`
    };
    
    console.log('💾 [TEST] Attempting update with:', testUpdateData);
    
    const { data: updateResult, error: updateError } = await supabase
      .from('order_items')
      .update(testUpdateData)
      .eq('id', orderItemId)
      .select()
      .single();
    
    console.log('✅ [TEST] Update result:', { updateResult, updateError });
    
    if (updateError) {
      console.error('❌ [TEST] Error during update:', updateError);
      return;
    }
    
    // Step 3: Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', orderItemId)
      .single();
    
    console.log('🔍 [TEST] Verification data:', { verifyData, verifyError });
    
    // Step 4: Check if the change persisted
    const isUpdated = verifyData?.customization_details === testUpdateData.customization_details;
    console.log('✅ [TEST] Update persisted:', isUpdated);
    
    return {
      success: isUpdated,
      currentData,
      updateResult,
      verifyData,
      errors: { fetchError, updateError, verifyError }
    };
    
  } catch (error) {
    console.error('❌ [TEST] Unexpected error:', error);
    return { success: false, error };
  }
};

// Export for use in browser console
(window as any).testDatabaseUpdate = testDatabaseUpdate;