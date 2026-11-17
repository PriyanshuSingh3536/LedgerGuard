
import assert from "node:assert/strict";

// Set a temporary URI before importing the database module.
// This is only for environment validation; no database connection is made.
process.env.MONGODB_URI =
  "mongodb://127.0.0.1:27017/ledgerguard_test";

const { getTenantDatabaseName } = await import(
  "../src/config/database.js"
);

// Test 1: Same organization ID should generate the same database name.
const firstName = getTenantDatabaseName("org-123");
const secondName = getTenantDatabaseName("org-123");

assert.equal(firstName, secondName);
console.log("PASS: Same organization ID generates the same database name");

// Test 2: Different organizations should get different database names.
const organizationA = getTenantDatabaseName("org-123");
const organizationB = getTenantDatabaseName("org-456");

assert.notEqual(organizationA, organizationB);
console.log("PASS: Different organizations generate different database names");

// Test 3: Generated database name should contain only safe characters.
assert.match(
  firstName,
  /^ledgerguard_tenant_[a-f0-9]{24}$/
);

console.log("PASS: Database name follows the expected safe format");

// Test 4: Empty organization ID should throw an error.
assert.throws(
  () => getTenantDatabaseName("   "),
  /Organization ID is required/
);

console.log("PASS: Empty organization ID is rejected");

console.log("All tenant database naming tests passed!");
