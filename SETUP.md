# MedVault on your iPhone

Three steps, roughly 20 minutes. Step 1 gets it on your phone; step 2 makes it survive; step 3 makes it sync.

---

## 1. Put the files online

MedVault has to be served over `https` before an iPhone will install it. Any static host works — GitHub Pages and Cloudflare Pages are both free.

Upload this whole folder, keeping the structure:

```
index.html
manifest.webmanifest
sw.js
icons/
  icon-192.png
  icon-512.png
  maskable-512.png
  apple-touch-icon.png
  favicon-32.png
vendor/
  pdf.min.js          ← copy this across from your existing setup
```

**GitHub Pages:** create a repository, upload the files, then Settings → Pages → Source: `main`, folder `/`. Your URL is `https://<username>.github.io/<repo>/`.

**Cloudflare Pages:** create a project, choose "Direct Upload", drag the folder in.

The server only ever holds the app itself. None of your study data goes near it — that stays on your devices and in your own OneDrive.

> Don't forget `vendor/pdf.min.js`. Without it the app still runs, but PDF papers won't open.

---

## 2. Install it on the iPhone

Open the URL **in Safari** (Chrome on iOS can't install web apps), then **Share → Add to Home Screen**.

**Please actually do this rather than just bookmarking it.** iOS clears the local storage of ordinary websites you haven't opened in a while. Installed home-screen web apps are exempt from that. Installing is what stops iOS quietly deleting your attempt history between study blocks.

Once installed you get a home-screen icon, full-screen with no Safari chrome, and the whole app works with no signal. The Data tab confirms it's running installed.

Even so: export a backup from the Data tab now and then. Belt and braces.

---

## 3. Connect OneDrive

### 3a. Register an app with Microsoft (one-off, ~5 minutes)

You need a client ID. Microsoft won't let an app talk to your files without one, and it's free.

1. Go to <https://portal.azure.com> → **App registrations** → **New registration**.
2. **Name:** MedVault (only you ever see this).
3. **Supported account types:** *Accounts in any organizational directory and personal Microsoft accounts*. If your OneDrive is a personal account, this is the option that works.
4. **Redirect URI:** choose platform **Single-page application (SPA)** and enter your exact app URL, including `index.html`:
   `https://<username>.github.io/<repo>/index.html`
5. Register, then copy the **Application (client) ID** from the overview page.

The SPA platform type matters. It's what makes Microsoft's token endpoint accept browser requests; the "Web" option will fail with a CORS error.

No client secret. Don't create one — this is a public client using PKCE, and a secret in a file anyone can read would be worse than useless.

### 3b. Point MedVault at your file

On each device, open **Data → Sync**, choose **OneDrive**, and fill in:

- **Client ID:** the value you just copied.
- **File path:** where the state file lives inside your OneDrive, e.g.
  `Documents/MedVault/medvault-state.json`

Use the **same path on every device**. The parent folder must already exist; MedVault creates the file but not the folders.

Tap **Sign in & turn on**. You'll bounce to Microsoft and back once.

### 3c. Switch the desktop over too

On your laptop, open Data → Sync and switch the transport from *Data folder* to *OneDrive*, pointing at the same path.

This matters. If the desktop writes the local folder copy directly while the phone writes the cloud copy, OneDrive can produce a "conflicted copy" file that MedVault never sees. One transport, one file, no conflicts.

Keep the folder connection for what it's good at: importing objective files, exam JSON, and PDFs.

---

## What syncs, and how conflicts resolve

Attempts, study sessions, snapshots, planner events and to-dos **merge** — edits from both devices survive rather than one overwriting the other. Deletions are recorded as tombstones, so deleting on one device doesn't get undone by the other's stale copy, and a later edit still beats an earlier delete.

Settings go last-writer-wins, except your assessment list, which merges by ID so two devices can't lose exam dates between them.

Your running stopwatch never syncs. It belongs to the device it's running on.

Writes use the file's ETag, so if two devices save at the same moment the loser is told, re-reads, merges, and retries instead of clobbering.

PDF files themselves stay on the device that imported them — only the text index syncs. A paper imported on your laptop won't open on your phone until you import it there too.

---

## When something looks wrong

**"sign in required"** — the Microsoft session expired. Open Data → Sync and sign in again. Microsoft caps browser-app refresh tokens at 24 hours, so expect this roughly daily on the phone. It's a redirect and a tap, not a full re-setup.

**"needs setup"** — client ID or file path is blank on this device.

**Sync stuck on an error** — tap *Sync now*. A corrupt or foreign file at that path is refused rather than imported, and your local data is left alone; the next successful save repairs the file.

**Nothing appears on the second device** — check both are pointed at the exact same path, including capitalisation.

**App won't update after you re-upload** — bump `CACHE` at the top of `sw.js` (e.g. `medvault-v2`) and re-upload. Then close and reopen the app.
