#!/usr/bin/env python3
"""
Generate Database Schema Diagram
Creates a visual representation of the database schema
"""

import json
from datetime import datetime

def generate_mermaid_diagram():
    """Generate Mermaid ER diagram for the database schema"""
    
    mermaid_content = """
# Database Schema Diagram - Digital Textile Printing System

```mermaid
erDiagram
    %% Core Business Tables
    customers ||--o{ orders : "places"
    orders ||--o{ order_items : "contains"
    order_items ||--o| designer_assignments : "assigned_to"
    designer_assignments }o--|| design_library : "uses_template"
    
    %% User Management
    auth_users ||--o{ user_profiles : "has_profile"
    auth_users ||--o{ customers : "created_by"
    auth_users ||--o{ orders : "created_by"
    auth_users ||--o{ designer_assignments : "designer"
    auth_users ||--o{ design_library : "created_by"
    
    %% Material Flow
    customers ||--o{ material_in : "provides"
    orders ||--o{ material_in : "for_order"
    order_items ||--o{ material_out : "consumes"
    material_in ||--o{ material_stock : "updates"
    material_out ||--o{ material_stock : "reduces"
    
    %% Delivery Management
    customers ||--o{ delivery_challans : "ships_to"
    delivery_challans ||--o{ challan_items : "contains"
    
    %% Financial Management
    gst_invoices ||--o{ invoice_challans : "links"
    delivery_challans ||--o{ invoice_challans : "invoiced_via"
    gst_invoices ||--o{ payments : "paid_via"
    
    %% Operations
    customers ||--o{ returns : "returns_items"
    
    %% Reference Tables
    user_roles ||--o{ user_profiles : "defines_role"
    order_statuses ||--o{ orders : "has_status"
    material_types ||--o{ order_items : "material_type"
    material_types ||--o{ material_in : "material_type"
    material_types ||--o{ material_out : "material_type"
    material_types ||--o{ material_stock : "material_type"
    production_stages ||--o{ order_items : "current_stage"
    payment_methods ||--o{ payments : "method"
    return_reasons ||--o{ returns : "reason"
    
    %% Assignment History
    designer_assignments ||--o{ assignment_history : "tracks_changes"

    %% Table Definitions
    customers {
        uuid id PK
        string name
        string phone UK
        string email
        text address
        string gst_number
        boolean is_deleted
        uuid created_by_user_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    orders {
        uuid id PK
        string order_number UK
        uuid customer_id FK
        timestamp order_date
        enum status
        decimal total_amount
        text notes
        boolean is_deleted
        uuid created_by_user_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    order_items {
        uuid id PK
        uuid order_id FK
        enum material_type
        integer quantity
        decimal unit_price
        text customization_details
        enum production_stage
        timestamp stage_completed_at
        uuid stage_completed_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    designer_assignments {
        uuid id PK
        uuid order_item_id FK
        uuid designer_id FK
        uuid assigned_by FK
        enum priority_level
        date expected_delivery_date
        decimal estimated_hours
        timestamp actual_start_time
        timestamp actual_completion_time
        enum status
        uuid design_library_id FK
        text assignment_notes
        timestamp created_at
        timestamp updated_at
    }
    
    design_library {
        uuid id PK
        string design_name
        string design_category
        string design_code UK
        text design_file_url
        text design_thumbnail_url
        text design_description
        array material_compatibility
        enum complexity_level
        decimal estimated_hours
        boolean is_active
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    material_in {
        uuid id PK
        uuid customer_id FK
        uuid order_id FK
        enum material_type
        integer quantity
        string unit
        timestamp received_date
        text notes
        uuid created_by_user_id FK
        timestamp created_at
    }
    
    material_out {
        uuid id PK
        uuid order_item_id FK
        enum material_type
        integer quantity_used
        timestamp usage_date
        text notes
        uuid created_by_user_id FK
        timestamp created_at
    }
    
    material_stock {
        uuid id PK
        enum material_type
        integer current_quantity
        integer reserved_quantity
        integer minimum_threshold
        string unit
        timestamp last_updated
    }
    
    delivery_challans {
        uuid id PK
        string challan_number UK
        uuid customer_id FK
        timestamp challan_date
        integer total_quantity
        enum delivery_status
        text notes
        boolean is_deleted
        uuid created_by_user_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    challan_items {
        uuid id PK
        uuid challan_id FK
        uuid order_item_id FK
        integer quantity_delivered
        text notes
        timestamp created_at
    }
    
    gst_invoices {
        uuid id PK
        string invoice_number UK
        uuid customer_id FK
        timestamp invoice_date
        decimal subtotal_amount
        decimal cgst_amount
        decimal sgst_amount
        decimal igst_amount
        decimal total_amount
        enum status
        text notes
        uuid created_by_user_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    invoice_challans {
        uuid id PK
        uuid invoice_id FK
        uuid challan_id FK
        timestamp linked_at
    }
    
    payments {
        uuid id PK
        uuid invoice_id FK
        enum payment_method
        decimal amount
        timestamp payment_date
        string reference_number
        text notes
        uuid created_by_user_id FK
        timestamp created_at
    }
    
    user_profiles {
        uuid id PK
        uuid user_id FK
        string full_name
        enum role
        string phone
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    auth_users {
        uuid id PK
        string email UK
        string encrypted_password
        timestamp created_at
        timestamp updated_at
    }
```

## Schema Statistics

- **Total Tables**: 24 (21 current + 3 designer tables)
- **Core Business Tables**: 8
- **Reference/Lookup Tables**: 5  
- **Designer Management**: 3
- **Material Management**: 4
- **Financial Management**: 4
- **User Management**: 2

## Key Design Features

### 🔑 **Primary Keys**
- All business tables use UUID primary keys
- Generated using `gen_random_uuid()` function
- Ensures global uniqueness and security

### 🔗 **Relationships**
- **1:M relationships**: 15 primary relationships
- **M:M relationships**: 2 (via junction tables)
- **Self-referencing**: User audit trails

### 📊 **Data Types**
- **UUID**: All primary and foreign keys
- **ENUM**: Status fields for data integrity
- **DECIMAL**: Financial amounts with precision
- **TIMESTAMP WITH TIME ZONE**: Global time compatibility
- **TEXT**: Flexible content storage
- **ARRAY**: PostgreSQL array types for lists

### 🛡️ **Constraints**
- **NOT NULL**: Critical fields enforced
- **UNIQUE**: Business keys like phone, email
- **CHECK**: Quantity validations (> 0)
- **FOREIGN KEY**: Referential integrity
- **DEFAULT**: Automatic timestamps and values

### ⚡ **Indexes** (Recommended)
```sql
-- Performance critical indexes
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_designer_assignments_status ON designer_assignments(status, expected_delivery_date);
CREATE INDEX idx_material_stock_type ON material_stock(material_type);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
```

## Business Process Flows Through Schema

### **Order-to-Cash Flow**
```
customers → orders → order_items → designer_assignments → 
material_out → delivery_challans → challan_items → 
gst_invoices → invoice_challans → payments
```

### **Material Management Flow**  
```
material_in → material_stock ← material_out ← order_items
```

### **Designer Workflow**
```
order_items → designer_assignments ← design_library
          ↓
assignment_history (audit trail)
```

### **Financial Reconciliation**
```
delivery_challans → invoice_challans ← gst_invoices → payments
```

---
*Diagram generated on: """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """*
*Schema Version: v3.0 with Designer Management*
"""

    return mermaid_content

def generate_ascii_diagram():
    """Generate ASCII art diagram showing table relationships"""
    
    ascii_diagram = """
# ASCII Database Schema Visualization

## Core Business Flow
```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐
│  CUSTOMERS  │───▶│   ORDERS    │───▶│ ORDER_ITEMS  │───▶│ DESIGNER_ASSIGNMENTS│
│             │    │             │    │              │    │                     │
│ • id (PK)   │    │ • id (PK)   │    │ • id (PK)    │    │ • id (PK)          │
│ • name      │    │ • number    │    │ • order_id   │    │ • order_item_id    │
│ • phone     │    │ • customer  │◄───│ • material   │    │ • designer_id      │
│ • email     │    │ • status    │    │ • quantity   │    │ • status           │
│ • gst_no    │    │ • total     │    │ • price      │    │ • priority         │
└─────────────┘    └─────────────┘    └──────────────┘    └─────────────────────┘
        │                                      │                      │
        │                                      ▼                      ▼
        │          ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
        │          │MATERIAL_OUT │    │MATERIAL_STOCK│    │ DESIGN_LIBRARY  │
        │          │             │    │              │    │                 │
        │          │ • id (PK)   │    │ • id (PK)    │    │ • id (PK)       │
        │          │ • item_id   │    │ • type       │    │ • name          │
        │          │ • quantity  │    │ • current    │    │ • code          │
        │          │ • date      │    │ • reserved   │    │ • complexity    │
        └──────────▶└─────────────┘    └──────────────┘    └─────────────────┘
                            │                   ▲
                            └───────────────────┘
                              Updates Stock
```

## Delivery & Financial Flow
```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐    ┌─────────────┐
│ ORDER_ITEMS │───▶│ DELIVERY_CHALLANS│───▶│GST_INVOICES │───▶│  PAYMENTS   │
│             │    │                  │    │             │    │             │
│ Ready Items │    │ • challan_no     │    │ • invoice_no│    │ • amount    │
└─────────────┘    │ • customer_id    │    │ • cgst      │    │ • method    │
                   │ • status         │    │ • sgst      │    │ • date      │
                   └──────────────────┘    │ • total     │    │ • reference │
                            │              └─────────────┘    └─────────────┘
                            ▼                      ▲
                   ┌──────────────────┐           │
                   │  CHALLAN_ITEMS   │           │
                   │                  │           │
                   │ • challan_id     │───────────┘
                   │ • order_item_id  │    (via INVOICE_CHALLANS)
                   │ • quantity       │
                   └──────────────────┘
```

## Material Management Flow
```
                    ┌─────────────┐
                    │MATERIAL_IN  │
                    │             │
                    │ • customer  │
                    │ • order_id  │
                    │ • type      │
                    │ • quantity  │
                    └─────────────┘
                            │
                            ▼ (Updates)
                    ┌─────────────┐
                    │MATERIAL_STOCK│◄─────┐
                    │              │      │
                    │ • type       │      │
                    │ • current    │      │ (Reduces)
                    │ • reserved   │      │
                    │ • min_level  │      │
                    └─────────────┘      │
                            ▲            │
                            │            │
                    ┌─────────────┐      │
                    │MATERIAL_OUT │──────┘
                    │             │
                    │ • item_id   │
                    │ • quantity  │
                    │ • usage_date│
                    └─────────────┘
```

## User & Security Layer
```
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│ AUTH.USERS  │───▶│ USER_PROFILES   │───▶│ USER_ROLES  │
│ (Supabase)  │    │                 │    │             │
│             │    │ • user_id       │    │ • role_name │
│ • email     │    │ • full_name     │◄───│ • permissions│
│ • password  │    │ • role          │    │ • is_active │
│ • created   │    │ • phone         │    └─────────────┘
└─────────────┘    └─────────────────┘
        │                   │
        ▼                   ▼
   (Audit Trail)      (Role-based Access)
        │                   │
        └─────────┬─────────┘
                  ▼
        ┌─────────────────────┐
        │   ALL BUSINESS      │
        │     TABLES          │
        │                     │
        │ • created_by        │
        │ • updated_by        │
        │ • created_at        │
        │ • updated_at        │
        └─────────────────────┘
```

## Reference Data Structure
```
USER_ROLES          ORDER_STATUSES       MATERIAL_TYPES
┌─────────────┐    ┌─────────────┐      ┌─────────────┐
│ • admin     │    │ • pending   │      │ • saree     │
│ • manager   │    │ • progress  │      │ • dupatta   │
│ • designer  │    │ • completed │      │ • voni      │
│ • employee  │    │ • cancelled │      │ • running   │
└─────────────┘    └─────────────┘      └─────────────┘

PRODUCTION_STAGES   PAYMENT_METHODS      RETURN_REASONS
┌─────────────┐    ┌─────────────┐      ┌─────────────┐
│ • design    │    │ • cash      │      │ • damaged   │
│ • pre_treat │    │ • upi       │      │ • defective │
│ • printing  │    │ • bank      │      │ • wrong     │
│ • post_proc │    │ • cheque    │      │ • customer  │
└─────────────┘    └─────────────┘      └─────────────┘
```
"""
    return ascii_diagram

def generate_plantuml_diagram():
    """Generate PlantUML diagram for the schema"""
    
    plantuml_content = """
# PlantUML Database Schema Diagram

```plantuml
@startuml
!define Table(name,desc) class name as "desc" << (T,#FFAAAA) >>
!define primary_key(x) <u>x</u>
!define foreign_key(x) <color:blue>x</color>
!define unique(x) <color:green>x</color>

Table(customers, "Customers\\nCustomer master data") {
    primary_key(id: UUID)
    unique(phone: VARCHAR)
    name: VARCHAR
    email: VARCHAR
    address: TEXT
    gst_number: VARCHAR
    is_deleted: BOOLEAN
    foreign_key(created_by_user_id: UUID)
    created_at: TIMESTAMPTZ
    updated_at: TIMESTAMPTZ
}

Table(orders, "Orders\\nOrder headers") {
    primary_key(id: UUID)
    unique(order_number: VARCHAR)
    foreign_key(customer_id: UUID)
    order_date: TIMESTAMPTZ
    status: ENUM
    total_amount: DECIMAL
    notes: TEXT
    is_deleted: BOOLEAN
    foreign_key(created_by_user_id: UUID)
    created_at: TIMESTAMPTZ
    updated_at: TIMESTAMPTZ
}

Table(order_items, "Order Items\\nOrder line details") {
    primary_key(id: UUID)
    foreign_key(order_id: UUID)
    material_type: ENUM
    quantity: INTEGER
    unit_price: DECIMAL
    customization_details: TEXT
    production_stage: ENUM
    stage_completed_at: TIMESTAMPTZ
    foreign_key(stage_completed_by: UUID)
    created_at: TIMESTAMPTZ
    updated_at: TIMESTAMPTZ
}

Table(designer_assignments, "Designer Assignments\\nWork tracking") {
    primary_key(id: UUID)
    foreign_key(order_item_id: UUID)
    foreign_key(designer_id: UUID)
    foreign_key(assigned_by: UUID)
    priority_level: ENUM
    expected_delivery_date: DATE
    estimated_hours: DECIMAL
    actual_start_time: TIMESTAMPTZ
    actual_completion_time: TIMESTAMPTZ
    status: ENUM
    foreign_key(design_library_id: UUID)
    assignment_notes: TEXT
    created_at: TIMESTAMPTZ
    updated_at: TIMESTAMPTZ
}

Table(design_library, "Design Library\\nReusable designs") {
    primary_key(id: UUID)
    design_name: VARCHAR
    design_category: VARCHAR
    unique(design_code: VARCHAR)
    design_file_url: TEXT
    design_thumbnail_url: TEXT
    design_description: TEXT
    material_compatibility: TEXT[]
    complexity_level: ENUM
    estimated_hours: DECIMAL
    is_active: BOOLEAN
    foreign_key(created_by: UUID)
    created_at: TIMESTAMPTZ
    updated_at: TIMESTAMPTZ
}

Table(material_in, "Material In\\nIncoming materials") {
    primary_key(id: UUID)
    foreign_key(customer_id: UUID)
    foreign_key(order_id: UUID)
    material_type: ENUM
    quantity: INTEGER
    unit: VARCHAR
    received_date: TIMESTAMPTZ
    notes: TEXT
    foreign_key(created_by_user_id: UUID)
    created_at: TIMESTAMPTZ
}

Table(material_stock, "Material Stock\\nCurrent inventory") {
    primary_key(id: UUID)
    material_type: ENUM
    current_quantity: INTEGER
    reserved_quantity: INTEGER
    minimum_threshold: INTEGER
    unit: VARCHAR
    last_updated: TIMESTAMPTZ
}

Table(delivery_challans, "Delivery Challans\\nShipment docs") {
    primary_key(id: UUID)
    unique(challan_number: VARCHAR)
    foreign_key(customer_id: UUID)
    challan_date: TIMESTAMPTZ
    total_quantity: INTEGER
    delivery_status: ENUM
    notes: TEXT
    is_deleted: BOOLEAN
    foreign_key(created_by_user_id: UUID)
    created_at: TIMESTAMPTZ
    updated_at: TIMESTAMPTZ
}

Table(gst_invoices, "GST Invoices\\nTax invoices") {
    primary_key(id: UUID)
    unique(invoice_number: VARCHAR)
    foreign_key(customer_id: UUID)
    invoice_date: TIMESTAMPTZ
    subtotal_amount: DECIMAL
    cgst_amount: DECIMAL
    sgst_amount: DECIMAL
    igst_amount: DECIMAL
    total_amount: DECIMAL
    status: ENUM
    notes: TEXT
    foreign_key(created_by_user_id: UUID)
    created_at: TIMESTAMPTZ
    updated_at: TIMESTAMPTZ
}

Table(payments, "Payments\\nPayment receipts") {
    primary_key(id: UUID)
    foreign_key(invoice_id: UUID)
    payment_method: ENUM
    amount: DECIMAL
    payment_date: TIMESTAMPTZ
    reference_number: VARCHAR
    notes: TEXT
    foreign_key(created_by_user_id: UUID)
    created_at: TIMESTAMPTZ
}

' Relationships
customers ||--o{ orders
orders ||--o{ order_items
order_items ||--|| designer_assignments
designer_assignments }o--|| design_library
customers ||--o{ material_in
customers ||--o{ delivery_challans
customers ||--o{ gst_invoices
gst_invoices ||--o{ payments

@enduml
```
"""
    return plantuml_content

def main():
    """Generate all diagram formats"""
    print("🎨 Generating database schema diagrams...")
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Generate Mermaid diagram
    mermaid_content = generate_mermaid_diagram()
    with open(f'SCHEMA_DIAGRAM_MERMAID_{timestamp}.md', 'w', encoding='utf-8') as f:
        f.write(mermaid_content)
    
    # Generate ASCII diagram  
    ascii_content = generate_ascii_diagram()
    with open(f'SCHEMA_DIAGRAM_ASCII_{timestamp}.md', 'w', encoding='utf-8') as f:
        f.write(ascii_content)
    
    # Generate PlantUML diagram
    plantuml_content = generate_plantuml_diagram()
    with open(f'SCHEMA_DIAGRAM_PLANTUML_{timestamp}.md', 'w', encoding='utf-8') as f:
        f.write(plantuml_content)
    
    print(f"✅ Schema diagrams generated:")
    print(f"   📊 Mermaid: SCHEMA_DIAGRAM_MERMAID_{timestamp}.md")
    print(f"   📋 ASCII: SCHEMA_DIAGRAM_ASCII_{timestamp}.md") 
    print(f"   🎯 PlantUML: SCHEMA_DIAGRAM_PLANTUML_{timestamp}.md")

if __name__ == "__main__":
    main()