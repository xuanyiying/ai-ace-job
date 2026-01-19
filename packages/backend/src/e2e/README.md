# End-to-End (E2E) Tests

This directory contains comprehensive end-to-end tests for the IntervAI MVP application. These tests validate complete user workflows and system behavior across multiple scenarios.

## Test Files

### 1. `complete-flow.e2e.spec.ts`

Tests the complete user journey from registration to PDF generation.

**Scenarios covered:**

- User registration and authentication
- Resume upload and parsing
- Job creation and parsing
- Resume-job matching and optimization
- PDF generation
- Error handling and edge cases
- Performance and response times
- Account management

**Key test cases:**

- User registration with duplicate email rejection
- Login with correct/incorrect credentials
- Resume upload and listing
- Job creation and retrieval
- Optimization task creation
- PDF generation from resume
- Unauthorized access prevention
- API response time validation (< 2 seconds)

### 2. `interview-flow.e2e.spec.ts`

Tests the interview preparation workflow.

**Scenarios covered:**

- Interview question generation
- Question retrieval and filtering
- Interview prep export
- Error handling

**Key test cases:**

- Generate 10-15 interview questions
- Verify question types (behavioral, technical, situational)
- Verify difficulty levels (easy, medium, hard)
- Export interview preparation as PDF
- Performance validation (< 30 seconds for generation)

### 3. `quota-and-limits.e2e.spec.ts`

Tests API rate limiting and user quota management.

**Scenarios covered:**

- Free tier rate limiting
- Pro tier unlimited access
- Quota display and tracking
- Rate limit error responses
- Subscription upgrade flow

**Key test cases:**

- Free user quota enforcement (10 requests/hour)
- Pro user unlimited access
- Quota information display
- Subscription tier upgrade/downgrade
- Rate limit error responses with retry information

### 4. `security-and-errors.e2e.spec.ts`

Tests security measures and error handling.

**Scenarios covered:**

- Authentication and authorization
- Input validation and sanitization
- Error response standardization
- Data access control
- CORS and security headers
- Rate limiting and DDoS protection
- Account deletion and data privacy

**Key test cases:**

- Token validation and expiration
- Cross-user data access prevention
- XSS and SQL injection prevention
- Standardized error response format
- Security header validation
- Account deletion and data cleanup

## Running the Tests

### Run all E2E tests

```bash
npm test -- --testPathPattern="e2e"
```

### Run specific E2E test file

```bash
npm test -- src/e2e/complete-flow.e2e.spec.ts
```

### Run E2E tests with coverage

```bash
npm test -- --testPathPattern="e2e" --coverage
```

### Run E2E tests in watch mode

```bash
npm test:watch -- --testPathPattern="e2e"
```

## Test Requirements

### Dependencies

- `supertest`: HTTP assertion library for testing Express/NestJS applications
- `@nestjs/testing`: NestJS testing utilities
- `jest`: Test runner

### Environment Setup

The tests require:

1. A running PostgreSQL database (configured via `.env`)
2. A running Redis instance (configured via `.env`)
3. Proper environment variables set in `.env` file

### Database

Tests automatically:

- Create test data in the database
- Clean up test data after completion
- Use isolated test users to prevent conflicts

## Test Coverage

The E2E tests cover:

| Feature             | Coverage                                |
| ------------------- | --------------------------------------- |
| User Authentication | ✓ Registration, Login, Token Validation |
| Resume Management   | ✓ Upload, Parse, List, Update, Delete   |
| Job Management      | ✓ Create, List, Update, Delete          |
| Optimization        | ✓ Create, Retrieve, Apply Suggestions   |
| PDF Generation      | ✓ Generate, Preview, Download           |
| Interview Prep      | ✓ Generate Questions, Export            |
| Quota Management    | ✓ Free/Pro Tiers, Rate Limiting         |
| Security            | ✓ Auth, Authorization, Input Validation |
| Error Handling      | ✓ Standardized Responses, Edge Cases    |
| Performance         | ✓ Response Times, Concurrent Requests   |

## Performance Benchmarks

The tests validate the following performance requirements:

| Operation            | Target       | Test                                          |
| -------------------- | ------------ | --------------------------------------------- |
| API Response         | < 2 seconds  | `should return user info within 2 seconds`    |
| Resume Parsing       | < 5 seconds  | Design requirement                            |
| Optimization         | < 30 seconds | Design requirement                            |
| PDF Generation       | < 10 seconds | Design requirement                            |
| Interview Generation | < 30 seconds | `should generate questions within 30 seconds` |

## Error Scenarios Tested

The tests validate proper error handling for:

1. **Authentication Errors (401)**
   - Missing token
   - Invalid token
   - Expired token
   - Malformed authorization header

2. **Authorization Errors (403)**
   - Accessing other users' data
   - Insufficient permissions

3. **Validation Errors (400)**
   - Invalid email format
   - Weak password
   - Missing required fields
   - Invalid data types

4. **Not Found Errors (404)**
   - Non-existent resources
   - Deleted resources

5. **Rate Limiting (429)**
   - Exceeded quota
   - Rate limit exceeded

## Security Tests

The tests validate:

- ✓ Password hashing (bcrypt)
- ✓ JWT token validation
- ✓ Cross-user data isolation
- ✓ XSS prevention (input sanitization)
- ✓ SQL injection prevention
- ✓ CORS configuration
- ✓ Security headers
- ✓ Account deletion and data cleanup

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: npm test -- --testPathPattern="e2e"
```

## Troubleshooting

### Tests fail with database connection error

- Ensure PostgreSQL is running
- Check `.env` file has correct database URL
- Run migrations: `npm run prisma:migrate`

### Tests fail with Redis connection error

- Ensure Redis is running
- Check `.env` file has correct Redis URL

### Tests timeout

- Increase Jest timeout: `jest.setTimeout(30000)`
- Check if services are responding slowly
- Verify network connectivity

### Tests fail with "Cannot find module 'supertest'"

- Run `npm install` to install dependencies
- Ensure `supertest` is in `devDependencies`

## Best Practices

1. **Isolation**: Each test creates its own test data
2. **Cleanup**: Tests clean up after themselves
3. **No Mocking**: Tests use real services and database
4. **Realistic Data**: Tests use realistic test data
5. **Performance**: Tests validate performance requirements
6. **Security**: Tests validate security measures

## Future Enhancements

- [ ] Add Playwright browser automation tests
- [ ] Add load testing with k6
- [ ] Add visual regression testing
- [ ] Add accessibility testing
- [ ] Add mobile device testing
- [ ] Add API contract testing
