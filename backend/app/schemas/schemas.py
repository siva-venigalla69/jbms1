from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from uuid import UUID
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
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

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
    id: str  # UUID as string
    created_at: datetime
    updated_at: datetime

class CustomerSearchResult(BaseSchema):
    id: str  # UUID as string
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None

class CustomerSearchResponse(BaseSchema):
    query: str
    count: int
    results: List[CustomerSearchResult]

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
    id: str  # UUID as string
    order_id: str  # UUID as string
    current_stage: ProductionStage
    pre_treatment_completed_at: Optional[datetime] = None
    printing_completed_at: Optional[datetime] = None
    post_process_completed_at: Optional[datetime] = None
    created_at: datetime

class OrderBase(BaseSchema):
    customer_id: str  # UUID as string
    order_date: Optional[datetime] = None
    status: OrderStatus = OrderStatus.PENDING
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    order_items: List[OrderItemCreate]

class OrderUpdate(BaseSchema):
    customer_id: Optional[str] = None  # UUID as string
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None

class OrderResponse(OrderBase):
    id: str  # UUID as string
    order_number: str
    total_amount: Decimal
    order_items: List[OrderItemResponse]
    customer: CustomerResponse
    created_at: datetime
    updated_at: datetime

# Material In schemas
class MaterialInBase(BaseSchema):
    order_id: Optional[str] = None  # UUID as string
    material_type: MaterialType
    quantity: int = Field(..., gt=0)
    unit: str = Field(..., min_length=1, max_length=20)
    received_date: Optional[datetime] = None
    notes: Optional[str] = None

class MaterialInCreate(MaterialInBase):
    pass

class MaterialInResponse(MaterialInBase):
    id: str  # UUID as string
    created_at: datetime

# Production Stage Update
class ProductionStageUpdate(BaseSchema):
    order_item_id: str  # UUID as string
    stage: ProductionStage
    notes: Optional[str] = None

# Delivery Challan schemas
class ChallanItemBase(BaseSchema):
    order_item_id: str  # UUID as string
    quantity: int = Field(..., gt=0)

class ChallanItemCreate(ChallanItemBase):
    pass

class ChallanItemResponse(ChallanItemBase):
    id: str  # UUID as string
    challan_id: str  # UUID as string
    order_item: OrderItemResponse

class DeliveryChallanBase(BaseSchema):
    customer_id: str  # UUID as string
    challan_date: Optional[datetime] = None
    delivery_status: str = "pending"
    notes: Optional[str] = None

class DeliveryChallanCreate(DeliveryChallanBase):
    challan_items: List[ChallanItemCreate]

class DeliveryChallanUpdate(BaseSchema):
    customer_id: Optional[str] = None  # UUID as string
    delivery_status: Optional[str] = None
    notes: Optional[str] = None

class DeliveryChallanResponse(DeliveryChallanBase):
    id: str  # UUID as string
    challan_number: str
    total_quantity: int
    challan_items: List[ChallanItemResponse]
    customer: CustomerResponse
    created_at: datetime

# Material Out schemas
class MaterialOutBase(BaseSchema):
    challan_id: str  # UUID as string
    material_type: MaterialType
    quantity: int = Field(..., gt=0)
    dispatch_date: Optional[datetime] = None

class MaterialOutCreate(MaterialOutBase):
    pass

class MaterialOutResponse(MaterialOutBase):
    id: str  # UUID as string
    created_at: datetime

# GST Invoice schemas - Updated to use InvoiceChallan instead of InvoiceItem
class InvoiceChallanBase(BaseSchema):
    challan_id: str  # UUID as string
    challan_amount: Decimal = Field(default=0, ge=0)

class InvoiceChallanCreate(InvoiceChallanBase):
    pass

class InvoiceChallanResponse(InvoiceChallanBase):
    id: str  # UUID as string
    invoice_id: str  # UUID as string
    challan: DeliveryChallanResponse

class GSTInvoiceBase(BaseSchema):
    customer_id: str  # UUID as string
    invoice_date: Optional[datetime] = None
    cgst_rate: Decimal = Field(default=9.00, ge=0, le=30)
    sgst_rate: Decimal = Field(default=9.00, ge=0, le=30)
    igst_rate: Decimal = Field(default=0.00, ge=0, le=30)

class GSTInvoiceCreate(GSTInvoiceBase):
    challan_ids: List[str]  # List of UUID strings

class GSTInvoiceUpdate(BaseSchema):
    customer_id: Optional[str] = None  # UUID as string
    cgst_rate: Optional[Decimal] = Field(None, ge=0, le=30)
    sgst_rate: Optional[Decimal] = Field(None, ge=0, le=30)
    igst_rate: Optional[Decimal] = Field(None, ge=0, le=30)

class GSTInvoiceResponse(GSTInvoiceBase):
    id: str  # UUID as string
    invoice_number: str
    subtotal: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    total_amount: Decimal
    outstanding_amount: Decimal
    invoice_challans: List[InvoiceChallanResponse]  # Updated from invoice_items
    customer: CustomerResponse
    created_at: datetime

# Payment schemas
class PaymentBase(BaseSchema):
    invoice_id: str  # UUID as string
    payment_date: Optional[datetime] = None
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: str  # UUID as string
    created_at: datetime

# Return schemas - Updated from CustomerReturn to Return
class ReturnBase(BaseSchema):
    order_item_id: str  # UUID as string
    return_date: Optional[datetime] = None
    quantity: int = Field(..., gt=0)  # Updated from returned_quantity
    reason: ReturnReason  # Updated from return_reason
    refund_amount: Decimal = Field(default=0, ge=0)
    is_adjustment: bool = False
    adjustment_amount: Decimal = Field(default=0, ge=0)  # Added field
    notes: Optional[str] = None

class ReturnCreate(ReturnBase):
    pass

class ReturnResponse(ReturnBase):
    id: str  # UUID as string
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
    id: str  # UUID as string
    is_active: bool  # Added field
    updated_at: datetime
    created_at: datetime

# Expense schemas
class ExpenseBase(BaseSchema):
    expense_date: Optional[datetime] = None
    category: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1)
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    reference_number: Optional[str] = None  # Updated from receipt_number
    notes: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: str  # UUID as string
    created_at: datetime

# Report schemas
class DateRangeFilter(BaseSchema):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class PendingOrdersReport(BaseSchema):
    order_id: str  # UUID as string
    order_number: str
    customer_name: str
    order_date: datetime
    total_amount: Decimal
    current_status: OrderStatus

class ProductionStatusReport(BaseSchema):
    order_item_id: str  # UUID as string
    order_number: str
    customer_name: str
    material_type: MaterialType
    quantity: int
    current_stage: ProductionStage
    stage_completed_at: Optional[datetime]

class PendingReceivablesReport(BaseSchema):
    invoice_id: str  # UUID as string
    invoice_number: str
    customer_name: str
    invoice_date: datetime
    total_amount: Decimal
    outstanding_amount: Decimal
    days_outstanding: int

class StockHoldingReport(BaseSchema):
    item_id: str  # UUID as string
    item_name: str
    category: str
    current_stock: Decimal
    unit: str
    reorder_level: Decimal
    is_low_stock: bool
    stock_value: Decimal

# Response wrappers
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