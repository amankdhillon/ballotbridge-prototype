# BallotBridge Round 1: setup (Supabase)

Estimated time: 30 to 45 minutes the first time.

## 1. Create the project
1. Sign up at supabase.com and create a project. Pick the region closest to your testers (for California, a US West region).
2. Save the database password somewhere safe.

## 2. Turn on anonymous sign-ins
Authentication > Sign In / Providers > enable **Anonymous Sign-Ins**. Testers get a session without an email or password. Nicknames are their only identity.

## 3. Create the tables and rules
1. SQL Editor > New query.
2. Paste the full contents of `supabase/schema.sql` and click Run.
3. Check the output. It should finish with no errors. If it fails partway, fix the reported line and run it again from the top. Most steps are safe to repeat.

## 4. Set the facilitator code
In the SQL Editor, run this (use your own phrase):

    update app_settings set value = 'your-phrase-here' where key = 'verify_code';

Read that phrase aloud to contributors. Visitors leave the code blank.

To change the number of approvals needed, update `reviews_required` the same way. Use 1 unless you have a reason to change it.

## 5. Add your project values to the page
1. Project Settings > API. Copy the **Project URL** and the **anon public** key.
2. Open `Index.html` and replace the two values at the top of the script:

       const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
       const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';

Use only the anon key. Never use the service_role key in the page.

## 6. Fill in the measures
Table Editor > `measures`. Replace each placeholder `official_text` and `ai_summary`. Don't publish placeholders as real guidance.

## 7. Host the page
Supabase doesn't host web pages, so put the single `Index.html` file on any static host:
- **Netlify Drop** (fastest): go to app.netlify.com/drop and drag in a folder that contains `Index.html`. You get a public link immediately.
- **GitHub Pages**: a public repository with `Index.html` at the root.

Share that link with testers.

## 8. Pre-session checks
- [ ] Open the link in a normal window and an incognito window. Sign in as two nicknames.
- [ ] The first account enters the facilitator code. Check that Explanation is allowed.
- [ ] Post an explanation. Check Table Editor > `posts`. Status should be `pending`.
- [ ] The second account (verified) opens the Review queue, approves the explanation, and the first account sees it marked Reviewed within a few seconds, without reloading.
- [ ] The first account can't post a second explanation until they've reviewed one.
- [ ] Post an anonymous question and a reply to it. The anonymous author should show as "Anonymous" on the second browser.
- [ ] Add a source with an https link.
- [ ] Open the page on a phone.

## 9. Keep the project awake
Free projects pause after about a week without activity. Open the dashboard a day or two before the session.

## Known limits
- Anyone with the page link can create an account. Share the link only within the class.
- Identity is the browser's anonymous session. Clearing the browser or switching devices starts a new user.
- Reviewer assignment isn't random. Any verified user can review any pending explanation other than their own.
- The unlock rule is enforced in the database, but two posts sent at the exact same instant could both pass. This is unlikely in a session and easy to fix later.
- The facilitator code is checked with no attempt limit. Fine for a class, not for production.
