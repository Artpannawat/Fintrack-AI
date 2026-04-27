#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
# ในกรณีที่ต้องการ compile TS เป็น JS สามารถเปิดใช้งานบรรทัดล่างได้
# npx tsc
