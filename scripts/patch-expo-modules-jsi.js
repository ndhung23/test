// scripts/patch-expo-modules-jsi.js
// Fixes Swift compilation errors for ExpoModulesJSI under Xcode 16.x / Swift 6.1
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
    console.log('[patch-expo-modules-jsi] Patched JavaScriptObject.swift with UncheckedSendable.');
  } else if (normalizedContent.includes(normalizedNew)) {
    console.log('[patch-expo-modules-jsi] JavaScriptObject.swift already patched.');
  }
}

// 2. Patch JavaScriptCallback.swift to mark local closure functions as @Sendable
const jsCallbackFile = path.join(
  rootDir,
  'node_modules',
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'JavaScriptCallback.swift'
);

if (fs.existsSync(jsCallbackFile)) {
  let content = fs.readFileSync(jsCallbackFile, 'utf8');
  const original = content;
  content = content.replace(/@JavaScriptActor(\r?\n\s+)func call\(/g, '@JavaScriptActor @Sendable$1func call(');
  if (content !== original) {
    fs.writeFileSync(jsCallbackFile, content, 'utf8');
    console.log('[patch-expo-modules-jsi] Patched JavaScriptCallback.swift local functions with @Sendable.');
  } else {
    console.log('[patch-expo-modules-jsi] JavaScriptCallback.swift already patched.');
  }
}

// 3. Patch Package.swift files
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

    if (relPath.includes('expo-modules-jsi')) {
      // Disable Swift 6.2 upcoming features
      if (pkgContent.includes('.enableUpcomingFeature("NonisolatedNonsendingByDefault")')) {
        pkgContent = pkgContent.replace('.enableUpcomingFeature("NonisolatedNonsendingByDefault"),', '// .enableUpcomingFeature("NonisolatedNonsendingByDefault"),');
        modified = true;
      }
      if (pkgContent.includes('.enableUpcomingFeature("InferIsolatedConformances")')) {
        pkgContent = pkgContent.replace('.enableUpcomingFeature("InferIsolatedConformances"),', '// .enableUpcomingFeature("InferIsolatedConformances"),');
        modified = true;
      }
      // Remove -Werror flags that fail on minor warnings
      if (pkgContent.includes('"-Werror", "ImplicitStrongCapture",')) {
        pkgContent = pkgContent.replace('"-Werror", "ImplicitStrongCapture",', '// "-Werror", "ImplicitStrongCapture",');
        modified = true;
      }
      if (pkgContent.includes('"-Werror", "NoUsage",')) {
        pkgContent = pkgContent.replace('"-Werror", "NoUsage",', '// "-Werror", "NoUsage",');
        modified = true;
      }
      // Add -strict-concurrency=minimal to unsafeFlags
      if (!pkgContent.includes('"-strict-concurrency=minimal"')) {
        pkgContent = pkgContent.replace(
          '.unsafeFlags([',
          '.unsafeFlags([\n          "-strict-concurrency=minimal",'
        );
        modified = true;
      }
      // Set swiftLanguageModes to [.v5] for compatibility with Xcode 16 Swift 6 compiler
      if (pkgContent.includes('swiftLanguageModes: [.v6]')) {
        pkgContent = pkgContent.replace('swiftLanguageModes: [.v6]', 'swiftLanguageModes: [.v5]');
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(pkgFile, pkgContent, 'utf8');
      console.log(`[patch-expo-modules-jsi] Patched ${relPath} for Swift compatibility.`);
    } else {
      console.log(`[patch-expo-modules-jsi] ${relPath} already compatible.`);
    }
  }
}
