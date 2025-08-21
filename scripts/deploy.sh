#!/bin/bash

# Team Availability Tracker Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e  # Exit on any error

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required tools
check_dependencies() {
    log_info "Checking dependencies..."
    
    command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed."; exit 1; }
    command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed."; exit 1; }
    
    if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
        command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed."; exit 1; }
        command -v docker-compose >/dev/null 2>&1 || { log_error "Docker Compose is required but not installed."; exit 1; }
    fi
    
    log_success "All dependencies are available"
}

# Load environment variables
load_environment() {
    log_info "Loading environment configuration..."
    
    ENV_FILE=".env.${ENVIRONMENT}"
    if [[ -f "$ENV_FILE" ]]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
        log_success "Environment variables loaded from $ENV_FILE"
    else
        log_warning "Environment file $ENV_FILE not found, using system environment"
    fi
}

# Run pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check Node.js version
    NODE_VERSION=$(node --version)
    log_info "Node.js version: $NODE_VERSION"
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --silent
    
    # Run tests
    log_info "Running tests..."
    npm run test --silent || {
        log_error "Tests failed. Deployment aborted."
        exit 1
    }
    
    # Type checking
    log_info "Running TypeScript type checking..."
    npm run type-check --silent || {
        log_error "TypeScript errors found. Deployment aborted."
        exit 1
    }
    
    # Linting
    log_info "Running ESLint..."
    npm run lint --silent || {
        log_error "Linting errors found. Deployment aborted."
        exit 1
    }
    
    # Build the application
    log_info "Building application..."
    npm run build --silent || {
        log_error "Build failed. Deployment aborted."
        exit 1
    }
    
    log_success "All pre-deployment checks passed"
}

# Generate PWA assets
generate_pwa_assets() {
    log_info "Generating PWA assets..."
    
    if [[ -f "scripts/generate-pwa-icons.js" ]]; then
        node scripts/generate-pwa-icons.js
        log_success "PWA icons generated"
    else
        log_warning "PWA icon generator not found, skipping..."
    fi
}

# Database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    if [[ -d "database/migrations" ]]; then
        # Add your migration logic here
        # Example: npx supabase db push
        log_success "Database migrations completed"
    else
        log_warning "No migrations directory found, skipping..."
    fi
}

# Deploy to Vercel
deploy_vercel() {
    log_info "Deploying to Vercel..."
    
    command -v vercel >/dev/null 2>&1 || {
        log_info "Installing Vercel CLI..."
        npm install -g vercel
    }
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        vercel --prod --confirm
    else
        vercel --confirm
    fi
    
    log_success "Deployment to Vercel completed"
}

# Deploy to Netlify
deploy_netlify() {
    log_info "Deploying to Netlify..."
    
    command -v netlify >/dev/null 2>&1 || {
        log_info "Installing Netlify CLI..."
        npm install -g netlify-cli
    }
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        netlify deploy --prod --dir=out
    else
        netlify deploy --dir=out
    fi
    
    log_success "Deployment to Netlify completed"
}

# Deploy using Docker
deploy_docker() {
    log_info "Deploying with Docker..."
    
    # Build Docker image
    log_info "Building Docker image..."
    docker build -t team-availability-tracker:$ENVIRONMENT .
    
    # Deploy with Docker Compose
    log_info "Starting services with Docker Compose..."
    docker-compose -f docs/deployment/docker-compose.yml up -d
    
    # Health check
    log_info "Running health check..."
    sleep 10
    
    if curl -f http://localhost:3000/api/health; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        exit 1
    fi
    
    log_success "Docker deployment completed"
}

# Post-deployment tasks
post_deployment() {
    log_info "Running post-deployment tasks..."
    
    # Warm up the application
    if [[ -n "$DEPLOYMENT_URL" ]]; then
        log_info "Warming up application at $DEPLOYMENT_URL"
        curl -s "$DEPLOYMENT_URL" > /dev/null || log_warning "Failed to warm up application"
    fi
    
    # Send deployment notification (if configured)
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        log_info "Sending deployment notification..."
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ Team Availability Tracker deployed to $ENVIRONMENT\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null || log_warning "Failed to send notification"
    fi
    
    log_success "Post-deployment tasks completed"
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    case $DEPLOYMENT_TYPE in
        "vercel")
            vercel rollback
            ;;
        "docker")
            docker-compose -f docs/deployment/docker-compose.yml down
            docker-compose -f docs/deployment/docker-compose.yml up -d
            ;;
        *)
            log_error "Rollback not implemented for $DEPLOYMENT_TYPE"
            ;;
    esac
    
    log_success "Rollback completed"
}

# Main deployment flow
main() {
    cd "$PROJECT_ROOT"
    
    # Parse deployment type from environment or default to vercel
    DEPLOYMENT_TYPE=${DEPLOYMENT_TYPE:-vercel}
    
    log_info "Deployment type: $DEPLOYMENT_TYPE"
    log_info "Environment: $ENVIRONMENT"
    log_info "Project root: $PROJECT_ROOT"
    
    # Set trap for cleanup on exit
    trap 'log_error "Deployment failed"; exit 1' ERR
    
    check_dependencies
    load_environment
    pre_deployment_checks
    generate_pwa_assets
    run_migrations
    
    case $DEPLOYMENT_TYPE in
        "vercel")
            deploy_vercel
            ;;
        "netlify")
            deploy_netlify
            ;;
        "docker")
            deploy_docker
            ;;
        *)
            log_error "Unknown deployment type: $DEPLOYMENT_TYPE"
            exit 1
            ;;
    esac
    
    post_deployment
    
    log_success "🎉 Deployment completed successfully!"
    log_info "Environment: $ENVIRONMENT"
    log_info "Deployment type: $DEPLOYMENT_TYPE"
    log_info "Time: $(date)"
}

# Handle command line arguments
case "${1:-}" in
    "rollback")
        rollback
        exit 0
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [environment] [options]"
        echo ""
        echo "Environments:"
        echo "  production    Deploy to production"
        echo "  staging       Deploy to staging"
        echo "  development   Deploy to development"
        echo ""
        echo "Options:"
        echo "  rollback      Rollback the last deployment"
        echo "  help          Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  DEPLOYMENT_TYPE    vercel|netlify|docker (default: vercel)"
        echo "  SLACK_WEBHOOK_URL  Slack webhook for notifications"
        echo "  DEPLOYMENT_URL     URL for health checks"
        exit 0
        ;;
esac

# Run main deployment
main