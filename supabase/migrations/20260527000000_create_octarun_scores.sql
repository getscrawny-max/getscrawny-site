create table if not exists public.octarun_scores (
  id uuid primary key default gen_random_uuid(),
  initials text not null check (
    char_length(initials) between 1 and 7
    and initials !~* '(fuck|shit|bitch|cunt|dick|pussy|asshole|nigg|fag|retard|slut|whore|kike|nazi|hitler|rape|sex|xxx)'
  ),
  score integer not null check (score >= 0),
  mode text not null default 'normal' check (mode in ('normal', 'hard')),
  created_at timestamptz not null default now()
);

create index if not exists octarun_scores_rank_idx
on public.octarun_scores (score desc, created_at asc);

alter table public.octarun_scores enable row level security;

drop policy if exists "OctaRun scores are public to read" on public.octarun_scores;
create policy "OctaRun scores are public to read"
on public.octarun_scores
for select
using (true);

drop policy if exists "Anyone can submit OctaRun scores" on public.octarun_scores;
create policy "Anyone can submit OctaRun scores"
on public.octarun_scores
for insert
with check (
  char_length(initials) between 1 and 7
  and initials !~* '(fuck|shit|bitch|cunt|dick|pussy|asshole|nigg|fag|retard|slut|whore|kike|nazi|hitler|rape|sex|xxx)'
  and score >= 0
  and mode in ('normal', 'hard')
);

create or replace function public.trim_octarun_scores()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.octarun_scores
  where id in (
    select id
    from (
      select id, row_number() over (order by score desc, created_at asc) as score_rank
      from public.octarun_scores
    ) ranked_scores
    where score_rank > 10
  );

  return null;
end;
$$;

drop trigger if exists trim_octarun_scores_after_insert on public.octarun_scores;
create trigger trim_octarun_scores_after_insert
after insert on public.octarun_scores
for each statement
execute function public.trim_octarun_scores();
