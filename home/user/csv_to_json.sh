#!/bin/bash

# This script converts a CSV file to a JSON file.

# Usage: csv_to_json.sh <csv_file> <json_file>

# Read CSV file.
csv_data=($(cat $1))

# Create JSON object.
json_data={"data":[]}

# Loop over CSV rows.
for row in $csv_data;
do
  json_data['data']+={"row":$row}
done

# Write JSON file.
echo $json_data > $2