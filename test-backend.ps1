Write-Host "🧪 Testing Railway Backend..." -ForegroundColor Green

try {
    # Test 1: Health endpoint
    Write-Host "`n1. Testing health endpoint..." -ForegroundColor Yellow
    $healthResponse = Invoke-WebRequest -Uri "https://backend-production-8c02.up.railway.app/health" -UseBasicParsing
    Write-Host "✅ Health check: $($healthResponse.Content)" -ForegroundColor Green
    
    # Test 2: Login
    Write-Host "`n2. Testing login..." -ForegroundColor Yellow
    $loginBody = @{
        email = "test@example.com"
        password = "Password123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri "https://backend-production-8c02.up.railway.app/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
    Write-Host "✅ Login successful: $($loginResponse.Content)" -ForegroundColor Green
    
    # Parse token from response
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    
    # Test 3: Get campaigns with token
    Write-Host "`n3. Testing campaigns endpoint..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $campaignsResponse = Invoke-WebRequest -Uri "https://backend-production-8c02.up.railway.app/api/campaigns" -Headers $headers -UseBasicParsing
    Write-Host "✅ Campaigns response: $($campaignsResponse.Content)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
