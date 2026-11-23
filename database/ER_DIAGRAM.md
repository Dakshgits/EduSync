# EduSync – ER Diagram

```mermaid
erDiagram
    users ||--o{ groups : "creates"
    users ||--o| group_members : "belongs to (max 1 group)"
    groups ||--o{ group_members : "has"
    groups ||--o{ group_invitations : "sends"
    users ||--o{ group_invitations : "invited / inviter"
    users ||--o{ assignments : "creates (ADMIN)"
    assignments ||--o{ assignment_groups : "targets (SELECTED_GROUPS)"
    groups ||--o{ assignment_groups : "targeted by"
    assignments ||--o{ submissions : "one per assigned group"
    groups ||--o{ submissions : "has"
    submissions ||--o{ submission_confirmations : "has"
    users ||--o{ submission_confirmations : "confirms"

    users { int id PK  string full_name  string email UK  string student_id UK  string password_hash  enum role }
    groups { int id PK  string group_name  int created_by FK }
    group_members { int id PK  int group_id FK  int user_id FK_UK  enum member_role  timestamptz joined_at }
    group_invitations { int id PK  int group_id FK  int invited_user_id FK  int invited_by FK  enum status  timestamptz responded_at }
    assignments { int id PK  string title  text description  timestamptz due_date  string onedrive_link  int created_by FK  enum target_type }
    assignment_groups { int id PK  int assignment_id FK  int group_id FK }
    submissions { int id PK  int assignment_id FK  int group_id FK  enum status }
    submission_confirmations { int id PK  int submission_id FK  int student_id FK  timestamptz confirmed_at }
```

`submission_progress` is a SQL view that derives confirmed/total members, percent and status
from live rows; analytics and monitoring read from it, so numbers can never drift.
