-- Judgment-event log for the bri-gest connected hub.
-- Append-only per CONNECTED-HUB-DESIGN.md D5: rows are never UPDATEd or
-- DELETEd by normal application code. A contributor withdrawing a past
-- event writes a new row with event_type = 'retraction' and
-- retracts_event_id pointing at the event being withdrawn, rather than
-- mutating the original row. Hard-delete stays a manual, out-of-band
-- operation (D5/D6), not something this schema needs to model.

CREATE TABLE judgment_events (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  orcid_id           TEXT NOT NULL,
  pmid               TEXT NOT NULL,
  event_type         TEXT NOT NULL,
  schema_version     INTEGER NOT NULL DEFAULT 1,
  source_tool        TEXT NOT NULL,
  topic_id           TEXT,
  payload            TEXT NOT NULL DEFAULT '{}',
  cached_title       TEXT,
  cached_journal     TEXT,
  retracts_event_id  INTEGER REFERENCES judgment_events(id),
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_judgment_events_pmid       ON judgment_events(pmid);
CREATE INDEX idx_judgment_events_orcid      ON judgment_events(orcid_id);
CREATE INDEX idx_judgment_events_event_type ON judgment_events(event_type);
CREATE INDEX idx_judgment_events_retracts   ON judgment_events(retracts_event_id);
