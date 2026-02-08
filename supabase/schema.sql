create extension if not exists "pgcrypto";

create type if not exists story_status as enum ('draft', 'active', 'done');
create type if not exists task_status as enum ('todo', 'in_progress', 'done');

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  repo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists epics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  epic_id uuid references epics(id) on delete set null,
  title text not null,
  description text,
  status story_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mockups (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  source_url text,
  r2_key text,
  r2_url text,
  created_at timestamptz not null default now()
);

create or replace function trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp_projects on projects;
create trigger set_timestamp_projects
before update on projects
for each row
execute procedure trigger_set_timestamp();

drop trigger if exists set_timestamp_epics on epics;
create trigger set_timestamp_epics
before update on epics
for each row
execute procedure trigger_set_timestamp();

drop trigger if exists set_timestamp_stories on stories;
create trigger set_timestamp_stories
before update on stories
for each row
execute procedure trigger_set_timestamp();

drop trigger if exists set_timestamp_tasks on tasks;
create trigger set_timestamp_tasks
before update on tasks
for each row
execute procedure trigger_set_timestamp();

create or replace function run_genesis_plan(plan jsonb, repo_url text, prompt text)
returns jsonb
language plpgsql
as $$
declare
  project_row projects%rowtype;
  epic jsonb;
  story jsonb;
  task jsonb;
  epic_row epics%rowtype;
  story_row stories%rowtype;
  stories_acc jsonb := '[]'::jsonb;
begin
  insert into projects (title, description, repo_url)
  values (
    coalesce(plan->>'title', 'Taskosaur-AI Project'),
    coalesce(plan->>'description', prompt),
    repo_url
  )
  returning * into project_row;

  for epic in select * from jsonb_array_elements(coalesce(plan->'epics', '[]'::jsonb)) loop
    insert into epics (project_id, title, description)
    values (
      project_row.id,
      coalesce(epic->>'title', 'Epic'),
      epic->>'description'
    )
    returning * into epic_row;

    for story in select * from jsonb_array_elements(coalesce(epic->'stories', '[]'::jsonb)) loop
      insert into stories (project_id, epic_id, title, description)
      values (
        project_row.id,
        epic_row.id,
        coalesce(story->>'title', 'Story'),
        story->>'description'
      )
      returning * into story_row;

      insert into tasks (story_id, title, description)
      select
        story_row.id,
        coalesce(task->>'title', 'Task'),
        task->>'description'
      from jsonb_array_elements(coalesce(story->'tasks', '[]'::jsonb)) task;

      stories_acc := stories_acc || to_jsonb(story_row);
    end loop;
  end loop;

  return jsonb_build_object(
    'project', to_jsonb(project_row),
    'stories', stories_acc
  );
end;
$$;
