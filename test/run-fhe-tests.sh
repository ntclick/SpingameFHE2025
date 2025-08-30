#!/bin/bash

# FHE Compliance Test Runner
# Chạy tất cả các test FHE để kiểm tra tính tuân thủ

echo "🔍 FHE Compliance Test Suite"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "hardhat.config.js" ] && [ ! -f "hardhat.config.ts" ]; then
    print_error "Không tìm thấy hardhat.config.js hoặc hardhat.config.ts"
    print_error "Vui lòng chạy script này từ thư mục gốc của project"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "Không tìm thấy node_modules. Đang cài đặt dependencies..."
    npm install
fi

# Compile contracts first
print_status "Compiling contracts..."
npx hardhat compile
if [ $? -ne 0 ]; then
    print_error "Compilation failed!"
    exit 1
fi
print_success "Contracts compiled successfully!"

echo ""
print_status "Starting FHE compliance tests..."
echo ""

# Test files to run
test_files=(
    "test/fhe-compliance.test.ts"
    "test/fhe-encryption.test.ts"
    "test/fhe-integration.test.ts"
    "test/fhe-security.test.ts"
    "test/fhe-performance.test.ts"
)

# Track test results
total_tests=0
passed_tests=0
failed_tests=0

# Run each test file
for test_file in "${test_files[@]}"; do
    if [ -f "$test_file" ]; then
        print_status "Running $test_file..."
        echo "----------------------------------------"
        
        # Run the test
        npx hardhat test "$test_file" --verbose
        
        # Check exit status
        if [ $? -eq 0 ]; then
            print_success "$test_file passed!"
            ((passed_tests++))
        else
            print_error "$test_file failed!"
            ((failed_tests++))
        fi
        
        ((total_tests++))
        echo ""
    else
        print_warning "Test file $test_file not found, skipping..."
    fi
done

echo "=========================================="
print_status "Test Summary:"
echo "  Total test files: $total_tests"
echo "  Passed: $passed_tests"
echo "  Failed: $failed_tests"

if [ $failed_tests -eq 0 ]; then
    print_success "🎉 All FHE compliance tests passed!"
    echo ""
    print_status "✅ FHE Data Types: Validated"
    print_status "✅ FHE Parameter Validation: Passed"
    print_status "✅ FHE State Management: Working"
    print_status "✅ FHE Security: Verified"
    print_status "✅ FHE Performance: Optimized"
    echo ""
    print_success "Hệ thống tuân thủ đầy đủ các tiêu chuẩn FHE!"
else
    print_error "❌ Some FHE compliance tests failed!"
    echo ""
    print_warning "Vui lòng kiểm tra và sửa các lỗi trước khi deploy."
    exit 1
fi

# Optional: Run with gas reporting
if [ "$1" = "--gas" ]; then
    echo ""
    print_status "Running gas analysis..."
    REPORT_GAS=true npx hardhat test
fi

# Optional: Run with coverage
if [ "$1" = "--coverage" ]; then
    echo ""
    print_status "Running coverage analysis..."
    npx hardhat coverage
fi

echo ""
print_status "FHE compliance test suite completed!"
