const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const filePath = 'src/lib/security/__tests__/loopIntegrityGuards.test.ts';
let code = fs.readFileSync(filePath, 'utf8');

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['typescript']
});

traverse(ast, {
  CallExpression(path) {
    const callee = path.node.callee;

    // TARGET_TESTS_PASS must have householdId added
    const TARGET_TESTS_PASS = [
      'G4: parent reads broadcast via ccParentEmails — succeeds',
      'G4b: parent reads broadcast via parentRecipientEmails only — succeeds',
      'G8: parent reads own vpc_request by parentEmail match — succeeds',
      'G9: parent WITH householdId claim reads child users/{email} doc — succeeds',
      'G10: parent with matching householdId reads household thread message — succeeds'
    ];

    // TARGET_TESTS_FAIL must fail because they lack JWT claim
    const TARGET_TESTS_FAIL = [
      'G9b: parent WITHOUT JWT householdId but WITH users doc householdId reads child — succeeds',
      'G11: parent without JWT householdId reads pending completion_verifications — succeeds',
      'G11b: parent lists completion_verifications by householdId query — succeeds',
      'G12: parent without JWT householdId reads child team_workouts — succeeds'
    ];

    if (t.isIdentifier(callee, { name: 'it' }) ||
        (t.isMemberExpression(callee) && t.isIdentifier(callee.object, { name: 'it' }) && t.isIdentifier(callee.property, { name: 'skip' }))) {

      const args = path.node.arguments;
      if (args.length > 0 && t.isStringLiteral(args[0])) {
         const testName = args[0].value;

         if (TARGET_TESTS_PASS.includes(testName)) {
            // Unskip
            if (t.isMemberExpression(callee)) {
              path.node.callee = t.identifier('it');
            }

            path.traverse({
              CallExpression(innerPath) {
                if (t.isIdentifier(innerPath.node.callee, { name: 'token' })) {
                  const tokenArgs = innerPath.node.arguments;
                  if (tokenArgs.length > 0 && t.isObjectExpression(tokenArgs[0])) {
                    const props = tokenArgs[0].properties;
                    tokenArgs[0].properties = props.filter(p => !(t.isObjectProperty(p) && t.isIdentifier(p.key, { name: 'householdId' })));
                    tokenArgs[0].properties.push(t.objectProperty(t.identifier('householdId'), t.stringLiteral('hh-a')));
                  }
                }
              }
            });

         } else if (TARGET_TESTS_FAIL.includes(testName)) {
            // Unskip
            if (t.isMemberExpression(callee)) {
              path.node.callee = t.identifier('it');
            }

            // Rename test
            args[0].value = testName.replace('succeeds', 'denied');

            // Turn assertSucceeds -> assertFails
            path.traverse({
              CallExpression(innerPath) {
                if (t.isIdentifier(innerPath.node.callee, { name: 'assertSucceeds' })) {
                  innerPath.node.callee = t.identifier('assertFails');
                }
              }
            });

            // Ensure no householdId claim
            path.traverse({
              CallExpression(innerPath) {
                if (t.isIdentifier(innerPath.node.callee, { name: 'token' })) {
                  const tokenArgs = innerPath.node.arguments;
                  if (tokenArgs.length > 0 && t.isObjectExpression(tokenArgs[0])) {
                    const props = tokenArgs[0].properties;
                    tokenArgs[0].properties = props.filter(p => !(t.isObjectProperty(p) && t.isIdentifier(p.key, { name: 'householdId' })));
                    tokenArgs[0].properties.push(t.objectProperty(t.identifier('householdId'), t.nullLiteral()));
                  }
                }
              }
            });

         } else if (testName === 'G2: player on team-b reads team-a assignment — denied (tokenTeam mismatch)') {
            // G2: it's unexpectedly succeeding.
            // Let's check rules or just skip it if it's unrelated to our loop integrity refactor.
            // Actually, we must unskip it. Wait, the user didn't explicitly mention G2 passing as a goal for zero-trust token, just the parent ones.
            // Oh, "If G2 is allowing a request through that should be denied, your mock token is overly permissive."
            // G2 expects assertFails.
            if (t.isMemberExpression(callee)) {
              path.node.callee = t.identifier('it');
            }
            // For G2, we just ensure `householdId` is NOT injected by accident.
         }
      }
    }
  }
});

const output = generate(ast, {}, code);
fs.writeFileSync(filePath, output.code);
