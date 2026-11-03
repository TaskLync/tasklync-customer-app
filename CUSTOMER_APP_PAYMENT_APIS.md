# TaskLync Customer App — Payment API Reference

> **Service:** `payment-service`  
> **Audience:** Frontend / Mobile Engineers (Customer App)  
> **Base URL:** `/api/v1` (Default Port: `3017` or via API Gateway api.tasklync.pk)  
> **Auth:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`  
> **Active Mode:** **Cash on Delivery (COD)** (Online gateways safely disconnected)

---

## 1. Quick Reference: Customer Endpoints

| Method | Endpoint | Description | Status |
|:---|:---|:---|:---|
| `POST` | `/api/v1/payments/initiate` | Initiate booking checkout (defaults to COD) | `201 Created` |
| `GET` | `/api/v1/payments/:id` | Fetch payment record by Payment UUID | `200 OK` |
| `GET` | `/api/v1/payments/booking/:bookingId` | Fetch payment record by Booking UUID | `200 OK` |
| `GET` | `/api/v1/payments/history` | Paginated customer transaction history | `200 OK` |
| `GET` | `/api/v1/payment-methods` | List customer's saved payment methods | `200 OK` |
| `POST` | `/api/v1/payment-methods` | Save a new payment method | `201 Created` |
| `PATCH` | `/api/v1/payment-methods/:id/default` | Mark a saved method as default | `200 OK` |
| `DELETE` | `/api/v1/payment-methods/:id` | Remove a saved payment method | `200 OK` |

---

## 2. Authentication & Headers

Every request from the customer app must include:
```http
Authorization: Bearer <CUSTOMER_JWT_ACCESS_TOKEN>
Content-Type: application/json
Accept: application/json
```

### Response Envelope Standard

#### Success (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "data": { ... }
}
```

#### Error (`4xx` / `5xx`)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable description",
    "details": []
  }
}
```

---

## 3. Endpoints & Parameter Specification

### 3.1. Initiate Checkout / Payment
Creates or finalizes the payment order for an accepted booking.

- **Route:** `POST /api/v1/payments/initiate`
- **Auth:** Required (`role: user`)

#### Body Parameters

| Field | Type | Required | Default | Description |
|:---|:---|:---|:---|:---|
| `booking_id` | `UUID string` | **Yes** | — | UUID of the accepted booking. |
| `method` | `string (Enum)` | No | `CASH_ON_DELIVERY` | Supported: `CASH_ON_DELIVERY`, `JAZZCASH_WALLET`, `EASYPAISA_WALLET`, `JAZZCASH_CARD`, `RAAST`, `IBFT`. Currently defaults to `CASH_ON_DELIVERY`. |
| `amount` | `number` | No | Server Stub | Booking total in PKR. The backend validates and enforces the authoritative booking cost. |
| `worker_id` | `UUID string` | No | Server Stub | Worker UUID assigned to the booking. |
| `phone_number` | `string` | Conditional | `null` | Required for wallet methods (`+923001234567`). |
| `saved_method_id` | `UUID string` | No | `null` | UUID of a saved payment method. |

#### Example Request (COD Mode - Default)
```json
{
  "booking_id": "8c422da8-0f0c-4395-8889-cb4a6cba552e",
  "method": "CASH_ON_DELIVERY"
}
```

#### Example Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "payment_id": "e5b8d234-9271-46bb-9cb8-d5690b21a364",
    "booking_id": "8c422da8-0f0c-4395-8889-cb4a6cba552e",
    "amount": 2500.00,
    "currency": "PKR",
    "method": "CASH_ON_DELIVERY",
    "status": "PENDING",
    "gateway_order_id": null,
    "instructions": {
      "type": "cod",
      "message": "Pay cash directly to the worker upon service completion. The worker will confirm receipt in-app.",
      "expires_at": "2026-10-06T10:30:00.000Z"
    }
  }
}
```

---

### 3.2. Get Payment by Payment ID
Retrieves the payment status, fee breakdown, and receipts.

- **Route:** `GET /api/v1/payments/:id`
- **Auth:** Required (`role: user` or `admin`)
- **Path Params:**
  - `id` (`string`, required): Payment UUID.

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "e5b8d234-9271-46bb-9cb8-d5690b21a364",
    "booking_id": "8c422da8-0f0c-4395-8889-cb4a6cba552e",
    "user_id": "f29104fa-5bb3-4712-ba92-d6174a7eb842",
    "worker_id": "1b089c89-2cc8-4a64-b6c8-0deaa5a05b31",
    "booking_amount": 2500.00,
    "platform_fee": 119.05,
    "worker_amount": 2261.90,
    "currency": "PKR",
    "method": "CASH_ON_DELIVERY",
    "status": "RELEASED",
    "cod_confirmed_at": "2026-10-06T09:45:00.000Z",
    "cod_confirmed_by": "1b089c89-2cc8-4a64-b6c8-0deaa5a05b31",
    "paid_at": "2026-10-06T09:45:00.000Z",
    "created_at": "2026-10-06T09:00:00.000Z"
  }
}
```

---

### 3.3. Get Payment by Booking ID
Allows the mobile client to retrieve payment status directly from the booking context.

- **Route:** `GET /api/v1/payments/booking/:bookingId`
- **Auth:** Required (`role: user` or `admin`)
- **Path Params:**
  - `bookingId` (`string`, required): Booking UUID.

---

### 3.4. Customer Payment History
Paginated history of all payments made by the authenticated customer.

- **Route:** `GET /api/v1/payments/history`
- **Auth:** Required (`role: user`)
- **Query Params:**

| Parameter | Type | Required | Default | Description |
|:---|:---|:---|:---|:---|
| `page` | `integer` | No | `1` | Page number. |
| `limit` | `integer` | No | `20` | Results per page (max: 100). |
| `status` | `string` | No | — | Filter by status (`PENDING`, `HELD`, `RELEASED`, `REFUNDED`). |

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "e5b8d234-9271-46bb-9cb8-d5690b21a364",
        "booking_id": "8c422da8-0f0c-4395-8889-cb4a6cba552e",
        "booking_amount": 2500.00,
        "method": "CASH_ON_DELIVERY",
        "status": "RELEASED",
        "paid_at": "2026-10-06T09:45:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 3.5. Saved Payment Methods

#### List Saved Methods
- **Route:** `GET /api/v1/payment-methods`
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "4a71b123-8822-491a-986b-3129487c6152",
        "type": "JAZZCASH_WALLET",
        "display_name": "My JazzCash Account",
        "masked_number": "0300****567",
        "is_default": true,
        "is_active": true
      }
    ]
  }
  ```

#### Save a Payment Method
- **Route:** `POST /api/v1/payment-methods`
- **Body Parameters:**
  - `type` (`string`, required): `JAZZCASH_WALLET`, `EASYPAISA_WALLET`, `BANK_CARD`, `RAAST`.
  - `display_name` (`string`, required): Custom label (e.g., "Personal Wallet").
  - `masked_number` (`string`, optional): e.g. `0300****567`.
  - `is_default` (`boolean`, optional): Set to `true` to make this method default.

#### Set as Default
- **Route:** `PATCH /api/v1/payment-methods/:id/default`
- **Path Params:** `id` (Payment Method UUID)

#### Delete Saved Method
- **Route:** `DELETE /api/v1/payment-methods/:id`
- **Path Params:** `id` (Payment Method UUID)

---

## 4. Payment Lifecycle for Customer App UI

```
Customer Checkout ──► Status: PENDING ──► Instructions: "Pay Cash upon Completion"
                             │
                  Service Delivered & Cash Handed Over
                             │
Worker confirms cash ─► Status: HELD ──► UI: "Cash Receipt Confirmed"
                             │
Booking Completed ────► Status: RELEASED ──► UI: "Order Completed & Settled"
```

---

## 5. Frontend Error Code Mapping

| Error Code | HTTP Status | User-Friendly UI Notification |
|:---|:---|:---|
| `ONLINE_PAYMENTS_DISABLED` | `422` | "Online payments are temporarily unavailable. Please proceed with Cash on Delivery." |
| `COD_DEBT_LIMIT_EXCEEDED` | `422` | "The selected worker cannot take cash bookings right now. Please choose another worker." |
| `PAYMENT_ALREADY_EXISTS` | `409` | "Payment is already processed for this booking." |
| `UNAUTHORIZED` | `401` | "Please log in to proceed with checkout." |
| `FORBIDDEN` | `403` | "You do not have permission to view this payment." |
| `VALIDATION_ERROR` | `400` | "Please check your input details and try again." |
