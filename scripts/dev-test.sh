#!/bin/bash

# Check if a test image exists
if [ ! -f ./test.jpg ]; then
  echo "Error: test.jpg not found in the project root."
  echo "Please create a test.jpg file to run this script."
  exit 1
fi

API_URL="http://localhost:3000/api/remove-bg"
OUTPUT_FILE="out.png"
TEMP_OUTPUT_FILE=$(mktemp) # Store initial output to check headers

echo "Testing API endpoint: $API_URL"
echo "Input file: ./test.jpg"
echo "Output file: $OUTPUT_FILE"

# Perform the curl request
# -s: silent mode
# -X POST: specify POST request
# -F "file=@./test.jpg": send multipart/form-data with the file
# --write-out "%{http_code}": print the HTTP status code
# -o "$TEMP_OUTPUT_FILE": save the response body to a temporary file
HTTP_STATUS=$(curl -s -X POST \
  -F "file=@./test.jpg" \
  --write-out "%{http_code}" \
  -o "$TEMP_OUTPUT_FILE" \
  "$API_URL")

echo "HTTP Status Code: $HTTP_STATUS"

# Check if the HTTP status is 200
if [ "$HTTP_STATUS" -eq 200 ]; then
  # Check if the output is a PNG file and has a size greater than 0
  if file "$TEMP_OUTPUT_FILE" | grep -q 'PNG image data'; then
    if [ -s "$TEMP_OUTPUT_FILE" ]; then
      mv "$TEMP_OUTPUT_FILE" "$OUTPUT_FILE"
      echo "API Test successful. Output saved to $OUTPUT_FILE"
      # macOS compatible way to get file size
      if [[ "$(uname)" == "Darwin" ]]; then
        echo "Filesize: $(stat -f%z "$OUTPUT_FILE") bytes"
      else
        echo "Filesize: $(stat -c%s "$OUTPUT_FILE") bytes"
      fi
      exit 0
    else
      echo "API Test failed: Output file is empty."
      rm "$TEMP_OUTPUT_FILE"
      exit 1
    fi
  else
    echo "API Test failed: Output is not a PNG image."
    echo "Response content (first 5 lines):"
    head -n 5 "$TEMP_OUTPUT_FILE"
    rm "$TEMP_OUTPUT_FILE"
    exit 1
  fi
else
  echo "API Test failed with HTTP status $HTTP_STATUS."
  echo "Response content (if any):"
  cat "$TEMP_OUTPUT_FILE"
  rm "$TEMP_OUTPUT_FILE"
  exit 1
fi 