"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTakeoutModalParticipantDetails = getTakeoutModalParticipantDetails;
function displayValue(value) {
    if (value == null)
        return "-";
    const text = String(value).trim();
    return text || "-";
}
function getTakeoutModalParticipantDetails(participant, sourceType) {
    const legacy = sourceType === "legacy_csv" ? participant : null;
    const current = sourceType === "json_sync" ? participant : null;
    return {
        name: displayValue(legacy?.name ?? current?.name),
        cpf: displayValue(legacy?.cpf ?? current?.cpf),
        ticketType: displayValue(legacy?.modality ?? current?.ticketName),
        shirtSize: displayValue(legacy?.shirtSize ?? current?.shirtSize),
        bibNumber: participant.bibNumber != null ? `#${participant.bibNumber}` : "Não atribuído",
        ticketIdentifier: displayValue(current?.sourceTicketId ?? current?.ticketId),
        team: displayValue(legacy?.team ?? current?.team),
    };
}
