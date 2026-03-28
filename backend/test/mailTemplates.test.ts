import test from 'node:test';
import assert from 'assert';
import { ObjectId } from 'mongodb';
import {
  buildLoanSummary,
  loanOverdueTemplate,
  loanStartReminderTemplate,
} from '../src/utils/mailTemplates';

process.env.TZ = 'UTC';

const SIGNATURE = "L'équipe GestMat";
const dateFormatter = (value: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(value);

const loanId = new ObjectId('507f1f77bcf86cd799439011');
const startDate = new Date('2025-01-01T10:00:00.000Z');
const endDate = new Date('2025-01-10T16:30:00.000Z');

const sampleLoan = {
  _id: loanId,
  owner: { name: 'Structure Prêteuse' },
  borrower: { name: 'Structure Emprunteuse' },
  requestedBy: { firstName: 'Ada', lastName: 'Lovelace' },
  items: [
    { equipment: { name: 'Caméra 4K' }, quantity: 2 },
    { equipment: { name: 'Trépied' }, quantity: 1 },
  ],
  startDate,
  endDate,
  status: 'pending',
  note: 'Livraison avant midi.',
};

const expectedSummaryText = [
  'Prêteur : Structure Prêteuse',
  'Emprunteur : Structure Emprunteuse',
  'Demandeur : Ada Lovelace',
  `Début : ${dateFormatter(startDate)}`,
  `Fin : ${dateFormatter(endDate)}`,
  'Statut : en attente',
  'Matériel :',
  '- Caméra 4K (quantité : 2)',
  '- Trépied (quantité : 1)',
  'Note : Livraison avant midi.',
].join('\n');

const expectedSummaryHtml = [
  '<ul aria-label="Détails du prêt">',
  '<li><strong>Prêteur :</strong> Structure Prêteuse</li>',
  '<li><strong>Emprunteur :</strong> Structure Emprunteuse</li>',
  '<li><strong>Demandeur :</strong> Ada Lovelace</li>',
  `<li><strong>Début :</strong> ${dateFormatter(startDate)}</li>`,
  `<li><strong>Fin :</strong> ${dateFormatter(endDate)}</li>`,
  '<li><strong>Statut :</strong> en attente</li>',
  '<li><strong>Matériel :</strong><ul><li><strong>Caméra 4K</strong> — quantité : 2</li><li><strong>Trépied</strong> — quantité : 1</li></ul></li>',
  '<li><strong>Note :</strong> Livraison avant midi.</li>',
  '</ul>',
].join('');

const vehicleLoan = {
  ...sampleLoan,
  items: [
    {
      kind: 'vehicle',
      vehicle: { name: 'Renault Kangoo', registrationNumber: 'AB-123-CD' },
      quantity: 4,
    },
  ],
};

const expectedVehicleSummaryText = [
  'Prêteur : Structure Prêteuse',
  'Emprunteur : Structure Emprunteuse',
  'Demandeur : Ada Lovelace',
  `Début : ${dateFormatter(startDate)}`,
  `Fin : ${dateFormatter(endDate)}`,
  'Statut : en attente',
  'Véhicule :',
  '- Renault Kangoo - AB-123-CD (quantité : 1)',
  'Note : Livraison avant midi.',
].join('\n');

const expectedVehicleSummaryHtml = [
  '<ul aria-label="Détails du prêt">',
  '<li><strong>Prêteur :</strong> Structure Prêteuse</li>',
  '<li><strong>Emprunteur :</strong> Structure Emprunteuse</li>',
  '<li><strong>Demandeur :</strong> Ada Lovelace</li>',
  `<li><strong>Début :</strong> ${dateFormatter(startDate)}</li>`,
  `<li><strong>Fin :</strong> ${dateFormatter(endDate)}</li>`,
  '<li><strong>Statut :</strong> en attente</li>',
  '<li><strong>Véhicule :</strong><ul><li><strong>Renault Kangoo - AB-123-CD</strong> — quantité : 1</li></ul></li>',
  '<li><strong>Note :</strong> Livraison avant midi.</li>',
  '</ul>',
].join('');

function buildExpectedTemplate({
  subject,
  preamble,
  eventLine,
  action,
}: {
  subject: string;
  preamble: string;
  eventLine: string;
  action: string;
}) {
  const text = [
    'Bonjour,',
    '',
    preamble,
    eventLine,
    '',
    'Résumé du prêt :',
    expectedSummaryText,
    '',
    `Action à entreprendre : ${action}`,
    '',
    SIGNATURE,
  ].join('\n');

  const html = [
    '<p>Bonjour,</p>',
    `<p>${preamble}</p>`,
    `<p>${eventLine}</p>`,
    `<div role="group" aria-label="Résumé du prêt">${expectedSummaryHtml}</div>`,
    `<p><strong>Action à entreprendre :</strong> ${action}</p>`,
    `<p>${SIGNATURE}</p>`,
  ].join('');

  return { subject, text, html };
}

test('buildLoanSummary aligne texte et HTML', () => {
  const summary = buildLoanSummary(sampleLoan as any);

  assert.deepStrictEqual(summary, {
    text: expectedSummaryText,
    html: expectedSummaryHtml,
  });
});

test('loanStartReminderTemplate conserve un gabarit harmonisé', () => {
  const template = loanStartReminderTemplate({
    loan: sampleLoan as any,
    role: 'borrower',
  });
  const expected = buildExpectedTemplate({
    subject: 'Rappel : début de prêt imminent - emprunteur',
    preamble: 'Votre structure est sur le point de commencer un prêt.',
    eventLine: `Le prêt ${loanId.toString()} va bientôt commencer.`,
    action: 'Préparer la réception du matériel et vérifier les modalités avec le prêteur.',
  });

  assert.deepStrictEqual(template, expected);
});

test("buildLoanSummary gère les items de type kind='vehicle'", () => {
  const summary = buildLoanSummary(vehicleLoan as any);

  assert.deepStrictEqual(summary, {
    text: expectedVehicleSummaryText,
    html: expectedVehicleSummaryHtml,
  });
});

test("buildLoanSummary utilise 'Éléments prêtés' quand les items sont mixtes", () => {
  const mixedLoan = {
    ...sampleLoan,
    items: [
      { kind: 'equipment', equipment: { name: 'Caméra 4K' }, quantity: 2 },
      {
        kind: 'vehicle',
        vehicle: { name: 'Peugeot Partner', registrationNumber: 'EF-456-GH' },
      },
    ],
  };

  const summary = buildLoanSummary(mixedLoan as any);

  assert.match(summary.text, /Éléments prêtés :/);
  assert.match(summary.html, /<strong>Éléments prêtés :<\/strong>/);
  assert.match(summary.text, /- Peugeot Partner - EF-456-GH \(quantité : 1\)/);
});

test('loanOverdueTemplate conserve un gabarit harmonisé', () => {
  const template = loanOverdueTemplate({ loan: sampleLoan as any, role: 'requester' });
  const expected = buildExpectedTemplate({
    subject: 'Prêt en retard - suivi de votre demande',
    preamble: 'Vous êtes le demandeur de ce prêt.',
    eventLine: `Le prêt ${loanId.toString()} est en retard.`,
    action:
      "Relancer l'emprunteur sur la restitution du matériel et mettre à jour GestMat si nécessaire.",
  });

  assert.deepStrictEqual(template, expected);
});

test('les templates de prêt ne contiennent pas de libellés par défaut', () => {
  const summary = buildLoanSummary(sampleLoan as any);
  const overdueTemplate = loanOverdueTemplate({ loan: sampleLoan as any });
  const reminderTemplate = loanStartReminderTemplate({ loan: sampleLoan as any });

  const forbiddenLabels = ['Non renseignée', 'Utilisateur inconnu'];
  for (const label of forbiddenLabels) {
    assert.ok(!summary.text.includes(label));
    assert.ok(!summary.html.includes(label));
    assert.ok(!overdueTemplate.text.includes(label));
    assert.ok(!overdueTemplate.html.includes(label));
    assert.ok(!reminderTemplate.text.includes(label));
    assert.ok(!reminderTemplate.html.includes(label));
  }
});
