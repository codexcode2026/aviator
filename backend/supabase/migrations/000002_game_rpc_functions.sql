create or replace function place_bet(
  p_user_id uuid,
  p_round_id uuid,
  p_panel smallint,
  p_amount numeric,
  p_reference text default null
) returns jsonb as $$
declare
  v_balance numeric;
  v_wallet_version int;
  v_bet_id uuid;
  v_min_bet numeric;
  v_max_bet numeric;
begin
  select coalesce((value->>'min_bet')::numeric, 1),
         coalesce((value->>'max_bet')::numeric, 10000)
  into v_min_bet, v_max_bet
  from config where key = 'bet_limits';

  if p_amount <= 0 or p_amount < v_min_bet or p_amount > v_max_bet then
    return jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  end if;

  select balance, version into v_balance, v_wallet_version
  from wallets where user_id = p_user_id for update;

  if v_balance is null then
    return jsonb_build_object('ok', false, 'reason', 'no_wallet');
  end if;

  if v_balance < p_amount then
    return jsonb_build_object('ok', false, 'reason', 'insufficient');
  end if;

  insert into bets (user_id, round_id, panel, amount, status)
  values (p_user_id, p_round_id, p_panel, p_amount, 'locked')
  on conflict (user_id, round_id, panel) where status <> 'cancelled' do nothing
  returning id into v_bet_id;

  if v_bet_id is null then
    return jsonb_build_object('ok', false, 'reason', 'duplicate');
  end if;

  update wallets
    set balance = balance - p_amount,
        version = version + 1,
        updated_at = now()
    where user_id = p_user_id and version = v_wallet_version
    returning balance into v_balance;

  if v_balance is null then
    delete from bets where id = v_bet_id;
    return jsonb_build_object('ok', false, 'reason', 'concurrent');
  end if;

  insert into wallet_ledger (user_id, type, amount, running_balance, round_id, bet_id, reference)
  values (p_user_id, 'bet_lock', -p_amount, v_balance, p_round_id, v_bet_id, p_reference);

  return jsonb_build_object('ok', true, 'balance', v_balance, 'bet_id', v_bet_id);
end;
$$ language plpgsql;

create or replace function cancel_bet(
  p_user_id uuid,
  p_round_id uuid,
  p_panel smallint,
  p_reference text default null
) returns jsonb as $$
declare
  v_bet_id uuid;
  v_amount numeric;
  v_balance numeric;
  v_wallet_version int;
  v_round_status text;
begin
  select status into v_round_status from rounds where id = p_round_id;
  if v_round_status <> 'betting' then
    return jsonb_build_object('ok', false, 'reason', 'not_betting');
  end if;

  select id, amount into v_bet_id, v_amount
  from bets
  where user_id = p_user_id and round_id = p_round_id and panel = p_panel and status = 'locked'
  for update;

  if v_bet_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select balance, version into v_balance, v_wallet_version
  from wallets where user_id = p_user_id for update;

  update wallets
    set balance = balance + v_amount,
        version = version + 1,
        updated_at = now()
    where user_id = p_user_id and version = v_wallet_version
    returning balance into v_balance;

  if v_balance is null then
    return jsonb_build_object('ok', false, 'reason', 'concurrent');
  end if;

  update bets set status = 'cancelled', resolved_at = now() where id = v_bet_id;

  insert into wallet_ledger (user_id, type, amount, running_balance, round_id, bet_id, reference)
  values (p_user_id, 'bet_refund', v_amount, v_balance, p_round_id, v_bet_id, p_reference);

  return jsonb_build_object('ok', true, 'balance', v_balance, 'bet_id', v_bet_id);
end;
$$ language plpgsql;

create or replace function cashout_bet(
  p_user_id uuid,
  p_round_id uuid,
  p_panel smallint,
  p_multiplier numeric,
  p_reference text default null
) returns jsonb as $$
declare
  v_bet_id uuid;
  v_amount numeric;
  v_win numeric;
  v_balance numeric;
  v_wallet_version int;
  v_round_status text;
begin
  select status into v_round_status from rounds where id = p_round_id;
  if v_round_status <> 'flying' then
    return jsonb_build_object('ok', false, 'reason', 'not_flying');
  end if;

  select id, amount into v_bet_id, v_amount
  from bets
  where user_id = p_user_id and round_id = p_round_id and panel = p_panel and status = 'locked'
  for update;

  if v_bet_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_win := round(v_amount * p_multiplier, 2);

  select balance, version into v_balance, v_wallet_version
  from wallets where user_id = p_user_id for update;

  update wallets
    set balance = balance + v_win,
        version = version + 1,
        updated_at = now()
    where user_id = p_user_id and version = v_wallet_version
    returning balance into v_balance;

  if v_balance is null then
    return jsonb_build_object('ok', false, 'reason', 'concurrent');
  end if;

  update bets
    set status = 'cashed_out',
        cashout_multiplier = p_multiplier,
        win_amount = v_win,
        resolved_at = now()
    where id = v_bet_id;

  insert into cashouts (bet_id, round_id, user_id, multiplier, win_amount)
  values (v_bet_id, p_round_id, p_user_id, p_multiplier, v_win);

  insert into wallet_ledger (user_id, type, amount, running_balance, round_id, bet_id, reference)
  values (p_user_id, 'win', v_win, v_balance, p_round_id, v_bet_id, p_reference);

  return jsonb_build_object('ok', true, 'balance', v_balance, 'win', v_win, 'multiplier', p_multiplier, 'bet_id', v_bet_id);
end;
$$ language plpgsql;

create or replace function resolve_round(
  p_round_id uuid,
  p_crash_point numeric,
  p_seed text,
  p_server_instance_id text default null
) returns jsonb as $$
declare
  v_bet record;
  v_hashed_seed text;
  v_started_at timestamptz;
begin
  update rounds
    set status = 'crashed',
        crash_point = p_crash_point,
        seed = p_seed,
        ended_at = now()
    where id = p_round_id and status = 'flying'
  returning hashed_seed, started_at into v_hashed_seed, v_started_at;

  if v_hashed_seed is null then
    return jsonb_build_object('ok', false, 'reason', 'not_flying_or_resolved');
  end if;

  insert into audit_rounds (round_id, hashed_seed, seed, crash_point, status, server_instance_id, started_at, ended_at)
  values (p_round_id, v_hashed_seed, p_seed, p_crash_point, 'crashed', p_server_instance_id, v_started_at, now());

  for v_bet in
    select id, user_id, amount from bets
    where round_id = p_round_id and status = 'locked'
    for update
  loop
    update bets set status = 'lost', resolved_at = now() where id = v_bet.id;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$ language plpgsql;

create or replace function create_round(
  p_hashed_seed text,
  p_server_instance_id text default null
) returns uuid as $$
declare
  v_round_id uuid;
begin
  insert into rounds (hashed_seed, status)
  values (p_hashed_seed, 'betting')
  returning id into v_round_id;

  insert into audit_rounds (round_id, hashed_seed, status, server_instance_id, started_at)
  values (v_round_id, p_hashed_seed, 'betting', p_server_instance_id, now());

  return v_round_id;
end;
$$ language plpgsql;

create or replace function start_round(
  p_round_id uuid
) returns jsonb as $$
declare
  v_hashed_seed text;
  v_started_at timestamptz;
begin
  update rounds
    set status = 'flying', started_at = now()
    where id = p_round_id and status = 'betting'
  returning hashed_seed, started_at into v_hashed_seed, v_started_at;

  if v_hashed_seed is null then
    return jsonb_build_object('ok', false, 'reason', 'not_betting');
  end if;

  update audit_rounds
    set status = 'flying', started_at = v_started_at
    where round_id = p_round_id and status = 'betting';

  return jsonb_build_object('ok', true);
end;
$$ language plpgsql;
