# GachaWiki Play Helper

One-click tools for playing Japan-only DMM browser games (like イヴンタイト) from
anywhere. Companion project for [gachawiki.info](https://gachawiki.info).

## What you get

1. **Browser extension** (Chrome / Brave / Edge / Firefox)
   - Pins the DMM region and language cookies (`ckcy` / `cklg`) to Japan and
     instantly restores them when the site overwrites or deletes them
   - Skips the 18+ age-check on the adult games section
   - Optional: route **only** DMM traffic through your own Japan proxy
     (SOCKS5 / HTTP with login). Everything else stays on your normal connection
   - Zero telemetry: no accounts, no analytics, nothing leaves your computer
2. **Connect-Japan** (Windows script)
   - Double-click connection to a free VPN Gate Japan server
   - Uses mirror addresses, so it works on networks that block the VPN Gate site
   - Picks a live server that is actually reachable on TCP 443, then starts OpenVPN
     (installs OpenVPN automatically on first run if missing)

## Install - Brave / Chrome / Edge

Easiest: download this repo's ZIP (green **Code** button) and double-click
**`Install-Chrome-Brave.bat`**. It copies the extension to a permanent folder,
opens the browser's extensions page, and shows you the 3 remaining clicks
(Developer mode -> Load unpacked -> paste the path).

Manual way: `brave://extensions` / `chrome://extensions` -> Developer mode ON ->
Load unpacked -> select the `chrome-extension` folder.

## Install - Firefox

Double-click **`gachawiki-play-helper-firefox.xpi`** (from Releases) and Firefox
asks to install. Note: Mozilla requires extensions to be signed, so grab the
signed file from the Releases page once it is published, or load the
`firefox-extension` folder temporarily via about:debugging.

## Connect to Japan (every play session)

Double-click `vpn/Connect-Japan.bat`, approve the Windows prompt, wait for
"Initialization Sequence Completed". Keep the window open while the game loads;
close it to disconnect (your whole PC returns to normal speed).

## Play

1. Connect Japan (above)
2. Log in at www.dmm.com
3. Open your game page and press PLAY
4. Once the game screen is fully loaded you can close the VPN window

## Fair use / warnings

- Region-spoofing is against DMM's terms of service. Personal use, own risk,
  do not charge money through a shared IP.
- VPN Gate servers are volunteers (University of Tsukuba project) - they come
  and go. For an always-on connection rent a Japan VPS (~USD 5/month) and put
  its proxy details into the extension settings.

## Repo layout

```
chrome-extension/    Chromium build (Brave / Chrome / Edge - MV3)
firefox-extension/   Firefox build (MV3, proxy.onRequest port)
vpn/                 Connect-Japan.bat + connect-japan.ps1
Install-Chrome-Brave.bat
```
