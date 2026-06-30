# Asset API

Base URL: `/v1/assets`

---

## Create Asset

**POST** `/v1/assets`

### Request Body

```json
{
  "assetName": "MacBook Pro 14",
  "assetSerialNumber": "C02XG1JHJGH5",
  "assetType": "issued",
  "assetDescription": "Apple MacBook Pro 14-inch M1 Pro",
  "issuedDate": "2024-01-15",
  "assetContition": "new",
  "assetStatus": "currently_using",
  "isReturned": false,
  "returnCondition": "good",
  "returnDate": null
}
```

| Field               | Type      | Required | Description                                                  |
|---------------------|-----------|----------|--------------------------------------------------------------|
| `assetName`         | `string`  | no       | Name of the asset                                            |
| `assetSerialNumber` | `string`  | no       | Unique serial number                                         |
| `assetType`         | `string`  | no       | Type of asset (default: `issued`)                            |
| `assetDescription`  | `string`  | no       | Description of the asset                                     |
| `issuedDate`        | `date`    | no       | Date the asset was issued                                    |
| `assetContition`    | `string`  | no       | Condition when issued (default: `new`)                       |
| `assetStatus`       | `string`  | no       | Current status (default: `currently_using`)                  |
| `isReturned`        | `boolean` | no       | Whether the asset has been returned (default: `false`)       |
| `returnCondition`   | `string`  | no       | Condition when returned (default: `good`)                    |
| `returnDate`        | `date`    | no       | Date the asset was returned                                  |

### Response `201`

```json
{
  "id": "664f1b2c8e4a2b001c8das01",
  "assetName": "MacBook Pro 14",
  "assetSerialNumber": "C02XG1JHJGH5",
  "assetType": "issued",
  "assetDescription": "Apple MacBook Pro 14-inch M1 Pro",
  "issuedDate": "2024-01-15T00:00:00.000Z",
  "assetContition": "new",
  "assetStatus": "currently_using",
  "isReturned": false,
  "returnCondition": "good",
  "returnDate": null
}
```

---

## Get All Assets

**GET** `/v1/assets`

### Query Parameters

| Param               | Type     | Description                                |
|---------------------|----------|--------------------------------------------|
| `assetName`         | `string` | Filter by asset name                       |
| `assetSerialNumber` | `string` | Filter by serial number                    |
| `assetType`         | `string` | Filter by asset type                       |
| `search`            | `string` | General search term                        |
| `sortBy`            | `string` | Sort field and order e.g. `createdAt:desc` |
| `limit`             | `number` | Results per page (default: 10)             |
| `page`              | `number` | Page number (default: 1)                   |

### Response `200`

```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8das01",
      "assetName": "MacBook Pro 14",
      "assetSerialNumber": "C02XG1JHJGH5",
      "assetType": "issued",
      "assetDescription": "Apple MacBook Pro 14-inch M1 Pro",
      "issuedDate": "2024-01-15T00:00:00.000Z",
      "assetContition": "new",
      "assetStatus": "currently_using",
      "isReturned": false,
      "returnCondition": "good",
      "returnDate": null
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

---

## Get Asset by ID

**GET** `/v1/assets/:assetId`

### Path Parameter

| Param     | Type       | Description          |
|-----------|------------|----------------------|
| `assetId` | `ObjectId` | MongoDB ID of asset  |

### Response `200`
Returns the full asset object (same shape as results array above).

### Response `404`
```json
{ "code": 404, "message": "Asset not found" }
```

---

## Update Asset

**PATCH** `/v1/assets/:assetId`

All fields optional, at least one required.

### Path Parameter

| Param     | Type       | Description         |
|-----------|------------|---------------------|
| `assetId` | `ObjectId` | MongoDB ID of asset |

### Request Body

```json
{
  "assetStatus": "returned",
  "isReturned": true,
  "returnCondition": "good",
  "returnDate": "2024-06-30"
}
```

### Response `200`
Returns the updated asset object.

### Response `404`
```json
{ "code": 404, "message": "Asset not found" }
```

---

## Delete Asset

**DELETE** `/v1/assets/:assetId`

### Path Parameter

| Param     | Type       | Description         |
|-----------|------------|---------------------|
| `assetId` | `ObjectId` | MongoDB ID of asset |

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "Asset not found" }
```

---

## Instructions

### Asset lifecycle

1. Create an asset record when issuing equipment to an employee.
2. Set `isReturned: false` and `assetStatus: "currently_using"` on issue.
3. When the employee returns the asset, `PATCH` with `isReturned: true`, `returnCondition`, and `returnDate`.

### Pagination

Supports `page`, `limit`, and `sortBy`. Default page size is `10`. Format: `sortBy=issuedDate:desc`.
