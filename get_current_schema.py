#!/usr/bin/env python3
"""
Get Current Database Schema from Supabase
Uses Supabase REST API to fetch current schema information
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, List, Any

# Supabase configuration
SUPABASE_URL = "https://pvatfzwzfgioypdnqjay.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs"

class SupabaseSchemaAnalyzer:
    def __init__(self):
        self.base_url = SUPABASE_URL
        self.headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json"
        }
        self.rest_url = f"{self.base_url}/rest/v1"
        
    def get_table_list(self) -> List[str]:
        """Get list of all tables accessible via REST API"""
        print("🔍 Fetching table list from Supabase...")
        
        # Try to introspect available tables by making requests
        common_tables = [
            'customers', 'orders', 'order_items', 'material_in', 'material_out',
            'delivery_challans', 'challan_items', 'gst_invoices', 'invoice_challans',
            'payments', 'inventory', 'expenses', 'returns', 'user_profiles',
            'material_stock', 'user_roles', 'order_statuses', 'material_types',
            'production_stages', 'payment_methods', 'return_reasons',
            'designer_assignments', 'design_library', 'assignment_history'
        ]
        
        available_tables = []
        
        for table in common_tables:
            try:
                response = requests.get(
                    f"{self.rest_url}/{table}?limit=1",
                    headers=self.headers,
                    timeout=10
                )
                if response.status_code == 200:
                    available_tables.append(table)
                    print(f"  ✅ Found table: {table}")
                elif response.status_code == 401:
                    print(f"  🔒 Access denied: {table}")
                else:
                    print(f"  ❌ Not found: {table} (status: {response.status_code})")
            except Exception as e:
                print(f"  ⚠️  Error checking {table}: {str(e)[:50]}")
        
        return available_tables
    
    def get_table_structure(self, table_name: str) -> Dict[str, Any]:
        """Get table structure by analyzing a sample record"""
        print(f"📊 Analyzing structure of table: {table_name}")
        
        try:
            # Get first few records to understand structure
            response = requests.get(
                f"{self.rest_url}/{table_name}?limit=5",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code != 200:
                return {
                    "table_name": table_name,
                    "error": f"HTTP {response.status_code}",
                    "columns": [],
                    "sample_count": 0
                }
            
            data = response.json()
            
            # Analyze columns from sample data
            columns = []
            if data and len(data) > 0:
                sample_record = data[0]
                for col_name, col_value in sample_record.items():
                    col_type = "unknown"
                    if isinstance(col_value, str):
                        if col_name.endswith('_at') or col_name in ['created_at', 'updated_at']:
                            col_type = "timestamp"
                        elif col_name.endswith('_id') or col_name == 'id':
                            col_type = "uuid" if len(str(col_value)) > 10 else "integer"
                        else:
                            col_type = "text"
                    elif isinstance(col_value, int):
                        col_type = "integer"
                    elif isinstance(col_value, float):
                        col_type = "numeric"
                    elif isinstance(col_value, bool):
                        col_type = "boolean"
                    elif isinstance(col_value, dict):
                        col_type = "jsonb"
                    elif col_value is None:
                        col_type = "nullable"
                    
                    columns.append({
                        "name": col_name,
                        "type": col_type,
                        "sample_value": str(col_value)[:50] if col_value is not None else "null"
                    })
            
            # Get row count
            count_response = requests.get(
                f"{self.rest_url}/{table_name}?select=count",
                headers={**self.headers, "Prefer": "count=exact"},
                timeout=10
            )
            
            row_count = 0
            if count_response.status_code == 200:
                # Try to get count from response headers
                content_range = count_response.headers.get('content-range', '')
                if '/' in content_range:
                    row_count = int(content_range.split('/')[-1])
            
            return {
                "table_name": table_name,
                "columns": columns,
                "sample_count": len(data),
                "estimated_rows": row_count,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "table_name": table_name,
                "error": str(e),
                "columns": [],
                "sample_count": 0
            }
    
    def analyze_relationships(self, tables_info: List[Dict]) -> List[Dict]:
        """Analyze foreign key relationships based on column naming patterns"""
        print("🔗 Analyzing table relationships...")
        
        relationships = []
        
        for table_info in tables_info:
            if 'error' in table_info:
                continue
                
            table_name = table_info['table_name']
            
            for column in table_info['columns']:
                col_name = column['name']
                
                # Foreign key pattern: ends with _id and matches another table name
                if col_name.endswith('_id') and col_name != 'id':
                    # Extract potential table name
                    potential_table = col_name[:-3]  # Remove '_id'
                    
                    # Check for plural forms
                    potential_tables = [
                        potential_table,
                        potential_table + 's',  # customer -> customers
                        potential_table[:-1] if potential_table.endswith('s') else potential_table  # customers -> customer
                    ]
                    
                    for potential_ref_table in potential_tables:
                        # Check if referenced table exists
                        ref_table_exists = any(t['table_name'] == potential_ref_table for t in tables_info)
                        
                        if ref_table_exists:
                            relationships.append({
                                "from_table": table_name,
                                "from_column": col_name,
                                "to_table": potential_ref_table,
                                "to_column": "id",
                                "relationship_type": "foreign_key",
                                "confidence": "inferred"
                            })
                            break
        
        return relationships
    
    def generate_current_schema_sql(self, analysis_data: Dict) -> str:
        """Generate SQL representation of current schema"""
        print("📝 Generating current schema SQL...")
        
        sql_parts = []
        sql_parts.append(f"-- CURRENT DATABASE SCHEMA SNAPSHOT")
        sql_parts.append(f"-- Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        sql_parts.append(f"-- Source: Live Supabase Database")
        sql_parts.append("")
        
        # Generate CREATE TABLE statements (approximated)
        for table_info in analysis_data['tables']:
            if 'error' in table_info:
                sql_parts.append(f"-- ERROR: Could not analyze table {table_info['table_name']}: {table_info['error']}")
                continue
            
            table_name = table_info['table_name']
            columns = table_info['columns']
            
            sql_parts.append(f"-- Table: {table_name}")
            sql_parts.append(f"-- Estimated rows: {table_info.get('estimated_rows', 'unknown')}")
            sql_parts.append(f"CREATE TABLE {table_name} (")
            
            col_definitions = []
            for col in columns:
                col_name = col['name']
                col_type = col['type']
                
                # Map inferred types to PostgreSQL types
                if col_type == "uuid":
                    pg_type = "UUID"
                elif col_type == "timestamp":
                    pg_type = "TIMESTAMPTZ"
                elif col_type == "integer":
                    pg_type = "INTEGER"
                elif col_type == "numeric":
                    pg_type = "NUMERIC"
                elif col_type == "boolean":
                    pg_type = "BOOLEAN"
                elif col_type == "jsonb":
                    pg_type = "JSONB"
                else:
                    pg_type = "TEXT"
                
                # Add constraints for common patterns
                constraints = ""
                if col_name == "id":
                    constraints = " PRIMARY KEY DEFAULT gen_random_uuid()"
                elif col_name.endswith("_at"):
                    constraints = " DEFAULT NOW()"
                
                col_definitions.append(f"    {col_name} {pg_type}{constraints}")
            
            sql_parts.append(",\n".join(col_definitions))
            sql_parts.append(");")
            sql_parts.append("")
        
        # Add relationships as comments
        if analysis_data['relationships']:
            sql_parts.append("-- INFERRED FOREIGN KEY RELATIONSHIPS")
            for rel in analysis_data['relationships']:
                sql_parts.append(f"-- ALTER TABLE {rel['from_table']} ADD FOREIGN KEY ({rel['from_column']}) REFERENCES {rel['to_table']}({rel['to_column']});")
            sql_parts.append("")
        
        return "\n".join(sql_parts)
    
    def run_analysis(self) -> Dict[str, Any]:
        """Run complete schema analysis"""
        print("🚀 Starting Supabase Schema Analysis...")
        
        # Get available tables
        tables = self.get_table_list()
        
        if not tables:
            print("❌ No accessible tables found!")
            return {"error": "No accessible tables"}
        
        print(f"📊 Found {len(tables)} accessible tables")
        
        # Analyze each table
        tables_info = []
        for table in tables:
            table_info = self.get_table_structure(table)
            tables_info.append(table_info)
        
        # Analyze relationships
        relationships = self.analyze_relationships(tables_info)
        
        # Calculate statistics
        total_columns = sum(len(t.get('columns', [])) for t in tables_info if 'error' not in t)
        total_estimated_rows = sum(t.get('estimated_rows', 0) for t in tables_info if 'error' not in t and isinstance(t.get('estimated_rows'), int))
        
        analysis_data = {
            "analysis_metadata": {
                "timestamp": datetime.now().isoformat(),
                "method": "supabase_rest_api",
                "total_tables": len(tables),
                "total_columns": total_columns,
                "total_relationships": len(relationships),
                "total_estimated_rows": total_estimated_rows
            },
            "tables": tables_info,
            "relationships": relationships
        }
        
        print(f"✅ Analysis complete!")
        print(f"   📊 {len(tables)} tables, {total_columns} columns")
        print(f"   🔗 {len(relationships)} inferred relationships")
        print(f"   📈 ~{total_estimated_rows} total rows estimated")
        
        return analysis_data

def main():
    """Main execution function"""
    try:
        analyzer = SupabaseSchemaAnalyzer()
        analysis_data = analyzer.run_analysis()
        
        if "error" in analysis_data:
            print(f"❌ Analysis failed: {analysis_data['error']}")
            return
        
        # Save analysis results
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Save JSON analysis
        json_filename = f'current_schema_analysis_{timestamp}.json'
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(analysis_data, f, indent=2, default=str)
        
        # Generate and save current schema SQL
        current_sql = analyzer.generate_current_schema_sql(analysis_data)
        sql_filename = f'CURRENT_SCHEMA_{timestamp}.sql'
        with open(sql_filename, 'w', encoding='utf-8') as f:
            f.write(current_sql)
        
        print(f"💾 Analysis saved to: {json_filename}")
        print(f"📄 Current schema SQL: {sql_filename}")
        
        return analysis_data
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    main()