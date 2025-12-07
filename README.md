# Math Game (kids)

Simple static math game for kids (age ~9). This is a small, modular single-page app that you can open in a browser.

Features
- Landing page with module choices
- Example module: add two numbers (1–100)
- Each module: 10 questions, 10s per question
- Large question text and on-screen numeric keypad
- Keyboard input supported (digits, Backspace, Enter)
- Immediate feedback and final score

Run

This is the static (no-backend) version: question generators run entirely in the browser.

Run locally (no Python required):

```bash
cd /home/tvboxleruste/dev/mathgame
# Open index.html in a browser or serve with a simple static server:
python3 -m http.server 8000
# then open http://localhost:8000 in a browser
```

Deploy to GitHub Pages

1. Commit your repository and push to GitHub (replace `YOUR-REPO`):

```bash
git init
git add .
git commit -m "Static math game for GitHub Pages"
git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git
git push -u origin main
```

2. Publish with GitHub Pages (two options):

- Option A — Serve from `main` branch root:
	- In the repository Settings → Pages, select Branch `main` and folder `/` (root), then save.

- Option B — Serve from `gh-pages` branch:
	- Create a `gh-pages` branch locally that points to the static commit (example below), then push it to the remote.
	- To create a `gh-pages` branch locally that mirrors the current commit:

```bash
# Commit any outstanding changes first
git add .
git commit -m "Prepare static site"
# Create or update local gh-pages branch to current commit
git branch -f gh-pages HEAD
```

	- Then push the branch to your remote:

```bash
git push -u origin gh-pages
```

	- In GitHub Settings → Pages, select branch `gh-pages` and folder `/`.

Optional quick deploy script

I've included a small helper script `deploy-gh-pages.sh` you can run to publish a `gh-pages` branch (this requires write access to the remote):

```bash
# Make sure you've committed changes, then run:
./deploy-gh-pages.sh
```

Notes
- The frontend now contains modules in `app.js`. Add new modules by editing the `modules` array — each module must provide `id`, `title`, and `generateQuestion()` that returns `{ text, answer }`.
- If you later want a backend (server-side question generation), host the Python `server.py` elsewhere (Heroku/Render) and change `app.js` to fetch from that API instead.

Deploy to Render (static site)

This repository is ready to deploy to Render as a static site. Render will serve the static files and auto-deploy on pushes.

Quick steps (UI):

1. Push your repo to GitHub if you haven't already.
2. Go to https://dashboard.render.com and sign in.
3. Choose "New" → "Static Site".
4. Connect your GitHub repo (`cleruste/mathgame`) and select the `main` branch.
5. Set the **Build Command** to empty (this site needs no build) or a build command if you add one later.
6. Set the **Publish Directory** to `.` (the repo root), then create the site.

Using the included `render.yaml` (Infrastructure as Code):

- The repository contains `render.yaml` which describes a `staticSite` entry. When you create the service in Render and connect the repo, Render will detect `render.yaml` and use it to configure the service. Edit the `repo` field in `render.yaml` if you want the file to include the repository URL.

Notes about Render
- The site is fully static — Render will host HTML/CSS/JS and automatically serve `index.html`.
- For larger sites with build steps (React/Vite/etc.) set `buildCommand` and update `publishPath` to the build output (for example `build` or `dist`).
- If you later add a backend (Python API), consider deploying the backend as a separate Render "Web Service" and update `app.js` to call that API.

Add a new module

Edit `app.js` and add another object to the `modules` array with fields:

- `id`: unique string
- `title`: visible title on landing
- `generateQuestion()`: returns `{ text: '...', answer: '...' }`

Example generator for subtraction or multiplication can be added similarly.
