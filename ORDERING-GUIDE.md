# How to Order Items in the Canteen System

This guide explains how to place orders in the canteen backend system.

## Prerequisites

Before placing an order, you need:
1. A registered user account
2. Valid authentication token (JWT)
3. Knowledge of available menu items and their IDs

## Step-by-Step Ordering Process

### 1. Get Authentication Token
First, you need to authenticate to get a JWT token:

```bash
POST /auth/login
{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

### 2. View Available Menu Items
Check the available menu items to know what you can order:

```bash
GET /menu
```

### 3. Place Your Order
To place an order, make a POST request to the orders endpoint:

```bash
POST /orders
Authorization: Bearer YOUR_JWT_TOKEN

{
  "userId": 1,
  "orderItems": [
    {
      "menuItemId": 1,
      "quantity": 2
    },
    {
      "menuItemId": 3,
      "quantity": 1
    }
  ],
  "status": "PENDING"
}
```

### Request Body Parameters:
- `userId`: The ID of the user placing the order
- `orderItems`: An array of items to order, each containing:
  - `menuItemId`: The ID of the menu item
  - `quantity`: The quantity of that item
- `status`: (Optional) Initial status of the order (defaults to PENDING)

### Example Response:
```json
{
  "id": 1,
  "userId": 1,
  "orderDate": "2023-12-07T10:30:00.000Z",
  "totalAmount": 25.50,
  "status": "PENDING",
  "user": {
    // user details
  },
  "orderItemsList": [
    {
      "id": 1,
      "orderId": 1,
      "menuItemId": 1,
      "quantity": 2,
      "unitPrice": 10.00,
      "subTotal": 20.00,
      "menuItem": {
        // menu item details
      }
    }
  ]
}
```

## Order Status Flow

Orders follow this status flow:
1. `PENDING` - Order placed, waiting for confirmation
2. `CONFIRMED` - Order confirmed by staff
3. `PREPARING` - Order is being prepared
4. `READY` - Order is ready for pickup/delivery
5. `COMPLETED` - Order has been delivered/picked up
6. `CANCELLED` - Order was cancelled

## Checking Order Status

To check the status of your order:

```bash
GET /orders/1
Authorization: Bearer YOUR_JWT_TOKEN
```

## Important Notes

- The system automatically calculates the total amount based on item prices and quantities
- Each order item is stored separately with its unit price and subtotal
- Only authenticated users with 'customer' or 'admin' roles can place orders
- Menu items must be available to be ordered

## Troubleshooting Common Errors

### Bad Request Exception when placing an order

If you receive a "Bad Request Exception" error when trying to place an order, check the following:

1. **User exists**: Verify that the user with the specified `userId` exists in the database
2. **Menu items exist**: Verify that all menu items referenced in `orderItems` exist in the database
3. **Authentication**: Ensure you're sending a valid JWT token in the Authorization header
4. **Data format**: Make sure your request body follows the correct format with proper data types

Example of a valid request:
```json
{
  "userId": 1,
  "orderItems": [
    {
      "menuItemId": 1,
      "quantity": 2
    }
  ]
}
```

If you're still getting errors, the system will now provide more specific error messages indicating which user or menu item was not found.