# Pemesanan Kaos RT 02 – ERTE DUA, GUYUP RUKUN

Web app for listing and managing T-shirt orders, replacing the Google Apps Script + Google Sheets version.

- **Public** (`/orders`): read-only order list (no WhatsApp numbers or payment amounts), with search, status filter, date sort and pagination.
- **Admin** (`/admin/*`): login, full order list, 3-step order form (create/edit), payment management, Excel export for the konveksi.

Stack: React + Vite + TypeScript, Supabase (Postgres, Auth, RLS, RPC), TanStack Query, Zustand, React Hook Form + Zod, shadcn/ui + Tailwind CSS, SheetJS, Sonner, date-fns, Lucide.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run, in order:
   1. `supabase/migrations/20261111000000_init.sql` – schema, RLS, functions, default pricing.
   2. `supabase/seed.sql` – *optional* dummy data (14 sample orders). Skip this for production.
3. **Authentication → Sign In / Providers**: turn off **Allow new users to sign up** (there is no public registration).
4. **Authentication → Users → Add user**: create the admin with email + password (tick *Auto Confirm User*).
5. Promote that user to admin in the SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin', full_name = 'Pengurus RT 02'
   where id = (select id from auth.users where email = 'admin@example.com');
   ```

   Users without `role = 'admin'` cannot log in to the admin panel or read/modify any order data.

### Using the Supabase CLI instead (optional)

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push            # applies supabase/migrations
# Local stack with dummy data (requires Docker):
npx supabase start && npx supabase db reset
```

## 2. Run the app

```bash
cp .env.example .env    # then fill in the values below
npm install
npm run dev             # http://localhost:5173
```

`.env`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable or anon key>
```

Both values are in **Project Settings → API**. Never put the `service_role` key in the frontend.

Other scripts: `npm run build` (type-check + production build to `dist/`), `npm run preview`, `npm run lint`.

## 3. Deploy to Cloudflare Pages

- Framework preset: **Vite** (or none) · Build command: `npm run build` · Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- SPA routing works out of the box (Pages serves `index.html` when there is no `404.html`).
- Add your Pages URL to Supabase **Authentication → URL Configuration → Site URL**.

## Business rules (enforced in the database)

| Rule | Where |
|---|---|
| Max 6 shirts per order | `app_settings.max_shirts_per_order` |
| Family subsidy Rp30.000, once per KK | `app_settings.family_subsidy_amount`; advisory lock + unique partial index `orders_one_subsidy_per_family` |
| Adult prices per size group × sleeve | `pricing_configs` |
| Child price = adult − Rp20.000 | `pricing_configs.child_discount` |
| Payment status: Lunas / Cicil / Belum bayar | `recalc_order_payment()` from the `payments` table |

- The family is identified by the normalised name (case and extra spaces ignored).
- All writes go through `SECURITY DEFINER` RPCs (`save_order`, `add_payment`, `delete_payment`) that check `is_admin()` and calculate prices/totals server-side; client-sent prices are never trusted. Direct `insert/update` on the tables is revoked.
- Item prices are snapshots: editing an order only re-prices shirts whose size, sleeve or wearer type changed. An already-applied subsidy is kept while the family name stays the same.
- If the edited bill becomes lower than what has already been paid, the save is rejected; delete a payment first on the order detail page.
- Deleting a subsidised order does not move the subsidy to the family's other orders.
- To change prices, edit `pricing_configs` / `app_settings` in the Supabase Table Editor.

## Project structure

```
src/
├── components/{ui,layout,shared}
├── features/
│   ├── auth/        # sign-in service, session listener
│   ├── orders/      # types, constants, schemas, services, hooks, form components
│   ├── payments/    # add/delete payment
│   └── export/      # SheetJS production export
├── pages/{public,admin}
├── routes/          # router + admin guard
├── stores/          # Zustand auth store
├── hooks/           # URL-synced list filters
└── lib/             # supabase client, utils
supabase/
├── migrations/      # schema + RLS + RPCs
└── seed.sql         # dummy data
```

## Note on `xlsx`

The npm `xlsx@0.18.5` package has known advisories related to *parsing* untrusted files. This app only *writes* files, so it is not affected. To upgrade, install SheetJS from its CDN: `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`.
# management-order
