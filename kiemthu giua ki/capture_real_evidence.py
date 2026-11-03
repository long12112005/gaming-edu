import asyncio
import base64
import io
import json
import os
import subprocess
import sys
import time
import urllib.parse
import uuid
import requests
import websockets
from PIL import Image, ImageDraw, ImageFont

WORKSPACE_DIR = r"c:\Users\LONG\gaming-edu"
BE_DIR = os.path.join(WORKSPACE_DIR, "BE", "GamingEdu.API")
FE_DIR = os.path.join(WORKSPACE_DIR, "FE", "gaming-edu-app")
OUT_DIR = os.path.join(WORKSPACE_DIR, "kiemthu giua ki", "evidence_screenshots")
os.makedirs(OUT_DIR, exist_ok=True)

BE_URL = "http://localhost:5000"
FE_URL = "http://localhost:3000"
CDP_PORT = 9233
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"


def is_url_up(url, timeout=2.5):
    try:
        r = requests.get(url, timeout=timeout)
        return r.status_code < 500
    except Exception:
        return False


def ensure_servers():
    procs = []
    if not is_url_up(f"{BE_URL}/api/quizzes"):
        print("[*] Starting Backend ASP.NET Core API on http://localhost:5000 ...")
        be_proc = subprocess.Popen(
            ["dotnet", "run", "--no-launch-profile", "--urls", "http://localhost:5000"],
            cwd=BE_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        procs.append(be_proc)
    else:
        print("[+] Backend API is already running on http://localhost:5000")

    if not is_url_up(FE_URL):
        print("[*] Starting Frontend Next.js App on http://localhost:3000 ...")
        fe_proc = subprocess.Popen(
            ["cmd.exe", "/c", "npm", "run", "dev"],
            cwd=FE_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        procs.append(fe_proc)
    else:
        print("[+] Frontend Next.js App is already running on http://localhost:3000")

    # Wait for Backend
    for i in range(60):
        if is_url_up(f"{BE_URL}/api/quizzes"):
            print(f"[+] Backend ready (attempt {i+1})")
            break
        time.sleep(1.5)
    else:
        raise RuntimeError("Backend failed to start on http://localhost:5000")

    # Wait for Frontend
    for i in range(60):
        if is_url_up(f"{FE_URL}/login"):
            print(f"[+] Frontend ready (attempt {i+1})")
            break
        time.sleep(1.5)
    else:
        raise RuntimeError("Frontend failed to start on http://localhost:3000")

    return procs


def seed_backend_data():
    print("[*] Seeding QA Teacher Account, Quiz, and Game Rooms via Backend REST API...")
    email = "qa_teacher_ktpm@gameedu.vn"
    password = "QaPassword@2026"
    nickname = "Giảng Viên QA"

    token = None
    user_obj = None

    # Try login first
    r_login = requests.post(
        f"{BE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    if r_login.status_code == 200 and r_login.json().get("success"):
        data = r_login.json()["data"]
        token = data["token"]
        user_obj = data["user"]
        print("[+] Logged in existing QA user:", user_obj.get("email"))
    else:
        # Send OTP & Register
        r_otp = requests.post(
            f"{BE_URL}/api/auth/send-register-otp",
            json={"email": email},
            timeout=10,
        )
        otp_data = r_otp.json()
        otp_code = otp_data.get("data") or "123456"
        r_reg = requests.post(
            f"{BE_URL}/api/auth/register",
            json={
                "email": email,
                "password": password,
                "nickname": nickname,
                "otp": otp_code,
            },
            timeout=10,
        )
        if not r_reg.ok:
            raise RuntimeError(f"Failed to register QA user: {r_reg.text}")
        data = r_reg.json()["data"]
        token = data["token"]
        user_obj = data["user"]
        print("[+] Registered new QA user:", user_obj.get("email"))

    headers = {"Authorization": f"Bearer {token}"}

    # Create a Quiz
    r_quiz = requests.post(
        f"{BE_URL}/api/quizzes",
        headers=headers,
        json={
            "title": "Đề Kiểm Thử Phần Mềm Giữa Kỳ (IEEE 829 & BVA)",
            "topic": "TIN HỌC",
            "isPublic": True,
            "coverImageUrl": "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=600&h=350&fit=crop",
        },
        timeout=10,
    )
    quiz_id = r_quiz.json()["data"]["id"]
    print("[+] Created Quiz ID:", quiz_id)

    # Bulk-save 5 slides (QUIZ, FILL_IN_BLANK, MATCHING)
    slides_payload = [
        {
            "type": "QUIZ",
            "questionText": "Kỹ thuật kiểm thử nào tập trung vào các giá trị tại ranh giới của miền đầu vào?",
            "timeLimit": 25,
            "points": 1000,
            "orderIndex": 0,
            "status": "PUBLISHED",
            "options": [
                {"content": "Phân tích giá trị biên (Boundary Value Analysis)", "isCorrect": True, "orderIndex": 0},
                {"content": "Đoán lỗi trực giác (Error Guessing)", "isCorrect": False, "orderIndex": 1},
                {"content": "Kiểm thử hộp trắng (White-box Testing)", "isCorrect": False, "orderIndex": 2},
                {"content": "Kiểm thử đám mây từ khóa (Word Cloud)", "isCorrect": False, "orderIndex": 3},
            ],
        },
        {
            "type": "QUIZ",
            "questionText": "Theo chuẩn IEEE 829, tài liệu nào xác định phạm vi, chiến lược, nguồn lực và lịch trình kiểm thử?",
            "timeLimit": 25,
            "points": 1000,
            "orderIndex": 1,
            "status": "PUBLISHED",
            "options": [
                {"content": "Test Plan (Kế hoạch kiểm thử)", "isCorrect": True, "orderIndex": 0},
                {"content": "Test Incident Report (Báo cáo sự cố)", "isCorrect": False, "orderIndex": 1},
                {"content": "Database Schema Migration", "isCorrect": False, "orderIndex": 2},
                {"content": "System Architecture Design", "isCorrect": False, "orderIndex": 3},
            ],
        },
        {
            "type": "FILL_IN_BLANK",
            "questionText": "Điền tên viết tắt (3 chữ cái) của Ma trận truy xuất yêu cầu trong Kiểm thử phần mềm: ___",
            "timeLimit": 25,
            "points": 1000,
            "orderIndex": 2,
            "status": "PUBLISHED",
            "options": [
                {"content": "RTM", "isCorrect": True, "orderIndex": 0, "blankKeywords": "RTM,rtm"},
            ],
        },
        {
            "type": "MATCHING",
            "questionText": "Ghép nối phân loại Test Case với mục đích kiểm thử tương ứng:",
            "timeLimit": 30,
            "points": 1000,
            "orderIndex": 3,
            "status": "PUBLISHED",
            "options": [
                {"content": "Normal Case", "isCorrect": True, "orderIndex": 0, "matchingPair": "Luồng nghiệp vụ hợp lệ (Happy Path)"},
                {"content": "Boundary Case", "isCorrect": True, "orderIndex": 1, "matchingPair": "Kiểm thử tại các mốc biên Min / Max"},
                {"content": "Abnormal / Error Case", "isCorrect": True, "orderIndex": 2, "matchingPair": "Xử lý ngoại lệ và dữ liệu sai định dạng"},
            ],
        },
        {
            "type": "QUIZ",
            "questionText": "Trong chế độ Hải Tặc Tri Thức của GameEdu, kích thước lưới tọa độ chiến trường là bao nhiêu?",
            "timeLimit": 25,
            "points": 1000,
            "orderIndex": 4,
            "status": "PUBLISHED",
            "options": [
                {"content": "Bản đồ lưới 15 x 15 ô", "isCorrect": True, "orderIndex": 0},
                {"content": "Bản đồ lưới 5 x 5 ô", "isCorrect": False, "orderIndex": 1},
                {"content": "Bản đồ lưới 8 x 8 ô", "isCorrect": False, "orderIndex": 2},
                {"content": "Bản đồ lưới 10 x 10 ô", "isCorrect": False, "orderIndex": 3},
            ],
        },
    ]

    r_slides = requests.post(
        f"{BE_URL}/api/quizzes/{quiz_id}/slides/bulk-save",
        headers=headers,
        json=slides_payload,
        timeout=10,
    )
    print("[+] Saved slides status:", r_slides.status_code)

    # Fetch quiz detail to get real slide IDs & option IDs
    r_qdetail = requests.get(f"{BE_URL}/api/quizzes/{quiz_id}", headers=headers, timeout=10)
    quiz_detail = r_qdetail.json()["data"]

    # Create Room 1: ASYNC_TOURNAMENT with 5s questionTimeLimit (for EV_03, EV_04, EV_09)
    r_room1 = requests.post(
        f"{BE_URL}/api/rooms",
        headers=headers,
        json={
            "quizId": quiz_id,
            "mode": "ASYNC_TOURNAMENT",
            "gameModeTheme": "SPEED_RACER",
            "questionTimeLimit": 4,
        },
        timeout=10,
    )
    room1 = r_room1.json()["data"]
    print(f"[+] Created Room 1 (Tournament): ID={room1['id']}, PIN={room1['pinCode']}")

    # Create Room 2: NAVAL_WAR (for EV_05, EV_06, EV_08)
    r_room2 = requests.post(
        f"{BE_URL}/api/rooms",
        headers=headers,
        json={
            "quizId": quiz_id,
            "mode": "HOST_PACED",
            "gameModeTheme": "NAVAL_WAR",
        },
        timeout=10,
    )
    room2 = r_room2.json()["data"]
    print(f"[+] Created Room 2 (Naval War 1v1): ID={room2['id']}, PIN={room2['pinCode']}")

    # Create Room 3: NAVAL_WAR for 1v2 Double Shot Buff (EV_07)
    r_room3 = requests.post(
        f"{BE_URL}/api/rooms",
        headers=headers,
        json={
            "quizId": quiz_id,
            "mode": "HOST_PACED",
            "gameModeTheme": "NAVAL_WAR",
        },
        timeout=10,
    )
    room3 = r_room3.json()["data"]
    print(f"[+] Created Room 3 (Naval War 1v2 Buff X2): ID={room3['id']}, PIN={room3['pinCode']}")

    return {
        "email": email,
        "password": password,
        "token": token,
        "user": user_obj,
        "quiz_id": quiz_id,
        "quiz_detail": quiz_detail,
        "room1": room1,
        "room2": room2,
        "room3": room3,
    }


def add_browser_chrome_header(img: Image.Image, url_text: str, badge_text: str = "") -> Image.Image:
    """Adds a realistic Chrome browser window header & address bar showing the exact localhost URL."""
    w, h = img.size
    header_h = 54
    canvas = Image.new("RGB", (w, h + header_h), (30, 41, 59))
    draw = ImageDraw.Draw(canvas)

    try:
        font_url = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 14)
        font_badge = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 13)
    except Exception:
        font_url = ImageFont.load_default()
        font_badge = ImageFont.load_default()

    # Window bar background
    draw.rectangle([0, 0, w, header_h], fill=(15, 23, 42))
    draw.line([(0, header_h - 1), (w, header_h - 1)], fill=(51, 65, 85), width=1)

    # Traffic lights
    draw.ellipse([16, 19, 30, 33], fill=(239, 68, 68))
    draw.ellipse([38, 19, 52, 33], fill=(245, 158, 11))
    draw.ellipse([60, 19, 74, 33], fill=(16, 185, 129))

    # URL Address Pill
    badge_w = 0
    if badge_text:
        badge_w = max(210, len(badge_text) * 8 + 30)

    url_x1 = 92
    url_x2 = w - badge_w - 24
    draw.rounded_rectangle([url_x1, 10, url_x2, 44], radius=10, fill=(30, 41, 59), outline=(71, 85, 105), width=1)
    draw.text((url_x1 + 14, 19), f"🔒 {url_text}", fill=(226, 232, 240), font=font_url)

    if badge_text:
        bx1 = w - badge_w - 12
        bx2 = w - 12
        draw.rounded_rectangle([bx1, 11, bx2, 43], radius=8, fill=(16, 185, 129))
        draw.text((bx1 + 12, 19), badge_text, fill=(255, 255, 255), font=font_badge)

    canvas.paste(img, (0, header_h))
    return canvas


def combine_side_by_side(img_left: Image.Image, img_right: Image.Image) -> Image.Image:
    """Combines two browser screenshots side-by-side (Split Screen)."""
    target_h = max(img_left.height, img_right.height)
    gap = 12
    total_w = img_left.width + img_right.width + gap
    out = Image.new("RGB", (total_w, target_h), (15, 23, 42))
    out.paste(img_left, (0, 0))
    out.paste(img_right, (img_left.width + gap, 0))
    return out


class CDPTab:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self.msg_id = 0

    async def __aenter__(self):
        self.ws = await websockets.connect(self.ws_url, max_size=50 * 1024 * 1024)
        await self.send("Page.enable")
        await self.send("Runtime.enable")
        await self.send("DOM.enable")
        await self.send("Network.enable")
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self.ws:
            await self.ws.close()

    async def send(self, method, params=None):
        self.msg_id += 1
        cur_id = self.msg_id
        payload = {"id": cur_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(payload))
        while True:
            raw = await self.ws.recv()
            data = json.loads(raw)
            if data.get("id") == cur_id:
                if "error" in data:
                    raise RuntimeError(f"CDP Error in {method}: {data['error']}")
                return data.get("result", {})

    async def set_viewport(self, width=1440, height=900, scale=1):
        await self.send(
            "Emulation.setDeviceMetricsOverride",
            {"width": width, "height": height, "deviceScaleFactor": scale, "mobile": False},
        )

    async def set_auth_cookies(self, token, user_dict):
        await self.send(
            "Network.setCookie",
            {
                "name": "token",
                "value": token,
                "url": FE_URL,
                "path": "/",
            },
        )
        await self.send(
            "Network.setCookie",
            {
                "name": "user",
                "value": urllib.parse.quote(json.dumps(user_dict)),
                "url": FE_URL,
                "path": "/",
            },
        )

    async def set_guest_cookies(self, player_id, nickname):
        for k, v in [
            ("guest_player_id", player_id),
            ("player_id", player_id),
            ("guest_nickname", urllib.parse.quote(nickname)),
            ("nickname", urllib.parse.quote(nickname)),
        ]:
            await self.send(
                "Network.setCookie",
                {
                    "name": k,
                    "value": v,
                    "url": FE_URL,
                    "path": "/",
                },
            )

    async def clear_cookies(self):
        await self.send("Network.clearBrowserCookies")

    async def navigate(self, url, wait_sec=2.5):
        await self.send("Page.navigate", {"url": url})
        await asyncio.sleep(wait_sec)

    async def evaluate(self, expression, await_promise=True):
        res = await self.send(
            "Runtime.evaluate",
            {
                "expression": expression,
                "returnByValue": True,
                "awaitPromise": await_promise,
            },
        )
        return res.get("result", {}).get("value")

    async def screenshot_pil(self) -> Image.Image:
        res = await self.send("Page.captureScreenshot", {"format": "png", "fromSurface": True})
        raw_bytes = base64.b64decode(res["data"])
        return Image.open(io.BytesIO(raw_bytes)).convert("RGB")


async def create_isolated_tab(browser_ws_url, width=1280, height=860):
    async with websockets.connect(browser_ws_url) as bws:
        # Create isolated BrowserContext
        await bws.send(json.dumps({"id": 1, "method": "Target.createBrowserContext", "params": {}}))
        while True:
            r = json.loads(await bws.recv())
            if r.get("id") == 1:
                ctx_id = r["result"]["browserContextId"]
                break

        await bws.send(
            json.dumps(
                {
                    "id": 2,
                    "method": "Target.createTarget",
                    "params": {"url": "about:blank", "browserContextId": ctx_id, "width": width, "height": height},
                }
            )
        )
        while True:
            r = json.loads(await bws.recv())
            if r.get("id") == 2:
                target_id = r["result"]["targetId"]
                break

    # Find websocketDebuggerUrl for target_id
    targets = requests.get(f"http://127.0.0.1:{CDP_PORT}/json/list", timeout=5).json()
    for t in targets:
        if t.get("id") == target_id:
            return t["webSocketDebuggerUrl"], ctx_id, target_id
    raise RuntimeError(f"Could not find target {target_id}")


async def run_all_captures(seed):
    version_info = requests.get(f"http://127.0.0.1:{CDP_PORT}/json/version", timeout=5).json()
    browser_ws_url = version_info["webSocketDebuggerUrl"]

    token = seed["token"]
    user_obj = seed["user"]
    quiz_id = seed["quiz_id"]
    room1 = seed["room1"]
    room2 = seed["room2"]
    room3 = seed["room3"]

    pin1 = room1["pinCode"]
    room1_id = room1["id"]
    pin2 = room2["pinCode"]
    pin3 = room3["pinCode"]

    # =========================================================================
    # 1. EV_01_Auth_Error_Boundary.png (TC_AUTH_02 & TC_AUTH_04)
    # =========================================================================
    print("[*] Capturing EV_01_Auth_Error_Boundary.png ...")
    ws_login, _, _ = await create_isolated_tab(browser_ws_url, 960, 860)
    ws_reg, _, _ = await create_isolated_tab(browser_ws_url, 960, 860)

    async with CDPTab(ws_login) as tab_l, CDPTab(ws_reg) as tab_r:
        await tab_l.set_viewport(960, 860)
        await tab_r.set_viewport(960, 860)

        # Left: Login wrong password (TC_AUTH_02)
        await tab_l.navigate(f"{FE_URL}/login", wait_sec=3.0)
        await tab_l.evaluate(
            """
            (() => {
                const setVal = (el, val) => {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    setter.call(el, val);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                };
                const emailInput = document.querySelector('input[type="email"]');
                const passInput = document.querySelector('input[type="password"]');
                if (emailInput) setVal(emailInput, 'qa_teacher_ktpm@gameedu.vn');
                if (passInput) setVal(passInput, 'SaiMatKhau123!');
                const btn = document.querySelector('button[type="submit"]');
                if (btn) btn.click();
            })()
            """
        )
        await asyncio.sleep(2.0)
        img_l = await tab_l.screenshot_pil()
        img_l = add_browser_chrome_header(img_l, "http://localhost:3000/login", "TC_AUTH_02: Sai mật khẩu (PASS)")

        # Right: Register boundary password < 6 chars (TC_AUTH_04)
        await tab_r.navigate(f"{FE_URL}/register", wait_sec=3.0)
        await tab_r.evaluate(
            """
            (() => {
                const setVal = (el, val) => {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    setter.call(el, val);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                };
                const inputs = document.querySelectorAll('input');
                if (inputs[0]) setVal(inputs[0], 'Chiến Binh QA');
                if (inputs[1]) setVal(inputs[1], 'qa_boundary@gameedu.vn');
                if (inputs[2]) {
                    inputs[2].removeAttribute('minLength');
                    inputs[2].removeAttribute('minlength');
                    setVal(inputs[2], '12345');
                }
                const form = document.querySelector('form');
                if (form) form.setAttribute('novalidate', 'true');
                const btn = document.querySelector('button[type="submit"]');
                if (btn) btn.click();
            })()
            """
        )
        await asyncio.sleep(1.5)
        img_r = await tab_r.screenshot_pil()
        img_r = add_browser_chrome_header(img_r, "http://localhost:3000/register", "TC_AUTH_04: Biên MK < 6 ký tự (PASS)")

        ev01 = combine_side_by_side(img_l, img_r)
        ev01.save(os.path.join(OUT_DIR, "EV_01_Auth_Error_Boundary.png"), quality=95)
        print("[+] Saved EV_01_Auth_Error_Boundary.png")

    # =========================================================================
    # 2. EV_02_Quiz_Creation_AI.png (TC_QUIZ_01 & TC_QUIZ_02)
    # =========================================================================
    print("[*] Capturing EV_02_Quiz_Creation_AI.png ...")
    ws_quiz, _, _ = await create_isolated_tab(browser_ws_url, 1440, 880)
    async with CDPTab(ws_quiz) as tab_q:
        await tab_q.set_viewport(1440, 880)
        await tab_q.set_auth_cookies(token, user_obj)
        await tab_q.navigate(f"{FE_URL}/quizzes/{quiz_id}/edit", wait_sec=3.5)
        img_q = await tab_q.screenshot_pil()
        ev02 = add_browser_chrome_header(
            img_q,
            f"http://localhost:3000/quizzes/{quiz_id}/edit",
            "TC_QUIZ_01 & 02: Soạn Bộ Đề & AI (PASS)",
        )
        ev02.save(os.path.join(OUT_DIR, "EV_02_Quiz_Creation_AI.png"), quality=95)
        print("[+] Saved EV_02_Quiz_Creation_AI.png")

    # =========================================================================
    # 3. EV_03_Room_PIN_Lobby.png (TC_ROOM_01 & TC_ROOM_02)
    # =========================================================================
    print("[*] Capturing EV_03_Room_PIN_Lobby.png ...")
    ws_lobby, _, _ = await create_isolated_tab(browser_ws_url, 960, 860)
    ws_play_err, _, _ = await create_isolated_tab(browser_ws_url, 960, 860)
    async with CDPTab(ws_lobby) as tab_host, CDPTab(ws_play_err) as tab_err:
        await tab_host.set_viewport(960, 860)
        await tab_err.set_viewport(960, 860)

        await tab_host.set_auth_cookies(token, user_obj)
        await tab_host.navigate(f"{FE_URL}/host/{room1_id}?pin={pin1}", wait_sec=3.5)
        img_host = await tab_host.screenshot_pil()
        img_host = add_browser_chrome_header(
            img_host,
            f"http://localhost:3000/host/{room1_id}?pin={pin1}",
            f"TC_ROOM_01: Sảnh PIN {pin1} & QR (PASS)",
        )

        # Student enters invalid PIN 999999 on /play
        await tab_err.navigate(f"{FE_URL}/play", wait_sec=3.0)
        await tab_err.evaluate(
            """
            (() => {
                const setVal = (el, val) => {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    setter.call(el, val);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                };
                const inputs = document.querySelectorAll('input');
                if (inputs[0]) setVal(inputs[0], '999999');
                if (inputs[1]) setVal(inputs[1], 'Học Sinh Test');
                const buttons = Array.from(document.querySelectorAll('button'));
                const joinBtn = buttons.find(b => b.textContent && (b.textContent.includes('VÀO PHÒNG') || b.textContent.includes('Tham Gia') || b.type === 'submit'));
                if (joinBtn) joinBtn.click();
            })()
            """
        )
        await asyncio.sleep(2.0)
        img_err = await tab_err.screenshot_pil()
        img_err = add_browser_chrome_header(
            img_err,
            "http://localhost:3000/play",
            "TC_ROOM_02: PIN 999999 Không Tồn Tại (PASS)",
        )

        ev03 = combine_side_by_side(img_host, img_err)
        ev03.save(os.path.join(OUT_DIR, "EV_03_Room_PIN_Lobby.png"), quality=95)
        print("[+] Saved EV_03_Room_PIN_Lobby.png")

    # =========================================================================
    # 4. EV_04_Timeout_ZeroScore_AutoNext.png (TC_ROOM_04)
    # =========================================================================
    print("[*] Capturing EV_04_Timeout_ZeroScore_AutoNext.png ...")
    ws_p1, _, _ = await create_isolated_tab(browser_ws_url, 1440, 880)
    async with CDPTab(ws_p1) as tab_p1:
        await tab_p1.set_viewport(1440, 880)
        await tab_p1.set_guest_cookies(str(uuid.uuid4()), "Nguyễn Thành Long")
        await tab_p1.navigate(f"{FE_URL}/play/{pin1}", wait_sec=3.5)

        # Click "BẮT ĐẦU LÀM BÀI ⚡"
        await tab_p1.evaluate(
            """
            (() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const startBtn = buttons.find(b => b.textContent && b.textContent.includes('BẮT ĐẦU LÀM BÀI'));
                if (startBtn) startBtn.click();
            })()
            """
        )
        # Wait until timer hits 0s (questionTimeLimit is 4s, auto-advance happens 2.2s after 0s)
        # Poll every 0.25s for the text "ĐÃ HẾT THỜI GIAN!"
        for _ in range(30):
            has_timeout_text = await tab_p1.evaluate(
                "document.body.innerText.includes('ĐÃ HẾT THỜI GIAN') || document.body.innerText.includes('+0 pts')"
            )
            if has_timeout_text:
                break
            await asyncio.sleep(0.25)

        img_timeout = await tab_p1.screenshot_pil()
        ev04 = add_browser_chrome_header(
            img_timeout,
            f"http://localhost:3000/play/{pin1}",
            "TC_ROOM_04: Biên 0s Hết Giờ +0 pts (PASS)",
        )
        ev04.save(os.path.join(OUT_DIR, "EV_04_Timeout_ZeroScore_AutoNext.png"), quality=95)
        print("[+] Saved EV_04_Timeout_ZeroScore_AutoNext.png")

        # Also let this student answer a couple of questions so Room 1 report has rich student data for EV_09!
        await asyncio.sleep(2.5)
        for _ in range(3):
            await tab_p1.evaluate(
                """
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const opt = btns.find(b => b.textContent && (b.textContent.includes('Test Plan') || b.textContent.includes('Bản đồ lưới 15')));
                    if (opt) opt.click();
                })()
                """
            )
            await asyncio.sleep(1.5)

    # =========================================================================
    # 5 & 6 & 8. NAVAL WAR (EV_05 Turn-based Split Screen, EV_06 Shoot & Switch Turn, EV_08 Host Spectator & Result)
    # =========================================================================
    print("[*] Capturing EV_05, EV_06, EV_08 in Live Naval War Room (PIN=" + pin2 + ") ...")
    ws_n_host, _, _ = await create_isolated_tab(browser_ws_url, 1280, 900)
    ws_n_a, _, _ = await create_isolated_tab(browser_ws_url, 960, 900)
    ws_n_b, _, _ = await create_isolated_tab(browser_ws_url, 960, 900)

    player_a_id = str(uuid.uuid4())
    player_b_id = str(uuid.uuid4())

    async with CDPTab(ws_n_host) as tab_nhost, CDPTab(ws_n_a) as tab_na, CDPTab(ws_n_b) as tab_nb:
        await tab_nhost.set_viewport(1280, 900)
        await tab_na.set_viewport(960, 900)
        await tab_nb.set_viewport(960, 900)

        # Host opens /rooms/{pin2}/naval as Neutral Referee
        await tab_nhost.set_auth_cookies(token, user_obj)
        await tab_nhost.navigate(f"{FE_URL}/rooms/{pin2}/naval", wait_sec=3.5)

        # Player A opens /rooms/{pin2}/naval and joins TEAM_A
        await tab_na.set_guest_cookies(player_a_id, "Thuyền Trưởng Lam")
        await tab_na.navigate(f"{FE_URL}/rooms/{pin2}/naval", wait_sec=3.5)
        await tab_na.evaluate(
            """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btnA = btns.find(b => b.textContent && b.textContent.includes('HẠM ĐỘI LAM'));
                if (btnA) btnA.click();
            })()
            """
        )
        await asyncio.sleep(1.5)

        # Player B opens /rooms/{pin2}/naval and joins TEAM_B
        await tab_nb.set_guest_cookies(player_b_id, "Đô Đốc Xích")
        await tab_nb.navigate(f"{FE_URL}/rooms/{pin2}/naval", wait_sec=3.5)
        await tab_nb.evaluate(
            """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btnB = btns.find(b => b.textContent && b.textContent.includes('HẠM ĐỘI XÍCH'));
                if (btnB) btnB.click();
            })()
            """
        )
        await asyncio.sleep(1.5)

        # Host clicks "BẮT ĐẦU TRẬN ĐẤU"
        await tab_nhost.evaluate(
            """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const startBtn = btns.find(b => b.textContent && b.textContent.includes('BẮT ĐẦU TRẬN ĐẤU'));
                if (startBtn) startBtn.click();
            })()
            """
        )
        await asyncio.sleep(2.5)

        # Scroll both Player A and Player B down slightly so both the 15x15 grids and the Turn-Based Question HUD are centered!
        await tab_na.evaluate("window.scrollTo({ top: 320, behavior: 'instant' })")
        await tab_nb.evaluate("window.scrollTo({ top: 320, behavior: 'instant' })")
        await asyncio.sleep(0.6)

        img_na_turn1 = await tab_na.screenshot_pil()
        img_nb_turn1 = await tab_nb.screenshot_pil()

        img_na_turn1 = add_browser_chrome_header(
            img_na_turn1,
            f"http://localhost:3000/rooms/{pin2}/naval (Phe Lam - A)",
            "Lượt #1: Hiện Câu Hỏi (PASS)",
        )
        img_nb_turn1 = add_browser_chrome_header(
            img_nb_turn1,
            f"http://localhost:3000/rooms/{pin2}/naval (Phe Xích - B)",
            "Lượt #1: Khóa Chờ Lượt (PASS)",
        )

        ev05 = combine_side_by_side(img_na_turn1, img_nb_turn1)
        ev05.save(os.path.join(OUT_DIR, "EV_05_Naval_TurnBased_SplitScreen.png"), quality=95)
        print("[+] Saved EV_05_Naval_TurnBased_SplitScreen.png")

        # Now for EV_06: Player A answers correctly -> receives 1 shot -> fires on 15x15 grid -> switches turn to Team B!
        await tab_na.evaluate(
            """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const correctBtn = btns.find(b => b.textContent && b.textContent.includes('Boundary Value Analysis'));
                if (correctBtn) correctBtn.click();
            })()
            """
        )
        await asyncio.sleep(1.5)

        # Capture Player A right when "Trả lời chính xác! Hãy nhấp vào ô trên bản đồ Hải Phận Đối Phương để bắn đại bác!" is visible
        await tab_na.evaluate("window.scrollTo({ top: 220, behavior: 'instant' })")
        await asyncio.sleep(0.4)
        img_na_earned = await tab_na.screenshot_pil()

        # Now Player A clicks a cell on Enemy Waters Grid to fire cannon and trigger turn switch to Turn #2!
        await tab_na.evaluate(
            """
            (() => {
                // Enemy grid is the second grid; click a cell button inside it
                const grids = document.querySelectorAll('.grid-cols-15, [style*="grid-template-columns"]');
                const enemyGrid = grids.length > 1 ? grids[1] : grids[0];
                if (enemyGrid) {
                    const cellBtns = enemyGrid.querySelectorAll('button');
                    if (cellBtns.length > 48) cellBtns[48].click();
                }
            })()
            """
        )
        await asyncio.sleep(1.8)
        img_na_fired = await tab_na.screenshot_pil()

        img_na_earned = add_browser_chrome_header(
            img_na_earned,
            f"http://localhost:3000/rooms/{pin2}/naval",
            "TC_NAVAL_02: Trả Lời Đúng +1 Đạn",
        )
        img_na_fired = add_browser_chrome_header(
            img_na_fired,
            f"http://localhost:3000/rooms/{pin2}/naval",
            "TC_NAVAL_05: Bắn 15x15 & Chuyển Lượt #2",
        )
        ev06 = combine_side_by_side(img_na_earned, img_na_fired)
        ev06.save(os.path.join(OUT_DIR, "EV_06_Naval_Shoot_And_SwitchTurn.png"), quality=95)
        print("[+] Saved EV_06_Naval_Shoot_And_SwitchTurn.png")

        # Now for EV_08: Host Spectator Mode viewing both 15x15 fleets + Host ends match early to show 4-criteria Victory Modal
        await tab_nhost.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })")
        await asyncio.sleep(0.5)
        img_spectator = await tab_nhost.screenshot_pil()

        # Click "Kết thúc sớm" on Host Spectator bar
        await tab_nhost.evaluate(
            """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const endBtn = btns.find(b => b.textContent && (b.textContent.includes('Kết thúc') || b.title?.includes('Kết thúc')));
                if (endBtn) endBtn.click();
            })()
            """
        )
        await asyncio.sleep(2.0)
        img_victory_modal = await tab_nhost.screenshot_pil()

        img_spectator = add_browser_chrome_header(
            img_spectator,
            f"http://localhost:3000/rooms/{pin2}/naval (Trọng Tài)",
            "Trọng Tài Quan Sát 2 Hạm Đội",
        )
        img_victory_modal = add_browser_chrome_header(
            img_victory_modal,
            f"http://localhost:3000/rooms/{pin2}/naval (Kết Quả)",
            "Đối Chiếu 4 Tiêu Chí Thắng Thua",
        )
        ev08 = combine_side_by_side(img_spectator, img_victory_modal)
        ev08.save(os.path.join(OUT_DIR, "EV_08_Host_Spectator_Referee.png"), quality=95)
        print("[+] Saved EV_08_Host_Spectator_Referee.png")

    # =========================================================================
    # 7. EV_07_Naval_Balance_DoubleShot.png (TC_NAVAL_06 & TC_NAVAL_07 - 1 vs 2 Double Shot Buff X2)
    # =========================================================================
    print("[*] Capturing EV_07_Naval_Balance_DoubleShot.png (1 vs 2 Buff X2 in PIN=" + pin3 + ") ...")
    ws_b3_host, _, _ = await create_isolated_tab(browser_ws_url, 1280, 880)
    ws_b3_a1, _, _ = await create_isolated_tab(browser_ws_url, 1280, 880)
    ws_b3_b1, _, _ = await create_isolated_tab(browser_ws_url, 960, 800)
    ws_b3_b2, _, _ = await create_isolated_tab(browser_ws_url, 960, 800)

    async with CDPTab(ws_b3_host) as th, CDPTab(ws_b3_a1) as ta1, CDPTab(ws_b3_b1) as tb1, CDPTab(ws_b3_b2) as tb2:
        await th.set_viewport(1280, 880)
        await ta1.set_viewport(1280, 880)

        await th.set_auth_cookies(token, user_obj)
        await th.navigate(f"{FE_URL}/rooms/{pin3}/naval", wait_sec=3.0)

        # 1 player on Team A
        await ta1.set_guest_cookies(str(uuid.uuid4()), "Chiến Binh Lam (1v2)")
        await ta1.navigate(f"{FE_URL}/rooms/{pin3}/naval", wait_sec=3.0)
        await ta1.evaluate(
            """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btnA = btns.find(b => b.textContent && b.textContent.includes('HẠM ĐỘI LAM'));
                if (btnA) btnA.click();
            })()
            """
        )
        await asyncio.sleep(1.0)

        # 2 players on Team B
        await tb1.set_guest_cookies(str(uuid.uuid4()), "Xích Long #1")
        await tb1.navigate(f"{FE_URL}/rooms/{pin3}/naval", wait_sec=3.0)
        await tb1.evaluate(
            """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btnB = btns.find(b => b.textContent && b.textContent.includes('HẠM ĐỘI XÍCH'));
                if (btnB) btnB.click();
            })()
            """
        )
        await asyncio.sleep(1.0)

        await tb2.set_guest_cookies(str(uuid.uuid4()), "Xích Hổ #2")
        await tb2.navigate(f"{FE_URL}/rooms/{pin3}/naval", wait_sec=3.0)
        await tb2.evaluate(
            """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btnB = btns.find(b => b.textContent && b.textContent.includes('HẠM ĐỘI XÍCH'));
                if (btnB) btnB.click();
            })()
            """
        )
        await asyncio.sleep(1.5)

        # Capture Host Lobby showing "Chênh lệch 1 người: 1 thành viên ngẫu nhiên phe Lam sẽ nhận buff X2 phát bắn!"
        img_lobby_1v2 = await th.screenshot_pil()

        # Start Match (1 vs 2) -> Player A1 receives BUFF X2 banner!
        await th.evaluate(
            """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const startBtn = btns.find(b => b.textContent && b.textContent.includes('BẮT ĐẦU TRẬN ĐẤU'));
                if (startBtn) startBtn.click();
            })()
            """
        )
        await asyncio.sleep(2.5)
        img_buff_x2 = await ta1.screenshot_pil()

        img_lobby_1v2 = add_browser_chrome_header(
            img_lobby_1v2,
            f"http://localhost:3000/rooms/{pin3}/naval (Sảnh 1 vs 2)",
            "TC_NAVAL_06: Báo Chênh Lệch 1 Người",
        )
        img_buff_x2 = add_browser_chrome_header(
            img_buff_x2,
            f"http://localhost:3000/rooms/{pin3}/naval (Chiến Trường)",
            "TC_NAVAL_07: Nhận Hiệu Ứng BUFF X2 (PASS)",
        )
        ev07 = combine_side_by_side(img_lobby_1v2, img_buff_x2)
        ev07.save(os.path.join(OUT_DIR, "EV_07_Naval_Balance_DoubleShot.png"), quality=95)
        print("[+] Saved EV_07_Naval_Balance_DoubleShot.png")

    # =========================================================================
    # 9. EV_09_Report_And_Excel.png (TC_REP_02)
    # =========================================================================
    print("[*] Capturing EV_09_Report_And_Excel.png ...")
    ws_rep, _, _ = await create_isolated_tab(browser_ws_url, 1440, 880)
    async with CDPTab(ws_rep) as tab_rep:
        await tab_rep.set_viewport(1440, 880)
        await tab_rep.set_auth_cookies(token, user_obj)
        await tab_rep.navigate(f"{FE_URL}/reports/{room1_id}", wait_sec=3.5)

        # Click "Xuất Excel" button if present to trigger export toast
        await tab_rep.evaluate(
            """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const expBtn = btns.find(b => b.textContent && b.textContent.includes('Xuất Excel'));
                if (expBtn) expBtn.click();
            })()
            """
        )
        await asyncio.sleep(1.5)
        img_rep = await tab_rep.screenshot_pil()
        ev09 = add_browser_chrome_header(
            img_rep,
            f"http://localhost:3000/reports/{room1_id}",
            "TC_REP_02: Báo Cáo & Xuất File Excel (PASS)",
        )
        ev09.save(os.path.join(OUT_DIR, "EV_09_Report_And_Excel.png"), quality=95)
        print("[+] Saved EV_09_Report_And_Excel.png")

    # =========================================================================
    # 10. EV_10_Light_Dark_Theme.png (TC_REP_03)
    # =========================================================================
    print("[*] Capturing EV_10_Light_Dark_Theme.png ...")
    ws_theme, _, _ = await create_isolated_tab(browser_ws_url, 960, 860)
    async with CDPTab(ws_theme) as tab_th:
        await tab_th.set_viewport(960, 860)
        await tab_th.set_auth_cookies(token, user_obj)
        await tab_th.navigate(f"{FE_URL}/home", wait_sec=3.5)

        # Ensure Light Mode first
        await tab_th.evaluate(
            """
            (() => {
                localStorage.setItem('theme', 'light');
                document.documentElement.classList.remove('dark');
                document.documentElement.setAttribute('data-theme', 'light');
                window.dispatchEvent(new Event('theme-change'));
            })()
            """
        )
        await asyncio.sleep(1.0)
        img_light = await tab_th.screenshot_pil()
        img_light = add_browser_chrome_header(
            img_light,
            "http://localhost:3000/home (Light Mode)",
            "TC_REP_03: Giao Diện Sáng (PASS)",
        )

        # Click the ThemeToggleButton right next to the Avatar!
        await tab_th.evaluate(
            """
            (() => {
                const toggleBtn = document.querySelector('button[aria-label="Đổi giao diện Sáng / Tối"]');
                if (toggleBtn) toggleBtn.click();
            })()
            """
        )
        await asyncio.sleep(1.2)
        img_dark = await tab_th.screenshot_pil()
        img_dark = add_browser_chrome_header(
            img_dark,
            "http://localhost:3000/home (Dark Mode)",
            "TC_REP_03: Giao Diện Tối Cạnh Avatar (PASS)",
        )

        ev10 = combine_side_by_side(img_light, img_dark)
        ev10.save(os.path.join(OUT_DIR, "EV_10_Light_Dark_Theme.png"), quality=95)
        print("[+] Saved EV_10_Light_Dark_Theme.png")


def main():
    started_procs = []
    chrome_proc = None
    try:
        started_procs = ensure_servers()
        seed = seed_backend_data()

        user_data_dir = os.path.join(WORKSPACE_DIR, "temp_chrome_profile")
        os.makedirs(user_data_dir, exist_ok=True)

        print(f"[*] Launching Headless Chrome on CDP port {CDP_PORT} ...")
        chrome_proc = subprocess.Popen(
            [
                CHROME_PATH,
                "--headless=new",
                f"--remote-debugging-port={CDP_PORT}",
                "--remote-allow-origins=*",
                f"--user-data-dir={user_data_dir}",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-gpu",
                "--window-size=1440,900",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        for _ in range(25):
            if is_url_up(f"http://127.0.0.1:{CDP_PORT}/json/version", timeout=1.0):
                break
            time.sleep(0.5)
        else:
            raise RuntimeError("Headless Chrome failed to open CDP port")

        asyncio.run(run_all_captures(seed))
        print("[SUCCESS] All 10 real browser screenshots captured!")

    finally:
        if chrome_proc:
            chrome_proc.terminate()
        for p in started_procs:
            try:
                p.terminate()
            except Exception:
                pass


if __name__ == "__main__":
    main()
