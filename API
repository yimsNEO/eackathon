## 📡 API 명세서 (API Reference)

회의록 요약 및 데이터 통신을 위한 REST API 명세입니다. LLM API Key 보안을 위해 모든 AI 통신은 내부 서버(Next.js API Routes)를 거쳐 수행됩니다.

### 1. API Endpoint 요약 표

| 기능명 | Method | Endpoint URL | 설명 |
| :--- | :---: | :--- | :--- |
| **AI 회의록 분석/요약** | `POST` | `/api/analyze` | 회의 원문을 LLM으로 분석하여 확정 안건, 의견 필요 안건, 할 일(R&R)을 JSON으로 추출 |
| **내 할 일(Todo) 조회** | `GET` | `/api/todos?assignee={이름}` | 특정 사용자에게 할당된 전체 할 일을 회의(Meeting) 단위로 그룹화하여 조회 |
| **회의록 원본 업데이트** | `PUT` | `/api/minutes/:id` | 사용자가 수동으로 작성하거나 수정한 회의록 텍스트 원본 및 생성 상태를 DB에 갱신 |

<br>

### 2. API 상세 스펙 (Request / Response)

#### 🎯 `POST` /api/analyze
*   **Description:** AI를 활용한 회의 내용 구조화 및 Task 자동 할당
*   **Request Body:**
    ```json
    {
      "groupId": "g1",
      "attendees": ["김도윤", "이서연", "박지훈"],
      "content": "다음 정기모임 일정은 8월 27일로 하고, 예산안은 강태윤이 금요일까지 정리하자. 홍보 포스터 시안은 정하은이 만들고 최민서 컨펌받아."
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "confirmedItems": ["다음 정기모임 일정: 8월 27일 확정"],
        "pendingItems": [
          { "text": "홍보 포스터 시안 최종 컨펌", "people": ["최민서"] }
        ],
        "todos": [
          { "text": "예산안 최종 정리", "assignee": "강태윤" },
          { "text": "홍보 포스터 시안 제작", "assignee": "정하은" }
        ]
      }
    }
    ```

#### 🎯 `GET` /api/todos?assignee={이름}
*   **Description:** 쿼리 파라미터로 전달된 사용자의 할 일 목록 조회
*   **Request Params:** `assignee` (String, 필수) - 조회할 대상 이름 (예: `?assignee=최민서`)
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": [
        {
          "minuteId": "m1",
          "minuteTitle": "정기 임원진 회의",
          "minuteDate": "2026-08-13",
          "todos": [
            { "id": "t5", "text": "홍보 포스터 시안 최종 컨펌", "done": false }
          ]
        }
      ]
    }
    ```

#### 🎯 `PUT` /api/minutes/:id
*   **Description:** 회의록 텍스트 업데이트 및 요약 상태(generated) 변경
*   **Request Params:** `id` (String, Path Variable) - 회의록 고유 ID
*   **Request Body:**
    ```json
    {
      "content": "수정된 회의 내용 텍스트입니다.",
      "generated": false
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "회의록이 성공적으로 업데이트되었습니다."
    }
    ```
