// Copyright (C) 2020 to the present, Crestron Electronics, Inc.
// All rights reserved.
// No part of this software may be reproduced in any form, machine
// or natural, without the express written consent of Crestron Electronics.
// Use of this source code is subject to the terms of the Crestron Software License Agreement
// under which you licensed this source code.
const fs = require("fs"); // global object - always available
const process = require("process"); // global object - always available
const fsExtra = require("fs-extra");
const path = require('path');
const zl = require("zip-lib");
const rimraf = require("rimraf");
const findRemoveSync = require('find-remove');

process.env["NODE_CONFIG_DIR"] = "./shell-utilities/config/";
const config = require("config");

const componentHelper = require("../helpers/components");
const logger = require("../helpers/logger");
const utils = require("../helpers/utils");

const exportLibraries = {

  CONFIG_FILE: config.exportLibraries,
  FINAL_OUTPUT_ZIP_FILE: "",
  outputResponse: {},

  /**
   * Public Method called to exporting libraries
   */
  run() {
    const processArgs = componentHelper.processArgs();
    if (processArgs["help"] === true) {
      componentHelper.displayHelp(this.CONFIG_FILE.templatesPath + "help.template");
    } else {
      this.exportLibraries(processArgs);
    }
  },

  /**
   * Method for exporting libraries
   */
  async exportLibraries(processArgs) {
    this.outputResponse = {};
    this.FINAL_OUTPUT_ZIP_FILE = path.join(this.CONFIG_FILE.zipFileDestinationPath, this.CONFIG_FILE.outputFileName);

    if (processArgs["all"] === true) {
      if (fs.existsSync(this.CONFIG_FILE.requiredFolderPath)) {
        if (fs.readdirSync(this.CONFIG_FILE.requiredFolderPath).length > 0) {
          await this.copyAndZipFiles([], true);
        } else {
          this.outputResponse['result'] = false;
          this.outputResponse['errorMessage'] = this.getText("FAILURE_MESSAGE_NO_FILES_IN_DIR");
          this.logFinalResponses();
        }
      } else {
        this.outputResponse['result'] = false;
        this.outputResponse['errorMessage'] = this.getText("FAILURE_MESSAGE_NO_DIR");
        this.logFinalResponses();
      }
    } else {
      let inputNames = processArgs["list"];
      logger.log("inputNames", inputNames);
      if (inputNames && inputNames.length > 0) {
        await this.copyAndZipFiles(inputNames, false);
      } else {
        this.outputResponse['result'] = false;
        this.outputResponse['errorMessage'] = this.getText("FAILURE_MESSAGE_INPUT_PARAMS_EMPTY_IN_REQUEST");
        this.logFinalResponses();
      }
    }
    return this.outputResponse['result'];
  },

  /**
   * Log Final Response Message
   * @param {*} errorMessage 
   */
  logFinalResponses() {
    if (utils.isValidInput(this.outputResponse['errorMessage'])) {
      logger.printError(this.outputResponse['errorMessage']);
    } else {
      if (this.outputResponse['result'] === true) {
        if (this.outputResponse['copyAll'] === true) {
          logger.printSuccess(this.getText("SUCCESS_MESSAGE_ALL", this.FINAL_OUTPUT_ZIP_FILE));
        } else {
          if (this.outputResponse['invalidInputs'].length > 0) {
            logger.printSuccess(this.getText("SUCCESS_MESSAGE_SPECIFIC_WITH_ERROR", this.FINAL_OUTPUT_ZIP_FILE, utils.convertArrayToString(this.outputResponse['validInputs'], ", "), utils.convertArrayToString(this.outputResponse['invalidInputs'], ", ")));
          } else {
            logger.printSuccess(this.getText("SUCCESS_MESSAGE_SPECIFIC", this.FINAL_OUTPUT_ZIP_FILE, utils.convertArrayToString(this.outputResponse['validInputs'], ", ")));
          }
        }
      } else {
        logger.printError(this.outputResponse['errorMessage']);
      }
    }
  },

  /**
   * Copy and Zip files
   * @param {*} inputNames 
   * @param {*} copyAll 
   */
  async copyAndZipFiles(inputNames, copyAll) {
    const invalidInputs = [];
    const validInputs = [];
    this.outputResponse['copyAll'] = copyAll;

    let zipFileName = path.join(this.CONFIG_FILE.zipFileDestinationPath, this.CONFIG_FILE.outputFileName);
    logger.log("  Complete File Name: " + zipFileName);
    this.deleteFile(zipFileName);

    const temporaryFolderPath = path.join(this.CONFIG_FILE.zipFileDestinationPath, this.CONFIG_FILE.outputTempFolderName);
    try {
      await rimraf.sync(temporaryFolderPath);
      //Create Temporary Folder for copy files before zipping
      fs.mkdirSync(temporaryFolderPath, {
        recursive: true,
      });
      logger.log("  Temp Folder Path Created: " + temporaryFolderPath);

      if (copyAll === true) {
        fsExtra.copySync(this.CONFIG_FILE.requiredFolderPath, path.join(temporaryFolderPath, this.CONFIG_FILE.zipFolderName, path.normalize(this.CONFIG_FILE.requiredFolderPath)), { recursive: true });
      } else {
        for (let i = 0; i < inputNames.length; i++) {
          if (path.normalize(inputNames[i]).indexOf(path.normalize(this.CONFIG_FILE.requiredFolderPath)) >= 0) {
            if (fs.existsSync(inputNames[i])) {
              const checkFileOrFolder = fs.statSync(inputNames[i]);
              if (checkFileOrFolder && checkFileOrFolder.isFile()) {
                if (validInputs.indexOf(inputNames[i]) === -1) {
                  validInputs.push(inputNames[i]);
                  fsExtra.copySync(inputNames[i], path.join(temporaryFolderPath, this.CONFIG_FILE.zipFolderName, path.normalize(inputNames[i])), { recursive: true });
                }
              } else {
                if (invalidInputs.indexOf(inputNames[i]) === -1) {
                  invalidInputs.push(inputNames[i]);
                }
              }
            } else {
              if (invalidInputs.indexOf(inputNames[i]) === -1) {
                invalidInputs.push(inputNames[i]);
              }
            }
          } else {
            if (invalidInputs.indexOf(inputNames[i]) === -1) {
              invalidInputs.push(inputNames[i]);
            }
          }
        }
      }

      this.outputResponse['validInputs'] = validInputs;
      this.outputResponse['invalidInputs'] = invalidInputs;
      logger.info("Copy Done.");

      if (copyAll === true || validInputs.length > 0) {
        const removedFiles = findRemoveSync(temporaryFolderPath, { extensions: this.CONFIG_FILE.ignoreFilesFolders, files: this.CONFIG_FILE.ignoreFilesFolders });
        logger.log("RemovedFiles", removedFiles);

        const outputArchive = await zl.archiveFolder(temporaryFolderPath, zipFileName).then(async () => {
          logger.info("Zip Done.");
          try {
            await rimraf.sync(temporaryFolderPath);
            logger.info("Clean up Done.");
            this.outputResponse['result'] = true;
            this.outputResponse['errorMessage'] = "";
            this.logFinalResponses();
          } catch (e) {
            this.outputResponse['result'] = false;
            this.outputResponse['errorMessage'] = e;
            this.logFinalResponses();
          }
        }, (err) => {
          this.outputResponse['result'] = false;
          this.outputResponse['errorMessage'] = err;
          this.logFinalResponses();
        });
      } else {
        this.outputResponse['result'] = false;
        if (validInputs.length === 0) {
          this.outputResponse['errorMessage'] = this.getText("FAILURE_MESSAGE_NO_VALID_INPUTS");
        } else {
          this.outputResponse['errorMessage'] = this.getText("FAILURE_MESSAGE_NO_VALID_FILES_IN_DIR");
        }
        this.logFinalResponses();
      }
    } catch (e) {
      this.outputResponse['result'] = false;
      this.outputResponse['errorMessage'] = e;
      this.logFinalResponses();
    }
  },

  /**
   * Get the String text from default.json file in config
   * @param {*} key 
   * @param  {...any} values 
   */
  getText(key, ...values) {
    const DYNAMIC_TEXT_MESSAGES = this.CONFIG_FILE.textMessages;
    return utils.getText(DYNAMIC_TEXT_MESSAGES, key, ...values);
  },

  /**
   * Delete directory by path
   * @param {string} directoryName
   */
  deleteFolder(directoryName) {
    try {
      return rimraf.sync(directoryName);
    } catch (e) {
      return false;
    }
  },

  /**
   * Delete File
   * @param {string} completeFilePath
   */
  async deleteFile(completeFilePath) {
    try {
      return await rimraf.sync(completeFilePath);
    } catch (e) {
      return false;
    }
  }

};

module.exports = exportLibraries;
