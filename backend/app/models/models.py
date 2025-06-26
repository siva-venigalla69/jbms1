from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, CheckConstraint
from sqlalchemy.types import Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base
import enum
import uuid

# Enums
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class MaterialType(str, enum.Enum):
    SAREE = "saree"
    DUPATTA = "dupatta"
    VONI = "voni"
    RUNNING_MATERIAL = "running_material"
    BLOUSE_MATERIAL = "blouse_material"

class ProductionStage(str, enum.Enum):
    PRE_TREATMENT = "pre_treatment"
    PRINTING = "printing"
    POST_PROCESS = "post_process"

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    CHEQUE = "cheque"

class ReturnReason(str, enum.Enum):
    DAMAGED = "damaged"
    DEFECTIVE = "defective"
    WRONG_DESIGN = "wrong_design"
    CUSTOMER_REQUEST = "customer_request"

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=UserRole.EMPLOYEE.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("role IN ('admin', 'manager', 'employee')", name='check_user_role'),
    )

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False, index=True)
    phone = Column(String(20), unique=True, index=True)
    email = Column(String(255))
    address = Column(Text)
    gst_number = Column(String(15))
    is_deleted = Column(Boolean, default=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    orders = relationship("Order", back_populates="customer")
    creator = relationship("User", foreign_keys=[created_by_user_id])
    updater = relationship("User", foreign_keys=[updated_by_user_id])

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    order_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(Enum(OrderStatus, name='order_status'), nullable=False, default=OrderStatus.PENDING)
    total_amount = Column(Numeric(10, 2), default=0)
    notes = Column(Text)
    is_deleted = Column(Boolean, default=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    customer = relationship("Customer", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order")
    creator = relationship("User", foreign_keys=[created_by_user_id])
    updater = relationship("User", foreign_keys=[updated_by_user_id])

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    material_type = Column(Enum(MaterialType, name='material_type'), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    customization_details = Column(Text)
    current_stage = Column(Enum(ProductionStage, name='production_stage'), default=ProductionStage.PRE_TREATMENT)
    pre_treatment_completed_at = Column(DateTime(timezone=True))
    pre_treatment_completed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    printing_completed_at = Column(DateTime(timezone=True))
    printing_completed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    post_process_completed_at = Column(DateTime(timezone=True))
    post_process_completed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    order = relationship("Order", back_populates="order_items")

class MaterialIn(Base):
    __tablename__ = "material_in"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"))
    material_type = Column(Enum(MaterialType, name='material_type'), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit = Column(String(20), nullable=False)
    received_date = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    order = relationship("Order")
    creator = relationship("User")

class DeliveryChallan(Base):
    __tablename__ = "delivery_challans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    challan_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    challan_date = Column(DateTime(timezone=True), server_default=func.now())
    total_quantity = Column(Integer, default=0)
    delivery_status = Column(String(20), default="pending")
    notes = Column(Text)
    is_deleted = Column(Boolean, default=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    customer = relationship("Customer")
    challan_items = relationship("ChallanItem", back_populates="challan")
    creator = relationship("User")

class ChallanItem(Base):
    __tablename__ = "challan_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    challan_id = Column(UUID(as_uuid=True), ForeignKey("delivery_challans.id"), nullable=False)
    order_item_id = Column(UUID(as_uuid=True), ForeignKey("order_items.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    challan = relationship("DeliveryChallan", back_populates="challan_items")
    order_item = relationship("OrderItem")

class MaterialOut(Base):
    __tablename__ = "material_out"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    challan_id = Column(UUID(as_uuid=True), ForeignKey("delivery_challans.id"), nullable=False)
    material_type = Column(Enum(MaterialType, name='material_type'), nullable=False)
    quantity = Column(Integer, nullable=False)
    dispatch_date = Column(DateTime(timezone=True), server_default=func.now())
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    challan = relationship("DeliveryChallan")
    creator = relationship("User")

class GSTInvoice(Base):
    __tablename__ = "gst_invoices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    invoice_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    invoice_date = Column(DateTime(timezone=True), server_default=func.now())
    subtotal = Column(Numeric(12, 2), default=0)
    cgst_rate = Column(Numeric(5, 2), default=9.00)
    sgst_rate = Column(Numeric(5, 2), default=9.00)
    igst_rate = Column(Numeric(5, 2), default=0.00)
    cgst_amount = Column(Numeric(12, 2), default=0)
    sgst_amount = Column(Numeric(12, 2), default=0)
    igst_amount = Column(Numeric(12, 2), default=0)
    total_amount = Column(Numeric(12, 2), default=0)
    outstanding_amount = Column(Numeric(12, 2), default=0)
    notes = Column(Text)
    is_deleted = Column(Boolean, default=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    customer = relationship("Customer")
    invoice_challans = relationship("InvoiceChallan", back_populates="invoice")
    payments = relationship("Payment", back_populates="invoice")
    creator = relationship("User")

class InvoiceChallan(Base):
    __tablename__ = "invoice_challans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("gst_invoices.id"), nullable=False)
    challan_id = Column(UUID(as_uuid=True), ForeignKey("delivery_challans.id"), nullable=False)
    challan_amount = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    invoice = relationship("GSTInvoice", back_populates="invoice_challans")
    challan = relationship("DeliveryChallan")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("gst_invoices.id"), nullable=False)
    payment_date = Column(DateTime(timezone=True), server_default=func.now())
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(Enum(PaymentMethod, name='payment_method'), nullable=False)
    reference_number = Column(String(100))
    notes = Column(Text)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    invoice = relationship("GSTInvoice", back_populates="payments")
    creator = relationship("User")

class Return(Base):
    __tablename__ = "returns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    order_item_id = Column(UUID(as_uuid=True), ForeignKey("order_items.id"), nullable=False)
    return_date = Column(DateTime(timezone=True), server_default=func.now())
    quantity = Column(Integer, nullable=False)
    reason = Column(Enum(ReturnReason, name='return_reason'), nullable=False)
    refund_amount = Column(Numeric(10, 2), default=0)
    is_adjustment = Column(Boolean, default=False)
    adjustment_amount = Column(Numeric(10, 2), default=0)
    notes = Column(Text)
    is_deleted = Column(Boolean, default=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    order_item = relationship("OrderItem")
    creator = relationship("User")

class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    item_name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    current_stock = Column(Numeric(10, 2), default=0)
    unit = Column(String(20), nullable=False)
    reorder_level = Column(Numeric(10, 2), default=0)
    cost_per_unit = Column(Numeric(10, 2), default=0)
    supplier_name = Column(String(100))
    supplier_contact = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by_user_id])
    updater = relationship("User", foreign_keys=[updated_by_user_id])

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    expense_date = Column(DateTime(timezone=True), server_default=func.now())
    category = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(Enum(PaymentMethod, name='payment_method'), nullable=False)
    reference_number = Column(String(100))
    notes = Column(Text)
    is_deleted = Column(Boolean, default=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    creator = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    table_name = Column(String(100), nullable=False)
    record_id = Column(String(255), nullable=False)
    old_values = Column(Text)
    new_values = Column(Text)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User") 