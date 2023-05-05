/***************************************************************************************
 *  Bigwave Robotics Fome
 ***************************************************************************************/

/* eslint-disable brace-style */
/*jshint esversion: 6 */

const BigwaveRoboticsBase = require('./BigwaveRoboticsBase');


class BigwaveRoboticsFome extends BigwaveRoboticsBase {
    constructor() {
        super();

        this.log('Bigwave Robotics Fome - constructor()');

        this.targetDeviceID = '500101';
        this.arrayRequestData = null;
    }
}

module.exports = new BigwaveRoboticsFome();

