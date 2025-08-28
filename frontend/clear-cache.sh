#!/bin/bash

# Clear React Development Cache Script
# Run this script if you're having browser caching issues

echo "🧹 Clearing React development caches..."

# Kill any running React servers
echo "📴 Stopping React development server..."
pkill -f "react-scripts start" || echo "No React server running"

# Clear React cache directories
echo "🗑️  Clearing cache directories..."
rm -rf node_modules/.cache
rm -rf build
rm -rf .cache

# Clear browser cache instructions
echo ""
echo "🌐 Manual Browser Cache Clearing:"
echo "   Chrome: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo "   Firefox: Ctrl+F5 (or Cmd+Shift+R on Mac)" 
echo "   Safari: Cmd+Option+R"
echo ""
echo "Or open DevTools → Application → Storage → Clear site data"

# Update cache buster
CURRENT_DATE=$(date +%Y%m%d_%H%M)
echo "🔄 Updating cache buster to: $CURRENT_DATE"
sed -i "s/REACT_APP_CACHE_BUSTER=.*/REACT_APP_CACHE_BUSTER=$CURRENT_DATE/" .env

echo ""
echo "✅ Cache clearing completed!"
echo "🚀 Now run: npm start"
echo ""
echo "📋 If problems persist:"
echo "   1. Close all browser tabs for this app"
echo "   2. Clear browser data manually"  
echo "   3. Try incognito/private browsing mode"
echo "   4. Restart your browser completely"

chmod +x clear-cache.sh