#!/bin/bash
# Revert Grid2 back to Grid and use Stack/Box for layout instead
# Since Grid2 is not available in this MUI version

cd /home/siva/sandboxes/jbms1/frontend/src/pages

FILES=(
  "DeliveriesSimplified.tsx"
  "SimplifiedDashboard.tsx"
  "InvoicesSimplified.tsx"
  "MaterialReceiptSimplified.tsx"
  "MisprintSalesSimplified.tsx"
  "PaymentsSimplified.tsx"
  "ProductionStock.tsx"
  "ReturnsSimplified.tsx"
)

echo "=========================================="
echo "Reverting Grid2 back to Grid..."
echo "=========================================="
echo ""

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"

    # Revert import
    sed -i 's/Grid2,/Grid,/g' "$file"
    sed -i 's/, Grid2,/, Grid,/g' "$file"

    # Revert component names
    sed -i 's/<Grid2/<Grid/g' "$file"
    sed -i 's/<\/Grid2>/<\/Grid>/g' "$file"

    # Convert size prop back to item prop with individual props
    sed -i 's/size={{ xs: 12 }}/item xs={12}/g' "$file"
    sed -i 's/size={{ xs: 12, sm: 6 }}/item xs={12} sm={6}/g' "$file"
    sed -i 's/size={{ xs: 12, md: 4 }}/item xs={12} md={4}/g' "$file"
    sed -i 's/size={{ xs: 12, md: 5 }}/item xs={12} md={5}/g' "$file"
    sed -i 's/size={{ xs: 12, md: 6 }}/item xs={12} md={6}/g' "$file"
    sed -i 's/size={{ xs: 12, md: 7 }}/item xs={12} md={7}/g' "$file"
    sed -i 's/size={{ xs: 12, md: 8 }}/item xs={12} md={8}/g' "$file"
    sed -i 's/size={{ xs: 12, sm: 6, md: 3 }}/item xs={12} sm={6} md={3}/g' "$file"
    sed -i 's/size={{ xs: 12, sm: 6, md: 4 }}/item xs={12} sm={6} md={4}/g' "$file"
    sed -i 's/size={{ xs: 12, md: 2\.4 }}/item xs={12} md={2.4}/g' "$file"
    sed -i 's/size={{ xs: 6 }}/item xs={6}/g' "$file"

    echo "  ✅ Reverted: $file"
  fi
done

echo ""
echo "Done!"
