import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { initializeDatabase } from "../src/main/db";

const databases: Database.Database[] = [];

afterEach(() => {
	for (const database of databases.splice(0)) database.close();
});

describe("desktop database initialization", () => {
	it("adds participant columns to a database created by an older build", () => {
		const database = new Database(":memory:");
		databases.push(database);
		database.exec(`
      CREATE TABLE participants (id TEXT PRIMARY KEY, event_id TEXT);
      INSERT INTO participants (id, event_id) VALUES ('participant-1', 'event-1');
    `);

		initializeDatabase(database);

		expect(
			database
				.prepare("SELECT id, name, cpf, birth_date, raw_json FROM participants")
				.get(),
		).toEqual({
			id: "participant-1",
			name: null,
			cpf: null,
			birth_date: null,
			raw_json: null,
		});
	});

	it("moves the experimental peer participants table before creating the takeout table", () => {
		const database = new Database(":memory:");
		databases.push(database);
		database.exec(`
      CREATE TABLE participants (
        session_id TEXT NOT NULL,
        participant_id TEXT NOT NULL,
        projection_json TEXT NOT NULL DEFAULT '{}',
        PRIMARY KEY (session_id, participant_id)
      );
    `);

		initializeDatabase(database);

		expect(
			database
				.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'peer_participants'")
				.get(),
		).toEqual({ name: "peer_participants" });
		expect(
			database.prepare("SELECT name FROM participants").all(),
		).toEqual([]);
	});
});
