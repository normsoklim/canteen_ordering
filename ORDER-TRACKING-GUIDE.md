# Order Tracking Guide

This guide explains how to use the Order Tracking API to create and manage tracking entries for orders.

## Overview

The Order Tracking module provides real-time status tracking for orders. Each time an order's status changes, a new tracking entry is created, building a timeline of the order's progress.

## Status Flow

The system enforces valid status transitions. An order must follow this progression:

```
PENDING → CONFIRMED → PREPARING → READY → COMPLETED
   ↓          ↓           ↓          ↓
CANCELLED  CANCELLED   CANCELLED  CANCELLED
```

| Current Status | Allowed Next Statuses |
|---|---|
| `PENDING` | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | `PREPARING`, `CANCELLED` |
| `PREPARING` | `READY`, `CANCELLED` |
| `READY` | `COMPLETED`, `CANCELLED` |
| `COMPLETED` | *(terminal — no further transitions)* |
| `CANCELLED` | *(terminal — no further transitions)* |

## Authentication

All order-tracking endpoints require a valid JWT token:

```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### 1. Create Initial Tracking Entry

**`POST /order-tracking`**

Creates the first tracking record for an order. **Admin/Staff only.**

#### Request Body

```json
{
  "orderId": 2,
  "status": "PENDING",
  "previousStatus": null,
  "estimatedReadyTime": "2026-04-27T07:00:00Z",
  "note": "Order received",
  "updatedBy": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `orderId` | number | ✅ | The ID of the order to track |
| `status` | enum | ✅ | Current status (`PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`) |
| `previousStatus` | enum | ❌ | The previous status (null for initial entry) |
| `estimatedReadyTime` | ISO 8601 date string | ❌ | Estimated time the order will be ready |
| `note` | string | ❌ | Optional note about the status change |
| `updatedBy` | number | ✅ | User ID of the person making the update |

#### Example Response

```json
{
  "id": 1,
  "orderId": 2,
  "status": "PENDING",
  "previousStatus": null,
  "estimatedReadyTime": "2026-04-27T07:00:00.000Z",
  "note": "Order received",
  "updatedBy": 1,
  "createdAt": "2026-04-27T06:00:00.000Z",
  "updatedAt": "2026-04-27T06:00:00.000Z"
}
```

---

### 2. Update Order Status

**`PATCH /order-tracking/:orderId/status`**

Updates the tracking status of an order. Validates that the transition is allowed and syncs the order's status. **Admin/Staff only.**

The `updatedBy` field is automatically set from the authenticated user's JWT token.

#### Request Body

```json
{
  "status": "CONFIRMED",
  "note": "Order confirmed by staff"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | enum | ✅ | The new status to set |
| `estimatedReadyTime` | ISO 8601 date string | ❌ | Updated estimated ready time |
| `note` | string | ❌ | Optional note about the status change |

#### Step-by-Step Example

**Confirm the order:**

```json
PATCH /order-tracking/2/status
{
  "status": "CONFIRMED",
  "note": "Order confirmed by staff"
}
```

**Mark as preparing:**

```json
PATCH /order-tracking/2/status
{
  "status": "PREPARING",
  "estimatedReadyTime": "2026-04-27T07:15:00Z",
  "note": "Kitchen started cooking"
}
```

**Mark as ready:**

```json
PATCH /order-tracking/2/status
{
  "status": "READY",
  "note": "Food is ready for pickup"
}
```

**Mark as completed:**

```json
PATCH /order-tracking/2/status
{
  "status": "COMPLETED",
  "note": "Customer picked up the order"
}
```

**Cancel the order (from any non-terminal status):**

```json
PATCH /order-tracking/2/status
{
  "status": "CANCELLED",
  "note": "Customer requested cancellation"
}
```

#### Error: Invalid Transition

If you try an invalid transition (e.g., `PENDING` → `READY`), you'll get:

```json
{
  "statusCode": 400,
  "message": "Invalid status transition from PENDING to READY. Allowed transitions from PENDING: [CONFIRMED, CANCELLED]"
}
```

---

### 3. Get Order Timeline

**`GET /order-tracking/:orderId/timeline`**

Returns the full tracking timeline for an order, including current status and all tracking events. **Admin/Staff/Customer.**

#### Example

```
GET /order-tracking/2/timeline
```

#### Response

```json
{
  "orderId": 2,
  "currentStatus": "PREPARING",
  "estimatedReadyTime": "2026-04-27T07:15:00.000Z",
  "timeline": [
    {
      "id": 1,
      "orderId": 2,
      "status": "PENDING",
      "previousStatus": null,
      "estimatedReadyTime": "2026-04-27T07:00:00.000Z",
      "note": "Order received",
      "updatedBy": 1,
      "createdAt": "2026-04-27T06:00:00.000Z",
      "updatedAt": "2026-04-27T06:00:00.000Z"
    },
    {
      "id": 2,
      "orderId": 2,
      "status": "CONFIRMED",
      "previousStatus": "PENDING",
      "estimatedReadyTime": "2026-04-27T07:00:00.000Z",
      "note": "Order confirmed by staff",
      "updatedBy": 1,
      "createdAt": "2026-04-27T06:05:00.000Z",
      "updatedAt": "2026-04-27T06:05:00.000Z"
    },
    {
      "id": 3,
      "orderId": 2,
      "status": "PREPARING",
      "previousStatus": "CONFIRMED",
      "estimatedReadyTime": "2026-04-27T07:15:00.000Z",
      "note": "Kitchen started cooking",
      "updatedBy": 1,
      "createdAt": "2026-04-27T06:10:00.000Z",
      "updatedAt": "2026-04-27T06:10:00.000Z"
    }
  ]
}
```

---

### 4. Get Latest Tracking Status

**`GET /order-tracking/:orderId/latest`**

Returns only the most recent tracking entry for an order. **Admin/Staff/Customer.**

```
GET /order-tracking/2/latest
```

---

### 5. Get Order Tracking History

**`GET /order-tracking/:orderId/history`**

Returns all tracking entries for an order in chronological order. **Admin/Staff/Customer.**

```
GET /order-tracking/2/history
```

---

### 6. Get Orders by Status

**`GET /order-tracking?status=PREPARING`**

Returns all orders currently in the specified status. Useful for kitchen display systems. **Admin/Staff only.**

```
GET /order-tracking?status=PREPARING
GET /order-tracking?status=READY
GET /order-tracking?status=PENDING
```

---

## Typical Workflow

### For Staff/Admin

1. **When an order is created**, create an initial tracking entry:
   ```
   POST /order-tracking
   { "orderId": 2, "status": "PENDING", "updatedBy": 1 }
   ```

2. **When confirming the order**, update the status:
   ```
   PATCH /order-tracking/2/status
   { "status": "CONFIRMED" }
   ```

3. **When the kitchen starts cooking**, update the status:
   ```
   PATCH /order-tracking/2/status
   { "status": "PREPARING", "estimatedReadyTime": "2026-04-27T07:15:00Z" }
   ```

4. **When the food is ready**, update the status:
   ```
   PATCH /order-tracking/2/status
   { "status": "READY" }
   ```

5. **When the customer picks up**, update the status:
   ```
   PATCH /order-tracking/2/status
   { "status": "COMPLETED" }
   ```

### For Customers

Customers can track their order using:

```
GET /order-tracking/:orderId/timeline
```

This returns the full timeline with all status changes and estimated ready time.

---

## Database Schema

The `order_tracking` table stores all tracking entries:

| Column | Type | Description |
|---|---|---|
| `tracking_id` | serial (PK) | Auto-incrementing primary key |
| `order_id` | integer (FK) | References `orders.order_id` with CASCADE delete |
| `status` | enum | Current status in this tracking entry |
| `previous_status` | enum (nullable) | Previous status before this change |
| `estimated_ready_time` | timestamp (nullable) | Estimated time the order will be ready |
| `note` | text (nullable) | Optional note about the status change |
| `updated_by` | integer (FK) | References `users.id` — who made the change |
| `created_at` | timestamp | When this tracking entry was created |
| `updated_at` | timestamp | When this tracking entry was last updated |
