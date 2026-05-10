#!/bin/bash

# This script converts a CSV file to a JSON file.

# Usage: csv_to_json.sh <csv_file> <json_file>

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <csv_file> <json_file>"
    exit 1
fi

# We use python3 here because parsing CSVs natively in bash is error-prone
# (especially with commas inside fields) and bash does not have native JSON support.
python3 -c '
import csv, json, sys

csv_file = sys.argv[1]
json_file = sys.argv[2]

try:
    with open(csv_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        data = list(reader)

    with open(json_file, "w", encoding="utf-8") as f:
        json.dump({"data": data}, f, indent=2)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
' "$1" "$2"

if [ $? -eq 0 ]; then
    echo "Successfully converted $1 to $2"
fi