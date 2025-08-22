/* Firebase Functions - B1 20º GBM */
const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineScheduledFunction } = require('firebase-functions/v2/scheduler');

admin.initializeApp();
const db = admin.firestore();

// Util: cria snapshot sanitizado para leitura pública
function toPublicMilitar(data) {
  return {
    nome: data.nome || '',
    nomeDeGuerra: data.nomeDeGuerra || '',
    posto: data.posto || '',
    situacao: data.situacao || 'Ativo',
    lotacaoAtual: data.lotacaoAtual || '',
    // campos públicos úteis
    matricula: data.matricula || '',
    criadoEm: data.criadoEm || admin.firestore.FieldValue.serverTimestamp(),
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// Auditoria de CRUD nos militares (dados completos)
exports.auditMilitares = onDocumentWritten('militares/{militarId}', async (event) => {
  const militarId = event.params.militarId;
  const before = event.data.before.exists ? event.data.before.data() : null;
  const after = event.data.after.exists ? event.data.after.data() : null;

  const changeType = before && after ? 'update' : (after ? 'create' : 'delete');

  await db.collection('auditoria').add({
    ts: admin.firestore.FieldValue.serverTimestamp(),
    collection: 'militares',
    docId: militarId,
    tipo: changeType,
    antes: before,
    depois: after,
    actorUid: event.auth?.uid || null,
    actorEmail: event.auth?.token?.email || null,
  });

  // espelho sanitizado para leitura pública
  if (after) {
    const pub = toPublicMilitar(after);
    await db.collection('militares_public').doc(militarId).set(pub, { merge: true });
  } else {
    await db.collection('militares_public').doc(militarId).delete().catch(() => {});
  }
});

// Auditoria de subcoleções relevantes
exports.auditSubcollections = onDocumentWritten('militares/{militarId}/{sub}/{docId}', async (event) => {
  const { militarId, sub, docId } = event.params;
  if (!['cursos', 'movimentacoes', 'dependentes', 'anexos'].includes(sub)) return;

  const before = event.data.before.exists ? event.data.before.data() : null;
  const after = event.data.after.exists ? event.data.after.data() : null;
  const changeType = before && after ? 'update' : (after ? 'create' : 'delete');

  await db.collection('auditoria').add({
    ts: admin.firestore.FieldValue.serverTimestamp(),
    collection: `militares/${militarId}/${sub}`,
    docId: docId,
    tipo: changeType,
    antes: before,
    depois: after,
    actorUid: event.auth?.uid || null,
    actorEmail: event.auth?.token?.email || null,
  });
});

// Agendador diário: gera alertas de prazos (06:00 America/Belem)
exports.dailyAlerts = defineScheduledFunction({
  schedule: '0 6 * * *', timeZone: 'America/Belem'
}, async (event) => {
  const hoje = admin.firestore.Timestamp.now().toDate();
  const inDays = (d) => {
    const x = new Date(hoje);
    x.setDate(x.getDate() + d);
    return x;
  };

  // Cursos com validade nos próximos 30 dias
  const cursosSnap = await db.collectionGroup('cursos').get();
  for (const doc of cursosSnap.docs) {
    const c = doc.data();
    if (!c.validade) continue;
    const validade = c.validade.toDate ? c.validade.toDate() : new Date(c.validade);
    if (validade >= hoje && validade <= inDays(30)) {
      await db.collection('notificacoes').add({
        tipo: 'curso_vencendo',
        militarRef: doc.ref.parent.parent, // ref do militar
        curso: c.titulo || c.nome || '',
        validade,
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
        lido: false,
      });
    }
  }

  // Movimentações de férias/licenças prestes a iniciar nos próximos 15 dias
  const movSnap = await db.collectionGroup('movimentacoes').get();
  for (const doc of movSnap.docs) {
    const m = doc.data();
    if (!m.tipo || !m.inicio) continue;
    const inicio = m.inicio.toDate ? m.inicio.toDate() : new Date(m.inicio);
    if (inicio >= hoje && inicio <= inDays(15)) {
      await db.collection('notificacoes').add({
        tipo: 'movimentacao_proxima',
        militarRef: doc.ref.parent.parent,
        movTipo: m.tipo,
        inicio,
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
        lido: false,
      });
    }
  }

  // Estatísticas rápidas (efetivo por posto / situação)
  const milSnap = await db.collection('militares').get();
  const porPosto = {}, porSituacao = {};
  for (const doc of milSnap.docs) {
    const d = doc.data();
    porPosto[d.posto || 'N/I'] = (porPosto[d.posto || 'N/I'] || 0) + 1;
    porSituacao[d.situacao || 'N/I'] = (porSituacao[d.situacao || 'N/I'] || 0) + 1;
  }
  await db.collection('stats').doc('efetivo').set({
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    total: milSnap.size,
    porPosto, porSituacao
  }, { merge: true });
});
