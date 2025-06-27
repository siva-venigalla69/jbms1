"""
Numbering service for auto-generating sequential numbers
Implements functional requirements for:
- Order Numbers: ORD-YYYY-NNNN
- Challan Numbers: CH-YYYY-NNNN  
- Invoice Numbers: INV-YYYY-NNNN
"""

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from ..models.models import Order, DeliveryChallan, GSTInvoice


def generate_order_number(db: Session) -> str:
    """Generate next order number in format ORD-YYYY-NNNN"""
    current_year = datetime.now().year
    
    # Get the highest order number for current year
    result = db.execute(
        text("""
        SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 10) AS INTEGER)), 0) as max_num
        FROM orders 
        WHERE order_number LIKE :pattern
        """),
        {"pattern": f"ORD-{current_year}-%"}
    ).fetchone()
    
    next_number = (result.max_num if result and result.max_num else 0) + 1
    return f"ORD-{current_year}-{next_number:04d}"


def generate_challan_number(db: Session) -> str:
    """Generate next challan number in format CH-YYYY-NNNN"""
    current_year = datetime.now().year
    
    # Get the highest challan number for current year
    result = db.execute(
        text("""
        SELECT COALESCE(MAX(CAST(SUBSTRING(challan_number FROM 9) AS INTEGER)), 0) as max_num
        FROM delivery_challans 
        WHERE challan_number LIKE :pattern
        """),
        {"pattern": f"CH-{current_year}-%"}
    ).fetchone()
    
    next_number = (result.max_num if result and result.max_num else 0) + 1
    return f"CH-{current_year}-{next_number:04d}"


def generate_invoice_number(db: Session) -> str:
    """Generate next invoice number in format INV-YYYY-NNNN"""
    current_year = datetime.now().year
    
    # Get the highest invoice number for current year
    result = db.execute(
        text("""
        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)), 0) as max_num
        FROM gst_invoices 
        WHERE invoice_number LIKE :pattern
        """),
        {"pattern": f"INV-{current_year}-%"}
    ).fetchone()
    
    next_number = (result.max_num if result and result.max_num else 0) + 1
    return f"INV-{current_year}-{next_number:04d}" 