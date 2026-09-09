"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var participant_list_state_1 = require("../../lib/participant-list-state");
describe("participant-list-state", function () {
    it("prioritizes CONFIRMED over all other flags", function () {
        var state = (0, participant_list_state_1.getParticipantListState)({
            isConfirmed: true,
            lockedByOther: true,
            isConflict: true,
            isPendingSync: true,
        });
        expect(state.statusLabel).toBe("Check-in feito");
        expect(state.statusTone).toBe("success");
        expect(state.primaryActionLabel).toBe("OK");
        expect(state.primaryActionDisabled).toBe(true);
        expect(state.showDismissConflict).toBe(false);
    });
    it("prioritizes lockedByOther over conflict and pending", function () {
        var state = (0, participant_list_state_1.getParticipantListState)({
            isConfirmed: false,
            lockedByOther: true,
            isConflict: true,
            isPendingSync: true,
        });
        expect(state.statusLabel).toBe("Em atendimento por outro dispositivo — aguarde para fazer check-in");
        expect(state.statusTone).toBe("warning");
        expect(state.primaryActionLabel).toBe("Em atendimento");
        expect(state.primaryActionDisabled).toBe(true);
        expect(state.showDismissConflict).toBe(false);
    });
    it("returns conflict action when item is in conflict", function () {
        var state = (0, participant_list_state_1.getParticipantListState)({
            isConfirmed: false,
            lockedByOther: false,
            isConflict: true,
            isPendingSync: true,
        });
        expect(state.statusLabel).toBe("Conflito — já retirado por outro");
        expect(state.statusTone).toBe("danger");
        expect(state.primaryActionLabel).toBe("Fazer check-in");
        expect(state.primaryActionDisabled).toBe(false);
        expect(state.showDismissConflict).toBe(true);
    });
    it("returns pending state when only pending flag is active", function () {
        var state = (0, participant_list_state_1.getParticipantListState)({
            isConfirmed: false,
            lockedByOther: false,
            isConflict: false,
            isPendingSync: true,
        });
        expect(state.statusLabel).toBe("Pendente");
        expect(state.statusTone).toBe("warning");
        expect(state.primaryActionLabel).toBe("Pendente");
        expect(state.primaryActionDisabled).toBe(true);
        expect(state.showDismissConflict).toBe(false);
    });
    it("returns default state when no flags are active", function () {
        var state = (0, participant_list_state_1.getParticipantListState)({
            isConfirmed: false,
            lockedByOther: false,
            isConflict: false,
            isPendingSync: false,
        });
        expect(state.statusLabel).toBeNull();
        expect(state.statusTone).toBeNull();
        expect(state.primaryActionLabel).toBe("Fazer check-in");
        expect(state.primaryActionDisabled).toBe(false);
        expect(state.showDismissConflict).toBe(false);
    });
});
