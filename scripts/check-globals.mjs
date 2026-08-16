import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import ts from "typescript";

const allowlistPath = "scripts/allowed-globals.json";
const scanExtensions = new Set([".js", ".mjs", ".html"]);
const globalNames = new Set(["globalThis", "window"]);
const accessKinds = new Set([
  "bare",
  "direct",
  "computed",
  "optional-direct",
  "optional-computed",
]);
const allowanceCategories = new Set(["production-platform-boundary", "test-fixture"]);
const productionBoundaryKeys = new Set([
  allowanceKey("src/app/production-module-autoboot.js", "bare", "globalThis"),
  allowanceKey("src/game.js", "bare", "globalThis"),
]);

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  runGlobalCheck();
}

function runGlobalCheck() {
  const policy = readPolicy();
  const configuration = normalizePolicy(policy);
  const files = [
    ...configuration.scanRoots.flatMap(listFiles),
    ...configuration.scanFiles.filter((file) => existsSync(file)),
  ].sort();
  const scanResults = files.map(scanFile);
  const hits = scanResults.flatMap((result) => result.hits);
  const parseFailures = scanResults.flatMap((result) => result.parseFailures);
  const allowanceResult = applyAllowances(hits, configuration.allowances);
  const failures = [
    ...configuration.errors,
    ...parseFailures,
    ...allowanceResult.unapproved.map((hit) =>
      `unapproved browser-global coupling: ${formatHit(hit)}`
    ),
    ...allowanceResult.stale.map(
      (allowance) =>
        `stale declared allowance: ${formatAllowance(allowance)} expects ${allowance.count} usage(s), ` +
        `found ${allowanceResult.actualCounts.get(allowance.key) || 0}`
    ),
  ];

  console.log("# Tap Survivor Global Usage Check");
  console.log(`- files scanned: ${files.length}`);
  console.log(`- JavaScript/ESM units parsed: ${scanResults.reduce((sum, result) => sum + result.units, 0)}`);
  console.log(`- detected browser-global accesses: ${hits.length}`);
  console.log(
    `- declared production platform boundaries: ${configuration.allowances.filter(
      (allowance) => allowance.category === "production-platform-boundary"
    ).length}`
  );
  console.log(
    `- declared test-fixture references: ${configuration.allowances.filter(
      (allowance) => allowance.category === "test-fixture"
    ).length}`
  );

  if (allowanceResult.allowed.length) {
    console.log("\n## Allowed Boundaries And Fixtures");
    allowanceResult.allowed.forEach(({ allowance, hit }) => {
      console.log(`- [${allowance.category}] ${formatHit(hit)} — ${allowance.reason}`);
    });
  }

  if (allowanceResult.unapproved.length) {
    console.log("\n## Unapproved Browser-Global Coupling");
    allowanceResult.unapproved.forEach((hit) => console.log(`FAIL ${formatHit(hit)}`));
  }

  if (allowanceResult.stale.length) {
    console.log("\n## Stale Declared Allowances");
    allowanceResult.stale.forEach((allowance) => {
      const actual = allowanceResult.actualCounts.get(allowance.key) || 0;
      console.log(
        `FAIL ${formatAllowance(allowance)} expects ${allowance.count} usage(s), found ${actual}`
      );
    });
  }

  if (parseFailures.length) {
    console.log("\n## Parse Failures");
    parseFailures.forEach((failure) => console.log(`FAIL ${failure}`));
  }

  if (configuration.errors.length) {
    console.log("\n## Policy Errors");
    configuration.errors.forEach((failure) => console.log(`FAIL ${failure}`));
  }

  if (failures.length) {
    process.exitCode = 1;
    return;
  }

  console.log("\nPASS only declared production platform boundaries and test fixtures use browser globals");
}

function readPolicy() {
  try {
    return JSON.parse(readFileSync(allowlistPath, "utf8"));
  } catch (error) {
    console.error(`FAIL unable to read ${allowlistPath}: ${error.message}`);
    process.exit(1);
  }
}

function normalizePolicy(policy) {
  const errors = [];
  const scanRoots = normalizePathList(policy.scanRoots, "scanRoots", errors);
  const scanFiles = normalizePathList(policy.scanFiles, "scanFiles", errors);
  const rawAllowances = Array.isArray(policy.allowedUsages) ? policy.allowedUsages : [];
  if (!Array.isArray(policy.allowedUsages)) {
    errors.push("allowedUsages must be an array");
  }

  const allowances = [];
  const seenKeys = new Set();
  rawAllowances.forEach((rawAllowance, index) => {
    const allowance = normalizeAllowance(rawAllowance, index, errors);
    if (!allowance) return;
    if (seenKeys.has(allowance.key)) {
      errors.push(`allowedUsages[${index}] duplicates ${formatAllowance(allowance)}`);
      return;
    }
    seenKeys.add(allowance.key);
    allowances.push(allowance);
  });

  return { allowances, errors, scanFiles, scanRoots };
}

function normalizePathList(value, name, errors) {
  if (!Array.isArray(value) || !value.length || value.some((entry) => typeof entry !== "string" || !entry)) {
    errors.push(`${name} must be a non-empty array of repository-relative paths`);
    return [];
  }
  return value;
}

function normalizeAllowance(rawAllowance, index, errors) {
  if (!rawAllowance || typeof rawAllowance !== "object" || Array.isArray(rawAllowance)) {
    errors.push(`allowedUsages[${index}] must be an object`);
    return null;
  }

  const { access, category, count, expression, file, reason } = rawAllowance;
  const label = `allowedUsages[${index}]`;
  if (!allowanceCategories.has(category)) {
    errors.push(`${label}.category must be production-platform-boundary or test-fixture`);
  }
  if (typeof file !== "string" || !file) errors.push(`${label}.file must be a repository-relative path`);
  if (!accessKinds.has(access)) errors.push(`${label}.access is not a supported access kind`);
  if (typeof expression !== "string" || !expression) errors.push(`${label}.expression must be a string`);
  if (!Number.isInteger(count) || count < 1) errors.push(`${label}.count must be a positive integer`);
  if (typeof reason !== "string" || !reason.trim()) errors.push(`${label}.reason must explain the allowance`);

  if (
    !allowanceCategories.has(category) ||
    typeof file !== "string" ||
    !accessKinds.has(access) ||
    typeof expression !== "string" ||
    !Number.isInteger(count) ||
    count < 1 ||
    typeof reason !== "string" ||
    !reason.trim()
  ) {
    return null;
  }

  const key = allowanceKey(file, access, expression);
  if (category === "production-platform-boundary" && !productionBoundaryKeys.has(key)) {
    errors.push(`${label} is not one of the approved production platform injection boundaries`);
  }
  if (category === "test-fixture" && !file.startsWith("tests/fixtures/")) {
    errors.push(`${label}.file must stay under tests/fixtures/ for a test-fixture allowance`);
  }

  return { access, category, count, expression, file, key, reason: reason.trim() };
}

function listFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((name) => {
    const file = join(root, name);
    const stat = statSync(file);
    if (stat.isDirectory()) return listFiles(file);
    if (!scanExtensions.has(extname(file))) return [];
    return [file];
  });
}

function scanFile(file) {
  const text = readFileSync(file, "utf8");
  const sources = file.endsWith(".html") ? extractInlineScripts(text) : [{ code: text, lineOffset: 0 }];
  const hits = [];
  const parseFailures = [];

  sources.forEach(({ code, lineOffset }) => {
    const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    sourceFile.parseDiagnostics.forEach((diagnostic) => {
      const location = sourceFile.getLineAndCharacterOfPosition(diagnostic.start || 0);
      parseFailures.push(
        `${file}:${location.line + lineOffset + 1}:${location.character + 1} ${ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          " "
        )}`
      );
    });
    hits.push(...findGlobalAccesses(sourceFile, file, lineOffset));
  });

  return { hits, parseFailures, units: sources.length };
}

function extractInlineScripts(html) {
  const scripts = [];
  const pattern = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/giu;
  for (const match of html.matchAll(pattern)) {
    const source = match[1] || "";
    const sourceStart = (match.index || 0) + match[0].indexOf(">") + 1;
    const lineOffset = html.slice(0, sourceStart).split("\n").length - 1;
    scripts.push({ code: source, lineOffset });
  }
  return scripts;
}

function findGlobalAccesses(sourceFile, file, lineOffset = 0) {
  const hits = [];

  function visit(node, scopeStack) {
    const nextScopeStack = isScope(node)
      ? [...scopeStack, collectDirectBindings(node)]
      : scopeStack;

    if (ts.isPropertyAccessExpression(node) && isAmbientGlobalIdentifier(node.expression, nextScopeStack)) {
      hits.push(
        createHit({
          access: node.questionDotToken ? "optional-direct" : "direct",
          expression: `${node.expression.text}${node.questionDotToken ? "?." : "."}${node.name.text}`,
          file,
          lineOffset,
          node,
          sourceFile,
        })
      );
      ts.forEachChild(node, (child) => {
        if (child !== node.expression && child !== node.name) visit(child, nextScopeStack);
      });
      return;
    }

    if (ts.isElementAccessExpression(node) && isAmbientGlobalIdentifier(node.expression, nextScopeStack)) {
      hits.push(
        createHit({
          access: node.questionDotToken ? "optional-computed" : "computed",
          expression: formatElementExpression(node),
          file,
          lineOffset,
          node,
          sourceFile,
        })
      );
      if (node.argumentExpression) visit(node.argumentExpression, nextScopeStack);
      return;
    }

    if (isAmbientGlobalIdentifier(node, nextScopeStack)) {
      hits.push(
        createHit({
          access: "bare",
          expression: node.text,
          file,
          lineOffset,
          node,
          sourceFile,
        })
      );
    }

    ts.forEachChild(node, (child) => visit(child, nextScopeStack));
  }

  visit(sourceFile, []);
  return hits;
}

function createHit({ access, expression, file, lineOffset, node, sourceFile }) {
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    access,
    column: location.character + 1,
    expression,
    file,
    key: allowanceKey(file, access, expression),
    line: location.line + lineOffset + 1,
  };
}

function isAmbientGlobalIdentifier(node, scopeStack) {
  if (!ts.isIdentifier(node) || !globalNames.has(node.text) || isNonReferenceIdentifier(node)) {
    return false;
  }
  return !scopeStack.some((scope) => scope.has(node.text));
}

function isNonReferenceIdentifier(node) {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isMethodDeclaration(parent) && parent.name === node) return true;
  if (ts.isPropertyDeclaration(parent) && parent.name === node) return true;
  if (ts.isBindingElement(parent) && parent.name === node) return true;
  if (ts.isVariableDeclaration(parent) && parent.name === node) return true;
  if (ts.isParameter(parent) && parent.name === node) return true;
  if (ts.isFunctionDeclaration(parent) && parent.name === node) return true;
  if (ts.isFunctionExpression(parent) && parent.name === node) return true;
  if (ts.isClassDeclaration(parent) && parent.name === node) return true;
  if (ts.isClassExpression(parent) && parent.name === node) return true;
  if (ts.isImportSpecifier(parent) && parent.name === node) return true;
  if (ts.isImportClause(parent) && parent.name === node) return true;
  if (ts.isNamespaceImport(parent) && parent.name === node) return true;
  return false;
}

function formatElementExpression(node) {
  const root = node.expression.text;
  const optionalMarker = node.questionDotToken ? "?." : "";
  const argument = node.argumentExpression;
  if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
    return `${root}${optionalMarker}[${JSON.stringify(argument.text)}]`;
  }
  if (argument && ts.isNumericLiteral(argument)) return `${root}${optionalMarker}[${argument.text}]`;
  return `${root}${optionalMarker}[<computed>]`;
}

function isScope(node) {
  return (
    ts.isSourceFile(node) ||
    ts.isBlock(node) ||
    ts.isModuleBlock(node) ||
    ts.isCatchClause(node) ||
    ts.isFunctionLike(node)
  );
}

function collectDirectBindings(node) {
  const bindings = new Set();
  if (ts.isSourceFile(node) || ts.isBlock(node) || ts.isModuleBlock(node)) {
    node.statements.forEach((statement) => collectStatementBindings(statement, bindings));
  }
  if (ts.isFunctionLike(node)) {
    node.parameters.forEach((parameter) => collectBindingNames(parameter.name, bindings));
    if (node.name && ts.isIdentifier(node.name)) bindings.add(node.name.text);
  }
  if (ts.isCatchClause(node) && node.variableDeclaration) {
    collectBindingNames(node.variableDeclaration.name, bindings);
  }
  return bindings;
}

function collectStatementBindings(statement, bindings) {
  if (ts.isVariableStatement(statement)) {
    statement.declarationList.declarations.forEach((declaration) =>
      collectBindingNames(declaration.name, bindings)
    );
    return;
  }
  if (
    (ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isModuleDeclaration(statement)) &&
    statement.name
  ) {
    bindings.add(statement.name.text);
    return;
  }
  if (ts.isImportDeclaration(statement) && statement.importClause) {
    const { importClause } = statement;
    if (importClause.name) bindings.add(importClause.name.text);
    if (importClause.namedBindings) {
      if (ts.isNamespaceImport(importClause.namedBindings)) {
        bindings.add(importClause.namedBindings.name.text);
      } else {
        importClause.namedBindings.elements.forEach((element) => bindings.add(element.name.text));
      }
    }
  }
}

function collectBindingNames(name, bindings) {
  if (ts.isIdentifier(name)) {
    bindings.add(name.text);
    return;
  }
  name.elements.forEach((element) => {
    if (ts.isOmittedExpression(element)) return;
    collectBindingNames(element.name, bindings);
  });
}

function applyAllowances(hits, allowances) {
  const allowancesByKey = new Map(allowances.map((allowance) => [allowance.key, allowance]));
  const actualCounts = new Map();
  const allowed = [];
  const unapproved = [];

  hits.forEach((hit) => {
    const count = (actualCounts.get(hit.key) || 0) + 1;
    actualCounts.set(hit.key, count);
    const allowance = allowancesByKey.get(hit.key);
    if (allowance && count <= allowance.count) {
      allowed.push({ allowance, hit });
      return;
    }
    unapproved.push(hit);
  });

  const stale = allowances.filter((allowance) => (actualCounts.get(allowance.key) || 0) < allowance.count);
  return { actualCounts, allowed, stale, unapproved };
}

function allowanceKey(file, access, expression) {
  return `${file}\u0000${access}\u0000${expression}`;
}

function formatHit(hit) {
  return `${hit.file}:${hit.line}:${hit.column} ${hit.access} ${hit.expression}`;
}

function formatAllowance(allowance) {
  return `[${allowance.category}] ${allowance.file} ${allowance.access} ${allowance.expression}`;
}

function runSelfTest() {
  const cases = [
    {
      name: "strings and comments are ignored",
      source: `// globalThis.TapSurvivorRetired\nconst example = "window.TapSurvivorRetired";\n/* globalThis["TapSurvivorRetired"] */`,
      expected: [],
    },
    {
      name: "dot access is detected",
      source: "globalThis.TapSurvivorRetired;",
      expected: [{ access: "direct", expression: "globalThis.TapSurvivorRetired" }],
    },
    {
      name: "computed access is detected",
      source: 'window["TapSurvivorRetired"];',
      expected: [{ access: "computed", expression: 'window["TapSurvivorRetired"]' }],
    },
    {
      name: "optional access is detected",
      source: "globalThis?.TapSurvivorRetired;",
      expected: [{ access: "optional-direct", expression: "globalThis?.TapSurvivorRetired" }],
    },
    {
      name: "bare global acquisition is detected",
      source: "const root = globalThis;",
      expected: [{ access: "bare", expression: "globalThis" }],
    },
    {
      name: "computed keys are still scanned",
      source: 'globalThis[window["TapSurvivorRetired"]];',
      expected: [
        { access: "computed", expression: "globalThis[<computed>]" },
        { access: "computed", expression: 'window["TapSurvivorRetired"]' },
      ],
    },
  ];

  cases.forEach(({ expected, name, source }) => {
    const hits = findGlobalAccesses(
      ts.createSourceFile(`self-test/${name}.mjs`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS),
      `self-test/${name}.mjs`
    );
    assert(
      JSON.stringify(hits.map(({ access, expression }) => ({ access, expression }))) === JSON.stringify(expected),
      `${name}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(
        hits.map(({ access, expression }) => ({ access, expression }))
      )}`
    );
  });

  const allowedBoundary = {
    access: "bare",
    category: "production-platform-boundary",
    count: 1,
    expression: "globalThis",
    file: "src/app/production-module-autoboot.js",
    key: allowanceKey("src/app/production-module-autoboot.js", "bare", "globalThis"),
    reason: "Self-test platform boundary.",
  };
  const boundaryHits = findGlobalAccesses(
    ts.createSourceFile(
      allowedBoundary.file,
      "bootProductionModuleRuntime({ globalRef: globalThis });",
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS
    ),
    allowedBoundary.file
  );
  const boundaryResult = applyAllowances(boundaryHits, [allowedBoundary]);
  assert(
    boundaryResult.allowed.length === 1 && !boundaryResult.unapproved.length && !boundaryResult.stale.length,
    "allowed boundary is not accepted"
  );

  const shadowedHits = findGlobalAccesses(
    ts.createSourceFile(
      "self-test/shadowed.mjs",
      "function inject(globalThis) { return globalThis.platform; }",
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS
    ),
    "self-test/shadowed.mjs"
  );
  assert(!shadowedHits.length, "shadowed global parameter was treated as ambient coupling");

  console.log("# Tap Survivor Global Usage Check Self-Test");
  cases.forEach(({ name }) => console.log(`PASS ${name}`));
  console.log("PASS allowed boundary is distinguished from unapproved coupling");
  console.log("PASS local shadowing is not treated as ambient coupling");
}

function assert(condition, message) {
  if (!condition) throw new Error(`Global guard self-test failed: ${message}`);
}
