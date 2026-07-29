begin;

create extension if not exists pgcrypto;

alter table public.chapters
  add column if not exists paragraph_keys uuid[];

alter table public.comments
  add column if not exists paragraph_key uuid;

alter table public.notifications
  add column if not exists paragraph_key uuid;

do $$
declare
  chapter_record record;
  paragraph_count integer;
  generated_keys uuid[];
begin
  for chapter_record in
    select id, content
    from public.chapters
    where paragraph_keys is null
  loop
    select count(*)::integer
      into paragraph_count
    from regexp_split_to_table(
      coalesce(chapter_record.content, ''),
      '(?i)<br\s*/?>|</p>'
    ) as paragraph(value)
    where btrim(
      regexp_replace(
        regexp_replace(paragraph.value, '(?i)<p[^>]*>', '', 'g'),
        '<[^>]+>',
        '',
        'g'
      )
    ) <> ''
    or paragraph.value ~* '<(img|audio)(\s|>)';

    select greatest(
      paragraph_count,
      coalesce((
        select max(c.paragraph_id)::integer + 1
        from public.comments c
        where c.chapter_id = chapter_record.id
          and c.paragraph_id is not null
      ), 0)
    ) into paragraph_count;

    select coalesce(array_agg(gen_random_uuid()), '{}'::uuid[])
      into generated_keys
    from generate_series(1, paragraph_count);

    update public.chapters
    set paragraph_keys = generated_keys
    where id = chapter_record.id;
  end loop;
end
$$;

update public.comments c
set paragraph_key = ch.paragraph_keys[c.paragraph_id::integer + 1]
from public.chapters ch
where c.chapter_id = ch.id
  and c.paragraph_id is not null
  and c.paragraph_key is null
  and c.paragraph_id::integer >= 0
  and c.paragraph_id::integer < coalesce(array_length(ch.paragraph_keys, 1), 0);

update public.notifications n
set paragraph_key = c.paragraph_key
from public.comments c
where n.comment_id = c.id
  and n.paragraph_key is null
  and c.paragraph_key is not null;

create index if not exists comments_chapter_paragraph_key_idx
  on public.comments (chapter_id, paragraph_key)
  where paragraph_key is not null;

create or replace function public.sync_comment_paragraph_target()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  keys uuid[];
  key_position integer;
begin
  if new.chapter_id is null then
    new.paragraph_id := null;
    new.paragraph_key := null;
    return new;
  end if;

  select paragraph_keys
    into keys
  from public.chapters
  where id = new.chapter_id;

  if new.paragraph_key is not null then
    key_position := array_position(keys, new.paragraph_key);
    if key_position is not null then
      new.paragraph_id := key_position - 1;
    end if;
  elsif new.paragraph_id is not null
    and new.paragraph_id::integer >= 0
    and new.paragraph_id::integer < coalesce(array_length(keys, 1), 0)
  then
    new.paragraph_key := keys[new.paragraph_id::integer + 1];
  end if;

  return new;
end;
$$;

drop trigger if exists sync_comment_paragraph_target_trigger
  on public.comments;

create trigger sync_comment_paragraph_target_trigger
before insert or update of chapter_id, paragraph_id, paragraph_key
on public.comments
for each row
execute function public.sync_comment_paragraph_target();

create or replace function public.refresh_comment_paragraph_positions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.paragraph_keys is distinct from old.paragraph_keys then
    update public.comments c
    set paragraph_id = array_position(new.paragraph_keys, c.paragraph_key) - 1
    where c.chapter_id = new.id
      and c.paragraph_key is not null
      and array_position(new.paragraph_keys, c.paragraph_key) is not null
      and c.paragraph_id is distinct from (
        array_position(new.paragraph_keys, c.paragraph_key) - 1
      );
  end if;

  return new;
end;
$$;

drop trigger if exists refresh_comment_paragraph_positions_trigger
  on public.chapters;

create trigger refresh_comment_paragraph_positions_trigger
after update of paragraph_keys
on public.chapters
for each row
execute function public.refresh_comment_paragraph_positions();

commit;
