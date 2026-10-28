CREATE TABLE IF NOT EXISTS leads (
 id TEXT PRIMARY KEY,
 created_at TEXT NOT NULL,
 name TEXT NOT NULL,
 phone TEXT NOT NULL,
 email TEXT NOT NULL DEFAULT '',
 project_type TEXT NOT NULL,
 location TEXT NOT NULL DEFAULT '',
 area TEXT NOT NULL DEFAULT '',
 message TEXT NOT NULL DEFAULT '',
 source TEXT NOT NULL,
 attribution TEXT NOT NULL DEFAULT '{}',
 consent_version TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'new',
 notification_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS leads_created ON leads(created_at);
CREATE TABLE IF NOT EXISTS submission_limits (
 fingerprint TEXT PRIMARY KEY,
 window_start INTEGER NOT NULL,
 count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS submission_limits_window ON submission_limits(window_start);
