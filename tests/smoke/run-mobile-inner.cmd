@echo off
setlocal
pushd "%~dp0" || exit /b 1
if /i "%~1"=="headed" (
  call npm run test:mobile:inner:headed
) else (
  call npm run test:mobile:inner
)
set "rc=%errorlevel%"
popd
exit /b %rc%
