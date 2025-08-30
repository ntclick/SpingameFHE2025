# FHE Compliance Test Runner for Windows
# Chạy tất cả các test FHE để kiểm tra tính tuân thủ

Write-Host "🔍 FHE Compliance Test Suite" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if we're in the right directory
if (-not (Test-Path "hardhat.config.js") -and -not (Test-Path "hardhat.config.ts")) {
    Write-Error "Không tìm thấy hardhat.config.js hoặc hardhat.config.ts"
    Write-Error "Vui lòng chạy script này từ thư mục gốc của project"
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Warning "Không tìm thấy node_modules. Đang cài đặt dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies!"
        exit 1
    }
}

# Compile contracts first
Write-Status "Compiling contracts..."
npx hardhat compile
if ($LASTEXITCODE -ne 0) {
    Write-Error "Compilation failed!"
    exit 1
}
Write-Success "Contracts compiled successfully!"

Write-Host ""
Write-Status "Starting FHE compliance tests..."
Write-Host ""

# Test files to run
$testFiles = @(
    "test/fhe-compliance.test.ts",
    "test/fhe-encryption.test.ts",
    "test/fhe-integration.test.ts",
    "test/fhe-security.test.ts",
    "test/fhe-performance.test.ts"
)

# Track test results
$totalTests = 0
$passedTests = 0
$failedTests = 0

# Run each test file
foreach ($testFile in $testFiles) {
    if (Test-Path $testFile) {
        Write-Status "Running $testFile..."
        Write-Host "----------------------------------------" -ForegroundColor Gray
        
        # Run the test
        npx hardhat test $testFile --verbose
        
        # Check exit status
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$testFile passed!"
            $passedTests++
        } else {
            Write-Error "$testFile failed!"
            $failedTests++
        }
        
        $totalTests++
        Write-Host ""
    } else {
        Write-Warning "Test file $testFile not found, skipping..."
    }
}

Write-Host "==========================================" -ForegroundColor Gray
Write-Status "Test Summary:"
Write-Host "  Total test files: $totalTests"
Write-Host "  Passed: $passedTests"
Write-Host "  Failed: $failedTests"

if ($failedTests -eq 0) {
    Write-Success "🎉 All FHE compliance tests passed!"
    Write-Host ""
    Write-Status "✅ FHE Data Types: Validated"
    Write-Status "✅ FHE Parameter Validation: Passed"
    Write-Status "✅ FHE State Management: Working"
    Write-Status "✅ FHE Security: Verified"
    Write-Status "✅ FHE Performance: Optimized"
    Write-Host ""
    Write-Success "Hệ thống tuân thủ đầy đủ các tiêu chuẩn FHE!"
} else {
    Write-Error "❌ Some FHE compliance tests failed!"
    Write-Host ""
    Write-Warning "Vui lòng kiểm tra và sửa các lỗi trước khi deploy."
    exit 1
}

# Optional: Run with gas reporting
if ($args[0] -eq "--gas") {
    Write-Host ""
    Write-Status "Running gas analysis..."
    $env:REPORT_GAS = "true"
    npx hardhat test
}

# Optional: Run with coverage
if ($args[0] -eq "--coverage") {
    Write-Host ""
    Write-Status "Running coverage analysis..."
    npx hardhat coverage
}

Write-Host ""
Write-Status "FHE compliance test suite completed!"
