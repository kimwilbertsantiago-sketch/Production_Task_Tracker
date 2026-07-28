/*
# Add brand_book_url column to clients + create brand-assets storage bucket

1. Modified Tables
- `clients`
  - Added `brand_book_url` (text, nullable) — stores the Supabase Storage public URL for an uploaded PDF brand book/guidelines document.

2. Storage
- Create `brand-assets` storage bucket (public) for uploading client logo images and PDF brand books.
- The bucket is public so logos and PDFs can be displayed via public URLs in the frontend.

3. Security
- No RLS changes needed — the `clients` table already has RLS enabled with existing policies.
- The storage bucket is public for read access; writes are handled via the Supabase client with the authenticated session.
*/

ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_book_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;
