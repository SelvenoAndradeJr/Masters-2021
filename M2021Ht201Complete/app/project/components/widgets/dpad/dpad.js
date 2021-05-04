/**
 * Copyright (C) 2021 to the present, Crestron Electronics, Inc.
 * All rights reserved.
 * No part of this software may be reproduced in any form, machine
 * or natural, without the express written consent of Crestron Electronics.
 * Use of this source code is subject to the terms of the Crestron Software License Agreement 
 * under which you licensed this source code.  
 *
 * This code was generated automatically by Crestron's code generation tool.
*/
/*jslint es6 */
/*global serviceModule */

let dpadModule = (function () {
    'use strict';

    let outputValue = true;

    /**
     * Initialize Method
     */
    function onInit() {
       serviceModule.addEmulatorScenarioNoControlSystem("./app/project/components/widgets/dpad/dpad-emulator.json");
       // Uncomment the below line and comment the above to load the emulator all the time.
       // serviceModule.addEmulatorScenario("./app/project/components/widgets/dpad/dpad-emulator.json");
    }

    /**
     * Declare your Public Methods here
     */
    function getOutput() {
        return outputValue;
    }

    /**
     * All public or private methods which need to call onInit
     */
    const dpadWidget = document.querySelector('#dpad-import-widget');
    if (dpadWidget !== null) {
        dpadWidget.addEventListener('afterLoad', onInit);
    }

    /**
     * All public method and properties are exported here
     */
    return {
        getOutput: getOutput
    };

}());