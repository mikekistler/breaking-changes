#!/usr/bin/env node

import path from "path";
import util from "util";
import { execSync } from "child_process";

import pkg from "glob";
const { glob } = pkg;

import { Command } from "commander";
const program = new Command();

program
  .name("check-breaking-changes")
  .description("Check for breaking changes")
  .argument("basePath", "Path to the base (stable) version")
  .argument("newPath", "Path to the new version to check")
  .option("-o, --outputFolder <dir>");

program.parse();
const options = program.opts();

// Automatically track and cleanup files at exit
// temp.track();

// List all the *.json files in the base folder
const baseFiles = glob.sync(path.join(program.args[0], "*.json"));

const newFiles = glob.sync(path.join(program.args[1], "*.json"));

// Print the list of files
//console.log("Base files: ", baseFiles);

// For each new file, check if it exists in the base folder, and if so, compare the two using openapi-diff
for (const newFile of newFiles) {
  const newFileName = path.basename(newFile);
  const baseFile = path.join(program.args[0], newFileName);
  if (baseFiles.includes(baseFile)) {
    //console.log("Comparing ", baseFile, " with ", newFile);
    const diff = await openApiDiff(baseFile, newFile);
    if (diff) {
      console.log(diff);
    }
  }
}

/**
 * Compares old and new specifications for breaking change detection.
 *
 * @param oldSpec Path to the old swagger specification file.
 *
 * @param newSpec Path to the new swagger specification file.
 */
async function openApiDiff(oldSpec, newSpec) {
  try {
    const buf = execSync(`oad compare ${oldSpec} ${newSpec}`);

    //console.log(buf.toString());

    // fix up output from OAD, it does not output valid JSON
    const result = buf.toString().replace(/}\s+{/gi, "},{");

    //console.log(result);
    let oadResult = JSON.parse(result || "[]");

    return oadResult;

  } catch (e) {
    console.error(e); // should contain code (exit code) and signal (that caused the termination).
  }
}
