// scripts/patch-expo-modules-jsi.js
// 1. Fixes Swift 6 strict concurrency error in JavaScriptObject.swift
// 2. Fixes Swift tools version 6.2 mismatch on Xcode runners with Swift 6.1 / 6.0
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// 1. Patch JavaScriptObject.swift
const jsObjFile = path.join(
  rootDir,
  'node_modules',
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'Values',
  'JavaScriptObject.swift'
);

if (fs.existsSync(jsObjFile)) {
  const content = fs.readFileSync(jsObjFile, 'utf8');
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
    fs.writeFileSync(jsObjFile, patched, 'utf8');
    console.log('[patch-expo-modules-jsi] Successfully patched JavaScriptObject.swift with UncheckedSendable!');
  } else if (normalizedContent.includes(normalizedNew)) {
    console.log('[patch-expo-modules-jsi] JavaScriptObject.swift is already patched.');
  } else {
    console.warn('[patch-expo-modules-jsi] Target snippet not found in JavaScriptObject.swift.');
  }
} else {
  console.log('[patch-expo-modules-jsi] JavaScriptObject.swift not found, skipping.');
}

// 2. Patch Package.swift files requiring Swift tools version 6.2 down to 6.0
// to be compatible with Xcode 16.x (which ships with Swift 6.0 / 6.1).
const packageFilesToPatch = [
  'node_modules/expo-modules-jsi/apple/Package.swift',
  'node_modules/expo/Package.swift',
  'node_modules/@expo/log-box/Package.swift',
  'node_modules/expo-constants/Package.swift',
  'node_modules/expo-modules-macros/apple/Package.swift'
];

for (const relPath of packageFilesToPatch) {
  const pkgFile = path.join(rootDir, relPath);
  if (fs.existsSync(pkgFile)) {
    let pkgContent = fs.readFileSync(pkgFile, 'utf8');
    let modified = false;

    if (pkgContent.includes('// swift-tools-version: 6.2')) {
      pkgContent = pkgContent.replace('// swift-tools-version: 6.2', '// swift-tools-version: 6.0');
      modified = true;
    }

    // In expo-modules-jsi/apple/Package.swift, remove Swift 6.2-only upcoming features
    if (relPath.includes('expo-modules-jsi')) {
      if (pkgContent.includes('.enableUpcomingFeature("NonisolatedNonsendingByDefault")')) {
        pkgContent = pkgContent.replace('.enableUpcomingFeature("NonisolatedNonsendingByDefault"),', '// .enableUpcomingFeature("NonisolatedNonsendingByDefault"),');
        modified = true;
      }
      if (pkgContent.includes('.enableUpcomingFeature("InferIsolatedConformances")')) {
        pkgContent = pkgContent.replace('.enableUpcomingFeature("InferIsolatedConformances"),', '// .enableUpcomingFeature("InferIsolatedConformances"),');
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(pkgFile, pkgContent, 'utf8');
      console.log(`[patch-expo-modules-jsi] Successfully patched ${relPath} for Swift 6.0 compatibility.`);
    } else {
      console.log(`[patch-expo-modules-jsi] ${relPath} already compatible.`);
    }
  }
}
