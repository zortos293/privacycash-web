@echo off
echo Stopping dev server if running...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Regenerating Prisma client...
bun run db:generate

echo Done! You can now restart the dev server with: bun run dev
pause
