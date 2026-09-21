import test from "node:test";
import assert from "node:assert/strict";
import { mimeForUpload, extForUpload, ALLOWED_UPLOAD_EXT } from "./mimeForUpload.js";

test("prefers a known File.type over the extension", () => {
  assert.equal(
    mimeForUpload({ name: "scan.pdf", type: "image/jpeg" }),
    "image/jpeg"
  );
  assert.equal(
    mimeForUpload({ name: "id.PNG", type: "image/png" }),
    "image/png"
  );
});

test("maps extension when type is missing, empty, or generic", () => {
  assert.equal(mimeForUpload({ name: "IMG_1234.JPG", type: "" }), "image/jpeg");
  assert.equal(mimeForUpload({ name: "id.jpeg" }), "image/jpeg");
  assert.equal(mimeForUpload({ name: "passport.PNG", type: "   " }), "image/png");
  assert.equal(mimeForUpload({ name: "face.HEIC", type: "application/octet-stream" }), "image/heic");
  assert.equal(mimeForUpload({ name: "id.pdf", type: "application/octet-stream" }), "application/pdf");
});

test("never returns application/octet-stream", () => {
  assert.equal(mimeForUpload({ name: "photo", type: "" }), "image/jpeg");
  assert.equal(mimeForUpload({ name: "mystery.bin", type: "application/octet-stream" }), "image/jpeg");
  assert.equal(mimeForUpload({ name: "note.txt", type: "text/plain" }), "image/jpeg");
});

test("ALLOWED_UPLOAD_EXT stays aligned with jpg/jpeg/png/heic/pdf", () => {
  assert.deepEqual([...ALLOWED_UPLOAD_EXT].sort(), ["heic", "jpeg", "jpg", "pdf", "png"]);
});

test("extForUpload keeps allowed extensions and falls back to jpg", () => {
  assert.equal(extForUpload({ name: "face.HEIC" }), "heic");
  assert.equal(extForUpload({ name: "scan.PDF" }), "pdf");
  assert.equal(extForUpload({ name: "photo" }), "jpg");
});
