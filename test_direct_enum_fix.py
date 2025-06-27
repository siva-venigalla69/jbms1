#!/usr/bin/env python3
"""
Test script to debug enum value issues by using direct string literals
"""

import sys
import os
import traceback
from datetime import datetime

# Add backend to path
sys.path.append('./backend')

def test_with_string_literals():
    """Test using direct string literals instead of enum values"""
    print("=== TESTING WITH STRING LITERALS ===")
    try:
        from backend.app.core.database import get_db
        from backend.app.models.models import Customer, Order, OrderItem, MaterialIn, Expense, InventoryAdjustment, Inventory, User
        
        db = next(get_db())
        
        # Test 1: Order creation with string literals
        customer = db.query(Customer).filter(Customer.is_deleted == False).first()
        if not customer:
            print("❌ No customers found")
            return False
            
        print(f"✅ Found customer: {customer.name}")
        
        try:
            # Use direct string literals matching database enum values
            test_order = Order(
                order_number=f"TEST-STR-{int(datetime.now().timestamp())}",
                customer_id=customer.id,
                status="pending",  # Direct string literal
                total_amount=100.00,
                notes="Test order with string literal"
            )
            db.add(test_order)
            db.flush()
            
            print(f"✅ Order creation with string literal successful: {test_order.id}")
            
            # Test order item
            test_item = OrderItem(
                order_id=test_order.id,
                material_type="saree",  # Direct string literal
                quantity=1,
                unit_price=100.00
            )
            db.add(test_item)
            db.flush()
            
            print(f"✅ Order item with string literal successful: {test_item.id}")
            
            db.rollback()
            return True
            
        except Exception as e:
            print(f"❌ String literal test failed: {e}")
            traceback.print_exc()
            db.rollback()
            return False
            
    except Exception as e:
        print(f"❌ General string literal test failed: {e}")
        traceback.print_exc()
        return False

def test_material_with_string():
    """Test material recording with string literals"""
    print("\n=== TESTING MATERIAL WITH STRING LITERALS ===")
    try:
        from backend.app.core.database import get_db
        from backend.app.models.models import Customer, MaterialIn
        
        db = next(get_db())
        
        customer = db.query(Customer).filter(Customer.is_deleted == False).first()
        if not customer:
            print("❌ No customers found")
            return False
            
        try:
            test_material = MaterialIn(
                customer_id=customer.id,
                material_type="saree",  # Direct string literal
                quantity=10,
                unit="pieces",
                notes="Test material with string literal"
            )
            db.add(test_material)
            db.flush()
            
            print(f"✅ Material recording with string literal successful: {test_material.id}")
            db.rollback()
            return True
            
        except Exception as e:
            print(f"❌ Material string literal test failed: {e}")
            traceback.print_exc()
            db.rollback()
            return False
            
    except Exception as e:
        print(f"❌ General material string literal test failed: {e}")
        traceback.print_exc()
        return False

def test_expense_with_string():
    """Test expense with string literals"""
    print("\n=== TESTING EXPENSE WITH STRING LITERALS ===")
    try:
        from backend.app.core.database import get_db
        from backend.app.models.models import Expense, User
        
        db = next(get_db())
        
        user = db.query(User).first()
        if not user:
            print("❌ No users found")
            return False
            
        try:
            test_expense = Expense(
                category="Test Category",
                description="Test expense with string literal",
                amount=50.00,
                payment_method="cash",  # Direct string literal
                created_by_user_id=user.id
            )
            db.add(test_expense)
            db.flush()
            
            print(f"✅ Expense with string literal successful: {test_expense.id}")
            db.rollback()
            return True
            
        except Exception as e:
            print(f"❌ Expense string literal test failed: {e}")
            traceback.print_exc()
            db.rollback()
            return False
            
    except Exception as e:
        print(f"❌ General expense string literal test failed: {e}")
        traceback.print_exc()
        return False

def test_inventory_adjustment_with_string():
    """Test inventory adjustment with string literals"""
    print("\n=== TESTING INVENTORY ADJUSTMENT WITH STRING LITERALS ===")
    try:
        from backend.app.core.database import get_db
        from backend.app.models.models import Inventory, InventoryAdjustment, User
        
        db = next(get_db())
        
        inventory = db.query(Inventory).filter(Inventory.is_deleted == False).first()
        user = db.query(User).first()
        
        if not inventory or not user:
            print("❌ No inventory or user found")
            return False
            
        try:
            test_adjustment = InventoryAdjustment(
                inventory_id=inventory.id,
                adjustment_type="quantity_change",  # Direct string literal
                quantity_change=5.0,
                reason="Test adjustment with string literal",
                created_by_user_id=user.id
            )
            db.add(test_adjustment)
            db.flush()
            
            print(f"✅ Inventory adjustment with string literal successful: {test_adjustment.id}")
            db.rollback()
            return True
            
        except Exception as e:
            print(f"❌ Inventory adjustment string literal test failed: {e}")
            traceback.print_exc()
            db.rollback()
            return False
            
    except Exception as e:
        print(f"❌ General inventory adjustment string literal test failed: {e}")
        traceback.print_exc()
        return False

def main():
    """Run string literal tests"""
    print("🔍 STRING LITERAL ENUM TESTING SCRIPT")
    print("=" * 50)
    
    results = {
        "Order Creation (String)": test_with_string_literals(),
        "Material Recording (String)": test_material_with_string(),
        "Expense Creation (String)": test_expense_with_string(),
        "Inventory Adjustment (String)": test_inventory_adjustment_with_string()
    }
    
    print("\n" + "=" * 50)
    print("📊 STRING LITERAL TEST RESULTS")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    success_rate = (passed / len(results)) * 100
    print(f"\nString Literal Success Rate: {passed}/{len(results)} ({success_rate:.1f}%)")
    
    if passed == len(results):
        print("\n🎉 ALL STRING LITERAL TESTS PASSED - The issue is in enum processing")
    else:
        print(f"\n⚠️  {len(results) - passed} string literal tests failed - The issue is deeper")
    
    return results

if __name__ == "__main__":
    main() 