// scripts/patch-expo-modules-jsi.js
// Fixes Swift 6.2 strict concurrency error:
// "error: sending 'slot' risks causing data races" in JavaScriptObject.swift
const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'Values',
  'JavaScriptObject.swift'
);

if (!fs.existsSync(targetFile)) {
  console.log('[patch-expo-modules-jsi] Target file does not exist, skipping.');
  process.exit(0);
}

const content = fs.readFileSync(targetFile, 'utf8');

const oldCode = `  try withUnsafeTemporaryAllocation(of: facebook.jsi.Value.self, capacity: 1) { buffer in
    // The isolated closure below runs synchronously on this thread.
    nonisolated(unsafe) let slot = buffer.baseAddress!
    expo.emplaceUndefined(slot)
    defer {
      expo.destroyValues(slot, 1)
    }
    // The runtime can't be deallocated during a call on its JavaScript thread, so it's borrowed without
    // a retain.
    try runtime._withUnsafeGuaranteedRef { runtime in
      try JavaScriptActor.assumeIsolated {
        try encode(JavaScriptValue.Slot(slot), runtime)
      }
    }
    body(slot.pointee)
  }`;

const newCode = `  try withUnsafeTemporaryAllocation(of: facebook.jsi.Value.self, capacity: 1) { buffer in
    // The isolated closure below runs synchronously on this thread.
    let slot = UncheckedSendable(buffer.baseAddress!)
    expo.emplaceUndefined(slot.value)
    defer {
      expo.destroyValues(slot.value, 1)
    }
    // The runtime can't be deallocated during a call on its JavaScript thread, so it's borrowed without
    // a retain.
    try runtime._withUnsafeGuaranteedRef { runtime in
      try JavaScriptActor.assumeIsolated {
        try encode(JavaScriptValue.Slot(slot.value), runtime)
      }
    }
    body(slot.value.pointee)
  }`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedOld = oldCode.replace(/\r\n/g, '\n');
const normalizedNew = newCode.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedOld)) {
  const patched = normalizedContent.replace(normalizedOld, normalizedNew);
  fs.writeFileSync(targetFile, patched, 'utf8');
  console.log('[patch-expo-modules-jsi] Successfully patched JavaScriptObject.swift with UncheckedSendable!');
} else if (normalizedContent.includes(normalizedNew)) {
  console.log('[patch-expo-modules-jsi] JavaScriptObject.swift is already patched.');
} else {
  console.warn('[patch-expo-modules-jsi] Target snippet not found in JavaScriptObject.swift.');
}
