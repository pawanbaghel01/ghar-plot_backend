# USP Employee API - CURL Commands Reference

Base URL: `http://localhost:4000` (Update as needed)

---

## 📋 CATEGORY ENDPOINTS

### 1. Create Category
```bash
curl -X POST http://localhost:4000/api/usp-categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Real Estate Experts",
    "description": "Specialized in property sales and rentals"
  }'
```

### 2. Get All Categories
```bash
curl -X GET http://localhost:4000/api/usp-categories
```

### 3. Get Single Category by ID
```bash
curl -X GET http://localhost:4000/api/usp-categories/673e5a1b2c3d4e5f6a7b8c9d
```

### 4. Update Category
```bash
curl -X PUT http://localhost:4000/api/usp-categories/673e5a1b2c3d4e5f6a7b8c9d \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Category Name",
    "description": "Updated description",
    "isActive": true
  }'
```

### 5. Delete Category
```bash
curl -X DELETE http://localhost:4000/api/usp-categories/673e5a1b2c3d4e5f6a7b8c9d
```

---

## 👥 USP EMPLOYEE ENDPOINTS

### 6. Add Employee by Employee ID (System Employee)
```bash
curl -X POST http://localhost:4000/api/usp-employees/add-by-id \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "673e5a1b2c3d4e5f6a7b8c9e",
    "categoryId": "673e5a1b2c3d4e5f6a7b8c9d",
    "expertise": "Commercial Real Estate",
    "experienceYears": 5,
    "description": "Expert in commercial property sales"
  }'
```

### 7. Add Employee Manually (Name, Phone, Category)
```bash
curl -X POST http://localhost:4000/api/usp-employees/add-manually \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "673e5a1b2c3d4e5f6a7b8c9d",
    "name": "John Doe",
    "phone": "+1234567890",
    "expertise": "Residential Properties",
    "experienceYears": 3,
    "description": "Specializes in luxury homes"
  }'
```

### 8. Get All USP Employees
```bash
curl -X GET http://localhost:4000/api/usp-employees
```

### 9. Get Categories with Employee Count
```bash
curl -X GET http://localhost:4000/api/usp-employees/categories-with-count
```

### 10. Get Employees by Category
```bash
curl -X GET http://localhost:4000/api/usp-employees/category/673e5a1b2c3d4e5f6a7b8c9d
```

### 11. Get Single USP Employee by ID
```bash
curl -X GET http://localhost:4000/api/usp-employees/673e5a1b2c3d4e5f6a7b8c9f
```

### 12. Update USP Employee
```bash
curl -X PUT http://localhost:4000/api/usp-employees/673e5a1b2c3d4e5f6a7b8c9f \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "673e5a1b2c3d4e5f6a7b8c9d",
    "expertise": "Updated expertise",
    "experienceYears": 7,
    "description": "Updated description",
    "manualName": "Updated Name",
    "manualPhone": "+9876543210",
    "isActive": true
  }'
```

### 13. Delete Employee from Category
```bash
curl -X DELETE http://localhost:4000/api/usp-employees/673e5a1b2c3d4e5f6a7b8c9f
```

---

## 🔄 COMPLETE WORKFLOW EXAMPLE

### Step 1: Create a Category
```bash
curl -X POST http://localhost:4000/api/usp-categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Property Consultants",
    "description": "Expert property consultation services"
  }'
```

**Response Example:**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "673e5a1b2c3d4e5f6a7b8c9d",
    "name": "Property Consultants",
    "description": "Expert property consultation services",
    "isActive": true,
    "createdAt": "2025-11-25T10:00:00.000Z",
    "updatedAt": "2025-11-25T10:00:00.000Z"
  }
}
```

### Step 2: Add Employee Manually to Category
```bash
curl -X POST http://localhost:4000/api/usp-employees/add-manually \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "673e5a1b2c3d4e5f6a7b8c9d",
    "name": "Alice Smith",
    "phone": "+1122334455",
    "expertise": "Investment Properties",
    "experienceYears": 4,
    "description": "Helps clients find profitable investments"
  }'
```

### Step 3: Add System Employee by ID
```bash
curl -X POST http://localhost:4000/api/usp-employees/add-by-id \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "673e5a1b2c3d4e5f6a7b8c9e",
    "categoryId": "673e5a1b2c3d4e5f6a7b8c9d",
    "expertise": "Luxury Real Estate",
    "experienceYears": 8,
    "description": "Specialist in high-end properties"
  }'
```

### Step 4: Get All Employees in Category
```bash
curl -X GET http://localhost:4000/api/usp-employees/category/673e5a1b2c3d4e5f6a7b8c9d
```

### Step 5: Get Categories with Employee Count
```bash
curl -X GET http://localhost:4000/api/usp-employees/categories-with-count
```

---

## 📊 TESTING MULTIPLE CATEGORIES

### Create Multiple Categories
```bash
# Category 1
curl -X POST http://localhost:4000/api/usp-categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Sales Experts", "description": "Top sales performers"}'

# Category 2
curl -X POST http://localhost:4000/api/usp-categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Marketing Specialists", "description": "Property marketing experts"}'

# Category 3
curl -X POST http://localhost:4000/api/usp-categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Legal Advisors", "description": "Real estate legal consultation"}'

# Category 4
curl -X POST http://localhost:4000/api/usp-categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Financial Consultants", "description": "Property financing experts"}'
```

---

## 🎯 PRACTICAL USE CASES

### Use Case 1: Add Multiple Employees to One Category
```bash
# First, create the category
CATEGORY_ID="673e5a1b2c3d4e5f6a7b8c9d"

# Add manual employee 1
curl -X POST http://localhost:4000/api/usp-employees/add-manually \
  -H "Content-Type: application/json" \
  -d "{
    \"categoryId\": \"$CATEGORY_ID\",
    \"name\": \"Bob Johnson\",
    \"phone\": \"+1234567891\",
    \"expertise\": \"Residential Sales\",
    \"experienceYears\": 5
  }"

# Add manual employee 2
curl -X POST http://localhost:4000/api/usp-employees/add-manually \
  -H "Content-Type: application/json" \
  -d "{
    \"categoryId\": \"$CATEGORY_ID\",
    \"name\": \"Carol White\",
    \"phone\": \"+1234567892\",
    \"expertise\": \"Commercial Leasing\",
    \"experienceYears\": 7
  }"

# Add system employee
curl -X POST http://localhost:4000/api/usp-employees/add-by-id \
  -H "Content-Type: application/json" \
  -d "{
    \"employeeId\": \"673e5a1b2c3d4e5f6a7b8c9e\",
    \"categoryId\": \"$CATEGORY_ID\",
    \"expertise\": \"Property Management\",
    \"experienceYears\": 6
  }"
```

### Use Case 2: Search and Filter
```bash
# Get all employees
curl -X GET http://localhost:4000/api/usp-employees

# Get employees in specific category
curl -X GET http://localhost:4000/api/usp-employees/category/673e5a1b2c3d4e5f6a7b8c9d

# Get category statistics
curl -X GET http://localhost:4000/api/usp-employees/categories-with-count
```

### Use Case 3: Update Employee Information
```bash
curl -X PUT http://localhost:4000/api/usp-employees/673e5a1b2c3d4e5f6a7b8c9f \
  -H "Content-Type: application/json" \
  -d '{
    "expertise": "Senior Property Consultant",
    "experienceYears": 10,
    "description": "Promoted to senior consultant with expanded portfolio"
  }'
```

---

## 🔍 RESPONSE EXAMPLES

### Successful Category Creation
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "673e5a1b2c3d4e5f6a7b8c9d",
    "name": "Real Estate Experts",
    "description": "Specialized in property sales and rentals",
    "isActive": true,
    "createdAt": "2025-11-25T10:00:00.000Z",
    "updatedAt": "2025-11-25T10:00:00.000Z"
  }
}
```

### Successful Employee Addition (Manual)
```json
{
  "success": true,
  "message": "Employee added manually to category successfully",
  "data": {
    "_id": "673e5a1b2c3d4e5f6a7b8c9f",
    "category": {
      "_id": "673e5a1b2c3d4e5f6a7b8c9d",
      "name": "Real Estate Experts",
      "description": "Specialized in property sales and rentals"
    },
    "manualName": "John Doe",
    "manualPhone": "+1234567890",
    "employeeType": "manual",
    "expertise": "Residential Properties",
    "experienceYears": 3,
    "description": "Specializes in luxury homes",
    "isActive": true,
    "createdAt": "2025-11-25T10:05:00.000Z",
    "updatedAt": "2025-11-25T10:05:00.000Z"
  }
}
```

### Get Employees by Category Response
```json
{
  "success": true,
  "count": 2,
  "category": "Real Estate Experts",
  "data": [
    {
      "_id": "673e5a1b2c3d4e5f6a7b8c9f",
      "category": {
        "_id": "673e5a1b2c3d4e5f6a7b8c9d",
        "name": "Real Estate Experts"
      },
      "manualName": "John Doe",
      "manualPhone": "+1234567890",
      "employeeType": "manual",
      "expertise": "Residential Properties",
      "experienceYears": 3
    },
    {
      "_id": "673e5a1b2c3d4e5f6a7b8ca0",
      "category": {
        "_id": "673e5a1b2c3d4e5f6a7b8c9d",
        "name": "Real Estate Experts"
      },
      "employee": {
        "_id": "673e5a1b2c3d4e5f6a7b8c9e",
        "name": "Alice Smith",
        "email": "alice@example.com",
        "phone": "+1122334455"
      },
      "employeeType": "system",
      "expertise": "Commercial Real Estate",
      "experienceYears": 5
    }
  ]
}
```

---

## 📝 NOTES

- Replace placeholder IDs (e.g., `673e5a1b2c3d4e5f6a7b8c9d`) with actual IDs from your responses
- For production, update the base URL to your actual server address
- All endpoints return JSON responses
- Use `-v` flag with curl for verbose output: `curl -v -X GET ...`
- Add pretty print: `curl -X GET ... | jq .` (requires jq installed)
