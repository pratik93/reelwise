-- Core catalogue
CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY,               -- TMDB id
  title TEXT NOT NULL,
  original_title TEXT,
  release_date TEXT,                    -- ISO yyyy-mm-dd
  year INTEGER,
  runtime INTEGER,
  overview TEXT NOT NULL,
  tagline TEXT,
  poster_path TEXT NOT NULL,
  backdrop_path TEXT,
  vote_average REAL NOT NULL DEFAULT 0,
  vote_count INTEGER NOT NULL DEFAULT 0,
  popularity REAL NOT NULL DEFAULT 0,
  original_language TEXT,
  spoken_languages TEXT,                -- JSON [{iso,name}]
  production_countries TEXT,            -- JSON [{iso,name}]
  imdb_id TEXT,
  trailer_key TEXT,                     -- YouTube video key
  imdb_rating REAL,                     -- OMDb enrichment (nullable)
  rotten_tomatoes INTEGER,
  metascore INTEGER,
  certification TEXT
);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(vote_average);
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity);
CREATE INDEX IF NOT EXISTS idx_movies_release ON movies(release_date);
CREATE INDEX IF NOT EXISTS idx_movies_lang ON movies(original_language);
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS genres (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS movie_genres (
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  genre_id INTEGER NOT NULL REFERENCES genres(id),
  PRIMARY KEY (movie_id, genre_id)
);
CREATE INDEX IF NOT EXISTS idx_mg_genre ON movie_genres(genre_id);

CREATE TABLE IF NOT EXISTS keywords (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS movie_keywords (
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  keyword_id INTEGER NOT NULL REFERENCES keywords(id),
  PRIMARY KEY (movie_id, keyword_id)
);
CREATE INDEX IF NOT EXISTS idx_mk_keyword ON movie_keywords(keyword_id);

CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  profile_path TEXT
);
CREATE TABLE IF NOT EXISTS credits (
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id),
  role TEXT NOT NULL CHECK (role IN ('cast','director')),
  character TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (movie_id, person_id, role)
);
CREATE INDEX IF NOT EXISTS idx_credits_person ON credits(person_id);

CREATE TABLE IF NOT EXISTS providers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  logo_path TEXT
);
CREATE TABLE IF NOT EXISTS movie_providers (
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  region TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('flatrate','rent','buy')),
  PRIMARY KEY (movie_id, provider_id, region, type)
);
CREATE INDEX IF NOT EXISTS idx_mp_provider ON movie_providers(provider_id, region);

-- Precomputed content-based similarity (top 20 per movie)
CREATE TABLE IF NOT EXISTS similar_movies (
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  similar_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  reason TEXT,
  PRIMARY KEY (movie_id, similar_id)
);

-- Anonymous, session-based user data
CREATE TABLE IF NOT EXISTS watchlist (
  session_id TEXT NOT NULL,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, movie_id)
);
CREATE TABLE IF NOT EXISTS ratings (
  session_id TEXT NOT NULL,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 10),
  rated_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, movie_id)
);

-- Full-text search (FTS5), kept in sync by the importer
CREATE VIRTUAL TABLE IF NOT EXISTS movies_fts USING fts5(
  title, original_title, tagline, overview,
  content='movies', content_rowid='id', tokenize='porter unicode61 remove_diacritics 2'
);
CREATE TRIGGER IF NOT EXISTS movies_ai AFTER INSERT ON movies BEGIN
  INSERT INTO movies_fts(rowid,title,original_title,tagline,overview)
  VALUES (new.id,new.title,new.original_title,new.tagline,new.overview);
END;
CREATE TRIGGER IF NOT EXISTS movies_ad AFTER DELETE ON movies BEGIN
  INSERT INTO movies_fts(movies_fts,rowid,title,original_title,tagline,overview)
  VALUES ('delete',old.id,old.title,old.original_title,old.tagline,old.overview);
END;
CREATE TRIGGER IF NOT EXISTS movies_au AFTER UPDATE ON movies BEGIN
  INSERT INTO movies_fts(movies_fts,rowid,title,original_title,tagline,overview)
  VALUES ('delete',old.id,old.title,old.original_title,old.tagline,old.overview);
  INSERT INTO movies_fts(rowid,title,original_title,tagline,overview)
  VALUES (new.id,new.title,new.original_title,new.tagline,new.overview);
END;
