# SmartRead API v3 Integration Reference & Implementation Guide

This document integrates the official SmartRead API v3 documentation, schema definitions, error code tables, and behaviors identified through practical validation.

## 1. Basic Information

*   **Base URL**: `https://api.smartread.jp/v3`
*   **Authentication**:
    *   Header: `Authorization: apikey {YOUR_API_KEY}`
*   **Content-Type**:
    *   General: `application/json`
    *   File Upload: `multipart/form-data`

---

## 2. Recommended Implementation Flow (Hybrid Flow)

**Goal**: Retrieve both form data (CSV) and detailed coordinate data (JSON), ensuring they can be matched on a per-file basis using `requestId`.

### Step 1: Task Management (Create or Reuse)
*   **Endpoint**: `POST /task`
*   **Payload**:
    ```json
    {
      "name": "TaskName_YYYYMMDD",
      "requestType": "templateMatching",
      "exportSettings": {
        "type": "csv",
        "aggregation": "oneFilePerRequest"
      },
      "languages": ["ja"]
    }
    ```
*   **Note**: If an existing `taskId` is used and fails with Error **1602**, it should be treated as invalid/expired, and a new task should be created.

### Step 2: File Upload
*   **Endpoint**: `POST /task/{taskId}/request`
*   **Type**: `multipart/form-data` (form field: `image`)
*   **Action**: Store the returned `requestId` mapped to the `filename`.

### Step 3: Polling for Completion
*   **Endpoint**: `GET /task/{taskId}`
*   **Condition**: Wait until `state` is `"OCR_COMPLETED"`.
*   **Partial Success**: If `state` is `"OCR_FAILED"` but `requestStateSummary.OCR_COMPLETED > 0`, it is possible to proceed for the successful files.

### Step 4: CSV Export (with Fallback Strategy)
*   **Endpoint**: `POST /task/{taskId}/export`
*   **Payload**: `{ "type": "csv", "aggregation": "oneFilePerRequest" }`
*   **Error Handling (Code 1804)**:
    *   If `oneFilePerRequest` is not supported for the specific `requestType`, Error **1804** will occur.
    *   **Fallback**: Re-try with `aggregation: "oneFile"`.
    *   In the `oneFile` case, split the data programmatically using the "Filename" column in the CSV.

### Step 5: Retrieve Detailed JSON Data
*   **Endpoint**: `GET /request/{requestId}/results`
*   **Action**: Loop through the saved `requestId` list to fetch detailed results for each file.

---

## 3. API Response Schemas

### GET /request/{requestId}/results
Detailed OCR results including coordinates and confidence.

```json
{
  "results": [
    {
      "pages": [
        {
          "fields": [
            {
              "name": "fieldName",
              "singleLine": {
                "text": "Extracted Text",
                "confidence": 0.99,
                "rectangle": { "x": 0, "y": 0, "width": 100, "height": 20 }
              },
              "correction": "Corrected value if exists (priority level 1)"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 4. Error Handling Specifications

Always check the `errors[0].code` in the response body.

| HTTP Status | Code (Internal) | Description | Action |
| --- | --- | --- | --- |
| **404** | **1602** | Task not found | `taskId` is invalid/expired. Fallback to creating a new task. |
| **400** | **1804** | Invalid export type | `aggregation` combo not supported. Fallback to `oneFile`. |
| **200** | **1308** | Template not matched | **Warning: Returns 200 OK**. Log as warning and continue/skip the file. |
| **404** | **1801** | No Export found | `exportId` invalid. Restart export process. |

---

## 5. Data Priority Rules

When retrieving field values, apply the following priority:

1.  **`correction`**: If the value exists and is not `null`, prioritize this over the OCR result.
2.  **`text`**: The raw OCR output (e...g., `singleLine.text`, `boxedCharacters.text`).