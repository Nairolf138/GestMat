import { LoanItem, LoanRequest } from '../models/LoanRequest';

interface LoanMailContext {
  loan: LoanRequest;
}

interface LoanStatusContext extends LoanMailContext {
  status: string;
  actor?: string;
}

interface ReminderContext extends LoanMailContext {}

interface AccountCreationContext {
  username: string;
  displayName: string;
  role: string;
  structure?: string;
}

interface AccountUpdateContext {
  displayName: string;
  changedFields: string[];
}

interface MailTemplate {
  subject: string;
  text: string;
  html: string;
}

const SIGNATURE = "L'équipe GestMat";

function formatDate(value?: string | Date | null): string {
  if (!value) return 'Non renseignée';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

function getStructureLabel(structure: any): string {
  return (structure?.name as string) || (structure?._id as string) || 'Non renseignée';
}

function getUserLabel(user: any): string {
  const first = user?.firstName as string;
  const last = user?.lastName as string;
  const username = user?.username as string;
  const base = `${first ? `${first} ` : ''}${last ?? ''}`.trim();
  return base || username || 'Utilisateur inconnu';
}

function translateStatus(status: string | undefined): string {
  switch (status) {
    case 'accepted':
      return 'acceptée';
    case 'refused':
      return 'refusée';
    case 'cancelled':
      return 'annulée';
    case 'pending':
      return 'en attente';
    default:
      return status || 'inconnu';
  }
}

function formatItems(items: LoanItem[] = []): { text: string; html: string } {
  if (!items.length) {
    return { text: '- Aucun matériel renseigné', html: '<li>Aucun matériel renseigné</li>' };
  }
  const textItems: string[] = [];
  const htmlItems: string[] = [];
  for (const item of items) {
    const equipment = item.equipment as any;
    const label = equipment?.name || equipment?.reference || 'Matériel';
    const quantity = item.quantity ?? 'N/A';
    textItems.push(`- ${label} (quantité : ${quantity})`);
    htmlItems.push(`<li><strong>${label}</strong> — quantité : ${quantity}</li>`);
  }
  return { text: textItems.join('\n'), html: htmlItems.join('') };
}

function buildLoanSummary(loan: LoanRequest): { text: string; html: string } {
  const borrower = getStructureLabel(loan.borrower);
  const owner = getStructureLabel(loan.owner);
  const requester = getUserLabel(loan.requestedBy);
  const status = translateStatus(loan.status as string);
  const start = formatDate(loan.startDate as any);
  const end = formatDate(loan.endDate as any);
  const { text: itemsText, html: itemsHtml } = formatItems(loan.items as LoanItem[]);

  const text =
    `Prêteur : ${owner}\n` +
    `Emprunteur : ${borrower}\n` +
    `Demandeur : ${requester}\n` +
    `Début : ${start}\n` +
    `Fin : ${end}\n` +
    `Statut : ${status}\n` +
    `Matériel :\n${itemsText}`;

  const html = `
    <ul>
      <li><strong>Prêteur :</strong> ${owner}</li>
      <li><strong>Emprunteur :</strong> ${borrower}</li>
      <li><strong>Demandeur :</strong> ${requester}</li>
      <li><strong>Début :</strong> ${start}</li>
      <li><strong>Fin :</strong> ${end}</li>
      <li><strong>Statut :</strong> ${status}</li>
      <li><strong>Matériel :</strong>
        <ul>${itemsHtml}</ul>
      </li>
    </ul>
  `;

  return { text, html };
}

export function loanCreationTemplate({ loan }: LoanMailContext): MailTemplate {
  const { text, html } = buildLoanSummary(loan);

  return {
    subject: 'Nouvelle demande de prêt',
    text:
      `Bonjour,\n\n` +
      `Une nouvelle demande de prêt (${loan._id}) a été créée.\n\n` +
      `${text}\n\n` +
      `Action à entreprendre : examiner la demande et l'accepter ou la refuser dans GestMat.\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour,</p>
      <p>Une nouvelle demande de prêt (${loan._id}) a été créée.</p>
      ${html}
      <p><strong>Action à entreprendre :</strong> examiner la demande et l'accepter ou la refuser dans GestMat.</p>
      <p>${SIGNATURE}</p>
    `,
  };
}

export function loanStatusTemplate({ loan, status, actor }: LoanStatusContext): MailTemplate {
  const { text, html } = buildLoanSummary(loan);
  const statusLabel = translateStatus(status);
  const actorLine = actor ? ` par ${actor}` : '';
  let action = "Vérifier l'état du prêt dans GestMat.";
  if (status === 'accepted') {
    action = 'Préparer la mise à disposition et confirmer la remise du matériel.';
  } else if (status === 'refused') {
    action = 'Aucune action supplémentaire requise.';
  } else if (status === 'cancelled') {
    action = 'La demande a été annulée ; aucune action requise.';
  }

  return {
    subject: `Demande de prêt ${statusLabel}`,
    text:
      `Bonjour,\n\n` +
      `La demande de prêt ${loan._id} est ${statusLabel}${actorLine}.\n\n` +
      `${text}\n\n` +
      `Action à entreprendre : ${action}\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour,</p>
      <p>La demande de prêt ${loan._id} est <strong>${statusLabel}</strong>${actorLine}.</p>
      ${html}
      <p><strong>Action à entreprendre :</strong> ${action}</p>
      <p>${SIGNATURE}</p>
    `,
  };
}

export function loanReminderTemplate({ loan }: ReminderContext): MailTemplate {
  const { text, html } = buildLoanSummary(loan);

  return {
    subject: 'Rappel : fin de prêt à venir',
    text:
      `Bonjour,\n\n` +
      `Le prêt ${loan._id} approche de son échéance.\n\n` +
      `${text}\n\n` +
      `Action à entreprendre : préparer le retour du matériel et mettre à jour GestMat si nécessaire.\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour,</p>
      <p>Le prêt ${loan._id} approche de son échéance.</p>
      ${html}
      <p><strong>Action à entreprendre :</strong> préparer le retour du matériel et mettre à jour GestMat si nécessaire.</p>
      <p>${SIGNATURE}</p>
    `,
  };
}

export function loanOverdueTemplate({ loan }: LoanMailContext): MailTemplate {
  const { text, html } = buildLoanSummary(loan);

  return {
    subject: 'Prêt en retard',
    text:
      `Bonjour,\n\n` +
      `Le prêt ${loan._id} est en retard.\n\n` +
      `${text}\n\n` +
      `Action à entreprendre : contacter l'emprunteur et organiser le retour du matériel au plus vite.\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour,</p>
      <p>Le prêt ${loan._id} est en retard.</p>
      ${html}
      <p><strong>Action à entreprendre :</strong> contacter l'emprunteur et organiser le retour du matériel au plus vite.</p>
      <p>${SIGNATURE}</p>
    `,
  };
}

export function accountCreationTemplate({
  username,
  displayName,
  role,
  structure,
}: AccountCreationContext): MailTemplate {
  const structureLabel = structure || 'Non renseignée';
  return {
    subject: 'Création de compte GestMat',
    text:
      `Bonjour ${displayName},\n\n` +
      `Votre compte GestMat a été créé.\n` +
      `Identifiant : ${username}\n` +
      `Structure : ${structureLabel}\n` +
      `Rôle : ${role}\n\n` +
      `Action à entreprendre : connectez-vous à GestMat pour vérifier vos informations.\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour ${displayName},</p>
      <p>Votre compte GestMat a été créé.</p>
      <ul>
        <li><strong>Identifiant :</strong> ${username}</li>
        <li><strong>Structure :</strong> ${structureLabel}</li>
        <li><strong>Rôle :</strong> ${role}</li>
      </ul>
      <p><strong>Action à entreprendre :</strong> connectez-vous à GestMat pour vérifier vos informations.</p>
      <p>${SIGNATURE}</p>
    `,
  };
}

export function accountUpdateTemplate({
  displayName,
  changedFields,
}: AccountUpdateContext): MailTemplate {
  const formattedChanges = changedFields.join(', ') || 'modifications de votre compte';
  return {
    subject: 'Mise à jour de votre compte GestMat',
    text:
      `Bonjour ${displayName},\n\n` +
      `Les informations suivantes de votre compte GestMat ont été mises à jour : ${formattedChanges}.\n\n` +
      `Si vous n'êtes pas à l'origine de ces modifications, merci de contacter un administrateur.\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour ${displayName},</p>
      <p>Les informations suivantes de votre compte GestMat ont été mises à jour : ${formattedChanges}.</p>
      <p>Si vous n'êtes pas à l'origine de ces modifications, merci de contacter un administrateur.</p>
      <p>${SIGNATURE}</p>
    `,
  };
}
