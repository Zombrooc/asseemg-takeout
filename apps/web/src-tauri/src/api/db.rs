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
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS takeout_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  ticket_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
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
CREATE INDEX IF NOT EXISTS idx_takeout_events_request_id ON takeout_events(request_id);
CREATE INDEX IF NOT EXISTS idx_takeout_events_created_at ON takeout_events(created_at);
";

pub struct DbPool {
  pub conn: Mutex<Connection>,
}

impl DbPool {
  pub fn open(path: impl AsRef<Path>) -> Result<Self, rusqlite::Error> {
    let conn = Connection::open(path)?;
    conn.execute_batch(SCHEMA_SQL)?;
    Ok(Self {
      conn: Mutex::new(conn),
    })
  }

  pub fn open_in_memory() -> Result<Self, rusqlite::Error> {
    let conn = Connection::open_in_memory()?;
    conn.execute_batch(SCHEMA_SQL)?;
    Ok(Self {
      conn: Mutex::new(conn),
    })
  }
}
