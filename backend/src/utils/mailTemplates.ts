import { LoanItem, LoanRequest } from '../models/LoanRequest';
import type { Vehicle } from '../models/Vehicle';

type LoanRecipientRole = 'owner' | 'borrower' | 'requester';

interface LoanMailContext {
  loan: LoanRequest;
  role?: LoanRecipientRole;
  appUrl?: string;
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
const GREETING = 'Bonjour,';

function formatDate(value?: string | Date | null, timeZone?: string): string {
  if (!value) return 'Non renseignée';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
    ...(timeZone ? { timeZone } : {}),
  });
}

function getStructureLabel(structure: any): string {
  return (
    (structure?.name as string) ||
    (structure?._id as string) ||
    'Non renseignée'
  );
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
    case 'partial':
      return 'partiellement acceptée';
    case 'modified':
    case 'updated':
      return 'modifiée';
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

function formatDecisionNote(note?: string | null): {
  text: string;
  html: string;
} {
  const cleaned = note?.toString().trim();
  if (!cleaned) {
    const fallback = 'Aucune note de décision renseignée';
    return { text: fallback, html: fallback };
  }
  return formatNote(cleaned);
}

function getItemsLabel(items: LoanItem[] = []): string {
  if (!items.length) {
    return 'Matériel';
  }

  const hasVehicle = items.some((item) => item.kind === 'vehicle');
  const hasEquipment = items.some((item) => item.kind !== 'vehicle');

  if (hasVehicle && hasEquipment) {
    return 'Ressources demandées';
  }

  if (hasVehicle) {
    return 'Véhicule';
  }

  return 'Matériel';
}

type RequestKind = 'equipment' | 'vehicle' | 'mixed';

function requestKind(loan: LoanRequest): RequestKind {
  const items = loan.items || [];
  const hasVehicle = items.some((item) => item.kind === 'vehicle');
  const hasEquipment = items.some((item) => item.kind !== 'vehicle');
  return hasVehicle ? (hasEquipment ? 'mixed' : 'vehicle') : 'equipment';
}

function requestName(kind: RequestKind): string {
  if (kind === 'vehicle') return 'réservation de véhicule';
  if (kind === 'mixed') return 'demande de matériel et de véhicule';
  return 'demande de prêt de matériel';
}

function requestSummaryTitle(kind: RequestKind): string {
  if (kind === 'vehicle') return 'Résumé de la réservation';
  if (kind === 'mixed') return 'Résumé de la demande';
  return 'Résumé du prêt';
}

function statusForKind(status: string | undefined, kind: RequestKind): string {
  if (kind === 'vehicle') {
    if (status === 'accepted') return 'confirmée';
    if (status === 'partial') return 'partiellement confirmée';
  }
  return translateStatus(status);
}

function formatItems(items: LoanItem[] = []): { text: string; html: string } {
  if (!items.length) {
    return {
      text: '- Aucun matériel renseigné',
      html: '<li>Aucun matériel renseigné</li>',
    };
  }
  const textItems: string[] = [];
  const htmlItems: string[] = [];
  for (const item of items) {
    const kind = item.kind === 'vehicle' ? 'vehicle' : 'equipment';
    const quantity = kind === 'vehicle' ? 1 : (item.quantity ?? 'N/A');

    let label: string;
    if (kind === 'vehicle') {
      const vehicle = item.vehicle as any;
      const vehicleId =
        vehicle?._id?.toString?.() || vehicle?.toString?.() || undefined;
      const vehicleName = vehicle?.name || (item.resourceIdentity as any)?.name;
      const registrationNumber =
        vehicle?.registrationNumber ||
        (item.resourceIdentity as any)?.registrationNumber;
      label =
        [vehicleName, registrationNumber].filter(Boolean).join(' - ') ||
        vehicleName ||
        registrationNumber ||
        vehicleId ||
        'Véhicule';
    } else {
      const equipment = item.equipment as any;
      const equipmentId =
        equipment?._id?.toString?.() || equipment?.toString?.() || undefined;
      label =
        equipment?.name ||
        (item.resourceIdentity as any)?.name ||
        equipment?.reference ||
        equipment?.code ||
        equipmentId ||
        'Matériel';
    }

    const decision: any = item.decision;
    const detail = decision
      ? ` — ${translateStatus(decision.status)}${decision.actor ? ` — ${getUserLabel(decision.actor)}` : ''}${decision.note ? ` — ${decision.note}` : ''}`
      : '';
    textItems.push(
      `- ${label}${kind === 'vehicle' ? '' : ` (quantité : ${quantity})`}${detail}`,
    );
    htmlItems.push(
      `<li><strong>${escapeHtml(String(label))}</strong>${kind === 'vehicle' ? '' : ` — quantité : ${quantity}`}${escapeHtml(detail)}</li>`,
    );
  }
  return { text: textItems.join('\n'), html: htmlItems.join('') };
}

export function buildLoanSummary(
  loan: LoanRequest,
  scopedDecision = false,
): {
  text: string;
  html: string;
} {
  const borrower = getStructureLabel(loan.borrower);
  const owner = getStructureLabel(loan.owner);
  const requester = getUserLabel(loan.requestedBy);
  const kind = requestKind(loan);
  const status = statusForKind(loan.status as string, kind);
  const ownerLabel = kind === 'equipment' ? 'Prêteur' : 'Structure responsable';
  const borrowerLabel =
    kind === 'equipment' ? 'Emprunteur' : 'Structure demandeuse';
  const loanDate = (value: any) =>
    loan.reservationMode === 'day'
      ? new Date(value).toLocaleDateString('fr-FR', {
          dateStyle: 'full',
          timeZone: 'UTC',
        })
      : `${formatDate(value, loan.timeZone as string | undefined)}${loan.timeZone ? ` (${loan.timeZone})` : ''}`;
  const start = loanDate(loan.startDate);
  const end = loanDate(loan.endDate);
  const { text: itemsText, html: itemsHtml } = formatItems(
    loan.items as LoanItem[],
  );
  const itemsLabel = getItemsLabel(loan.items as LoanItem[]);
  const { text: noteText, html: noteHtml } = formatNote(
    loan.note as string | null,
  );

  const text =
    `${ownerLabel} : ${owner}\n` +
    `${borrowerLabel} : ${borrower}\n` +
    `Demandeur : ${requester}\n` +
    `Début : ${start}\n` +
    `Fin : ${end}\n` +
    `${scopedDecision ? 'Statut des lignes concernées' : 'Statut'} : ${status}\n` +
    `${itemsLabel} :\n${itemsText}` +
    (loan.note?.toString().trim() ? `\nNote : ${noteText}` : '');

  const html = [
    `<ul aria-label="${requestSummaryTitle(kind)}">`,
    `<li><strong>${ownerLabel} :</strong> ${escapeHtml(owner)}</li>`,
    `<li><strong>${borrowerLabel} :</strong> ${escapeHtml(borrower)}</li>`,
    `<li><strong>Demandeur :</strong> ${escapeHtml(requester)}</li>`,
    `<li><strong>Début :</strong> ${escapeHtml(start)}</li>`,
    `<li><strong>Fin :</strong> ${escapeHtml(end)}</li>`,
    `<li><strong>${scopedDecision ? 'Statut des lignes concernées' : 'Statut'} :</strong> ${escapeHtml(status)}</li>`,
    `<li><strong>${itemsLabel} :</strong><ul>${itemsHtml}</ul></li>`,
    ...(loan.note?.toString().trim()
      ? [`<li><strong>Note :</strong> ${noteHtml}</li>`]
      : []),
    '</ul>',
  ].join('');

  return { text, html };
}

function getLoanLabel(loan: LoanRequest): string {
  const id = (loan as any)?._id;
  if (!id) return 'sans référence';
  const value = typeof id === 'string' ? id : id.toString();
  return `#${value.slice(-8).toUpperCase()}`;
}

function getLoanUrl(loan: LoanRequest, appUrl?: string): string | undefined {
  if (!appUrl || !loan._id) return undefined;
  return `${appUrl.replace(/\/+$/u, '')}/loans/${encodeURIComponent(String(loan._id))}`;
}

function renderLoanTemplate({
  subject,
  preamble,
  eventLine,
  action,
  summary,
  decisionNote,
  summaryTitle = 'Résumé du prêt',
  url,
}: {
  subject: string;
  preamble: string;
  eventLine: string;
  action: string;
  summary: { text: string; html: string };
  decisionNote?: { text: string; html: string };
  summaryTitle?: string;
  url?: string;
}): MailTemplate {
  const text = [
    GREETING,
    '',
    preamble,
    eventLine,
    '',
    ...(decisionNote ? [`Note de décision : ${decisionNote.text}`, ''] : []),
    `${summaryTitle} :`,
    summary.text,
    ...(url ? ['', `Ouvrir la demande : ${url}`] : []),
    '',
    `Action à entreprendre : ${action}`,
    '',
    SIGNATURE,
  ].join('\n');

  const html = [
    `<p>${GREETING}</p>`,
    `<p>${escapeHtml(preamble)}</p>`,
    `<p>${escapeHtml(eventLine)}</p>`,
    decisionNote
      ? `<p><strong>Note de décision :</strong> ${decisionNote.html}</p>`
      : '',
    `<div role="group" aria-label="${escapeHtml(summaryTitle)}">${summary.html}</div>`,
    ...(url
      ? [
          `<p><a href="${escapeHtml(url)}">Ouvrir la demande dans GestMat</a></p>`,
        ]
      : []),
    `<p><strong>Action à entreprendre :</strong> ${escapeHtml(action)}</p>`,
    `<p>${SIGNATURE}</p>`,
  ]
    .filter(Boolean)
    .join('');

  return { subject, text, html };
}

function creationRoleCopy(
  role: LoanRecipientRole,
  kind: RequestKind,
): {
  subject: string;
  preamble: string;
  action: string;
} {
  if (kind === 'vehicle') {
    if (role === 'owner')
      return {
        subject: 'Nouvelle réservation de véhicule à examiner',
        preamble: 'Vous gérez le véhicule demandé.',
        action:
          'Examiner les dates et horaires, puis confirmer ou refuser la réservation dans GestMat.',
      };
    if (role === 'requester')
      return {
        subject: 'Votre demande de réservation de véhicule a été créée',
        preamble: 'Votre demande de réservation a été enregistrée.',
        action: 'Consulter GestMat pour suivre la décision du gestionnaire.',
      };
    return {
      subject: 'Nouvelle réservation de véhicule pour votre structure',
      preamble: 'Votre structure est indiquée comme utilisatrice du véhicule.',
      action: 'Consulter la demande dans GestMat.',
    };
  }
  if (kind === 'mixed')
    return {
      subject: 'Nouvelle demande de matériel et de véhicule',
      preamble: 'Une demande concernant vos ressources a été créée.',
      action: 'Consulter les ressources et les dates dans GestMat.',
    };
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

function statusRoleCopy(
  role: LoanRecipientRole,
  status?: string,
  kind: RequestKind = 'equipment',
  decisionLabel?: string,
): {
  subject: string;
  preamble: string;
  action: string;
} {
  const statusLabel = decisionLabel || statusForKind(status, kind);
  if (kind === 'vehicle') {
    const noun = 'Réservation de véhicule';
    return {
      subject: `${noun} : ${statusLabel}`,
      preamble:
        role === 'owner'
          ? 'Vous gérez le véhicule concerné.'
          : role === 'requester'
            ? 'Une décision concerne votre demande de réservation.'
            : 'Une décision concerne une réservation de votre structure.',
      action:
        status === 'accepted' ||
        (status === 'decision' && decisionLabel === 'confirmée')
          ? 'Vérifier les dates et horaires confirmés dans GestMat.'
          : status === 'refused' || status === 'cancelled'
            ? 'Aucune action nécessaire ; consulter GestMat pour le détail.'
            : 'Lire la décision pour chaque véhicule dans GestMat.',
    };
  }
  if (kind === 'mixed')
    return {
      subject: `Demande de matériel et de véhicule : ${statusLabel}`,
      preamble: 'Une mise à jour concerne votre demande.',
      action: 'Vérifier la décision pour chaque ressource dans GestMat.',
    };
  if (status === 'decision')
    return {
      subject: `Demande de prêt de matériel : ${statusLabel}`,
      preamble:
        role === 'requester'
          ? 'Une décision a été prise sur votre demande de matériel.'
          : 'Une décision a été prise sur une demande de matériel qui vous concerne.',
      action: 'Lire la décision pour chaque matériel dans GestMat.',
    };
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
        subject: `Demande de prêt de matériel : ${statusLabel}`,
        preamble: 'Votre structure est emprunteur sur ce prêt.',
        action: actionByStatus({
          accepted:
            'Vérifier les dates et les modalités convenues avec le prêteur.',
          refused: 'Aucune action nécessaire, la demande est refusée.',
          cancelled: 'Aucune action, la demande a été annulée.',
          default: "Suivre l'avancement dans GestMat.",
        }),
      };
    case 'requester':
      return {
        subject: `Votre demande de prêt de matériel : ${statusLabel}`,
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
        subject: `Demande de prêt de matériel : ${statusLabel}`,
        preamble: 'Vous êtes le prêteur associé à ce prêt.',
        action: actionByStatus({
          accepted:
            'Vérifier les dates et les modalités convenues avec l’emprunteur.',
          refused: 'Aucune action supplémentaire requise.',
          cancelled: 'La demande a été annulée ; aucune action requise.',
          default: "Vérifier l'état du prêt dans GestMat.",
        }),
      };
  }
}

function startReminderRoleCopy(
  role: LoanRecipientRole,
  kind: RequestKind,
): {
  subject: string;
  preamble: string;
  action: string;
} {
  if (kind === 'vehicle')
    return {
      subject: 'Rappel : votre réservation de véhicule commence bientôt',
      preamble:
        role === 'owner'
          ? 'Une réservation du véhicule que vous gérez commence bientôt.'
          : 'Une réservation de véhicule qui vous concerne commence bientôt.',
      action:
        'Vérifier les horaires et les modalités de prise en charge dans GestMat.',
    };
  if (kind === 'mixed')
    return {
      subject:
        'Rappel : votre demande de matériel et de véhicule commence bientôt',
      preamble: 'Une demande qui vous concerne commence bientôt.',
      action: 'Vérifier les ressources et les horaires dans GestMat.',
    };
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

function overdueRoleCopy(
  role: LoanRecipientRole,
  kind: RequestKind,
): {
  subject: string;
  preamble: string;
  action: string;
} {
  if (kind === 'vehicle')
    return {
      subject: 'Date de fin de réservation de véhicule dépassée',
      preamble: 'La date de fin prévue pour cette réservation est dépassée.',
      action:
        'Vérifier la situation du véhicule dans GestMat et contacter les personnes concernées si nécessaire.',
    };
  if (kind === 'mixed')
    return {
      subject: 'Date de fin de demande dépassée',
      preamble: 'La date de fin prévue pour cette demande est dépassée.',
      action: 'Vérifier la situation de chaque ressource dans GestMat.',
    };
  switch (role) {
    case 'borrower':
      return {
        subject: 'Date de fin de prêt dépassée - emprunteur',
        preamble: 'La date de fin prévue pour ce prêt est dépassée.',
        action:
          'Vérifier la situation dans GestMat et contacter le prêteur si nécessaire.',
      };
    case 'requester':
      return {
        subject: 'Date de fin de prêt dépassée - suivi de votre demande',
        preamble: 'Vous êtes le demandeur de ce prêt.',
        action:
          "Vérifier la situation avec l'emprunteur et mettre à jour GestMat si nécessaire.",
      };
    case 'owner':
    default:
      return {
        subject: 'Date de fin de prêt dépassée - prêteur',
        preamble: 'Votre structure est prêteuse pour ce prêt.',
        action: "Vérifier la situation avec l'emprunteur dans GestMat.",
      };
  }
}

export function loanCreationTemplate({
  loan,
  role = 'owner',
  appUrl,
}: LoanMailContext): MailTemplate {
  const kind = requestKind(loan);
  const { text, html } = buildLoanSummary(loan);
  const { subject, preamble, action } = creationRoleCopy(role, kind);
  const loanLabel = getLoanLabel(loan);

  return renderLoanTemplate({
    subject,
    preamble,
    eventLine: `Une nouvelle ${requestName(kind)} (${loanLabel}) a été créée.`,
    action,
    summary: { text, html },
    summaryTitle: requestSummaryTitle(kind),
    url: getLoanUrl(loan, appUrl),
  });
}

function decisionLabel(loan: LoanRequest, kind: RequestKind): string {
  const statuses = [
    ...new Set(
      (loan.items || [])
        .map((item) => (item.decision as any)?.status as string | undefined)
        .filter((status): status is string => Boolean(status)),
    ),
  ];
  return statuses.length === 1
    ? statuses[0] === 'pending'
      ? 'remise en attente'
      : statusForKind(statuses[0], kind)
    : 'décisions enregistrées';
}

export function loanStatusTemplate({
  loan,
  status,
  actor,
  role = 'owner',
  appUrl,
}: LoanStatusContext & { role?: LoanRecipientRole }): MailTemplate {
  const kind = requestKind(loan);
  const { text, html } = buildLoanSummary(loan, status === 'decision');
  const hasDecisionNote =
    typeof loan.decisionNote === 'string' &&
    loan.decisionNote.trim().length > 0;
  const decisionNote =
    hasDecisionNote && (status === 'accepted' || status === 'refused')
      ? formatDecisionNote(loan.decisionNote as string | null)
      : undefined;
  const statusLabel =
    status === 'decision'
      ? decisionLabel(loan, kind)
      : statusForKind(status, kind);
  const actorLine = actor ? ` par ${actor}` : '';
  const { subject, preamble, action } = statusRoleCopy(
    role,
    status,
    kind,
    status === 'decision' ? statusLabel : undefined,
  );
  const loanLabel = getLoanLabel(loan);
  const lineCount = (loan.items || []).length;
  const decisionSubject = `Décision${lineCount > 1 ? 's' : ''} sur ${lineCount} ligne${lineCount > 1 ? 's' : ''} de la demande ${loanLabel}`;

  return renderLoanTemplate({
    subject: status === 'decision' ? decisionSubject : subject,
    preamble,
    eventLine:
      status === 'decision'
        ? `${lineCount} ligne${lineCount > 1 ? 's' : ''} de la demande ${loanLabel} ${lineCount > 1 ? 'ont' : 'a'} reçu une décision${actorLine}. Le détail de chaque ligne figure ci-dessous.`
        : `La ${requestName(kind)} ${loanLabel} est ${statusLabel}${actorLine}.`,
    action,
    summary: { text, html },
    decisionNote,
    summaryTitle: requestSummaryTitle(kind),
    url: getLoanUrl(loan, appUrl),
  });
}

export function loanStartReminderTemplate({
  loan,
  role = 'owner',
  appUrl,
}: StartReminderContext & { role?: LoanRecipientRole }): MailTemplate {
  const kind = requestKind(loan);
  const { text, html } = buildLoanSummary(loan);
  const { subject, preamble, action } = startReminderRoleCopy(role, kind);
  const loanLabel = getLoanLabel(loan);

  return renderLoanTemplate({
    subject,
    preamble,
    eventLine: `La ${requestName(kind)} ${loanLabel} va bientôt commencer.`,
    action,
    summary: { text, html },
    summaryTitle: requestSummaryTitle(kind),
    url: getLoanUrl(loan, appUrl),
  });
}

export function loanOverdueTemplate({
  loan,
  role = 'owner',
  appUrl,
}: LoanMailContext): MailTemplate {
  const kind = requestKind(loan);
  const { text, html } = buildLoanSummary(loan);
  const { subject, preamble, action } = overdueRoleCopy(role, kind);
  const loanLabel = getLoanLabel(loan);

  return renderLoanTemplate({
    subject,
    preamble,
    eventLine: `La date de fin de la ${requestName(kind)} ${loanLabel} est dépassée.`,
    action,
    summary: { text, html },
    summaryTitle: requestSummaryTitle(kind),
    url: getLoanUrl(loan, appUrl),
  });
}

export function vehicleComplianceReminderTemplate({
  vehicle,
  kind,
  expiryDate,
}: VehicleComplianceContext): MailTemplate {
  const formattedDate = formatDate(expiryDate);
  const kindLabel =
    kind === 'insurance' ? "d'assurance" : 'de contrôle technique';
  const vehicleLabel = `${vehicle.name || 'Véhicule'}${
    vehicle.registrationNumber ? ` (${vehicle.registrationNumber})` : ''
  }`
    .replace(/[\r\n]+/gu, ' ')
    .trim();

  return {
    subject: `Rappel ${kindLabel} pour ${vehicleLabel}`,
    text:
      `Bonjour,\n\n` +
      `L'échéance ${kindLabel} du véhicule ${vehicleLabel} approche : ${formattedDate}.\n\n` +
      `Merci de vérifier les documents de conformité associés et de planifier le renouvellement si nécessaire.\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour,</p>
      <p>L'échéance ${kindLabel} du véhicule <strong>${escapeHtml(vehicleLabel)}</strong> approche : <strong>${escapeHtml(formattedDate)}</strong>.</p>
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
      <p>Bonjour ${escapeHtml(displayName)},</p>
      <p>Votre compte GestMat a été créé.</p>
      <ul>
        <li><strong>Identifiant :</strong> ${escapeHtml(username)}</li>
        <li><strong>Structure :</strong> ${escapeHtml(structureLabel)}</li>
        <li><strong>Rôle :</strong> ${escapeHtml(role)}</li>
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
  const formattedChanges =
    changedFields.join(', ') || 'modifications de votre compte';
  return {
    subject: 'Mise à jour de votre compte GestMat',
    text:
      `Bonjour ${displayName},\n\n` +
      `Les informations suivantes de votre compte GestMat ont été mises à jour : ${formattedChanges}.\n\n` +
      `Si vous n'êtes pas à l'origine de ces modifications, merci de contacter un administrateur.\n\n` +
      SIGNATURE,
    html: `
      <p>Bonjour ${escapeHtml(displayName)},</p>
      <p>Les informations suivantes de votre compte GestMat ont été mises à jour : ${escapeHtml(formattedChanges)}.</p>
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
      <p>Bonjour ${escapeHtml(displayName)},</p>
      <p>Une demande de réinitialisation de mot de passe a été effectuée.</p>
      <p>
        Pour définir un nouveau mot de passe, utilisez le lien ci-dessous (valable
        <strong>${expiresInHours}h</strong>) :
      </p>
      <p><a href="${escapeHtml(resetLink)}">${escapeHtml(resetLink)}</a></p>
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
      <p>Bonjour ${escapeHtml(displayName)},</p>
      <p>Suite à votre demande, voici votre identifiant GestMat : <strong>${escapeHtml(username)}</strong>.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.</p>
      <p>${SIGNATURE}</p>
    `,
  };
}
