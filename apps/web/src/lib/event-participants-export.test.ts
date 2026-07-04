import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildEventParticipantExportRecords,
  buildEventParticipantsCsv,
  buildEventParticipantsFilename,
  exportEventParticipantsFile,
} from "./event-participants-export";
import type { EventParticipant } from "./takeout-api";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: mocks.save,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: mocks.writeTextFile,
}));

const sampleParticipant: EventParticipant = {
  id: "p-1",
  name: 'Ana "Souza"',
  cpf: "12345678900",
  birthDate: "2000-01-01",
  ticketId: "t-1",
  sourceTicketId: "orig-1",
  ticketName: "10K",
  qrCode: "QR-1",
  bibNumber: 42,
  shirtSize: "GG",
  team: "Equipe, Azul",
  checkinDone: false,
  customFormResponses: [
    {
      name: "sexo",
      label: "Sexo",
      type: "text",
      response: "Feminino",
    },
  ],
};

describe("event-participants-export", () => {
  beforeEach(() => {
    mocks.save.mockReset();
    mocks.writeTextFile.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds export records with stable shape", () => {
    const records = buildEventParticipantExportRecords([sampleParticipant], {
      eventId: "ev export",
      eventName: 'Evento "Principal"',
      sourceType: "legacy_csv",
    });

    expect(records).toEqual([
      {
        eventId: "ev export",
        eventName: 'Evento "Principal"',
        sourceType: "legacy_csv",
        participantId: "p-1",
        name: 'Ana "Souza"',
        cpf: "12345678900",
        birthDate: "2000-01-01",
        ticketId: "t-1",
        sourceTicketId: "orig-1",
        ticketType: "10K",
        qrCode: "QR-1",
        bibNumber: 42,
        shirtSize: "GG",
        team: "Equipe, Azul",
        sex: "Feminino",
        checkinDone: false,
        customFormResponses: sampleParticipant.customFormResponses,
      },
    ]);
  });

  it("builds CSV with stable columns and escaped values", () => {
    const csv = buildEventParticipantsCsv(
      buildEventParticipantExportRecords([sampleParticipant], {
        eventId: "ev export",
        eventName: 'Evento "Principal"',
        sourceType: "legacy_csv",
      })
    );
    const lines = csv.split("\n");

    expect(lines[0]).toContain('"eventId"');
    expect(lines[0]).toContain('"customFormResponses"');
    expect(lines[1]).toContain('"ev export"');
    expect(lines[1]).toContain('"Evento ""Principal"""');
    expect(lines[1]).toContain('"Ana ""Souza"""');
    expect(lines[1]).toContain('"Equipe, Azul"');
    expect(lines[1]).toContain('"[{""name"":""sexo""');
  });

  it("builds sanitized filenames", () => {
    expect(buildEventParticipantsFilename("ev export", "csv", "2026-07-03")).toBe(
      "participantes-ev-export-2026-07-03.csv"
    );
  });

  it("uses Tauri save dialog and writes the chosen path", async () => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    mocks.save.mockResolvedValue("C:/exports/participantes.csv");

    const result = await exportEventParticipantsFile({
      eventId: "ev-1",
      eventName: "Evento 1",
      participants: [sampleParticipant],
      sourceType: "legacy_csv",
      format: "csv",
      date: "2026-07-03",
    });

    expect(mocks.save).toHaveBeenCalledWith({
      defaultPath: "participantes-ev-1-2026-07-03.csv",
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    expect(mocks.writeTextFile).toHaveBeenCalledTimes(1);
    expect(mocks.writeTextFile.mock.calls[0][0]).toBe("C:/exports/participantes.csv");
    expect(mocks.writeTextFile.mock.calls[0][1]).toContain('"participantId","name","cpf"');
    expect(result).toEqual({
      status: "saved",
      count: 1,
      path: "C:/exports/participantes.csv",
    });
  });

  it("does not write when the user cancels the save dialog", async () => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    mocks.save.mockResolvedValue(null);

    const result = await exportEventParticipantsFile({
      eventId: "ev-1",
      eventName: "Evento 1",
      participants: [sampleParticipant],
      sourceType: "json_sync",
      format: "json",
      date: "2026-07-03",
    });

    expect(mocks.writeTextFile).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "cancelled",
      count: 1,
    });
  });
});
