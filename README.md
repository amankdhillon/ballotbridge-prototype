# BallotBridge (Round 1 web app)

Static site, no build step. Deploy the whole folder to GitHub Pages.

## Set your connection
Edit `js/config.js` only: the Supabase project URL and the publishable key.

## Check the connection
Open `#/debug` on your site (for example `.../ballotbridge-prototype/#/debug`). It runs each step and stops at the first failure with a fix.

## Structure
    index.html            Shell: top bar, toasts, modal, one script tag
    css/                  tokens (colors and spacing), base, layout, components
    js/
      app.js              Entry point: connects, routes, shows errors
      routes.js           Route table (add screens here)
      config.js           Connection values and form options
      state/store.js      Shared app state (me, settings)
      lib/                Supabase client, friendly errors, DOM and route helpers
      services/           All data access (auth, catalog, threads, sources, reviews, realtime)
      components/         Reusable UI pieces (cards, badges, forms, toasts, nav)
      views/              One file per screen; thread.js renders threads

## Rules of thumb
- Views never call Supabase directly. They call services.
- Every user-written string goes through `esc()` before it reaches HTML.
- Event delegation: one listener per view, not one per button.
- The database enforces permissions. The page only shows what's allowed.

## Supabase
Schema lives in `supabase/schema.sql`. The page reads posts through `post_view`, `review_queue`, and `source_view`, so authors stay hidden.
