import test from 'node:test';
import assert from 'assert';
import { ObjectId } from 'mongodb';
import {
  buildLoanSummary,
  loanCreationTemplate,
  loanStatusTemplate,
  loanOverdueTemplate,
  loanStartReminderTemplate,
} from '../src/utils/mailTemplates';

process.env.TZ = 'UTC';

const SIGNATURE = "L'équipe GestMat";
const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll("'", '&#39;');
const dateFormatter = (value: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(value);

const loanId = new ObjectId('507f1f77bcf86cd799439011');
const shortReference = '#99439011';
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
  '<ul aria-label="Résumé du prêt">',
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
  'Structure responsable : Structure Prêteuse',
  'Structure demandeuse : Structure Emprunteuse',
  'Demandeur : Ada Lovelace',
  `Début : ${dateFormatter(startDate)}`,
  `Fin : ${dateFormatter(endDate)}`,
  'Statut : en attente',
  'Véhicule :',
  '- Renault Kangoo - AB-123-CD',
  'Note : Livraison avant midi.',
].join('\n');

const expectedVehicleSummaryHtml = [
  '<ul aria-label="Résumé de la réservation">',
  '<li><strong>Structure responsable :</strong> Structure Prêteuse</li>',
  '<li><strong>Structure demandeuse :</strong> Structure Emprunteuse</li>',
  '<li><strong>Demandeur :</strong> Ada Lovelace</li>',
  `<li><strong>Début :</strong> ${dateFormatter(startDate)}</li>`,
  `<li><strong>Fin :</strong> ${dateFormatter(endDate)}</li>`,
  '<li><strong>Statut :</strong> en attente</li>',
  '<li><strong>Véhicule :</strong><ul><li><strong>Renault Kangoo - AB-123-CD</strong></li></ul></li>',
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
    `<p><strong>Action à entreprendre :</strong> ${escapeHtml(action)}</p>`,
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
    eventLine: `La demande de prêt de matériel ${shortReference} va bientôt commencer.`,
    action:
      'Préparer la réception du matériel et vérifier les modalités avec le prêteur.',
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

test("buildLoanSummary utilise 'Ressources demandées' quand les items sont mixtes", () => {
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

  assert.match(summary.text, /Ressources demandées :/);
  assert.match(summary.html, /<strong>Ressources demandées :<\/strong>/);
  assert.match(summary.text, /- Peugeot Partner - EF-456-GH/);
});

test('loanOverdueTemplate conserve un gabarit harmonisé', () => {
  const template = loanOverdueTemplate({
    loan: sampleLoan as any,
    role: 'requester',
  });
  const expected = buildExpectedTemplate({
    subject: 'Date de fin de prêt dépassée - suivi de votre demande',
    preamble: 'Vous êtes le demandeur de ce prêt.',
    eventLine: `La date de fin de la demande de prêt de matériel ${shortReference} est dépassée.`,
    action:
      "Vérifier la situation avec l'emprunteur et mettre à jour GestMat si nécessaire.",
  });

  assert.deepStrictEqual(template, expected);
});

test('les templates de prêt ne contiennent pas de libellés par défaut', () => {
  const summary = buildLoanSummary(sampleLoan as any);
  const overdueTemplate = loanOverdueTemplate({ loan: sampleLoan as any });
  const reminderTemplate = loanStartReminderTemplate({
    loan: sampleLoan as any,
  });

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

test('une réservation de véhicule nomme le véhicule, les horaires et la bonne action', () => {
  const loan = {
    ...vehicleLoan,
    reservationMode: 'time',
    timeZone: 'Europe/Paris',
  };
  const template = loanCreationTemplate({
    loan: loan as any,
    role: 'owner',
    appUrl: 'https://gestmat.example.test/',
  });
  assert.match(template.subject, /réservation de véhicule/i);
  assert.doesNotMatch(template.subject, /prêt|matériel/i);
  assert.match(template.text, /Renault Kangoo - AB-123-CD/);
  assert.match(template.text, /Europe\/Paris/);
  assert.match(template.text, /dates et horaires/);
  assert.match(
    template.text,
    new RegExp(`https://gestmat.example.test/loans/${loanId}`),
  );
});

test('les décisions par ligne sont explicites dans les objets des mails', () => {
  const acceptedVehicle = {
    ...vehicleLoan,
    items: [{ ...vehicleLoan.items[0], decision: { status: 'accepted' } }],
    status: 'accepted',
  };
  const refusedEquipment = {
    ...sampleLoan,
    items: [
      {
        kind: 'equipment',
        equipment: { name: 'Caméra 4K' },
        quantity: 1,
        decision: { status: 'refused', note: 'Indisponible' },
      },
    ],
    status: 'refused',
  };
  const vehicleMail = loanStatusTemplate({
    loan: acceptedVehicle as any,
    status: 'decision',
    role: 'requester',
  });
  const equipmentMail = loanStatusTemplate({
    loan: refusedEquipment as any,
    status: 'decision',
    role: 'borrower',
  });
  assert.match(vehicleMail.subject, /réservation de véhicule : confirmée/i);
  assert.doesNotMatch(vehicleMail.subject, /modifiée/i);
  assert.match(equipmentMail.subject, /matériel : refusée/i);
  assert.match(equipmentMail.text, /Caméra 4K.*refusée.*Indisponible/);
});

test('le contenu HTML échappe les noms et le nom du décideur', () => {
  const loan = {
    ...vehicleLoan,
    owner: { name: '<Service véhicule>' },
  };
  const template = loanStatusTemplate({
    loan: loan as any,
    status: 'accepted',
    actor: '<Responsable>',
  });
  assert.doesNotMatch(template.html, /<Service véhicule>|<Responsable>/);
  assert.match(template.html, /&lt;Service véhicule&gt;/);
  assert.match(template.html, /&lt;Responsable&gt;/);
});
