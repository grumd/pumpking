#!/bin/bash

# abort if any command fails
set -e

echo "-- Install dependencies"
npm install
echo "-- Check Typescript errors"
npm run ts-check
echo "-- Run migrations"
npm run migrate:latest
echo "-- Build TS -> JS"
npm run build
echo "-- Restart server"
npm run pm2

echo "-- Server restarted successfully"