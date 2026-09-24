-- Panolari ve anketlerini tek transaction icinde guvenle duzenler.
-- Anketin sorusu, secim tipi veya secenekleri degisirse eski oylar silinir.

create or replace function public.update_pano_with_poll(
  p_pano_id uuid,
  p_title text,
  p_content text,
  p_book_id bigint,
  p_chapter_id bigint,
  p_image_url text,
  p_has_poll boolean,
  p_question text,
  p_allows_multiple boolean,
  p_options text[]
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  target_pano public.panolar%rowtype;
  cleaned_options text[] := array[]::text[];
  current_options text[] := array[]::text[];
  poll_definition_changed boolean := false;
begin
  if actor_id is null or actor_email = '' then
    raise exception using message = 'AUTHENTICATION_REQUIRED';
  end if;

  select *
  into target_pano
  from public.panolar
  where id = p_pano_id
  for update;

  if not found then
    raise exception using message = 'PANO_NOT_FOUND';
  end if;

  if not (
    target_pano.user_id = actor_id
    or lower(coalesce(target_pano.user_email, '')) = actor_email
    or exists (
      select 1
      from public.announcement_admins admin_row
      where lower(admin_row.user_email) = actor_email
    )
  ) then
    raise exception using message = 'PANO_UPDATE_FORBIDDEN';
  end if;

  if nullif(btrim(coalesce(p_title, '')), '') is null then
    raise exception using message = 'PANO_TITLE_REQUIRED';
  end if;

  if nullif(btrim(coalesce(p_content, '')), '') is null then
    raise exception using message = 'PANO_CONTENT_REQUIRED';
  end if;

  if p_has_poll then
    select coalesce(
      array_agg(btrim(option_item.option_label) order by option_item.item_order),
      array[]::text[]
    )
    into cleaned_options
    from unnest(coalesce(p_options, array[]::text[])) with ordinality
      as option_item(option_label, item_order)
    where nullif(btrim(option_item.option_label), '') is not null;

    if char_length(btrim(coalesce(p_question, ''))) not between 3 and 200 then
      raise exception using message = 'PANO_POLL_QUESTION_INVALID';
    end if;

    if coalesce(array_length(cleaned_options, 1), 0) not between 2 and 10 then
      raise exception using message = 'PANO_POLL_OPTIONS_INVALID';
    end if;

    if exists (
      select 1
      from unnest(cleaned_options) as option_item(option_label)
      where char_length(option_item.option_label) > 100
    ) then
      raise exception using message = 'PANO_POLL_OPTION_TOO_LONG';
    end if;

    if (
      select count(*) <> count(distinct lower(option_item.option_label))
      from unnest(cleaned_options) as option_item(option_label)
    ) then
      raise exception using message = 'PANO_POLL_OPTIONS_DUPLICATE';
    end if;

    select coalesce(
      array_agg(option_row.label order by option_row.display_order),
      array[]::text[]
    )
    into current_options
    from public.pano_poll_options option_row
    where option_row.pano_id = p_pano_id;

    poll_definition_changed :=
      target_pano.poll_question is null
      or btrim(target_pano.poll_question) is distinct from btrim(p_question)
      or target_pano.poll_allows_multiple is distinct from coalesce(p_allows_multiple, false)
      or current_options is distinct from cleaned_options;

    update public.panolar
    set
      title = btrim(p_title),
      content = btrim(p_content),
      book_id = p_book_id,
      chapter_id = case when p_book_id is null then null else p_chapter_id end,
      image_url = nullif(btrim(coalesce(p_image_url, '')), ''),
      poll_question = btrim(p_question),
      poll_allows_multiple = coalesce(p_allows_multiple, false),
      updated_at = now()
    where id = p_pano_id;

    if poll_definition_changed then
      delete from public.pano_poll_options
      where pano_id = p_pano_id;

      insert into public.pano_poll_options (
        pano_id,
        label,
        display_order,
        "position",
        sort_order
      )
      select
        p_pano_id,
        option_item.option_label,
        (option_item.item_order - 1)::integer,
        (option_item.item_order - 1)::integer,
        (option_item.item_order - 1)::integer
      from unnest(cleaned_options) with ordinality
        as option_item(option_label, item_order);
    end if;
  else
    update public.panolar
    set
      title = btrim(p_title),
      content = btrim(p_content),
      book_id = p_book_id,
      chapter_id = case when p_book_id is null then null else p_chapter_id end,
      image_url = nullif(btrim(coalesce(p_image_url, '')), ''),
      poll_question = null,
      poll_allows_multiple = null,
      updated_at = now()
    where id = p_pano_id;

    delete from public.pano_poll_options
    where pano_id = p_pano_id;
  end if;

  return p_pano_id;
end;
$$;

revoke all on function public.update_pano_with_poll(
  uuid, text, text, bigint, bigint, text, boolean, text, boolean, text[]
) from public, anon;

grant execute on function public.update_pano_with_poll(
  uuid, text, text, bigint, bigint, text, boolean, text, boolean, text[]
) to authenticated;

notify pgrst, 'reload schema';
