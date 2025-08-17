# 🔧 Supabase CLI Installation Fix

## ⚠️ **Important Update:**

Supabase CLI **cannot be installed globally via npm** anymore. The documentation has been updated.

## ✅ **Correct Installation Methods:**

### **Option 1: Use npx (Recommended - No Installation Needed)**
```bash
# No installation required - just use npx
npx supabase --version
npx supabase init
npx supabase start
npx supabase db push
```

### **Option 2: Official Installer**

#### **Linux/macOS:**
```bash
curl -fsSL https://supabase.com/install.sh | sh
```

#### **macOS with Homebrew:**
```bash
brew install supabase/tap/supabase
```

#### **Windows with Scoop:**
```bash
scoop install supabase
```

## 🚀 **Updated Setup Process:**

```bash
# 1. Supabase CLI (use npx)
npx supabase --version

# 2. Vercel CLI (global install works)
npm install -g vercel

# 3. Run setup script
python3 setup_supabase_migration.py

# 4. When prompted, use npx commands:
npx supabase db push
npx supabase start
```

## 📝 **Documentation Updated:**

All documentation files have been updated to reflect the correct installation method:
- README.md
- SETUP_GUIDE_SUPABASE.md
- DEPLOYMENT_GUIDE_SUPABASE.md
- setup_supabase_migration.py

## ✅ **You Can Proceed:**

Since `npx supabase init` worked for you, continue with npx for all Supabase commands!