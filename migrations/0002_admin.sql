-- Apply once, after 0001_leads.sql, to the database bound as LEADS_DB.
ALTER TABLE leads ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN follow_up_date TEXT;
ALTER TABLE leads ADD COLUMN updated_at TEXT;
ALTER TABLE leads ADD COLUMN updated_by TEXT;
ALTER TABLE leads ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS leads_follow_up ON leads(follow_up_date);
