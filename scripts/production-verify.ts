#!/usr/bin/env tsx
/**
 * Production Readiness Verification Script
 * 
 * This script performs comprehensive checks to ensure the application
 * is ready for production deployment.
 * 
 * Usage: tsx scripts/production-verify.ts
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface VerificationResult {
    category: string;
    test: string;
    status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
    message?: string;
    details?: string[];
}

const results: VerificationResult[] = [];
const rootDir = resolve(__dirname, '..');

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function addResult(result: VerificationResult) {
    results.push(result);
    const icon = {
        PASS: '✅',
        FAIL: '❌',
        WARN: '⚠️',
        SKIP: '⏭️',
    }[result.status];

    const color = {
        PASS: 'green',
        FAIL: 'red',
        WARN: 'yellow',
        SKIP: 'cyan',
    }[result.status] as keyof typeof colors;

    log(`${icon} ${result.category}: ${result.test}`, color);
    if (result.message) {
        log(`   ${result.message}`, color);
    }
}

// ============================================================================
// 1. ROUTE VERIFICATION
// ============================================================================

function verifyRoutes() {
    log('\n📍 Verifying Routes...', 'blue');

    const appDir = join(rootDir, 'src', 'app');
    const routes: string[] = [];

    function scanDirectory(dir: string, basePath: string = '') {
        try {
            const entries = readdirSync(dir);

            for (const entry of entries) {
                const fullPath = join(dir, entry);
                const stat = statSync(fullPath);

                if (stat.isDirectory()) {
                    // Skip special Next.js directories
                    if (entry.startsWith('_') || entry === 'api') continue;

                    // Handle route groups (dashboard)
                    const routePath = entry.startsWith('(') && entry.endsWith(')')
                        ? basePath
                        : `${basePath}/${entry}`;

                    scanDirectory(fullPath, routePath);
                } else if (entry === 'page.tsx' || entry === 'page.ts') {
                    routes.push(basePath || '/');
                }
            }
        } catch (error) {
            addResult({
                category: 'Routes',
                test: 'Scan directory structure',
                status: 'FAIL',
                message: `Error scanning ${dir}: ${error}`,
            });
        }
    }

    scanDirectory(appDir);

    addResult({
        category: 'Routes',
        test: 'Route discovery',
        status: 'PASS',
        message: `Found ${routes.length} routes`,
        details: routes.sort(),
    });

    // Verify expected routes exist
    const expectedRoutes = [
        '/',
        '/welcome',
        '/dashboard',
        '/chat',
        '/leads',
        '/leads/new',
        '/services',
        '/appointments',
        '/analytics',
        '/ai-agents',
        '/ai-agents/seo',
        '/ai-agents/content',
        '/ai-agents/social',
    ];

    const missingRoutes = expectedRoutes.filter(route => !routes.includes(route));

    if (missingRoutes.length === 0) {
        addResult({
            category: 'Routes',
            test: 'Expected routes exist',
            status: 'PASS',
            message: 'All expected routes are present',
        });
    } else {
        addResult({
            category: 'Routes',
            test: 'Expected routes exist',
            status: 'FAIL',
            message: `Missing routes: ${missingRoutes.join(', ')}`,
        });
    }
}

// ============================================================================
// 2. LINK VALIDATION
// ============================================================================

function verifyLinks() {
    log('\n🔗 Verifying Links...', 'blue');

    const links: Set<string> = new Set();
    const linkPattern = /(?:href=["']|router\.push\(["'])([^"']+)["']/g;

    function extractLinks(dir: string) {
        const entries = readdirSync(dir);

        for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
                extractLinks(fullPath);
            } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
                try {
                    const content = readFileSync(fullPath, 'utf-8');
                    let match;

                    while ((match = linkPattern.exec(content)) !== null) {
                        const link = match[1];
                        // Only track internal links (not anchors, external URLs)
                        if (link.startsWith('/') && !link.startsWith('//')) {
                            // Remove query params and anchors
                            const cleanLink = link.split('?')[0].split('#')[0];
                            links.add(cleanLink);
                        }
                    }
                } catch (error) {
                    // Skip files that can't be read
                }
            }
        }
    }

    extractLinks(join(rootDir, 'src'));

    addResult({
        category: 'Links',
        test: 'Link extraction',
        status: 'PASS',
        message: `Found ${links.size} unique internal links`,
        details: Array.from(links).sort(),
    });

    // Check for broken dynamic routes
    const dynamicLinkPattern = /\/\[.*?\]/;
    const dynamicLinks = Array.from(links).filter(link => dynamicLinkPattern.test(link));

    if (dynamicLinks.length > 0) {
        addResult({
            category: 'Links',
            test: 'Dynamic route links',
            status: 'WARN',
            message: 'Found dynamic route links (need runtime verification)',
            details: dynamicLinks,
        });
    }
}

// ============================================================================
// 3. API ENDPOINT VERIFICATION
// ============================================================================

function verifyApiEndpoints() {
    log('\n🌐 Verifying API Endpoints...', 'blue');

    const apiDir = join(rootDir, 'src', 'app', 'api');
    const endpoints: string[] = [];

    function scanApiDirectory(dir: string, basePath: string = '/api') {
        try {
            const entries = readdirSync(dir);

            for (const entry of entries) {
                const fullPath = join(dir, entry);
                const stat = statSync(fullPath);

                if (stat.isDirectory()) {
                    // Skip test directories
                    if (entry === '__tests__') continue;

                    scanApiDirectory(fullPath, `${basePath}/${entry}`);
                } else if (entry === 'route.ts' || entry === 'route.tsx') {
                    endpoints.push(basePath);
                }
            }
        } catch (error) {
            // Directory might not exist
        }
    }

    scanApiDirectory(apiDir);

    addResult({
        category: 'API',
        test: 'Endpoint discovery',
        status: 'PASS',
        message: `Found ${endpoints.length} API endpoints`,
        details: endpoints.sort(),
    });

    // Verify critical endpoints exist
    const criticalEndpoints = [
        '/api/health',
        '/api/leads',
        '/api/services',
        '/api/appointments',
        '/api/conversations',
        '/api/dashboard/stats',
    ];

    const missingEndpoints = criticalEndpoints.filter(ep => !endpoints.includes(ep));

    if (missingEndpoints.length === 0) {
        addResult({
            category: 'API',
            test: 'Critical endpoints exist',
            status: 'PASS',
            message: 'All critical endpoints are present',
        });
    } else {
        addResult({
            category: 'API',
            test: 'Critical endpoints exist',
            status: 'FAIL',
            message: `Missing endpoints: ${missingEndpoints.join(', ')}`,
        });
    }
}

// ============================================================================
// 4. ENVIRONMENT VARIABLES
// ============================================================================

function verifyEnvironmentVariables() {
    log('\n🔐 Verifying Environment Variables...', 'blue');

    const requiredVars = [
        'DATABASE_URL',
        'NEXT_PUBLIC_APP_URL',
    ];

    const recommendedVars = [
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'GOOGLE_GENERATIVE_AI_API_KEY',
        'SESSION_SECRET',
        'INNGEST_EVENT_KEY',
        'INNGEST_SIGNING_KEY',
    ];

    // Check .env.example exists
    const envExamplePath = join(rootDir, '.env.example');
    if (existsSync(envExamplePath)) {
        addResult({
            category: 'Environment',
            test: '.env.example exists',
            status: 'PASS',
        });
    } else {
        addResult({
            category: 'Environment',
            test: '.env.example exists',
            status: 'WARN',
            message: 'No .env.example file found',
        });
    }

    // Note: We can't check actual values in .env as it's gitignored
    addResult({
        category: 'Environment',
        test: 'Required variables',
        status: 'WARN',
        message: 'Ensure these are set in production',
        details: requiredVars,
    });

    addResult({
        category: 'Environment',
        test: 'Recommended variables',
        status: 'WARN',
        message: 'At least one AI provider key should be set',
        details: recommendedVars,
    });
}

// ============================================================================
// 5. BUILD VERIFICATION
// ============================================================================

function verifyBuild() {
    log('\n🏗️  Verifying Build Configuration...', 'blue');

    // Check package.json scripts
    const packageJsonPath = join(rootDir, 'package.json');
    try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

        const requiredScripts = ['build', 'start', 'dev', 'lint', 'typecheck'];
        const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);

        if (missingScripts.length === 0) {
            addResult({
                category: 'Build',
                test: 'Required npm scripts',
                status: 'PASS',
                message: 'All required scripts are present',
            });
        } else {
            addResult({
                category: 'Build',
                test: 'Required npm scripts',
                status: 'FAIL',
                message: `Missing scripts: ${missingScripts.join(', ')}`,
            });
        }

        // Check Node.js version requirement
        if (packageJson.engines?.node) {
            addResult({
                category: 'Build',
                test: 'Node.js version specified',
                status: 'PASS',
                message: `Requires Node.js ${packageJson.engines.node}`,
            });
        } else {
            addResult({
                category: 'Build',
                test: 'Node.js version specified',
                status: 'WARN',
                message: 'No Node.js version requirement specified',
            });
        }
    } catch (error) {
        addResult({
            category: 'Build',
            test: 'package.json validation',
            status: 'FAIL',
            message: `Error reading package.json: ${error}`,
        });
    }

    // Check TypeScript configuration
    const tsconfigPath = join(rootDir, 'tsconfig.json');
    if (existsSync(tsconfigPath)) {
        addResult({
            category: 'Build',
            test: 'TypeScript configuration',
            status: 'PASS',
            message: 'tsconfig.json exists',
        });
    } else {
        addResult({
            category: 'Build',
            test: 'TypeScript configuration',
            status: 'FAIL',
            message: 'tsconfig.json not found',
        });
    }

    // Check Next.js configuration
    const nextConfigPath = join(rootDir, 'next.config.js');
    if (existsSync(nextConfigPath)) {
        addResult({
            category: 'Build',
            test: 'Next.js configuration',
            status: 'PASS',
            message: 'next.config.js exists',
        });
    } else {
        addResult({
            category: 'Build',
            test: 'Next.js configuration',
            status: 'WARN',
            message: 'next.config.js not found',
        });
    }
}

// ============================================================================
// 6. SECURITY VERIFICATION
// ============================================================================

function verifySecurity() {
    log('\n🔒 Verifying Security Configuration...', 'blue');

    // Check middleware exists
    const middlewarePath = join(rootDir, 'middleware.ts');
    if (existsSync(middlewarePath)) {
        const middlewareContent = readFileSync(middlewarePath, 'utf-8');

        addResult({
            category: 'Security',
            test: 'Middleware exists',
            status: 'PASS',
        });

        // Check for rate limiting
        if (middlewareContent.includes('rateLimiter') || middlewareContent.includes('rate-limit')) {
            addResult({
                category: 'Security',
                test: 'Rate limiting configured',
                status: 'PASS',
            });
        } else {
            addResult({
                category: 'Security',
                test: 'Rate limiting configured',
                status: 'WARN',
                message: 'Rate limiting not detected in middleware',
            });
        }

        // Check for CORS handling
        if (middlewareContent.includes('cors') || middlewareContent.includes('CORS')) {
            addResult({
                category: 'Security',
                test: 'CORS handling',
                status: 'PASS',
            });
        } else {
            addResult({
                category: 'Security',
                test: 'CORS handling',
                status: 'WARN',
                message: 'CORS handling not detected',
            });
        }

        // Check for security headers
        const securityHeaders = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection',
            'Content-Security-Policy',
            'Strict-Transport-Security',
        ];

        const foundHeaders = securityHeaders.filter(header =>
            middlewareContent.includes(header)
        );

        if (foundHeaders.length >= 3) {
            addResult({
                category: 'Security',
                test: 'Security headers',
                status: 'PASS',
                message: `${foundHeaders.length}/${securityHeaders.length} headers configured`,
                details: foundHeaders,
            });
        } else {
            addResult({
                category: 'Security',
                test: 'Security headers',
                status: 'WARN',
                message: `Only ${foundHeaders.length}/${securityHeaders.length} headers found`,
                details: foundHeaders,
            });
        }
    } else {
        addResult({
            category: 'Security',
            test: 'Middleware exists',
            status: 'FAIL',
            message: 'middleware.ts not found',
        });
    }

    // Check for .gitignore
    const gitignorePath = join(rootDir, '.gitignore');
    if (existsSync(gitignorePath)) {
        const gitignoreContent = readFileSync(gitignorePath, 'utf-8');

        const sensitiveFiles = ['.env', '.env.local', '.env.production'];
        const protectedFiles = sensitiveFiles.filter(file =>
            gitignoreContent.includes(file)
        );

        if (protectedFiles.length === sensitiveFiles.length) {
            addResult({
                category: 'Security',
                test: 'Sensitive files in .gitignore',
                status: 'PASS',
                message: 'Environment files are gitignored',
            });
        } else {
            addResult({
                category: 'Security',
                test: 'Sensitive files in .gitignore',
                status: 'FAIL',
                message: 'Some environment files may not be gitignored',
            });
        }
    }
}

// ============================================================================
// 7. DATABASE VERIFICATION
// ============================================================================

function verifyDatabase() {
    log('\n🗄️  Verifying Database Configuration...', 'blue');

    // Check Prisma schema
    const schemaPath = join(rootDir, 'prisma', 'schema.prisma');
    if (existsSync(schemaPath)) {
        addResult({
            category: 'Database',
            test: 'Prisma schema exists',
            status: 'PASS',
        });

        const schemaContent = readFileSync(schemaPath, 'utf-8');

        // Check for required models
        const requiredModels = ['User', 'Lead', 'Service', 'Appointment', 'Conversation', 'Message'];
        const foundModels = requiredModels.filter(model =>
            new RegExp(`model\\s+${model}\\s*{`, 'i').test(schemaContent)
        );

        if (foundModels.length === requiredModels.length) {
            addResult({
                category: 'Database',
                test: 'Required models defined',
                status: 'PASS',
                message: 'All required models are present',
                details: foundModels,
            });
        } else {
            const missing = requiredModels.filter(m => !foundModels.includes(m));
            addResult({
                category: 'Database',
                test: 'Required models defined',
                status: 'WARN',
                message: `Missing models: ${missing.join(', ')}`,
            });
        }
    } else {
        addResult({
            category: 'Database',
            test: 'Prisma schema exists',
            status: 'FAIL',
            message: 'prisma/schema.prisma not found',
        });
    }

    // Check for migrations directory
    const migrationsPath = join(rootDir, 'prisma', 'migrations');
    if (existsSync(migrationsPath)) {
        const migrations = readdirSync(migrationsPath).filter(f =>
            statSync(join(migrationsPath, f)).isDirectory()
        );

        addResult({
            category: 'Database',
            test: 'Migrations exist',
            status: 'PASS',
            message: `Found ${migrations.length} migrations`,
        });
    } else {
        addResult({
            category: 'Database',
            test: 'Migrations exist',
            status: 'WARN',
            message: 'No migrations directory found',
        });
    }
}

// ============================================================================
// 8. DEPLOYMENT CONFIGURATION
// ============================================================================

function verifyDeployment() {
    log('\n🚀 Verifying Deployment Configuration...', 'blue');

    // Check PM2 ecosystem config
    const pm2Configs = ['ecosystem.config.mjs', 'ecosystem.config.js', 'ecosystem.config.cjs'];
    const pm2Config = pm2Configs.find(config => existsSync(join(rootDir, config)));

    if (pm2Config) {
        addResult({
            category: 'Deployment',
            test: 'PM2 configuration',
            status: 'PASS',
            message: `Found ${pm2Config}`,
        });
    } else {
        addResult({
            category: 'Deployment',
            test: 'PM2 configuration',
            status: 'WARN',
            message: 'No PM2 ecosystem config found',
        });
    }

    // Check for deployment scripts
    const deployDir = join(rootDir, 'deploy');
    if (existsSync(deployDir)) {
        const deployScripts = readdirSync(deployDir).filter(f =>
            f.endsWith('.sh') || f.endsWith('.md')
        );

        addResult({
            category: 'Deployment',
            test: 'Deployment scripts',
            status: 'PASS',
            message: `Found ${deployScripts.length} deployment files`,
            details: deployScripts,
        });
    } else {
        addResult({
            category: 'Deployment',
            test: 'Deployment scripts',
            status: 'WARN',
            message: 'No deploy directory found',
        });
    }

    // Check for Docker configuration
    const dockerfilePath = join(rootDir, 'Dockerfile');
    if (existsSync(dockerfilePath)) {
        addResult({
            category: 'Deployment',
            test: 'Docker configuration',
            status: 'PASS',
            message: 'Dockerfile exists',
        });
    } else {
        addResult({
            category: 'Deployment',
            test: 'Docker configuration',
            status: 'SKIP',
            message: 'No Dockerfile (using PM2 deployment)',
        });
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║   AgentsFlowAI - Production Readiness Verification        ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝\n', 'cyan');

    try {
        verifyRoutes();
        verifyLinks();
        verifyApiEndpoints();
        verifyEnvironmentVariables();
        verifyBuild();
        verifySecurity();
        verifyDatabase();
        verifyDeployment();

        // Summary
        log('\n' + '═'.repeat(60), 'cyan');
        log('VERIFICATION SUMMARY', 'cyan');
        log('═'.repeat(60) + '\n', 'cyan');

        const summary = {
            PASS: results.filter(r => r.status === 'PASS').length,
            FAIL: results.filter(r => r.status === 'FAIL').length,
            WARN: results.filter(r => r.status === 'WARN').length,
            SKIP: results.filter(r => r.status === 'SKIP').length,
        };

        log(`✅ Passed:  ${summary.PASS}`, 'green');
        log(`❌ Failed:  ${summary.FAIL}`, 'red');
        log(`⚠️  Warnings: ${summary.WARN}`, 'yellow');
        log(`⏭️  Skipped: ${summary.SKIP}`, 'cyan');
        log(`📊 Total:   ${results.length}\n`);

        // Show failures and warnings
        const issues = results.filter(r => r.status === 'FAIL' || r.status === 'WARN');
        if (issues.length > 0) {
            log('\n' + '═'.repeat(60), 'yellow');
            log('ISSUES REQUIRING ATTENTION', 'yellow');
            log('═'.repeat(60) + '\n', 'yellow');

            issues.forEach(issue => {
                const icon = issue.status === 'FAIL' ? '❌' : '⚠️';
                const color = issue.status === 'FAIL' ? 'red' : 'yellow';
                log(`${icon} [${issue.category}] ${issue.test}`, color);
                if (issue.message) {
                    log(`   ${issue.message}`, color);
                }
                if (issue.details && issue.details.length > 0) {
                    issue.details.forEach(detail => {
                        log(`   - ${detail}`, color);
                    });
                }
                log('');
            });
        }

        // Exit code
        const exitCode = summary.FAIL > 0 ? 1 : 0;

        if (exitCode === 0) {
            log('\n✨ All critical checks passed! Application is ready for production.', 'green');
        } else {
            log('\n⚠️  Some critical checks failed. Please address the issues above.', 'red');
        }

        process.exit(exitCode);

    } catch (error) {
        log(`\n❌ Fatal error during verification: ${error}`, 'red');
        process.exit(1);
    }
}

// Run the verification
main();
