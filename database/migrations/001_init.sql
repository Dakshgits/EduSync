-- EduSync initial schema (PostgreSQL 13+)
CREATE TYPE user_role AS ENUM ('STUDENT', 'ADMIN');
CREATE TYPE member_role AS ENUM ('LEADER', 'MEMBER');
CREATE TYPE invite_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE target_type AS ENUM ('ALL', 'SELECTED_GROUPS');
CREATE TYPE submission_status AS ENUM ('PENDING', 'PARTIAL', 'SUBMITTED');

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  student_id    VARCHAR(40) UNIQUE,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'STUDENT',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_student_has_student_id CHECK (role = 'ADMIN' OR student_id IS NOT NULL)
);
CREATE UNIQUE INDEX uq_users_email ON users (lower(email));

CREATE TABLE groups (
  id         SERIAL PRIMARY KEY,
  group_name VARCHAR(80) NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_groups_name ON groups (lower(group_name));

CREATE TABLE group_members (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role member_role NOT NULL DEFAULT 'MEMBER',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_one_group_per_student UNIQUE (user_id),
  CONSTRAINT uq_group_user UNIQUE (group_id, user_id)
);
CREATE INDEX idx_group_members_group ON group_members (group_id);
CREATE UNIQUE INDEX uq_one_leader_per_group ON group_members (group_id) WHERE member_role = 'LEADER';

CREATE TABLE group_invitations (
  id              SERIAL PRIMARY KEY,
  group_id        INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          invite_status NOT NULL DEFAULT 'PENDING',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at    TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_pending_invite ON group_invitations (group_id, invited_user_id) WHERE status = 'PENDING';
CREATE INDEX idx_invites_user_status ON group_invitations (invited_user_id, status);

CREATE TABLE assignments (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  due_date     TIMESTAMPTZ NOT NULL,
  onedrive_link TEXT NOT NULL,
  created_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_type  target_type NOT NULL DEFAULT 'ALL',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assignments_due ON assignments (due_date);
CREATE INDEX idx_assignments_creator ON assignments (created_by);

CREATE TABLE assignment_groups (
  id            SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  group_id      INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT uq_assignment_group UNIQUE (assignment_id, group_id)
);
CREATE INDEX idx_assignment_groups_group ON assignment_groups (group_id);

CREATE TABLE submissions (
  id            SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  group_id      INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  status        submission_status NOT NULL DEFAULT 'PENDING',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_submission_assignment_group UNIQUE (assignment_id, group_id)
);
CREATE INDEX idx_submissions_group ON submissions (group_id);
CREATE INDEX idx_submissions_assignment ON submissions (assignment_id);

CREATE TABLE submission_confirmations (
  id            SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  student_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confirmed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_one_confirmation_per_student UNIQUE (submission_id, student_id)
);
CREATE INDEX idx_confirmations_submission ON submission_confirmations (submission_id);
CREATE INDEX idx_confirmations_student ON submission_confirmations (student_id);

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_groups_updated BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_submissions_updated BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Single source of truth for progress. Only confirmations from CURRENT group members count.
CREATE VIEW submission_progress AS
SELECT s.id AS submission_id,
       s.assignment_id,
       s.group_id,
       COALESCE(m.total, 0)::int     AS total_members,
       COALESCE(c.confirmed, 0)::int AS confirmed_members,
       CASE WHEN COALESCE(m.total, 0) = 0 THEN 0
            ELSE ROUND(100.0 * COALESCE(c.confirmed, 0) / m.total) END::int AS percent,
       (CASE WHEN COALESCE(c.confirmed, 0) = 0 THEN 'PENDING'
             WHEN c.confirmed >= m.total THEN 'SUBMITTED'
             ELSE 'PARTIAL' END)::submission_status AS computed_status
FROM submissions s
LEFT JOIN (SELECT group_id, COUNT(*) AS total FROM group_members GROUP BY group_id) m
       ON m.group_id = s.group_id
LEFT JOIN (SELECT sc.submission_id, COUNT(*) AS confirmed
           FROM submission_confirmations sc
           JOIN submissions s2 ON s2.id = sc.submission_id
           JOIN group_members gm ON gm.group_id = s2.group_id AND gm.user_id = sc.student_id
           GROUP BY sc.submission_id) c
       ON c.submission_id = s.id;
