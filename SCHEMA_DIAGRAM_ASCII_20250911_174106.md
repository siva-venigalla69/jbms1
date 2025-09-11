
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
