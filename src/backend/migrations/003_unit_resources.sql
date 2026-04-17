-- Unit resources table (Drive)
CREATE TABLE IF NOT EXISTS unit_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK(resource_type IN ('file', 'link')),
    title TEXT NOT NULL,
    url TEXT NOT NULL, -- storage path for files, or URL for links
    file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_unit_resources_unit ON unit_resources(unit_id);
