import * as fs from 'fs';
import * as path from 'path';
import { Project, SourceFile, FunctionDeclaration } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: "tsconfig.json"
});

const sourceFiles = project.getSourceFiles();

sourceFiles.forEach((sourceFile: SourceFile) => {
  // Add return types to functions
  sourceFile.getFunctions().forEach((func: FunctionDeclaration) => {
    if (!func.getReturnTypeNode()) {
      func.setReturnType('void');
    }
  });
  // Prefix unused variables
  sourceFile.getVariableDeclarations().forEach((variable: any) => {
    if (!variable.isReferenced()) {
      variable.rename(`_${variable.getName()}`);
    }
  });

  // Save changes
  sourceFile.save();
}); 