# Announcement API

Base URL: `/v1/announcements`

---

## Create Announcement

**POST** `/v1/announcements`

### Request Body

```json
{
  "title": "Office Closure Notice",
  "description": "The office will be closed on June 15th for maintenance.",
  "content": "Dear team, please note that the office will remain closed on Saturday, June 15th due to scheduled maintenance work. Work from home is permitted.",
  "scheduleDateAndTime": "2024-06-15T09:00:00.000Z",
  "images": [
    {
      "imgName": "notice-banner",
      "imgUrl": "https://cdn.example.com/notice-banner.png"
    }
  ]
}
```

| Field                 | Type       | Required | Description                                  |
|-----------------------|------------|----------|----------------------------------------------|
| `title`               | `string`   | no       | Title of the announcement                    |
| `description`         | `string`   | no       | Short description or summary                 |
| `content`             | `string`   | no       | Full announcement content                    |
| `scheduleDateAndTime` | `date`     | no       | Scheduled publish date and time              |
| `images`              | `object[]` | no       | List of images (see below)                   |

#### images[]

| Field      | Type     | Description              |
|------------|----------|--------------------------|
| `imgName`  | `string` | Display name of the image |
| `imgUrl`   | `string` | URL of the image          |

### Response `201`

```json
{
  "id": "664f1b2c8e4a2b001c8dan01",
  "title": "Office Closure Notice",
  "description": "The office will be closed on June 15th for maintenance.",
  "content": "Dear team, please note that the office will remain closed...",
  "scheduleDateAndTime": "2024-06-15T09:00:00.000Z",
  "images": [
    {
      "imgName": "notice-banner",
      "imgUrl": "https://cdn.example.com/notice-banner.png"
    }
  ],
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

---

## Get All Announcements

**GET** `/v1/announcements`

### Query Parameters

| Param    | Type     | Description                                |
|----------|----------|--------------------------------------------|
| `title`  | `string` | Filter by title                            |
| `search` | `string` | General search term                        |
| `sortBy` | `string` | Sort field and order e.g. `createdAt:desc` |
| `limit`  | `number` | Results per page (default: 10)             |
| `page`   | `number` | Page number (default: 1)                   |

### Response `200`

```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8dan01",
      "title": "Office Closure Notice",
      "description": "The office will be closed on June 15th for maintenance.",
      "scheduleDateAndTime": "2024-06-15T09:00:00.000Z",
      "images": [],
      "createdAt": "2024-06-01T10:00:00.000Z",
      "updatedAt": "2024-06-01T10:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

---

## Get Announcement by ID

**GET** `/v1/announcements/:announcementId`

### Path Parameter

| Param            | Type       | Description                  |
|------------------|------------|------------------------------|
| `announcementId` | `ObjectId` | MongoDB ID of announcement   |

### Response `200`
Returns the full announcement object (same shape as results array above, including `content`).

### Response `404`
```json
{ "code": 404, "message": "Announcement not found" }
```

---

## Update Announcement

**PATCH** `/v1/announcements/:announcementId`

All fields optional, at least one required.

### Path Parameter

| Param            | Type       | Description                |
|------------------|------------|----------------------------|
| `announcementId` | `ObjectId` | MongoDB ID of announcement |

### Request Body

```json
{
  "title": "Updated: Office Closure Notice",
  "scheduleDateAndTime": "2024-06-16T09:00:00.000Z"
}
```

### Response `200`
Returns the updated announcement object.

### Response `404`
```json
{ "code": 404, "message": "Announcement not found" }
```

---

## Delete Announcement

**DELETE** `/v1/announcements/:announcementId`

### Path Parameter

| Param            | Type       | Description                |
|------------------|------------|----------------------------|
| `announcementId` | `ObjectId` | MongoDB ID of announcement |

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "Announcement not found" }
```

---

## Instructions

### Scheduling

Use `scheduleDateAndTime` to indicate when the announcement should be visible or sent. The API stores the value but does not automatically publish or send notifications — implement a scheduler on the client or a background job to handle timed delivery.

### Images

Pass an array of `{ imgName, imgUrl }` objects. Upload images to your storage service first and pass the resulting URLs.

### Pagination

Supports `page`, `limit`, and `sortBy`. Default page size is `10`. Format: `sortBy=scheduleDateAndTime:desc`.
