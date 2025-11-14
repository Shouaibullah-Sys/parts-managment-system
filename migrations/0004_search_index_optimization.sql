-- migrations/0004_search_index_optimization.sql
CREATE TABLE IF NOT EXISTS search_index (
  id SERIAL PRIMARY KEY,
  part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  search_text TEXT NOT NULL,
  english_text TEXT,
  dari_text TEXT,
  part_number VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  section VARCHAR(10) DEFAULT 'E',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast search
CREATE INDEX IF NOT EXISTS idx_search_index_text ON search_index USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_search_index_english ON search_index USING gin(to_tsvector('english', english_text));
CREATE INDEX IF NOT EXISTS idx_search_index_part_number ON search_index (part_number);
CREATE INDEX IF NOT EXISTS idx_search_index_name ON search_index (name);

-- Function to update search index
CREATE OR REPLACE FUNCTION update_search_index_for_part(part_id_param INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO search_index (part_id, search_text, english_text, dari_text, part_number, name, section)
  VALUES (
    part_id_param,
    LOWER(CONCAT(COALESCE(parts.name, ''), ' ', COALESCE(parts.part_number, ''))),
    LOWER(parts.name), -- Assuming name is in English or Latin script
    NULL, -- For Dari translations if needed later
    parts.part_number,
    parts.name,
    parts.section
  )
  ON CONFLICT (part_id) 
  DO UPDATE SET 
    search_text = LOWER(CONCAT(COALESCE(parts.name, ''), ' ', COALESCE(parts.part_number, ''))),
    english_text = LOWER(parts.name),
    part_number = parts.part_number,
    name = parts.name,
    section = parts.section,
    updated_at = NOW()
  FROM parts
  WHERE parts.id = part_id_param AND search_index.part_id = part_id_param;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically update search index
CREATE OR REPLACE FUNCTION trigger_update_search_index()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_search_index_for_part(NEW.id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM search_index WHERE part_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic search index updates
CREATE TRIGGER parts_search_index_trigger
  AFTER INSERT OR UPDATE OR DELETE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_search_index();