-- Quiz Claude Code — schema inicial (prd.md §8.3)
-- Princípio: o gabarito nunca é legível pelo cliente. RLS ativado em todas as
-- tabelas, sem policies para anon/authenticated. Acesso só via Edge Functions
-- (service_role) ou pela RPC pública get_leaderboard.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type quiz_level as enum ('beginner', 'intermediate', 'advanced');
create type board_level as enum ('beginner', 'intermediate', 'advanced', 'mixed');

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table questions (
  id           text primary key check (id ~ '^(beg|int|adv)-[0-9]{3}$'),
  level        quiz_level not null,
  category     text not null,
  statement    text not null check (char_length(statement) <= 200),
  answer       boolean not null,
  explanation  text not null,
  doc_url      text not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index questions_active_level_idx on questions (level) where active;

create table sessions (
  id            uuid primary key default gen_random_uuid(),
  level         board_level not null,
  question_ids  text[] not null check (array_length(question_ids, 1) = 10),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  score         smallint check (score between 0 and 10),
  duration_ms   integer check (duration_ms >= 0),
  ip_hash       text not null,
  submitted     boolean not null default false,
  expires_at    timestamptz not null default now() + interval '30 minutes'
);
create index sessions_ip_started_idx on sessions (ip_hash, started_at);

create table session_answers (
  session_id   uuid not null references sessions(id) on delete cascade,
  position     smallint not null check (position between 0 and 9),
  question_id  text not null references questions(id),
  user_answer  boolean not null,
  is_correct   boolean not null,
  answered_at  timestamptz not null default now(),
  primary key (session_id, position)
);
-- FK sem índice deixa joins/cascades lentos; também serve à métrica de acerto por pergunta.
create index session_answers_question_idx on session_answers (question_id);

create table leaderboard (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null unique references sessions(id) on delete cascade,
  level        board_level not null,
  nickname     text not null check (char_length(nickname) between 3 and 20),
  score        smallint not null check (score between 0 and 10),
  duration_ms  integer not null,
  finished_at  timestamptz not null,
  created_at   timestamptz not null default now()
);
create index leaderboard_rank_idx on leaderboard (level, score desc, duration_ms asc, finished_at asc);
create index leaderboard_period_idx on leaderboard (level, finished_at);

-- ---------------------------------------------------------------------------
-- RLS: ativado e sem policies => anon/authenticated não leem nada.
-- O revoke é defesa extra caso alguém crie uma policy por engano.
-- ---------------------------------------------------------------------------
alter table questions       enable row level security;
alter table sessions        enable row level security;
alter table session_answers enable row level security;
alter table leaderboard     enable row level security;

revoke all on table questions, sessions, session_answers, leaderboard from anon, authenticated;

-- Grants explícitos para o service_role (Edge Functions e scripts): conforme as
-- configurações da Data API, tabelas novas podem não receber grants automáticos.
grant usage on schema public to service_role;
grant select, insert, update, delete on table questions, sessions, session_answers, leaderboard
  to service_role;

-- ---------------------------------------------------------------------------
-- RPC pública: ranking (melhor rodada por nickname, por nível/período)
-- SECURITY DEFINER é intencional: anon não lê a tabela leaderboard; a função
-- expõe só nickname/score/duration/finished_at, com limite de 100 linhas.
-- ---------------------------------------------------------------------------
create or replace function get_leaderboard(
  p_level board_level,
  p_period text default 'all',
  p_limit int default 50
)
returns table (rank bigint, nickname text, score smallint, duration_ms integer, finished_at timestamptz)
language sql stable security definer set search_path = public as $$
  with filtered as (
    select * from leaderboard
    where level = p_level
      and (p_period = 'all'
           or finished_at >= date_trunc('week', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
  ),
  best as (
    select distinct on (lower(nickname)) *
    from filtered
    order by lower(nickname), score desc, duration_ms asc, finished_at asc
  )
  select row_number() over (order by score desc, duration_ms asc, finished_at asc),
         nickname, score, duration_ms, finished_at
  from best
  order by score desc, duration_ms asc, finished_at asc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke execute on function get_leaderboard(board_level, text, int) from public;
grant execute on function get_leaderboard(board_level, text, int) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- record_answer: corrige e grava uma resposta de forma atômica.
-- Trava a sessão (for update) para que requisições simultâneas não quebrem a
-- ordem (RN05) nem a regra de resposta única (RN04).
-- Erros: exceção com a mensagem = código da API (mapeado na Edge Function).
-- SECURITY INVOKER: só o service_role (que já ignora RLS) pode executá-la; se o
-- EXECUTE vazar para outro papel, o RLS ainda bloqueia o acesso às tabelas.
-- ---------------------------------------------------------------------------
create or replace function record_answer(p_session_id uuid, p_position int, p_answer boolean)
returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  v_session   sessions%rowtype;
  v_existing  session_answers%rowtype;
  v_question  questions%rowtype;
  v_count     int;
  v_correct   boolean;
  v_score     int;
  v_total     int;
  v_finished  boolean := false;
  v_duration  int;
begin
  select * into v_session from sessions where id = p_session_id for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  v_total := array_length(v_session.question_ids, 1);
  if p_position < 0 or p_position >= v_total then
    raise exception 'OUT_OF_ORDER';
  end if;

  -- Retry idempotente: mesma resposta para uma posição já respondida devolve o resultado salvo.
  select * into v_existing from session_answers
   where session_id = p_session_id and position = p_position;
  if found then
    if v_existing.user_answer is distinct from p_answer then
      raise exception 'ALREADY_ANSWERED';
    end if;
    select * into v_question from questions where id = v_existing.question_id;
    select count(*) filter (where is_correct) into v_score
      from session_answers where session_id = p_session_id and position <= p_position;
    v_finished := p_position = v_total - 1 and v_session.finished_at is not null;
    return jsonb_build_object(
      'correct', v_existing.is_correct,
      'correctAnswer', v_question.answer,
      'explanation', v_question.explanation,
      'docUrl', v_question.doc_url,
      'scoreSoFar', v_score,
      'finished', v_finished,
      'result', case when v_finished
        then jsonb_build_object('score', v_session.score, 'durationMs', v_session.duration_ms)
        else null end
    );
  end if;

  if v_session.expires_at <= now() then
    raise exception 'SESSION_EXPIRED';
  end if;

  select count(*) into v_count from session_answers where session_id = p_session_id;
  if p_position <> v_count then
    raise exception 'OUT_OF_ORDER';
  end if;

  select * into v_question from questions where id = v_session.question_ids[p_position + 1];
  v_correct := v_question.answer = p_answer;

  insert into session_answers (session_id, position, question_id, user_answer, is_correct)
  values (p_session_id, p_position, v_question.id, p_answer, v_correct);

  select count(*) filter (where is_correct) into v_score
    from session_answers where session_id = p_session_id;

  if p_position = v_total - 1 then
    v_finished := true;
    v_duration := floor(extract(epoch from (clock_timestamp() - v_session.started_at)) * 1000)::int;
    update sessions
       set finished_at = v_session.started_at + make_interval(secs => v_duration / 1000.0),
           score = v_score,
           duration_ms = v_duration
     where id = p_session_id;
  end if;

  return jsonb_build_object(
    'correct', v_correct,
    'correctAnswer', v_question.answer,
    'explanation', v_question.explanation,
    'docUrl', v_question.doc_url,
    'scoreSoFar', v_score,
    'finished', v_finished,
    'result', case when v_finished
      then jsonb_build_object('score', v_score, 'durationMs', v_duration)
      else null end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_to_leaderboard: envia uma rodada concluída ao ranking (uma vez).
-- O nickname é validado (regex + palavrões) na Edge Function antes da chamada.
-- ---------------------------------------------------------------------------
create or replace function submit_to_leaderboard(
  p_session_id uuid,
  p_nickname text,
  p_min_duration_ms int default 15000
)
returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  v_session sessions%rowtype;
  v_rank    bigint;
begin
  select * into v_session from sessions where id = p_session_id for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if v_session.finished_at is null then
    raise exception 'NOT_FINISHED';
  end if;
  if v_session.submitted then
    raise exception 'ALREADY_SUBMITTED';
  end if;
  if v_session.expires_at <= now() then
    raise exception 'SESSION_EXPIRED';
  end if;
  if v_session.duration_ms < p_min_duration_ms then
    raise exception 'SUSPICIOUS_RUN';
  end if;

  insert into leaderboard (session_id, level, nickname, score, duration_ms, finished_at)
  values (p_session_id, v_session.level, p_nickname, v_session.score, v_session.duration_ms,
          v_session.finished_at);

  update sessions set submitted = true where id = p_session_id;

  -- Posição do nickname no ranking geral do nível (mesma regra da get_leaderboard).
  with best as (
    select distinct on (lower(nickname)) nickname, score, duration_ms, finished_at
    from leaderboard
    where level = v_session.level
    order by lower(nickname), score desc, duration_ms asc, finished_at asc
  ),
  ranked as (
    select nickname, row_number() over (order by score desc, duration_ms asc, finished_at asc) as r
    from best
  )
  select r into v_rank from ranked where lower(nickname) = lower(p_nickname);

  return jsonb_build_object('rank', v_rank, 'level', v_session.level);
end;
$$;

-- Funções de escrita: só service_role (Edge Functions). Postgres concede EXECUTE
-- a PUBLIC (e o Supabase a anon/authenticated) por padrão, então revogamos.
revoke execute on function record_answer(uuid, int, boolean) from public, anon, authenticated;
revoke execute on function submit_to_leaderboard(uuid, text, int) from public, anon, authenticated;
grant execute on function record_answer(uuid, int, boolean) to service_role;
grant execute on function submit_to_leaderboard(uuid, text, int) to service_role;
