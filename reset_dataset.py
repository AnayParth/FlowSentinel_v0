from pathlib import Path
import csv

DATASET_PATH = Path("data/real_sensor_dataset.csv")

if not DATASET_PATH.exists():
    print(f"Dataset file not found: {DATASET_PATH.resolve()}")
    raise SystemExit(1)

# Read and preserve the existing column names
with DATASET_PATH.open("r", newline="", encoding="utf-8-sig") as file:
    reader = csv.reader(file)
    header = next(reader, None)

if not header:
    print("Dataset has no header. Reset cancelled to avoid creating an invalid dataset.")
    raise SystemExit(1)

# Rewrite the CSV with only the header
with DATASET_PATH.open("w", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)
    writer.writerow(header)

print("SUCCESS!")
print("Training dataset has been reset.")
print(f"File: {DATASET_PATH.resolve()}")
print(f"Columns preserved: {', '.join(header)}")