#!/bin/bash

set -e

echo "🔄 Upgrading FormFlow packages to latest versions..."
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📦 Phase 1: Dashboard API${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd apps/dashboard-api

echo -e "${YELLOW}Upgrading dev dependencies...${NC}"
npm install --save-dev \
  @types/bcryptjs@^3.0.0 \
  @types/express@^5.0.0 \
  @types/jest@^30.0.0 \
  @types/node@^22.10.5 \
  @types/nodemailer@^7.0.5 \
  jest@^30.2.0 \
  typescript@^5.9.3

echo -e "${YELLOW}Upgrading dependencies...${NC}"
npm install \
  bcryptjs@^3.0.3 \
  body-parser@^2.2.2 \
  dotenv@^17.2.3 \
  express@^5.2.1 \
  typeorm@^0.3.28

cd ../..

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📦 Phase 2: Collector API${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd apps/collector-api

echo -e "${YELLOW}Upgrading dev dependencies...${NC}"
npm install --save-dev \
  @types/express@^5.0.0 \
  @types/jest@^30.0.0 \
  @types/node@^22.10.5 \
  @types/nodemailer@^7.0.5 \
  jest@^30.2.0 \
  typescript@^5.9.3

echo -e "${YELLOW}Upgrading dependencies...${NC}"
npm install \
  body-parser@^2.2.2 \
  dotenv@^17.2.3 \
  express@^5.2.1 \
  typeorm@^0.3.28

cd ../..

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📦 Phase 3: Dashboard UI${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd apps/dashboard-ui

echo -e "${YELLOW}Upgrading dependencies...${NC}"
npm install \
  glob@^13.0.0 \
  prismjs@^1.30.0 \
  rimraf@^6.1.2 \
  three@^0.182.0

cd ../..

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All packages upgraded!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Major changes:${NC}"
echo "  • Express: 4.x → 5.x (breaking changes possible)"
echo "  • TypeORM: 0.3.20 → 0.3.28"
echo "  • Jest: 29.x → 30.x (breaking changes possible)"
echo "  • Node types: 20.x → 22.x"
echo "  • Body-parser: 1.x → 2.x"
echo "  • dotenv: 16.x → 17.x"
echo "  • bcryptjs: 2.x → 3.x (breaking changes possible)"
echo ""
echo -e "${YELLOW}⚠️  Next steps:${NC}"
echo "  1. Run tests: npm run test"
echo "  2. Check for breaking changes in Express 5 migration guide"
echo "  3. Check for breaking changes in Jest 30 changelog"
echo "  4. Test all APIs manually"
echo ""
