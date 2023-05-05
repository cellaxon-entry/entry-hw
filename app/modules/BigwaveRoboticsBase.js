/* eslint-disable brace-style */
/* eslint-disable max-len */
/*jshint esversion: 6 */
const BaseModule = require('./baseModule');
const crc = require('crc');



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

        // -- Entry -> Device ----------------------------------------------------------------------
        this.DataType =
        {
            // 전송 버퍼
            BUFFER_CLEAR: 'bufferClear',

            // JSON BODY
            JSON_BODY: 'jsonBody',
        };




        // -- Device -> Entry ----------------------------------------------------------------------
        /*
        // State
        this.state =
        {
            _updated: 1,
            state_modeMovement: 0,  // u8
            state_battery: 0,       // u8
        };
        // */



        // 변수 초기화
        this.clearVariable();

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
        //this.log('BASE - requestLocalData()');
        return this.transferToDevice();
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
        // Device -> Entry

        /*
        // 변수 초기화
        this.clearVariable();
        // */
    }

    clearVariable() {
        // -- Hardware ----------------------------------------------------------------
        this.bufferReceive = [];            // 데이터 수신 버퍼
        this.bufferTransfer = [];           // 데이터 송신 버퍼

        this.dataType = 0;                  // 수신 받은 데이터의 타입
        this.dataLength = 0;                // 수신 받은 데이터의 길이
        this.from = 0;                      // 송신 장치 타입
        this.to = 0;                        // 수신 장치 타입
        this.indexSession = 0;              // 수신 받은 데이터의 세션
        this.indexReceiver = 0;             // 수신 받은 데이터의 세션 내 위치
        this.dataBlock = [];                // 수신 받은 데이터 블럭
        this.crc16Calculated = 0;           // CRC16 계산 결과
        this.crc16Received = 0;             // CRC16 수신값

        this.maxTransferRepeat = 1;         // 최대 반복 전송 횟수
        this.countTransferRepeat = 0;       // 반복 전송 횟수
        this.dataTypeLastTransferred = 0;   // 마지막으로 전송한 데이터의 타입

        this.timeReceive = 0;               // 데이터를 전송 받은 시각
        this.timeTransfer = 0;              // 예약 데이터를 전송한 시각
        this.timeTransferNext = 0;          // 전송 가능한 다음 시간
        this.timeTransferInterval = 20;     // 최소 전송 시간 간격

        this.countRequestDevice = 0;        // 장치에 데이터를 요청한 횟수 카운트
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
        // Json Body
        if (handler.e(this.DataType.JSON_BODY)) {
            const jsonBody = this.read(handler, this.DataType.JSON_BODY);
            const dataArray = this.createTransferBlock(jsonBody);

            this.serialport.write(dataArray);		

            this.log(`BASE - jsonBody: ${jsonBody}`);
            this.log(`     - dataArray: ${dataArray}`);
        }
    }

    // #endregion Data Transfer to Device from Entry



    /***************************************************************************************
     *  Communciation - 장치로부터 받은 데이터를 Entry에 전송
     ***************************************************************************************/
    // #region Data Transfer to Entry from Device

    // Entry에 데이터 전송
    transferToEntry(handler) {
    }

    // #endregion Data Transfer to Entry from Device



    /***************************************************************************************
     *  Communciation - 장치로부터 받은 데이터를 검증
     ***************************************************************************************/
    // #region Data Receiver from Device

    // 장치로부터 받은 데이터 배열 처리
    receiveFromDevice(dataArray) {
    }

    // #endregion Data Receiver from Device



    /***************************************************************************************
     *  Communciation - 장치로부터 받은 데이터 수신 처리
     ***************************************************************************************/
    // #region Data Handler for received data from Device

    // 장치로부터 받은 데이터 블럭 처리
    handlerForDevice() {
    }

    // #endregion Data Receiver for received data from Device



    /***************************************************************************************
     *  Communciation - 데이터를 장치로 전송(주기적으로 호출됨)
     ***************************************************************************************/
    // #region Data Transfer

    // 장치에 데이터 전송
    transferToDevice() {
        if (this.bufferTransfer == undefined)
        {
            this.bufferTransfer = [];
            return null;
        }

        if (this.bufferTransfer.length == 0) {
            return null;
        }

        // 예약된 데이터 전송 처리
        const arrayTransfer = this.bufferTransfer;           // 전송할 데이터 배열(첫 번째 데이터 블럭 전송)
        this.countTransferRepeat++;
        this.timeTransfer = (new Date()).getTime();

        // maxTransferRepeat 이상 전송했음에도 응답이 없는 경우 데이터 전송 중단
        if (this.countTransferRepeat >= this.maxTransferRepeat) {
            this.bufferTransfer = [];
            this.countTransferRepeat = 0;
        }

        return arrayTransfer;
    }

    // #endregion Data Transfer



    /***************************************************************************************
     *  Communciation - 장치 전송용 데이터 배열 생성
     ***************************************************************************************/
    // 전송 데이터 배열 생성
    // https://cryingnavi.github.io/javascript-typedarray/
    createTransferBlock(jsonBody) {
        const startCode = new Uint8Array([0x0A, 0x55]); // 2바이트 시작 코드
        const jsonBytes = new TextEncoder().encode(JSON.stringify(jsonBody)); // JSON을 바이트 형태로 변환
        const packetLength = 2 + 4 + jsonBytes.length + 2;  // Start Code + Header(length 4 byte) + Data + CRC16
        const packetLengthBytes = new Uint8Array(new Uint32Array([packetLength]).buffer); // 패킷 길이를 4바이트 빅엔디안으로 변환
        const crc16 = crc.crc16ccitt(Buffer.concat([startCode, packetLengthBytes, jsonBytes]));
        const crc16Bytes = new Uint8Array(new Uint16Array([crc16]).buffer); // CRC16을 2바이트 빅엔디안으로 변환

        const packet = new Uint8Array(packetLength);
        packet.set(startCode, 0);
        packet.set(packetLengthBytes, 2);
        packet.set(jsonBytes, 6);
        packet.set(crc16Bytes, packetLength - 2);

        // 결과 출력
        console.log(packet);

        return packet;
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

