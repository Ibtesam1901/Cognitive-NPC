# Cognitive NPC — Flask AI Backend

This is the independent Python Flask AI backend for the 3D Indian village farming game (*Bhima's Hollow*).
It runs locally at `http://127.0.0.1:5000` and serves OpenAI-powered multilingual conversational dialogue for **Raghu the Elder**.

---

## 1. Prerequisites

- Python 3.10+ (Tested with Python 3.13)
- Visual Studio Code

---

## 2. Setup & Virtual Environment in VS Code

1. Open a new terminal in Visual Studio Code.
2. Navigate to the `Backend` folder:
   ```bash
   cd Backend
   ```
3. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```
4. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (Command Prompt)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```
5. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## 3. Configuration (.env)

Check or edit the `.env` file in the `Backend` directory:
```ini
PORT=5000
HOST=127.0.0.1
CLIENT_ORIGIN=http://localhost:5173
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```
*Note: If `OPENAI_API_KEY` is not provided or network is offline, the backend automatically provides authentic, labeled demo responses without crashing.*

---

## 4. Run the Backend

From the `Backend` directory in VS Code, execute:
```bash
python app.py
```
The server will start listening at:
```
http://127.0.0.1:5000
```

---

## 5. Run the Automated Tests

Verify that all endpoints and multilingual structures work as expected:
```bash
python test_app.py
```
Expected output:
```
Ran 8 tests in ...s
OK
```

---

## 6. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend status and AI configuration check |
| `GET` | `/api/npc` | Lore, traits, and metadata for Raghu the Elder |
| `POST` | `/api/npc/chat` | Process player dialogue in English (`en`), Hindi (`hi`), or Kannada (`kn`) |
| `POST` | `/api/npc/quest` | Generate dynamic farming quests tailored to current game state |
| `POST` | `/api/npc/hint` | Provide actionable contextual gameplay hints |
| `POST` | `/api/npc/translate` | Translate text between English, Hindi, and Kannada |

---

## 7. Running Alongside React

1. Keep the Flask backend running in VS Code terminal: `python app.py` (port 5000).
2. Run your Vite frontend in Antigravity or another terminal:
   ```bash
   cd client
   npm run dev
   ```
3. Open `http://localhost:5173` to explore Bhima's Hollow in 3D and speak with Raghu!
