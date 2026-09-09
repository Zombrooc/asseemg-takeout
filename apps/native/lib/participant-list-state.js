"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParticipantListState = getParticipantListState;
function getParticipantListState(input) {
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
