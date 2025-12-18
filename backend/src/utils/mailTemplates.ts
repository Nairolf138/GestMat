import { LoanItem, LoanRequest } from '../models/LoanRequest';
import type { Vehicle } from '../models/Vehicle';

type LoanRecipientRole = 'owner' | 'borrower' | 'requester';

interface LoanMailContext {
  loan: LoanRequest;
  role?: LoanRecipientRole;
}

interface LoanStatusContext extends LoanMailContext {
  status: string;
  actor?: string;
}

type ReminderContext = LoanMailContext;
type StartReminderContext = LoanMailContext;

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

interface PasswordResetContext {
  displayName: string;
  resetLink: string;
  expiresInHours: number;
}

interface UsernameReminderContext {
  displayName: string;
  username: string;
}

interface VehicleComplianceContext {
  vehicle: Vehicle;
  kind: 'insurance' | 'technicalInspection';
  expiryDate: Date;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNote(note?: string | null): { text: string; html: string } {
  const cleanedNote = note?.toString().trim();
  if (!cleanedNote) {
    const fallback = 'Aucune note renseignée';
    return { text: fallback, html: fallback };
  }

  const escapedNote = escapeHtml(cleanedNote);
  return {
    text: cleanedNote,
    html: escapedNote.replace(/\n/g, '<br>'),
  };
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
  const { text: noteText, html: noteHtml } = formatNote(loan.note as string | null);

  const text =
    `Prêteur : ${owner}\n` +
    `Emprunteur : ${borrower}\n` +
    `Demandeur : ${requester}\n` +
    `Début : ${start}\n` +
    `Fin : ${end}\n` +
    `Statut : ${status}\n` +
    `Matériel :\n${itemsText}\n` +
    `Note : ${noteText}`;

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
      <li><strong>Note :</strong> ${noteHtml}</li>
    </ul>
  `;

  return { text, html };
}

function creationRoleCopy(role: LoanRecipientRole): {
  subject: string;
  preamble: string;
  action: string;
} {
  switch (role) {
    case 'borrower':
      return {
        subject: 'Nouvelle demande de prêt concernant votre structure',
        preamble:
          'Votre structure est indiquée comme emprunteur pour la demande ci-dessous.',
        action: 'Coordonner avec le prêteur et suivre la demande dans GestMat.',
      };
    case 'requester':
      return {
        subject: 'Votre demande de prêt a été créée',
        preamble: 'Vous êtes le demandeur de ce prêt.',
        action: 'Consulter GestMat pour suivre la décision du prêteur.',
      };
    case 'owner':
    default:
      return {
        subject: 'Nouvelle demande de prêt à traiter',
        preamble: 'Vous êtes indiqué comme prêteur pour cette demande.',
        action: "Examiner la demande et l'accepter ou la refuser dans GestMat.",
      };
  }
}

function statusRoleCopy(role: LoanRecipientRole, status?: string): {
  subject: string;
  preamble: string;
  action: string;
} {
  const statusLabel = translateStatus(status);
  const actionByStatus = (roleAction: {
    accepted: string;
    refused: string;
    cancelled: string;
    default: string;
  }) => {
    if (status === 'accepted') return roleAction.accepted;
    if (status === 'refused') return roleAction.refused;
    if (status === 'cancelled') return roleAction.cancelled;
    return roleAction.default;
  };

  switch (role) {
    case 'borrower':
      return {
        subject: `Statut de prêt ${statusLabel} - emprunteur`,
        preamble: 'Votre structure est emprunteur sur ce prêt.',
        action: actionByStatus({
          accepted:
            'Préparer la réception du matériel et convenir des modalités avec le prêteur.',
          refused: 'Aucune action nécessaire, la demande est refusée.',
          cancelled: 'Aucune action, la demande a été annulée.',
          default: "Suivre l'avancement dans GestMat.",
        }),
      };
    case 'requester':
      return {
        subject: `Mise à jour de votre demande de prêt : ${statusLabel}`,
        preamble: 'Vous êtes à l’origine de cette demande.',
        action: actionByStatus({
          accepted:
            'Finaliser les détails avec le prêteur et vérifier les dates dans GestMat.',
          refused: 'Aucune action supplémentaire requise.',
          cancelled: 'La demande a été annulée ; aucune action requise.',
          default: 'Suivre le statut dans GestMat.',
        }),
      };
    case 'owner':
    default:
      return {
        subject: `Demande de prêt ${statusLabel} - prêteur`,
        preamble: 'Vous êtes le prêteur associé à ce prêt.',
        action: actionByStatus({
          accepted: 'Préparer la mise à disposition et confirmer la remise du matériel.',
          refused: 'Aucune action supplémentaire requise.',
          cancelled: 'La demande a été annulée ; aucune action requise.',
          default: "Vérifier l'état du prêt dans GestMat.",
        }),
      };
  }
}

function reminderRoleCopy(role: LoanRecipientRole): {
  subject: string;
  preamble: string;
  action: string;
} {
  switch (role) {
    case 'borrower':
      return {
        subject: 'Rappel : échéance de prêt à venir - emprunteur',
        preamble: 'Votre structure doit préparer la fin du prêt.',
        action:
          'Planifier le retour du matériel avec le prêteur et mettre à jour GestMat si nécessaire.',
      };
    case 'requester':
      return {
        subject: 'Rappel : échéance de votre demande de prêt',
        preamble: 'Vous avez initié ce prêt.',
        action:
          'Vérifier avec l’emprunteur que le retour du matériel est organisé et suivre GestMat.',
      };
    case 'owner':
    default:
      return {
        subject: 'Rappel : échéance de prêt à venir - prêteur',
        preamble: 'Votre structure prêteuse approche de la fin du prêt.',
        action:
          "Anticiper le retour du matériel avec l'emprunteur et mettre à jour GestMat si besoin.",
      };
  }
}

function startReminderRoleCopy(role: LoanRecipientRole): {
  subject: string;
  preamble: string;
  action: string;
} {
  switch (role) {
    case 'borrower':
      return {
        subject: 'Rappel : début de prêt imminent - emprunteur',
        preamble: 'Votre structure est sur le point de commencer un prêt.',
        action:
          'Préparer la réception du matériel et vérifier les modalités avec le prêteur.',
      };
    case 'requester':
      return {
        subject: 'Rappel : début de votre demande de prêt',
        preamble: 'Vous avez initié ce prêt et son début approche.',
        action:
          'Coordonner avec l’emprunteur et le prêteur pour assurer la disponibilité du matériel.',
      };
    case 'owner':
    default:
      return {
        subject: 'Rappel : début de prêt imminent - prêteur',
        preamble: 'Votre structure va bientôt prêter du matériel.',
        action:
          'Organiser la remise du matériel avec l’emprunteur et confirmer la disponibilité.',
      };
  }
}

function overdueRoleCopy(role: LoanRecipientRole): {
  subject: string;
  preamble: string;
  action: string;
} {
  switch (role) {
    case 'borrower':
      return {
        subject: 'Prêt en retard - emprunteur',
        preamble: 'Votre structure n’a pas restitué le matériel dans les délais.',
        action: "Restituer le matériel au plus vite et prévenir le prêteur de l'avancement.",
      };
    case 'requester':
      return {
        subject: 'Prêt en retard - suivi de votre demande',
        preamble: 'Vous êtes le demandeur de ce prêt.',
        action:
          "Relancer l'emprunteur sur la restitution du matériel et mettre à jour GestMat si nécessaire.",
      };
    case 'owner':
    default:
      return {
        subject: 'Prêt en retard - prêteur',
        preamble: 'Votre structure est prêteuse pour ce prêt.',
        action:
          "Contacter l'emprunteur et organiser le retour du matériel au plus vite.",
      };
  }
}

export function loanCreationTemplate({ loan, role = 'owner' }: LoanMailContext): MailTemplate {
  const { text, html } = buildLoanSummary(loan);
  const { subject, preamble, action } = creationRoleCopy(role);

  return {
    subject,
    text:
      `Bonjour,\n\n` +
      `${preamble}\n` +
      `Une nouvelle demande de prêt (${loan._id}) a été créée.\n\n` +
      `${text}\n\n` +
      `Action à entreprendre : ${action}\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour,</p>
      <p>${preamble}</p>
      <p>Une nouvelle demande de prêt (${loan._id}) a été créée.</p>
      ${html}
      <p><strong>Action à entreprendre :</strong> ${action}</p>
      <p>${SIGNATURE}</p>
    `,
  };
}

export function loanStatusTemplate({
  loan,
  status,
  actor,
  role = 'owner',
}: LoanStatusContext & { role?: LoanRecipientRole }): MailTemplate {
  const { text, html } = buildLoanSummary(loan);
  const statusLabel = translateStatus(status);
  const actorLine = actor ? ` par ${actor}` : '';
  const { subject, preamble, action } = statusRoleCopy(role, status);

  return {
    subject,
    text:
      `Bonjour,\n\n` +
      `${preamble}\n` +
      `La demande de prêt ${loan._id} est ${statusLabel}${actorLine}.\n\n` +
      `${text}\n\n` +
      `Action à entreprendre : ${action}\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour,</p>
      <p>${preamble}</p>
      <p>La demande de prêt ${loan._id} est <strong>${statusLabel}</strong>${actorLine}.</p>
      ${html}
      <p><strong>Action à entreprendre :</strong> ${action}</p>
      <p>${SIGNATURE}</p>
    `,
  };
}

export function loanReminderTemplate({ loan, role = 'owner' }: LoanMailContext): MailTemplate {
  const { text, html } = buildLoanSummary(loan);
  const { subject, preamble, action } = reminderRoleCopy(role);

  return {
    subject,
    text:
      `Bonjour,\n\n` +
      `${preamble}\n` +
      `Le prêt ${loan._id} approche de son échéance.\n\n` +
      `${text}\n\n` +
      `Action à entreprendre : ${action}\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour,</p>
      <p>${preamble}</p>
      <p>Le prêt ${loan._id} approche de son échéance.</p>
      ${html}
      <p><strong>Action à entreprendre :</strong> ${action}</p>
      <p>${SIGNATURE}</p>
    `,
  };
}

export function loanStartReminderTemplate({
  loan,
  role = 'owner',
}: StartReminderContext & { role?: LoanRecipientRole }): MailTemplate {
  const { text, html } = buildLoanSummary(loan);
  const { subject, preamble, action } = startReminderRoleCopy(role);

  return {
    subject,
    text:
      `Bonjour,\n\n` +
      `${preamble}\n` +
      `Le prêt ${loan._id} va bientôt commencer.\n\n` +
      `${text}\n\n` +
      `Action à entreprendre : ${action}\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour,</p>
      <p>${preamble}</p>
      <p>Le prêt ${loan._id} va bientôt commencer.</p>
      ${html}
      <p><strong>Action à entreprendre :</strong> ${action}</p>
      <p>${SIGNATURE}</p>
    `,
  };
}

export function loanOverdueTemplate({ loan, role = 'owner' }: LoanMailContext): MailTemplate {
  const { text, html } = buildLoanSummary(loan);
  const { subject, preamble, action } = overdueRoleCopy(role);

  return {
    subject,
    text:
      `Bonjour,\n\n` +
      `${preamble}\n` +
      `Le prêt ${loan._id} est en retard.\n\n` +
      `${text}\n\n` +
      `Action à entreprendre : ${action}\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour,</p>
      <p>${preamble}</p>
      <p>Le prêt ${loan._id} est en retard.</p>
      ${html}
      <p><strong>Action à entreprendre :</strong> ${action}</p>
      <p>${SIGNATURE}</p>
    `,
  };
}

export function vehicleComplianceReminderTemplate({
  vehicle,
  kind,
  expiryDate,
}: VehicleComplianceContext): MailTemplate {
  const formattedDate = formatDate(expiryDate);
  const kindLabel = kind === 'insurance' ? "d'assurance" : 'de contrôle technique';
  const vehicleLabel = `${vehicle.name || 'Véhicule'}${
    vehicle.registrationNumber ? ` (${vehicle.registrationNumber})` : ''
  }`;

  return {
    subject: `Rappel ${kindLabel} pour ${vehicleLabel}`,
    text:
      `Bonjour,\n\n` +
      `L'échéance ${kindLabel} du véhicule ${vehicleLabel} approche : ${formattedDate}.\n\n` +
      `Merci de vérifier les documents de conformité associés et de planifier le renouvellement si nécessaire.\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour,</p>
      <p>L'échéance ${kindLabel} du véhicule <strong>${vehicleLabel}</strong> approche : <strong>${formattedDate}</strong>.</p>
      <p>Merci de vérifier les documents de conformité associés et de planifier le renouvellement si nécessaire.</p>
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

export function passwordResetTemplate({
  displayName,
  resetLink,
  expiresInHours,
}: PasswordResetContext): MailTemplate {
  return {
    subject: 'Réinitialisation de votre mot de passe GestMat',
    text:
      `Bonjour ${displayName},\n\n` +
      `Une demande de réinitialisation de mot de passe a été effectuée.\n` +
      `Pour définir un nouveau mot de passe, utilisez le lien ci-dessous (valable ${expiresInHours}h) :\n${resetLink}\n\n` +
      `Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour ${displayName},</p>
      <p>Une demande de réinitialisation de mot de passe a été effectuée.</p>
      <p>
        Pour définir un nouveau mot de passe, utilisez le lien ci-dessous (valable
        <strong>${expiresInHours}h</strong>) :
      </p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.</p>
      <p>${SIGNATURE}</p>
    `,
  };
}

export function usernameReminderTemplate({
  displayName,
  username,
}: UsernameReminderContext): MailTemplate {
  return {
    subject: "Rappel d'identifiant GestMat",
    text:
      `Bonjour ${displayName},\n\n` +
      `Suite à votre demande, voici votre identifiant GestMat : ${username}.\n\n` +
      `Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour ${displayName},</p>
      <p>Suite à votre demande, voici votre identifiant GestMat : <strong>${username}</strong>.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.</p>
      <p>${SIGNATURE}</p>
    `,
  };
}
