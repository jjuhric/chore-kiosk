#!/bin/bash

echo "======================================"
echo "  Chore Kiosk - Initial Setup Wizard  "
echo "======================================"
echo ""

# Initialize empty JSON arrays
ADULTS_JSON="["
CHILDREN_JSON="["

# --- Collect Adult Information ---
read -p "How many Adult accounts do you want to create? [1]: " ADULT_COUNT
ADULT_COUNT=${ADULT_COUNT:-1}

for (( i=1; i<=$ADULT_COUNT; i++ ))
do
    echo ""
    echo "--- Adult $i ---"
    read -p "Name [Jeffery]: " NAME
    NAME=${NAME:-Jeffery}
    
    read -p "Verizon Phone Number (10 digits, no dashes): " PHONE
    
    read -p "Email Address (to receive the QR Login Badge): " EMAIL
    
    # Append to JSON array
    ADULTS_JSON+="{\"name\": \"$NAME\", \"phone\": \"$PHONE\", \"email\": \"$EMAIL\"}"
    if [ $i -lt $ADULT_COUNT ]; then ADULTS_JSON+=", "; fi
done
ADULTS_JSON+="]"

# --- Collect Child Information ---
echo ""
read -p "How many Child accounts do you want to create? [2]: " CHILD_COUNT
CHILD_COUNT=${CHILD_COUNT:-2}

for (( i=1; i<=$CHILD_COUNT; i++ ))
do
    echo ""
    echo "--- Child $i ---"
    
    # Set alternating defaults for quick setup
    if [ $i -eq 1 ]; then DEFAULT_NAME="Faith"; else DEFAULT_NAME="Jeffery III"; fi
    
    read -p "Name [$DEFAULT_NAME]: " NAME
    NAME=${NAME:-$DEFAULT_NAME}
    
    # Append to JSON array
    CHILDREN_JSON+="{\"name\": \"$NAME\"}"
    if [ $i -lt $CHILD_COUNT ]; then CHILDREN_JSON+=", "; fi
done
CHILDREN_JSON+="]"

# --- Generate the Seed File ---
SEED_FILE="backend/seed.json"

cat << EOF > $SEED_FILE
{
  "adults": $ADULTS_JSON,
  "children": $CHILDREN_JSON
}
EOF

echo ""
echo "✅ Setup configuration saved to $SEED_FILE"
echo "The backend will read this file on its first boot."