#!/usr/bin/env node

import fs from "fs";
import * as glob from "glob";
import path from "path";

import { Command } from "commander";
const program = new Command();

import * as oad from "@azure/oad";

program
  .name("check-breaking-changes")
  .description("Check for breaking changes")
  .argument("basePath", "Path to the base (stable) version")
  .argument("newPath", "Path to the new version to check");

program.parse();
const options = program.opts();

function getJsonFiles(dirPath) {
  // glob does not work with windows path separators, so we convert to posix
  return glob.sync(path.join(dirPath, "*.json").split(path.sep).join(path.posix.sep));
}

const baseFiles = getJsonFiles(program.args[0]);
const newFiles = getJsonFiles(program.args[1]);

const fullDiff = [];

// For each new file, check if it exists in the base folder, and if so, compare the two using openapi-diff
for (const newFile of newFiles) {
  const newFileName = path.basename(newFile);
  const baseFile = path.join(program.args[0], newFileName);
  if (baseFiles.includes(baseFile)) {
    const diff = await openApiDiff(baseFile, newFile);
    if (diff) {
      fullDiff.push(...diff);
      // for testing
      //break;
    }
  }
}

// Filter out non-breaking changes
const breakingChanges = [
  "AddedRequiredProperty",
  "AddedXmsEnum",
  "AddingRequiredParameter",
  "AddingResponseCode",
  "ArrayCollectionFormatChanged",
  "ChangedParameterOrder",
  "ConstraintChanged",
  "ConstraintIsStronger",
  "ConstraintIsWeaker",
  "DefaultValueChanged",
  "DifferentDiscriminator",
  "ModifiedOperationId",
  "ParameterInHasChanged",
  "ProtocolNoLongerSupported",
  "ReadonlyPropertyChanged",
  "RemovedAdditionalProperties",
  "RemovedClientParameter",
  "RemovedDefinition",
  "RemovedEnumValue",
  "RemovedOperation",
  "RemovedPath",
  "RemovedProperty",
  "RemovedRequiredParameter",
  "RemovedXmsEnum",
  "RequestBodyFormatNoLongerSupported",
  "RequiredStatusChange",
  "TypeFormatChanged",
  "XmsEnumChanged",
  "XmsLongRunningOperationChanged"
]
const breakingChangesOnly = fullDiff.filter((diff) => breakingChanges.includes(diff.code));

// Write the output to a file
const outputFileName = "breaking-changes.json";
const output = JSON.stringify(breakingChangesOnly, null, 2);
fs.writeFileSync(outputFileName, output);

/**
 * Compares old and new specifications for breaking change detection.
 *
 * @param oldSpec Path to the old swagger specification file.
 *
 * @param newSpec Path to the new swagger specification file.
 */
async function openApiDiff(oldSpec, newSpec) {
  const oadOut = await oad.compare(oldSpec, newSpec, { consoleLogLevel: "off" });

  // fix up output from OAD, it does not output valid JSON
  const result = oadOut.replace(/}\s+{/gi, "},{");

  //console.log(result);
  const oadResult = JSON.parse(result || "[]");

  return oadResult;
}
