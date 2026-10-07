#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════════
# setup-linux.sh — Bootstrap script to set up STBlock development
# environment on Linux (Ubuntu/Debian/Fedora/Arch)
# ════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

detect_distro() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        echo "$ID"
    else
        echo "unknown"
    fi
}

install_system_deps() {
    local distro="$1"
    log_info "Installing system dependencies for $distro..."

    case "$distro" in
        ubuntu|debian|pop|linuxmint|kubuntu|xubuntu)
            sudo apt update
            sudo apt install -y \
                libwebkit2gtk-4.1-dev \
                libgtk-3-dev \
                libayatana-appindicator3-dev \
                librsvg2-dev \
                libudev-dev \
                libssl-dev \
                libwebkit2gtk-4.1-0 \
                libjavascriptcoregtk-4.1-0 \
                gcc \
                g++ \
                make \
                pkg-config \
                curl \
                wget \
                git \
                libasound2-dev \
                libpulse-dev \
                libx11-dev \
                libxrandr-dev \
                libxi-dev \
                libxcursor-dev \
                libxinerama-dev \
                libxcomposite-dev \
                libxdamage-dev \
                libxfixes-dev \
                libxext-dev \
                libxrender-dev \
                libxtst-dev \
                libglib2.0-dev \
                libcairo2-dev \
                libpango1.0-dev \
                libatk1.0-dev \
                libgdk-pixbuf2.0-dev
            ;;
        fedora|rhel|centos|rocky|almalinux)
            sudo dnf install -y \
                webkit2gtk4.1-devel \
                gtk3-devel \
                libayatana-appindicator-gtk3-devel \
                librsvg2-devel \
                libudev-devel \
                openssl-devel \
                webkit2gtk4.1 \
                javascriptcoregtk4.1 \
                gcc \
                gcc-c++ \
                make \
                pkgconfig \
                curl \
                wget \
                git \
                alsa-lib-devel \
                pulseaudio-libs-devel \
                libX11-devel \
                libXrandr-devel \
                libXi-devel \
                libXcursor-devel \
                libXinerama-devel \
                libXcomposite-devel \
                libXdamage-devel \
                libXfixes-devel \
                libXext-devel \
                libXrender-devel \
                libXtst-devel \
                glib2-devel \
                cairo-devel \
                pango-devel \
                atk-devel \
                gdk-pixbuf2-devel
            ;;
        arch|manjaro|endeavouros)
            sudo pacman -Sy --needed \
                webkit2gtk-4.1 \
                gtk3 \
                libayatana-appindicator \
                librsvg \
                libudev0-shim \
                openssl \
                base-devel \
                curl \
                wget \
                git \
                alsa-lib \
                libpulse \
                libx11 \
                libxrandr \
                libxi \
                libxcursor \
                libxinerama \
                libxcomposite \
                libxdamage \
                libxfixes \
                libxext \
                libxrender \
                libxtst \
                glib2 \
                cairo \
                pango \
                atk \
                gdk-pixbuf2
            ;;
        opensuse*|suse)
            sudo zypper install -y \
                webkit2gtk-4_1-devel \
                gtk3-devel \
                libayatana-appindicator3-devel \
                librsvg-devel \
                libudev-devel \
                libopenssl-devel \
                gcc \
                gcc-c++ \
                make \
                pkg-config \
                curl \
                wget \
                git \
                alsa-devel \
                libpulse-devel \
                libX11-devel \
                libXrandr-devel \
                libXi-devel \
                libXcursor-devel \
                libXinerama-devel \
                libXcomposite-devel \
                libXdamage-devel \
                libXfixes-devel \
                libXext-devel \
                libXrender-devel \
                libXtst-devel \
                glib2-devel \
                cairo-devel \
                pango-devel \
                atk-devel \
                gdk-pixbuf-devel
            ;;
        *)
            log_warn "Unknown distro: $distro. Skipping system package installation."
            log_warn "Please install Tauri dependencies manually: https://tauri.app/v1/guides/getting-started/prerequisites"
            ;;
    esac
}

install_node_pnpm() {
    log_info "Checking Node.js..."
    if command -v node &> /dev/null; then
        local node_version=$(node --version | sed 's/v//')
        local major=$(echo "$node_version" | cut -d. -f1)
        if [[ $major -ge 20 ]]; then
            log_ok "Node.js $node_version found"
        else
            log_warn "Node.js $node_version found, but >= 20 required. Installing via nvm..."
            install_nvm_node
        fi
    else
        log_info "Node.js not found. Installing via nvm..."
        install_nvm_node
    fi

    log_info "Checking pnpm..."
    if command -v pnpm &> /dev/null; then
        log_ok "pnpm $(pnpm --version) found"
    else
        log_info "Installing pnpm..."
        npm install -g pnpm
        log_ok "pnpm installed"
    fi
}

install_nvm_node() {
    if [[ ! -d "$HOME/.nvm" ]]; then
        log_info "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi
    nvm install 20
    nvm use 20
    nvm alias default 20
    log_ok "Node.js $(node --version) installed via nvm"
}

install_rust_tauri() {
    log_info "Checking Rust..."
    if command -v cargo &> /dev/null; then
        local rust_version=$(rustc --version | cut -d' ' -f2)
        log_ok "Rust $rust_version found"
    else
        log_info "Installing Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
        log_ok "Rust $(rustc --version | cut -d' ' -f2) installed"
    fi

    log_info "Checking Tauri CLI..."
    if cargo install --list | grep -q "tauri-cli"; then
        log_ok "Tauri CLI found"
    else
        log_info "Installing Tauri CLI..."
        cargo install tauri-cli --version 2.11.3
        log_ok "Tauri CLI installed"
    fi
}

install_arduino_cli() {
    log_info "Checking arduino-cli..."
    if command -v arduino-cli &> /dev/null; then
        log_ok "arduino-cli $(arduino-cli version | head -1) found"
    else
        log_info "Installing arduino-cli..."
        curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
        # Add to PATH for current session
        export PATH="$HOME/bin:$PATH"
        # Persist for future sessions
        if [[ -f "$HOME/.bashrc" ]] && ! grep -q 'export PATH="$HOME/bin:$PATH"' "$HOME/.bashrc"; then
            echo 'export PATH="$HOME/bin:$PATH"' >> "$HOME/.bashrc"
        fi
        if [[ -f "$HOME/.zshrc" ]] && ! grep -q 'export PATH="$HOME/bin:$PATH"' "$HOME/.zshrc"; then
            echo 'export PATH="$HOME/bin:$PATH"' >> "$HOME/.zshrc"
        fi
        log_ok "arduino-cli installed to ~/bin/"
    fi

    # Setup bundled Arduino tools directory structure
    log_info "Setting up bundled Arduino tools directory..."
    local tools_dir="$ROOT_DIR/src-tauri/tools/Arduino"
    mkdir -p "$tools_dir/libraries"
    mkdir -p "$tools_dir/packages"

    # Copy or symlink arduino-cli to tools directory
    local cli_path=$(command -v arduino-cli)
    if [[ -f "$tools_dir/arduino-cli" ]]; then
        log_ok "arduino-cli already in tools directory"
    else
        cp "$cli_path" "$tools_dir/arduino-cli"
        chmod +x "$tools_dir/arduino-cli"
        log_ok "arduino-cli copied to $tools_dir/"
    fi

    # Initialize arduino-cli config pointing to bundled tools
    "$tools_dir/arduino-cli" config init --additional-urls \
        https://espressif.github.io/arduino-esp32/package_esp32_index.json, \
        https://arduino.esp8266.com/stable/package_esp8266com_index.json, \
        https://raw.githubusercontent.com/sparkfun/Arduino_Boards/master/IDE_Board_Manager/package_sparkfun_index.json, \
        http://dl.sipeed.com/MAIX/Maixduino/package_Maixduino_k210_index.json, \
        https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json, \
        http://drazzy.com/package_drazzy.com_index.json

    # Set data directory to bundled tools
    "$tools_dir/arduino-cli" config set directories.data "$tools_dir"
    "$tools_dir/arduino-cli" config set directories.downloads "$tools_dir/staging"
    "$tools_dir/arduino-cli" config set directories.user "$tools_dir/user"

    log_ok "Arduino CLI configured with bundled tools directory"
}

install_postject_esbuild() {
    log_info "Installing postject and esbuild globally..."
    npm install -g postject esbuild
    log_ok "postject and esbuild installed"
}

setup_usb_serial_permissions() {
    log_info "Setting up USB/Serial permissions..."
    local user=$(whoami)
    sudo usermod -a -G dialout,tty,uucp "$user" 2>/dev/null || true
    log_warn "Added $user to dialout, tty, uucp groups. You may need to log out and back in."
}

install_project_deps() {
    log_info "Installing project dependencies with pnpm..."
    cd "$ROOT_DIR"
    pnpm install
    log_ok "Project dependencies installed"
}

build_backends() {
    log_info "Building backend executables..."
    cd "$ROOT_DIR"
    if [[ -f "scripts/build-backends.sh" ]]; then
        bash scripts/build-backends.sh
        log_ok "Backends built"
    else
        log_warn "build-backends.sh not found, skipping"
    fi
}

main() {
    echo "═══════════════════════════════════════════════"
    echo "  STBlock Linux Development Setup"
    echo "═══════════════════════════════════════════════"
    echo ""

    local distro=$(detect_distro)
    log_info "Detected distro: $distro"

    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        log_error "Do not run this script as root!"
        exit 1
    fi

    install_system_deps "$distro"
    install_node_pnpm
    install_rust_tauri
    install_arduino_cli
    install_postject_esbuild
    setup_usb_serial_permissions
    install_project_deps
    build_backends

    echo ""
    echo "═══════════════════════════════════════════════"
    log_ok "Setup complete!"
    echo "═══════════════════════════════════════════════"
    echo ""
    echo "Next steps:"
    echo "  1. Log out and back in (or run: newgrp dialout) for USB permissions"
    echo "  2. Run development: pnpm run dev"
    echo "  3. Build release: pnpm run build"
    echo ""
}

main "$@"
