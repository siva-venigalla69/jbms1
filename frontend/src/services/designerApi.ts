import { supabase } from '../lib/supabase';
import { componentLogger } from '../utils/debug';

// Types
interface TodaysPriority {
  assignment_id: string;
  order_item_id: string;
  priority_level: 'urgent' | 'high' | 'normal' | 'low';
  expected_delivery_date: string;
  status: string;
  estimated_hours: number;
  material_type: string;
  quantity: number;
  customization_details?: string;
  order_number: string;
  customer_name: string;
  designer_name: string;
  design_name?: string;
  design_code?: string;
  urgency_status: 'overdue' | 'due_today' | 'due_tomorrow' | 'upcoming';
  days_until_due: number;
}

interface DesignerWorkload {
  designer_id: string;
  designer_email: string;
  designer_name: string;
  total_assignments: number;
  pending_assignments: number;
  active_assignments: number;
  overdue_assignments: number;
  pending_hours: number;
  urgent_tasks: number;
  high_priority_tasks: number;
  avg_completion_hours: number;
  on_time_deliveries: number;
  total_completed: number;
}

interface OverdueAssignment {
  assignment_id: string;
  order_number: string;
  customer_name: string;
  designer_name: string;
  material_type: string;
  priority_level: string;
  days_overdue: number;
  estimated_hours: number;
}

interface Assignment {
  assignment_id: string;
  order_item_id: string;
  order_number: string;
  customer_name: string;
  material_type: string;
  quantity: number;
  priority_level: string;
  status: string;
  expected_delivery_date: string;
  estimated_hours: number;
  designer_name: string;
  design_name?: string;
  urgency_status: string;
  days_until_due: number;
}

interface DesignLibraryItem {
  id: string;
  design_name: string;
  design_category: string;
  design_code: string;
  design_file_url?: string;
  design_thumbnail_url?: string;
  design_description?: string;
  material_compatibility: string[];
  complexity_level: 'simple' | 'medium' | 'complex';
  estimated_hours: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CreateDesignRequest {
  design_name: string;
  design_category: string;
  design_code: string;
  design_file_url?: string;
  design_thumbnail_url?: string;
  design_description?: string;
  material_compatibility: string[];
  complexity_level: 'simple' | 'medium' | 'complex';
  estimated_hours: number;
  is_active: boolean;
}

interface CreateAssignmentRequest {
  order_item_id: string;
  designer_id: string;
  priority_level?: 'urgent' | 'high' | 'normal' | 'low';
  expected_delivery_date: string;
  estimated_hours?: number;
  design_library_id?: string;
  assignment_notes?: string;
}

export const designerApi = {
  // Dashboard APIs
  async getTodaysPriorities(): Promise<TodaysPriority[]> {
    componentLogger.info('Fetching today\'s priorities...');
    
    const { data, error } = await supabase
      .from('todays_priorities')
      .select('*')
      .order('priority_level', { ascending: true })
      .order('expected_delivery_date', { ascending: true });

    if (error) {
      componentLogger.error('Failed to fetch today\'s priorities', error);
      throw new Error(`Failed to fetch today's priorities: ${error.message}`);
    }

    componentLogger.info('Today\'s priorities fetched successfully', { count: data?.length });
    return data || [];
  },

  async getDesignerWorkloads(): Promise<DesignerWorkload[]> {
    componentLogger.info('Fetching designer workloads...');
    
    const { data, error } = await supabase
      .from('designer_workload')
      .select('*')
      .order('pending_hours', { ascending: false });

    if (error) {
      componentLogger.error('Failed to fetch designer workloads', error);
      throw new Error(`Failed to fetch designer workloads: ${error.message}`);
    }

    componentLogger.info('Designer workloads fetched successfully', { count: data?.length });
    return data || [];
  },

  async getOverdueAssignments(): Promise<OverdueAssignment[]> {
    componentLogger.info('Fetching overdue assignments...');
    
    const { data, error } = await supabase
      .from('overdue_assignments')
      .select('*')
      .order('days_overdue', { ascending: false });

    if (error) {
      componentLogger.error('Failed to fetch overdue assignments', error);
      throw new Error(`Failed to fetch overdue assignments: ${error.message}`);
    }

    componentLogger.info('Overdue assignments fetched successfully', { count: data?.length });
    return data || [];
  },

  // Assignment Management
  async getAllAssignments(): Promise<Assignment[]> {
    componentLogger.info('Fetching all assignments...');
    
    const { data, error } = await supabase
      .from('todays_priorities')
      .select('*')
      .order('expected_delivery_date', { ascending: true });

    if (error) {
      componentLogger.error('Failed to fetch all assignments', error);
      throw new Error(`Failed to fetch all assignments: ${error.message}`);
    }

    componentLogger.info('All assignments fetched successfully', { count: data?.length });
    return data || [];
  },

  async createAssignment(assignment: CreateAssignmentRequest): Promise<string> {
    componentLogger.info('Creating new assignment...', assignment);
    
    const { data, error } = await supabase
      .from('designer_assignments')
      .insert({
        order_item_id: assignment.order_item_id,
        designer_id: assignment.designer_id,
        priority_level: assignment.priority_level || 'normal',
        expected_delivery_date: assignment.expected_delivery_date,
        estimated_hours: assignment.estimated_hours || 2.0,
        design_library_id: assignment.design_library_id || null,
        assignment_notes: assignment.assignment_notes || null,
        status: 'assigned'
      })
      .select('id')
      .single();

    if (error) {
      componentLogger.error('Failed to create assignment', error);
      throw new Error(`Failed to create assignment: ${error.message}`);
    }

    componentLogger.info('Assignment created successfully', { assignmentId: data?.id });
    return data?.id;
  },

  async updateAssignmentStatus(assignmentId: string, status: string, reason?: string): Promise<void> {
    componentLogger.info('Updating assignment status...', { assignmentId, status, reason });
    
    const { error } = await supabase.rpc('update_assignment_status', {
      p_assignment_id: assignmentId,
      p_new_status: status,
      p_reason: reason || null
    });

    if (error) {
      componentLogger.error('Failed to update assignment status', error);
      throw new Error(`Failed to update assignment status: ${error.message}`);
    }

    componentLogger.info('Assignment status updated successfully');
  },

  async reassignDesigner(assignmentId: string, newDesignerId: string, reason: string): Promise<void> {
    componentLogger.info('Reassigning designer...', { assignmentId, newDesignerId, reason });
    
    // Get current assignment details
    const { data: currentAssignment, error: fetchError } = await supabase
      .from('designer_assignments')
      .select('designer_id')
      .eq('id', assignmentId)
      .single();

    if (fetchError) {
      componentLogger.error('Failed to fetch current assignment', fetchError);
      throw new Error(`Failed to fetch current assignment: ${fetchError.message}`);
    }

    // Update assignment
    const { error: updateError } = await supabase
      .from('designer_assignments')
      .update({ 
        designer_id: newDesignerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId);

    if (updateError) {
      componentLogger.error('Failed to reassign designer', updateError);
      throw new Error(`Failed to reassign designer: ${updateError.message}`);
    }

    // Log history
    const { error: historyError } = await supabase
      .from('assignment_history')
      .insert({
        assignment_id: assignmentId,
        previous_designer_id: currentAssignment.designer_id,
        new_designer_id: newDesignerId,
        previous_status: 'assigned',
        new_status: 'assigned',
        reason_for_change: reason
      });

    if (historyError) {
      componentLogger.error('Failed to log assignment history', historyError);
      // Don't throw error for history logging failure
    }

    componentLogger.info('Designer reassigned successfully');
  },

  async bulkReassign(assignmentIds: string[], newDesignerId: string): Promise<void> {
    componentLogger.info('Bulk reassigning assignments...', { assignmentIds, newDesignerId });
    
    const { error } = await supabase
      .from('designer_assignments')
      .update({ 
        designer_id: newDesignerId,
        updated_at: new Date().toISOString()
      })
      .in('id', assignmentIds);

    if (error) {
      componentLogger.error('Failed to bulk reassign assignments', error);
      throw new Error(`Failed to bulk reassign assignments: ${error.message}`);
    }

    componentLogger.info('Assignments bulk reassigned successfully');
  },

  async autoAssignDesigner(orderItemId: string, priorityLevel: string = 'normal', estimatedHours: number = 2.0): Promise<string> {
    componentLogger.info('Auto assigning designer...', { orderItemId, priorityLevel, estimatedHours });
    
    const { data, error } = await supabase.rpc('auto_assign_designer', {
      p_order_item_id: orderItemId,
      p_priority_level: priorityLevel,
      p_estimated_hours: estimatedHours
    });

    if (error) {
      componentLogger.error('Failed to auto assign designer', error);
      throw new Error(`Failed to auto assign designer: ${error.message}`);
    }

    componentLogger.info('Designer auto assigned successfully', { assignmentId: data });
    return data;
  },

  // Design Library APIs
  async getDesignLibrary(): Promise<DesignLibraryItem[]> {
    componentLogger.info('Fetching design library...');
    
    const { data, error } = await supabase
      .from('design_library')
      .select('*')
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      componentLogger.error('Failed to fetch design library', error);
      throw new Error(`Failed to fetch design library: ${error.message}`);
    }

    componentLogger.info('Design library fetched successfully', { count: data?.length });
    return data || [];
  },

  async createDesign(design: CreateDesignRequest): Promise<string> {
    componentLogger.info('Creating new design...', design);
    
    const { data, error } = await supabase
      .from('design_library')
      .insert({
        design_name: design.design_name,
        design_category: design.design_category,
        design_code: design.design_code,
        design_file_url: design.design_file_url || null,
        design_thumbnail_url: design.design_thumbnail_url || null,
        design_description: design.design_description || null,
        material_compatibility: design.material_compatibility,
        complexity_level: design.complexity_level,
        estimated_hours: design.estimated_hours,
        is_active: design.is_active
      })
      .select('id')
      .single();

    if (error) {
      componentLogger.error('Failed to create design', error);
      throw new Error(`Failed to create design: ${error.message}`);
    }

    componentLogger.info('Design created successfully', { designId: data?.id });
    return data?.id;
  },

  async updateDesign(designId: string, updates: Partial<CreateDesignRequest>): Promise<void> {
    componentLogger.info('Updating design...', { designId, updates });
    
    const { error } = await supabase
      .from('design_library')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', designId);

    if (error) {
      componentLogger.error('Failed to update design', error);
      throw new Error(`Failed to update design: ${error.message}`);
    }

    componentLogger.info('Design updated successfully');
  },

  async deleteDesign(designId: string): Promise<void> {
    componentLogger.info('Deleting design...', { designId });
    
    const { error } = await supabase
      .from('design_library')
      .delete()
      .eq('id', designId);

    if (error) {
      componentLogger.error('Failed to delete design', error);
      throw new Error(`Failed to delete design: ${error.message}`);
    }

    componentLogger.info('Design deleted successfully');
  },

  async checkDesignAvailability(designCode: string, materialType: string): Promise<boolean> {
    componentLogger.info('Checking design availability...', { designCode, materialType });
    
    const { data, error } = await supabase.rpc('check_design_availability', {
      p_design_code: designCode,
      p_material_type: materialType
    });

    if (error) {
      componentLogger.error('Failed to check design availability', error);
      throw new Error(`Failed to check design availability: ${error.message}`);
    }

    componentLogger.info('Design availability checked', { available: data });
    return data || false;
  },

  async searchDesigns(searchTerm: string, category?: string, materialType?: string): Promise<DesignLibraryItem[]> {
    componentLogger.info('Searching designs...', { searchTerm, category, materialType });
    
    let query = supabase
      .from('design_library')
      .select('*')
      .eq('is_active', true);

    if (searchTerm) {
      query = query.or(`design_name.ilike.%${searchTerm}%,design_code.ilike.%${searchTerm}%,design_description.ilike.%${searchTerm}%`);
    }

    if (category) {
      query = query.eq('design_category', category);
    }

    if (materialType) {
      query = query.contains('material_compatibility', [materialType]);
    }

    const { data, error } = await query
      .order('design_name', { ascending: true });

    if (error) {
      componentLogger.error('Failed to search designs', error);
      throw new Error(`Failed to search designs: ${error.message}`);
    }

    componentLogger.info('Designs searched successfully', { count: data?.length });
    return data || [];
  },

  // Assignment History
  async getAssignmentHistory(assignmentId: string): Promise<any[]> {
    componentLogger.info('Fetching assignment history...', { assignmentId });
    
    const { data, error } = await supabase
      .from('assignment_history')
      .select(`
        *,
        previous_designer:auth.users!assignment_history_previous_designer_id_fkey(email, raw_user_meta_data),
        new_designer:auth.users!assignment_history_new_designer_id_fkey(email, raw_user_meta_data),
        changed_by_user:auth.users!assignment_history_changed_by_fkey(email, raw_user_meta_data)
      `)
      .eq('assignment_id', assignmentId)
      .order('changed_at', { ascending: false });

    if (error) {
      componentLogger.error('Failed to fetch assignment history', error);
      throw new Error(`Failed to fetch assignment history: ${error.message}`);
    }

    componentLogger.info('Assignment history fetched successfully', { count: data?.length });
    return data || [];
  },

  // Utility functions
  async getAvailableDesigners(): Promise<any[]> {
    componentLogger.info('Fetching available designers...');
    
    const { data, error } = await supabase
      .from('designer_workload')
      .select('*')
      .lt('pending_hours', 35) // Designers with less than 35 hours of work
      .order('pending_hours', { ascending: true });

    if (error) {
      componentLogger.error('Failed to fetch available designers', error);
      throw new Error(`Failed to fetch available designers: ${error.message}`);
    }

    componentLogger.info('Available designers fetched successfully', { count: data?.length });
    return data || [];
  },

  async getDesignerPerformance(designerId: string): Promise<any> {
    componentLogger.info('Fetching designer performance...', { designerId });
    
    const { data, error } = await supabase
      .from('designer_workload')
      .select('*')
      .eq('designer_id', designerId)
      .single();

    if (error) {
      componentLogger.error('Failed to fetch designer performance', error);
      throw new Error(`Failed to fetch designer performance: ${error.message}`);
    }

    componentLogger.info('Designer performance fetched successfully');
    return data;
  },

  // Time Tracking APIs
  async logTime(assignmentId: string, hoursWorked: number, notes?: string): Promise<void> {
    componentLogger.info('Logging time for assignment...', { assignmentId, hoursWorked, notes });
    
    const { error } = await supabase.rpc('log_assignment_time', {
      p_assignment_id: assignmentId,
      p_hours_worked: hoursWorked,
      p_work_notes: notes || null
    });

    if (error) {
      componentLogger.error('Failed to log time', error);
      throw new Error(`Failed to log time: ${error.message}`);
    }

    componentLogger.info('Time logged successfully');
  },

  async startTimeTracking(assignmentId: string): Promise<void> {
    componentLogger.info('Starting time tracking...', { assignmentId });
    
    const { error } = await supabase.rpc('start_time_tracking', {
      p_assignment_id: assignmentId
    });

    if (error) {
      componentLogger.error('Failed to start time tracking', error);
      throw new Error(`Failed to start time tracking: ${error.message}`);
    }

    componentLogger.info('Time tracking started successfully');
  },

  async pauseTimeTracking(assignmentId: string): Promise<void> {
    componentLogger.info('Pausing time tracking...', { assignmentId });
    
    const { error } = await supabase.rpc('pause_time_tracking', {
      p_assignment_id: assignmentId
    });

    if (error) {
      componentLogger.error('Failed to pause time tracking', error);
      throw new Error(`Failed to pause time tracking: ${error.message}`);
    }

    componentLogger.info('Time tracking paused successfully');
  },

  async stopTimeTracking(assignmentId: string, notes?: string): Promise<number> {
    componentLogger.info('Stopping time tracking...', { assignmentId, notes });
    
    const { data, error } = await supabase.rpc('stop_time_tracking', {
      p_assignment_id: assignmentId,
      p_work_notes: notes || null
    });

    if (error) {
      componentLogger.error('Failed to stop time tracking', error);
      throw new Error(`Failed to stop time tracking: ${error.message}`);
    }

    componentLogger.info('Time tracking stopped successfully', { hoursLogged: data });
    return data || 0;
  },

  async getTimeTrackingHistory(assignmentId: string): Promise<any[]> {
    componentLogger.info('Fetching time tracking history...', { assignmentId });
    
    const { data, error } = await supabase
      .from('assignment_time_logs')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('logged_at', { ascending: false });

    if (error) {
      componentLogger.error('Failed to fetch time tracking history', error);
      throw new Error(`Failed to fetch time tracking history: ${error.message}`);
    }

    componentLogger.info('Time tracking history fetched successfully', { count: data?.length });
    return data || [];
  },
};

export default designerApi;