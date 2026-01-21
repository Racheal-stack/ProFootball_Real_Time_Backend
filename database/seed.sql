-- Seed data for teams and players

-- Insert Teams
INSERT INTO teams (id, name, short_name, stadium, city, founded_year) VALUES
('11111111-1111-1111-1111-111111111111', 'Manchester United', 'MUN', 'Old Trafford', 'Manchester', 1878),
('22222222-2222-2222-2222-222222222222', 'Liverpool', 'LIV', 'Anfield', 'Liverpool', 1892),
('33333333-3333-3333-3333-333333333333', 'Arsenal', 'ARS', 'Emirates Stadium', 'London', 1886),
('44444444-4444-4444-4444-444444444444', 'Chelsea', 'CHE', 'Stamford Bridge', 'London', 1905),
('55555555-5555-5555-5555-555555555555', 'Manchester City', 'MCI', 'Etihad Stadium', 'Manchester', 1880),
('66666666-6666-6666-6666-666666666666', 'Tottenham', 'TOT', 'Tottenham Hotspur Stadium', 'London', 1882),
('77777777-7777-7777-7777-777777777777', 'Newcastle', 'NEW', 'St James'' Park', 'Newcastle', 1892),
('88888888-8888-8888-8888-888888888888', 'Brighton', 'BHA', 'Amex Stadium', 'Brighton', 1901),
('99999999-9999-9999-9999-999999999999', 'West Ham', 'WHU', 'London Stadium', 'London', 1895),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Aston Villa', 'AVL', 'Villa Park', 'Birmingham', 1874)
ON CONFLICT (id) DO NOTHING;

-- Insert Players for Manchester United
INSERT INTO players (team_id, name, position, jersey_number, nationality) VALUES
('11111111-1111-1111-1111-111111111111', 'Rashford', 'FWD', 10, 'England'),
('11111111-1111-1111-1111-111111111111', 'Fernandes', 'MID', 8, 'Portugal'),
('11111111-1111-1111-1111-111111111111', 'Casemiro', 'MID', 18, 'Brazil'),
('11111111-1111-1111-1111-111111111111', 'Antony', 'FWD', 21, 'Brazil'),
('11111111-1111-1111-1111-111111111111', 'Martinez', 'DEF', 6, 'Argentina'),
('11111111-1111-1111-1111-111111111111', 'Shaw', 'DEF', 23, 'England')
ON CONFLICT DO NOTHING;

-- Insert Players for Liverpool
INSERT INTO players (team_id, name, position, jersey_number, nationality) VALUES
('22222222-2222-2222-2222-222222222222', 'Salah', 'FWD', 11, 'Egypt'),
('22222222-2222-2222-2222-222222222222', 'Núñez', 'FWD', 9, 'Uruguay'),
('22222222-2222-2222-2222-222222222222', 'Gakpo', 'FWD', 18, 'Netherlands'),
('22222222-2222-2222-2222-222222222222', 'Alexander-Arnold', 'DEF', 66, 'England'),
('22222222-2222-2222-2222-222222222222', 'Van Dijk', 'DEF', 4, 'Netherlands'),
('22222222-2222-2222-2222-222222222222', 'Robertson', 'DEF', 26, 'Scotland')
ON CONFLICT DO NOTHING;

-- Insert Players for Arsenal
INSERT INTO players (team_id, name, position, jersey_number, nationality) VALUES
('33333333-3333-3333-3333-333333333333', 'Saka', 'FWD', 7, 'England'),
('33333333-3333-3333-3333-333333333333', 'Ødegaard', 'MID', 8, 'Norway'),
('33333333-3333-3333-3333-333333333333', 'Jesus', 'FWD', 9, 'Brazil'),
('33333333-3333-3333-3333-333333333333', 'Martinelli', 'FWD', 11, 'Brazil'),
('33333333-3333-3333-3333-333333333333', 'Partey', 'MID', 5, 'Ghana'),
('33333333-3333-3333-3333-333333333333', 'Saliba', 'DEF', 12, 'France')
ON CONFLICT DO NOTHING;

-- Insert Players for Chelsea
INSERT INTO players (team_id, name, position, jersey_number, nationality) VALUES
('44444444-4444-4444-4444-444444444444', 'Sterling', 'FWD', 7, 'England'),
('44444444-4444-4444-4444-444444444444', 'Jackson', 'FWD', 15, 'Senegal'),
('44444444-4444-4444-4444-444444444444', 'Enzo', 'MID', 23, 'Argentina'),
('44444444-4444-4444-4444-444444444444', 'Palmer', 'MID', 20, 'England'),
('44444444-4444-4444-4444-444444444444', 'James', 'DEF', 24, 'England'),
('44444444-4444-4444-4444-444444444444', 'Silva', 'DEF', 6, 'Brazil')
ON CONFLICT DO NOTHING;

-- Insert Players for Manchester City
INSERT INTO players (team_id, name, position, jersey_number, nationality) VALUES
('55555555-5555-5555-5555-555555555555', 'Haaland', 'FWD', 9, 'Norway'),
('55555555-5555-5555-5555-555555555555', 'De Bruyne', 'MID', 17, 'Belgium'),
('55555555-5555-5555-5555-555555555555', 'Foden', 'MID', 47, 'England'),
('55555555-5555-5555-5555-555555555555', 'Grealish', 'FWD', 10, 'England'),
('55555555-5555-5555-5555-555555555555', 'Rodri', 'MID', 16, 'Spain'),
('55555555-5555-5555-5555-555555555555', 'Walker', 'DEF', 2, 'England')
ON CONFLICT DO NOTHING;

-- Insert Players for Tottenham
INSERT INTO players (team_id, name, position, jersey_number, nationality) VALUES
('66666666-6666-6666-6666-666666666666', 'Son', 'FWD', 7, 'South Korea'),
('66666666-6666-6666-6666-666666666666', 'Richarlison', 'FWD', 9, 'Brazil'),
('66666666-6666-6666-6666-666666666666', 'Maddison', 'MID', 10, 'England'),
('66666666-6666-6666-6666-666666666666', 'Kulusevski', 'FWD', 21, 'Sweden'),
('66666666-6666-6666-6666-666666666666', 'Romero', 'DEF', 17, 'Argentina'),
('66666666-6666-6666-6666-666666666666', 'Bissouma', 'MID', 8, 'Mali')
ON CONFLICT DO NOTHING;

-- Insert Players for Newcastle
INSERT INTO players (team_id, name, position, jersey_number, nationality) VALUES
('77777777-7777-7777-7777-777777777777', 'Isak', 'FWD', 14, 'Sweden'),
('77777777-7777-7777-7777-777777777777', 'Gordon', 'FWD', 10, 'England'),
('77777777-7777-7777-7777-777777777777', 'Joelinton', 'MID', 7, 'Brazil'),
('77777777-7777-7777-7777-777777777777', 'Guimarães', 'MID', 39, 'Brazil'),
('77777777-7777-7777-7777-777777777777', 'Trippier', 'DEF', 2, 'England'),
('77777777-7777-7777-7777-777777777777', 'Botman', 'DEF', 4, 'Netherlands')
ON CONFLICT DO NOTHING;

-- Insert Players for Brighton
INSERT INTO players (team_id, name, position, jersey_number, nationality) VALUES
('88888888-8888-8888-8888-888888888888', 'Mitoma', 'FWD', 22, 'Japan'),
('88888888-8888-8888-8888-888888888888', 'Ferguson', 'FWD', 28, 'Ireland'),
('88888888-8888-8888-8888-888888888888', 'March', 'MID', 7, 'England'),
('88888888-8888-8888-8888-888888888888', 'Groß', 'MID', 13, 'Germany'),
('88888888-8888-8888-8888-888888888888', 'Caicedo', 'MID', 25, 'Ecuador'),
('88888888-8888-8888-8888-888888888888', 'Dunk', 'DEF', 5, 'England')
ON CONFLICT DO NOTHING;

-- Insert Players for West Ham
INSERT INTO players (team_id, name, position, jersey_number, nationality) VALUES
('99999999-9999-9999-9999-999999999999', 'Bowen', 'FWD', 20, 'England'),
('99999999-9999-9999-9999-999999999999', 'Antonio', 'FWD', 9, 'Jamaica'),
('99999999-9999-9999-9999-999999999999', 'Paquetá', 'MID', 11, 'Brazil'),
('99999999-9999-9999-9999-999999999999', 'Rice', 'MID', 41, 'England'),
('99999999-9999-9999-9999-999999999999', 'Souček', 'MID', 28, 'Czech Republic'),
('99999999-9999-9999-9999-999999999999', 'Coufal', 'DEF', 5, 'Czech Republic')
ON CONFLICT DO NOTHING;

-- Insert Players for Aston Villa
INSERT INTO players (team_id, name, position, jersey_number, nationality) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Watkins', 'FWD', 11, 'England'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bailey', 'FWD', 31, 'Jamaica'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'McGinn', 'MID', 7, 'Scotland'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ramsey', 'MID', 41, 'England'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Carlos', 'DEF', 3, 'Brazil'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Konsa', 'DEF', 4, 'England')
ON CONFLICT DO NOTHING;
