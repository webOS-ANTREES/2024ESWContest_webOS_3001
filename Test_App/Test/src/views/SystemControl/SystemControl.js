import { useEffect, useState, } from 'react';
import mqtt from 'mqtt';
import css from './SystemControl.module.css';
import { getDatabase, ref, query, limitToLast, onValue } from 'firebase/database';
import { firebaseApp } from '../../Firebase';
import AutoControl from './AutoControl';
import ManualControl from './ManualControl';
import { sendToast, putKind  } from '../webOS_service/luna_service';

const SystemControl = () => {
  const [client, setClient] = useState(null);
  const [currentSensorData, setLatestSensorData] = useState(null);

  // 내벽 제어 상태
  const [isInnerWall1Open, setIsInnerWall1Open] = useState(false);
  const [isInnerWall2Open, setIsInnerWall2Open] = useState(false);

  useEffect(() => {
    const mqttClient = mqtt.connect('ws://172.20.48.180:1884');
    const todayDate = new Date().toISOString().split('T')[0];
    const database = getDatabase(firebaseApp);
    const sensorDataRef = query(ref(database, `sensorData/${todayDate}`), limitToLast(1));

    putKind();  // DB8에 Kind 생성 (최초 한 번)
    setClient(mqttClient);

    onValue(sensorDataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allData = [];
        Object.keys(data).forEach(timeKey => {
          const timeData = data[timeKey];
          const innerKeys = Object.keys(timeData);
          innerKeys.forEach(innerKey => {
            allData.push({
              ...timeData[innerKey],
              timeKey: timeKey,
              key: innerKey
            });
          });
        });
        const currentData = allData[allData.length - 1];
        setLatestSensorData(currentData);  // 최신 데이터를 설정
      } else {
        setLatestSensorData(null);
      }
    });

    return () => {
      mqttClient.end();  // 컴포넌트 unmount 시 MQTT 연결 해제
    };
  }, []);

  const handleInnerSide = () => {
    if (client) {
      if (isInnerWall1Open) {
        client.publish('nodemcu/side', 'OFF');  // 내벽 1 닫기 메시지
        setIsInnerWall1Open(false);
        sendToast("내벽 1이 닫혔습니다.")
      } else {
        client.publish('nodemcu/side', 'ON');  // 내벽 1 열기 메시지
        setIsInnerWall1Open(true);
        sendToast("내벽 1이 열렸습니다.")
      }
    }
  };

  const handleInnerCeiling = () => {
    if (client) {
      if (isInnerWall2Open) {
        client.publish('nodemcu/ceiling', 'OFF');  // 내벽 2 닫기 메시지
        setIsInnerWall2Open(false);
        sendToast("내벽 2가 닫혔습니다.")
      } else {
        client.publish('nodemcu/ceiling', 'ON');  // 내벽 2 열기 메시지
        setIsInnerWall2Open(true);
        sendToast("내벽 2가 열렸습니다.")

      }
    }
  };

  return (
    <div className={css.SystemControlContainer}>
      <AutoControl
        currentSensorData={currentSensorData}
        client={client}
      />
      <ManualControl
        client={client}
      />

      {/* 내벽 제어 UI */}
      <div className={`${css.SystemControlItem} ${css.InnerWallControl1}`}>
        <h2>내벽 사이드 제어</h2>
        <div className={css.ControlButtonContainer}>
          <button className={css.ControlButton} onClick={() => handleInnerSide('ON')}>
            열기
          </button>
          <button className={css.ControlButton} onClick={() => handleInnerSide('OFF')}>
            닫기
          </button>
        </div>
      </div>
      <div className={`${css.SystemControlItem} ${css.InnerWallControl2}`}>
        <h2>내벽 천장 제어</h2>
        <div className={css.ControlButtonContainer}>
          <button className={css.ControlButton} onClick={() => handleInnerCeiling('ON')}>
            열기
          </button>
          <button className={css.ControlButton} onClick={() => handleInnerCeiling('OFF')}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default SystemControl;