# Fix "No requests yet" on Staff page (Vercel)

On Vercel, each API call can run on a **different serverless instance**, so the in-memory request list is not shared. Guests' requests never show up on the staff page until you add **persistent storage** (Redis).

## Step 1: Create Upstash Redis (free)

1. Go to **https://console.upstash.com/** and sign in (or create account).
2. Click **Create Database**.
3. Name it (e.g. `concerige`) → choose region → **Create**.
4. Open the database → copy:
   - **REST URL** (e.g. `https://xxx.upstash.io`)
   - **REST Token** (click to copy).

## Step 2: Add env vars in Vercel

1. Open your project: **https://vercel.com/mohag1992s-projects/concerige-v1** (or your project URL).
2. Go to **Settings** → **Environment Variables**.
3. Add:

   | Name | Value |
   |------|--------|
   | `KV_REST_API_URL` | Your Upstash REST URL |
   | `KV_REST_API_TOKEN` | Your Upstash REST Token |

   Or use Upstash’s names (both work):

   | Name | Value |
   |------|--------|
   | `UPSTASH_REDIS_REST_URL` | Your Upstash REST URL |
   | `UPSTASH_REDIS_REST_TOKEN` | Your Upstash REST Token |

4. Save. Apply to **Production**, **Preview**, and **Development** if you use them.

## Step 3: Redeploy

- **Redeploy** the project (Deployments → ⋮ on latest → Redeploy), or push a new commit.

After redeploy, when a guest submits a request on your site, it will be stored in Redis and **Staff** will see it at e.g.  
https://concerige-v1-bwcqyyqx2-mohag1992s-projects.vercel.app/staff.html

## Quick test

1. Open the **guest** page: `https://your-app.vercel.app/index.html` (or root).
2. Choose an option (e.g. Towels) → **Send**.
3. Open **staff** page and log in: `https://your-app.vercel.app/staff.html`.
4. The request should appear within a few seconds (page polls every 4 seconds).
