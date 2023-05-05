/* eslint-disable brace-style */
/* eslint-disable max-len */
/*jshint esversion: 6 */
const BaseModule = require('./baseModule');


/***************************************************************************************

    BigwaveRoboticsBase

    Last Update : 2023. 5. 4

 ***************************************************************************************/

class BigwaveRoboticsBase extends BaseModule {
    /***************************************************************************************
     *  클래스 내부에서 사용될 필드들을 이곳에서 선언합니다.
     ***************************************************************************************/
    // #region Constructor

    constructor() {
        super();

        this.log('BigwaveRoboticsBase');
        this.log('BASE - constructor()');

        this.serialport = undefined;
        this.isConnect = false;


        /***************************************************************************************
            로봇에 전달하는 데이터
         ***************************************************************************************/

        /*
            대상 장치로부터 수신 받는 데이터는 모두 _updated 변수를 최상단에 붙임.
            업데이트 된 경우 _updated를 1로 만들고 entry로 전송이 끝나면 다시 0으로 변경
        */

        // Entry -> Device
        this.DataType =
        {
            // 전송 버퍼
            BUFFER_CLEAR: 'buffer_clear',

            // 전송 대상
            TARGET: 'target',

            // Control::Position
            CONTROL_POSITION_X: 'control_position_x',
            CONTROL_POSITION_Y: 'control_position_y',

            // Command
            COMMAND_COMMAND: 'command_command',
            COMMAND_OPTION: 'command_option',
        };


        // -- JSON Objects ----------------------------------------------------------------
        // Device -> Entry

        // Ack
        this.ack =
        {
            _updated: 1,
            ack_systemTime: 0,    // u64
            ack_dataType: 0,    // u8
            ack_crc16: 0,    // u16
        };



        // State
        this.state =
        {
            _updated: 1,
            state_modeMovement: 0,    // u8
            state_battery: 0,    // u8
        };



        // 변수 초기화
        this.clearVariable();

        this.targetDevice = 0;            // 연결 대상 장치 DeviceType
        this.targetDeviceID = undefined;    // 연결 대상 장치의 ID
    }

    // #endregion Constructor



    /***************************************************************************************
     *  Entry 기본 함수
     ***************************************************************************************/
    // #region Base Functions for Entry

    /*
        초기설정

        최초에 커넥션이 이루어진 후의 초기 설정.
        handler 는 워크스페이스와 통신한 데이터를 json 화 하는 오브젝트입니다. (datahandler/json 참고)
        config 은 module.json 오브젝트입니다.
    */
    init(handler, config) {
        super.init(handler, config);

        this.log('BASE - init()');
        //this.resetData();
    }


    /*
        초기 송신데이터(필수)

        연결 후 초기에 송신할 데이터가 필요한 경우 사용합니다.
        requestInitialData 를 사용한 경우 checkInitialData 가 필수입니다.
        이 두 함수가 정의되어있어야 로직이 동작합니다. 필요없으면 작성하지 않아도 됩니다.
    */
    requestInitialData(serialport) {
        this.isConnect = true;
        this.serialport = serialport;

        return true;
        /*
        //this.log(`BASE - requestInitialData(0x${this.targetDevice.toString(16).toUpperCase()})`);
        return this.reservePing(this.targetDevice);
        // */
    }


    /*
        초기 수신데이터 체크(필수)
        연결 후 초기에 수신받아서 정상연결인지를 확인해야하는 경우 사용합니다.
     */
    checkInitialData(data, config) {
        return true;
        /*
        this.log('BASE - checkInitialData()');
        return this.checkInitialAck(data, config);
        // */
    }


    /*
        주기적으로 하드웨어에서 받은 데이터의 검증이 필요한 경우 사용합니다.
    */
    validateLocalData(data) {
        //this.log("BASE - validateLocalData()");
        return true;
    }


    /*
        하드웨어에 데이터 전송

        slave 모드인 경우 duration 속성 간격으로 지속적으로 기기에 요청을 보냅니다.
    */
    requestLocalData() {
        //this.log("BASE - requestLocalData()");
        //return this.transferToDevice();
        return null;
    }


    /*
        하드웨어에서 온 데이터 처리
    */
    handleLocalData(data) {
        //this.log("BASE - handleLocalData()");
        this.receiveFromDevice(data);
    }


    /*
        엔트리로 전달할 데이터
    */
    requestRemoteData(handler) {
        //this.log("BASE - requestRemoteData()");
        this.transferToEntry(handler);
    }


    /*
        엔트리에서 받은 데이터에 대한 처리
    */
    handleRemoteData(handler) {
        //this.log("BASE - handleRemoteData()");
        this.receiveFromEntry(handler);
    }


    connect() {
        this.log('BASE - connect()');
    }


    disconnect(connect) {
        this.log('BASE - disconnect()');

        connect.close();

        this.isConnect = false;
        this.serialport = undefined;
    }


    /*
        Web Socket 종료후 처리
    */
    reset() {
        this.log('BASE - reset()');
        this.resetData();
    }

    // #endregion Base Functions for Entry



    /***************************************************************************************
     *  데이터 리셋
     ***************************************************************************************/
    // #region Data Reset

    resetData() {
        // -- JSON Objects ----------------------------------------------------------------
        // Device -> Entry

        /*
        // Ack
        this.clearAck();

        // 변수 초기화
        this.clearVariable();
        // */
    }

    clearVariable() {
        // -- Hardware ----------------------------------------------------------------
        this.bufferReceive = [];    // 데이터 수신 버퍼
        this.bufferTransfer = [];   // 데이터 송신 버퍼

        this.dataType = 0;          // 수신 받은 데이터의 타입
        this.dataLength = 0;        // 수신 받은 데이터의 길이
        this.from = 0;              // 송신 장치 타입
        this.to = 0;                // 수신 장치 타입
        this.indexSession = 0;      // 수신 받은 데이터의 세션
        this.indexReceiver = 0;     // 수신 받은 데이터의 세션 내 위치
        this.dataBlock = [];        // 수신 받은 데이터 블럭
        this.crc16Calculated = 0;   // CRC16 계산 결과
        this.crc16Received = 0;     // CRC16 수신값
        this.crc16Transfered = 0;   // 전송한 데이터의 crc16

        this.maxTransferRepeat = 1;         // 최대 반복 전송 횟수
        this.countTransferRepeat = 0;       // 반복 전송 횟수
        this.dataTypeLastTransfered = 0;    // 마지막으로 전송한 데이터의 타입

        this.timeReceive = 0;           // 데이터를 전송 받은 시각
        this.timeTransfer = 0;          // 예약 데이터를 전송한 시각
        this.timeTransferNext = 0;      // 전송 가능한 다음 시간
        this.timeTransferInterval = 20; // 최소 전송 시간 간격

        this.countReqeustDevice = 0;        // 장치에 데이터를 요청한 횟수 카운트
    }

    // #endregion Data Reset



    /***************************************************************************************
     *  데이터 업데이트
     ***************************************************************************************/
    // #region Data Update

    clearState() {
        this.state._updated = false;
        this.state.state_modeMovement = 0;
        this.state.state_battery = 0;
    }

    updateState() {
        //this.log(`BASE - updateState() - length : ${this.dataBlock.length}`);

        if (this.dataBlock != undefined && this.dataBlock.length == 8) {
            const array = Uint8Array.from(this.dataBlock);
            const view = new DataView(array.buffer);

            this.state._updated = true;
            this.state.state_modeMovement = view.getUint8(3);
            this.state.state_battery = view.getUint8(7);

            return true;
        }

        return false;
    }


    // #endregion Data Update



    /***************************************************************************************
     *  Communciation - 초기 연결 시 장치 확인
     ***************************************************************************************/
    // #region check Ack for first connection

    checkInitialAck(data, config) {
        return true;
        /*
        this.receiveFromDevice(data);

        if (this.targetDeviceID == undefined) {
            return false;
        }

        if (this.ack._updated) {
            config.id = this.targetDeviceID;
            return true;
        }

        return false;
        // */
    }

    // #endregion check Ack for first connection



    /***************************************************************************************
     *  Communciation - Entry로부터 받은 데이터를 장치에 전송
     ***************************************************************************************/
    // #region Data Transfer to Device from Entry

    read(handler, dataType, defaultValue = 0) {
        return handler.e(dataType) ? handler.read(dataType) : defaultValue;
    }

    /*
        Entry에서 받은 데이터 블럭 처리
        Entry에서 수신 받은 데이터는 bufferTransfer에 바로 등록

        * entryjs에서 변수값을 entry-hw로 전송할 때 절차

            1. Entry.hw.setDigitalPortValue("", value) 명령을 사용하여 지정한 변수의 값을 등록
            2. Entry.hw.update() 를 사용하여 등록된 값 전체 전달
            3. delete Entry.hw.sendQueue[""] 를 사용하여 전달한 값을 삭제

            위와 같은 절차로 데이터를 전송해야 1회만 전송 됨.
            Entry.hw.update를 호출하면 등록된 값 전체를 한 번에 즉시 전송하는 것으로 보임
    */
    receiveFromEntry(handler) {
        if (this.bufferTransfer == undefined) {
            this.bufferTransfer = [];
        }

        // Buffer Clear
        if (handler.e(this.DataType.BUFFER_CLEAR)) {
            this.bufferTransfer = [];
        }

        const target = this.read(handler, this.DataType.TARGET, 0xFF);


        // Command
        if (handler.e(this.DataType.COMMAND_COMMAND)) {
            const command = this.read(handler, this.DataType.COMMAND_COMMAND);
            const option = this.read(handler, this.DataType.COMMAND_OPTION);

            const dataArray = this.reserveCommand(target, command, option);
            this.bufferTransfer.push(dataArray);
            this.log(`BASE - Transfer_To_Device - Command: ${command}, option: ${option}`, dataArray);
        }
    }

    // #endregion Data Transfer to Device from Entry



    /***************************************************************************************
     *  Communciation - 장치로부터 받은 데이터를 Entry에 전송
     ***************************************************************************************/
    // #region Data Transfer to Entry from Device

    // Entry에 데이터 전송
    transferToEntry(handler) {
        /*
        // State
        {
            if (this.state._updated) {
                for (const key in this.state) {
                    handler.write(key, this.state[key]);
                }

                this.state._updated = false;
            }
        }
        // */
        // Entry-hw information
        {
            if (this.bufferTransfer == undefined) {
                this.bufferTransfer = [];
            }

            handler.write('entryhw_countTransferReserved', this.bufferTransfer.length);
        }
    }

    // #endregion Data Transfer to Entry from Device



    /***************************************************************************************
     *  Communciation - 장치로부터 받은 데이터를 검증
     ***************************************************************************************/
    // #region Data Receiver from Device

    // 장치로부터 받은 데이터 배열 처리
    receiveFromDevice(dataArray) {
        //this.log(`BASE - receiveFromDevice() - Length : ${dataArray.length}`, dataArray);
        /*
                if (dataArray == undefined || dataArray.length == 0) {
                    return;
                }
        
                const i = 0;
        
                // 버퍼로부터 데이터를 읽어 하나의 완성된 데이터 블럭으로 변환
                for (let i = 0; i < dataArray.length; i++) {
                    const data = dataArray[i];
        
                    let flagContinue = true;
                    let flagSessionNext = false;
                    let flagComplete = false;
        
                    switch (this.indexSession) {
                        case 0: // Start Code
                            {
                                switch (this.indexReceiver) {
                                    case 0:
                                        if (data != 0x0A) {
                                            continue;
                                        }
                                        break;
        
                                    case 1:
                                        if (data != 0x55) {
                                            flagContinue = false;
                                        }
                                        else {
                                            flagSessionNext = true;
                                        }
                                        break;
                                }
                            }
                            break;
        
                        case 1: // Header
                            {
                                switch (this.indexReceiver) {
                                    case 0:
                                        {
                                            this.dataType = data;
                                            this.crc16Calculated = this.calcCRC16(data, 0);
                                        }
                                        break;
        
                                    case 1:
                                        {
                                            this.dataLength = data;
                                            this.crc16Calculated = this.calcCRC16(data, this.crc16Calculated);
                                        }
                                        break;
        
                                    case 2:
                                        {
                                            this.from = data;
                                            this.crc16Calculated = this.calcCRC16(data, this.crc16Calculated);
                                        }
                                        break;
        
                                    case 3:
                                        {
                                            this.to = data;
                                            this.crc16Calculated = this.calcCRC16(data, this.crc16Calculated);
                                            this.dataBlock = [];        // 수신 받은 데이터 블럭
                                            if (this.dataLength == 0) {
                                                this.indexSession++;    // 데이터의 길이가 0인 경우 바로 CRC16으로 넘어가게 함
                                            }
                                            flagSessionNext = true;
                                        }
                                        break;
                                }
                            }
                            break;
        
                        case 2: // Data
                            {
                                this.dataBlock.push(data);
                                this.crc16Calculated = this.calcCRC16(data, this.crc16Calculated);
        
                                if (this.indexReceiver == this.dataLength - 1) {
                                    flagSessionNext = true;
                                }
                            }
                            break;
        
                        case 3: // CRC16
                            {
                                switch (this.indexReceiver) {
                                    case 0:
                                        {
                                            this.crc16Received = data;
                                        }
                                        break;
        
                                    case 1:
                                        {
                                            this.crc16Received = this.crc16Received + (data << 8);
                                            flagComplete = true;
                                        }
                                        break;
                                }
                            }
                            break;
        
                        default:
                            {
                                flagContinue = false;
                            }
                            break;
                    }
        
                    // 데이터 전송 완료 처리
                    if (flagComplete) {
                        //this.log(`BASE - Receiver - CRC16 - Calculated : ${this.crc16Calculated.toString(16).toUpperCase()}, Received : ${this.crc16Received.toString(16).toUpperCase()}`);
                        if (this.crc16Calculated == this.crc16Received) {
                            this.handlerForDevice();
                        }
        
                        flagContinue = false;
                    }
        
                    // 데이터 처리 결과에 따라 인덱스 변수 처리
                    if (flagContinue) {
                        if (flagSessionNext) {
                            this.indexSession++;
                            this.indexReceiver = 0;
                        }
                        else {
                            this.indexReceiver++;
                        }
                    }
                    else {
                        this.indexSession = 0;        // 수신 받는 데이터의 세션
                        this.indexReceiver = 0;        // 수신 받는 데이터의 세션 내 위치
                    }
                }
                
        // */
    }
    // #endregion Data Receiver from Device



    /***************************************************************************************
     *  Communciation - 장치로부터 받은 데이터 수신 처리
     ***************************************************************************************/
    // #region Data Handler for received data from Device

    // 장치로부터 받은 데이터 블럭 처리
    handlerForDevice() {
        /*
        // log 출력을  skip 할 대상만 case로 등록
        switch( this.dataType )
        {
        case 0x02:  break;      // Ack
        case 0x40:  break;      // State (0x40)
        case 0x41:  break;      //
        case 0x42:  break;      //
        case 0x43:  break;      //
        case 0x44:  break;      //
        case 0x45:  break;      //
        case 0x70:  break;      //
        case 0x71:  break;      //
        case 0xA1:  break;      //

        default:
            {
                this.log(`BASE - handlerForDevice() - From: ${this.from} - To: ${this.to} - Type: ${this.dataType} - `, this.dataBlock);
            }
            break;
        }
        // */
        /*
        this.timeReceive = (new Date()).getTime();

        // 상대측에 정상적으로 데이터를 전달했는지 확인
        switch (this.dataType) {
            case 0x02:  // Ack
                {
                    if (this.updateAck()) {
                        // ping에 대한 ack는 로그 출력하지 않음
                        //if( this.ack.dataType != 0x01 )
                        {
                            //this.log(`BASE - handlerForDevice() - Ack - From: ${this.from} - SystemTime: ${this.ack.ack_systemTime} - DataType: ${this.ack.ack_dataType} - Repeat: ${this.countTransferRepeat} - CRC16 Transfer: ${this.crc16Transfered} - CRF16 Ack: ${this.ack.ack_crc16}`);
                        }

                        // 마지막으로 전송한 데이터에 대한 응답을 받았다면
                        if (this.bufferTransfer != undefined &&
                            this.bufferTransfer.length > 0 &&
                            this.dataTypeLastTransfered == this.ack.ack_dataType &&
                            this.crc16Transfered == this.ack.ack_crc16) {
                            this.bufferTransfer.shift();
                            this.countTransferRepeat = 0;
                        }
                    }
                }
                break;

            default:
                {
                    // 마지막으로 요청한 데이터를 받았다면
                    if (this.bufferTransfer != undefined &&
                        this.bufferTransfer.length > 0 &&
                        this.dataTypeLastTransfered == this.dataType) {
                        this.bufferTransfer.shift();
                        this.countTransferRepeat = 0;

                        //this.log(`BASE - handlerForDevice() - Response - From: ${this.from} - DataType: ${this.dataType}`);
                    }
                }
                break;
        }

        // 데이터 업데이트
        switch (this.dataType) {
            case 0x40:  // State
                {
                    //this.log("BASE - handlerForDevice() - Received - State - 0x40");
                    this.updateState();
                }
                break;

            default:
                break;
        }
        // */
    }

    // #endregion Data Receiver for received data from Device



    /***************************************************************************************
     *  Communciation - 데이터를 장치로 전송(주기적으로 호출됨)
     ***************************************************************************************/
    // #region Data Transfer

    // 장치에 데이터 전송
    transferToDevice() {
        const now = (new Date()).getTime();

        if (now < this.timeTransferNext) {
            return null;
        }

        this.timeTransferNext = now + this.timeTransferInterval;

        if (this.bufferTransfer == undefined) {
            this.bufferTransfer = [];
        }

        // 예약된 데이터 전송 처리
        const arrayTransfer = this.bufferTransfer[0];           // 전송할 데이터 배열(첫 번째 데이터 블럭 전송)
        this.countTransferRepeat++;
        this.timeTransfer = (new Date()).getTime();

        this.crc16Transfered = (arrayTransfer[arrayTransfer.length - 1] << 8) | (arrayTransfer[arrayTransfer.length - 2]);

        //this.log(`BASE - transferToDevice - Repeat: ${this.countTransferRepeat}`, this.bufferTransfer[0]);

        // maxTransferRepeat 이상 전송했음에도 응답이 없는 경우엔 다음으로 넘어감
        if (this.countTransferRepeat >= this.maxTransferRepeat) {
            this.bufferTransfer.shift();
            this.countTransferRepeat = 0;
        }

        return arrayTransfer;
    }

    // #endregion Data Transfer



    /***************************************************************************************
     *  Communciation - 장치 전송용 데이터 배열 생성
     ***************************************************************************************/
    // #region Data Transfer Functions for Device
/*
    // Ping
    reservePing(target) {
        const dataArray = new ArrayBuffer(8);
        const view = new DataView(dataArray);

        view.setUint32(0, 0, true);
        view.setUint32(4, 0, true);

        //this.log(`BASE - reservePing() - Target: 0x${target.toString(16).toUpperCase()}`);
        return this.createTransferBlock(0x01, target, dataArray);
    }


    // 데이터 요청
    reserveRequest(target, dataType) {
        const dataArray = new ArrayBuffer(1);
        const view = new DataView(dataArray);

        view.setUint8(0, this.fit(0, dataType, 0xFF));

        //this.log(`BASE - reserveRequest() - Target: 0x${target.toString(16).toUpperCase()} - DataType: 0x`, dataType.toString(16).toUpperCase());
        return this.createTransferBlock(0x04, target, dataArray);
    }

// */


    // Command
    reserveCommand(target, command, option) {
        const dataArray = new ArrayBuffer(2);
        const view = new DataView(dataArray);

        view.setUint8(0, this.fit(0, command, 0xFF));
        view.setUint8(1, this.fit(0, option, 0xFF));

        this.log(`BASE - reserveCommand() - Target: 0x${target.toString(16).toUpperCase()}`);
        return this.createTransferBlock(0x11, target, dataArray);
    }



    // 전송 데이터 배열 생성
    // https://cryingnavi.github.io/javascript-typedarray/
    createTransferBlock(dataType, dataBuffer) {
        const dataBlock = new ArrayBuffer(2 + 4 + dataBuffer.byteLength + 2);  // Start Code + Header(length 4 byte) + Data + CRC16
        const view = new DataView(dataBlock);
        const dataArray = new Uint8Array(dataBuffer);

        // Start Code
        {
            view.setUint8(0, 0x0A);
            view.setUint8(1, 0x55);
        }

        // Header
        {
            view.setUint8(2, this.fit(0, dataType, 0xFF));              // Data Type
            view.setUint8(3, this.fit(0, dataBuffer.byteLength, 0xFF)); // Data Length
        }

        // Data
        {
            for (let i = 0; i < dataArray.length; i++) {
                view.setUint8((2 + 4 + i), dataArray[i]);
            }
        }

        // CRC16
        /*
        {
            const indexStart = 2;
            const totalLength = 4 + dataArray.length; //
            let crc16 = 0;

            for (let i = 0; i < totalLength; i++) {
                crc16 = this.calcCRC16(view.getUint8(indexStart + i), crc16);
            }
            view.setUint16((2 + 4 + dataArray.length), crc16, true);
        }
        // */

        //this.log("BASE - createTransferBlock() - ", Array.from(new Uint8Array(dataBlock)))
        return Array.from(new Uint8Array(dataBlock));
    }

    fit(min, value, max) {
        return Math.max(Math.min(value, max), min);
    }


    // 값 추출
    getByte(value, index) {
        return ((value >> (index << 3)) & 0xff);
    }

    // #endregion Data Transfer Functions for Device




    /***************************************************************************************
     *  로그 출력
     ***************************************************************************************/
    // #region Functions for log

    log(message, data = undefined) {
        // 로그를 출력하지 않으려면 아래 주석을 활성화 할 것
        //*
        let strInfo = '';

        switch (typeof data) {
            case 'object':
                {
                    strInfo = ` - [ ${this.convertByteArrayToHexString(data)} ]`;
                    console.log(`${message} - ${typeof data}${strInfo}`);
                }
                break;

            default:
                {
                    console.log(message);
                }
                break;
        }
        // */
    }


    // 바이트 배열을 16진수 문자열로 변경
    convertByteArrayToHexString(data) {
        let strHexArray = '';
        let strHex;

        if (typeof data == 'object' && data.length > 1) {
            for (let i = 0; i < data.length; i++) {
                strHex = data[i].toString(16).toUpperCase();
                strHexArray += ' ';
                if (strHex.length == 1) {
                    strHexArray += '0';
                }
                strHexArray += strHex;
            }
            strHexArray = strHexArray.substr(1, strHexArray.length - 1);
        }
        else {
            strHexArray = data.toString();
        }

        return strHexArray;
    }

    // #endregion Functions for log
}


module.exports = BigwaveRoboticsBase;

