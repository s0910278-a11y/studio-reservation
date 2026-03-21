@echo off
echo =========================================
echo ハードオフ八王子大和田店 楽器スタジオ
echo サーバー強制再起動 バッチ
echo =========================================
echo.
echo 既存のNodeプロセスを終了しています...
taskkill /F /IM node.exe
echo.
echo ポート3001でサーバーを再起動します...
call npm run dev
pause
