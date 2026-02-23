export type ParticipantListStateInput = {
  isConfirmed: boolean;
  lockedByOther: boolean;
  isConflict: boolean;
  isPendingSync: boolean;
};

export type ParticipantListStateTone = "success" | "warning" | "danger" | null;

export type ParticipantListState = {
  statusLabel: string | null;
  statusTone: ParticipantListStateTone;
  primaryActionLabel: string;
  primaryActionDisabled: boolean;
  showDismissConflict: boolean;
};

export function getParticipantListState(input: ParticipantListStateInput): ParticipantListState {
  if (input.isConfirmed) {
    return {
      statusLabel: "Check-in feito",
      statusTone: "success",
      primaryActionLabel: "OK",
      primaryActionDisabled: true,
      showDismissConflict: false,
    };
  }

  if (input.lockedByOther) {
    return {
      statusLabel: "Em atendimento por outro dispositivo — aguarde para fazer check-in",
      statusTone: "warning",
      primaryActionLabel: "Em atendimento",
      primaryActionDisabled: true,
      showDismissConflict: false,
    };
  }

  if (input.isConflict) {
    return {
      statusLabel: "Conflito — já retirado por outro",
      statusTone: "danger",
      primaryActionLabel: "Fazer check-in",
      primaryActionDisabled: false,
      showDismissConflict: true,
    };
  }

  if (input.isPendingSync) {
    return {
      statusLabel: "Pendente",
      statusTone: "warning",
      primaryActionLabel: "Pendente",
      primaryActionDisabled: true,
      showDismissConflict: false,
    };
  }

  return {
    statusLabel: null,
    statusTone: null,
    primaryActionLabel: "Fazer check-in",
    primaryActionDisabled: false,
    showDismissConflict: false,
  };
}
