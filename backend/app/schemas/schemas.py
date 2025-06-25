from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, EmailStr
from ..models.models import UserRole, OrderStatus, MaterialType, ProductionStage, PaymentMethod, ReturnReason

# Base schemas
class BaseSchema(BaseModel):
    class Config:
        from_attributes = True

# User schemas
class UserBase(BaseSchema):
    username: str
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.EMPLOYEE
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseSchema):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Authentication schemas
class Token(BaseSchema):
    access_token: str
    token_type: str

class TokenData(BaseSchema):
    username: Optional[str] = None

class LoginRequest(BaseSchema):
    username: str
    password: str

# Customer schemas
class CustomerBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    gst_number: Optional[str] = Field(None, max_length=15)

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    gst_number: Optional[str] = Field(None, max_length=15)

class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Order schemas
class OrderItemBase(BaseSchema):
    material_type: MaterialType
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    customization_details: Optional[str] = None

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemUpdate(BaseSchema):
    material_type: Optional[MaterialType] = None
    quantity: Optional[int] = Field(None, gt=0)
    unit_price: Optional[Decimal] = Field(None, gt=0)
    customization_details: Optional[str] = None
    current_stage: Optional[ProductionStage] = None

class OrderItemResponse(OrderItemBase):
    id: int
    order_id: int
    current_stage: ProductionStage
    pre_treatment_completed_at: Optional[datetime] = None
    printing_completed_at: Optional[datetime] = None
    post_process_completed_at: Optional[datetime] = None
    created_at: datetime

class OrderBase(BaseSchema):
    customer_id: int
    order_date: Optional[datetime] = None
    status: OrderStatus = OrderStatus.PENDING
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    order_items: List[OrderItemCreate]

class OrderUpdate(BaseSchema):
    customer_id: Optional[int] = None
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None

class OrderResponse(OrderBase):
    id: int
    order_number: str
    total_amount: Decimal
    order_items: List[OrderItemResponse]
    customer: CustomerResponse
    created_at: datetime
    updated_at: datetime

# Material In schemas
class MaterialInBase(BaseSchema):
    order_id: Optional[int] = None
    material_type: MaterialType
    quantity: int = Field(..., gt=0)
    unit: str = Field(..., min_length=1, max_length=20)
    received_date: Optional[datetime] = None
    notes: Optional[str] = None

class MaterialInCreate(MaterialInBase):
    pass

class MaterialInResponse(MaterialInBase):
    id: int
    created_at: datetime

# Production Stage Update
class ProductionStageUpdate(BaseSchema):
    order_item_id: int
    stage: ProductionStage
    notes: Optional[str] = None

# Delivery Challan schemas
class ChallanItemBase(BaseSchema):
    order_item_id: int
    quantity: int = Field(..., gt=0)

class ChallanItemCreate(ChallanItemBase):
    pass

class ChallanItemResponse(ChallanItemBase):
    id: int
    challan_id: int
    order_item: OrderItemResponse

class DeliveryChallanBase(BaseSchema):
    customer_id: int
    challan_date: Optional[datetime] = None
    delivery_status: str = "pending"
    notes: Optional[str] = None

class DeliveryChallanCreate(DeliveryChallanBase):
    challan_items: List[ChallanItemCreate]

class DeliveryChallanUpdate(BaseSchema):
    customer_id: Optional[int] = None
    delivery_status: Optional[str] = None
    notes: Optional[str] = None

class DeliveryChallanResponse(DeliveryChallanBase):
    id: int
    challan_number: str
    total_quantity: int
    challan_items: List[ChallanItemResponse]
    customer: CustomerResponse
    created_at: datetime

# Material Out schemas
class MaterialOutBase(BaseSchema):
    challan_id: int
    material_type: MaterialType
    quantity: int = Field(..., gt=0)
    dispatch_date: Optional[datetime] = None

class MaterialOutCreate(MaterialOutBase):
    pass

class MaterialOutResponse(MaterialOutBase):
    id: int
    created_at: datetime

# GST Invoice schemas
class InvoiceItemBase(BaseSchema):
    challan_id: int
    description: Optional[str] = None
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    amount: Decimal = Field(..., gt=0)

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemResponse(InvoiceItemBase):
    id: int
    invoice_id: int
    challan: DeliveryChallanResponse

class GSTInvoiceBase(BaseSchema):
    customer_id: int
    invoice_date: Optional[datetime] = None
    cgst_rate: Decimal = Field(default=9.00, ge=0, le=30)
    sgst_rate: Decimal = Field(default=9.00, ge=0, le=30)
    igst_rate: Decimal = Field(default=0.00, ge=0, le=30)

class GSTInvoiceCreate(GSTInvoiceBase):
    challan_ids: List[int]

class GSTInvoiceUpdate(BaseSchema):
    customer_id: Optional[int] = None
    cgst_rate: Optional[Decimal] = Field(None, ge=0, le=30)
    sgst_rate: Optional[Decimal] = Field(None, ge=0, le=30)
    igst_rate: Optional[Decimal] = Field(None, ge=0, le=30)

class GSTInvoiceResponse(GSTInvoiceBase):
    id: int
    invoice_number: str
    subtotal: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    total_amount: Decimal
    outstanding_amount: Decimal
    invoice_items: List[InvoiceItemResponse]
    customer: CustomerResponse
    created_at: datetime

# Payment schemas
class PaymentBase(BaseSchema):
    invoice_id: int
    payment_date: Optional[datetime] = None
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: int
    created_at: datetime

# Customer Return schemas
class CustomerReturnBase(BaseSchema):
    order_item_id: int
    return_date: Optional[datetime] = None
    returned_quantity: int = Field(..., gt=0)
    return_reason: ReturnReason
    refund_amount: Decimal = Field(default=0, ge=0)
    is_adjustment: bool = False
    notes: Optional[str] = None

class CustomerReturnCreate(CustomerReturnBase):
    pass

class CustomerReturnResponse(CustomerReturnBase):
    id: int
    refund_processed: bool
    order_item: OrderItemResponse
    created_at: datetime

# Inventory schemas
class InventoryBase(BaseSchema):
    item_name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    current_stock: Decimal = Field(default=0, ge=0)
    unit: str = Field(..., min_length=1, max_length=20)
    reorder_level: Decimal = Field(default=0, ge=0)
    cost_per_unit: Decimal = Field(default=0, ge=0)
    supplier_info: Optional[str] = None

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseSchema):
    item_name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    current_stock: Optional[Decimal] = Field(None, ge=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    reorder_level: Optional[Decimal] = Field(None, ge=0)
    cost_per_unit: Optional[Decimal] = Field(None, ge=0)
    supplier_info: Optional[str] = None

class InventoryResponse(InventoryBase):
    id: int
    updated_at: datetime
    created_at: datetime

# Expense schemas
class ExpenseBase(BaseSchema):
    expense_date: Optional[datetime] = None
    category: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1)
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    receipt_number: Optional[str] = None
    notes: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime

# Report schemas
class DateRangeFilter(BaseSchema):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class PendingOrdersReport(BaseSchema):
    order_id: int
    order_number: str
    customer_name: str
    order_date: datetime
    total_amount: Decimal
    current_status: OrderStatus

class ProductionStatusReport(BaseSchema):
    order_item_id: int
    order_number: str
    customer_name: str
    material_type: MaterialType
    quantity: int
    current_stage: ProductionStage
    stage_completed_at: Optional[datetime]

class PendingReceivablesReport(BaseSchema):
    invoice_id: int
    invoice_number: str
    customer_name: str
    invoice_date: datetime
    total_amount: Decimal
    outstanding_amount: Decimal
    days_outstanding: int

class StockHoldingReport(BaseSchema):
    item_id: int
    item_name: str
    category: str
    current_stock: Decimal
    unit: str
    reorder_level: Decimal
    is_low_stock: bool
    stock_value: Decimal

# Response wrapper
class ResponseWrapper(BaseSchema):
    success: bool = True
    message: str = "Success"
    data: Optional[dict] = None

class PaginatedResponse(BaseSchema):
    items: List[dict]
    total: int
    page: int = 1
    per_page: int = 10
    total_pages: int 