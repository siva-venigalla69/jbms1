#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://pvatfzwzfgioypdnqjay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs'
)

const { data, error } = await supabase
  .from('gst_invoices')
  .select('*')
  .limit(1)

if (error) {
  console.log('Error:', error.message)
} else {
  console.log('gst_invoices columns:', data && data[0] ? Object.keys(data[0]) : 'No data')
}
