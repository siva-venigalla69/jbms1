#!/usr/bin/env python3
"""
Database Schema Analyzer for Digital Textile Printing System
Analyzes the current database schema and generates comprehensive documentation
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Any, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection configuration for Supabase
DB_CONFIG = {
    'host': 'db.pvatfzwzfgioypdnqjay.supabase.co',
    'database': 'postgres',
    'user': 'postgres',
    'password': 'your_service_role_key',  # Will be overridden by env
    'port': 5432
}

# Supabase connection details
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://pvatfzwzfgioypdnqjay.supabase.co')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs')

class DatabaseSchemaAnalyzer:
    def __init__(self, connection_string: str = None):
        if connection_string:
            self.conn = psycopg2.connect(connection_string)
        else:
            # Try to connect using various methods
            try:
                # Try environment variables first
                db_url = os.getenv('DATABASE_URL')
                if db_url:
                    self.conn = psycopg2.connect(db_url)
                else:
                    # Fallback to local config
                    self.conn = psycopg2.connect(**DB_CONFIG)
            except Exception as e:
                print(f"Database connection failed: {e}")
                print("Please update the DB_CONFIG or set DATABASE_URL environment variable")
                sys.exit(1)
        
        self.cur = self.conn.cursor(cursor_factory=RealDictCursor)
        
    def get_tables_overview(self) -> List[Dict]:
        """Get basic information about all tables"""
        query = """
        SELECT 
            schemaname,
            tablename,
            tableowner,
            hasindexes,
            hasrules,
            hastriggers,
            rowsecurity
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schemaname, tablename;
        """
        self.cur.execute(query)
        return [dict(row) for row in self.cur.fetchall()]
    
    def get_detailed_columns(self) -> List[Dict]:
        """Get detailed column information for all tables"""
        query = """
        SELECT 
            t.table_schema,
            t.table_name,
            t.table_type,
            c.column_name,
            c.ordinal_position,
            c.column_default,
            c.is_nullable,
            c.data_type,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,
            c.datetime_precision,
            c.udt_name,
            CASE 
                WHEN pk.column_name IS NOT NULL THEN 'YES'
                ELSE 'NO'
            END AS is_primary_key,
            CASE 
                WHEN fk.column_name IS NOT NULL THEN 'YES'
                ELSE 'NO'
            END AS is_foreign_key,
            fk.foreign_table_schema,
            fk.foreign_table_name,
            fk.foreign_column_name
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        LEFT JOIN (
            SELECT ku.table_schema, ku.table_name, ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.table_schema = pk.table_schema AND c.table_name = pk.table_name AND c.column_name = pk.column_name
        LEFT JOIN (
            SELECT 
                ku.table_schema,
                ku.table_name,
                ku.column_name,
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
        ) fk ON c.table_schema = fk.table_schema AND c.table_name = fk.table_name AND c.column_name = fk.column_name
        WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY t.table_schema, t.table_name, c.ordinal_position;
        """
        self.cur.execute(query)
        return [dict(row) for row in self.cur.fetchall()]
    
    def get_constraints(self) -> List[Dict]:
        """Get all constraints (FK, PK, UNIQUE, CHECK)"""
        query = """
        SELECT 
            tc.table_schema,
            tc.table_name,
            tc.constraint_name,
            tc.constraint_type,
            ku.column_name,
            CASE 
                WHEN tc.constraint_type = 'FOREIGN KEY' THEN ccu.table_name
                ELSE NULL
            END AS references_table,
            CASE 
                WHEN tc.constraint_type = 'FOREIGN KEY' THEN ccu.column_name
                ELSE NULL
            END AS references_column,
            rc.update_rule,
            rc.delete_rule,
            cc.check_clause
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        LEFT JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY tc.table_schema, tc.table_name, tc.constraint_type, tc.constraint_name;
        """
        self.cur.execute(query)
        return [dict(row) for row in self.cur.fetchall()]
    
    def get_views(self) -> List[Dict]:
        """Get all views"""
        query = """
        SELECT 
            table_schema,
            table_name as view_name,
            view_definition,
            check_option,
            is_updatable,
            is_insertable_into,
            is_trigger_updatable,
            is_trigger_deletable,
            is_trigger_insertable_into
        FROM information_schema.views
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name;
        """
        self.cur.execute(query)
        return [dict(row) for row in self.cur.fetchall()]
    
    def get_indexes(self) -> List[Dict]:
        """Get all indexes"""
        query = """
        SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY schemaname, tablename, indexname;
        """
        self.cur.execute(query)
        return [dict(row) for row in self.cur.fetchall()]
    
    def get_functions(self) -> List[Dict]:
        """Get all functions and procedures"""
        query = """
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_catalog.pg_get_function_result(p.oid) as result_type,
            pg_catalog.pg_get_function_arguments(p.oid) as arguments,
            CASE p.prokind
                WHEN 'f' THEN 'function'
                WHEN 'p' THEN 'procedure'
                WHEN 'a' THEN 'aggregate'
                WHEN 'w' THEN 'window'
            END as function_type,
            p.prosrc as source_code
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY n.nspname, p.proname;
        """
        self.cur.execute(query)
        return [dict(row) for row in self.cur.fetchall()]
    
    def get_table_sizes(self) -> List[Dict]:
        """Get table sizes and row counts"""
        query = """
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        """
        self.cur.execute(query)
        sizes = [dict(row) for row in self.cur.fetchall()]
        
        # Get row counts for each table
        for table in sizes:
            try:
                count_query = f"SELECT COUNT(*) as row_count FROM {table['schemaname']}.{table['tablename']}"
                self.cur.execute(count_query)
                result = self.cur.fetchone()
                table['row_count'] = result['row_count'] if result else 0
            except Exception as e:
                table['row_count'] = f"Error: {str(e)}"
        
        return sizes
    
    def analyze_schema(self) -> Dict[str, Any]:
        """Run complete schema analysis"""
        print("🔍 Analyzing database schema...")
        
        # Collect all data
        tables = self.get_tables_overview()
        columns = self.get_detailed_columns()
        constraints = self.get_constraints()
        views = self.get_views()
        indexes = self.get_indexes()
        functions = self.get_functions()
        table_sizes = self.get_table_sizes()
        
        # Organize data by table
        tables_by_name = {}
        for col in columns:
            table_key = f"{col['table_schema']}.{col['table_name']}"
            if table_key not in tables_by_name:
                tables_by_name[table_key] = {
                    'schema': col['table_schema'],
                    'name': col['table_name'],
                    'type': col['table_type'],
                    'columns': [],
                    'primary_keys': [],
                    'foreign_keys': [],
                    'constraints': []
                }
            
            if col['column_name']:  # Skip null columns
                tables_by_name[table_key]['columns'].append(col)
                if col['is_primary_key'] == 'YES':
                    tables_by_name[table_key]['primary_keys'].append(col['column_name'])
                if col['is_foreign_key'] == 'YES':
                    tables_by_name[table_key]['foreign_keys'].append({
                        'column': col['column_name'],
                        'references': f"{col['foreign_table_name']}.{col['foreign_column_name']}"
                    })
        
        # Add constraints to tables
        for constraint in constraints:
            table_key = f"{constraint['table_schema']}.{constraint['table_name']}"
            if table_key in tables_by_name:
                tables_by_name[table_key]['constraints'].append(constraint)
        
        # Calculate statistics
        total_tables = len([t for t in tables if t['schemaname'] == 'public'])
        total_columns = len([c for c in columns if c['table_schema'] == 'public' and c['column_name']])
        total_relationships = len([c for c in constraints if c['constraint_type'] == 'FOREIGN KEY'])
        total_views = len(views)
        total_functions = len(functions)
        
        analysis = {
            'metadata': {
                'analyzed_at': datetime.now().isoformat(),
                'total_tables': total_tables,
                'total_columns': total_columns,
                'total_relationships': total_relationships,
                'total_views': total_views,
                'total_functions': total_functions,
                'complexity_score': (total_tables * 10) + total_columns + (total_relationships * 5) + (total_views * 8)
            },
            'tables': tables_by_name,
            'views': views,
            'functions': functions,
            'indexes': indexes,
            'constraints': constraints,
            'table_sizes': table_sizes
        }
        
        print(f"✅ Analysis complete:")
        print(f"   📊 {total_tables} tables, {total_columns} columns")
        print(f"   🔗 {total_relationships} relationships")
        print(f"   👁️  {total_views} views, ⚙️  {total_functions} functions")
        
        return analysis
    
    def close(self):
        """Close database connection"""
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()

class SchemaDocumentationGenerator:
    def __init__(self, analysis_data: Dict[str, Any]):
        self.data = analysis_data
        
    def categorize_tables(self) -> Dict[str, List[str]]:
        """Categorize tables by business function"""
        categories = {
            'core_business': [],
            'authentication': [],
            'material_management': [],
            'production': [],
            'financial': [],
            'reporting_views': [],
            'designer_management': [],
            'system': []
        }
        
        for table_key, table_info in self.data['tables'].items():
            table_name = table_info['name']
            
            # Core business entities
            if table_name in ['customers', 'orders', 'order_items']:
                categories['core_business'].append(table_name)
            
            # Authentication & Users
            elif 'user' in table_name or table_name in ['auth', 'sessions']:
                categories['authentication'].append(table_name)
            
            # Material management
            elif any(keyword in table_name for keyword in ['material', 'stock', 'inventory', 'challan']):
                categories['material_management'].append(table_name)
            
            # Production
            elif any(keyword in table_name for keyword in ['production', 'stage', 'printing']):
                categories['production'].append(table_name)
            
            # Financial
            elif any(keyword in table_name for keyword in ['invoice', 'payment', 'gst', 'expense']):
                categories['financial'].append(table_name)
            
            # Designer management (new)
            elif any(keyword in table_name for keyword in ['designer', 'design_library', 'assignment']):
                categories['designer_management'].append(table_name)
            
            # System tables
            else:
                categories['system'].append(table_name)
        
        # Add views to reporting category
        for view in self.data['views']:
            categories['reporting_views'].append(view['view_name'])
        
        return categories
    
    def analyze_table_functionality(self, table_name: str, table_info: Dict) -> Dict[str, str]:
        """Analyze what a table is used for"""
        analysis = {
            'purpose': 'Unknown',
            'business_significance': 'Low',
            'complexity': 'Simple',
            'recommendations': []
        }
        
        columns = table_info['columns']
        column_names = [col['column_name'] for col in columns]
        
        # Determine purpose based on table name and columns
        if table_name == 'customers':
            analysis.update({
                'purpose': 'Customer relationship management - stores all customer information',
                'business_significance': 'Critical',
                'complexity': 'Medium'
            })
        elif table_name == 'orders':
            analysis.update({
                'purpose': 'Order management - tracks customer orders and their lifecycle',
                'business_significance': 'Critical', 
                'complexity': 'Medium'
            })
        elif table_name == 'order_items':
            analysis.update({
                'purpose': 'Order line items - individual products/materials within orders',
                'business_significance': 'Critical',
                'complexity': 'Medium'
            })
        elif 'material' in table_name or 'stock' in table_name:
            analysis.update({
                'purpose': 'Material and inventory tracking',
                'business_significance': 'High',
                'complexity': 'Medium'
            })
        elif 'designer' in table_name:
            analysis.update({
                'purpose': 'Designer assignment and workload management',
                'business_significance': 'High',
                'complexity': 'Complex'
            })
        elif 'invoice' in table_name:
            analysis.update({
                'purpose': 'Financial transaction and billing management',
                'business_significance': 'High',
                'complexity': 'Medium'
            })
        elif 'payment' in table_name:
            analysis.update({
                'purpose': 'Payment tracking and financial reconciliation',
                'business_significance': 'High',
                'complexity': 'Medium'
            })
        
        # Check for over-engineering indicators
        json_columns = len([col for col in columns if col['data_type'] in ['json', 'jsonb']])
        if json_columns > len(columns) * 0.3:
            analysis['recommendations'].append(f"Consider normalizing {json_columns} JSON columns")
        
        # Check for good practices
        has_timestamps = any('_at' in col for col in column_names)
        has_uuid_pk = any(col['data_type'] == 'uuid' and col['is_primary_key'] == 'YES' for col in columns)
        
        if has_timestamps and has_uuid_pk:
            analysis['recommendations'].append("Good: Uses UUID PKs and timestamp tracking")
        
        return analysis
    
    def check_over_engineering(self) -> List[str]:
        """Check for over-engineered aspects"""
        issues = []
        
        total_tables = len(self.data['tables'])
        total_views = len(self.data['views'])
        total_functions = len(self.data['functions'])
        
        # Too many views compared to tables
        if total_views > total_tables * 0.5:
            issues.append(f"High view-to-table ratio ({total_views} views vs {total_tables} tables)")
        
        # Too many functions
        if total_functions > total_tables * 0.3:
            issues.append(f"Many functions ({total_functions}) - consider if all are necessary")
        
        # Check for JSON overuse
        json_heavy_tables = []
        for table_key, table_info in self.data['tables'].items():
            json_cols = len([col for col in table_info['columns'] if col['data_type'] in ['json', 'jsonb']])
            total_cols = len(table_info['columns'])
            if json_cols > total_cols * 0.3 and total_cols > 3:
                json_heavy_tables.append(table_info['name'])
        
        if json_heavy_tables:
            issues.append(f"JSON-heavy tables: {', '.join(json_heavy_tables)}")
        
        # Complex constraint patterns
        complex_constraints = [c for c in self.data['constraints'] if c['check_clause']]
        if len(complex_constraints) > total_tables * 0.5:
            issues.append(f"Many check constraints ({len(complex_constraints)}) - verify necessity")
        
        return issues
    
    def identify_good_practices(self) -> List[str]:
        """Identify good database practices"""
        practices = []
        
        total_tables = len(self.data['tables'])
        
        # Count UUID usage
        uuid_tables = 0
        timestamp_tables = 0
        indexed_tables = len(self.data['indexes'])
        
        for table_info in self.data['tables'].values():
            has_uuid_pk = any(col['data_type'] == 'uuid' and col['is_primary_key'] == 'YES' 
                             for col in table_info['columns'])
            has_timestamps = any('_at' in col['column_name'] for col in table_info['columns'])
            
            if has_uuid_pk:
                uuid_tables += 1
            if has_timestamps:
                timestamp_tables += 1
        
        if uuid_tables / total_tables > 0.7:
            practices.append(f"Excellent UUID usage ({uuid_tables}/{total_tables} tables)")
        
        if timestamp_tables / total_tables > 0.8:
            practices.append(f"Good audit trail with timestamps ({timestamp_tables}/{total_tables} tables)")
        
        if indexed_tables > total_tables * 1.5:
            practices.append(f"Well-indexed database ({indexed_tables} indexes for {total_tables} tables)")
        
        # Check for foreign key relationships
        fk_count = len([c for c in self.data['constraints'] if c['constraint_type'] == 'FOREIGN KEY'])
        if fk_count > total_tables * 0.8:
            practices.append(f"Good relational integrity ({fk_count} foreign keys)")
        
        return practices
    
    def suggest_restructuring(self) -> List[str]:
        """Suggest database restructuring needs"""
        suggestions = []
        
        # Find orphan tables (no relationships)
        tables_with_fks = set()
        for constraint in self.data['constraints']:
            if constraint['constraint_type'] == 'FOREIGN KEY':
                tables_with_fks.add(constraint['table_name'])
                if constraint['references_table']:
                    tables_with_fks.add(constraint['references_table'])
        
        all_tables = set(table_info['name'] for table_info in self.data['tables'].values())
        orphan_tables = all_tables - tables_with_fks
        
        # Exclude system tables from orphan check
        system_tables = {'users', 'sessions', 'migrations', 'settings'}
        business_orphans = orphan_tables - system_tables
        
        if business_orphans:
            suggestions.append(f"Consider adding relationships for: {', '.join(business_orphans)}")
        
        # Check for missing indexes on foreign keys
        fk_columns = [(c['table_name'], c['column_name']) for c in self.data['constraints'] 
                      if c['constraint_type'] == 'FOREIGN KEY']
        
        indexed_columns = set()
        for index in self.data['indexes']:
            # Extract column names from index definition (simplified)
            if 'btree' in index['indexdef']:
                # This is a simplification - proper parsing would be more complex
                indexed_columns.add((index['tablename'], 'unknown'))
        
        # Performance suggestions based on table sizes
        large_tables = [t for t in self.data['table_sizes'] 
                       if isinstance(t['row_count'], int) and t['row_count'] > 10000]
        
        if large_tables:
            table_names = [t['tablename'] for t in large_tables[:3]]
            suggestions.append(f"Consider partitioning for large tables: {', '.join(table_names)}")
        
        return suggestions
    
    def generate_markdown_documentation(self) -> str:
        """Generate complete markdown documentation"""
        categories = self.categorize_tables()
        over_engineered = self.check_over_engineering()
        good_practices = self.identify_good_practices()
        restructure_suggestions = self.suggest_restructuring()
        
        md = f"""# Database Schema Analysis Report
*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*

## 📊 Overview

| Metric | Count |
|--------|-------|
| **Tables** | {self.data['metadata']['total_tables']} |
| **Columns** | {self.data['metadata']['total_columns']} |
| **Relationships** | {self.data['metadata']['total_relationships']} |
| **Views** | {self.data['metadata']['total_views']} |
| **Functions** | {self.data['metadata']['total_functions']} |
| **Complexity Score** | {self.data['metadata']['complexity_score']} |

## 🏗️ Table Categories

"""
        
        # Document each category
        for category, table_list in categories.items():
            if not table_list:
                continue
                
            category_name = category.replace('_', ' ').title()
            md += f"### {category_name} ({len(table_list)} tables)\n\n"
            
            for table_name in table_list:
                # Find table info
                table_info = None
                for table_key, info in self.data['tables'].items():
                    if info['name'] == table_name:
                        table_info = info
                        break
                
                if table_info:
                    analysis = self.analyze_table_functionality(table_name, table_info)
                    md += f"#### `{table_name}`\n"
                    md += f"- **Purpose**: {analysis['purpose']}\n"
                    md += f"- **Business Significance**: {analysis['business_significance']}\n"
                    md += f"- **Columns**: {len(table_info['columns'])}\n"
                    md += f"- **Primary Keys**: {', '.join(table_info['primary_keys']) if table_info['primary_keys'] else 'None'}\n"
                    md += f"- **Foreign Keys**: {len(table_info['foreign_keys'])}\n\n"
                    
                    # Column details
                    if table_info['columns']:
                        md += "**Columns:**\n\n"
                        md += "| Column | Type | Nullable | Default | Key |\n"
                        md += "|--------|------|----------|---------|-----|\n"
                        for col in table_info['columns']:
                            key_info = ""
                            if col['is_primary_key'] == 'YES':
                                key_info += "PK "
                            if col['is_foreign_key'] == 'YES':
                                key_info += "FK"
                            
                            md += f"| `{col['column_name']}` | {col['data_type']} | {col['is_nullable']} | {col['column_default'] or '-'} | {key_info} |\n"
                        md += "\n"
                    
                    if analysis['recommendations']:
                        md += "**Recommendations:**\n"
                        for rec in analysis['recommendations']:
                            md += f"- {rec}\n"
                        md += "\n"
                else:
                    md += f"- `{table_name}` (view)\n"
            
            md += "\n"
        
        # Relationship Analysis
        md += """## 🔗 Table Relationships

"""
        relationships = [c for c in self.data['constraints'] if c['constraint_type'] == 'FOREIGN KEY']
        
        if relationships:
            md += "| From Table | Column | References | Update Rule | Delete Rule |\n"
            md += "|------------|--------|------------|-------------|-------------|\n"
            
            for rel in relationships:
                md += f"| `{rel['table_name']}` | `{rel['column_name']}` | `{rel['references_table']}.{rel['references_column']}` | {rel['update_rule'] or 'N/A'} | {rel['delete_rule'] or 'N/A'} |\n"
            
            md += "\n"
        
        # Analysis Results
        md += f"""## 🎯 Schema Analysis Results

### ✅ Good Practices Identified
"""
        
        if good_practices:
            for practice in good_practices:
                md += f"- ✅ {practice}\n"
        else:
            md += "- No specific good practices identified\n"
        
        md += f"""
### ⚠️ Over-Engineered Areas
"""
        
        if over_engineered:
            for issue in over_engineered:
                md += f"- ⚠️ {issue}\n"
        else:
            md += "- ✅ No over-engineering detected\n"
        
        md += f"""
### 🔧 Restructuring Recommendations
"""
        
        if restructure_suggestions:
            for suggestion in restructure_suggestions:
                md += f"- 🔧 {suggestion}\n"
        else:
            md += "- ✅ Schema structure looks good\n"
        
        # Table Sizes
        if self.data['table_sizes']:
            md += f"""
## 💾 Table Sizes & Performance

| Table | Rows | Size | Notes |
|-------|------|------|-------|
"""
            
            for table in self.data['table_sizes'][:10]:  # Top 10 largest tables
                row_count = table['row_count']
                if isinstance(row_count, int):
                    if row_count > 100000:
                        note = "🔴 Very Large"
                    elif row_count > 10000:
                        note = "🟡 Large"
                    elif row_count > 1000:
                        note = "🟢 Medium"
                    else:
                        note = "🔵 Small"
                else:
                    note = "❓ Unknown"
                
                md += f"| `{table['tablename']}` | {row_count} | {table['size']} | {note} |\n"
        
        # Views Documentation
        if self.data['views']:
            md += f"""
## 👁️ Views ({len(self.data['views'])} views)

"""
            for view in self.data['views']:
                md += f"### `{view['view_name']}`\n"
                md += f"- **Updatable**: {view['is_updatable']}\n"
                md += f"- **Schema**: {view['table_schema']}\n\n"
                
                if view['view_definition']:
                    # Truncate very long view definitions
                    definition = view['view_definition'][:500]
                    if len(view['view_definition']) > 500:
                        definition += "... (truncated)"
                    
                    md += "```sql\n"
                    md += definition
                    md += "\n```\n\n"
        
        # Functions Documentation
        if self.data['functions']:
            md += f"""
## ⚙️ Functions & Procedures ({len(self.data['functions'])} functions)

"""
            for func in self.data['functions']:
                md += f"### `{func['function_name']}`\n"
                md += f"- **Type**: {func['function_type']}\n"
                md += f"- **Arguments**: {func['arguments'] or 'None'}\n"
                md += f"- **Returns**: {func['result_type']}\n\n"
        
        # Summary and Recommendations
        complexity_score = self.data['metadata']['complexity_score']
        if complexity_score > 800:
            complexity_level = "Very High"
            complexity_advice = "Consider microservices architecture"
        elif complexity_score > 500:
            complexity_level = "High"
            complexity_advice = "Monitor performance closely"
        elif complexity_score > 200:
            complexity_level = "Medium"
            complexity_advice = "Well-structured schema"
        else:
            complexity_level = "Low"
            complexity_advice = "Simple and maintainable"
        
        md += f"""
## 📋 Executive Summary

### Schema Complexity: {complexity_level}
**Score**: {complexity_score} | **Advice**: {complexity_advice}

### Key Findings:
- **Database Size**: {self.data['metadata']['total_tables']} tables with {self.data['metadata']['total_columns']} columns
- **Relationship Density**: {self.data['metadata']['total_relationships']} foreign key relationships
- **Architecture**: {"View-heavy" if len(self.data['views']) > self.data['metadata']['total_tables'] * 0.3 else "Table-centric"} design
- **Maturity Level**: {"High" if len(good_practices) > 2 else "Medium" if len(good_practices) > 0 else "Basic"}

### Business Impact Assessment:
"""
        
        # Assess business readiness based on table categories
        core_tables = len(categories.get('core_business', []))
        auth_tables = len(categories.get('authentication', []))
        material_tables = len(categories.get('material_management', []))
        financial_tables = len(categories.get('financial', []))
        
        readiness_score = 0
        if core_tables >= 3: readiness_score += 25  # customers, orders, order_items
        if auth_tables >= 1: readiness_score += 15  # user management
        if material_tables >= 2: readiness_score += 20  # material tracking
        if financial_tables >= 2: readiness_score += 25  # invoicing, payments
        if len(restructure_suggestions) == 0: readiness_score += 15  # clean schema
        
        md += f"- **Business Readiness**: {readiness_score}% ready for production\n"
        md += f"- **Scalability**: {'Good' if complexity_score < 600 else 'Needs attention'}\n"
        md += f"- **Maintenance Complexity**: {complexity_level.lower()}\n"
        
        md += """
### Next Steps:
1. **Immediate**: Address any critical over-engineering issues
2. **Short-term**: Implement missing indexes and optimize large tables  
3. **Medium-term**: Consider suggested restructuring
4. **Long-term**: Monitor performance as data grows

---
*This analysis was generated automatically. Review findings with your development team.*
"""
        
        return md

def main():
    """Main execution function"""
    print("🚀 Starting Database Schema Analysis...")
    
    # Initialize analyzer
    try:
        analyzer = DatabaseSchemaAnalyzer()
        
        # Run analysis
        analysis_data = analyzer.analyze_schema()
        
        # Generate documentation
        doc_generator = SchemaDocumentationGenerator(analysis_data)
        markdown_doc = doc_generator.generate_markdown_documentation()
        
        # Save results
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Save JSON data
        json_filename = f'database_schema_analysis_{timestamp}.json'
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(analysis_data, f, indent=2, default=str)
        
        # Save markdown documentation
        md_filename = f'DATABASE_SCHEMA_ANALYSIS_{timestamp}.md'
        with open(md_filename, 'w', encoding='utf-8') as f:
            f.write(markdown_doc)
        
        print(f"✅ Analysis Complete!")
        print(f"📄 Documentation saved to: {md_filename}")
        print(f"📊 Raw data saved to: {json_filename}")
        
        analyzer.close()
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()