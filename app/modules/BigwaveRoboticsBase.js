const BaseModule = require('./baseModule');
const crc = require('crc');

/***************************************************************************************

    BigwaveRoboticsBase

    Last Update : 2023. 5. 17

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

        this.TIME_OUT = 100;    // ms - 설정한 시간 내에 하나의 데이터를 다 받지 못하면 데이터 수신 처리 변수 초기화

        /***************************************************************************************
            로봇에 전달하는 데이터
         ***************************************************************************************/
        // -- Entry -> Device ----------------------------------------------------------------------
        this.DataType = {
            // 전송 버퍼
            BUFFER_CLEAR: 'bufferClear',

            // JSON BODY
            JSON_BODY: 'jsonBody',
        };

        // 변수 초기화
        this.clearVariable();

        this.targetDeviceID = undefined; // 연결 대상 장치의 ID
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
    }


    /*
        초기 수신데이터 체크(필수)
        연결 후 초기에 수신받아서 정상연결인지를 확인해야하는 경우 사용합니다.
     */
    checkInitialData(data, config) {
        return true;
    }


    /*
        주기적으로 하드웨어에서 받은 데이터의 검증이 필요한 경우 사용합니다.
    */
    validateLocalData(data) {
        return true;
    }


    /*
        하드웨어에 데이터 전송

        slave 모드인 경우 duration 속성 간격으로 지속적으로 기기에 요청을 보냅니다.
    */
    requestLocalData() {
        // 엔트리에서 데이터를 받으면 바로 시리얼 포트에 쓰고 있기 때문에 이 함수는 사용하지 않음
    }


    /*
        하드웨어에서 온 데이터 처리
    */
    handleLocalData(data) {
        this.receiveFromDevice(data);
    }


    /*
        엔트리로 전달할 데이터
    */
    requestRemoteData(handler) {
        this.transferToEntry(handler);
    }


    /*
        엔트리에서 받은 데이터에 대한 처리
    */
    handleRemoteData(handler) {
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
        this.clearVariable();
    }

    // #endregion Base Functions for Entry


    clearVariable() {
        // -- Hardware ----------------------------------------------------------------
        this.bufferReceive = []; // 데이터 수신 버퍼
        this.bufferTransfer = []; // 데이터 송신 버퍼

        this.dataType = 0; // 수신 받은 데이터의 타입
        this.dataLength = 0; // 수신 받은 데이터의 길이

        this.indexSession = 0; // 수신 받은 데이터의 세션
        this.indexReceiver = 0; // 수신 받은 데이터의 세션 내 위치

        this.startBlock = []; // 수신 받은 데이터 블럭
        this.headerBlock = []; // 수신 받은 데이터 블럭
        this.dataBlock = []; // 수신 받은 데이터 블럭
        this.crc16Block = []; // 수신 받은 CRC16 블럭

        this.crc16Received = 0; // CRC16 수신 결과
        this.crc16Calculated = 0; // CRC16 계산 결과

        this.jsonBodyReceived = undefined; // 수신 받은 JSON Body

        this.timeReceivedJson = 0; // 완전한 JSON 데이터를 전송 받은 시각
        this.timeReceivedByte = 0; // 바이트 데이터를 전송 받은 시각
    }


    /***************************************************************************************
     *  Communication - Entry로부터 받은 데이터를 장치에 전송
     ***************************************************************************************/
    // #region Data Transfer to Device from Entry

    /*
        Entry에서 받은 데이터 블럭을 바로 시리얼 포트로 전송
    */
    read(handler, dataType) {
        if (handler.e(dataType)) {
            return handler.read(dataType);
        }

        return undefined;
    }

    /*
        Entry에서 받은 데이터 블럭을 바로 시리얼 포트로 전송
    */
    receiveFromEntry(handler) {
        // Json Body
        {
            const jsonBody = this.read(handler, this.DataType.JSON_BODY);

            if (jsonBody != undefined) {
                const dataArray = this.createTransferBlock(jsonBody);

                this.serialport.write(dataArray);

                this.log(`BASE - jsonBody: ${jsonBody}`);
                this.log(`     - dataArray: ${dataArray}`);
            }
        }
    }

    // #endregion Data Transfer to Device from Entry

    /***************************************************************************************
     *  Communication - 장치로부터 받은 데이터를 Entry에 전송
     ***************************************************************************************/
    // #region Data Transfer to Entry from Device

    // Entry에 데이터 전송
    transferToEntry(handler) {
        if (this.jsonBodyReceived != undefined &&
            this.jsonBodyReceived.dataType != undefined &&
            this.jsonBodyReceived.dataType == 'SENSOR' &&
            this.jsonBodyReceived.param != undefined &&
            this.jsonBodyReceived.param.length > 0) {
            this.jsonBodyReceived.param.forEach((sensor) => {
                this.log(`id: ${sensor.id}, value: ${sensor.value}`);
                handler.write(sensor.id, sensor.value);
            });
        }

        this.jsonBodyReceived = undefined;
    }

    // #endregion Data Transfer to Entry from Device

    /***************************************************************************************
     *  Communication - 장치로부터 받은 데이터를 검증
     ***************************************************************************************/
    // #region Data Receiver from Device

    // 장치로부터 받은 데이터 배열 처리
    receiveFromDevice(dataArray) {
        //this.log(`BASE - receiverForDevice() - Length : ${dataArray.length}`, dataArray);
        if (dataArray == undefined || dataArray.length == 0) {
            return;
        }

        const timeNow = (new Date()).getTime(); // (ms)

        // 수신되는 데이터 사이에 시간 간격이 길어지면 초기화
        // (데이터를 정상적으로 받지 못한 경우 다시 처음부터 받을 수 있도록)
        if (timeNow - this.timeReceivedByte > this.TIME_OUT) {
            this.indexSession = 0; // 수신 받는 데이터의 세션
            this.indexReceiver = 0; // 수신 받는 데이터의 세션 내 위치
            this.log('Time out.');
        }

        // 버퍼로부터 데이터를 읽어 하나의 완성된 데이터 블럭으로 변환
        this.log(`dataArray.length: ${dataArray.length}`);
        for (let i = 0; i < dataArray.length; i++) {
            const data = dataArray[i];

            let flagContinue = true;
            let flagSessionNext = false;
            let flagComplete = false;


            this.log(`i: ${i}, data: ${data.toString(16).toUpperCase()} / ${data}, indexSession: ${this.indexSession}, indexReceiver: ${this.indexReceiver}`);
            switch (this.indexSession) {
                case 0: // Start Code
                    {
                        this.startBlock.push(data);

                        if (this.startBlock.length > 2) {
                            this.startBlock.shift();
                        }

                        if (this.startBlock.length == 2 &&
                            this.startBlock[0] == 0x0A &&
                            this.startBlock[1] == 0x55) {
                            flagSessionNext = true;
                            this.headerBlock = [];
                        }
                    }
                    break;

                case 1: // Header
                    {
                        this.headerBlock.push(data);

                        if (this.indexReceiver == 3) {
                            const header = new Uint8Array(this.headerBlock);
                            const view = new DataView(header.buffer);
                            this.dataLength = view.getUint32(0, true) - 2 - 4 - 2;
                            this.dataBlock = []; // 수신 받은 데이터 블럭
                            flagSessionNext = true;

                            this.log(`dataLength: ${this.dataLength}`);
                        }
                    }
                    break;

                case 2: // Data
                    {
                        this.dataBlock.push(data);

                        if (this.indexReceiver == this.dataLength - 1) {
                            this.crc16Block = []; // 수신 받은 데이터 블럭
                            flagSessionNext = true;
                        }
                    }
                    break;

                case 3: // CRC16
                    {
                        this.crc16Block.push(data);

                        if (this.indexReceiver == 1) {
                            flagComplete = true;
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
                const crc16 = new Uint8Array(this.crc16Block);
                const view = new DataView(crc16.buffer);
                this.crc16Received = view.getUint16(0, true);

                const startCodeArray = new Uint8Array([0x0a, 0x55]); // 2바이트 시작 코드
                const headerArray = new Uint8Array(this.headerBlock);
                const bodyArray = new Uint8Array(this.dataBlock);
                this.crc16Calculated = crc.crc16ccitt(Buffer.concat([startCodeArray, headerArray, bodyArray]));

                // 수신 받은 CRC와 연산한 CRC 비교
                this.log(`BASE - Receiver - CRC16 - Calculated : ${this.crc16Calculated.toString(16).toUpperCase()}, Received : ${this.crc16Received.toString(16).toUpperCase()}`);
                if (this.crc16Calculated == this.crc16Received) {
                    this.jsonBodyReceived = JSON.parse(new TextDecoder().decode(bodyArray.buffer));
                    this.timeReceivedJson = (new Date()).getTime();

                    const strJson2 = JSON.stringify(this.jsonBodyReceived);
                    this.log(strJson2);
                }

                flagContinue = false;
            }

            // 데이터 처리 결과에 따라 인덱스 변수 처리
            if (flagContinue) {
                if (flagSessionNext) {
                    this.indexSession++;
                    this.indexReceiver = 0;
                } else {
                    this.indexReceiver++;
                }
            } else {
                this.indexSession = 0; // 수신 받는 데이터의 세션
                this.indexReceiver = 0; // 수신 받는 데이터의 세션 내 위치
            }

            this.timeReceivedByte = timeNow;
        }
    }

    // #endregion Data Receiver from Device


    /***************************************************************************************
     *  Communication - 장치 전송용 데이터 배열 생성
     ***************************************************************************************/
    // 전송 데이터 배열 생성
    // https://cryingnavi.github.io/javascript-typedarray/
    createTransferBlock(jsonBody) {
        const startCode = new Uint8Array([0x0a, 0x55]); // 2바이트 시작 코드
        const jsonBytes = new TextEncoder().encode(JSON.stringify(jsonBody)); // JSON을 바이트 형태로 변환
        const packetLength = 2 + 4 + jsonBytes.length + 2; // Start Code + Header(length 4 byte) + Data + CRC16
        const packetLengthBytes = new Uint8Array(new Uint32Array([packetLength]).buffer); // 패킷 길이를 4바이트 빅엔디안으로 변환
        const crc16 = crc.crc16ccitt(Buffer.concat([startCode, packetLengthBytes, jsonBytes]));
        const crc16Bytes = new Uint8Array(new Uint16Array([crc16]).buffer); // CRC16을 2바이트 빅엔디안으로 변환

        const packet = new Uint8Array(packetLength);
        packet.set(startCode, 0);
        packet.set(packetLengthBytes, 2);
        packet.set(jsonBytes, 6);
        packet.set(crc16Bytes, packetLength - 2);

        // 결과 출력
        this.log(this.convertByteArrayToHexString(packet));

        return packet;
    }

    fit(min, value, max) {
        return Math.max(Math.min(value, max), min);
    }

    // 값 추출
    getByte(value, index) {
        return (value >> (index << 3)) & 0xff;
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
        } else {
            strHexArray = data.toString();
        }

        return strHexArray;
    }

    // #endregion Functions for log
}

module.exports = BigwaveRoboticsBase;
