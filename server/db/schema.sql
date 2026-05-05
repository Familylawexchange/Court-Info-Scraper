PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  state TEXT,
  jurisdiction TEXT,
  source_type TEXT NOT NULL,
  access_method TEXT NOT NULL,
  base_url TEXT,
  api_available INTEGER DEFAULT 0,
  login_required INTEGER DEFAULT 0,
  paid_access INTEGER DEFAULT 0,
  scraping_allowed INTEGER DEFAULT 0,
  robots_notes TEXT,
  terms_notes TEXT,
  rate_limit TEXT,
  active INTEGER DEFAULT 1,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS keyword_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  keywords TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS scanner_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  source_id INTEGER,
  state TEXT,
  county TEXT,
  court TEXT,
  keyword_group TEXT,
  custom_keywords TEXT,
  person_name TEXT,
  role TEXT,
  case_type TEXT,
  date_start TEXT,
  date_end TEXT,
  max_results INTEGER DEFAULT 25,
  status TEXT DEFAULT 'new result',
  last_run_at TEXT,
  results_count INTEGER DEFAULT 0,
  error_message TEXT,
  FOREIGN KEY(source_id) REFERENCES sources(id)
);

CREATE TABLE IF NOT EXISTS raw_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scanner_job_id INTEGER,
  source_id INTEGER,
  source_name TEXT,
  source_type TEXT,
  source_category TEXT,
  source_label TEXT,
  reliability_tags TEXT,
  state TEXT,
  county TEXT,
  court TEXT,
  jurisdiction TEXT,
  case_name TEXT,
  case_number TEXT,
  case_type TEXT,
  role TEXT,
  keyword_group TEXT,
  docket_entry_title TEXT,
  docket_entry_text TEXT,
  filing_date TEXT,
  event_date TEXT,
  document_title TEXT,
  document_type TEXT,
  document_url TEXT,
  source_url TEXT,
  source_record_id TEXT,
  matched_keywords TEXT,
  parties_public TEXT,
  attorneys_public TEXT,
  judge_public TEXT,
  gal_public TEXT,
  prosecutor_public TEXT,
  evaluator_public TEXT,
  confidence_score REAL DEFAULT 0,
  duplicate_key TEXT,
  review_status TEXT DEFAULT 'new result',
  visibility TEXT DEFAULT 'admin only',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(scanner_job_id) REFERENCES scanner_jobs(id),
  FOREIGN KEY(source_id) REFERENCES sources(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_result_id INTEGER,
  source_id INTEGER,
  profile_id INTEGER,
  file_name TEXT,
  original_file_name TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  document_hash TEXT,
  document_title TEXT,
  document_type TEXT,
  source_type TEXT,
  source_name TEXT,
  source_url TEXT,
  case_name TEXT,
  case_number TEXT,
  court TEXT,
  county TEXT,
  state TEXT,
  filing_date TEXT,
  event_date TEXT,
  upload_method TEXT,
  uploader_name TEXT,
  uploader_email TEXT,
  review_status TEXT DEFAULT 'needs manual verification',
  visibility TEXT DEFAULT 'pending',
  redaction_status TEXT DEFAULT 'needs review',
  extraction_status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(raw_result_id) REFERENCES raw_results(id),
  FOREIGN KEY(source_id) REFERENCES sources(id),
  FOREIGN KEY(profile_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS extracted_text (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  text TEXT,
  extraction_method TEXT,
  extraction_status TEXT DEFAULT 'pending',
  confidence_score REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(document_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  role TEXT,
  court_or_office TEXT,
  firm_or_agency TEXT,
  county TEXT,
  state TEXT,
  bar_number TEXT,
  known_cases TEXT,
  profile_status TEXT DEFAULT 'new profile',
  visibility TEXT DEFAULT 'pending',
  source_summary TEXT,
  admin_notes TEXT,
  public_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profile_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  alias_name TEXT NOT NULL,
  source_id INTEGER,
  notes TEXT,
  FOREIGN KEY(profile_id) REFERENCES profiles(id),
  FOREIGN KEY(source_id) REFERENCES sources(id)
);

CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  claim_text TEXT NOT NULL,
  claim_category TEXT,
  claim_status TEXT DEFAULT 'needs admin review',
  reliability_label TEXT DEFAULT 'needs admin review',
  source_basis TEXT,
  date_of_event TEXT,
  public_visibility TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(profile_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS claim_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL,
  document_id INTEGER,
  raw_result_id INTEGER,
  source_id INTEGER,
  quote_or_excerpt TEXT,
  source_url TEXT,
  page_reference TEXT,
  line_reference TEXT,
  source_label TEXT,
  FOREIGN KEY(claim_id) REFERENCES claims(id),
  FOREIGN KEY(document_id) REFERENCES documents(id),
  FOREIGN KEY(raw_result_id) REFERENCES raw_results(id),
  FOREIGN KEY(source_id) REFERENCES sources(id)
);

CREATE TABLE IF NOT EXISTS review_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_type TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  assigned_to TEXT,
  review_status TEXT DEFAULT 'new result',
  priority TEXT DEFAULT 'normal',
  visibility TEXT DEFAULT 'admin only',
  reason TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  acquisition_method TEXT NOT NULL,
  state TEXT,
  county TEXT,
  court TEXT,
  case_name TEXT,
  case_number TEXT,
  person_name TEXT,
  role TEXT,
  judge TEXT,
  guardian_ad_litem TEXT,
  attorneys TEXT,
  prosecutor TEXT,
  evaluator TEXT,
  document_title TEXT,
  docket_entry_text TEXT,
  filing_date TEXT,
  source_url TEXT,
  verification_source TEXT,
  notes TEXT,
  status TEXT DEFAULT 'needs official source verification',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_type TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  searchable_text TEXT NOT NULL,
  public_searchable INTEGER DEFAULT 0,
  admin_searchable INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS request_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER,
  connector TEXT,
  url TEXT,
  method TEXT DEFAULT 'GET',
  status_code INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
