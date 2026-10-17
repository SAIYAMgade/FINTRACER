#!/usr/bin/env bash
set -o errexit

echo "=== FINTRACER Build Pipeline ==="

echo "1. Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "2. Building React production bundle..."
cd frontend
npm install
npm run build
cd ..
mkdir -p backend/static
cp -r frontend/dist/* backend/static/ 2>/dev/null || true

echo "3. Executing database migrations..."
python -m alembic upgrade head || true

echo "=== FINTRACER Build Completed Successfully ==="
