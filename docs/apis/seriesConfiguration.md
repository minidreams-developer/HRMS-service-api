# Series Configuration API

Series Configuration allows admins to define numbering series for vouchers and documents (e.g. invoices, receipts). Each series has a prefix, suffix, starting number, and zero-padding length that together generate formatted document IDs like `INV-00001-A`.

---

## Base URL

```
/v1/series-configuration
```

---

## Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `seriesName` | String | ✅ | Human-readable name for the series (e.g. "Invoice Series") |
| `voucherType` | String | ❌ | Type of voucher this series applies to (e.g. "invoice", "receipt") |
| `prefix` | String | ✅ | Characters prepended to the number (e.g. `"INV"`) |
| `suffix` | String | ✅ | Characters appended to the number (e.g. `"A"`) |
| `startingNo` | Number | ✅ | The first number in the series (e.g. `1`) |
| `lengthOfZero` | Number | ✅ | Total digit length with zero-padding (e.g. `5` → `00001`) |
| `createdAt` | Date | auto | Timestamp of creation |
| `updatedAt` | Date | auto | Timestamp of last update |

**Generated ID example:**
With `prefix: "INV"`, `suffix: "A"`, `startingNo: 1`, `lengthOfZero: 5` → `INV-00001-A`

---

## Endpoints

### 1. Create Series Configuration

**POST** `/v1/series-configuration`

Creates a new series configuration.

**Request Body:**
```json
{
  "seriesName": "Invoice Series",
  "voucherType": "invoice",
  "prefix": "INV",
  "suffix": "A",
  "startingNo": 1,
  "lengthOfZero": 5
}
```

**Response `201 Created`:**
```json
{
  "id": "684f2a1c9b3e4d0012345678",
  "seriesName": "Invoice Series",
  "voucherType": "invoice",
  "prefix": "INV",
  "suffix": "A",
  "startingNo": 1,
  "lengthOfZero": 5,
  "createdAt": "2026-07-08T10:00:00.000Z",
  "updatedAt": "2026-07-08T10:00:00.000Z"
}
```

---

### 2. Get All Series Configurations

**GET** `/v1/series-configuration`

Returns a paginated list of all series configurations.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `seriesName` | String | Filter by series name |
| `voucherType` | String | Filter by voucher type |
| `sortBy` | String | Sort field and order e.g. `createdAt:desc` |
| `limit` | Number | Results per page (default: 10) |
| `page` | Number | Page number (default: 1) |

**Example:**
```
GET /v1/series-configuration?voucherType=invoice&limit=10&page=1
```

**Response `200 OK`:**
```json
{
  "results": [
    {
      "id": "684f2a1c9b3e4d0012345678",
      "seriesName": "Invoice Series",
      "voucherType": "invoice",
      "prefix": "INV",
      "suffix": "A",
      "startingNo": 1,
      "lengthOfZero": 5,
      "createdAt": "2026-07-08T10:00:00.000Z",
      "updatedAt": "2026-07-08T10:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

---

### 3. Get Series Configuration by ID

**GET** `/v1/series-configuration/:seriesId`

Returns a single series configuration by its MongoDB `_id`.

**URL Parameter:**

| Parameter | Description |
|---|---|
| `seriesId` | MongoDB ObjectId of the series configuration |

**Example:**
```
GET /v1/series-configuration/684f2a1c9b3e4d0012345678
```

**Response `200 OK`:**
```json
{
  "id": "684f2a1c9b3e4d0012345678",
  "seriesName": "Invoice Series",
  "voucherType": "invoice",
  "prefix": "INV",
  "suffix": "A",
  "startingNo": 1,
  "lengthOfZero": 5,
  "createdAt": "2026-07-08T10:00:00.000Z",
  "updatedAt": "2026-07-08T10:00:00.000Z"
}
```

**Response `404 Not Found`:**
```json
{
  "code": 404,
  "message": "Series configuration not found"
}
```

---

### 4. Update Series Configuration

**PATCH** `/v1/series-configuration/:seriesId`

Partially updates a series configuration. Only send the fields you want to change.

**URL Parameter:**

| Parameter | Description |
|---|---|
| `seriesId` | MongoDB ObjectId of the series configuration |

**Request Body (all fields optional):**
```json
{
  "prefix": "REC",
  "suffix": "B",
  "startingNo": 100,
  "lengthOfZero": 6
}
```

**Response `200 OK`:**
```json
{
  "id": "684f2a1c9b3e4d0012345678",
  "seriesName": "Invoice Series",
  "voucherType": "invoice",
  "prefix": "REC",
  "suffix": "B",
  "startingNo": 100,
  "lengthOfZero": 6,
  "createdAt": "2026-07-08T10:00:00.000Z",
  "updatedAt": "2026-07-08T11:30:00.000Z"
}
```

**Response `404 Not Found`:**
```json
{
  "code": 404,
  "message": "Series configuration not found"
}
```

---

### 5. Delete Series Configuration

**DELETE** `/v1/series-configuration/:seriesId`

Permanently deletes a series configuration.

**URL Parameter:**

| Parameter | Description |
|---|---|
| `seriesId` | MongoDB ObjectId of the series configuration |

**Example:**
```
DELETE /v1/series-configuration/684f2a1c9b3e4d0012345678
```

**Response `204 No Content`** — empty body on success.

**Response `404 Not Found`:**
```json
{
  "code": 404,
  "message": "Series configuration not found"
}
```

---

## Error Responses

| Code | Message | Cause |
|---|---|---|
| `400` | Validation error | Missing required fields |
| `404` | Series configuration not found | Invalid or non-existent `seriesId` |
| `500` | Internal server error | Unexpected server error |

---

## Postman Quick Reference

| Action | Method | URL | Body |
|---|---|---|---|
| Create | `POST` | `/v1/series-configuration` | JSON body with all required fields |
| Get all | `GET` | `/v1/series-configuration` | None (use query params to filter) |
| Get one | `GET` | `/v1/series-configuration/:seriesId` | None |
| Update | `PATCH` | `/v1/series-configuration/:seriesId` | JSON with fields to update |
| Delete | `DELETE` | `/v1/series-configuration/:seriesId` | None |
