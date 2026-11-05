// scripts/patch-expo-modules-jsi.js
// Comprehensive Swift 6.1 / Xcode 16.4 compatibility patch for Expo SDK 58 (expo-modules-jsi & expo)
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// 1. Patch JavaScriptObject.swift (UncheckedSendable for slot pointer)
const jsObjFile = path.join(
  rootDir,
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptObject.swift'
);

if (fs.existsSync(jsObjFile)) {
  let content = fs.readFileSync(jsObjFile, 'utf8').replace(/\r\n/g, '\n');
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

  if (content.includes(oldCode)) {
    fs.writeFileSync(jsObjFile, content.replace(oldCode, newCode), 'utf8');
    console.log('[patch-expo-modules-jsi] Patched JavaScriptObject.swift.');
  } else {
    console.log('[patch-expo-modules-jsi] JavaScriptObject.swift already patched.');
  }
}

// 2. Patch JavaScriptRuntime.swift
// - Fix bare regex literal `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/` -> `#/^[a-zA-Z_$][a-zA-Z0-9_$]*$/#`
// - Make `propNameIdsRegistry` and `cache` nonisolated(unsafe) (with @exclusivity(unchecked) BEFORE nonisolated(unsafe))
const jsRuntimeFile = path.join(
  rootDir,
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift'
);

if (fs.existsSync(jsRuntimeFile)) {
  let content = fs.readFileSync(jsRuntimeFile, 'utf8').replace(/\r\n/g, '\n');
  let modified = false;

  if (content.includes('if name.wholeMatch(of: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/) == nil')) {
    content = content.replace(
      'if name.wholeMatch(of: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/) == nil',
      'if name.wholeMatch(of: #/^[a-zA-Z_$][a-zA-Z0-9_$]*$/#) == nil'
    );
    modified = true;
  }

  if (content.includes('@JavaScriptActor\n  internal var propNameIdsRegistry:')) {
    content = content.replace(
      '@JavaScriptActor\n  internal var propNameIdsRegistry:',
      'nonisolated(unsafe)\n  internal var propNameIdsRegistry:'
    );
    modified = true;
  }

  // Handle both original and previously mis-ordered attribute/modifier
  if (content.includes('@JavaScriptActor\n  @exclusivity(unchecked)\n  internal var cache = Cache()')) {
    content = content.replace(
      '@JavaScriptActor\n  @exclusivity(unchecked)\n  internal var cache = Cache()',
      '@exclusivity(unchecked)\n  nonisolated(unsafe)\n  internal var cache = Cache()'
    );
    modified = true;
  } else if (content.includes('nonisolated(unsafe)\n  @exclusivity(unchecked)\n  internal var cache = Cache()')) {
    content = content.replace(
      'nonisolated(unsafe)\n  @exclusivity(unchecked)\n  internal var cache = Cache()',
      '@exclusivity(unchecked)\n  nonisolated(unsafe)\n  internal var cache = Cache()'
    );
    modified = true;
  }

  // Handle vector.push_back(consuming: propNameId) / vector.push_back(propNameId):
  // facebook::jsi::PropNameID is move-only (deleted copy constructor).
  // In Swift 6.1 C++ interop, passing it to push_back calls copy constructor unless moved in C++.
  // We use expo.appendPropNameId(&vector, iRuntime, std.string(propertyName)) which moves it in C++.
  const pushBackPattern1 = `      for propertyName in propertyNames {
        let propNameId = facebook.jsi.PropNameID.forUtf8(iRuntime, std.string(propertyName))
        vector.push_back(consuming: propNameId)
      }`;
  const pushBackPattern2 = `      for propertyName in propertyNames {
        let propNameId = facebook.jsi.PropNameID.forUtf8(iRuntime, std.string(propertyName))
        vector.push_back(propNameId)
      }`;
  const pushBackReplacement = `      for propertyName in propertyNames {
        expo.appendPropNameId(&vector, iRuntime, std.string(propertyName))
      }`;

  if (content.includes(pushBackPattern1)) {
    content = content.replace(pushBackPattern1, pushBackReplacement);
    modified = true;
  } else if (content.includes(pushBackPattern2)) {
    content = content.replace(pushBackPattern2, pushBackReplacement);
    modified = true;
  }

  // Handle expo.HostFunctionClosure constructor for Swift 6.1 (reference types lack synthesized init)
  if (content.includes('return expo.HostFunctionClosure(context, call, deallocate)')) {
    content = content.replace(
      'return expo.HostFunctionClosure(context, call, deallocate)',
      'return expo.createHostFunctionClosure(context, call, deallocate)'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(jsRuntimeFile, content, 'utf8');
    console.log('[patch-expo-modules-jsi] Patched JavaScriptRuntime.swift.');
  } else {
    console.log('[patch-expo-modules-jsi] JavaScriptRuntime.swift already patched.');
  }
}

// 2aa. Patch HostObjectCallbacks.h for appendPropNameId helper (C++ move for move-only PropNameID)
const hostObjectCallbacksHeader = path.join(
  rootDir,
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/HostObjectCallbacks.h'
);

if (fs.existsSync(hostObjectCallbacksHeader)) {
  let headerContent = fs.readFileSync(hostObjectCallbacksHeader, 'utf8').replace(/\r\n/g, '\n');
  let modified = false;

  if (!headerContent.includes('#include "IRuntimeCompat.h"')) {
    headerContent = headerContent.replace(
      '#include "RetainedSwiftPointer.h"',
      '#include "RetainedSwiftPointer.h"\n#include "IRuntimeCompat.h"'
    );
    modified = true;
  }

  if (!headerContent.includes('appendPropNameId')) {
    const target = '} SWIFT_NONCOPYABLE; // class HostObjectCallbacks';
    const replacement = `} SWIFT_NONCOPYABLE; // class HostObjectCallbacks

inline void appendPropNameId(HostObjectCallbacks::PropNameIds &vector, facebook::jsi::IRuntime &runtime, const std::string &name) {
  vector.push_back(facebook::jsi::PropNameID::forUtf8(runtime, name));
}`;
    if (headerContent.includes(target)) {
      headerContent = headerContent.replace(target, replacement);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(hostObjectCallbacksHeader, headerContent, 'utf8');
    console.log('[patch-expo-modules-jsi] Patched HostObjectCallbacks.h.');
  } else {
    console.log('[patch-expo-modules-jsi] HostObjectCallbacks.h already patched.');
  }
}

// 2b. Patch HostFunctionClosure.h to provide factory function for Swift 6.1
const hostFuncClosureHeader = path.join(
  rootDir,
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/HostFunctionClosure.h'
);

if (fs.existsSync(hostFuncClosureHeader)) {
  let headerContent = fs.readFileSync(hostFuncClosureHeader, 'utf8').replace(/\r\n/g, '\n');
  let modified = false;

  if (!headerContent.includes('createHostFunctionClosure')) {
    const target = '} SWIFT_IMMORTAL_REFERENCE; // class HostFunctionClosure';
    const replacement = `} SWIFT_IMMORTAL_REFERENCE; // class HostFunctionClosure

inline HostFunctionClosure *createHostFunctionClosure(RetainedSwiftPointer::Context context, HostFunctionClosure::Closure closure, RetainedSwiftPointer::Deallocator deallocator) {
  return new HostFunctionClosure(context, closure, deallocator);
}`;
    if (headerContent.includes(target)) {
      headerContent = headerContent.replace(target, replacement);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(hostFuncClosureHeader, headerContent, 'utf8');
    console.log('[patch-expo-modules-jsi] Patched HostFunctionClosure.h.');
  } else {
    console.log('[patch-expo-modules-jsi] HostFunctionClosure.h already patched.');
  }
}

// 2c. Patch Task+immediate.swift for Swift 6.1 / Xcode 16.4 compatibility
const taskImmediateFile = path.join(
  rootDir,
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Extensions/Task+immediate.swift'
);

if (fs.existsSync(taskImmediateFile)) {
  let taskContent = fs.readFileSync(taskImmediateFile, 'utf8').replace(/\r\n/g, '\n');
  if (taskContent.includes('Task.immediate(') || taskContent.includes('Task(name: name,')) {
    const targetRegex = /if #available\(macOS 26\.0,[\s\S]*?return Task\(name: name, priority: \.high, operation: operation\)\s*\}/;
    if (targetRegex.test(taskContent)) {
      taskContent = taskContent.replace(targetRegex, '_ = name\n    return Task(priority: priority ?? .high, operation: operation)');
      fs.writeFileSync(taskImmediateFile, taskContent, 'utf8');
      console.log('[patch-expo-modules-jsi] Patched Task+immediate.swift.');
    }
  } else {
    console.log('[patch-expo-modules-jsi] Task+immediate.swift already patched.');
  }
}

// 3. Patch JavaScriptPromise.swift
// Add `nonisolated init() {}` to `@JavaScriptActor private final class LongLivedState`
const jsPromiseFile = path.join(
  rootDir,
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptPromise.swift'
);

if (fs.existsSync(jsPromiseFile)) {
  let content = fs.readFileSync(jsPromiseFile, 'utf8').replace(/\r\n/g, '\n');
  const target = '  @JavaScriptActor\n  private final class LongLivedState: LongLivedObject {';
  const replacement = '  @JavaScriptActor\n  private final class LongLivedState: LongLivedObject {\n    nonisolated init() {}';

  if (content.includes(target) && !content.includes('nonisolated init() {}')) {
    content = content.replace(target, replacement);
    fs.writeFileSync(jsPromiseFile, content, 'utf8');
    console.log('[patch-expo-modules-jsi] Patched JavaScriptPromise.swift.');
  } else {
    console.log('[patch-expo-modules-jsi] JavaScriptPromise.swift already patched.');
  }
}

// 4. Patch JavaScriptCallback.swift
const jsCallbackFile = path.join(
  rootDir,
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptCallback.swift'
);

if (fs.existsSync(jsCallbackFile)) {
  let content = fs.readFileSync(jsCallbackFile, 'utf8').replace(/\r\n/g, '\n');
  let modified = false;

  if (content.includes('@JavaScriptActor @Sendable\n    func call(')) {
    content = content.replace(/@JavaScriptActor @Sendable\n    func call\(/g, '@JavaScriptActor\n    func call(');
    modified = true;
  }

  const target = '  @JavaScriptActor\n  private final class LongLivedState: LongLivedObject {';
  const replacement = '  @JavaScriptActor\n  private final class LongLivedState: LongLivedObject {\n    nonisolated init() {}';
  if (content.includes(target) && !content.includes('nonisolated init() {}')) {
    content = content.replace(target, replacement);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(jsCallbackFile, content, 'utf8');
    console.log('[patch-expo-modules-jsi] Patched JavaScriptCallback.swift.');
  } else {
    console.log('[patch-expo-modules-jsi] JavaScriptCallback.swift already patched.');
  }
}

// 5. Patch Package.swift files
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
    let pkgContent = fs.readFileSync(pkgFile, 'utf8').replace(/\r\n/g, '\n');
    let modified = false;

    if (pkgContent.includes('// swift-tools-version: 6.2')) {
      pkgContent = pkgContent.replace('// swift-tools-version: 6.2', '// swift-tools-version: 6.0');
      modified = true;
    }

    if (relPath.includes('expo-modules-jsi')) {
      if (pkgContent.includes('.enableUpcomingFeature("NonisolatedNonsendingByDefault")') && !pkgContent.includes('// .enableUpcomingFeature("NonisolatedNonsendingByDefault")')) {
        pkgContent = pkgContent.replace('.enableUpcomingFeature("NonisolatedNonsendingByDefault"),', '// .enableUpcomingFeature("NonisolatedNonsendingByDefault"),');
        modified = true;
      }
      if (pkgContent.includes('.enableUpcomingFeature("InferIsolatedConformances")') && !pkgContent.includes('// .enableUpcomingFeature("InferIsolatedConformances")')) {
        pkgContent = pkgContent.replace('.enableUpcomingFeature("InferIsolatedConformances"),', '// .enableUpcomingFeature("InferIsolatedConformances"),');
        modified = true;
      }
      if (!pkgContent.includes('.enableUpcomingFeature("BareSlashRegexLiterals")')) {
        pkgContent = pkgContent.replace(
          '.interoperabilityMode(.Cxx),',
          '.interoperabilityMode(.Cxx),\n        .enableUpcomingFeature("BareSlashRegexLiterals"),\n        .enableUpcomingFeature("IsolatedDefaultValues"),'
        );
        modified = true;
      }
      if (pkgContent.includes('"-Werror", "ImplicitStrongCapture",') && !pkgContent.includes('// "-Werror", "ImplicitStrongCapture",')) {
        pkgContent = pkgContent.replace('"-Werror", "ImplicitStrongCapture",', '// "-Werror", "ImplicitStrongCapture",');
        modified = true;
      }
      if (pkgContent.includes('"-Werror", "NoUsage",') && !pkgContent.includes('// "-Werror", "NoUsage",')) {
        pkgContent = pkgContent.replace('"-Werror", "NoUsage",', '// "-Werror", "NoUsage",');
        modified = true;
      }
      if (!pkgContent.includes('"-strict-concurrency=minimal"')) {
        pkgContent = pkgContent.replace(
          '.unsafeFlags([',
          '.unsafeFlags([\n          "-strict-concurrency=minimal",'
        );
        modified = true;
      }
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

// 6. Patch node_modules/expo/Expo.podspec to use Swift 5.9 mode like other Expo pods
const expoPodspec = path.join(rootDir, 'node_modules/expo/Expo.podspec');
if (fs.existsSync(expoPodspec)) {
  let podContent = fs.readFileSync(expoPodspec, 'utf8').replace(/\r\n/g, '\n');
  if (podContent.includes("s.swift_version  = '6.0'")) {
    podContent = podContent.replace("s.swift_version  = '6.0'", "s.swift_version  = '5.9'");
    fs.writeFileSync(expoPodspec, podContent, 'utf8');
    console.log('[patch-expo-modules-jsi] Patched node_modules/expo/Expo.podspec swift_version to 5.9.');
  }
}
