/* eslint-disable brace-style */
/*jshint esversion: 6 */

const BigwaveRoboticsBase = require('./BigwaveRoboticsBase');


/***************************************************************************************
 *  BYROBOT Battle Drone Controller
 ***************************************************************************************/

class BigwaveRoboticsFome extends BigwaveRoboticsBase
{
    /*
        생성자
    */
    constructor()
    {
        super();

        this.log('Bigwave Robotics Fome - constructor()');

        this.targetDevice     = 0x20;
        this.targetDeviceID   = '0F0C01';
        this.arrayRequestData = null;
    }
}

module.exports = new BigwaveRoboticsFome();
