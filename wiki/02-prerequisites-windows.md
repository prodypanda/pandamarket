# 02 — Prerequisites (Windows)

This guide lists **everything you need to install** on a Windows computer before you can run PandaMarket locally.

---

## 1. Node.js (v20 or higher)

Node.js is the JavaScript runtime that powers both the backend and frontend.

### Steps:
1. Go to **https://nodejs.org/**
2. Download the **LTS** version (must be v20 or newer)
3. Run the installer — click **Next** through all steps
4. ✅ Make sure to check **"Add to PATH"** during installation
5. After installation, open **PowerShell** and verify:

```powershell
node --version
# Should show v20.x.x or higher

npm --version
# Should show 10.x.x or higher
```

> ⚠️ If `npm --version` shows less than 10, update it:
> ```powershell
> npm install -g npm@latest
> ```

---

## 2. Git

Git is used to clone and manage the project code.

### Steps:
1. Go to **https://git-scm.com/download/win**
2. Download and run the installer
3. Use all default settings (just click Next)
4. Verify in PowerShell:

```powershell
git --version
# Should show git version 2.x.x
```

---

## 3. Docker Desktop

Docker runs the infrastructure services (PostgreSQL, Redis, Meilisearch, MinIO) in isolated containers so you don't have to install them individually.

### Steps:
1. Go to **https://www.docker.com/products/docker-desktop/**
2. Download **Docker Desktop for Windows**
3. Run the installer
4. **Important:** During installation, ensure **"Use WSL 2 instead of Hyper-V"** is checked
5. Restart your computer when prompted
6. Open Docker Desktop and wait for it to say **"Docker Desktop is running"**
7. Verify in PowerShell:

```powershell
docker --version
# Should show Docker version 24.x.x or higher

docker compose version
# Should show Docker Compose version v2.x.x
```

> 💡 **WSL 2 Required:** Docker Desktop needs Windows Subsystem for Linux 2. If it asks you to install it, follow the prompts. You can also install it manually:
> ```powershell
> wsl --install
> ```

---

## 4. Visual Studio Code (Recommended)

VS Code is the recommended code editor.

### Steps:
1. Go to **https://code.visualstudio.com/**
2. Download and install
3. Recommended extensions to install:
   - **ESLint** — JavaScript linting
   - **Prettier** — Code formatting
   - **Tailwind CSS IntelliSense** — Tailwind autocomplete
   - **Docker** — Docker file support

---

## 5. PowerShell (Already Installed)

Windows comes with PowerShell pre-installed. All commands in this wiki use PowerShell.

To open PowerShell:
- Press `Win + X` → Select **"Terminal"** or **"PowerShell"**
- Or search for "PowerShell" in the Start menu

---

## ✅ Checklist

Before proceeding, make sure all of these return a valid version:

```powershell
node --version     # v20.x.x+
npm --version      # 10.x.x+
git --version      # 2.x.x+
docker --version   # 24.x.x+
docker compose version  # v2.x.x+
```

If everything checks out, proceed to **[03 — Local Setup Guide](03-local-setup.md)**.
