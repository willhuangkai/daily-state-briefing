# Deploying Daily State Briefing to Vercel

This project is a static prototype. It uses only HTML, CSS, JavaScript, and browser localStorage.

There is no backend, database, login, or API.

## Files Vercel Will Serve

- `index.html`
- `styles.css`
- `app.js`

## Option 1: Deploy With GitHub

1. Create a GitHub repository for this project.
2. Upload or commit these project files to the repository.
3. Go to https://vercel.com.
4. Sign in or create an account.
5. Click **Add New...** then **Project**.
6. Import the GitHub repository.
7. In the project settings, leave the framework preset as **Other**.
8. Leave the build command empty.
9. Leave the output directory empty or set it to `.`.
10. Click **Deploy**.

Vercel will publish the static site and give you a public URL.

## Option 2: Deploy With Vercel CLI

1. Install the Vercel CLI:

```bash
npm install -g vercel
```

2. From this project folder, run:

```bash
vercel
```

3. Follow the prompts:

- Set up and deploy: `Y`
- Framework preset: `Other`
- Build command: leave blank
- Output directory: `.`

4. Vercel will return a preview URL.

5. To publish the production URL, run:

```bash
vercel --prod
```

## Important Testing Note

Each tester's data is saved only in that tester's browser localStorage. Data is not shared between testers and is not sent to a server.
