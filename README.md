# Download Bunny

<p align="center"><img src="./download-bunny.png" alt="Download Bunny" width="400"/></p>

> **Early Development:** Download Bunny is in early development. Expect bugs, missing features, and breaking changes.

Download Bunny is a desktop app that lets you download videos from YouTube and hundreds of other websites. It is a graphical wrapper around [yt-dlp](https://github.com/yt-dlp/yt-dlp).

## Installation

> **Note:** Download Bunny does not bundle `yt-dlp` or `ffmpeg`. You must install them separately and make sure they are available in your `PATH`.
>
> **yt-dlp**
> ```bash
> # macOS
> brew install yt-dlp
>
> # Debian / Ubuntu
> sudo apt install yt-dlp
>
> # Fedora / RHEL
> sudo dnf install yt-dlp
>
> # Windows
> winget install yt-dlp
> ```
> For other installation options see https://github.com/yt-dlp/yt-dlp#installation
>
> **ffmpeg**
> ```bash
> # macOS (Homebrew recommended — no official Apple Silicon builds)
> brew install ffmpeg
>
> # Debian / Ubuntu
> sudo apt install ffmpeg
>
> # Fedora / RHEL
> sudo dnf install ffmpeg
>
> # Windows
> winget install ffmpeg
> ```
> For other installation options see https://ffmpeg.org/download.html

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
