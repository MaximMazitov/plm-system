#!/bin/bash

# Login as constructor
echo "Logging in as constructor..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"constructor@kari.com","password":"password"}' | jq -r '.token')

echo "Token: $TOKEN"

# Get permissions
echo -e "\nGetting permissions..."
curl -s http://localhost:3000/api/users/me/permissions \
  -H "Authorization: Bearer $TOKEN" | jq

