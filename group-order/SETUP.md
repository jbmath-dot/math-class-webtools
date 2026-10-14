# 함께 주문 — 여러 휴대전화에서 실시간 공유 설정

주소: https://jbmath-dot.github.io/math-class-webtools/group-order/

웹앱은 이미 GitHub Pages에 올릴 수 있는 정적 페이지입니다. **서로 다른 휴대전화에서 주문을 실시간 공유하려면 Google Firebase Realtime Database를 연결**해야 합니다. Firebase 설정 없이 주문방 생성/공유는 동작하지 않습니다.

## 1. Firebase 프로젝트 만들기

1. https://console.firebase.google.com/ 에 로그인하여 새 프로젝트를 만듭니다.
2. **빌드 > Authentication > Sign-in method > 익명(Anonymous)** 로그인을 사용 설정합니다. 선생님들은 Firebase 계정을 만들 필요가 없습니다.
3. **빌드 > Realtime Database > 데이터베이스 만들기**를 진행합니다. 초기 규칙은 제한 모드로 만들고 다음 단계 규칙으로 교체합니다. **Cloud Firestore가 아니라 Realtime Database**를 사용합니다.
4. Realtime Database **규칙(Rules)** 탭에 아래 JSON을 붙여 넣고 게시합니다.

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null && !data.exists() && newData.child('hostUid').val() === auth.uid",
        "menu": {
          ".write": "auth != null && root.child('rooms').child($roomId).child('hostUid').val() === auth.uid"
        },
        "closed": {
          ".write": "auth != null && root.child('rooms').child($roomId).child('hostUid').val() === auth.uid"
        },
        "orders": {
          "$userId": {
            ".write": "auth != null && $userId === auth.uid && root.child('rooms').child($roomId).child('closed').val() === false"
          }
        }
      }
    }
  }
}
```

참고: Firebase Realtime Database 규칙에서 논리 부정(`!`) 연산자를 데이터베이스 값에 직접 쓰면 그 값이 `null`일 때 `! only operates on booleans` 오류가 발생할 수 있습니다. 주문 마감 상태는 반드시 `=== false`로 비교합니다.

이 규칙에서 방장만 메뉴·마감 상태를 수정하고, 참여자는 자기 주문만 수정할 수 있습니다. **같은 주문방 링크를 가진 사람은 모든 주문자 이름과 주문 내역을 볼 수 있습니다.** 실명·연락처 같은 민감정보를 넣지 않는 것을 권장합니다. 방 링크는 모임 참여자에게만 공유하세요.

## 2. 웹 앱 설정 가져오기

1. Firebase 콘솔의 **프로젝트 설정(톱니바퀴) > 일반**에서 웹 앱(</>)을 등록합니다.
2. SDK 설정에서 **Config** 항목의 객체를 복사합니다. `apiKey`, `authDomain`, `projectId`, `appId` 등을 포함합니다.
3. **Realtime Database URL**을 `databaseURL` 항목으로 넣습니다. 예: `https://PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app` (정확한 주소는 해당 Firebase 프로젝트의 Realtime Database 화면에서 복사).
4. 단체주문 웹앱에 JSON 객체를 붙여 넣고 **새 주문방 만들기**를 누릅니다.

입력 예시(값은 실제 프로젝트의 값으로 교체):

```json
{
  "apiKey": "실제값",
  "authDomain": "PROJECT.firebaseapp.com",
  "databaseURL": "https://PROJECT-default-rtdb.REGION.firebasedatabase.app",
  "projectId": "PROJECT",
  "appId": "1:숫자:web:문자열"
}
```

Firebase 웹 구성 정보는 통상 공개 클라이언트 식별자이며 비밀 서버 관리자 키가 아닙니다. 그렇더라도 **위 데이터베이스 규칙을 적용해야 접근이 제한됩니다.** 웹앱이 만든 공유 링크에는 프로젝트 설정과 추측하기 어려운 주문방 코드가 포함됩니다.

## 3. 현장에서 사용하기

- **방장:** 새 주문방 생성 → 메뉴판 사진 촬영/선택 → "사진에서 메뉴 읽기" → 문자 인식 결과의 잘못된 메뉴와 가격 수정 → "위 메뉴를 추가하기". 또는 메뉴를 직접 추가합니다.
- **메뉴 수정:** 방장의 메뉴 관리 화면에서 각 메뉴 옆 "수정"/"삭제"를 누릅니다. 메뉴명·가격 수정은 연결된 모든 화면과 합계에 바로 반영됩니다. 삭제된 메뉴의 기존 주문에는 주문 당시의 메뉴·가격을 보존합니다.
- **공유:** 링크 공유 또는 QR코드로 선생님 10명에게 전달합니다.
- **참여자:** 각자 휴대전화에서 링크 접속 → 이름 또는 닉네임 입력 → 메뉴, 수량, 옵션 선택 → 주문 추가. 자신의 주문 옆 +/- 또는 삭제 버튼으로 수정합니다.
- **함께 보기:** 주문자별 내역, 메뉴별 수량·금액, 전체 합계가 각 휴대전화에서 실시간으로 동기화됩니다.
- **방장:** 주문 접수 마감/재개를 제어합니다.
- **가격 옵션:** 메뉴에 없는 샷 추가 등의 옵션 가격은 자동 산정하지 않으므로 필요한 경우 별도 가격의 메뉴로 등록하세요.
- **사진 인식:** 브라우저에서 Tesseract.js 한글·영문 인식 모델을 다운로드합니다. 네트워크가 느리면 시간이 걸리고 인식 오류가 있을 수 있어 반드시 메뉴·가격을 확인하세요. 사진 자체는 서버로 업로드하지 않습니다.

## 제한사항 및 보안

- 이 앱은 실제 음식점으로 주문을 전송하거나 결제하지 않는 모임용 주문 취합 도구입니다.
- 실시간 공유에는 인터넷 접속, Firebase 설정, 설정된 규칙, 익명 인증이 모두 필요합니다.
- 모임 참가 인원이 많거나 악의적인 트래픽이 있을 경우 Firebase 사용량 제한·요금이 발생할 수 있습니다. Firebase 사용량 알림과 무료 할당량을 점검하세요.
- 모든 참여자가 서로의 주문을 볼 수 있도록 설계되었습니다. 방 링크가 외부로 유출되지 않도록 유의하세요.
- Firebase 익명 로그인에 쓰인 브라우저 저장정보를 삭제하거나 다른 브라우저로 접속하면 이전 주문의 수정 권한은 이전 익명 사용자에게 남습니다.
- 주문이 끝난 후 Firebase 콘솔의 Realtime Database에서 해당 `rooms/방코드` 노드를 삭제하면 데이터를 정리할 수 있습니다. 개인 정보를 불필요하게 오래 보관하지 마세요.

## 제작 위치

`group-order/index.html` — 주문 화면 및 실시간 동기화 코드.
`group-order/SETUP.md` — 현재 안내 문서.
