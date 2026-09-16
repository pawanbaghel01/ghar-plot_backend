#!/bin/bash
# USP Employee API - CURL Commands
# Base URL - Update this to your server URL
BASE_URL="http://localhost:4000"

echo "=========================================="
echo "USP CATEGORY API ENDPOINTS"
echo "=========================================="

echo -e "\n1. CREATE CATEGORY"
echo "POST /api/usp-categories"
curl -X POST ${BASE_URL}/api/usp-categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Real Estate Experts",
    "description": "Specialized in property sales and rentals"
  }'

echo -e "\n\n2. GET ALL CATEGORIES"
echo "GET /api/usp-categories"
curl -X GET ${BASE_URL}/api/usp-categories

echo -e "\n\n3. GET SINGLE CATEGORY BY ID"
echo "GET /api/usp-categories/:id"
curl -X GET ${BASE_URL}/api/usp-categories/CATEGORY_ID_HERE

echo -e "\n\n4. UPDATE CATEGORY"
echo "PUT /api/usp-categories/:id"
curl -X PUT ${BASE_URL}/api/usp-categories/CATEGORY_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Category Name",
    "description": "Updated description",
    "isActive": true
  }'

echo -e "\n\n5. DELETE CATEGORY"
echo "DELETE /api/usp-categories/:id"
curl -X DELETE ${BASE_URL}/api/usp-categories/CATEGORY_ID_HERE

echo -e "\n\n=========================================="
echo "USP EMPLOYEE API ENDPOINTS"
echo "=========================================="

echo -e "\n6. ADD EMPLOYEE BY EMPLOYEE ID"
echo "POST /api/usp-employees/add-by-id"
curl -X POST ${BASE_URL}/api/usp-employees/add-by-id \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMPLOYEE_ID_HERE",
    "categoryId": "CATEGORY_ID_HERE",
    "expertise": "Commercial Real Estate",
    "experienceYears": 5,
    "description": "Expert in commercial property sales"
  }'

echo -e "\n\n7. ADD EMPLOYEE MANUALLY (NAME, PHONE, CATEGORY)"
echo "POST /api/usp-employees/add-manually"
curl -X POST ${BASE_URL}/api/usp-employees/add-manually \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "CATEGORY_ID_HERE",
    "name": "John Doe",
    "phone": "+1234567890",
    "expertise": "Residential Properties",
    "experienceYears": 3,
    "description": "Specializes in luxury homes"
  }'

echo -e "\n\n8. GET ALL USP EMPLOYEES"
echo "GET /api/usp-employees"
curl -X GET ${BASE_URL}/api/usp-employees

echo -e "\n\n9. GET CATEGORIES WITH EMPLOYEE COUNT"
echo "GET /api/usp-employees/categories-with-count"
curl -X GET ${BASE_URL}/api/usp-employees/categories-with-count

echo -e "\n\n10. GET EMPLOYEES BY CATEGORY"
echo "GET /api/usp-employees/category/:categoryId"
curl -X GET ${BASE_URL}/api/usp-employees/category/CATEGORY_ID_HERE

echo -e "\n\n11. GET SINGLE USP EMPLOYEE BY ID"
echo "GET /api/usp-employees/:id"
curl -X GET ${BASE_URL}/api/usp-employees/USP_EMPLOYEE_ID_HERE

echo -e "\n\n12. UPDATE USP EMPLOYEE"
echo "PUT /api/usp-employees/:id"
curl -X PUT ${BASE_URL}/api/usp-employees/USP_EMPLOYEE_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "NEW_CATEGORY_ID_HERE",
    "expertise": "Updated expertise",
    "experienceYears": 7,
    "description": "Updated description",
    "manualName": "Updated Name",
    "manualPhone": "+9876543210",
    "isActive": true
  }'

echo -e "\n\n13. DELETE EMPLOYEE FROM CATEGORY"
echo "DELETE /api/usp-employees/:id"
curl -X DELETE ${BASE_URL}/api/usp-employees/USP_EMPLOYEE_ID_HERE

echo -e "\n\n=========================================="
echo "COMPLETE WORKFLOW EXAMPLE"
echo "=========================================="

echo -e "\nStep 1: Create a Category"
CATEGORY_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/usp-categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Property Consultants",
    "description": "Expert property consultation services"
  }')
echo $CATEGORY_RESPONSE

echo -e "\n\nStep 2: Add Employee Manually to Category"
curl -X POST ${BASE_URL}/api/usp-employees/add-manually \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "GET_ID_FROM_STEP_1",
    "name": "Alice Smith",
    "phone": "+1122334455",
    "expertise": "Investment Properties",
    "experienceYears": 4,
    "description": "Helps clients find profitable investments"
  }'

echo -e "\n\nStep 3: Get All Employees in Category"
curl -X GET ${BASE_URL}/api/usp-employees/category/GET_ID_FROM_STEP_1

echo -e "\n\n=========================================="
echo "ADDITIONAL EXAMPLES"
echo "=========================================="

echo -e "\n\nCreate Multiple Categories:"
curl -X POST ${BASE_URL}/api/usp-categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Sales Experts", "description": "Top sales performers"}'

curl -X POST ${BASE_URL}/api/usp-categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Marketing Specialists", "description": "Property marketing experts"}'

curl -X POST ${BASE_URL}/api/usp-categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Legal Advisors", "description": "Real estate legal consultation"}'

echo -e "\n\nDone! Replace placeholders (CATEGORY_ID_HERE, EMPLOYEE_ID_HERE, etc.) with actual IDs from responses."
