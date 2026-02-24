@echo off
echo Killing ports 3000, 3001, 8080...
for %%p in (3000 3001 8080) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p ^| findstr LISTENING') do (
        echo Killing PID %%a on port %%p
        taskkill /F /PID %%a 2>nul
    )
)
echo Done.
