use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

const SCHEMA_SQL: &str = "
CREATE TABLE IF NOT EXISTS pairing_tokens (
  token TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS paired_devices (
  device_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  operator_alias TEXT
);
CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  name TEXT,
  start_date TEXT,
  end_date TEXT,
  start_time TEXT,
  imported_at TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'json_sync'
);
CREATE TABLE IF NOT EXISTS takeout_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  ticket_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL,
  source_type TEXT,
  event_id TEXT,
  participant_id TEXT,
  participant_name TEXT,
  birth_date TEXT,
  age_at_checkin INTEGER,
  ticket_source_id TEXT,
  ticket_name TEXT,
  ticket_code TEXT,
  operator_alias TEXT,
  operator_device_id TEXT,
  checked_in_at TEXT
);
CREATE TABLE IF NOT EXISTS check_ins (
  ticket_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  name TEXT,
  cpf TEXT,
  birth_date TEXT,
  raw_json TEXT
);
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  participant_id TEXT,
  code TEXT,
  raw_json TEXT
);
CREATE TABLE IF NOT EXISTS custom_forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT,
  definition_json TEXT
);
CREATE TABLE IF NOT EXISTS event_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS locks (
  participant_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS legacy_participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  bib_number INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  sex TEXT,
  cpf_digits TEXT NOT NULL,
  birth_date_iso TEXT NOT NULL,
  modality TEXT,
  shirt_size TEXT,
  team TEXT,
  raw_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(event_id, cpf_digits, birth_date_iso)
);
CREATE TABLE IF NOT EXISTS legacy_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL,
  source_type TEXT,
  ticket_id TEXT,
  participant_name TEXT,
  birth_date TEXT,
  age_at_checkin INTEGER,
  ticket_source_id TEXT,
  ticket_name TEXT,
  ticket_code TEXT,
  operator_alias TEXT,
  operator_device_id TEXT,
  checked_in_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_event_log_event_id ON event_log(event_id);
CREATE INDEX IF NOT EXISTS idx_takeout_events_request_id ON takeout_events(request_id);
CREATE INDEX IF NOT EXISTS idx_takeout_events_created_at ON takeout_events(created_at);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_cpf ON participants(cpf);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code);
CREATE INDEX IF NOT EXISTS idx_tickets_participant_id ON tickets(participant_id);
CREATE INDEX IF NOT EXISTS idx_legacy_participants_event_id ON legacy_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_legacy_participants_cpf ON legacy_participants(cpf_digits);
CREATE INDEX IF NOT EXISTS idx_legacy_checkins_event_id ON legacy_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_legacy_checkins_participant_id ON legacy_checkins(participant_id);
";

pub struct DbPool {
    pub conn: Mutex<Connection>,
}

impl DbPool {
    fn apply_runtime_migrations(conn: &Connection) {
        let alter_statements = [
            "ALTER TABLE participants ADD COLUMN event_id TEXT",
            "ALTER TABLE events ADD COLUMN archived_at TEXT",
            "ALTER TABLE events ADD COLUMN source_type TEXT NOT NULL DEFAULT 'json_sync'",
            "ALTER TABLE paired_devices ADD COLUMN operator_alias TEXT",
            "ALTER TABLE takeout_events ADD COLUMN source_type TEXT",
            "ALTER TABLE takeout_events ADD COLUMN event_id TEXT",
            "ALTER TABLE takeout_events ADD COLUMN participant_id TEXT",
            "ALTER TABLE takeout_events ADD COLUMN participant_name TEXT",
            "ALTER TABLE takeout_events ADD COLUMN birth_date TEXT",
            "ALTER TABLE takeout_events ADD COLUMN age_at_checkin INTEGER",
            "ALTER TABLE takeout_events ADD COLUMN ticket_source_id TEXT",
            "ALTER TABLE takeout_events ADD COLUMN ticket_name TEXT",
            "ALTER TABLE takeout_events ADD COLUMN ticket_code TEXT",
            "ALTER TABLE takeout_events ADD COLUMN operator_alias TEXT",
            "ALTER TABLE takeout_events ADD COLUMN operator_device_id TEXT",
            "ALTER TABLE takeout_events ADD COLUMN checked_in_at TEXT",
            "ALTER TABLE legacy_checkins ADD COLUMN source_type TEXT",
            "ALTER TABLE legacy_checkins ADD COLUMN ticket_id TEXT",
            "ALTER TABLE legacy_checkins ADD COLUMN participant_name TEXT",
            "ALTER TABLE legacy_checkins ADD COLUMN birth_date TEXT",
            "ALTER TABLE legacy_checkins ADD COLUMN age_at_checkin INTEGER",
            "ALTER TABLE legacy_checkins ADD COLUMN ticket_source_id TEXT",
            "ALTER TABLE legacy_checkins ADD COLUMN ticket_name TEXT",
            "ALTER TABLE legacy_checkins ADD COLUMN ticket_code TEXT",
            "ALTER TABLE legacy_checkins ADD COLUMN operator_alias TEXT",
            "ALTER TABLE legacy_checkins ADD COLUMN operator_device_id TEXT",
            "ALTER TABLE legacy_checkins ADD COLUMN checked_in_at TEXT",
        ];
        for sql in alter_statements {
            let _ = conn.execute(sql, []);
        }
    }

    pub fn open(path: impl AsRef<Path>) -> Result<Self, rusqlite::Error> {
        let conn = Connection::open(path)?;
        conn.execute_batch(SCHEMA_SQL)?;
        Self::apply_runtime_migrations(&conn);
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn open_in_memory() -> Result<Self, rusqlite::Error> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch(SCHEMA_SQL)?;
        Self::apply_runtime_migrations(&conn);
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}
