create table books (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id),
    title text,
    audio_url text,
    created_at timestamp default now()
);

insert into storage.buckets (id, name)
values ('audiobooks','audiobooks');
