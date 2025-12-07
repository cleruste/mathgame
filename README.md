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

2. Publish with GitHub Pages:
- In the repository Settings → Pages, select Branch `main` and folder `/` (root), then save.
- Your site will be available at `https://<your-username>.github.io/<repo-name>/`.

Optional quick deploy script

I've included a small helper script `deploy-gh-pages.sh` you can run to publish a `gh-pages` branch (this requires write access to the remote):

```bash
# Make sure you've committed changes, then run:
./deploy-gh-pages.sh
```

Notes
- The frontend now contains modules in `app.js`. Add new modules by editing the `modules` array — each module must provide `id`, `title`, and `generateQuestion()` that returns `{ text, answer }`.
- If you later want a backend (server-side question generation), host the Python `server.py` elsewhere (Heroku/Render) and change `app.js` to fetch from that API instead.

Add a new module

Edit `app.js` and add another object to the `modules` array with fields:

- `id`: unique string
- `title`: visible title on landing
- `generateQuestion()`: returns `{ text: '...', answer: '...' }`

Example generator for subtraction or multiplication can be added similarly.
