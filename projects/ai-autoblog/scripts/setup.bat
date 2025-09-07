@echo off
echo 🚀 Setting up Fiddy AutoPublisher...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Install root dependencies
echo 📦 Installing root dependencies...
call npm install

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Create environment files
echo ⚙️  Setting up environment files...

REM Backend environment
if not exist backend\.env (
    echo 📝 Creating backend\.env file...
    copy backend\env.example backend\.env
    echo ⚠️  Please update backend\.env with your actual values
)

REM Frontend environment
if not exist frontend\.env (
    echo 📝 Creating frontend\.env file...
    echo REACT_APP_API_URL=http://localhost:5000/api > frontend\.env
)

REM Create logs directory
echo 📁 Creating logs directory...
if not exist backend\logs mkdir backend\logs

REM Create AWS Lambda deployment package
echo 📦 Creating AWS Lambda deployment package...
cd aws-lambda
call npm install
cd ..

echo.
echo 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Update backend\.env with your database and API keys
echo 2. Set up your PostgreSQL database on Railway
echo 3. Run database migrations: cd backend ^&^& npm run migrate
echo 4. Start development: npm run dev
echo.
echo For production deployment, see docs\DEPLOYMENT.md
echo.
echo Happy coding! 🚀
pause

