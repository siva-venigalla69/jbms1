import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, and_
from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, Order, OrderItem, Inventory, GSTInvoice
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports Management"])

@router.get("/pending-orders")
async def get_pending_orders_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get pending orders report using the database view"""
    try:
        logger.info(f"User {current_user.username} requesting pending orders report")
        
        # Query the view directly
        result = db.execute(text("""
            SELECT 
                id,
                order_number,
                customer_name,
                order_date,
                status,
                total_quantity,
                total_items,
                post_process_items
            FROM jbms_db.public.v_pending_orders
            ORDER BY order_date DESC
        """))
        
        rows = result.fetchall()
        
        # Convert to response format
        response_data = []
        for row in rows:
            order_dict = {
                "id": str(row[0]),
                "order_number": row[1],
                "customer_name": row[2],
                "order_date": row[3],
                "status": row[4],
                "total_quantity": row[5],
                "total_items": row[6],
                "post_process_items": row[7]
            }
            response_data.append(order_dict)
        
        logger.info(f"User {current_user.username} retrieved {len(response_data)} pending orders")
        return {"success": True, "data": response_data, "count": len(response_data)}
        
    except Exception as e:
        logger.error(f"Error retrieving pending orders report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve pending orders report: {str(e)[:100]}"
        )

@router.get("/production-status")
async def get_production_status_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get production status report"""
    try:
        logger.info(f"User {current_user.username} requesting production status report")
        
        # Query order items with their production stages
        result = db.execute(text("""
            SELECT 
                oi.id,
                o.order_number,
                c.name as customer_name,
                oi.material_type,
                oi.quantity,
                oi.production_stage,
                oi.stage_completed_at,
                o.order_date
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN customers c ON o.customer_id = c.id
            WHERE oi.is_deleted = false 
            AND o.is_deleted = false 
            AND o.status IN ('pending', 'in_progress')
            ORDER BY o.order_date DESC, oi.created_at ASC
        """))
        
        rows = result.fetchall()
        
        # Convert to response format and group by stage
        response_data = []
        stage_summary = {
            "pre_treatment": 0,
            "printing": 0,
            "post_process": 0
        }
        
        for row in rows:
            stage = row[5]
            if stage:
                stage_summary[stage] = stage_summary.get(stage, 0) + 1
            
            item_dict = {
                "order_item_id": str(row[0]),
                "order_number": row[1],
                "customer_name": row[2],
                "material_type": row[3],
                "quantity": row[4],
                "production_stage": row[5],
                "stage_completed_at": row[6],
                "order_date": row[7]
            }
            response_data.append(item_dict)
        
        logger.info(f"User {current_user.username} retrieved {len(response_data)} production items")
        return {
            "success": True, 
            "data": response_data, 
            "count": len(response_data),
            "stage_summary": stage_summary
        }
        
    except Exception as e:
        logger.error(f"Error retrieving production status report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve production status report: {str(e)[:100]}"
        )

@router.get("/stock-holdings")
async def get_stock_holdings_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get stock holdings report"""
    try:
        logger.info(f"User {current_user.username} requesting stock holdings report")
        
        # Query inventory items
        result = db.execute(text("""
            SELECT 
                id,
                item_name,
                category,
                current_stock,
                unit,
                reorder_level,
                cost_per_unit,
                supplier_name,
                (current_stock <= reorder_level) as is_low_stock,
                (current_stock * cost_per_unit) as stock_value
            FROM inventory
            WHERE is_deleted = false AND is_active = true
            ORDER BY category, item_name
        """))
        
        rows = result.fetchall()
        
        # Convert to response format
        response_data = []
        total_stock_value = 0
        low_stock_count = 0
        
        for row in rows:
            is_low_stock = row[8]
            stock_value = float(row[9]) if row[9] else 0
            total_stock_value += stock_value
            
            if is_low_stock:
                low_stock_count += 1
            
            item_dict = {
                "item_id": str(row[0]),
                "item_name": row[1],
                "category": row[2],
                "current_stock": float(row[3]) if row[3] else 0,
                "unit": row[4],
                "reorder_level": float(row[5]) if row[5] else 0,
                "cost_per_unit": float(row[6]) if row[6] else 0,
                "supplier_name": row[7],
                "is_low_stock": is_low_stock,
                "stock_value": stock_value
            }
            response_data.append(item_dict)
        
        logger.info(f"User {current_user.username} retrieved {len(response_data)} stock items")
        return {
            "success": True, 
            "data": response_data, 
            "count": len(response_data),
            "summary": {
                "total_items": len(response_data),
                "low_stock_items": low_stock_count,
                "total_stock_value": total_stock_value
            }
        }
        
    except Exception as e:
        logger.error(f"Error retrieving stock holdings report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve stock holdings report: {str(e)[:100]}"
        )

@router.get("/pending-receivables")
async def get_pending_receivables_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get pending receivables report"""
    try:
        logger.info(f"User {current_user.username} requesting pending receivables report")
        
        # Query outstanding invoices
        result = db.execute(text("""
            SELECT 
                i.id,
                i.invoice_number,
                i.invoice_date,
                i.total_amount,
                i.outstanding_amount,
                c.name as customer_name,
                c.phone as customer_phone,
                c.gst_number as customer_gst,
                CASE 
                    WHEN i.invoice_date IS NOT NULL THEN 
                        EXTRACT(DAY FROM (CURRENT_DATE - i.invoice_date::date))
                    ELSE 0 
                END as days_outstanding
            FROM gst_invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.is_deleted = false 
            AND i.outstanding_amount > 0
            ORDER BY 
                CASE 
                    WHEN i.invoice_date IS NOT NULL THEN 
                        EXTRACT(DAY FROM (CURRENT_DATE - i.invoice_date::date))
                    ELSE 0 
                END DESC, 
                i.outstanding_amount DESC
        """))
        
        rows = result.fetchall()
        
        # Convert to response format
        response_data = []
        total_outstanding = 0
        
        for row in rows:
            outstanding_amount = float(row[4]) if row[4] else 0
            total_outstanding += outstanding_amount
            
            receivable_dict = {
                "invoice_id": str(row[0]),
                "invoice_number": row[1],
                "invoice_date": row[2],
                "total_amount": float(row[3]) if row[3] else 0,
                "outstanding_amount": outstanding_amount,
                "customer_name": row[5],
                "customer_phone": row[6],
                "customer_gst": row[7],
                "days_outstanding": int(row[8]) if row[8] else 0
            }
            response_data.append(receivable_dict)
        
        logger.info(f"User {current_user.username} retrieved {len(response_data)} outstanding receivables")
        return {
            "success": True, 
            "data": response_data, 
            "count": len(response_data),
            "summary": {
                "total_invoices": len(response_data),
                "total_outstanding": total_outstanding
            }
        }
        
    except Exception as e:
        logger.error(f"Error retrieving pending receivables report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve pending receivables report: {str(e)[:100]}"
        )

@router.get("/dashboard")
async def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get dashboard summary data"""
    try:
        logger.info(f"User {current_user.username} requesting dashboard data")
        
        # Get various counts and summaries
        dashboard_data = {}
        
        # Total pending orders count
        result = db.execute(text("""
            SELECT COUNT(*) FROM jbms_db.public.v_pending_orders
        """))
        dashboard_data["pending_orders_count"] = result.scalar()
        
        # Total customers count
        result = db.execute(text("""
            SELECT COUNT(*) FROM jbms_db.public.customers WHERE is_deleted = false
        """))
        dashboard_data["total_customers"] = result.scalar()
        
        # Low stock items count
        result = db.execute(text("""
            SELECT COUNT(*) FROM jbms_db.public.v_stock_items WHERE is_low_stock = true
        """))
        dashboard_data["low_stock_items"] = result.scalar()
        
        # Outstanding receivables total
        result = db.execute(text("""
            SELECT COALESCE(SUM(outstanding_amount), 0) FROM jbms_db.public.v_outstanding_receivables
        """))
        dashboard_data["outstanding_receivables"] = float(result.scalar())
        
        # Recent material flow count (last 7 days)
        result = db.execute(text("""
            SELECT COUNT(*) FROM jbms_db.public.v_material_flow_summary 
            WHERE flow_date >= CURRENT_DATE - INTERVAL '7 days'
        """))
        dashboard_data["recent_material_movements"] = result.scalar()
        
        logger.info(f"User {current_user.username} retrieved dashboard data")
        return {"success": True, "data": dashboard_data}
        
    except Exception as e:
        logger.error(f"Error retrieving dashboard data: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve dashboard data: {str(e)[:100]}"
        )

@router.get("/low-stock")
async def get_low_stock_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get low stock items report using the database view"""
    try:
        logger.info(f"User {current_user.username} requesting low stock report")
        
        # Query the view directly
        result = db.execute(text("""
            SELECT 
                id,
                item_name,
                category,
                current_stock,
                unit,
                reorder_level,
                cost_per_unit,
                supplier_name,
                supplier_contact,
                is_low_stock
            FROM jbms_db.public.v_stock_items
            WHERE is_low_stock = true
            ORDER BY current_stock ASC
        """))
        
        rows = result.fetchall()
        
        # Convert to response format
        response_data = []
        for row in rows:
            item_dict = {
                "id": str(row[0]),
                "item_name": row[1],
                "category": row[2],
                "current_stock": float(row[3]) if row[3] else 0,
                "unit": row[4],
                "reorder_level": float(row[5]) if row[5] else 0,
                "cost_per_unit": float(row[6]) if row[6] else 0,
                "supplier_name": row[7],
                "supplier_contact": row[8],
                "is_low_stock": row[9]
            }
            response_data.append(item_dict)
        
        logger.info(f"User {current_user.username} retrieved {len(response_data)} low stock items")
        return {"success": True, "data": response_data, "count": len(response_data)}
        
    except Exception as e:
        logger.error(f"Error retrieving low stock report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve low stock report: {str(e)[:100]}"
        )

@router.get("/outstanding-receivables")
async def get_outstanding_receivables_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get outstanding receivables report using the database view"""
    try:
        logger.info(f"User {current_user.username} requesting outstanding receivables report")
        
        # Query the view directly
        result = db.execute(text("""
            SELECT 
                id,
                invoice_number,
                invoice_date,
                final_amount,
                outstanding_amount,
                customer_name,
                customer_phone,
                customer_gst,
                days_outstanding
            FROM jbms_db.public.v_outstanding_receivables
            ORDER BY days_outstanding DESC
        """))
        
        rows = result.fetchall()
        
        # Convert to response format
        response_data = []
        for row in rows:
            receivable_dict = {
                "id": str(row[0]),
                "invoice_number": row[1],
                "invoice_date": row[2],
                "final_amount": float(row[3]) if row[3] else 0,
                "outstanding_amount": float(row[4]) if row[4] else 0,
                "customer_name": row[5],
                "customer_phone": row[6],
                "customer_gst": row[7],
                "days_outstanding": row[8]
            }
            response_data.append(receivable_dict)
        
        logger.info(f"User {current_user.username} retrieved {len(response_data)} outstanding receivables")
        return {"success": True, "data": response_data, "count": len(response_data)}
        
    except Exception as e:
        logger.error(f"Error retrieving outstanding receivables report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve outstanding receivables report: {str(e)[:100]}"
        )

@router.get("/material-flow")
async def get_material_flow_report(
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get material flow summary report using the database view"""
    try:
        logger.info(f"User {current_user.username} requesting material flow report for last {days} days")
        
        # Query the view directly with date filter
        result = db.execute(text("""
            SELECT 
                flow_type,
                material_type,
                flow_date,
                total_quantity,
                new_values,
                changed_at,
                changed_by
            FROM jbms_db.public.v_material_flow_summary
            WHERE flow_date >= CURRENT_DATE - INTERVAL :days DAY
            ORDER BY flow_date DESC
        """), {"days": days})
        
        rows = result.fetchall()
        
        # Convert to response format
        response_data = []
        for row in rows:
            flow_dict = {
                "flow_type": row[0],
                "material_type": row[1],
                "flow_date": row[2],
                "total_quantity": row[3],
                "notes": row[4],
                "changed_at": row[5],
                "changed_by": row[6]
            }
            response_data.append(flow_dict)
        
        logger.info(f"User {current_user.username} retrieved {len(response_data)} material flow records")
        return {"success": True, "data": response_data, "count": len(response_data), "days": days}
        
    except Exception as e:
        logger.error(f"Error retrieving material flow report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve material flow report: {str(e)[:100]}"
        )
