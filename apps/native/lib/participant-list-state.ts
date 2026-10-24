export type ParticipantListStateInput = {
  isConfirmed: boolean;
  lockedByOther: boolean;
  isConflict: boolean;
  isPendingSync: boolean;
  syncStatus?: "pending" | "sending" | "failed" | null;
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
      primaryActionLabel: "Visualizar dados",
      primaryActionDisabled: false,
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

  if (input.syncStatus === "failed") {
    return {
      statusLabel: "Falha de sincronização — requer intervenção",
      statusTone: "danger",
      primaryActionLabel: "Falha de sincronização",
      primaryActionDisabled: true,
      showDismissConflict: false,
    };
  }

  if (input.syncStatus === "sending") {
    return {
      statusLabel: "Sincronizando com o desktop",
      statusTone: "warning",
      primaryActionLabel: "Sincronizando",
      primaryActionDisabled: true,
      showDismissConflict: false,
    };
  }

  if (input.isPendingSync) {
    return {
      statusLabel: "Registrado neste aparelho — aguardando sincronização",
      statusTone: "warning",
      primaryActionLabel: "Registrado localmente",
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
