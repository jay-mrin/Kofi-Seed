-- Only post-specific content is removed. Order/payment and seed-comment tables remain intact.
begin;
drop table if exists public.comments;
drop table if exists public.post_likes;
drop table if exists public.posts;
drop policy if exists "Public can read post images" on storage.objects;
update storage.buckets set public = false where id = 'post-images';
update public.site_settings
set settings = settings - array['postAuthorName', 'postTitle', 'postBody']::text[]
where id = true;
commit;
