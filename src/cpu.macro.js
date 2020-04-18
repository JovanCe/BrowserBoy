/**
 * @author Jovan Cejovic <jovan.cejovic@gmail.com>
 */

/**
 * This code is executed withing node which is why we don't have es6 imports.
 */
const {createMacro} = require('babel-plugin-macros');
const traverse = require('@babel/traverse').default;

module.exports = createMacro(inlineMacro);

function inlineMacro({references, state, babel}) {
    let t = babel.types;
    let protoFuncPath;
    references.default.map(referencePath => {
        let args = referencePath.parentPath.get("arguments");
        let argFunc = args.shift();
        let funcName = argFunc.node.property.name;
        traverse(argFunc.hub.file.ast, {
            ClassMethod(path) {
                if(path.node.key.name === funcName) {
                    protoFuncPath = path;
                    let paramNames = path.node.params.map((param) => param.name);
                    if(paramNames.length !== args.length) {
                        throw new Error("Number of provided arguments does not match the function signature");
                    }
                    let newNode = t.ClassMethod(path.node.kind, referencePath.parentPath.parentPath.node.key,
                        [], t.cloneDeep(path.node.body), false, false);
                    referencePath.parentPath.parentPath.insertAfter(newNode);
                    traverse(newNode, {
                        Identifier(path) {
                            for(let i=0; i<paramNames.length; i++) {
                                if(path.node.name === paramNames[i]) {
                                    path.node.name = args[i];
                                }
                            }
                        }
                    }, path.scope, path.parentPath);
                    referencePath.parentPath.parentPath.remove();
                }
            }
        });
    });
    //protoFuncPath.remove();
}