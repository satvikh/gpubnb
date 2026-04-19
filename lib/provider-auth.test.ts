import assert from "node:assert/strict";
import test from "node:test";
import { createProviderToken, hashProviderToken } from "./provider-auth";

test("provider token generation and hashing are stable", () => {
  const token = createProviderToken();
  assert.match(token, /^tok_[a-f0-9]{64}$/);
  assert.equal(hashProviderToken(token), hashProviderToken(token));
  assert.notEqual(hashProviderToken(token), hashProviderToken(`${token}x`));
});
