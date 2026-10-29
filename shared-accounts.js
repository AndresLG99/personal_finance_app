// Cuentas compartidas: el dueño comparte una de sus cuentas con un código; otra persona,
// con su propia cuenta de la app, se "linkea" a esa cuenta con ese código. La cuenta sigue
// viviendo únicamente en el documento del dueño (finance_books) — la persona invitada
// nunca tiene acceso a ese documento. Lo que agrega esta pieza es una tabla aparte
// (shared_account_transactions, ver supabase-cuentas-compartidas.sql) donde la persona
// invitada puede agregar movimientos (solo gasto/ingreso directo) a esa cuenta, cada uno
// con quién lo creó, para que cada persona solo pueda editar/eliminar los suyos.
//
// Alcance de v1 (ver tests/pre-push-check.mjs, lote 2026-10-25):
// - La persona invitada no ve el historial de antes de unirse, solo los movimientos
//   compartidos agregados desde entonces. El SALDO que ve sí es el real: el dueño
//   sincroniza un "saldo base" (su parte privada) cada vez que guarda su documento
//   (ver syncSharedBase, llamada desde persist() en app.js), y aquí se le suma lo de la
//   tabla compartida.
// - Solo gasto/ingreso directo — no transferencias, pagos de tarjeta ni MSI.

// Usa el mismo "hoy" (fecha LOCAL, en-CA) que el resto de la app (ver today() en finance.js)
// en vez de la fecha UTC — si usáramos UTC, en zonas horarias con offset negativo (la
// mayoría de América) habría hasta ~6-8 horas cada noche donde "hoy" según UTC ya sería
// "mañana" en local, y el saldo base de una cuenta recién unida (asOf) quedaría un día
// adelantado respecto al resto de la app.
import { today as todayStr } from './finance.js?v=20261024-1';

let cache = { ownedByAccountId: new Map(), joinedAccounts: [], txByShared: new Map() };

export function resetSharedCache() {
  cache = { ownedByAccountId: new Map(), joinedAccounts: [], txByShared: new Map() };
}

// Info de shared_accounts para una cuenta PROPIA (si la compartiste), o null.
export function sharedOwnedInfo(accountId) {
  return cache.ownedByAccountId.get(accountId) || null;
}

// Cuentas "virtuales" de otras personas a las que te uniste con un código.
export function sharedJoinedAccounts() {
  return cache.joinedAccounts;
}

// Distinct creator_user_id de TODOS los movimientos compartidos ya cacheados (de todas las
// cuentas, propias y a las que te uniste) — para precargar de una sola vez los perfiles
// (nombre/foto) de quienes los agregaron, en vez de uno por uno al renderizar cada fila
// (ver sharedTxAvatarMarkup en app.js).
export function sharedCreatorIds() {
  const ids = new Set();
  for (const rows of cache.txByShared.values()) for (const r of rows) if (r.creator_user_id) ids.add(r.creator_user_id);
  return [...ids];
}

// El id de shared_accounts correspondiente a una cuenta (propia compartida, o virtual de alguien más).
export function sharedAccountIdFor(a) {
  if (!a) return null;
  if (a.__shared) return a.__shared.sharedAccountId;
  const info = cache.ownedByAccountId.get(a.id);
  return info ? info.id : null;
}

// Cuánto suman los movimientos compartidos de esa cuenta hasta cierta fecha (positivo si
// suman a favor, negativo si restan) — para sumarlo al saldo que ya se muestra.
export function sharedContribution(a, date) {
  const said = sharedAccountIdFor(a);
  if (!said) return 0;
  const rows = cache.txByShared.get(said) || [];
  return rows.filter((r) => r.date <= date).reduce((s, r) => s + (r.kind === 'income' ? r.amount : -r.amount), 0);
}

// Los movimientos compartidos de una cuenta, en la forma de transacción que ya usa el
// resto de la app (txIcon/txAmount/txSub/esc los pueden leer igual), marcando cuáles son
// de la persona actual (editables) y cuáles no (__readonly).
export function sharedTxAsTransactions(a, currentUserId) {
  const said = sharedAccountIdFor(a);
  if (!said) return [];
  const rows = cache.txByShared.get(said) || [];
  return rows
    .map((row) => ({
      id: 'stx:' + row.id,
      kind: row.kind,
      amount: row.amount,
      received: row.amount,
      concept: row.concept || (row.kind === 'income' ? 'Ingreso compartido' : 'Gasto compartido'),
      category: row.category || '',
      date: row.date,
      status: 'done',
      from: row.kind === 'expense' ? a.id : null,
      to: row.kind === 'income' ? a.id : null,
      __sharedTxId: row.id,
      __sharedAccountId: said,
      creatorUserId: row.creator_user_id,
      __readonly: row.creator_user_id !== currentUserId,
    }))
    .sort((x, y) => y.date.localeCompare(x.date));
}

// Refresca el caché: cuentas propias compartidas, cuentas a las que te uniste, y los
// movimientos compartidos de todas ellas. Se llama tras iniciar sesión, al reconectar el
// realtime, y después de compartir/unirte/agregar-editar-eliminar un movimiento compartido.
export async function refreshShared(client, userId) {
  if (!client || !userId) {
    resetSharedCache();
    return;
  }
  const ownedRes = await client.from('shared_accounts').select('*').eq('owner_user_id', userId);
  const owned = (ownedRes.data || []).filter((r) => !r.revoked);

  const memberRes = await client.from('shared_account_members').select('shared_account_id').eq('user_id', userId);
  const memberIds = (memberRes.data || []).map((m) => m.shared_account_id);

  let joinedRows = [];
  if (memberIds.length) {
    const joinedRes = await client.from('shared_accounts').select('*').in('id', memberIds);
    joinedRows = (joinedRes.data || []).filter((r) => !r.revoked);
  }

  const ownedByAccountId = new Map(owned.map((r) => [r.account_id, r]));
  const joinedAccounts = joinedRows.map((r) => ({
    id: 'shared:' + r.id,
    name: r.name,
    type: r.type,
    currency: r.currency,
    color: r.color || 'auto',
    opening: r.base_balance || 0,
    asOf: todayStr(),
    archived: false,
    available: false,
    __shared: { sharedAccountId: r.id, ownerUserId: r.owner_user_id, accountId: r.account_id, role: 'member' },
  }));

  const allIds = [...owned.map((r) => r.id), ...joinedRows.map((r) => r.id)];
  const txByShared = new Map();
  if (allIds.length) {
    const txRes = await client.from('shared_account_transactions').select('*').in('shared_account_id', allIds);
    for (const row of txRes.data || []) {
      const list = txByShared.get(row.shared_account_id) || [];
      list.push(row);
      txByShared.set(row.shared_account_id, list);
    }
  }

  cache = { ownedByAccountId, joinedAccounts, txByShared };
}

export async function shareAccount(client, ownerUserId, account) {
  const { data, error } = await client
    .from('shared_accounts')
    .insert({
      owner_user_id: ownerUserId,
      account_id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      color: account.color || 'auto',
      base_balance: 0,
    })
    .select('*');
  if (error) throw Error('No se pudo compartir la cuenta: ' + error.message);
  return Array.isArray(data) ? data[0] : data;
}

export async function revokeShare(client, sharedAccountId) {
  await client.from('shared_account_members').delete().eq('shared_account_id', sharedAccountId);
  const { error } = await client.from('shared_accounts').update({ revoked: true }).eq('id', sharedAccountId);
  if (error) throw Error('No se pudo dejar de compartir: ' + error.message);
}

export async function joinSharedAccount(client, code) {
  const { data, error } = await client.rpc('join_shared_account', { p_code: String(code || '').trim() });
  if (error) {
    if (/CODIGO_INVALIDO/.test(error.message)) throw Error('Ese código no es válido o ya no está activo.');
    if (/ES_TU_PROPIA_CUENTA/.test(error.message)) throw Error('Esa cuenta ya es tuya; no puedes unirte a ella con un código.');
    throw Error('No se pudo unir con ese código: ' + error.message);
  }
  return Array.isArray(data) ? data[0] : data;
}

export async function addSharedTransaction(client, sharedAccountId, creatorUserId, { kind, amount, concept, category, date }) {
  if (kind !== 'expense' && kind !== 'income') throw Error('Esta cuenta compartida solo admite gasto o ingreso directo.');
  const { error } = await client.from('shared_account_transactions').insert({
    shared_account_id: sharedAccountId,
    creator_user_id: creatorUserId,
    kind,
    amount,
    concept: concept || '',
    category: category || '',
    date,
  });
  if (error) throw Error('No se pudo guardar el movimiento compartido: ' + error.message);
}

export async function editSharedTransaction(client, sharedTxId, { kind, amount, concept, category, date }) {
  const { error } = await client
    .from('shared_account_transactions')
    .update({ kind, amount, concept: concept || '', category: category || '', date })
    .eq('id', sharedTxId);
  if (error) throw Error('No se pudo editar el movimiento compartido: ' + error.message);
}

export async function deleteSharedTransaction(client, sharedTxId) {
  const { error } = await client.from('shared_account_transactions').delete().eq('id', sharedTxId);
  if (error) throw Error('No se pudo eliminar el movimiento compartido: ' + error.message);
}

// Tras cada guardado del documento del dueño (persist() en app.js): empuja a
// shared_accounts el saldo base (solo su parte privada, sin contar la tabla
// compartida — eso se suma aparte al leer) y los metadatos (nombre/tipo/moneda/color)
// de cada una de sus cuentas que esté compartida, para que quien se unió vea datos al día.
export async function syncSharedBase(client, accounts, computeOwnBalance) {
  for (const [accountId, info] of cache.ownedByAccountId) {
    const a = accounts.find((x) => x.id === accountId);
    if (!a) continue;
    const base = computeOwnBalance(a);
    await client
      .from('shared_accounts')
      .update({ name: a.name, type: a.type, currency: a.currency, color: a.color || 'auto', base_balance: base })
      .eq('id', info.id);
  }
}
