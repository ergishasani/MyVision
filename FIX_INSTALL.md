# Fix Installation Issues

## Problem
`react-hot-toast` and other dependencies are not installed in `node_modules`.

## Solution

### Step 1: Install Frontend Dependencies

Open PowerShell or Command Prompt in the **frontend** directory and run:

```powershell
cd C:\Users\gisih\OneDrive\Desktop\TestingCursor\frontend
npm install
```

### Step 2: Verify Installation

Check if `react-hot-toast` is installed:

```powershell
dir node_modules\react-hot-toast
```

If it exists, you should see the folder.

### Step 3: If npm install fails

Try these alternatives:

**Option A: Clear cache and reinstall**
```powershell
npm cache clean --force
rm -r node_modules
rm package-lock.json
npm install
```

**Option B: Install specific package**
```powershell
npm install react-hot-toast@^2.4.1
```

**Option C: Use yarn instead**
```powershell
yarn install
```

### Step 4: Install Backend Dependencies

```powershell
cd C:\Users\gisih\OneDrive\Desktop\TestingCursor\backend
npm install
```

### Step 5: Start Servers

**Terminal 1 - Backend:**
```powershell
cd C:\Users\gisih\OneDrive\Desktop\TestingCursor\backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd C:\Users\gisih\OneDrive\Desktop\TestingCursor\frontend
npm run dev
```

## Quick Fix Script

You can also double-click `install-deps.bat` in the project root to install all dependencies automatically.
