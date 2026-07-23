begin;

drop policy if exists "kitaplab_avatar_uploads" on storage.objects;
create policy "kitaplab_avatar_uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and owner_id = auth.uid()::text
  and name like auth.uid()::text || '-%'
);

drop policy if exists "kitaplab_book_cover_uploads" on storage.objects;
create policy "kitaplab_book_cover_uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'book-covers'
  and owner_id = auth.uid()::text
  and (
    name like auth.uid()::text || '-%'
    or name like auth.uid()::text || '/%'
  )
);

drop policy if exists "kitaplab_pano_image_uploads" on storage.objects;
create policy "kitaplab_pano_image_uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and owner_id = auth.uid()::text
  and name like 'panolar/' || auth.uid()::text || '-%'
);

drop policy if exists "kitaplab_admin_image_uploads" on storage.objects;
create policy "kitaplab_admin_image_uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and owner_id = auth.uid()::text
  and public.is_current_user_admin()
  and (
    name like 'announcements/%'
    or name like 'categories/%'
    or name like 'events/%'
  )
);

commit;
