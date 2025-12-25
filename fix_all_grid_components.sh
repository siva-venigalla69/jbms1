#!/bin/bash
# Fix all Grid component issues in simplified pages
# Replaces Grid with Grid2 for MUI v7 compatibility

cd /home/siva/sandboxes/jbms1/frontend/src/pages

FILES=(
  "InvoicesSimplified.tsx"
  "MaterialReceiptSimplified.tsx"
  "MisprintSalesSimplified.tsx"
  "PaymentsSimplified.tsx"
  "ProductionStock.tsx"
  "ReturnsSimplified.tsx"
)

echo "=========================================="
echo "Fixing Grid components in all files..."
echo "=========================================="
echo ""

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"

    # Replace Grid import with Grid2
    sed -i 's/Grid,/Grid2,/g' "$file"
    sed -i 's/, Grid,/, Grid2,/g' "$file"
    sed -i 's/Grid$/Grid2/g' "$file"

    # Replace Grid container with Grid2 container
    sed -i 's/<Grid container/<Grid2 container/g' "$file"

    # Replace Grid item patterns
    sed -i 's/<Grid item xs={12}>/<Grid2 size={{ xs: 12 }}>/g' "$file"
    sed -i 's/<Grid item xs={12} sm={6}>/<Grid2 size={{ xs: 12, sm: 6 }}>/g' "$file"
    sed -i 's/<Grid item xs={12} md={6}>/<Grid2 size={{ xs: 12, md: 6 }}>/g' "$file"
    sed -i 's/<Grid item xs={12} sm={6} md={3}>/<Grid2 size={{ xs: 12, sm: 6, md: 3 }}>/g' "$file"
    sed -i 's/<Grid item xs={12} sm={6} md={4}>/<Grid2 size={{ xs: 12, sm: 6, md: 4 }}>/g' "$file"
    sed -i 's/<Grid item xs={12} md={4}>/<Grid2 size={{ xs: 12, md: 4 }}>/g' "$file"
    sed -i 's/<Grid item xs={12} md={8}>/<Grid2 size={{ xs: 12, md: 8 }}>/g' "$file"
    sed -i 's/<Grid item xs={12} md={2\.4}>/<Grid2 size={{ xs: 12, md: 2.4 }}>/g' "$file"

    # Replace closing Grid tags
    sed -i 's/<\/Grid>/<\/Grid2>/g' "$file"

    echo "  ✅ Fixed: $file"
  else
    echo "  ⚠️  Not found: $file"
  fi
done

echo ""
echo "=========================================="
echo "All Grid components fixed!"
echo "=========================================="
echo ""
echo "Checking for any remaining Grid references..."
echo ""

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    remaining=$(grep -c "Grid[^2]" "$file" | grep -v "//" || echo "0")
    if [ "$remaining" != "0" ]; then
      echo "⚠️  $file still has $remaining Grid references"
      grep -n "Grid[^2]" "$file" | head -3
    else
      echo "✅ $file - all Grid references updated"
    fi
  fi
done

echo ""
echo "Done!"
