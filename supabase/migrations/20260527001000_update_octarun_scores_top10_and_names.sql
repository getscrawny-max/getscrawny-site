alter table public.octarun_scores
drop constraint if exists octarun_scores_initials_check;

alter table public.octarun_scores
drop constraint if exists octarun_scores_initials_length_check;

alter table public.octarun_scores
add constraint octarun_scores_initials_allowed_check
check (
  char_length(initials) between 1 and 7
  and initials !~* '(fuck|shit|bitch|cunt|dick|pussy|asshole|nigg|fag|retard|slut|whore|kike|nazi|hitler|rape|sex|xxx)'
);

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

delete from public.octarun_scores
where id in (
  select id
  from (
    select id, row_number() over (order by score desc, created_at asc) as score_rank
    from public.octarun_scores
  ) ranked_scores
  where score_rank > 10
);
