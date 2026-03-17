# Download Bunny

![Download Bunny](./download-bunny.png)

## Installation

Download the latest stable release from the [Latest Release](https://github.com/thecotne/download-bunny/releases/latest) page, or pick a nightly build from [All Releases](https://github.com/thecotne/download-bunny/releases).

> **Note:** All builds are currently unsigned. Your OS may warn you before running the app — follow the platform-specific steps below to proceed.

### macOS

Download the `.dmg` file, open it, and drag the app to your Applications folder.

Because the app is unsigned, macOS will block it on first launch:

1. Right-click the app in Applications and choose **Open**
2. Click **Open** in the dialog that appears

Alternatively: **System Settings → Privacy & Security → Open Anyway** (after a blocked launch attempt).

### Windows

Download the `.exe` (NSIS) or `.msi` installer and run it.

Because the app is unsigned, Windows SmartScreen will show a warning:

1. Click **More info**
2. Click **Run anyway**

### Linux

**AppImage**
```bash
chmod +x Download-Bunny_*.AppImage
./Download-Bunny_*.AppImage
```

**Debian / Ubuntu**
```bash
sudo dpkg -i download-bunny_*.deb
```

**Fedora / RHEL**
```bash
sudo rpm -i download-bunny-*.rpm
```

### Android

Download the `.apk` file and install it on your device.

Because it's not from the Play Store, you need to allow installation from unknown sources:

- **Android 8+:** When prompted, tap **Settings → Allow from this source** for your browser or file manager
- Open the downloaded `.apk` to install

### iOS

iOS release builds are not available yet.

---

## Development

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
