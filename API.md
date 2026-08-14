## 📡 API 명세서 (API Reference)

회의록 요약 및 데이터 통신을 위한 REST API 명세입니다. LLM API Key 보안을 위해 핵심 AI 통신은 내부 서버(Next.js API Routes)를 거쳐 수행됩니다.

### 1. API Endpoint 요약 표

#### 1) 회의록 (Minutes) & AI 분석 API
| 기능명 | Method | Endpoint URL | 설명 |
| :--- | :---: | :--- | :--- |
| **회의록 목록 조회** | `GET` | `/api/minutes` | 생성된 전체 회의록 목록 조회 |
| **새 회의록 생성** | `POST` | `/api/minutes` | 빈 회의록 데이터 신규 생성 |
| **AI 회의록 분석/요약** | `POST` | `/api/analyze` | 회의 원문을 LLM으로 분석하여 안건 및 할 일을 JSON으로 자동 추출 |
| **회의록 원본/상태 수정**| `PUT` | `/api/minutes/:id` | 회의록 원본 텍스트 수정, 참여 그룹/인원 변경 및 저장 |
| **회의록 삭제** | `DELETE`| `/api/minutes/:id` | 특정 회의록 데이터 삭제 |

#### 2) 그룹 (Groups) 관리 API
| 기능명 | Method | Endpoint URL | 설명 |
| :--- | :---: | :--- | :--- |
| **그룹 목록 조회** | `GET` | `/api/groups` | 전체 그룹 및 소속 멤버 리스트 조회 |
| **새 그룹 생성** | `POST` | `/api/groups` | 신규 그룹 데이터 생성 |
| **그룹 정보 수정** | `PUT` | `/api/groups/:id` | 그룹명 변경 또는 새로운 멤버 추가/삭제 등 내역 업데이트 |
| **그룹 삭제** | `DELETE`| `/api/groups/:id` | 특정 그룹 데이터 삭제 |

#### 3) 할 일 (Todos) 관리 API
| 기능명 | Method | Endpoint URL | 설명 |
| :--- | :---: | :--- | :--- |
| **내 할 일 목록 조회** | `GET` | `/api/todos?assignee={이름}` | 특정 사용자에게 할당된 전체 할 일을 회의 단위로 그룹화하여 조회 |
| **할 일 완료 상태 변경**| `PUT` | `/api/todos/:id` | 특정 할 일의 완료 여부(done) 상태 토글 |

<br>

### 2. API 상세 스펙 (Request / Response)

#### 🟢 AI 회의록 분석 및 요약
* **API:** `POST /api/analyze`
* **Description:** 회의 원문을 LLM으로 분석하여 안건 및 할 일 추출
* **Request Body:**
  ```json
  {
    "groupId": "g1",
    "attendees": ["이명세", "서재욱"],
    "content": "홍보 포스터 시안은 배진용이 만들고 최민서 컨펌받아."
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "confirmedItems": [],
      "pendingItems": [
        { "text": "홍보 포스터 시안 최종 컨펌", "people": ["최민서"] }
      ],
      "todos": [
        { "text": "홍보 포스터 시안 제작", "assignee": "배진용" }
      ]
    }
  }
  ```

#### 🟢 회의록 (Minutes) 관련 API 상세
* **`GET /api/minutes`** (목록 조회)
  * **Response:**
    ```json
    {
      "status": "success",
      "data": [
        { "id": "m1", "title": "정기 임원진 회의", "date": "2026-08-13", "groupId": "g1", "generated": true }
      ]
    }
    ```
* **`POST /api/minutes`** (신규 생성)
  * **Request Body:** `{"title": "새 회의록", "date": "2026-08-14", "groupId": "g1"}`
  * **Response:** `{"status": "success", "data": {"id": "m2"}}`
* **`PUT /api/minutes/:id`** (수정)
  * **Request Body:** `{"content": "수정된 회의 내용...", "attendees": ["최민서", "배진용"]}`
  * **Response:** `{"status": "success"}`

#### 🟢 그룹 (Groups) 관련 API 상세
* **`GET /api/groups`** (목록 조회)
  * **Response:**
    ```json
    {
      "status": "success",
      "data": [
        { "id": "g1", "name": "임원진", "members": [{ "id": "p1", "name": "배진용", "role": "회장", "color": "bg-blue-600" }] }
      ]
    }
    ```
* **`PUT /api/groups/:id`** (수정)
  * **Request Body:**
    ```json
    {
      "name": "기획팀(수정)",
      "members": [{ "id": "p1", "name": "최민서", "role": "기획팀장" }]
    }
    ```
  * **Response:** `{"status": "success"}`

#### 🟢 할 일 (Todos) 관련 API 상세
* **`GET /api/todos?assignee={이름}`** (조회)
  * **Response:**
    ```json
    {
      "status": "success",
      "data": [
        {
          "minuteId": "m1",
          "minuteTitle": "정기 임원진 회의",
          "todos": [{ "id": "t1", "text": "포스터 제작", "done": false }]
        }
      ]
    }
    ```
* **`PUT /api/todos/:id`** (수정)
  * **Request Body:** `{"done": true}`
  * **Response:** `{"status": "success"}`
