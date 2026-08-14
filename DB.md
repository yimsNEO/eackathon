### 3. DB 스키마 (Database Schema)

Supabase (PostgreSQL) 기반으로 설계된 핵심 테이블 구조입니다.

#### 1) `minutes` (회의록 테이블)
| 컬럼명 (Column) | 데이터 타입 (Type) | 필수 | 설명 (Description) |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` (PK) | O | 회의록 고유 ID |
| `group_id` | `text` | O | 참여 그룹 ID |
| `title` | `text` | O | 회의 제목 |
| `date` | `text` | O | 회의 날짜 (예: 2026-08-13) |
| `content` | `text` | X | 사용자가 입력한 회의 원문 |
| `generated` | `boolean` | O | AI 요약 완료 여부 (기본값: false) |
| `attendees` | `jsonb` | X | 참석자 이름 배열 |
| `confirmed_items`| `jsonb` | X | AI가 추출한 확정 안건 배열 |
| `pending_items` | `jsonb` | X | AI가 추출한 의견 필요 안건 배열 |

#### 2) `todos` (할 일 테이블)
| 컬럼명 (Column) | 데이터 타입 (Type) | 필수 | 설명 (Description) |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` (PK) | O | 할 일 고유 ID |
| `minute_id` | `uuid` (FK) | O | 어떤 회의록에서 파생되었는지 연결 |
| `text` | `text` | O | 할 일 내용 |
| `assignee` | `text` | O | 담당자 이름 |
| `done` | `boolean` | O | 완료 여부 (기본값: false) |

#### 3) `groups` (그룹 테이블)
| 컬럼명 (Column) | 데이터 타입 (Type) | 필수 | 설명 (Description) |
| :--- | :--- | :---: | :--- |
| `id` | `text` (PK) | O | 그룹 고유 ID (예: g1) |
| `name` | `text` | O | 그룹명 (예: 임원진) |
| `members` | `jsonb` | X | 소속 멤버 리스트 (이름, 역할 등 포함) |
