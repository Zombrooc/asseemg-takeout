import {
  applyParticipantUpdatePatch,
  getRealtimeInvalidation,
  nextReconnectDelay,
  parseRealtimeMessageData,
  realtimeConfig,
} from "@/lib/takeout-realtime";

describe("takeout realtime reconnect policy", () => {
  it("grows reconnect delay using backoff", () => {
    expect(nextReconnectDelay(realtimeConfig.INITIAL_RECONNECT_DELAY_MS)).toBeGreaterThan(
      realtimeConfig.INITIAL_RECONNECT_DELAY_MS
    );
  });

  it("caps reconnect delay at max", () => {
    expect(nextReconnectDelay(realtimeConfig.MAX_RECONNECT_DELAY_MS)).toBe(
      realtimeConfig.MAX_RECONNECT_DELAY_MS
    );
    expect(nextReconnectDelay(realtimeConfig.MAX_RECONNECT_DELAY_MS * 2)).toBe(
      realtimeConfig.MAX_RECONNECT_DELAY_MS
    );
  });
});

describe("realtime invalidation policy", () => {
  it("invalidates participants and audit for participant_checked_in", () => {
    expect(
      getRealtimeInvalidation({
        type: "participant_checked_in",
        ticket_id: "seat-1",
      })
    ).toEqual({
      invalidateParticipants: true,
      invalidateAudit: true,
      invalidateEvents: false,
    });
  });

  it("invalidates participants and audit for participant_checkin_reverted", () => {
    expect(
      getRealtimeInvalidation({
        type: "participant_checkin_reverted",
        ticket_id: "seat-1",
      })
    ).toEqual({
      invalidateParticipants: true,
      invalidateAudit: true,
      invalidateEvents: false,
    });
  });

  it("invalidates only participants for participant_updated", () => {
    expect(
      getRealtimeInvalidation({
        type: "participant_updated",
        participant_id: "seat-1",
      })
    ).toEqual({
      invalidateParticipants: true,
      invalidateAudit: false,
      invalidateEvents: false,
    });
  });

  it("invalidates events list for events_list_changed", () => {
    expect(getRealtimeInvalidation({ type: "events_list_changed" })).toEqual({
      invalidateParticipants: false,
      invalidateAudit: false,
      invalidateEvents: true,
    });
  });
});

describe("participant update patch", () => {
  it("updates JSON participants immediately from the desktop event", () => {
    const participants = [
      { id: "p-1", ticketId: "ticket-1", name: "Nome antigo", checkinDone: false },
      { id: "p-2", ticketId: "ticket-2", name: "Outro", checkinDone: false },
    ];

    expect(
      applyParticipantUpdatePatch(participants, {
        type: "participant_updated",
        source_type: "json_sync",
        participant_id: "p-1",
        ticket_id: "ticket-1",
        name: "Nome novo",
        cpf: "123",
        birthDate: "1990-01-01",
        ticketName: "10KM",
        shirtSize: "M",
        team: "Equipe",
      }),
    ).toEqual([
      {
        id: "p-1",
        ticketId: "ticket-1",
        name: "Nome novo",
        checkinDone: false,
        cpf: "123",
        birthDate: "1990-01-01",
        ticketName: "10KM",
        shirtSize: "M",
        team: "Equipe",
      },
      participants[1],
    ]);
  });

  it("updates legacy participants by participant id", () => {
    const participants = [{ id: "legacy-1", name: "Nome antigo", modality: "5KM" }];

    expect(
      applyParticipantUpdatePatch(participants, {
        type: "participant_updated",
        source_type: "legacy_csv",
        participant_id: "legacy-1",
        modality: "10KM",
      }),
    ).toEqual([{ id: "legacy-1", name: "Nome antigo", modality: "10KM" }]);
  });

  it("applies the complete participant snapshot, including cleared fields", () => {
    const participants = [{
      id: "legacy-1",
      name: "Nome antigo",
      cpf: "123",
      birthDate: "1990-01-01",
      modality: "5KM",
      shirtSize: "M",
      team: "Equipe antiga",
    }];

    expect(
      applyParticipantUpdatePatch(participants, {
        type: "participant_updated",
        source_type: "legacy_csv",
        participant_id: "legacy-1",
        ticket_id: "legacy-1",
        participant: {
          id: "legacy-1",
          bibNumber: 1,
          name: "Nome novo",
          cpf: "",
          birthDate: "2000-02-02",
          modality: "10KM",
          shirtSize: null,
          team: null,
          checkinDone: false,
        },
      }),
    ).toEqual([{ ...participants[0], name: "Nome novo", cpf: "", birthDate: "2000-02-02", modality: "10KM", shirtSize: null, team: null, bibNumber: 1, checkinDone: false }]);
  });

  it("keeps the civil birth date when realtime sends an UTC timestamp", () => {
    const participants = [{ id: "legacy-1", name: "Nome", birthDate: "1990-01-01" }];

    expect(
      applyParticipantUpdatePatch(participants, {
        type: "participant_updated",
        source_type: "legacy_csv",
        participant_id: "legacy-1",
        birthDate: "2000-03-08T00:00:00.000Z",
      }),
    ).toEqual([{ id: "legacy-1", name: "Nome", birthDate: "2000-03-08" }]);
  });
});

describe("realtime message parser", () => {
  it("parses string payload", () => {
    expect(
      parseRealtimeMessageData(
        JSON.stringify({
          type: "participant_updated",
          participant_id: "seat-1",
        })
      )
    ).toEqual({
      type: "participant_updated",
      participant_id: "seat-1",
    });
  });

  it("accepts object payload", () => {
    expect(
      parseRealtimeMessageData({
        type: "participant_updated",
        participant_id: "seat-2",
      })
    ).toEqual({
      type: "participant_updated",
      participant_id: "seat-2",
    });
  });

  it("returns null for invalid payload", () => {
    expect(parseRealtimeMessageData("not-json")).toBeNull();
    expect(parseRealtimeMessageData(42)).toBeNull();
    expect(parseRealtimeMessageData({ nope: true })).toBeNull();
  });
});
