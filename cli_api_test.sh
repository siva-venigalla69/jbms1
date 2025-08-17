#!/bin/bash

# CLI API Testing Script for Digital Textile Printing System
# Usage: ./cli_api_test.sh [endpoint]

# Configuration
SUPABASE_URL="https://pvatfzwzfgioypdnqjay.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 CLI API Tester for Digital Textile Printing System${NC}"
echo "================================================================="

# Function to get auth token
get_auth_token() {
    echo -e "${YELLOW}🔐 Getting authentication token...${NC}"
    
    AUTH_RESPONSE=$(curl -s -X POST \
        "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "shiva.venigalla@gmail.com",
            "password": "Admin@123!"
        }')
    
    # Check if jq is available
    if command -v jq &> /dev/null; then
        AUTH_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token')
        if [ "$AUTH_TOKEN" = "null" ]; then
            echo -e "${RED}❌ Authentication failed${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  jq not found. Install with: brew install jq${NC}"
        AUTH_TOKEN="MANUAL_EXTRACT_NEEDED"
    fi
    
    echo -e "${GREEN}✅ Authentication successful${NC}"
}

# Function to test API endpoint
test_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    local data=$3
    
    echo -e "\n${BLUE}📡 Testing: ${method} ${endpoint}${NC}"
    
    if [ "$method" = "GET" ]; then
        curl -s -X GET \
            "${SUPABASE_URL}/rest/v1/${endpoint}" \
            -H "apikey: ${SUPABASE_ANON_KEY}" \
            -H "Authorization: Bearer ${AUTH_TOKEN}" \
            | jq '.' 2>/dev/null || echo "Response received (install jq for formatting)"
    elif [ "$method" = "POST" ]; then
        curl -s -X POST \
            "${SUPABASE_URL}/rest/v1/${endpoint}" \
            -H "apikey: ${SUPABASE_ANON_KEY}" \
            -H "Authorization: Bearer ${AUTH_TOKEN}" \
            -H "Content-Type: application/json" \
            -H "Prefer: return=representation" \
            -d "$data" \
            | jq '.' 2>/dev/null || echo "Response received (install jq for formatting)"
    fi
}

# Get authentication token first
get_auth_token

# Test based on argument or run random tests
case $1 in
    "customers")
        test_endpoint "customers?limit=5"
        ;;
    "orders")
        test_endpoint "orders?select=*,customers(name)&limit=3"
        ;;
    "production")
        test_endpoint "order_items?select=*,orders(order_number),production_stages(name)&limit=5"
        ;;
    "invoices")
        test_endpoint "gst_invoices?select=*,customers(name)&limit=3"
        ;;
    "payments")
        test_endpoint "payments?select=*,gst_invoices(invoice_number)&limit=3"
        ;;
    "create-customer")
        test_endpoint "customers" "POST" '{
            "name": "CLI Test Customer",
            "phone": "9999888777",
            "email": "cli@example.com",
            "address": "CLI Test Address"
        }'
        ;;
    "random"|"")
        echo -e "\n${BLUE}🎲 Running random API tests...${NC}"
        test_endpoint "customers?limit=2"
        test_endpoint "orders?select=*,customers(name)&limit=2"
        test_endpoint "order_items?select=*,orders(order_number)&limit=2"
        test_endpoint "gst_invoices?limit=1"
        ;;
    "help"|"-h"|"--help")
        echo ""
        echo "Usage: $0 [endpoint]"
        echo ""
        echo "Available endpoints:"
        echo "  customers      - List customers"
        echo "  orders         - List orders with customer info"
        echo "  production     - List production items"
        echo "  invoices       - List GST invoices"
        echo "  payments       - List payments"
        echo "  create-customer - Create a test customer"
        echo "  random         - Run random tests (default)"
        echo "  help           - Show this help"
        echo ""
        echo "Examples:"
        echo "  $0                    # Run random tests"
        echo "  $0 customers          # Test customers API"
        echo "  $0 create-customer    # Create a test customer"
        ;;
    *)
        echo -e "${RED}❌ Unknown endpoint: $1${NC}"
        echo "Use '$0 help' to see available options"
        exit 1
        ;;
esac

echo -e "\n${GREEN}🎉 CLI API testing complete!${NC}"