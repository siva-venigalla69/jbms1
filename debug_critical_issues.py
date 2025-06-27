#!/usr/bin/env python3
"""
Critical Issues Debugging Script
Identifies and fixes the remaining API issues based on test results.
"""

import sys
import os
import traceback
from datetime import datetime

# Add backend to path
sys.path.append('./backend')

def test_order_creation():
    """Debug order creation 500 error"""
    print("=== DEBUGGING ORDER CREATION ===")
    try:
        from backend.app.core.database import get_db
        from backend.app.models.models import Customer, Order, OrderItem, OrderStatus, MaterialType
        from backend.app.services.numbering import generate_order_number
        from sqlalchemy import text
        
        db = next(get_db())
        
        # Test 1: Check if customers exist
        customer = db.query(Customer).filter(Customer.is_deleted == False).first()
        if not customer:
            print("❌ No active customers found")
            return False
        print(f"✅ Found customer: {customer.name} (ID: {customer.id})")
        
        # Test 2: Test order number generation
        try:
            order_number = generate_order_number(db)
            print(f"✅ Generated order number: {order_number}")
        except Exception as e:
            print(f"❌ Order number generation failed: {e}")
            return False
        
        # Test 3: Test enum values
        print(f"✅ OrderStatus values: {[s.value for s in OrderStatus]}")
        print(f"✅ MaterialType values: {[m.value for m in MaterialType]}")
        
        # Test 4: Test direct order creation with SQLAlchemy
        try:
            test_order = Order(
                order_number=f"TEST-{int(datetime.now().timestamp())}",
                customer_id=customer.id,
                status=OrderStatus.PENDING.value,
                total_amount=100.00,
                notes="Test order from debug script"
            )
            db.add(test_order)
            db.flush()
            
            # Test order item creation
            test_item = OrderItem(
                order_id=test_order.id,
                material_type=MaterialType.SAREE.value,
                quantity=1,
                unit_price=100.00
            )
            db.add(test_item)
            db.flush()
            
            print(f"✅ Order creation successful: {test_order.id}")
            print(f"✅ Order item creation successful: {test_item.id}")
            
            db.rollback()  # Don't keep test data
            return True
            
        except Exception as e:
            print(f"❌ SQLAlchemy order creation failed: {e}")
            traceback.print_exc()
            db.rollback()
            return False
            
    except Exception as e:
        print(f"❌ General order creation test failed: {e}")
        traceback.print_exc()
        return False

def test_material_recording():
    """Debug material recording 500 error"""
    print("\n=== DEBUGGING MATERIAL RECORDING ===")
    try:
        from backend.app.core.database import get_db
        from backend.app.models.models import Customer, MaterialIn, MaterialType
        
        db = next(get_db())
        
        # Test customer existence
        customer = db.query(Customer).filter(Customer.is_deleted == False).first()
        if not customer:
            print("❌ No active customers found")
            return False
        print(f"✅ Found customer: {customer.name}")
        
        # Test material in creation
        try:
            test_material = MaterialIn(
                customer_id=customer.id,
                material_type=MaterialType.SAREE.value,
                quantity=10,
                unit="pieces",
                notes="Test material from debug script"
            )
            db.add(test_material)
            db.flush()
            
            print(f"✅ Material recording successful: {test_material.id}")
            db.rollback()
            return True
            
        except Exception as e:
            print(f"❌ Material recording failed: {e}")
            traceback.print_exc()
            db.rollback()
            return False
            
    except Exception as e:
        print(f"❌ General material recording test failed: {e}")
        traceback.print_exc()
        return False

def test_user_listing():
    """Debug user listing 500 error"""
    print("\n=== DEBUGGING USER LISTING ===")
    try:
        from backend.app.core.database import get_db
        from backend.app.models.models import User
        
        db = next(get_db())
        
        # Test user query
        try:
            users = db.query(User).limit(5).all()
            print(f"✅ Found {len(users)} users")
            for user in users:
                print(f"  - {user.username} ({user.role})")
            return True
            
        except Exception as e:
            print(f"❌ User query failed: {e}")
            traceback.print_exc()
            return False
            
    except Exception as e:
        print(f"❌ General user listing test failed: {e}")
        traceback.print_exc()
        return False

def test_expenses():
    """Debug expenses 500 error"""
    print("\n=== DEBUGGING EXPENSES ===")
    try:
        from backend.app.core.database import get_db
        from backend.app.models.models import Expense, PaymentMethod, User
        
        db = next(get_db())
        
        # Get a user for foreign key
        user = db.query(User).first()
        if not user:
            print("❌ No users found for expense creation")
            return False
        
        # Test expense creation
        try:
            test_expense = Expense(
                category="Test Category",
                description="Test expense from debug script",
                amount=50.00,
                payment_method=PaymentMethod.CASH.value,
                created_by_user_id=user.id
            )
            db.add(test_expense)
            db.flush()
            
            print(f"✅ Expense creation successful: {test_expense.id}")
            db.rollback()
            return True
            
        except Exception as e:
            print(f"❌ Expense creation failed: {e}")
            traceback.print_exc()
            db.rollback()
            return False
            
    except Exception as e:
        print(f"❌ General expense test failed: {e}")
        traceback.print_exc()
        return False

def test_inventory_adjustment():
    """Debug inventory adjustment 500 error"""
    print("\n=== DEBUGGING INVENTORY ADJUSTMENT ===")
    try:
        from backend.app.core.database import get_db
        from backend.app.models.models import Inventory, InventoryAdjustment, AdjustmentType, User
        
        db = next(get_db())
        
        # Get an inventory item
        inventory = db.query(Inventory).filter(Inventory.is_deleted == False).first()
        if not inventory:
            print("❌ No active inventory items found")
            return False
        print(f"✅ Found inventory item: {inventory.item_name}")
        
        # Get a user
        user = db.query(User).first()
        if not user:
            print("❌ No users found for adjustment")
            return False
        
        # Test adjustment creation
        try:
            test_adjustment = InventoryAdjustment(
                inventory_id=inventory.id,
                adjustment_type=AdjustmentType.QUANTITY_CHANGE.value,
                quantity_change=5.0,
                reason="Test adjustment from debug script",
                created_by_user_id=user.id
            )
            db.add(test_adjustment)
            db.flush()
            
            print(f"✅ Inventory adjustment successful: {test_adjustment.id}")
            db.rollback()
            return True
            
        except Exception as e:
            print(f"❌ Inventory adjustment failed: {e}")
            traceback.print_exc()
            db.rollback()
            return False
            
    except Exception as e:
        print(f"❌ General inventory adjustment test failed: {e}")
        traceback.print_exc()
        return False

def main():
    """Run all debugging tests"""
    print("🔍 CRITICAL ISSUES DEBUGGING SCRIPT")
    print("=" * 50)
    
    results = {
        "Order Creation": test_order_creation(),
        "Material Recording": test_material_recording(), 
        "User Listing": test_user_listing(),
        "Expenses": test_expenses(),
        "Inventory Adjustment": test_inventory_adjustment()
    }
    
    print("\n" + "=" * 50)
    print("📊 DEBUGGING RESULTS SUMMARY")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    success_rate = (passed / len(results)) * 100
    print(f"\nDebug Success Rate: {passed}/{len(results)} ({success_rate:.1f}%)")
    
    if passed == len(results):
        print("\n🎉 ALL TESTS PASSED - Issues may be in API layer, not database layer")
    else:
        print(f"\n⚠️  {len(results) - passed} issues found at database level")
    
    return results

if __name__ == "__main__":
    main() 