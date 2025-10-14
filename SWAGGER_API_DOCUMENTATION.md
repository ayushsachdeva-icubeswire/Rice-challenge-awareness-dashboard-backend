# Diet Plans API - Swagger Documentation

## Overview
This document provides information about the Swagger API documentation for the Diet Plans endpoints in the Rice Challenge Awareness Dashboard API.

## Accessing Swagger UI
Once the server is running, you can access the interactive Swagger documentation at:
```
http://localhost:8080/doc
```

## Diet Plans API Endpoints

### Authentication
All endpoints require a valid JWT token. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Available Endpoints

#### 1. Create Diet Plan (POST /api/dietplans)
- **Access**: Admin/Moderator only
- **Content-Type**: multipart/form-data
- **Required Fields**: name, duration, type, category, file (PDF)
- **Optional Fields**: subcategory, description, isActive

#### 2. Get All Diet Plans (GET /api/dietplans)
- **Access**: Authenticated users
- **Query Parameters**: 
  - `page` (default: 1)
  - `limit` (default: 10)
  - `type` (filter by diet plan type)
  - `category` (filter by category)
  - `subcategory` (filter by subcategory)
  - `isActive` (filter by active status)

#### 3. Get Diet Plan by ID (GET /api/dietplans/{id})
- **Access**: Authenticated users
- **Parameters**: Diet plan ID in URL path

#### 4. Update Diet Plan (PUT /api/dietplans/{id})
- **Access**: Admin/Moderator only
- **Content-Type**: multipart/form-data
- **Parameters**: Diet plan ID in URL path
- **Fields**: All fields are optional for updates

#### 5. Delete Diet Plan (DELETE /api/dietplans/{id})
- **Access**: Admin only
- **Parameters**: Diet plan ID in URL path

#### 6. Delete All Diet Plans (DELETE /api/dietplans)
- **Access**: Admin only
- **⚠️ Warning**: This deletes ALL diet plans - use with extreme caution!

#### 7. Download PDF (GET /api/dietplans/{id}/download)
- **Access**: Authenticated users
- **Parameters**: Diet plan ID in URL path
- **Response**: PDF file download

## Schema Information

### DietPlan Model
```json
{
  "_id": "string",
  "name": "string (required)",
  "duration": "string (required)",
  "type": "string (required)",
  "category": "string (required)",
  "subcategory": "string (optional)",
  "description": "string (optional)",
  "pdfFile": {
    "filename": "string",
    "originalName": "string",
    "path": "string",
    "size": "number",
    "uploadDate": "date-time"
  },
  "isActive": "boolean (default: true)",
  "createdBy": "string (User ID)",
  "createdAt": "date-time",
  "updatedAt": "date-time"
}
```

### Common Response Formats

#### Success Response (Single Item)
```json
{
  "message": "string",
  "data": { /* DietPlan object */ }
}
```

#### Success Response (List)
```json
{
  "data": [ /* Array of DietPlan objects */ ],
  "currentPage": "number",
  "totalPages": "number",
  "totalItems": "number"
}
```

#### Error Response
```json
{
  "message": "string"
}
```

## Testing with Swagger UI

1. **Authentication**: First, obtain a JWT token by logging in through the auth endpoints
2. **Authorize**: Click the "Authorize" button in Swagger UI and enter your token
3. **Try Endpoints**: Use the "Try it out" feature to test each endpoint
4. **File Upload**: For create/update operations, use the file upload field for PDF files

## Response Codes

- **200**: Success
- **201**: Created successfully
- **400**: Bad request (missing required fields, invalid data)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not found
- **500**: Internal server error

## File Upload Requirements

- **Format**: PDF files only
- **Field Name**: `file`
- **Required**: Yes for create operations, optional for updates
- **Storage**: Files are stored in `uploads/dietplans/` directory

## Permission Levels

- **User**: Can view diet plans and download PDFs
- **Moderator**: Can create, update, and view diet plans
- **Admin**: Full access including delete operations

## Notes

- All timestamps are in ISO 8601 format
- File sizes are in bytes
- Pagination starts from page 1
- Deleted diet plans also remove associated PDF files from storage
- The API supports filtering and sorting for the list endpoint