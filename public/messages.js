// 1. session가져오기
// 2. 가져온 session으로 room table의 senderId나 receiverId가 일치하는 데이터를 다 가져옴
// 3. 가져온 룸테이블 데이터를 루프 돌려서 div 만든 후에 last_time, last_msg, 그리고 상대의 유저네임 ejs에 집어넣기.
// 이거 하기!!(유저 아이디는 갔고 이제 그걸로 룸아이디 찾아야함!!)

async function getUser() {
    const user = await getUserSession();
    const userData = JSON.parse(user.data); // user obj from session
    const rooms = await getRoomByUserId(userData.userId);
    await showAllRooms(userData.userId, rooms);
}

async function showAllRooms(currentUserId, rooms) {
    const containerdiv = document.querySelector(".messages")

    for (const room of rooms) {
        console.log(currentUserId);
        console.log(typeof currentUserId);
        const isSender = room.senderId === currentUserId;
        const userId = isSender? room.receiverId: room.senderId;
        const roomUser = await getUserByUserId(userId);

        const roomLastTime = changeDateFormat(room.last_time);

        const div = document.createElement('div');

        div.innerHTML = `
        <a href="/chat?sender=${currentUserId}&receiver=${roomUser.userId}" class="chattingRoomForm" method="get">
            <div class="chattingRoomContainer">
                <div class="chattingRoomDetail">
                    <img class="chattingProfileImg" src="${roomUser.profilePic}">
                    <div class="chattingRoomSemi">
                        <h5>${roomUser.username}</h5>
                        <p>${room.last_message || ""}</p>
                    </div>
                <h6 class="chattingRoomDate">${roomLastTime}</h6>
                </div>
            </div>
        </a>
        `
        div.classList.add('container', 'mb-3', 'chatting-room');
        containerdiv.appendChild(div);
    }
}

function changeDateFormat(dateTime) {
    const aDate = new Date(dateTime);
    const currentTime = new Date();

    const isToday = aDate.toDateString() === currentTime.toDateString();

    const timeDiff = currentTime.getTime() - aDate.getTime();

    const diffInMinutes = Math.floor(timeDiff / (1000 * 60));

    if (isToday) {
        const hours = ('0' + aDate.getHours()).slice(-2);
        const hourCheck = hours >= 12;
        const minutes = ('0' + aDate.getMinutes()).slice(-2);
        
        if (hourCheck === true) {
            const hoursFormat = hours - 12;
            const date = `${hoursFormat}:${minutes} PM`;
            return date;
        } else {
            const date = `${hoursFormat}:${minutes}AM`;
            return date;
        }

    } else {
        const diffInDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        if (diffInDays < 2) {
            const date = "Yesterday";
            return date;
        } else {
            const day = aDate.getDate();
            const month = aDate.getMonth() + 1;
            const year = aDate.getFullYear();
            const date = `${month}/${day}/${year}`;
            return date;
        }
    }
}

async function getUserSession() {
    const res = await fetch('/getUserSession', {
        method: 'POST',
    });
    const data = await res.json();
    return data;
}

async function getRoomByUserId(userId) {
    const res = await fetch('/getRoomByUserId', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
    })
    const result = await res.json();
    return result.data;
}

async function getUserByUserId(userId) {
    const res = await fetch('/getUserByUserId', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
    })
    const result = await res.json();
    return result.data;
}

getUser();